/**
 * Fetcher for Scottish Government Organisations from MyGov.scot
 * Parses MyGov.scot organisations directory
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { DataSource } from '../../models/data-source.js';
import type { GenericOrganisationData, FetcherResponse } from '../../models/source-data.js';
import { DEFAULT_RETRY_CONFIG } from '../../models/source-data.js';

export class ScottishGovernmentOrgsFetcher {
  public readonly source = DataSource.MYGOV_SCOT;
  public readonly url = 'https://www.mygov.scot/organisations';

  async fetch(): Promise<FetcherResponse<GenericOrganisationData>> {
    try {
      const response = await this.fetchWithRetry(this.url);
      const $ = cheerio.load(response.data);

      const organisations: GenericOrganisationData[] = [];

      // Look for organisation listings in various formats
      $('.organisation-item, .org-listing, .directory-item, article').each((_, element) => {
        const $element = $(element);

        // Look for headings or titles containing organisation names
        $element.find('h1, h2, h3, h4, .title, .name, .org-name').each((_, titleElement) => {
          const title = $(titleElement).text().trim();

          if (this.isScottishOrgName(title)) {
            const name = this.cleanOrgName(title);

            // Look for additional information in surrounding content
            const parentElement = $(titleElement).closest('.organisation-item, .org-listing, .directory-item, article');
            const type = this.extractOrgType(parentElement.text());
            const website = this.extractWebsite(parentElement);

            if (name && !organisations.some(o => o.name === name)) {
              organisations.push({
                name,
                type: type || 'Scottish Government Organisation',
                region: 'Scotland',
                website: website || undefined
              });
            }
          }
        });
      });

      // Look for links that might be organisation names
      $('a').each((_, link) => {
        const $link = $(link);
        const linkText = $link.text().trim();
        const href = $link.attr('href');

        if (this.isScottishOrgName(linkText)) {
          const name = this.cleanOrgName(linkText);

          if (name && !organisations.some(o => o.name === name)) {
            const website = this.normalizeUrl(href);
            const type = this.extractOrgTypeFromName(name);

            organisations.push({
              name,
              type: type || 'Scottish Government Organisation',
              region: 'Scotland',
              website: website || undefined
            });
          }
        }
      });

      // Look for list items containing organisation information
      $('ul li, ol li').each((_, li) => {
        const $li = $(li);
        const text = $li.text().trim();

        if (this.isScottishOrgName(text)) {
          const name = this.cleanOrgName(text);

          if (name && !organisations.some(o => o.name === name)) {
            const website = this.extractWebsite($li);
            const type = this.extractOrgTypeFromName(name);

            organisations.push({
              name,
              type: type || 'Scottish Government Organisation',
              region: 'Scotland',
              website: website || undefined
            });
          }
        }
      });

      // Look for tables containing organisation data
      $('table').each((_, table) => {
        const $table = $(table);

        $table.find('tbody tr, tr').each((_, row) => {
          const $row = $(row);
          const cells = $row.find('td, th').map((_, cell) => $(cell).text().trim()).get();

          if (cells.length > 0) {
            const potentialName = cells[0];

            if (this.isScottishOrgName(potentialName)) {
              const name = this.cleanOrgName(potentialName);

              if (name && !organisations.some(o => o.name === name)) {
                const type = cells[1] || this.extractOrgTypeFromName(name);
                const website = this.extractWebsite($row);

                organisations.push({
                  name,
                  type: type || 'Scottish Government Organisation',
                  region: 'Scotland',
                  website: website || undefined
                });
              }
            }
          }
        });
      });

      if (organisations.length === 0) {
        throw new Error('No Scottish Government organisation data found on MyGov.scot');
      }

      return {
        success: true,
        data: organisations,
        source: this.source,
        timestamp: new Date(),
        metadata: {
          totalRecords: organisations.length,
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

  private isScottishOrgName(text: string): boolean {
    const lowerText = text.toLowerCase();

    // Exclude common navigation and generic terms
    const excludeTerms = [
      'home', 'about', 'contact', 'search', 'services', 'help', 'news',
      'policy', 'publications', 'statistics', 'guidance', 'information'
    ];

    if (excludeTerms.some(term => lowerText === term || lowerText.includes(`${term} us`))) {
      return false;
    }

    // Include Scottish organisation indicators
    return (lowerText.includes('scotland') ||
            lowerText.includes('scottish') ||
            lowerText.includes('agency') ||
            lowerText.includes('authority') ||
            lowerText.includes('commission') ||
            lowerText.includes('council') ||
            lowerText.includes('board') ||
            lowerText.includes('trust') ||
            lowerText.includes('service') ||
            lowerText.includes('office') ||
            lowerText.includes('department') ||
            lowerText.includes('executive')) &&
           text.length > 5 &&
           text.length < 150 &&
           !lowerText.includes('cookie') &&
           !lowerText.includes('privacy');
  }

  private cleanOrgName(name: string): string {
    return name
      .replace(/\[.*?\]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/^\W+|\W+$/g, '')
      .trim();
  }

  private extractOrgType(text: string): string | undefined {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('agency')) return 'Agency';
    if (lowerText.includes('authority')) return 'Authority';
    if (lowerText.includes('commission')) return 'Commission';
    if (lowerText.includes('council') && !lowerText.includes('community')) return 'Council';
    if (lowerText.includes('board')) return 'Board';
    if (lowerText.includes('trust')) return 'Trust';
    if (lowerText.includes('service')) return 'Service';
    if (lowerText.includes('office')) return 'Office';
    if (lowerText.includes('department')) return 'Department';
    if (lowerText.includes('executive')) return 'Executive';

    return undefined;
  }

  private extractOrgTypeFromName(name: string): string | undefined {
    return this.extractOrgType(name);
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
      return `https://www.mygov.scot${url}`;
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