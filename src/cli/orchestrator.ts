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
import { GIASCSVFetcher } from '../services/gias-csv-fetcher.js';
import { DevolvedAdminParser } from '../services/devolved-admin-parser.js';
import { NHSMapper } from '../services/mappers/nhs-mapper.js';
import { LocalAuthorityMapper } from '../services/mappers/local-authority-mapper.js';
import { SchoolsMapper } from '../services/mappers/schools-mapper.js';
import { DevolvedAdminMapper } from '../services/mappers/devolved-admin-mapper.js';
import { PoliceParser } from '../services/police-parser.js';
import { FireParser } from '../services/fire-parser.js';
import { DevolvedExtraParser } from '../services/devolved-extra-parser.js';
import { CollegesParser } from '../services/colleges-parser.js';
import { NISchoolsParser } from '../services/ni-schools-parser.js';
import { PoliceMapper } from '../services/mappers/police-mapper.js';
import { FireMapper } from '../services/mappers/fire-mapper.js';
import { DevolvedExtraMapper } from '../services/mappers/devolved-extra-mapper.js';
import { CollegesMapper } from '../services/mappers/colleges-mapper.js';
import { NISchoolsMapper } from '../services/mappers/ni-schools-mapper.js';
import { EnglishCourtsParser } from '../services/english-courts-parser.js';
import { NICourtsParser } from '../services/ni-courts-parser.js';
import { ScottishCourtsParser } from '../services/scottish-courts-parser.js';
import { CourtsMapper } from '../services/mappers/courts-mapper.js';
import { GroundworkParser } from '../services/groundwork-parser.js';
import { NHSCharitiesParser } from '../services/nhs-charities-parser.js';
import { GroundworkMapper } from '../services/mappers/groundwork-mapper.js';
import { NHSCharitiesMapper } from '../services/mappers/nhs-charities-mapper.js';
import { WelshCouncilsFetcher } from '../services/fetchers/welsh-councils-fetcher.js';
import { ScottishCouncilsFetcher } from '../services/fetchers/scottish-councils-fetcher.js';
import { NIHealthTrustsFetcher } from '../services/fetchers/ni-health-trusts-fetcher.js';

// New UK Gov Organisation Data Source fetchers
import { EnglishUnitaryAuthoritiesFetcher } from '../services/fetchers/english-unitary-authorities-fetcher.js';
import { DistrictsOfEnglandFetcher } from '../services/fetchers/districts-of-england-fetcher.js';
import { NationalParkAuthoritiesFetcher } from '../services/fetchers/national-park-authorities-fetcher.js';
import { IntegratedCareBoardsFetcher } from '../services/fetchers/integrated-care-boards-fetcher.js';
import { LocalHealthwatchFetcher } from '../services/fetchers/local-healthwatch-fetcher.js';
import { ScottishGovernmentOrgsFetcher } from '../services/fetchers/scottish-government-orgs-fetcher.js';
import { NHSScotlandBoardsFetcher } from '../services/fetchers/nhs-scotland-boards-fetcher.js';
import { ScottishRTPsFetcher } from '../services/fetchers/scottish-rtps-fetcher.js';
import { WelshUnitaryAuthoritiesFetcher } from '../services/fetchers/welsh-unitary-authorities-fetcher.js';
import { NITrustPortsFetcher } from '../services/fetchers/ni-trust-ports-fetcher.js';
import { NIGovernmentDeptsFetcher } from '../services/fetchers/ni-government-depts-fetcher.js';
import { UKResearchCouncilsFetcher } from '../services/fetchers/uk-research-councils-fetcher.js';

