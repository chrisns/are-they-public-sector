/**
 * Fetcher for English District Councils from Wikipedia
 * Parses Wikipedia table for approximately 164 districts
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { DataSource } from '../../models/data-source.js';
import type { DistrictCouncilData, FetcherResponse } from '../../models/source-data.js';
import { DEFAULT_RETRY_CONFIG } from '../../models/source-data.js';

export class DistrictsOfEnglandFetcher {
  public readonly source = DataSource.WIKIPEDIA;
  public readonly url = 'https://en.wikipedia.org/wiki/Districts_of_England';

  async fetch(): Promise<FetcherResponse<DistrictCouncilData>> {
    try {
      const response = await this.fetchWithRetry(this.url);
      const $ = cheerio.load(response.data);

      const districts: DistrictCouncilData[] = [];

      // Look for tables containing district data
      $('table.wikitable').each((_, table) => {
        const $table = $(table);

        // Check if this table contains district information
        const headers = $table.find('th').map((_, th) => $(th).text().trim().toLowerCase()).get();

        if (headers.some(h => h.includes('district') || h.includes('council') || h.includes('authority'))) {
          $table.find('tbody tr').each((_, row) => {
            const $row = $(row);
            const cells = $row.find('td').map((_, cell) => $(cell).text().trim()).get();

            if (cells.length >= 2) {
              // First cell is typically the district name
              const name = cells[0]?.replace(/\[.*?\]/g, '').trim();

              if (name && name.length > 0) {
                // Extract additional information from other cells
                const county = cells[1]?.replace(/\[.*?\]/g, '').trim();
                const type = this.extractDistrictType(name);
                const population = this.extractPopulation(cells);

                districts.push({
                  name,
                  county: county || undefined,
                  type: type || undefined,
                  population: population || undefined
                });
              }
            }
          });
        }
      });

      // Also look for lists of districts
      $('ul li').each((_, li) => {
        const $li = $(li);
        const text = $li.text().trim();

        // Look for items that might be district names
        if (text.includes('District') || text.includes('Borough') || text.includes('City Council')) {
          const name = text.replace(/\[.*?\]/g, '').trim();

          if (name && !districts.some(d => d.name === name)) {
            const type = this.extractDistrictType(name);

            districts.push({
              name,
              type: type || undefined
            });
          }
        }
      });

      if (districts.length === 0) {
        throw new Error('No district data found on Wikipedia page');
      }

      return {
        success: true,
        data: districts,
        source: this.source,
        timestamp: new Date(),
        metadata: {
          totalRecords: districts.length,
          dynamicUrl: this.url
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

  private extractDistrictType(name: string): string | undefined {
    if (name.includes('Borough')) return 'Borough';
    if (name.includes('City')) return 'City';
    if (name.includes('District')) return 'District';
    return undefined;
  }

  private extractPopulation(cells: string[]): number | undefined {
    for (const cell of cells) {
      const numMatch = cell.replace(/,/g, '').match(/\b(\d{4,})\b/);
      if (numMatch) {
        const num = parseInt(numMatch[1], 10);
        if (num > 1000 && num < 10000000) { // Reasonable population range
          return num;
        }
      }
    }
    return undefined;
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
    // Not used for this fetcher but required for interface compatibility
    return null;
  }
}