/**
 * Fetcher for Integrated Care Boards from NHS directory
 * Parses NHS ICB directory for 42 ICBs
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { DataSource } from '../../models/data-source.js';
import type { HealthOrganisationData, FetcherResponse } from '../../models/source-data.js';
import { DEFAULT_RETRY_CONFIG } from '../../models/source-data.js';

export class IntegratedCareBoardsFetcher {
  public readonly source = DataSource.NHS;
  public readonly url = 'https://www.england.nhs.uk/integratedcare/integrated-care-in-your-area/';

  async fetch(): Promise<FetcherResponse<HealthOrganisationData>> {
    try {
      const response = await this.fetchWithRetry(this.url);
      const $ = cheerio.load(response.data);

      const icbs: HealthOrganisationData[] = [];

      // Look for ICB listings in various formats
      $('article, .icb-item, .care-board, .content-block, .region-block').each((_, element) => {
        const $element = $(element);

        // Look for headings or titles containing ICB names
        $element.find('h1, h2, h3, h4, .title, .name, .icb-name').each((_, titleElement) => {
          const title = $(titleElement).text().trim();

          if (this.isICBName(title)) {
            const name = this.cleanICBName(title);

            // Look for additional information in surrounding content
            const parentElement = $(titleElement).closest('article, .icb-item, .care-board, .content-block');
            const area = this.extractArea(parentElement.text());
            const website = this.extractWebsite(parentElement);

            if (name && !icbs.some(i => i.name === name)) {
              icbs.push({
                name,
                type: 'integrated_care_board',
                area: area || undefined,
                website: website || undefined
              });
            }
          }
        });
      });

      // Look for links that might be ICB names
      $('a').each((_, link) => {
        const $link = $(link);
        const linkText = $link.text().trim();
        const href = $link.attr('href');

        if (this.isICBName(linkText)) {
          const name = this.cleanICBName(linkText);

          if (name && !icbs.some(i => i.name === name)) {
            const website = this.normalizeUrl(href);

            icbs.push({
              name,
              type: 'integrated_care_board',
              website: website || undefined
            });
          }
        }
      });

      // Look for list items containing ICB information
      $('ul li, ol li').each((_, li) => {
        const $li = $(li);
        const text = $li.text().trim();

        if (this.isICBName(text)) {
          const name = this.cleanICBName(text);

          if (name && !icbs.some(i => i.name === name)) {
            const website = this.extractWebsite($li);
            const area = this.extractArea(text);

            icbs.push({
              name,
              type: 'integrated_care_board',
              area: area || undefined,
              website: website || undefined
            });
          }
        }
      });

      // Look for tables containing ICB data
      $('table').each((_, table) => {
        const $table = $(table);

        $table.find('tbody tr, tr').each((_, row) => {
          const $row = $(row);
          const cells = $row.find('td, th').map((_, cell) => $(cell).text().trim()).get();

          if (cells.length > 0) {
            const potentialName = cells[0];

            if (this.isICBName(potentialName)) {
              const name = this.cleanICBName(potentialName);

              if (name && !icbs.some(i => i.name === name)) {
                const area = cells[1] || undefined;
                const website = this.extractWebsite($row);

                icbs.push({
                  name,
                  type: 'integrated_care_board',
                  area: area || undefined,
                  website: website || undefined
                });
              }
            }
          }
        });
      });

      if (icbs.length === 0) {
        throw new Error('No ICB data found on NHS England page');
      }

      return {
        success: true,
        data: icbs,
        source: this.source,
        timestamp: new Date(),
        metadata: {
          totalRecords: icbs.length,
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

  private isICBName(text: string): boolean {
    const lowerText = text.toLowerCase();
    return (lowerText.includes('integrated care') ||
            lowerText.includes('icb') ||
            lowerText.includes('care board') ||
            lowerText.includes('care system') ||
            lowerText.includes('partnership') && lowerText.includes('care')) &&
           !lowerText.includes('about') &&
           !lowerText.includes('contact') &&
           text.length > 5 &&
           text.length < 150;
  }

  private cleanICBName(name: string): string {
    return name
      .replace(/\s+ICB\s*$/gi, ' Integrated Care Board')
      .replace(/\s+Integrated Care Board\s+Integrated Care Board/gi, ' Integrated Care Board')
      .replace(/\[.*?\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractArea(text: string): string | undefined {
    // Look for geographic indicators
    const areaPatterns = [
      /covers?\s+([^.]+)/i,
      /serves?\s+([^.]+)/i,
      /area[:\s]+([^.]+)/i,
      /population[:\s]+([^.]+)/i
    ];

    for (const pattern of areaPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const area = match[1].trim();
        if (area.length > 3 && area.length < 100) {
          return area;
        }
      }
    }

    return undefined;
  }

  private extractWebsite(element: cheerio.Cheerio<cheerio.Element>): string | undefined {
    const link = element.find('a[href*="http"]').first().attr('href') ||
                 element.closest('a[href*="http"]').attr('href');

    return this.normalizeUrl(link);
  }

  private normalizeUrl(url: string | undefined): string | undefined {
    if (!url || !url.startsWith('http')) return undefined;

    try {
      const parsed = new URL(url);
      return parsed.toString();
    } catch {
      return undefined;
    }
  }

  private async fetchWithRetry(url: string, attempt = 0): Promise<any> {
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

  private async fetchPage(_page: number): Promise<any> {
    // Not used for this fetcher but required for interface compatibility
    return null;
  }
}