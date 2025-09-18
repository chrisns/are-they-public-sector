/**
 * Contract: Welsh Community Councils Fetcher Service
 * Source: https://en.wikipedia.org/wiki/List_of_communities_in_Wales
 */

export interface WelshCommunityRaw {
  name: string;
  principalArea: string;
  population?: number;
  website?: string;
  notes?: string;
}

export interface WelshCouncilsFetcherContract {
  /**
   * Fetches Welsh community councils from Wikipedia
   * @returns Array of raw Welsh community council data
   * @throws Error if fetch fails or no data found
   */
  fetch(): Promise<WelshCommunityRaw[]>;
}

export interface WelshCouncilsFetcherConfig {
  url: string;
  timeout: number;
  maxRetries: number;
  userAgent: string;
}

export const DEFAULT_CONFIG: WelshCouncilsFetcherConfig = {
  url: 'https://en.wikipedia.org/wiki/List_of_communities_in_Wales',
  timeout: 30000,
  maxRetries: 3,
  userAgent: 'UK-Public-Sector-Aggregator/1.0'
};

/**
 * Expected behavior:
 * 1. Fetch HTML from Wikipedia URL
 * 2. Retry with exponential backoff on failure
 * 3. Return parsed Welsh community councils
 * 4. Validate minimum expected count (1000+ councils)
 */