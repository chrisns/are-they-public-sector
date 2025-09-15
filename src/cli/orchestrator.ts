/**
 * Orchestrator for UK Public Sector Organisation Aggregator
 * Coordinates all services and implements the complete aggregation workflow
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { performance } from 'perf_hooks';

// Import services
import {
  FetcherService,
  DeduplicatorService,
  WriterService,
  createFetcher,
  createDeduplicator,
  createWriter
} from '../services/index.js';
import type { FetchResult } from '../services/index.js';
import { createSimpleParser, SimpleParserService } from '../services/parser-simple.js';
import { createSimpleMapper, SimpleMapperService } from '../services/mapper-simple.js';
import { NHSParser } from '../services/nhs-parser.js';
import { LocalAuthorityParser } from '../services/local-authority-parser.js';
import { SchoolsParser } from '../services/schools-parser.js';
import { DevolvedAdminParser } from '../services/devolved-admin-parser.js';
import { NHSMapper } from '../services/mappers/nhs-mapper.js';
import { LocalAuthorityMapper } from '../services/mappers/local-authority-mapper.js';
import { SchoolsMapper } from '../services/mappers/schools-mapper.js';
import { DevolvedAdminMapper } from '../services/mappers/devolved-admin-mapper.js';
import { PoliceParser } from '../services/police-parser.js';
import { FireParser } from '../services/fire-parser.js';
import { DevolvedExtraParser } from '../services/devolved-extra-parser.js';
import { CollegesParser } from '../services/colleges-parser.js';
import { PoliceMapper } from '../services/mappers/police-mapper.js';
import { FireMapper } from '../services/mappers/fire-mapper.js';
import { DevolvedExtraMapper } from '../services/mappers/devolved-extra-mapper.js';
import { CollegesMapper } from '../services/mappers/colleges-mapper.js';

// Import models
import type { Organisation, DataSourceReference } from '../models/organisation.js';
import type {
  ProcessingResult,
  ProcessingMetadata,
  ProcessingStatistics,
  SourceMetadata
} from '../models/processing.js';
import { DataSourceType, OrganisationType } from '../models/organisation.js';

// Import logger
import { Logger, createLogger, LogLevel } from './logger.js';

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  cacheEnabled?: boolean;
  cacheDir?: string;
  debugMode?: boolean;
  timeout?: number;
  outputPath?: string;
  logger?: Logger;
  source?: string;
}

/**
 * Aggregation result structure
 */
export interface AggregationResult {
  success: boolean;
  sources: string[];
  organisations: Organisation[];
  totalRecords: number;
  metadata?: ProcessingMetadata;
  error?: Error;
  performance?: {
    memoryUsed: number;
    peakMemoryMB: number;
  };
}

/**
 * Workflow phase result
 */
export interface WorkflowPhase {
  success: boolean;
  error?: Error;
  [key: string]: unknown;
}

/**
 * Extended workflow phases for additional data sources
 */
export interface WorkflowPhasesWithExtensions {
  govUk: WorkflowPhase;
  onsInstitutional: WorkflowPhase;
  onsNonInstitutional: WorkflowPhase;
  nhsTrusts?: WorkflowPhase & { recordCount?: number };
  localAuthorities?: WorkflowPhase & { recordCount?: number };
  schools?: WorkflowPhase & { recordCount?: number };
  devolvedAdmin?: WorkflowPhase & { recordCount?: number };
  police?: WorkflowPhase & { recordCount?: number };
  fire?: WorkflowPhase & { recordCount?: number };
  devolvedExtra?: WorkflowPhase & { recordCount?: number };
  colleges?: WorkflowPhase & { recordCount?: number };
}

/**
 * Complete workflow result
 */
export interface WorkflowResult {
  success: boolean;
  phases: {
    dataFetching: {
      govUk: WorkflowPhase;
      onsInstitutional: WorkflowPhase;
      onsNonInstitutional: WorkflowPhase;
    };
    dataMapping: WorkflowPhase & {
      mappedFields?: number;
    };
    deduplication: WorkflowPhase & {
      duplicatesFound?: number;
      duplicatesResolved?: number;
    };
    outputGeneration: WorkflowPhase & {
      filePath?: string;
      recordCount?: number;
    };
  };
  completedAt?: string;
  totalDurationMs?: number;
}

/**
 * Data fetch result
 */
export interface DataFetchResult {
  success: boolean;
  data?: unknown;
  organisations?: Organisation[];
  metadata: {
    source: string;
    fetchedAt: string;
    [key: string]: unknown;
  };
  error?: Error;
}

/**
 * ONS data fetch result
 */
export interface OnsDataResult {
  success: boolean;
  institutionalUnits: Organisation[];
  nonInstitutionalUnits: Organisation[];
  metadata: {
    excelUrl: string;
    dynamicallyResolved: boolean;
    fetchedAt: string;
  };
  error?: Error;
}

/**
 * Output generation result
 */
export interface OutputResult {
  success: boolean;
  outputPath: string;
  recordCount: number;
  validation: {
    isValidJson: boolean;
    hasRequiredFields: boolean;
  };
  preview: {
    metadata: unknown;
    organisations: Organisation[];
  };
  error?: Error;
}

/**
 * Main orchestrator class that coordinates the aggregation workflow
 */
