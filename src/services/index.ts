/**
 * Service exports for UK Public Sector Organisation Aggregator
 * Central export point for all service modules
 */

// Export services
export { FetcherService, createFetcher } from './fetcher.js';
export type { FetcherConfig, FetchResult } from './fetcher.js';

// Re-export writer from lib
export { WriterService, createWriter, writeOrganisations, writeResult } from '../lib/writer.js';
export type { WriterConfig, OutputData, OutputSummary } from '../lib/writer.js';