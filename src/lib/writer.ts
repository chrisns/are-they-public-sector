/**
 * JSON Writer Utility
 * Generates and writes final output JSON with metadata and statistics
 */

import * as fs from 'fs';
import * as path from 'path';
import { OrganisationType } from '../models/organisation.js';
import type { Organisation } from '../models/organisation.js';
import type { ProcessingResult, ProcessingMetadata, DataConflict } from '../models/processing.js';

/**
 * Configuration for the writer utility
 */
export interface WriterConfig {
  outputPath?: string;
  prettyPrint?: boolean;
  includeMetadata?: boolean;
  includeConflicts?: boolean;
  includeStatistics?: boolean;
  generateSummary?: boolean;
}

/**
 * Output file structure
 */
export interface OutputData {
  organisations: Organisation[];
  metadata?: ProcessingMetadata;
  conflicts?: DataConflict[];
  summary?: OutputSummary;
}

/**
 * Summary statistics for output
 */
export interface OutputSummary {
  totalOrganisations: number;
  organisationsByType: Record<OrganisationType, number>;
  organisationsByStatus: {
    active: number;
    inactive: number;
    dissolved: number;
  };
  dataQuality: {
    averageCompleteness: number;
    organisationsRequiringReview: number;
    organisationsWithConflicts: number;
  };
  sources: {
    [key: string]: number;
  };
  generated: string;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<WriterConfig> = {
  outputPath: 'dist/orgs.json',
  prettyPrint: true,
  includeMetadata: true,
  includeConflicts: true,
  includeStatistics: true,
  generateSummary: true
};

/**
 * JSON Writer Utility
 * Handles writing processed data to JSON files
 */
export class WriterService {
  private config: Required<WriterConfig>;

  constructor(config: WriterConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Write processing result to JSON file
   * @param result Processing result to write
   * @param outputPath Optional override for output path
   * @returns Path to written file
   */
  async writeResult(result: ProcessingResult, outputPath?: string): Promise<string> {
    const filePath = outputPath || this.config.outputPath;
    
    // Prepare output data
    const outputData: OutputData = {
      organisations: result.organisations
    };

    // Add metadata if configured
    if (this.config.includeMetadata && result.metadata) {
      outputData.metadata = result.metadata;
    }

    // Add conflicts if configured
    if (this.config.includeConflicts && result.conflicts) {
      outputData.conflicts = result.conflicts;
    }

    // Generate summary if configured
    if (this.config.generateSummary) {
      outputData.summary = this.generateSummary(result);
    }

    // Write to file
    await this.writeJsonFile(filePath, outputData);

    return filePath;
  }

  /**
   * Write organisations to JSON file
   * @param organisations Array of organisations
   * @param outputPath Optional override for output path
   * @returns Path to written file
   */
  async writeOrganisations(organisations: Organisation[], outputPath?: string): Promise<string> {
    const filePath = outputPath || this.config.outputPath;
    
    // Create minimal processing result
    const result: ProcessingResult = {
      organisations,
      metadata: {
        processedAt: new Date().toISOString(),
        sources: [],
        statistics: {
          totalOrganisations: organisations.length,
          duplicatesFound: 0,
          conflictsDetected: 0,
          organisationsByType: this.countByType(organisations)
        }
      }
    };

    return this.writeResult(result, filePath);
  }

  /**
   * Write JSON data to file
   * @param filePath Path to write to
   * @param data Data to write
   */
  private async writeJsonFile(filePath: string, data: any): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Prepare JSON string
    const jsonString = this.config.prettyPrint
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);

    // Write file
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, jsonString, 'utf8', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Generate summary statistics
   * @param result Processing result
   * @returns Summary object
   */
  private generateSummary(result: ProcessingResult): OutputSummary {
    const organisations = result.organisations;
    
    // Count by type
    const organisationsByType = this.countByType(organisations);

    // Count by status
    const organisationsByStatus = {
      active: 0,
      inactive: 0,
      dissolved: 0
    };

    organisations.forEach((org: Organisation) => {
      organisationsByStatus[org.status]++;
    });

    // Calculate data quality metrics
    let totalCompleteness = 0;
    let requireReview = 0;
    let withConflicts = 0;

    organisations.forEach((org: Organisation) => {
      totalCompleteness += org.dataQuality.completeness;
      if (org.dataQuality.requiresReview) {
        requireReview++;
      }
      if (org.dataQuality.hasConflicts) {
        withConflicts++;
      }
    });

    const averageCompleteness = organisations.length > 0
      ? totalCompleteness / organisations.length
      : 0;

    // Count by source
    const sources: Record<string, number> = {};
    organisations.forEach((org: Organisation) => {
      org.sources.forEach((source: any) => {
        sources[source.source] = (sources[source.source] || 0) + 1;
      });
    });

    return {
      totalOrganisations: organisations.length,
      organisationsByType,
      organisationsByStatus,
      dataQuality: {
        averageCompleteness: Math.round(averageCompleteness * 100) / 100,
        organisationsRequiringReview: requireReview,
        organisationsWithConflicts: withConflicts
      },
      sources,
      generated: new Date().toISOString()
    };
  }

