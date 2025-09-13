import * as fs from 'fs';
import * as path from 'path';
import type {
  DevolvedAdmin,
  DevolvedAdminResponse,
  DevolvedAdminParserOptions
} from '../models/devolved-admin.js';
import { 
  DevolvedAdminError, 
  DevolvedAdminErrorCode,
  DevolvedNation
} from '../models/devolved-admin.js';

/**
 * Parser for UK Devolved Administrations data
 * Uses static JSON data file for reliability and control
 */
export class DevolvedAdminParser {
  private readonly dataPath: string;
  private readonly defaultOptions: Required<DevolvedAdminParserOptions> = {
    includeAgencies: true,
    includePublicBodies: true
  };

  constructor() {
    // Use process.cwd() which works in both ESM and CommonJS
    // The data file is always relative to the project root
    this.dataPath = path.join(process.cwd(), 'src', 'data', 'devolved-administrations.json');
    
    // Verify the file exists
    if (!fs.existsSync(this.dataPath)) {
      // Try alternative path for compiled version
      const altPath = path.join(process.cwd(), 'dist', 'data', 'devolved-administrations.json');
      if (fs.existsSync(altPath)) {
        this.dataPath = altPath;
      }
    }
  }

  /**
   * Load and parse the static JSON data file
   */
  private loadData(): any {
    try {
      const rawData = fs.readFileSync(this.dataPath, 'utf-8');
      return JSON.parse(rawData);
    } catch (error) {
      throw new DevolvedAdminError(
        `Failed to load devolved administrations data: ${error}`,
        DevolvedAdminErrorCode.DATA_LOAD_ERROR
      );
    }
  }

  /**
   * Fetch all devolved administration entities
   */
  async fetchAll(options?: DevolvedAdminParserOptions): Promise<DevolvedAdmin[]> {
    const opts = { ...this.defaultOptions, ...options };
    
    console.log('Loading devolved administrations data...');
    
    const data = this.loadData();
    
    if (!data.entities || !Array.isArray(data.entities)) {
      throw new DevolvedAdminError(
        'Invalid data format: entities array not found',
        DevolvedAdminErrorCode.PARSE_ERROR
      );
    }

    let entities = data.entities as DevolvedAdmin[];
    
    // Apply filters based on options
    if (!opts.includeAgencies) {
      entities = entities.filter(e => e.type !== 'agency');
    }
    
    if (!opts.includePublicBodies) {
      entities = entities.filter(e => e.type !== 'public_body');
    }
    
    console.log(`Loaded ${entities.length} devolved administration entities`);
    
    return entities;
  }

  /**
   * Validate entity data
   */
  private validateEntity(entity: any): boolean {
    if (!entity.id || !entity.name || !entity.type || !entity.administration) {
      return false;
    }
    
    // Validate administration is one of the expected values
    const validAdministrations = ['scotland', 'wales', 'northern_ireland'];
    if (!validAdministrations.includes(entity.administration)) {
      return false;
    }
    
    // Validate type is one of the expected values
    const validTypes = ['parliament', 'government', 'department', 'directorate', 'agency', 'public_body'];
    if (!validTypes.includes(entity.type)) {
      return false;
    }
    
    return true;
  }

  /**
   * Parse and validate entities
   */
  parseEntities(rawData: any[]): DevolvedAdmin[] {
    if (!Array.isArray(rawData)) {
      throw new DevolvedAdminError(
        'Expected array of entities',
        DevolvedAdminErrorCode.PARSE_ERROR
      );
    }

    return rawData.filter(entity => {
      const isValid = this.validateEntity(entity);
      if (!isValid) {
        console.warn(`Skipping invalid entity: ${JSON.stringify(entity)}`);
      }
      return isValid;
    }).map(entity => ({
      id: entity.id,
      name: entity.name,
      type: entity.type,
      administration: entity.administration,
      parentId: entity.parentId,
      website: entity.website,
      established: entity.established,
      minister: entity.minister,
      responsibilities: entity.responsibilities,
      alternativeNames: entity.alternativeNames
    }));
  }

  /**
   * Get entities by administration
   */
  async getByAdministration(administration: DevolvedNation): Promise<DevolvedAdmin[]> {
    const allEntities = await this.fetchAll();
    return allEntities.filter(e => e.administration === administration);
  }

  /**
   * Get entities by type
   */
  async getByType(type: string): Promise<DevolvedAdmin[]> {
    const allEntities = await this.fetchAll();
    return allEntities.filter(e => e.type === type);
  }

  /**
   * Build entity hierarchy
   */
  buildHierarchy(entities: DevolvedAdmin[]): Map<string, DevolvedAdmin[]> {
    const hierarchy = new Map<string, DevolvedAdmin[]>();
    
    entities.forEach(entity => {
      const parentId = entity.parentId || 'root';
      if (!hierarchy.has(parentId)) {
        hierarchy.set(parentId, []);
      }
      hierarchy.get(parentId)!.push(entity);
    });
    
    return hierarchy;
  }

  /**
   * Aggregate entities and return with metadata
   */
  async aggregate(options?: DevolvedAdminParserOptions): Promise<DevolvedAdminResponse> {
    const startTime = Date.now();
    const entities = await this.fetchAll(options);
    const duration = Date.now() - startTime;

    // Calculate metadata
    const byAdministration = {
      scotland: entities.filter(e => e.administration === 'scotland').length,
      wales: entities.filter(e => e.administration === 'wales').length,
      northern_ireland: entities.filter(e => e.administration === 'northern_ireland').length
    };

    const byType: Record<string, number> = {};
    entities.forEach(entity => {
      byType[entity.type] = (byType[entity.type] || 0) + 1;
    });

    console.log(`Aggregation completed in ${duration}ms`);
    console.log(`Breakdown by administration: Scotland=${byAdministration.scotland}, Wales=${byAdministration.wales}, NI=${byAdministration.northern_ireland}`);
    console.log(`Breakdown by type:`, byType);

    return {
      entities,
      metadata: {
        source: 'Static JSON (manually curated)',
        fetchedAt: new Date().toISOString(),
        totalCount: entities.length,
        byAdministration,
        byType
      }
    };
  }
}