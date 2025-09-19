/**
 * Fetcher for English Unitary Authorities from ONS
 * Handles dynamic CSV link extraction
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { parse } from 'csv-parse/sync';
import { DataSource } from '../../models/data-source.js';
import type { UnitaryAuthorityData, FetcherResponse } from '../../models/source-data.js';
import { DEFAULT_RETRY_CONFIG } from '../../models/source-data.js';

export class EnglishUnitaryAuthoritiesFetcher {
  public readonly source = DataSource.ONS;
  public readonly url = 'https://www.ons.gov.uk/aboutus/transparencyandgovernance/freedomofinformationfoi/alistofunitaryauthoritiesinenglandwithageographicalmap';

  async fetch(): Promise<FetcherResponse<UnitaryAuthorityData>> {
    try {
      // Step 1: Fetch the ONS page to get the dynamic CSV link
      const csvUrl = await this.extractCsvUrl();

      if (!csvUrl) {
        throw new Error('Could not find CSV download link on ONS page');
      }

      // Step 2: Fetch and parse the CSV data
      const authorities = await this.fetchCsvData(csvUrl);

      return {
        success: true,
        data: authorities,
        source: this.source,
        timestamp: new Date(),
        metadata: {
          totalRecords: authorities.length,
          dynamicUrl: csvUrl
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        source: this.source,
        timestamp: new Date()
      };
    }
  }

  private async extractCsvUrl(): Promise<string | null> {
    try {
      const response = await this.fetchWithRetry(this.url);
      const $ = cheerio.load(response.data);

      // Look for the download table link with CSV format
      // ONS uses a specific pattern: /download/table?format=csv&uri=...
      const csvLink = $('a[href*="/download/table?format=csv"]').first().attr('href') ||
                      $('a[href$=".csv"]').first().attr('href') ||
                      $('a:contains(".csv")').first().attr('href') ||
                      $('a[href*="/file?uri="]').filter((_, el) => {
                        const href = $(el).attr('href') || '';
                        return href.includes('.csv');
                      }).first().attr('href');

      if (!csvLink) {
        return null;
      }

      // Convert relative URLs to absolute
      if (csvLink.startsWith('/')) {
        return `https://www.ons.gov.uk${csvLink}`;
      }

      return csvLink;
    } catch (error) {
      throw new Error(`Failed to extract CSV URL: ${error}`);
    }
  }

  private async fetchCsvData(csvUrl: string): Promise<UnitaryAuthorityData[]> {
    try {
      const response = await this.fetchWithRetry(csvUrl);
      const csvContent = response.data;

      // Parse CSV data
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      // Map CSV records to UnitaryAuthorityData
      const authorities: UnitaryAuthorityData[] = [];

      for (const record of records) {
        // Try different possible column names for the authority name and code
        const name = (record as Record<string, unknown>)['Name'] ||
                    record['Authority'] ||
                    record['Local Authority'] ||
                    record['Unitary Authority'] ||
                    record['LA Name'] ||
                    Object.values(record).find((v) => typeof v === 'string' && v.length > 0);

        const code = (record as Record<string, unknown>)['Code'] ||
                    record['ONS Code'] ||
                    record['LA Code'] ||
                    record['Authority Code'] ||
                    (Object.keys(record).find(key => key.toLowerCase().includes('code')) ?
                     record[Object.keys(record).find(key => key.toLowerCase().includes('code'))!] : undefined);

        if (name && typeof name === 'string') {
          authorities.push({
            name: name.trim(),
            code: code ? String(code).trim() : undefined,
            region: 'England'
          });
        }
      }

      return authorities;
    } catch (error) {
      throw new Error(`Failed to fetch CSV data: ${error}`);
    }
  }

  private async fetchWithRetry(url: string, attempt = 0): Promise<unknown> {
    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'UK-Public-Sector-Aggregator/1.0'
        }
      });
      return response;
    } catch (error) {
      if (attempt < DEFAULT_RETRY_CONFIG.maxAttempts - 1) {
        const delay = DEFAULT_RETRY_CONFIG.backoffMs[attempt];
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  }

  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async fetchPage(_page: number): Promise<unknown> {
    // Not used for this fetcher but might be needed for mocking in tests
    return null;
  }
}