  /**
   * Count organisations by type
   * @param organisations Array of organisations
   * @returns Count by type
   */
  private countByType(organisations: Organisation[]): Record<OrganisationType, number> {
    const counts: Record<OrganisationType, number> = {
      [OrganisationType.MINISTERIAL_DEPARTMENT]: 0,
      [OrganisationType.EXECUTIVE_AGENCY]: 0,
      [OrganisationType.LOCAL_AUTHORITY]: 0,
      [OrganisationType.NHS_TRUST]: 0,
      [OrganisationType.NHS_FOUNDATION_TRUST]: 0,
      [OrganisationType.NDPB]: 0,
      [OrganisationType.EXECUTIVE_NDPB]: 0,
      [OrganisationType.ADVISORY_NDPB]: 0,
      [OrganisationType.TRIBUNAL_NDPB]: 0,
      [OrganisationType.PUBLIC_CORPORATION]: 0,
      [OrganisationType.DEVOLVED_ADMINISTRATION]: 0,
      [OrganisationType.OTHER]: 0
    };

    organisations.forEach((org: Organisation) => {
      counts[org.type]!++;
    });

    return counts;
  }

  /**
   * Write summary report to separate file
   * @param result Processing result
   * @param reportPath Path for report file
   * @returns Path to written report
   */
  async writeSummaryReport(result: ProcessingResult, reportPath?: string): Promise<string> {
    const filePath = reportPath || path.join(
      path.dirname(this.config.outputPath),
      'summary.json'
    );

    const summary = this.generateSummary(result);
    await this.writeJsonFile(filePath, summary);

    return filePath;
  }

  /**
   * Write conflicts to separate file
   * @param conflicts Array of conflicts
   * @param conflictsPath Path for conflicts file
   * @returns Path to written file
   */
  async writeConflicts(conflicts: DataConflict[], conflictsPath?: string): Promise<string> {
    const filePath = conflictsPath || path.join(
      path.dirname(this.config.outputPath),
      'conflicts.json'
    );

    await this.writeJsonFile(filePath, {
      conflicts,
      count: conflicts.length,
      generated: new Date().toISOString()
    });

    return filePath;
  }

  /**
   * Write CSV export of organisations
   * @param organisations Array of organisations
   * @param csvPath Path for CSV file
   * @returns Path to written file
   */
  async writeCsv(organisations: Organisation[], csvPath?: string): Promise<string> {
    const filePath = csvPath || path.join(
      path.dirname(this.config.outputPath),
      'orgs.csv'
    );

    // Prepare CSV headers
    const headers = [
      'id',
      'name',
      'type',
      'classification',
      'status',
      'parentOrganisation',
      'controllingUnit',
      'establishmentDate',
      'dissolutionDate',
      'country',
      'region',
      'address',
      'dataCompleteness',
      'requiresReview',
      'sources',
      'lastUpdated'
    ];

    // Build CSV content
    const csvLines: string[] = [headers.join(',')];

    for (const org of organisations) {
      const row = [
        this.escapeCsvValue(org.id),
        this.escapeCsvValue(org.name),
        this.escapeCsvValue(org.type),
        this.escapeCsvValue(org.classification),
        this.escapeCsvValue(org.status),
        this.escapeCsvValue(org.parentOrganisation || ''),
        this.escapeCsvValue(org.controllingUnit || ''),
        this.escapeCsvValue(org.establishmentDate || ''),
        this.escapeCsvValue(org.dissolutionDate || ''),
        this.escapeCsvValue(org.location?.country || ''),
        this.escapeCsvValue(org.location?.region || ''),
        this.escapeCsvValue(org.location?.address || ''),
        org.dataQuality.completeness.toFixed(2),
        org.dataQuality.requiresReview ? 'Yes' : 'No',
        org.sources.map((s: any) => s.source).join(';'),
        org.lastUpdated
      ];

      csvLines.push(row.join(','));
    }

    // Write CSV file
    const csvContent = csvLines.join('\n');
    
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, csvContent, 'utf8', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(filePath);
        }
      });
    });
  }

  /**
   * Escape CSV value
   * @param value Value to escape
   * @returns Escaped value
   */
  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}

/**
 * Create a default writer instance
 */
export const createWriter = (config?: WriterConfig): WriterService => {
  return new WriterService(config);
};

/**
 * Quick write function for simple use cases
 * @param organisations Organisations to write
 * @param outputPath Output file path
 * @returns Path to written file
 */
export async function writeOrganisations(
  organisations: Organisation[],
  outputPath = 'dist/orgs.json'
): Promise<string> {
  const writer = new WriterService({ outputPath });
  return writer.writeOrganisations(organisations, outputPath);
}

/**
 * Quick write function for processing results
 * @param result Processing result to write
 * @param outputPath Output file path
 * @returns Path to written file
 */
export async function writeResult(
  result: ProcessingResult,
  outputPath = 'dist/orgs.json'
): Promise<string> {
  const writer = new WriterService({ outputPath });
  return writer.writeResult(result, outputPath);
}