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
import { createSimpleParser, SimpleParserService } from '../services/parser-simple.js';
import { createSimpleMapper, SimpleMapperService } from '../services/mapper-simple.js';

// Import models
import type { Organisation } from '../models/organisation.js';
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
  [key: string]: any;
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
  data?: any;
  organisations?: Organisation[];
  metadata: {
    source: string;
    fetchedAt: string;
    [key: string]: any;
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
    metadata: any;
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
    fetchFn: () => Promise<any>
  ): Promise<any> {
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
      const parseResult = this.simpleParser.parseGovUkJson(data.data);
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
        const downloadResult = await this.fetcher.downloadOnsExcel(excelUrl);
        if (!downloadResult.success) {
          throw new Error('Failed to download ONS Excel file');
        }
        return downloadResult.data;
      });
      this.logger.stopProgress('ONS Excel file downloaded');

      // Parse Excel data using simple parser
      this.logger.startProgress('Parsing ONS Excel data...');
      const parseResult = this.simpleParser.parseOnsExcel(excelPath.filePath || excelPath);
      
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
          excelUrl,
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
      // Fetch GOV.UK data
      const govUkResult = await this.fetchGovUkData();
      if (govUkResult.success && govUkResult.organisations) {
        allOrganisations.push(...govUkResult.organisations);
        sources.push('gov.uk-api');
        this.logger.success(`Added ${govUkResult.organisations.length} GOV.UK organisations`);
      } else {
        errors.push(govUkResult.error || new Error('GOV.UK fetch failed'));
      }

      // Fetch ONS data
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
          org.sources.some((s: any) => s.source === source.replace('-units', '').replace('.uk-api', '_uk_api').replace('-', '_'))
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

      // Combine all organisations
      const allOrganisations = [
        ...(govUkData.organisations || []),
        ...onsData.institutionalUnits,
        ...onsData.nonInstitutionalUnits
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
        sources: [],
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
  }): Promise<ProcessingResult> {
    // Update config with CLI options
    if (options) {
      if (options.cache !== undefined) this.config.cacheEnabled = options.cache;
      if (options.debug !== undefined) this.config.debugMode = options.debug;
      if (options.timeout !== undefined) this.config.timeout = options.timeout;
      if (options.output !== undefined) this.config.outputPath = options.output;
      
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
      output: this.config.outputPath
    });

    try {
      // Execute the workflow
      const result = await this.executeCompleteWorkflow();
      
      if (!result.success) {
        throw new Error('Workflow execution failed');
      }

      // Build final result
      const outputPath = result.phases.outputGeneration.filePath || this.config.outputPath!;
      const recordCount = result.phases.outputGeneration.recordCount || 0;
      
      // Read the written file to get the actual data
      const outputContent = readFileSync(outputPath, 'utf-8');
      const outputData = JSON.parse(outputContent);
      
      return {
        organisations: outputData.organisations || [],
        metadata: outputData.metadata || {
          processedAt: new Date().toISOString(),
          sources: [],
          statistics: {
            totalOrganisations: recordCount,
            duplicatesFound: result.phases.deduplication?.duplicatesFound || 0,
            conflictsDetected: 0,
            organisationsByType: {} as Record<OrganisationType, number>
          }
        }
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