/**
 * Service exports for UK Public Sector Organisation Aggregator
 * Central export point for all service modules
 */

// Export services
export { FetcherService, createFetcher } from './fetcher.js';
export type { FetcherConfig, FetchResult } from './fetcher.js';

export { ParserService, createParser } from './parser.js';
export type { ParserConfig, ParseResult } from './parser.js';

export { MapperService, createMapper } from './mapper.js';
export type { MapperConfig } from './mapper.js';

export { DeduplicatorService, createDeduplicator } from './deduplicator.js';
export type { DeduplicatorConfig } from './deduplicator.js';

// Re-export writer from lib
export { WriterService, createWriter, writeOrganisations, writeResult } from '../lib/writer.js';
export type { WriterConfig, OutputData, OutputSummary } from '../lib/writer.js';