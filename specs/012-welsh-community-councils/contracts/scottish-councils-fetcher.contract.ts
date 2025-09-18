/**
 * Contract: Scottish Community Councils Fetcher Service
 * Source: https://en.wikipedia.org/wiki/List_of_community_council_areas_in_Scotland
 */

export interface ScottishCommunityRaw {
  name: string;
  councilArea: string;
  region?: string;
  isActive: boolean;
  contactDetails?: string;
}

export interface ScottishCouncilsFetcherContract {
  /**
   * Fetches Scottish community councils from Wikipedia
   * @returns Array of raw Scottish community council data
   * @throws Error if fetch fails or no data found
   */
  fetch(): Promise<ScottishCommunityRaw[]>;
}

export interface ScottishCouncilsFetcherConfig {
  url: string;
  timeout: number;
  maxRetries: number;
  userAgent: string;
}

export const DEFAULT_CONFIG: ScottishCouncilsFetcherConfig = {
  url: 'https://en.wikipedia.org/wiki/List_of_community_council_areas_in_Scotland',
  timeout: 30000,
  maxRetries: 3,
  userAgent: 'UK-Public-Sector-Aggregator/1.0'
};

/**
 * Expected behavior:
 * 1. Fetch HTML from Wikipedia URL
 * 2. Parse council areas and their community councils
 * 3. Identify active councils (marked with asterisk)
 * 4. Return only active councils
 * 5. Validate minimum expected count (1100+ councils)
 */