/**
 * Fetcher for Local Healthwatch organisations
 * Handles pagination for ~150 Healthwatch organisations
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { DataSource } from '../../models/data-source.js';
import type { HealthOrganisationData, FetcherResponse, PaginatedResponse } from '../../models/source-data.js';
import { DEFAULT_RETRY_CONFIG } from '../../models/source-data.js';

export class LocalHealthwatchFetcher {
  public readonly source = DataSource.HEALTHWATCH;
  public readonly url = 'https://www.healthwatch.co.uk/your-local-healthwatch/list';

  async fetch(): Promise<FetcherResponse<HealthOrganisationData>> {
    try {
      let allHealthwatch: HealthOrganisationData[] = [];
      let currentPage = 1;
      let hasNextPage = true;
      // let totalPages = 0; // Unused but tracked for future use

      while (hasNextPage && currentPage <= 10) { // Safety limit
        const pageResponse = await this.fetchPage(currentPage);

        if (pageResponse.success && pageResponse.data) {
          allHealthwatch = allHealthwatch.concat(pageResponse.data);

          if (pageResponse.hasNextPage !== undefined) {
            hasNextPage = pageResponse.hasNextPage;
          } else {
            hasNextPage = false;
          }

          if (pageResponse.totalPages) {
            // Track total pages for pagination
            // totalPages = pageResponse.totalPages;
          }

          currentPage++;
        } else {
          hasNextPage = false;
        }
      }

      if (allHealthwatch.length === 0) {
        throw new Error('No Healthwatch data found');
      }

      return {
        success: true,
        data: allHealthwatch,
        source: this.source,
        timestamp: new Date(),
        metadata: {
          totalRecords: allHealthwatch.length,
          pagesProcessed: currentPage - 1,
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

  async fetchPage(page: number): Promise<PaginatedResponse<HealthOrganisationData>> {
    try {
      const pageUrl = page === 1 ? this.url : `${this.url}?page=${page}`;
      const response = await this.fetchWithRetry(pageUrl);
      const $ = cheerio.load(response.data);

      const healthwatch: HealthOrganisationData[] = [];

      // Look for Healthwatch listings in various formats
      $('.healthwatch-item, .local-healthwatch, .org-item, article').each((_, element) => {
        const $element = $(element);

        // Look for headings or titles containing Healthwatch names
        $element.find('h1, h2, h3, h4, .title, .name, .org-name').each((_, titleElement) => {
          const title = $(titleElement).text().trim();

          if (this.isHealthwatchName(title)) {
            const name = this.cleanHealthwatchName(title);

            // Look for additional information in surrounding content
            const parentElement = $(titleElement).closest('.healthwatch-item, .local-healthwatch, .org-item, article');
            const area = this.extractArea(parentElement.text());
            const website = this.extractWebsite(parentElement);

            if (name && !healthwatch.some(h => h.name === name)) {
              healthwatch.push({
                name,
                type: 'local_healthwatch',
                area: area || undefined,
                website: website || undefined
              });
            }
          }
        });
      });

      // Look for links that might be Healthwatch names
      $('a').each((_, link) => {
        const $link = $(link);
        const linkText = $link.text().trim();
        const href = $link.attr('href');

        if (this.isHealthwatchName(linkText)) {
          const name = this.cleanHealthwatchName(linkText);

          if (name && !healthwatch.some(h => h.name === name)) {
            const website = this.normalizeUrl(href);

            healthwatch.push({
              name,
              type: 'local_healthwatch',
              website: website || undefined
            });
          }
        }
      });

      // Look for list items containing Healthwatch information
      $('ul li, ol li').each((_, li) => {
        const $li = $(li);
        const text = $li.text().trim();

        if (this.isHealthwatchName(text)) {
          const name = this.cleanHealthwatchName(text);

          if (name && !healthwatch.some(h => h.name === name)) {
            const website = this.extractWebsite($li);
            const area = this.extractArea(text);

            healthwatch.push({
              name,
              type: 'local_healthwatch',
              area: area || undefined,
              website: website || undefined
            });
          }
        }
      });

      // Check for pagination indicators
      const hasNextPage = this.checkHasNextPage($, page);
      const totalPages = this.extractTotalPages($);

      return {
        success: true,
        data: healthwatch,
        source: this.source,
        timestamp: new Date(),
        hasNextPage,
        currentPage: page,
        totalPages: totalPages || undefined,
        metadata: {
          totalRecords: healthwatch.length,
          dynamicUrl: pageUrl
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        source: this.source,
        timestamp: new Date(),
        hasNextPage: false,
        currentPage: page
      };
    }
  }

  private isHealthwatchName(text: string): boolean {
    const lowerText = text.toLowerCase();
    return lowerText.includes('healthwatch') &&
           !lowerText.includes('about') &&
           !lowerText.includes('contact') &&
           !lowerText.includes('find') &&
           text.length > 5 &&
           text.length < 100;
  }

  private cleanHealthwatchName(name: string): string {
    return name
      .replace(/\[.*?\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractArea(text: string): string | undefined {
    // Look for geographic indicators after "Healthwatch"
    const patterns = [
      /healthwatch\s+([a-z\s]+)/i,
      /serving\s+([^.]+)/i,
      /covers?\s+([^.]+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const area = match[1].trim();
        if (area.length > 2 && area.length < 50 && !area.toLowerCase().includes('healthwatch')) {
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

  private checkHasNextPage($: cheerio.CheerioAPI, currentPage: number): boolean {
    // Look for pagination indicators
    const nextLink = $('.pagination .next, .pager .next, a[rel="next"]').length > 0;
    const pageNumbers = $('.pagination a, .pager a').map((_, el) => {
      const text = $(el).text().trim();
      const num = parseInt(text, 10);
      return isNaN(num) ? 0 : num;
    }).get();

    const maxPage = Math.max(...pageNumbers);
    return nextLink || currentPage < maxPage;
  }

  private extractTotalPages($: cheerio.CheerioAPI): number | undefined {
    const pageNumbers = $('.pagination a, .pager a').map((_, el) => {
      const text = $(el).text().trim();
      const num = parseInt(text, 10);
      return isNaN(num) ? 0 : num;
    }).get();

    return pageNumbers.length > 0 ? Math.max(...pageNumbers) : undefined;
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
}