export class Orchestrator {
  private config: OrchestratorConfig;
  private logger: Logger;
  private fetcher: FetcherService;
  private simpleParser: SimpleParserService;
  private simpleMapper: SimpleMapperService;
  private deduplicator: DeduplicatorService;
  private writer: WriterService;
  private nhsParser: NHSParser;
  private localAuthorityParser: LocalAuthorityParser;
  private schoolsParser: SchoolsParser;
  private devolvedAdminParser: DevolvedAdminParser;
  private nhsMapper: NHSMapper;
  private localAuthorityMapper: LocalAuthorityMapper;
  private schoolsMapper: SchoolsMapper;
  private devolvedAdminMapper: DevolvedAdminMapper;
  private startTime: number = 0;
  private peakMemory: number = 0;

  constructor(config?: OrchestratorConfig) {
    this.config = {
      cacheEnabled: false,
      cacheDir: '.cache',
      debugMode: false,
      timeout: 30000,
      outputPath: 'dist/orgs.json',
      ...config
    };

    // Initialize logger
    this.logger = this.config.logger || createLogger({
      debugMode: !!this.config.debugMode,
      level: this.config.debugMode ? LogLevel.DEBUG : LogLevel.INFO
    });

    // Initialize services
    this.fetcher = createFetcher({
      timeout: this.config.timeout || 30000,
      maxRetries: 3,
      retryDelay: 1000
    });
    
    this.simpleParser = createSimpleParser();
    this.simpleMapper = createSimpleMapper();

    this.deduplicator = createDeduplicator({
      conflictResolutionStrategy: 'most_complete',
      trackProvenance: true
    });

    this.writer = createWriter({
      outputPath: this.config.outputPath || 'dist/orgs.json',
      prettyPrint: true,
      includeMetadata: true
    });
    
    // Initialize NHS, Local Authority, Schools, and Devolved Admin parsers
    this.nhsParser = new NHSParser();
    this.localAuthorityParser = new LocalAuthorityParser();
    this.schoolsParser = new SchoolsParser();
    this.devolvedAdminParser = new DevolvedAdminParser();
    this.nhsMapper = new NHSMapper();
    this.localAuthorityMapper = new LocalAuthorityMapper();
    this.schoolsMapper = new SchoolsMapper();
    this.devolvedAdminMapper = new DevolvedAdminMapper();
  }

  /**
   * Track memory usage
   */
  private trackMemory(): void {
    if (global.gc) {
      global.gc();
    }
    const memUsage = process.memoryUsage();
    const memMB = memUsage.heapUsed / 1024 / 1024;
    if (memMB > this.peakMemory) {
      this.peakMemory = memMB;
    }
  }

  /**
   * Get or fetch cached data
   */
  private async getCachedOrFetch(
    cacheKey: string,
    fetchFn: () => Promise<unknown>
  ): Promise<unknown> {
    if (this.config.cacheEnabled) {
      const cachePath = join(this.config.cacheDir!, `${cacheKey}.json`);
      
      if (existsSync(cachePath)) {
        this.logger.debug(`Loading cached data for ${cacheKey}`);
        const cached = JSON.parse(readFileSync(cachePath, 'utf-8'));
        
        // Check if cache is less than 1 hour old
        const cacheAge = Date.now() - new Date(cached.cachedAt).getTime();
        if (cacheAge < 3600000) {
          this.logger.info(`Using cached data for ${cacheKey}`);
          return cached.data;
        }
      }
    }

    // Fetch fresh data
    const data = await fetchFn();

    // Cache the result
    if (this.config.cacheEnabled) {
      const cachePath = join(this.config.cacheDir!, `${cacheKey}.json`);
      const cacheDir = dirname(cachePath);
      
      if (!existsSync(cacheDir)) {
        mkdirSync(cacheDir, { recursive: true });
      }
      
      writeFileSync(cachePath, JSON.stringify({
        cachedAt: new Date().toISOString(),
        data
      }, null, 2));
      
      this.logger.debug(`Cached data for ${cacheKey}`);
    }

    return data;
  }

  /**
   * Fetch GOV.UK organisations data
   */
  async fetchGovUkData(): Promise<DataFetchResult> {
    this.logger.subsection('Fetching GOV.UK API data');
    
    try {
      const data = await this.getCachedOrFetch('govuk-api', async () => {
        this.logger.startProgress('Fetching GOV.UK organisations...');
        
        const fetchResult = await this.fetcher.fetchGovUkOrganisations();
        
        this.logger.stopProgress('GOV.UK data fetched successfully');
        
        if (!fetchResult.success) {
          throw new Error(fetchResult.error || 'Failed to fetch GOV.UK data');
        }
        
        return fetchResult;
      });

      // Parse the data using simple parser
      this.logger.startProgress('Parsing GOV.UK data...');
      const parseResult = this.simpleParser.parseGovUkJson((data as FetchResult).data);
      this.logger.stopProgress(`Parsed ${parseResult.data?.length || 0} GOV.UK organisations`);

      // Map to standard format using simple mapper
      const mapped: Organisation[] = [];
      if (parseResult.data) {
        for (const org of parseResult.data) {
          const mappedResult = this.simpleMapper.mapGovUkOrganisation(org);
          if (mappedResult.data) {
            mapped.push(mappedResult.data);
          }
        }
      }

      return {
        success: true,
        data: {
          organisations: mapped
        },
        organisations: mapped,
        metadata: {
          source: 'https://www.gov.uk/api/content/government/organisations',
          fetchedAt: new Date().toISOString(),
          count: mapped.length
        }
      };
    } catch (error) {
      this.logger.error('Failed to fetch GOV.UK data', error);
      return {
        success: false,
        metadata: {
          source: 'https://www.gov.uk/api/content/government/organisations',
          fetchedAt: new Date().toISOString()
        },
        error: error as Error
      };
    }
  }

