/**
 * Fetcher for National Park Authorities from National Parks England
 * Parses members page for 10 national parks
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { DataSource } from '../../models/data-source.js';
import type { NationalParkData, FetcherResponse } from '../../models/source-data.js';
import { DEFAULT_RETRY_CONFIG } from '../../models/source-data.js';

export class NationalParkAuthoritiesFetcher {
  public readonly source = DataSource.NATIONAL_PARKS_ENGLAND;
  public readonly url = 'https://www.nationalparks.uk/about-us/our-members';

  async fetch(): Promise<FetcherResponse<NationalParkData>> {
    try {
      const response = await this.fetchWithRetry(this.url);
      const $ = cheerio.load(response.data);

      const parks: NationalParkData[] = [];

      // Look for park listings in various formats
      $('article, .park-item, .member-item, .content-block').each((_, element) => {
        const $element = $(element);
        // const text = $element.text(); // Unused

        // Look for headings or titles containing park names
        $element.find('h1, h2, h3, h4, .title, .name').each((_, titleElement) => {
          const title = $(titleElement).text().trim();

          if (this.isParkName(title)) {
            const name = this.cleanParkName(title);

            // Look for additional information in surrounding content
            const parentElement = $(titleElement).closest('article, .park-item, .member-item, .content-block');
            const established = this.extractEstablished(parentElement.text());
            const area = this.extractArea(parentElement.text());
            const website = this.extractWebsite(parentElement);

            if (name && !parks.some(p => p.name === name)) {
              parks.push({
                name,
                established: established || undefined,
                area: area || undefined,
                website: website || undefined
              });
            }
          }
        });
      });

      // Also look for links that might be park names
      $('a').each((_, link) => {
        const $link = $(link);
        const linkText = $link.text().trim();
        const href = $link.attr('href');

        if (this.isParkName(linkText) && href) {
          const name = this.cleanParkName(linkText);

          if (name && !parks.some(p => p.name === name)) {
            const website = this.normalizeUrl(href);

            parks.push({
              name,
              website: website || undefined
            });
          }
        }
      });

      // Look for list items containing park information
      $('ul li, ol li').each((_, li) => {
        const $li = $(li);
        const text = $li.text().trim();

        if (this.isParkName(text)) {
          const name = this.cleanParkName(text);

          if (name && !parks.some(p => p.name === name)) {
            const website = this.extractWebsite($li);

            parks.push({
              name,
              website: website || undefined
            });
          }
        }
      });

      if (parks.length === 0) {
        throw new Error('No national park data found on National Parks England page');
      }

      return {
        success: true,
        data: parks,
        source: this.source,
        timestamp: new Date(),
        metadata: {
          totalRecords: parks.length,
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

  private isParkName(text: string): boolean {
    const lowerText = text.toLowerCase();
    return (lowerText.includes('national park') ||
            lowerText.includes('peak district') ||
            lowerText.includes('lake district') ||
            lowerText.includes('yorkshire dales') ||
            lowerText.includes('dartmoor') ||
            lowerText.includes('exmoor') ||
            lowerText.includes('new forest') ||
            lowerText.includes('northumberland') ||
            lowerText.includes('north york moors') ||
            lowerText.includes('south downs') ||
            lowerText.includes('broads')) &&
           !lowerText.includes('authority') &&
           text.length > 3 &&
           text.length < 100;
  }

  private cleanParkName(name: string): string {
    return name
      .replace(/National Park Authority/gi, 'National Park')
      .replace(/\s+Authority\s*$/gi, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractEstablished(text: string): string | undefined {
    const yearMatch = text.match(/established[:\s]+(\d{4})|(\d{4})[:\s]*established/i);
    return yearMatch ? (yearMatch[1] || yearMatch[2]) : undefined;
  }

  private extractArea(text: string): string | undefined {
    const areaMatch = text.match(/(\d+[\d,.\s]*(?:km²|square miles|hectares|acres))/i);
    return areaMatch ? areaMatch[1].trim() : undefined;
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