// New mappers for UK Gov Organisation Data Sources
import { UnitaryAuthorityMapper } from '../services/mappers/unitary-authority-mapper.js';
import { DistrictCouncilMapper } from '../services/mappers/district-council-mapper.js';
import { HealthOrganisationMapper } from '../services/mappers/health-organisation-mapper.js';
import { TransportPartnershipMapper } from '../services/mappers/transport-partnership-mapper.js';
import { ResearchCouncilMapper } from '../services/mappers/research-council-mapper.js';
import { GovernmentDepartmentMapper } from '../services/mappers/government-department-mapper.js';
import { CommunityCouncilsMapper } from '../services/mappers/community-councils-mapper.js';
import { NationalParkMapper } from '../services/mappers/national-park-mapper.js';

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
  partialFailures?: Error[];  // Track which sources failed
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
  niSchools?: WorkflowPhase & { recordCount?: number };
  courts?: WorkflowPhase & { recordCount?: number };
  groundwork?: WorkflowPhase & { recordCount?: number };
  nhsCharities?: WorkflowPhase & { recordCount?: number };
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
  private giasCSVFetcher: GIASCSVFetcher;
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
    this.giasCSVFetcher = new GIASCSVFetcher();
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
      this.logger.startProgress('Fetching schools from GIAS CSV service...');

      // Fetch all schools via CSV download (much faster than JSON scraping)
      const schools = await this.giasCSVFetcher.fetch();

      this.logger.stopProgress(`Fetched ${schools.length} schools`);

      // Map to Organisation model using the new mapMany method
      this.logger.startProgress('Mapping schools to organisation model...');
      const mapped = this.schoolsMapper.mapMany(schools);
      this.logger.stopProgress(`Mapped ${mapped.length} school organisations`);

      // Count open schools for metadata
      const openCount = schools.filter(s => s.EstablishmentStatus === 'Open').length;

      return {
        success: true,
        data: { organisations: mapped },
        organisations: mapped,
        metadata: {
          source: 'gias',
          fetchedAt: new Date().toISOString(),
          count: mapped.length,
          totalCount: schools.length,
          openCount: openCount,
          recordCount: schools.length
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
   * Fetch Northern Ireland Schools data
   */
  async fetchNISchoolsData(): Promise<DataFetchResult> {
    this.logger.subsection('Fetching Northern Ireland Schools');

    try {
      this.logger.startProgress('Fetching schools from NI Education Department...');

      const parser = new NISchoolsParser();
      const mapper = new NISchoolsMapper();
      const rawSchools = await parser.parse();
      const organisations = mapper.mapMany(rawSchools);

      this.logger.stopProgress(`Fetched ${rawSchools.length} NI schools`);
      this.logger.success(`Mapped to ${organisations.length} organisations`);

      return {
        success: true,
        organisations,
        metadata: {
          source: 'NI Education Department',
          fetchedAt: new Date().toISOString(),
          recordCount: organisations.length
        }
      };
    } catch (error) {
      this.logger.error(`Failed to fetch NI schools data: ${error}`);
      return {
        success: false,
        error: error as Error,
        metadata: { source: 'NI Education Department', fetchedAt: new Date().toISOString() }
      };
    }
  }

  /**
   * Fetch UK Courts and Tribunals data
   */
  async fetchCourtsData(): Promise<DataFetchResult> {
    this.logger.subsection('Fetching UK Courts and Tribunals');

    const allCourts: Organisation[] = [];
    const mapper = new CourtsMapper();
    const failures: Error[] = [];

    // Fetch English/Welsh courts
    try {
      this.logger.startProgress('Fetching English/Welsh courts from CSV...');
      const englishParser = new EnglishCourtsParser();
      const englishRaw = await englishParser.parse();
      const englishCourts = englishParser.mapToCourtModel(englishRaw);
      const englishOrgs = mapper.mapMany(englishCourts);
      allCourts.push(...englishOrgs);
      this.logger.stopProgress(`Fetched ${englishOrgs.length} English/Welsh courts`);
    } catch (error) {
      this.logger.error(`Failed to fetch English courts: ${error}`);
      failures.push(error instanceof Error ? error : new Error(String(error)));
    }

    // Fetch NI courts
    try {
      this.logger.startProgress('Fetching Northern Ireland courts from NI Direct...');
      const niParser = new NICourtsParser();
      const niRaw = await niParser.parse();
      const niCourts = niParser.mapToCourtModel(niRaw);
      const niOrgs = mapper.mapMany(niCourts);
      allCourts.push(...niOrgs);
      this.logger.stopProgress(`Fetched ${niOrgs.length} NI courts`);
    } catch (error) {
      this.logger.error(`Failed to fetch NI courts: ${error}`);
      failures.push(error instanceof Error ? error : new Error(String(error)));
    }

    // Fetch Scottish courts
    try {
      this.logger.startProgress('Fetching Scottish courts...');
      const scottishParser = new ScottishCourtsParser();
      const scottishRaw = await scottishParser.parse();
      const scottishCourts = scottishParser.mapToCourtModel(scottishRaw);
      const scottishOrgs = mapper.mapMany(scottishCourts);
      allCourts.push(...scottishOrgs);
      this.logger.stopProgress(`Fetched ${scottishOrgs.length} Scottish courts`);
    } catch (error) {
      this.logger.error(`Failed to fetch Scottish courts: ${error}`);
      failures.push(error instanceof Error ? error : new Error(String(error)));
    }

    // If we have no data and all sources failed, return complete failure
    if (allCourts.length === 0 && failures.length > 0) {
      return {
        success: false,
        error: new Error(`No courts data could be fetched. ${failures.length} source(s) failed.`),
        metadata: { source: 'UK Courts', fetchedAt: new Date().toISOString() }
      };
    }

    // If we have some data but also some failures, return partial success with error
    return {
      success: allCourts.length > 0,
      organisations: allCourts,
      metadata: {
        source: 'UK Courts',
        fetchedAt: new Date().toISOString(),
        recordCount: allCourts.length
      },
      ...(failures.length > 0 && { error: new Error(`Courts fetched with ${failures.length} partial failure(s)`) })
    };
  }

  /**
   * Fetch Groundwork Trusts data
   */
  async fetchGroundworkData(): Promise<DataFetchResult> {
    this.logger.subsection('Fetching Groundwork Trusts');

    try {
      this.logger.startProgress('Fetching Groundwork Trusts from website...');

      const parser = new GroundworkParser();
      const mapper = new GroundworkMapper();
      const trusts = await parser.parse();
      const organisations = mapper.mapMany(trusts);

      this.logger.stopProgress(`Fetched ${trusts.length} Groundwork Trusts`);
      this.logger.success(`Mapped to ${organisations.length} organisations`);

      return {
        success: true,
        organisations,
        metadata: {
          source: 'groundwork.org.uk',
          fetchedAt: new Date().toISOString(),
          recordCount: organisations.length
        }
      };
    } catch (error) {
      this.logger.error(`Failed to fetch Groundwork data: ${error}`);
      return {
        success: false,
        error: error as Error,
        metadata: { source: 'groundwork.org.uk', fetchedAt: new Date().toISOString() }
      };
    }
  }

  /**
   * Fetch NHS Charities data
   */
  async fetchNHSCharitiesData(): Promise<DataFetchResult> {
    this.logger.subsection('Fetching NHS Charities');

    try {
      this.logger.startProgress('Fetching NHS Charities from API...');

      const parser = new NHSCharitiesParser();
      const mapper = new NHSCharitiesMapper();
      const charities = await parser.parse();
      const organisations = mapper.mapMany(charities);

      this.logger.stopProgress(`Fetched ${charities.length} NHS Charities (England/Wales)`);
      this.logger.success(`Mapped to ${organisations.length} organisations`);

      return {
        success: true,
        organisations,
        metadata: {
          source: 'nhscharitiestogether.co.uk',
          fetchedAt: new Date().toISOString(),
          recordCount: organisations.length
        }
      };
    } catch (error) {
      this.logger.error(`Failed to fetch NHS Charities data: ${error}`);
      return {
        success: false,
        error: error as Error,
        metadata: { source: 'nhscharitiestogether.co.uk', fetchedAt: new Date().toISOString() }
      };
    }
  }

  /**
   * Fetch Welsh Community Councils data
   */
  async fetchWelshCouncilsData(): Promise<DataFetchResult> {
    this.logger.subsection('Fetching Welsh Community Councils');

    try {
      this.logger.startProgress('Fetching Welsh councils from Wikipedia...');

      const fetcher = new WelshCouncilsFetcher();
      const mapper = new CommunityCouncilsMapper();
      const councils = await fetcher.fetch();
      const organisations = mapper.mapWelshCouncils(councils);

      this.logger.stopProgress(`Fetched ${councils.length} Welsh Community Councils`);
      this.logger.success(`Mapped to ${organisations.length} organisations`);

      return {
        success: true,
        organisations,
        metadata: {
          source: 'wikipedia.org',
          fetchedAt: new Date().toISOString(),
          recordCount: organisations.length
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Welsh councils fetch failed: ${message}`);
      return {
        success: false,
        organisations: [],
        error: error instanceof Error ? error : new Error(message),
        metadata: { source: 'wikipedia.org', fetchedAt: new Date().toISOString() }
      };
    }
  }

  /**
   * Fetch Scottish Community Councils data
   */
  async fetchScottishCouncilsData(): Promise<DataFetchResult> {
    this.logger.subsection('Fetching Scottish Community Councils');

    try {
      this.logger.startProgress('Fetching Scottish councils from Wikipedia...');

      const fetcher = new ScottishCouncilsFetcher();
      const mapper = new CommunityCouncilsMapper();
      const councils = await fetcher.fetch();
      const organisations = mapper.mapScottishCouncils(councils);

      this.logger.stopProgress(`Fetched ${councils.length} active Scottish Community Councils`);
      this.logger.success(`Mapped to ${organisations.length} organisations`);

      return {
        success: true,
        organisations,
        metadata: {
          source: 'wikipedia.org',
          fetchedAt: new Date().toISOString(),
          recordCount: organisations.length
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Scottish councils fetch failed: ${message}`);
      return {
        success: false,
        organisations: [],
        error: error instanceof Error ? error : new Error(message),
        metadata: { source: 'wikipedia.org', fetchedAt: new Date().toISOString() }
      };
    }
  }

  /**
   * Fetch NI Health and Social Care Trusts data
   */
  async fetchNIHealthTrustsData(): Promise<DataFetchResult> {
    this.logger.subsection('Fetching NI Health and Social Care Trusts');

    try {
      this.logger.startProgress('Fetching NI Health Trusts from NI Direct...');

      const fetcher = new NIHealthTrustsFetcher();
      const mapper = new CommunityCouncilsMapper();
      const trusts = await fetcher.fetch();
      const organisations = mapper.mapNIHealthTrusts(trusts);

      this.logger.stopProgress(`Fetched ${trusts.length} NI Health and Social Care Trusts`);
      this.logger.success(`Mapped to ${organisations.length} organisations`);

      return {
        success: true,
        organisations,
        metadata: {
          source: 'nidirect.gov.uk',
          fetchedAt: new Date().toISOString(),
          recordCount: organisations.length
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`NI Health Trusts fetch failed: ${message}`);
      return {
        success: false,
        organisations: [],
        error: error instanceof Error ? error : new Error(message),
        metadata: { source: 'nidirect.gov.uk', fetchedAt: new Date().toISOString() }
      };
    }
  }

  /**
   * Fetch English Unitary Authorities data
   */
  private async fetchEnglishUnitaryAuthorities(): Promise<DataFetchResult> {
    try {
      const fetcher = new EnglishUnitaryAuthoritiesFetcher();
      const result = await fetcher.fetch();

      if (result.success && result.data) {
        const mapper = new UnitaryAuthorityMapper();
        const organisations = mapper.mapMany(result.data, result.source);

        return {
          success: true,
          organisations,
          metadata: {
            source: 'ons-unitary-authorities',
            fetchedAt: new Date().toISOString(),
            totalRecords: organisations.length
          }
        };
      }

      return {
        success: false,
        metadata: {
          source: 'ons-unitary-authorities',
          fetchedAt: new Date().toISOString()
        },
        error: new Error(result.error || 'Failed to fetch English Unitary Authorities data')
      };
    } catch (error) {
      return {
        success: false,
        metadata: {
          source: 'ons-unitary-authorities',
          fetchedAt: new Date().toISOString()
        },
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Fetch Districts of England data
   */
  private async fetchDistrictsOfEngland(): Promise<DataFetchResult> {
    try {
      const fetcher = new DistrictsOfEnglandFetcher();
      const result = await fetcher.fetch();

      if (result.success && result.data) {
        const mapper = new DistrictCouncilMapper();
        const organisations = mapper.mapMany(result.data, result.source);

        return {
          success: true,
          organisations,
          metadata: {
            source: 'wikipedia-districts',
            fetchedAt: new Date().toISOString(),
            totalRecords: organisations.length
          }
        };
      }

      return {
        success: false,
        metadata: {
          source: 'wikipedia-districts',
          fetchedAt: new Date().toISOString()
        },
        error: new Error(result.error || 'Failed to fetch Districts of England data')
      };
    } catch (error) {
      return {
        success: false,
        metadata: {
          source: 'wikipedia-districts',
          fetchedAt: new Date().toISOString()
        },
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Fetch National Park Authorities data
   */
  private async fetchNationalParks(): Promise<DataFetchResult> {
    try {
      const fetcher = new NationalParkAuthoritiesFetcher();
      const result = await fetcher.fetch();

      if (result.success && result.data) {
        const mapper = new NationalParkMapper();
        const organisations = mapper.mapMany(result.data, result.source);

        return {
          success: true,
          organisations,
          metadata: {
            source: 'national-parks',
            fetchedAt: new Date().toISOString(),
            totalRecords: organisations.length
          }
        };
      }

      return {
        success: false,
        metadata: {
          source: 'national-parks',
          fetchedAt: new Date().toISOString()
        },
        error: new Error(result.error || 'Failed to fetch National Park Authorities data')
      };
    } catch (error) {
      return {
        success: false,
        metadata: {
          source: 'national-parks',
          fetchedAt: new Date().toISOString()
        },
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Fetch Integrated Care Boards data
   */
  private async fetchIntegratedCareBoards(): Promise<DataFetchResult> {
    try {
      const fetcher = new IntegratedCareBoardsFetcher();
      const result = await fetcher.fetch();

      if (result.success && result.data) {
        const mapper = new HealthOrganisationMapper();
        const organisations = mapper.mapMany(result.data, result.source);

        return {
          success: true,
          organisations,
          metadata: {
            source: 'nhs-icbs',
            fetchedAt: new Date().toISOString(),
            totalRecords: organisations.length
          }
        };
      }

      return {
        success: false,
        metadata: {
          source: 'nhs-icbs',
          fetchedAt: new Date().toISOString()
        },
        error: new Error(result.error || 'Failed to fetch Integrated Care Boards data')
      };
    } catch (error) {
      return {
        success: false,
        metadata: {
          source: 'nhs-icbs',
          fetchedAt: new Date().toISOString()
        },
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Fetch Local Healthwatch data
   */
  private async fetchLocalHealthwatch(): Promise<DataFetchResult> {
    try {
      const fetcher = new LocalHealthwatchFetcher();
      const result = await fetcher.fetch();

      if (result.success && result.data) {
        const mapper = new HealthOrganisationMapper();
        const organisations = mapper.mapMany(result.data, result.source);

        return {
          success: true,
          organisations,
          metadata: {
            source: 'local-healthwatch',
            fetchedAt: new Date().toISOString(),
            totalRecords: organisations.length
          }
        };
      }

      return {
        success: false,
        metadata: {
          source: 'local-healthwatch',
          fetchedAt: new Date().toISOString()
        },
        error: new Error(result.error || 'Failed to fetch Local Healthwatch data')
      };
    } catch (error) {
      return {
        success: false,
        metadata: {
          source: 'local-healthwatch',
          fetchedAt: new Date().toISOString()
        },
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Fetch Scottish Government Organisations data
   */
  private async fetchScottishGovernmentOrgs(): Promise<DataFetchResult> {
    try {
      const fetcher = new ScottishGovernmentOrgsFetcher();
      const result = await fetcher.fetch();

      if (result.success && result.data) {
        const mapper = new GovernmentDepartmentMapper();
        const organisations = mapper.mapMany(result.data, result.source);

        return {
          success: true,
          organisations,
          metadata: {
            source: 'scottish-government',
            fetchedAt: new Date().toISOString(),
            totalRecords: organisations.length
          }
        };
      }

      return {
        success: false,
        metadata: {
          source: 'scottish-government',
          fetchedAt: new Date().toISOString()
        },
        error: new Error(result.error || 'Failed to fetch Scottish Government Organisations data')
      };
    } catch (error) {
      return {
        success: false,
        metadata: {
          source: 'scottish-government',
          fetchedAt: new Date().toISOString()
        },
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Fetch NHS Scotland Boards data
   */
  private async fetchNHSScotlandBoards(): Promise<DataFetchResult> {
    try {
      const fetcher = new NHSScotlandBoardsFetcher();
      const result = await fetcher.fetch();

      if (result.success && result.data) {
        const mapper = new HealthOrganisationMapper();
        const organisations = mapper.mapMany(result.data, result.source);

        return {
          success: true,
          organisations,
          metadata: {
            source: 'nhs-scotland-boards',
            fetchedAt: new Date().toISOString(),
            totalRecords: organisations.length
          }
        };
      }

      return {
        success: false,
        metadata: {
          source: 'nhs-scotland-boards',
          fetchedAt: new Date().toISOString()
        },
        error: new Error(result.error || 'Failed to fetch NHS Scotland Boards data')
      };
    } catch (error) {
      return {
        success: false,
        metadata: {
          source: 'nhs-scotland-boards',
          fetchedAt: new Date().toISOString()
        },
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Fetch Scottish Regional Transport Partnerships data
   */
  private async fetchScottishRTPs(): Promise<DataFetchResult> {
    try {
      const fetcher = new ScottishRTPsFetcher();
      const result = await fetcher.fetch();

      if (result.success && result.data) {
        const mapper = new TransportPartnershipMapper();
        const organisations = mapper.mapMany(result.data, result.source);

        return {
          success: true,
          organisations,
          metadata: {
            source: 'scottish-rtps',
            fetchedAt: new Date().toISOString(),
            totalRecords: organisations.length
          }
        };
      }

      return {
        success: false,
        metadata: {
          source: 'scottish-rtps',
          fetchedAt: new Date().toISOString()
        },
        error: new Error(result.error || 'Failed to fetch Scottish RTPs data')
      };
    } catch (error) {
      return {
        success: false,
        metadata: {
          source: 'scottish-rtps',
          fetchedAt: new Date().toISOString()
        },
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Fetch Welsh Unitary Authorities data
   */
  private async fetchWelshUnitaryAuthorities(): Promise<DataFetchResult> {
    try {
      const fetcher = new WelshUnitaryAuthoritiesFetcher();
      const result = await fetcher.fetch();

      if (result.success && result.data) {
        const mapper = new UnitaryAuthorityMapper();
        const organisations = mapper.mapMany(result.data, result.source);

        return {
          success: true,
          organisations,
          metadata: {
            source: 'welsh-unitary-authorities',
            fetchedAt: new Date().toISOString(),
            totalRecords: organisations.length
          }
        };
      }

      return {
        success: false,
        metadata: {
          source: 'welsh-unitary-authorities',
          fetchedAt: new Date().toISOString()
        },
        error: new Error(result.error || 'Failed to fetch Welsh Unitary Authorities data')
      };
    } catch (error) {
      return {
        success: false,
        metadata: {
          source: 'welsh-unitary-authorities',
          fetchedAt: new Date().toISOString()
        },
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Fetch NI Trust Ports data
   */
  private async fetchNITrustPorts(): Promise<DataFetchResult> {
    try {
      const fetcher = new NITrustPortsFetcher();
      const result = await fetcher.fetch();

      if (result.success && result.data) {
        const mapper = new TransportPartnershipMapper();
        const organisations = mapper.mapMany(result.data, result.source);

        return {
          success: true,
          organisations,
          metadata: {
            source: 'ni-trust-ports',
            fetchedAt: new Date().toISOString(),
            totalRecords: organisations.length
          }
        };
      }

      return {
        success: false,
        metadata: {
          source: 'ni-trust-ports',
          fetchedAt: new Date().toISOString()
        },
        error: new Error(result.error || 'Failed to fetch NI Trust Ports data')
      };
    } catch (error) {
      return {
        success: false,
        metadata: {
          source: 'ni-trust-ports',
          fetchedAt: new Date().toISOString()
        },
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Fetch NI Government Departments data
   */
  private async fetchNIGovernmentDepts(): Promise<DataFetchResult> {
    try {
      const fetcher = new NIGovernmentDeptsFetcher();
      const result = await fetcher.fetch();

      if (result.success && result.data) {
        const mapper = new GovernmentDepartmentMapper();
        const organisations = mapper.mapMany(result.data, result.source);

        return {
          success: true,
          organisations,
          metadata: {
            source: 'ni-government-depts',
            fetchedAt: new Date().toISOString(),
            totalRecords: organisations.length
          }
        };
      }

      return {
        success: false,
        metadata: {
          source: 'ni-government-depts',
          fetchedAt: new Date().toISOString()
        },
        error: new Error(result.error || 'Failed to fetch NI Government Departments data')
      };
    } catch (error) {
      return {
        success: false,
        metadata: {
          source: 'ni-government-depts',
          fetchedAt: new Date().toISOString()
        },
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Fetch UK Research Councils data
   */
  private async fetchUKResearchCouncils(): Promise<DataFetchResult> {
    try {
      const fetcher = new UKResearchCouncilsFetcher();
      const result = await fetcher.fetch();

      if (result.success && result.data) {
        const mapper = new ResearchCouncilMapper();
        const organisations = mapper.mapMany(result.data, result.source);

        return {
          success: true,
          organisations,
          metadata: {
            source: 'uk-research-councils',
            fetchedAt: new Date().toISOString(),
            totalRecords: organisations.length
          }
        };
      }

      return {
        success: false,
        metadata: {
          source: 'uk-research-councils',
          fetchedAt: new Date().toISOString()
        },
        error: new Error(result.error || 'Failed to fetch UK Research Councils data')
      };
    } catch (error) {
      return {
        success: false,
        metadata: {
          source: 'uk-research-councils',
          fetchedAt: new Date().toISOString()
        },
        error: error instanceof Error ? error : new Error('Unknown error')
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

      // Fetch Northern Ireland Schools data
      if (!sourceFilter || sourceFilter === 'ni-schools' || sourceFilter === 'northern-ireland-schools') {
        const niSchoolsResult = await this.fetchNISchoolsData();
        if (niSchoolsResult.success && niSchoolsResult.organisations) {
          allOrganisations.push(...niSchoolsResult.organisations);
          sources.push('ni-education');
          this.logger.success(`Added ${niSchoolsResult.organisations.length} Northern Ireland Schools`);
        } else {
          errors.push(niSchoolsResult.error || new Error('NI Schools fetch failed'));
        }
      }

      // Fetch UK Courts and Tribunals data
      if (!sourceFilter || sourceFilter === 'courts' || sourceFilter === 'uk-courts') {
        const courtsResult = await this.fetchCourtsData();
        if (courtsResult.success && courtsResult.organisations) {
          allOrganisations.push(...courtsResult.organisations);
          sources.push('uk-courts');
          this.logger.success(`Added ${courtsResult.organisations.length} UK Courts and Tribunals`);
        } else {
          errors.push(courtsResult.error || new Error('Courts fetch failed'));
        }
      }

      // Fetch Groundwork Trusts data
      if (!sourceFilter || sourceFilter === 'groundwork' || sourceFilter === 'groundwork-trusts') {
        const groundworkResult = await this.fetchGroundworkData();
        if (groundworkResult.success && groundworkResult.organisations) {
          allOrganisations.push(...groundworkResult.organisations);
          sources.push('groundwork.org.uk');
          this.logger.success(`Added ${groundworkResult.organisations.length} Groundwork Trusts`);
        } else {
          errors.push(groundworkResult.error || new Error('Groundwork fetch failed'));
        }
      }

      // Fetch NHS Charities data
      if (!sourceFilter || sourceFilter === 'nhs-charities' || sourceFilter === 'nhs-charity') {
        const nhsCharitiesResult = await this.fetchNHSCharitiesData();
        if (nhsCharitiesResult.success && nhsCharitiesResult.organisations) {
          allOrganisations.push(...nhsCharitiesResult.organisations);
          sources.push('nhscharitiestogether.co.uk');
          this.logger.success(`Added ${nhsCharitiesResult.organisations.length} NHS Charities`);
        } else {
          errors.push(nhsCharitiesResult.error || new Error('NHS Charities fetch failed'));
        }
      }

      // Fetch Welsh Community Councils data
      if (!sourceFilter || sourceFilter === 'welsh-councils' || sourceFilter === 'welsh-community') {
        const welshResult = await this.fetchWelshCouncilsData();
        if (welshResult.success && welshResult.organisations) {
          allOrganisations.push(...welshResult.organisations);
          sources.push('welsh-community-councils');
          this.logger.success(`Added ${welshResult.organisations.length} Welsh Community Councils`);
        } else {
          errors.push(welshResult.error || new Error('Welsh councils fetch failed'));
        }
      }

      // Fetch Scottish Community Councils data
      if (!sourceFilter || sourceFilter === 'scottish-councils' || sourceFilter === 'scottish-community') {
        const scottishResult = await this.fetchScottishCouncilsData();
        if (scottishResult.success && scottishResult.organisations) {
          allOrganisations.push(...scottishResult.organisations);
          sources.push('scottish-community-councils');
          this.logger.success(`Added ${scottishResult.organisations.length} Scottish Community Councils`);
        } else {
          errors.push(scottishResult.error || new Error('Scottish councils fetch failed'));
        }
      }

      // Fetch NI Health and Social Care Trusts data
      if (!sourceFilter || sourceFilter === 'ni-health' || sourceFilter === 'ni-trusts') {
        const niHealthResult = await this.fetchNIHealthTrustsData();
        if (niHealthResult.success && niHealthResult.organisations) {
          allOrganisations.push(...niHealthResult.organisations);
          sources.push('ni-health-trusts');
          this.logger.success(`Added ${niHealthResult.organisations.length} NI Health and Social Care Trusts`);
        } else {
          errors.push(niHealthResult.error || new Error('NI Health Trusts fetch failed'));
        }
      }

      // NEW UK GOV ORGANISATION DATA SOURCES

      // Fetch English Unitary Authorities
      if (!sourceFilter || sourceFilter === 'english-unitary' || sourceFilter === 'ons-unitary') {
        const unitaryResult = await this.fetchEnglishUnitaryAuthorities();
        if (unitaryResult.success && unitaryResult.organisations) {
          allOrganisations.push(...unitaryResult.organisations);
          sources.push('ons-unitary-authorities');
          this.logger.success(`Added ${unitaryResult.organisations.length} English Unitary Authorities`);
        } else {
          errors.push(unitaryResult.error || new Error('English Unitary Authorities fetch failed'));
        }
      }

      // Fetch Districts of England
      if (!sourceFilter || sourceFilter === 'districts' || sourceFilter === 'english-districts') {
        const districtsResult = await this.fetchDistrictsOfEngland();
        if (districtsResult.success && districtsResult.organisations) {
          allOrganisations.push(...districtsResult.organisations);
          sources.push('wikipedia-districts');
          this.logger.success(`Added ${districtsResult.organisations.length} English Districts`);
        } else {
          errors.push(districtsResult.error || new Error('Districts of England fetch failed'));
        }
      }

      // Fetch National Park Authorities
      if (!sourceFilter || sourceFilter === 'national-parks' || sourceFilter === 'parks') {
        const parksResult = await this.fetchNationalParks();
        if (parksResult.success && parksResult.organisations) {
          allOrganisations.push(...parksResult.organisations);
          sources.push('national-parks');
          this.logger.success(`Added ${parksResult.organisations.length} National Park Authorities`);
        } else {
          errors.push(parksResult.error || new Error('National Parks fetch failed'));
        }
      }

      // Fetch Integrated Care Boards
      if (!sourceFilter || sourceFilter === 'icbs' || sourceFilter === 'integrated-care') {
        const icbResult = await this.fetchIntegratedCareBoards();
        if (icbResult.success && icbResult.organisations) {
          allOrganisations.push(...icbResult.organisations);
          sources.push('nhs-icbs');
          this.logger.success(`Added ${icbResult.organisations.length} Integrated Care Boards`);
        } else {
          errors.push(icbResult.error || new Error('ICBs fetch failed'));
        }
      }

      // Fetch Local Healthwatch
      if (!sourceFilter || sourceFilter === 'healthwatch' || sourceFilter === 'local-healthwatch') {
        const healthwatchResult = await this.fetchLocalHealthwatch();
        if (healthwatchResult.success && healthwatchResult.organisations) {
          allOrganisations.push(...healthwatchResult.organisations);
          sources.push('local-healthwatch');
          this.logger.success(`Added ${healthwatchResult.organisations.length} Local Healthwatch organisations`);
        } else {
          errors.push(healthwatchResult.error || new Error('Local Healthwatch fetch failed'));
        }
      }

      // Fetch Scottish Government Organisations
      if (!sourceFilter || sourceFilter === 'scottish-gov' || sourceFilter === 'mygov-scot') {
        const scotGovResult = await this.fetchScottishGovernmentOrgs();
        if (scotGovResult.success && scotGovResult.organisations) {
          allOrganisations.push(...scotGovResult.organisations);
          sources.push('scottish-government');
          this.logger.success(`Added ${scotGovResult.organisations.length} Scottish Government organisations`);
        } else {
          errors.push(scotGovResult.error || new Error('Scottish Gov orgs fetch failed'));
        }
      }

      // Fetch NHS Scotland Health Boards
      if (!sourceFilter || sourceFilter === 'nhs-scotland' || sourceFilter === 'scottish-health') {
        const nhsScotResult = await this.fetchNHSScotlandBoards();
        if (nhsScotResult.success && nhsScotResult.organisations) {
          allOrganisations.push(...nhsScotResult.organisations);
          sources.push('nhs-scotland-boards');
          this.logger.success(`Added ${nhsScotResult.organisations.length} NHS Scotland Health Boards`);
        } else {
          errors.push(nhsScotResult.error || new Error('NHS Scotland boards fetch failed'));
        }
      }

      // Fetch Scottish Regional Transport Partnerships
      if (!sourceFilter || sourceFilter === 'scottish-rtps' || sourceFilter === 'rtps') {
        const rtpResult = await this.fetchScottishRTPs();
        if (rtpResult.success && rtpResult.organisations) {
          allOrganisations.push(...rtpResult.organisations);
          sources.push('scottish-rtps');
          this.logger.success(`Added ${rtpResult.organisations.length} Scottish Regional Transport Partnerships`);
        } else {
          errors.push(rtpResult.error || new Error('Scottish RTPs fetch failed'));
        }
      }

      // Fetch Welsh Unitary Authorities
      if (!sourceFilter || sourceFilter === 'welsh-unitary' || sourceFilter === 'welsh-authorities') {
        const welshUnitaryResult = await this.fetchWelshUnitaryAuthorities();
        if (welshUnitaryResult.success && welshUnitaryResult.organisations) {
          allOrganisations.push(...welshUnitaryResult.organisations);
          sources.push('welsh-unitary-authorities');
          this.logger.success(`Added ${welshUnitaryResult.organisations.length} Welsh Unitary Authorities`);
        } else {
          errors.push(welshUnitaryResult.error || new Error('Welsh Unitary Authorities fetch failed'));
        }
      }

      // Fetch NI Trust Ports
      if (!sourceFilter || sourceFilter === 'ni-ports' || sourceFilter === 'trust-ports') {
        const portsResult = await this.fetchNITrustPorts();
        if (portsResult.success && portsResult.organisations) {
          allOrganisations.push(...portsResult.organisations);
          sources.push('ni-trust-ports');
          this.logger.success(`Added ${portsResult.organisations.length} NI Trust Ports`);
        } else {
          errors.push(portsResult.error || new Error('NI Trust Ports fetch failed'));
        }
      }

      // Fetch NI Government Departments
      if (!sourceFilter || sourceFilter === 'ni-depts' || sourceFilter === 'ni-departments') {
        const niDeptsResult = await this.fetchNIGovernmentDepts();
        if (niDeptsResult.success && niDeptsResult.organisations) {
          allOrganisations.push(...niDeptsResult.organisations);
          sources.push('ni-government-depts');
          this.logger.success(`Added ${niDeptsResult.organisations.length} NI Government Departments`);
        } else {
          errors.push(niDeptsResult.error || new Error('NI Government Depts fetch failed'));
        }
      }

      // Fetch UK Research Councils
      if (!sourceFilter || sourceFilter === 'research-councils' || sourceFilter === 'ukri') {
        const ukriResult = await this.fetchUKResearchCouncils();
        if (ukriResult.success && ukriResult.organisations) {
          allOrganisations.push(...ukriResult.organisations);
          sources.push('uk-research-councils');
          this.logger.success(`Added ${ukriResult.organisations.length} UK Research Councils`);
        } else {
          errors.push(ukriResult.error || new Error('UK Research Councils fetch failed'));
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
          org.sources && org.sources.some((s: DataSourceReference) => s.source.toString() === source.replace('-units', '').replace('.uk-api', '_uk_api').replace('-', '_'))
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

      // Consider aggregation successful if we got any data, even if some sources failed
      const hasData = dedupResult.organisations.length > 0;

      // Log errors if any
      if (errors.length > 0) {
        const failedSourceDetails = errors.map(err => {
          // Extract source name from error message if possible
          const match = err.message.match(/Failed to fetch (.+) data/);
          if (match) return match[1];
          // Try other patterns
          if (err.message.includes('police')) return 'Police Forces';
          if (err.message.includes('fire')) return 'Fire Services';
          if (err.message.includes('devolved')) return 'Devolved Administrations';
          if (err.message.includes('colleges')) return 'Colleges';
          if (err.message.includes('Scottish')) return 'Scottish Courts';
          // Fallback
          return err.message.split(':')[0].trim();
        });

        this.logger.warn(`WARNING: ${errors.length} data source(s) failed:`);
        failedSourceDetails.forEach((source, i) => {
          this.logger.warn(`  • ${source}: ${errors[i].message}`);
        });
      }

      return {
        success: hasData,  // Succeed if we have ANY data, even if some sources failed
        sources,
        organisations: dedupResult.organisations,
        totalRecords: dedupResult.organisations.length,
        metadata,
        performance: {
          memoryUsed: process.memoryUsage().heapUsed,
          peakMemoryMB: this.peakMemory
        },
        ...(errors.length > 0 && { partialFailures: errors })
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

      // Fetch Northern Ireland Schools
      const niSchoolsData = await this.fetchNISchoolsData();
      (result.phases.dataFetching as WorkflowPhasesWithExtensions).niSchools = {
        success: niSchoolsData.success,
        ...(niSchoolsData.error && { error: niSchoolsData.error }),
        recordCount: niSchoolsData.organisations?.length || 0
      };

      // Fetch UK Courts
      const courtsData = await this.fetchCourtsData();
      (result.phases.dataFetching as WorkflowPhasesWithExtensions).courts = {
        success: courtsData.success,
        ...(courtsData.error && { error: courtsData.error }),
        recordCount: courtsData.organisations?.length || 0
      };

      // Fetch Groundwork Trusts
      const groundworkData = await this.fetchGroundworkData();
      (result.phases.dataFetching as WorkflowPhasesWithExtensions).groundwork = {
        success: groundworkData.success,
        ...(groundworkData.error && { error: groundworkData.error }),
        recordCount: groundworkData.organisations?.length || 0
      };

      // Fetch NHS Charities
      const nhsCharitiesData = await this.fetchNHSCharitiesData();
      (result.phases.dataFetching as WorkflowPhasesWithExtensions).nhsCharities = {
        success: nhsCharitiesData.success,
        ...(nhsCharitiesData.error && { error: nhsCharitiesData.error }),
        recordCount: nhsCharitiesData.organisations?.length || 0
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
        ...(collegesData.organisations || []),
        ...(niSchoolsData.organisations || []),
        ...(courtsData.organisations || []),
        ...(groundworkData.organisations || []),
        ...(nhsCharitiesData.organisations || [])
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