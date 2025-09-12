/**
 * HTTP Fetcher Service
 * Handles fetching data from various sources including GOV.UK API and ONS Excel files
 */

import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { DataSourceType } from '../models/organisation.js';

/**
 * Configuration for the fetcher service
 */
export interface FetcherConfig {
  govUkApiUrl?: string;
  onsPageUrl?: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  userAgent?: string;
}

/**
 * Result of a fetch operation
 */
export interface FetchResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  source: DataSourceType;
  retrievedAt: string;
  url?: string;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<FetcherConfig> = {
  govUkApiUrl: 'https://www.gov.uk/api/organisations',
  onsPageUrl: 'https://www.ons.gov.uk/economy/nationalaccounts/uksectoraccounts/datasets/publicsectorclassificationguide',
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000,
  userAgent: 'UK-Public-Sector-Aggregator/1.0'
};

/**
 * HTTP Fetcher Service
 * Provides methods to fetch data from GOV.UK API and ONS website
 */
export class FetcherService {
  private config: Required<FetcherConfig>;
  private axiosInstance: AxiosInstance;

  constructor(config: FetcherConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Create axios instance with default configuration
    this.axiosInstance = axios.create({
      timeout: this.config.timeout,
      headers: {
        'User-Agent': this.config.userAgent,
        'Accept': 'application/json, text/html, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    });
  }

  /**
   * Fetch data from GOV.UK API
   * @returns FetchResult containing array of organisations or error
   */
  async fetchGovUkOrganisations(): Promise<FetchResult> {
    const url = this.config.govUkApiUrl;
    
    try {
      // GOV.UK API returns paginated results
      let allOrganisations: any[] = [];
      let currentUrl: string | null = url;
      let pageCount = 0;
      const maxPages = 100; // Safety limit to prevent infinite loops
      
      console.log(`Fetching GOV.UK organisations from: ${url}`);
      
      while (currentUrl && pageCount < maxPages) {
        const pageResponse = await this.retryRequest(() => 
          this.axiosInstance.get(currentUrl!)
        );
        
        if (pageResponse.data?.results) {
          allOrganisations = allOrganisations.concat(pageResponse.data.results);
          pageCount++;
          
          // Log progress
          console.log(`  Page ${pageCount}: ${pageResponse.data.results.length} orgs (total: ${allOrganisations.length})`);
        }
        
        // Check for next page - the API returns next_page_url
        currentUrl = pageResponse.data?.next_page_url || null;
        
        // Make sure URL is absolute
        if (currentUrl && !currentUrl.startsWith('http')) {
          currentUrl = `https://www.gov.uk${currentUrl}`;
        }
      }
      
      console.log(`GOV.UK: Fetched ${allOrganisations.length} organisations across ${pageCount} pages`);
      
      return {
        success: true,
        data: allOrganisations,
        source: DataSourceType.GOV_UK_API,
        retrievedAt: new Date().toISOString(),
        url
      };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error),
        source: DataSourceType.GOV_UK_API,
        retrievedAt: new Date().toISOString(),
        url
      };
    }
  }

  /**
   * Scrape ONS page to find Excel file link
   * @returns URL of the Excel file or null if not found
   */
  async scrapeOnsExcelLink(): Promise<string | null> {
    const url = this.config.onsPageUrl;
    
    try {
      const response = await this.retryRequest(() => 
        this.axiosInstance.get(url, {
          responseType: 'text'
        })
      );
      
      const html = response.data;
      
      // Look for the specific link text "Public sector classification guide" as per spec
      // The link pattern is typically: <a href="/file?uri=/methodology/.../pscgaug2025.xlsx">Public sector classification guide</a>
      const linkPattern = /<a[^>]*href="([^"]*)"[^>]*>([^<]*Public\s+sector\s+classification\s+guide[^<]*)<\/a>/gi;
      const matches = [...html.matchAll(linkPattern)];
      
      if (matches.length > 0) {
        // Get the href from the first match
        let excelUrl = matches[0][1];
        
        // Make URL absolute if it's relative
        if (!excelUrl.startsWith('http')) {
          const baseUrl = new URL(url);
          excelUrl = new URL(excelUrl, baseUrl.origin).toString();
        }
        
        console.log('Found ONS Excel link:', excelUrl);
        return excelUrl;
      }
      
      // Fallback: look for any Excel file links containing "classification" or "pscg"
      const xlsxPattern = /href="([^"]*(?:classification|pscg)[^"]*\.xlsx?)"/gi;
      const xlsxMatches = [...html.matchAll(xlsxPattern)];
      
      if (xlsxMatches.length > 0) {
        let excelUrl = xlsxMatches[0][1];
        
        // Make URL absolute if it's relative
        if (!excelUrl.startsWith('http')) {
          const baseUrl = new URL(url);
          excelUrl = new URL(excelUrl, baseUrl.origin).toString();
        }
        
        console.log('Found ONS Excel link (fallback):', excelUrl);
        return excelUrl;
      }
      
      // Second fallback: look for any Excel file links
      const anyXlsxPattern = /href="([^"]*\.xlsx?)"/gi;
      const anyMatches = [...html.matchAll(anyXlsxPattern)];
      
      if (anyMatches.length > 0) {
        // Get the most recent file (usually the first one)
        let excelUrl = anyMatches[0][1];
        
        // Make URL absolute if it's relative
        if (!excelUrl.startsWith('http')) {
          const baseUrl = new URL(url);
          excelUrl = new URL(excelUrl, baseUrl.origin).toString();
        }
        
        console.log('Found ONS Excel link (any xlsx):', excelUrl);
        return excelUrl;
      }
      
      return null;
    } catch (error) {
      console.error('Error scraping ONS page:', this.formatError(error));
      return null;
    }
  }

  /**
   * Download Excel file from ONS
   * @param url URL of the Excel file
   * @param outputPath Path where to save the file
   * @returns FetchResult containing file path or error
   */
  async downloadOnsExcel(url?: string, outputPath?: string): Promise<FetchResult> {
    try {
      // If URL not provided, try to scrape it
      const excelUrl = url || await this.scrapeOnsExcelLink();
      
      if (!excelUrl) {
        return {
          success: false,
          error: 'Could not find Excel file URL on ONS page',
          source: DataSourceType.ONS_INSTITUTIONAL,
          retrievedAt: new Date().toISOString()
        };
      }
      
      // Determine output path
      const filePath = outputPath || path.join(
        process.cwd(),
        'data',
        `ons_classification_${Date.now()}.xlsx`
      );
      
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Download file
      const response = await this.retryRequest(() => 
        this.axiosInstance.get(excelUrl, {
          responseType: 'arraybuffer'
        })
      );
      
      // Save file
      fs.writeFileSync(filePath, response.data);
      
      return {
        success: true,
        data: { filePath, url: excelUrl },
        source: DataSourceType.ONS_INSTITUTIONAL,
        retrievedAt: new Date().toISOString(),
        url: excelUrl
      };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error),
        source: DataSourceType.ONS_INSTITUTIONAL,
        retrievedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Generic HTTP GET request with retry logic
   * @param url URL to fetch
   * @param config Optional axios configuration
   * @returns Axios response
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.retryRequest(() => 
      this.axiosInstance.get<T>(url, config)
    );
  }

  /**
   * Retry a request with exponential backoff
   * @param requestFn Function that returns a promise for the request
   * @returns Response from the successful request
   */
  private async retryRequest<T>(
    requestFn: () => Promise<T>
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on 4xx errors (except 429)
        if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        if (attempt < this.config.maxRetries - 1) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Sleep for specified milliseconds
   * @param ms Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Format error message from various error types
   * @param error Error object
   * @returns Formatted error message
   */
  private formatError(error: any): string {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        return `HTTP ${error.response.status}: ${error.response.statusText}`;
      } else if (error.request) {
        return 'No response received from server';
      } else {
        return error.message;
      }
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return String(error);
  }
}

/**
 * Create a default fetcher instance
 */
export const createFetcher = (config?: FetcherConfig): FetcherService => {
  return new FetcherService(config);
};