  /**
   * Fetch ONS classification data
   */
  async fetchOnsData(): Promise<OnsDataResult> {
    this.logger.subsection('Fetching ONS classification data');
    
    try {
      // Dynamically scrape the ONS page to find the Excel link
      this.logger.startProgress('Scraping ONS page for Excel link...');
      const excelUrl = await this.getCachedOrFetch('ons-excel-url', async () => {
        const url = await this.fetcher.scrapeOnsExcelLink();
        if (!url) {
          throw new Error('Could not find ONS Excel file link on page');
        }
        return url;
      });
      
      this.logger.stopProgress('ONS Excel URL dynamically resolved');
      this.logger.debug('Excel URL', { url: excelUrl });

      // Download Excel file
      this.logger.startProgress('Downloading ONS Excel file...');
      const excelPath = await this.getCachedOrFetch('ons-excel-data', async () => {
        const downloadResult = await this.fetcher.downloadOnsExcel(excelUrl as string);
        if (!downloadResult.success) {
          throw new Error('Failed to download ONS Excel file');
        }
        return downloadResult.data;
      });
      this.logger.stopProgress('ONS Excel file downloaded');

      // Parse Excel data using simple parser
      this.logger.startProgress('Parsing ONS Excel data...');
      const parseResult = this.simpleParser.parseOnsExcel((excelPath as {filePath?: string}).filePath || (excelPath as string));
      
      const institutionalData = parseResult.data?.institutional || [];
      const nonInstitutionalData = parseResult.data?.nonInstitutional || [];
      
      this.logger.stopProgress(
        `Parsed ${institutionalData.length} institutional and ${nonInstitutionalData.length} non-institutional units`
      );

      // Map to standard format using simple mapper
      const institutionalMapped: Organisation[] = [];
      for (const org of institutionalData) {
        const mappedResult = this.simpleMapper.mapOnsOrganisation(org);
        if (mappedResult.data) {
          institutionalMapped.push(mappedResult.data);
        }
      }

      const nonInstitutionalMapped: Organisation[] = [];
      for (const org of nonInstitutionalData) {
        const mappedResult = this.simpleMapper.mapOnsOrganisation(org);
        if (mappedResult.data) {
          nonInstitutionalMapped.push(mappedResult.data);
        }
      }

      return {
        success: true,
        institutionalUnits: institutionalMapped,
        nonInstitutionalUnits: nonInstitutionalMapped,
        metadata: {
          excelUrl: excelUrl as string,
          dynamicallyResolved: true,
          fetchedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to fetch ONS data', error);
      return {
        success: false,
        institutionalUnits: [],
        nonInstitutionalUnits: [],
        metadata: {
          excelUrl: '',
          dynamicallyResolved: false,
          fetchedAt: new Date().toISOString()
        },
        error: error as Error
      };
    }
  }

  /**
   * Fetch NHS Trust data
   */
  async fetchNHSData(): Promise<DataFetchResult> {
    this.logger.subsection('Fetching NHS Trust data');
    
    try {
      const url = 'https://www.england.nhs.uk/publication/nhs-provider-directory/';
      
      this.logger.startProgress('Fetching NHS Provider Directory...');
      const parseResult = await this.nhsParser.parse(url);
      this.logger.stopProgress(`Fetched ${parseResult.count} NHS Trusts`);
      
      // Map to Organisation model
      this.logger.startProgress('Mapping NHS Trusts to organisation model...');
      const mapped = this.nhsMapper.mapMultiple(parseResult.trusts);
      this.logger.stopProgress(`Mapped ${mapped.length} NHS organisations`);
      
      return {
        success: true,
        data: { organisations: mapped },
        organisations: mapped,
        metadata: {
          source: 'nhs-provider-directory',
          fetchedAt: parseResult.timestamp,
          count: mapped.length
        }
      };
    } catch (error) {
      this.logger.error('Failed to fetch NHS data', error);
      return {
        success: false,
        metadata: {
          source: 'nhs-provider-directory',
          fetchedAt: new Date().toISOString()
        },
        error: error as Error
      };
    }
  }
  
  /**
   * Fetch Local Authority data
   */
  async fetchLocalAuthorityData(): Promise<DataFetchResult> {
    this.logger.subsection('Fetching Local Authority data');
    
    try {
      const url = 'https://uk-air.defra.gov.uk/links?view=la';
      
      this.logger.startProgress('Fetching DEFRA UK-AIR Local Authorities...');
      const parseResult = await this.localAuthorityParser.parse(url);
      this.logger.stopProgress(`Fetched ${parseResult.count} Local Authorities`);
      
      // Map to Organisation model
      this.logger.startProgress('Mapping Local Authorities to organisation model...');
      const mapped = this.localAuthorityMapper.mapMultiple(parseResult.authorities);
      this.logger.stopProgress(`Mapped ${mapped.length} Local Authority organisations`);
      
      return {
        success: true,
        data: { organisations: mapped },
        organisations: mapped,
        metadata: {
          source: 'defra-uk-air',
          fetchedAt: parseResult.timestamp,
          count: mapped.length
        }
      };
    } catch (error) {
      this.logger.error('Failed to fetch Local Authority data', error);
      return {
        success: false,
        metadata: {
          source: 'defra-uk-air',
          fetchedAt: new Date().toISOString()
        },
        error: error as Error
      };
    }
  }

  /**
   * Fetch Devolved Administrations data
   */
  async fetchDevolvedAdminData(): Promise<DataFetchResult> {
    this.logger.subsection('Fetching Devolved Administrations data');
    
    try {
      this.logger.startProgress('Loading devolved administrations...');
      
      // Aggregate devolved admin entities
      const result = await this.devolvedAdminParser.aggregate({
        includeAgencies: true,
        includePublicBodies: true
      });
      
      // Map to organisations
      const organisations = this.devolvedAdminMapper.mapMultiple(result.entities);
      
      this.logger.stopProgress(`Fetched ${result.entities.length} devolved administration entities`);
      this.logger.success(`Mapped to ${organisations.length} organisations`);
      
      // Log breakdown
      this.logger.info(`By administration: Scotland=${result.metadata.byAdministration.scotland}, Wales=${result.metadata.byAdministration.wales}, NI=${result.metadata.byAdministration.northern_ireland}`);
      
      return {
        success: true,
        organisations,
        metadata: result.metadata
      };
    } catch (error) {
      this.logger.error(`Failed to fetch devolved admin data: ${error}`);
      return {
        success: false,
        error: error as Error,
        organisations: [],
        metadata: {
          source: 'devolved-admin',
          fetchedAt: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Fetch Schools data
   */
  async fetchSchoolsData(): Promise<DataFetchResult> {
    this.logger.subsection('Fetching Schools data');
    
    try {
      this.logger.startProgress('Fetching schools from GIAS...');
      
      // Aggregate schools with appropriate options for CLI
      const result = await this.schoolsParser.aggregate({
        searchTerm: 'e',  // Comprehensive search
        delayMs: 500,     // Rate limiting delay
        maxRetries: 5     // Retry on failures
      });
      
      this.logger.stopProgress(`Fetched ${result.schools.length} schools`);
      
      // Map to Organisation model
      this.logger.startProgress('Mapping schools to organisation model...');
      const mapped = this.schoolsMapper.mapMultiple(result.schools);
      this.logger.stopProgress(`Mapped ${mapped.length} school organisations`);
      
      return {
        success: true,
        data: { organisations: mapped },
        organisations: mapped,
        metadata: {
          source: 'gias',
          fetchedAt: result.metadata.fetchedAt,
          count: mapped.length,
          totalCount: result.metadata.totalCount,
          openCount: result.metadata.openCount
        }
      };
    } catch (error) {
      this.logger.error('Failed to fetch Schools data', error);
      return {
        success: false,
        metadata: {
          source: 'gias',
          fetchedAt: new Date().toISOString()
        },
        error: error as Error
      };
    }
  }

  /**
   * Fetch Police Forces data
   */
  async fetchPoliceData(): Promise<DataFetchResult> {
    this.logger.subsection('Fetching Police Forces');
    
    try {
      this.logger.startProgress('Fetching police forces...');
      
      const parser = new PoliceParser();
      const mapper = new PoliceMapper();
      const result = await parser.aggregate();
      
      const organisations = result.forces.map(force => mapper.mapToOrganisation(force));
      
      this.logger.stopProgress(`Fetched ${result.forces.length} police forces`);
      this.logger.success(`Mapped to ${organisations.length} organisations`);
      
      return {
        success: true,
        organisations,
        metadata: result.metadata
      };
    } catch (error) {
      this.logger.error(`Failed to fetch police data: ${error}`);
      return {
        success: false,
        error: error as Error,
        metadata: { source: 'police.uk', fetchedAt: new Date().toISOString() }
      };
    }
  }

  /**
   * Fetch Fire Services data
   */
  async fetchFireData(): Promise<DataFetchResult> {
    this.logger.subsection('Fetching Fire Services');
    
    try {
      this.logger.startProgress('Fetching fire services...');
      
      const parser = new FireParser();
      const mapper = new FireMapper();
      const result = await parser.aggregate();
      
      const organisations = result.services.map(service => mapper.mapToOrganisation(service));
      
      this.logger.stopProgress(`Fetched ${result.services.length} fire services`);
      this.logger.success(`Mapped to ${organisations.length} organisations`);
      
      return {
        success: true,
        organisations,
        metadata: result.metadata
      };
    } catch (error) {
      this.logger.error(`Failed to fetch fire data: ${error}`);
      return {
        success: false,
        error: error as Error,
        metadata: { source: 'NFCC', fetchedAt: new Date().toISOString() }
      };
    }
  }

  /**
   * Fetch Additional Devolved Bodies data
   */
  async fetchDevolvedExtraData(): Promise<DataFetchResult> {
    this.logger.subsection('Fetching Additional Devolved Bodies');
    
    try {
      this.logger.startProgress('Fetching additional devolved bodies...');
      
      const parser = new DevolvedExtraParser();
      const mapper = new DevolvedExtraMapper();
      const result = await parser.aggregate();
      
      const organisations = result.bodies.map(body => mapper.mapToOrganisation(body));
      
      this.logger.stopProgress(`Fetched ${result.bodies.length} new devolved bodies`);
      this.logger.success(`Mapped to ${organisations.length} organisations`);
      
      return {
        success: true,
        organisations,
        metadata: result.metadata
      };
    } catch (error) {
      this.logger.error(`Failed to fetch additional devolved data: ${error}`);
      return {
        success: false,
        error: error as Error,
        metadata: { source: 'gov.uk/guidance', fetchedAt: new Date().toISOString() }
      };
    }
  }

  /**
   * Fetch UK Colleges data (Scotland, Wales, Northern Ireland)
   */
  async fetchCollegesData(): Promise<DataFetchResult> {
    this.logger.subsection('Fetching UK Colleges');

    try {
      this.logger.startProgress('Fetching colleges from AoC website...');

      const parser = new CollegesParser();
      const mapper = new CollegesMapper();
      const result = await parser.aggregate();

      const organisations = result.colleges.map(college => mapper.mapToOrganisation(college));

      this.logger.stopProgress(`Fetched ${result.colleges.length} colleges`);
      this.logger.success(`Mapped to ${organisations.length} organisations`);

      return {
        success: true,
        organisations,
        metadata: result.metadata
      };
    } catch (error) {
      this.logger.error(`Failed to fetch colleges data: ${error}`);
      return {
        success: false,
        error: error as Error,
        metadata: { source: 'aoc.co.uk', fetchedAt: new Date().toISOString() }
      };
    }
  }

  /**
   * Perform complete aggregation from all sources
   */
  async performCompleteAggregation(): Promise<AggregationResult> {
    this.startTime = performance.now();
    this.trackMemory();
    
    this.logger.section('Starting Complete Aggregation');
    
    const allOrganisations: Organisation[] = [];
    const sources: string[] = [];
    const errors: Error[] = [];

    try {
      const sourceFilter = this.config.source?.toLowerCase();
      this.logger.info(`Source filter: ${sourceFilter || 'none (fetching all sources)'}`);
      
      // Fetch GOV.UK data
      if (!sourceFilter || sourceFilter === 'govuk' || sourceFilter === 'gov-uk') {
        const govUkResult = await this.fetchGovUkData();
        if (govUkResult.success && govUkResult.organisations) {
          allOrganisations.push(...govUkResult.organisations);
          sources.push('gov.uk-api');
          this.logger.success(`Added ${govUkResult.organisations.length} GOV.UK organisations`);
        } else {
          errors.push(govUkResult.error || new Error('GOV.UK fetch failed'));
        }
      }

      // Fetch ONS data
      if (!sourceFilter || sourceFilter === 'ons') {
        const onsResult = await this.fetchOnsData();
        if (onsResult.success) {
          allOrganisations.push(...onsResult.institutionalUnits);
          allOrganisations.push(...onsResult.nonInstitutionalUnits);
          sources.push('ons-institutional-units', 'ons-non-institutional-units');
          this.logger.success(
            `Added ${onsResult.institutionalUnits.length} institutional and ` +
            `${onsResult.nonInstitutionalUnits.length} non-institutional ONS units`
          );
        } else {
          errors.push(onsResult.error || new Error('ONS fetch failed'));
        }
      }
      
      // Fetch NHS Trust data
      if (!sourceFilter || sourceFilter === 'nhs-provider-directory' || sourceFilter === 'nhs') {
        const nhsResult = await this.fetchNHSData();
        if (nhsResult.success && nhsResult.organisations) {
          allOrganisations.push(...nhsResult.organisations);
          sources.push('nhs-provider-directory');
          this.logger.success(`Added ${nhsResult.organisations.length} NHS Trusts`);
        } else {
          errors.push(nhsResult.error || new Error('NHS fetch failed'));
        }
      }
      
      // Fetch Local Authority data
      if (!sourceFilter || sourceFilter === 'defra-uk-air' || sourceFilter === 'defra' || sourceFilter === 'la') {
        const laResult = await this.fetchLocalAuthorityData();
        if (laResult.success && laResult.organisations) {
          allOrganisations.push(...laResult.organisations);
          sources.push('defra-uk-air');
          this.logger.success(`Added ${laResult.organisations.length} Local Authorities`);
        } else {
          errors.push(laResult.error || new Error('Local Authority fetch failed'));
        }
      }
      
      // Fetch Schools data
      if (!sourceFilter || sourceFilter === 'gias' || sourceFilter === 'schools') {
        const schoolsResult = await this.fetchSchoolsData();
        if (schoolsResult.success && schoolsResult.organisations) {
          allOrganisations.push(...schoolsResult.organisations);
          sources.push('gias');
          this.logger.success(`Added ${schoolsResult.organisations.length} Schools`);
        } else {
          errors.push(schoolsResult.error || new Error('Schools fetch failed'));
        }
      }

      // Fetch Devolved Administrations data
      if (!sourceFilter || sourceFilter === 'devolved' || sourceFilter === 'manual') {
        const devolvedResult = await this.fetchDevolvedAdminData();
        if (devolvedResult.success && devolvedResult.organisations) {
          allOrganisations.push(...devolvedResult.organisations);
          sources.push('manual');
          this.logger.success(`Added ${devolvedResult.organisations.length} Devolved Administration entities`);
        } else {
          errors.push(devolvedResult.error || new Error('Devolved admin fetch failed'));
        }
      }

      // Fetch Police Forces data
      this.logger.debug(`Checking police fetch: sourceFilter=${sourceFilter}, will fetch=${!sourceFilter || sourceFilter === 'police' || sourceFilter === 'police-uk'}`);
      if (!sourceFilter || sourceFilter === 'police' || sourceFilter === 'police-uk') {
        this.logger.info('Fetching police forces...');
        const policeResult = await this.fetchPoliceData();
        if (policeResult.success && policeResult.organisations) {
          allOrganisations.push(...policeResult.organisations);
          sources.push('police.uk');
          this.logger.success(`Added ${policeResult.organisations.length} Police Forces`);
        } else {
          errors.push(policeResult.error || new Error('Police fetch failed'));
        }
      }

      // Fetch Fire Services data
      if (!sourceFilter || sourceFilter === 'fire' || sourceFilter === 'nfcc') {
        const fireResult = await this.fetchFireData();
        if (fireResult.success && fireResult.organisations) {
          allOrganisations.push(...fireResult.organisations);
          sources.push('nfcc');
          this.logger.success(`Added ${fireResult.organisations.length} Fire Services`);
        } else {
          errors.push(fireResult.error || new Error('Fire services fetch failed'));
        }
      }

      // Fetch Additional Devolved Bodies data
      if (!sourceFilter || sourceFilter === 'devolved-extra' || sourceFilter === 'devolved-additional') {
        const devolvedExtraResult = await this.fetchDevolvedExtraData();
        if (devolvedExtraResult.success && devolvedExtraResult.organisations) {
          allOrganisations.push(...devolvedExtraResult.organisations);
          sources.push('gov.uk-guidance');
          this.logger.success(`Added ${devolvedExtraResult.organisations.length} Additional Devolved Bodies`);
        } else {
          errors.push(devolvedExtraResult.error || new Error('Additional devolved fetch failed'));
        }
      }

      // Fetch UK Colleges data (Scotland, Wales, Northern Ireland)
      if (!sourceFilter || sourceFilter === 'colleges' || sourceFilter === 'colleges-uk') {
        const collegesResult = await this.fetchCollegesData();
        if (collegesResult.success && collegesResult.organisations) {
          allOrganisations.push(...collegesResult.organisations);
          sources.push('aoc.co.uk');
          this.logger.success(`Added ${collegesResult.organisations.length} UK Colleges`);
        } else {
          errors.push(collegesResult.error || new Error('Colleges fetch failed'));
        }
      }

      // Track memory after fetching
      this.trackMemory();

      // Deduplicate organisations
      this.logger.subsection('Deduplicating organisations');
      this.logger.startProgress('Processing duplicates...', allOrganisations.length);
      
      const dedupResult = this.deduplicator.deduplicate(allOrganisations);
      
      this.logger.stopProgress(
        `Deduplication complete: ${dedupResult.originalCount - dedupResult.deduplicatedCount} duplicates merged`
      );

      // Track final memory usage
      this.trackMemory();
      
      const duration = performance.now() - this.startTime;
      
      // Build metadata
      const sourceMetadata: SourceMetadata[] = sources.map(source => ({
        source: source.includes('gov.uk') ? DataSourceType.GOV_UK_API :
                source.includes('institutional') ? DataSourceType.ONS_INSTITUTIONAL :
                DataSourceType.ONS_NON_INSTITUTIONAL,
        recordCount: dedupResult.organisations.filter((org: Organisation) =>
          org.sources.some((s: DataSourceReference) => s.source.toString() === source.replace('-units', '').replace('.uk-api', '_uk_api').replace('-', '_'))
        ).length,
        retrievedAt: new Date().toISOString()
      }));

      // Calculate statistics
      const stats: ProcessingStatistics = {
        totalOrganisations: dedupResult.organisations.length,
        duplicatesFound: dedupResult.originalCount - dedupResult.deduplicatedCount,
        conflictsDetected: 0,
        organisationsByType: {} as Record<OrganisationType, number>
      };

      // Count by type
      for (const orgType in OrganisationType) {
        const typeValue = OrganisationType[orgType as keyof typeof OrganisationType];
        stats.organisationsByType[typeValue] = dedupResult.organisations.filter(
          (org: Organisation) => org.type === typeValue
        ).length;
      }

      const metadata: ProcessingMetadata = {
        processedAt: new Date().toISOString(),
        sources: sourceMetadata,
        statistics: stats
      };
      
      this.logger.section('Aggregation Complete');
      this.logger.info('Summary:', {
        totalRecords: dedupResult.organisations.length,
        sources: sources,
        duplicatesFound: dedupResult.originalCount - dedupResult.deduplicatedCount,
        processingTimeMs: Math.round(duration),
        peakMemoryMB: Math.round(this.peakMemory)
      });

      return {
        success: errors.length === 0,
        sources,
        organisations: dedupResult.organisations,
        totalRecords: dedupResult.organisations.length,
        metadata,
        performance: {
          memoryUsed: process.memoryUsage().heapUsed,
          peakMemoryMB: this.peakMemory
        }
      };
    } catch (error) {
      this.logger.error('Aggregation failed', error);
      return {
        success: false,
        sources,
        organisations: allOrganisations,
        totalRecords: allOrganisations.length,
        error: error as Error,
        performance: {
          memoryUsed: process.memoryUsage().heapUsed,
          peakMemoryMB: this.peakMemory
        }
      };
    }
  }

  /**
   * Generate consolidated output file
   */
  async generateConsolidatedOutput(): Promise<OutputResult> {
    this.logger.section('Generating Consolidated Output');
    
    try {
      // Perform aggregation first
      const aggregationResult = await this.performCompleteAggregation();
      
      if (!aggregationResult.success) {
        throw aggregationResult.error || new Error('Aggregation failed');
      }

      // Write output
      this.logger.startProgress('Writing output file...');
      
      const outputPath = await this.writer.writeResult({
        organisations: aggregationResult.organisations,
        metadata: aggregationResult.metadata!
      });
      
      this.logger.stopProgress(`Output written to ${outputPath}`);

      // Validate output
      this.logger.debug('Validating output file...');
      const outputContent = readFileSync(outputPath, 'utf-8');
      const outputData = JSON.parse(outputContent);
      
      const validation = {
        isValidJson: true,
        hasRequiredFields: !!(
          outputData.metadata &&
          outputData.organisations &&
          Array.isArray(outputData.organisations)
        )
      };

      // Get file size
      const stats = statSync(outputPath);
      const fileSizeKB = stats.size / 1024;

      this.logger.success('Output generation complete', {
        path: outputPath,
        records: aggregationResult.organisations.length,
        size: `${fileSizeKB.toFixed(2)} KB`
      });

      return {
        success: true,
        outputPath,
        recordCount: aggregationResult.organisations.length,
        validation,
        preview: {
          metadata: outputData.metadata,
          organisations: outputData.organisations.slice(0, 5) // Preview first 5
        }
      };
    } catch (error) {
      this.logger.error('Output generation failed', error);
      return {
        success: false,
        outputPath: this.config.outputPath!,
        recordCount: 0,
        validation: {
          isValidJson: false,
          hasRequiredFields: false
        },
        preview: {
          metadata: {},
          organisations: []
        },
        error: error as Error
      };
    }
  }

  /**
   * Execute complete workflow end-to-end
   */
  async executeCompleteWorkflow(): Promise<WorkflowResult> {
    const workflowStart = Date.now();
    this.logger.section('Executing Complete Workflow');
    
    const result: WorkflowResult = {
      success: false,
      phases: {
        dataFetching: {
          govUk: { success: false },
          onsInstitutional: { success: false },
          onsNonInstitutional: { success: false }
        },
        dataMapping: {
          success: false
        },
        deduplication: {
          success: false
        },
        outputGeneration: {
          success: false
        }
      }
    };

    try {
      // Phase 1: Data Fetching
      this.logger.subsection('Phase 1: Data Fetching');
      
      // Fetch GOV.UK
      const govUkData = await this.fetchGovUkData();
      result.phases.dataFetching.govUk = {
        success: govUkData.success,
        ...(govUkData.error && { error: govUkData.error }),
        recordCount: govUkData.organisations?.length || 0
      };

      // Fetch ONS
      const onsData = await this.fetchOnsData();
      result.phases.dataFetching.onsInstitutional = {
        success: onsData.success,
        ...(onsData.error && { error: onsData.error }),
        recordCount: onsData.institutionalUnits.length
      };
      result.phases.dataFetching.onsNonInstitutional = {
        success: onsData.success,
        ...(onsData.error && { error: onsData.error }),
        recordCount: onsData.nonInstitutionalUnits.length
      };
      
      // Fetch NHS Trusts
      const nhsData = await this.fetchNHSData();
      (result.phases.dataFetching as WorkflowPhasesWithExtensions).nhsTrusts = {
        success: nhsData.success,
        ...(nhsData.error && { error: nhsData.error }),
        recordCount: nhsData.organisations?.length || 0
      };
      
      // Fetch Local Authorities
      const laData = await this.fetchLocalAuthorityData();
      (result.phases.dataFetching as WorkflowPhasesWithExtensions).localAuthorities = {
        success: laData.success,
        ...(laData.error && { error: laData.error }),
        recordCount: laData.organisations?.length || 0
      };
      
      // Fetch Schools
      const schoolsData = await this.fetchSchoolsData();
      (result.phases.dataFetching as WorkflowPhasesWithExtensions).schools = {
        success: schoolsData.success,
        ...(schoolsData.error && { error: schoolsData.error }),
        recordCount: schoolsData.organisations?.length || 0
      };

      // Fetch Devolved Administrations
      const devolvedData = await this.fetchDevolvedAdminData();
      (result.phases.dataFetching as WorkflowPhasesWithExtensions).devolvedAdmin = {
        success: devolvedData.success,
        ...(devolvedData.error && { error: devolvedData.error }),
        recordCount: devolvedData.organisations?.length || 0
      };

      // Fetch Police Forces
      const policeData = await this.fetchPoliceData();
      (result.phases.dataFetching as WorkflowPhasesWithExtensions).police = {
        success: policeData.success,
        ...(policeData.error && { error: policeData.error }),
        recordCount: policeData.organisations?.length || 0
      };

      // Fetch Fire Services
      const fireData = await this.fetchFireData();
      (result.phases.dataFetching as WorkflowPhasesWithExtensions).fire = {
        success: fireData.success,
        ...(fireData.error && { error: fireData.error }),
        recordCount: fireData.organisations?.length || 0
      };

      // Fetch Additional Devolved Bodies
      const devolvedExtraData = await this.fetchDevolvedExtraData();
      (result.phases.dataFetching as WorkflowPhasesWithExtensions).devolvedExtra = {
        success: devolvedExtraData.success,
        ...(devolvedExtraData.error && { error: devolvedExtraData.error }),
        recordCount: devolvedExtraData.organisations?.length || 0
      };

      // Fetch UK Colleges
      const collegesData = await this.fetchCollegesData();
      (result.phases.dataFetching as WorkflowPhasesWithExtensions).colleges = {
        success: collegesData.success,
        ...(collegesData.error && { error: collegesData.error }),
        recordCount: collegesData.organisations?.length || 0
      };

      // Combine all organisations
      const allOrganisations = [
        ...(govUkData.organisations || []),
        ...onsData.institutionalUnits,
        ...onsData.nonInstitutionalUnits,
        ...(nhsData.organisations || []),
        ...(laData.organisations || []),
        ...(schoolsData.organisations || []),
        ...(devolvedData.organisations || []),
        ...(policeData.organisations || []),
        ...(fireData.organisations || []),
        ...(devolvedExtraData.organisations || []),
        ...(collegesData.organisations || [])
      ];

      // Phase 2: Data Mapping (already done in fetch methods)
      this.logger.subsection('Phase 2: Data Mapping');
      result.phases.dataMapping = {
        success: true,
        mappedFields: 10 // Standard fields mapped
      };

      // Phase 3: Deduplication
      this.logger.subsection('Phase 3: Deduplication');
      const dedupResult = this.deduplicator.deduplicate(allOrganisations);
      
      result.phases.deduplication = {
        success: true,
        duplicatesFound: dedupResult.originalCount - dedupResult.deduplicatedCount,
        duplicatesResolved: dedupResult.originalCount - dedupResult.deduplicatedCount
      };

      // Phase 4: Output Generation
      this.logger.subsection('Phase 4: Output Generation');
      
      // Build metadata
      const metadata: ProcessingMetadata = {
        processedAt: new Date().toISOString(),
        sources: [
          { source: DataSourceType.GOV_UK_API, recordCount: govUkData.organisations?.length || 0, retrievedAt: new Date().toISOString() },
          { source: DataSourceType.ONS_INSTITUTIONAL, recordCount: onsData.institutionalUnits.length, retrievedAt: new Date().toISOString() },
          { source: DataSourceType.ONS_NON_INSTITUTIONAL, recordCount: onsData.nonInstitutionalUnits.length, retrievedAt: new Date().toISOString() },
          { source: DataSourceType.NHS_PROVIDER_DIRECTORY, recordCount: nhsData.organisations?.length || 0, retrievedAt: new Date().toISOString() },
          { source: DataSourceType.DEFRA_UK_AIR, recordCount: laData.organisations?.length || 0, retrievedAt: new Date().toISOString() },
          { source: DataSourceType.GIAS, recordCount: schoolsData.organisations?.length || 0, retrievedAt: new Date().toISOString() }
        ],
        statistics: {
          totalOrganisations: dedupResult.organisations.length,
          duplicatesFound: dedupResult.originalCount - dedupResult.deduplicatedCount,
          conflictsDetected: 0,
          organisationsByType: {} as Record<OrganisationType, number>
        }
      };
      
      const outputPath = await this.writer.writeResult({
        organisations: dedupResult.organisations,
        metadata
      });
      
      result.phases.outputGeneration = {
        success: true,
        filePath: outputPath,
        recordCount: dedupResult.organisations.length
      };

      // Set overall success
      result.success = true;
      result.completedAt = new Date().toISOString();
      result.totalDurationMs = Date.now() - workflowStart;
      
      this.logger.success('Workflow completed successfully', {
        duration: `${(result.totalDurationMs / 1000).toFixed(2)}s`,
        totalRecords: dedupResult.organisations.length
      });

    } catch (error) {
      this.logger.error('Workflow failed', error);
      result.success = false;
    }

    return result;
  }

  /**
   * Run the complete aggregation with CLI options
   */
  async run(options?: {
    cache?: boolean;
    debug?: boolean;
    timeout?: number;
    output?: string;
    source?: string;
  }): Promise<ProcessingResult> {
    // Update config with CLI options
    if (options) {
      if (options.cache !== undefined) this.config.cacheEnabled = options.cache;
      if (options.debug !== undefined) this.config.debugMode = options.debug;
      if (options.timeout !== undefined) this.config.timeout = options.timeout;
      if (options.output !== undefined) this.config.outputPath = options.output;
      if (options.source !== undefined) {
        this.config.source = options.source;
      }
      
      // Update logger if debug mode changed
      if (options.debug) {
        this.logger = createLogger({
          debugMode: true,
          level: LogLevel.DEBUG
        });
      }
    }

    this.logger.section('UK Public Sector Organisation Aggregator');
    this.logger.info('Configuration:', {
      cache: this.config.cacheEnabled,
      debug: this.config.debugMode,
      timeout: `${this.config.timeout}ms`,
      output: this.config.outputPath,
      source: this.config.source || 'all'
    });

    try {
      // Execute the workflow (use performCompleteAggregation which respects source filter)
      const aggregationResult = await this.performCompleteAggregation();

      // Convert to WorkflowResult format
      const result: WorkflowResult = {
        success: aggregationResult.success,
        phases: {
          dataFetching: {
            govUk: { success: true, recordCount: aggregationResult.organisations.length },
            onsInstitutional: { success: true, recordCount: 0 },
            onsNonInstitutional: { success: true, recordCount: 0 }
          },
          dataMapping: {
            success: true,
            govUk: { success: true },
            onsInstitutional: { success: true },
            onsNonInstitutional: { success: true }
          },
          deduplication: {
            success: true,
            duplicatesFound: aggregationResult.metadata?.statistics?.duplicatesFound || 0,
            finalCount: aggregationResult.organisations.length
          },
          outputGeneration: {
            success: true,
            filePath: this.config.outputPath!,
            fileSize: 0,
            recordCount: aggregationResult.organisations.length
          }
        },
        completedAt: new Date().toISOString(),
        totalDurationMs: Date.now() - Date.now() // Will be updated if needed
      };
      
      if (!result.success) {
        throw new Error('Workflow execution failed');
      }

      // Build final result
      // Write the output file
      const outputPath = this.config.outputPath!;
      const outputData = {
        organisations: aggregationResult.organisations,
        metadata: aggregationResult.metadata || {
          processedAt: new Date().toISOString(),
          sources: [],
          statistics: {
            totalOrganisations: aggregationResult.organisations.length,
            duplicatesFound: aggregationResult.metadata?.statistics?.duplicatesFound || 0,
            conflictsDetected: 0,
            organisationsByType: {} as Record<OrganisationType, number>
          }
        }
      };

      writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

      return {
        organisations: aggregationResult.organisations,
        metadata: aggregationResult.metadata || outputData.metadata
      };
    } catch (error) {
      this.logger.error('Aggregation failed', error);
      throw error;
    }
  }
}

// Export factory function
export function createOrchestrator(config?: OrchestratorConfig): Orchestrator {
  return new Orchestrator(config);
}