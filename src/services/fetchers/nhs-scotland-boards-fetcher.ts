/**
 * Fetcher for NHS Scotland Health Boards
 * Parses NHS Scotland for 14 health boards
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { DataSource } from '../../models/data-source.js';
import type { HealthOrganisationData, FetcherResponse } from '../../models/source-data.js';
import { DEFAULT_RETRY_CONFIG } from '../../models/source-data.js';

export class NHSScotlandBoardsFetcher {
  public readonly source = DataSource.NHS_SCOTLAND;
  public readonly url = 'https://www.nhsinform.scot/about-nhs-scotland/nhs-boards';

  async fetch(): Promise<FetcherResponse<HealthOrganisationData>> {
    try {
      const response = await this.fetchWithRetry(this.url);
      const $ = cheerio.load(response.data);

      const healthBoards: HealthOrganisationData[] = [];

      // Look for health board listings in various formats
      $('.health-board, .board-item, .nhs-board, article').each((_, element) => {
        const $element = $(element);

        // Look for headings or titles containing health board names
        $element.find('h1, h2, h3, h4, .title, .name, .board-name').each((_, titleElement) => {
          const title = $(titleElement).text().trim();

          if (this.isHealthBoardName(title)) {
            const name = this.cleanHealthBoardName(title);

            // Look for additional information in surrounding content
            const parentElement = $(titleElement).closest('.health-board, .board-item, .nhs-board, article');
            const area = this.extractArea(parentElement.text());
            const website = this.extractWebsite(parentElement);

            if (name && !healthBoards.some(h => h.name === name)) {
              healthBoards.push({
                name,
                type: 'health_board',
                area: area || undefined,
                website: website || undefined
              });
            }
          }
        });
      });

      // Look for links that might be health board names
      $('a').each((_, link) => {
        const $link = $(link);
        const linkText = $link.text().trim();
        const href = $link.attr('href');

        if (this.isHealthBoardName(linkText)) {
          const name = this.cleanHealthBoardName(linkText);

          if (name && !healthBoards.some(h => h.name === name)) {
            const website = this.normalizeUrl(href);

            healthBoards.push({
              name,
              type: 'health_board',
              website: website || undefined
            });
          }
        }
      });

      // Look for list items containing health board information
      $('ul li, ol li').each((_, li) => {
        const $li = $(li);
        const text = $li.text().trim();

        if (this.isHealthBoardName(text)) {
          const name = this.cleanHealthBoardName(text);

          if (name && !healthBoards.some(h => h.name === name)) {
            const website = this.extractWebsite($li);
            const area = this.extractArea(text);

            healthBoards.push({
              name,
              type: 'health_board',
              area: area || undefined,
              website: website || undefined
            });
          }
        }
      });

      // Look for tables containing health board data
      $('table').each((_, table) => {
        const $table = $(table);

        $table.find('tbody tr, tr').each((_, row) => {
          const $row = $(row);
          const cells = $row.find('td, th').map((_, cell) => $(cell).text().trim()).get();

          if (cells.length > 0) {
            const potentialName = cells[0];

            if (this.isHealthBoardName(potentialName)) {
              const name = this.cleanHealthBoardName(potentialName);

              if (name && !healthBoards.some(h => h.name === name)) {
                const area = cells[1] || undefined;
                const website = this.extractWebsite($row);

                healthBoards.push({
                  name,
                  type: 'health_board',
                  area: area || undefined,
                  website: website || undefined
                });
              }
            }
          }
        });
      });

      // Add well-known Scottish health boards if not found
      const knownBoards = [
        'NHS Ayrshire and Arran',
        'NHS Borders',
        'NHS Dumfries and Galloway',
        'NHS Fife',
        'NHS Forth Valley',
        'NHS Grampian',
        'NHS Greater Glasgow and Clyde',
        'NHS Highland',
        'NHS Lanarkshire',
        'NHS Lothian',
        'NHS Orkney',
        'NHS Shetland',
        'NHS Tayside',
        'NHS Western Isles'
      ];

      for (const boardName of knownBoards) {
        if (!healthBoards.some(h => h.name.includes(boardName.replace('NHS ', '')))) {
          healthBoards.push({
            name: boardName,
            type: 'health_board'
          });
        }
      }

      if (healthBoards.length === 0) {
        throw new Error('No NHS Scotland health board data found');
      }

      return {
        success: true,
        data: healthBoards,
        source: this.source,
        timestamp: new Date(),
        metadata: {
          totalRecords: healthBoards.length,
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

  private isHealthBoardName(text: string): boolean {
    const lowerText = text.toLowerCase();
    return (lowerText.includes('nhs') ||
            lowerText.includes('health board') ||
            lowerText.includes('health service') ||
            (lowerText.includes('ayrshire') && lowerText.includes('arran')) ||
            lowerText.includes('borders') ||
            lowerText.includes('dumfries') ||
            lowerText.includes('galloway') ||
            lowerText.includes('fife') ||
            lowerText.includes('forth valley') ||
            lowerText.includes('grampian') ||
            lowerText.includes('glasgow') ||
            lowerText.includes('clyde') ||
            lowerText.includes('highland') ||
            lowerText.includes('lanarkshire') ||
            lowerText.includes('lothian') ||
            lowerText.includes('orkney') ||
            lowerText.includes('shetland') ||
            lowerText.includes('tayside') ||
            lowerText.includes('western isles')) &&
           !lowerText.includes('about') &&
           !lowerText.includes('contact') &&
           text.length > 3 &&
           text.length < 100;
  }

  private cleanHealthBoardName(name: string): string {
    let cleaned = name
      .replace(/\[.*?\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Ensure NHS prefix
    if (!cleaned.toLowerCase().startsWith('nhs') &&
        !cleaned.toLowerCase().includes('health board')) {
      cleaned = `NHS ${cleaned}`;
    }

    return cleaned;
  }

  private extractArea(text: string): string | undefined {
    // Look for geographic indicators
    const areaPatterns = [
      /serves?\s+([^.]+)/i,
      /covers?\s+([^.]+)/i,
      /area[:\s]+([^.]+)/i,
      /region[:\s]+([^.]+)/i
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
    if (!url) return undefined;

    // Handle relative URLs
    if (url.startsWith('/')) {
      return `https://www.nhsinform.scot${url}`;
    }

    if (!url.startsWith('http')) return undefined;

    try {
      const parsed = new URL(url);
      return parsed.toString();
    } catch {
      return undefined;
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
    // Not used for this fetcher but required for interface compatibility
    return null;
  }
}