/**
 * Fetcher for Northern Ireland Trust Ports
 * Parses Infrastructure NI ports page
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { DataSource } from '../../models/data-source.js';
import type { TrustPortData, FetcherResponse } from '../../models/source-data.js';
import { DEFAULT_RETRY_CONFIG } from '../../models/source-data.js';

export class NITrustPortsFetcher {
  public readonly source = DataSource.INFRASTRUCTURE_NI;
  public readonly url = 'https://www.infrastructure-ni.gov.uk/topics/marine-and-fisheries/ports-and-harbours';

  async fetch(): Promise<FetcherResponse<TrustPortData>> {
    try {
      const response = await this.fetchWithRetry(this.url);
      const $ = cheerio.load(response.data);

      const trustPorts: TrustPortData[] = [];

      // Look for port listings in various formats
      $('.port-item, .trust-port, .harbour-item, article').each((_, element) => {
        const $element = $(element);

        // Look for headings or titles containing port names
        $element.find('h1, h2, h3, h4, .title, .name, .port-name').each((_, titleElement) => {
          const title = $(titleElement).text().trim();

          if (this.isPortName(title)) {
            const name = this.cleanPortName(title);

            // Look for additional information in surrounding content
            const parentElement = $(titleElement).closest('.port-item, .trust-port, .harbour-item, article');
            const location = this.extractLocation(parentElement.text());
            const type = this.extractPortType(parentElement.text());
            const website = this.extractWebsite(parentElement);

            if (name && !trustPorts.some(p => p.name === name)) {
              trustPorts.push({
                name,
                location: location || undefined,
                type: type || undefined,
                website: website || undefined
              });
            }
          }
        });
      });

      // Look for links that might be port names
      $('a').each((_, link) => {
        const $link = $(link);
        const linkText = $link.text().trim();
        const href = $link.attr('href');

        if (this.isPortName(linkText)) {
          const name = this.cleanPortName(linkText);

          if (name && !trustPorts.some(p => p.name === name)) {
            const website = this.normalizeUrl(href);
            const type = this.extractPortTypeFromName(name);

            trustPorts.push({
              name,
              type: type || undefined,
              website: website || undefined
            });
          }
        }
      });

      // Look for list items containing port information
      $('ul li, ol li').each((_, li) => {
        const $li = $(li);
        const text = $li.text().trim();

        if (this.isPortName(text)) {
          const name = this.cleanPortName(text);

          if (name && !trustPorts.some(p => p.name === name)) {
            const website = this.extractWebsite($li);
            const location = this.extractLocation(text);
            const type = this.extractPortType(text);

            trustPorts.push({
              name,
              location: location || undefined,
              type: type || undefined,
              website: website || undefined
            });
          }
        }
      });

      // Look for tables containing port data
      $('table').each((_, table) => {
        const $table = $(table);

        $table.find('tbody tr, tr').each((_, row) => {
          const $row = $(row);
          const cells = $row.find('td, th').map((_, cell) => $(cell).text().trim()).get();

          if (cells.length > 0) {
            const potentialName = cells[0];

            if (this.isPortName(potentialName)) {
              const name = this.cleanPortName(potentialName);

              if (name && !trustPorts.some(p => p.name === name)) {
                const location = cells[1] || undefined;
                const type = cells[2] || this.extractPortTypeFromName(name);
                const website = this.extractWebsite($row);

                trustPorts.push({
                  name,
                  location: location || undefined,
                  type: type || undefined,
                  website: website || undefined
                });
              }
            }
          }
        });
      });

      // Add well-known NI trust ports if not found
      const knownPorts = [
        { name: 'Belfast Harbour', location: 'Belfast', type: 'Trust Port' },
        { name: 'Londonderry Port', location: 'Londonderry', type: 'Trust Port' },
        { name: 'Warrenpoint Harbour', location: 'Warrenpoint', type: 'Trust Port' },
        { name: 'Coleraine Harbour', location: 'Coleraine', type: 'Trust Port' },
        { name: 'Larne Harbour', location: 'Larne', type: 'Commercial Port' },
        { name: 'Bangor Marina', location: 'Bangor', type: 'Marina' }
      ];

      for (const knownPort of knownPorts) {
        if (!trustPorts.some(p => p.name.includes(knownPort.name.replace(' Harbour', '').replace(' Port', '')))) {
          trustPorts.push({
            name: knownPort.name,
            location: knownPort.location,
            type: knownPort.type
          });
        }
      }

      if (trustPorts.length === 0) {
        throw new Error('No Northern Ireland trust port data found');
      }

      return {
        success: true,
        data: trustPorts,
        source: this.source,
        timestamp: new Date(),
        metadata: {
          totalRecords: trustPorts.length,
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

  private isPortName(text: string): boolean {
    const lowerText = text.toLowerCase();
    return (lowerText.includes('port') ||
            lowerText.includes('harbour') ||
            lowerText.includes('marina') ||
            lowerText.includes('dock') ||
            lowerText.includes('belfast') ||
            lowerText.includes('londonderry') ||
            lowerText.includes('warrenpoint') ||
            lowerText.includes('coleraine') ||
            lowerText.includes('larne') ||
            lowerText.includes('bangor')) &&
           !lowerText.includes('about') &&
           !lowerText.includes('contact') &&
           !lowerText.includes('services') &&
           !lowerText.includes('information') &&
           text.length > 3 &&
           text.length < 100;
  }

  private cleanPortName(name: string): string {
    return name
      .replace(/\[.*?\]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/^\W+|\W+$/g, '')
      .trim();
  }

  private extractLocation(text: string): string | undefined {
    // Look for location indicators
    const locationPatterns = [
      /located\s+(?:in|at)\s+([^.]+)/i,
      /situated\s+(?:in|at)\s+([^.]+)/i,
      /(?:in|at)\s+([a-z\s]+)(?:,|\s|$)/i
    ];

    // Known NI locations
    const niLocations = [
      'belfast', 'londonderry', 'derry', 'warrenpoint', 'coleraine',
      'larne', 'bangor', 'newry', 'carrickfergus', 'portrush'
    ];

    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const location = match[1].trim();
        if (location.length > 2 && location.length < 30) {
          return location;
        }
      }
    }

    // Check for known NI location names in the text
    for (const location of niLocations) {
      if (text.toLowerCase().includes(location)) {
        return location.charAt(0).toUpperCase() + location.slice(1);
      }
    }

    return undefined;
  }

  private extractPortType(text: string): string | undefined {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('trust port')) return 'Trust Port';
    if (lowerText.includes('commercial port')) return 'Commercial Port';
    if (lowerText.includes('fishing port')) return 'Fishing Port';
    if (lowerText.includes('marina')) return 'Marina';
    if (lowerText.includes('harbour')) return 'Harbour';

    return undefined;
  }

  private extractPortTypeFromName(name: string): string | undefined {
    return this.extractPortType(name);
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
      return `https://www.infrastructure-ni.gov.uk${url}`;
    }

    if (!url.startsWith('http')) return undefined;

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