/**
 * Contract: Northern Ireland Health and Social Care Trusts Fetcher Service
 * Source: https://www.nidirect.gov.uk/contacts/health-and-social-care-trusts
 */

export interface NIHealthTrustRaw {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  email?: string;
  servicesProvided?: string[];
}

export interface NIHealthTrustsFetcherContract {
  /**
   * Fetches NI Health and Social Care Trusts from NI Direct
   * @returns Array of raw NI Health Trust data
   * @throws Error if fetch fails or no data found
   */
  fetch(): Promise<NIHealthTrustRaw[]>;
}

export interface NIHealthTrustsFetcherConfig {
  url: string;
  timeout: number;
  maxRetries: number;
  userAgent: string;
  followDetailPages: boolean;
}

export const DEFAULT_CONFIG: NIHealthTrustsFetcherConfig = {
  url: 'https://www.nidirect.gov.uk/contacts/health-and-social-care-trusts',
  timeout: 30000,
  maxRetries: 3,
  userAgent: 'UK-Public-Sector-Aggregator/1.0',
  followDetailPages: true
};

/**
 * Expected behavior:
 * 1. Fetch HTML from NI Direct URL
 * 2. Parse trust list from main page
 * 3. Optionally follow links to detail pages
 * 4. Extract contact information if available
 * 5. Validate expected count (5-6 trusts)
 */