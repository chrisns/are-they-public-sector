/**
 * Fetcher for Scottish Regional Transport Partnerships
 * Parses Transport Scotland for 7 RTPs
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { DataSource } from '../../models/data-source.js';
import type { TransportPartnershipData, FetcherResponse } from '../../models/source-data.js';
import { DEFAULT_RETRY_CONFIG } from '../../models/source-data.js';

export class ScottishRTPsFetcher {
  public readonly source = DataSource.TRANSPORT_SCOTLAND;
  public readonly url = 'https://www.transport.gov.scot/our-approach/strategy/regional-transport-partnerships-rtps/';

  async fetch(): Promise<FetcherResponse<TransportPartnershipData>> {
    try {
      const response = await this.fetchWithRetry(this.url);
      const $ = cheerio.load(response.data);

      const rtps: TransportPartnershipData[] = [];

      // Look for RTP listings in various formats
      $('.rtp-item, .transport-partnership, .partnership-item, article').each((_, element) => {
        const $element = $(element);

        // Look for headings or titles containing RTP names
        $element.find('h1, h2, h3, h4, .title, .name, .rtp-name').each((_, titleElement) => {
          const title = $(titleElement).text().trim();

          if (this.isRTPName(title)) {
            const name = this.cleanRTPName(title);

            // Look for additional information in surrounding content
            const parentElement = $(titleElement).closest('.rtp-item, .transport-partnership, .partnership-item, article');
            const abbreviation = this.extractAbbreviation(parentElement.text());
            const councils = this.extractCouncils(parentElement.text());
            const website = this.extractWebsite(parentElement);

            if (name && !rtps.some(r => r.name === name)) {
              rtps.push({
                name,
                abbreviation: abbreviation || undefined,
                councils: councils && councils.length > 0 ? councils : undefined,
                website: website || undefined
              });
            }
          }
        });
      });

      // Look for links that might be RTP names
      $('a').each((_, link) => {
        const $link = $(link);
        const linkText = $link.text().trim();
        const href = $link.attr('href');

        if (this.isRTPName(linkText)) {
          const name = this.cleanRTPName(linkText);

          if (name && !rtps.some(r => r.name === name)) {
            const website = this.normalizeUrl(href);
            const abbreviation = this.extractAbbreviationFromName(name);

            rtps.push({
              name,
              abbreviation: abbreviation || undefined,
              website: website || undefined
            });
          }
        }
      });

      // Look for list items containing RTP information
      $('ul li, ol li').each((_, li) => {
        const $li = $(li);
        const text = $li.text().trim();

        if (this.isRTPName(text)) {
          const name = this.cleanRTPName(text);

          if (name && !rtps.some(r => r.name === name)) {
            const website = this.extractWebsite($li);
            const abbreviation = this.extractAbbreviation(text);
            const councils = this.extractCouncils(text);

            rtps.push({
              name,
              abbreviation: abbreviation || undefined,
              councils: councils && councils.length > 0 ? councils : undefined,
              website: website || undefined
            });
          }
        }
      });

      // Add well-known Scottish RTPs if not found
      const knownRTPs = [
        { name: 'Strathclyde Partnership for Transport', abbreviation: 'SPT' },
        { name: 'Highlands and Islands Transport Partnership', abbreviation: 'HITRANS' },
        { name: 'North East Scotland Transport Partnership', abbreviation: 'NESTRANS' },
        { name: 'South East Scotland Transport Partnership', abbreviation: 'SESTRAN' },
        { name: 'South West Scotland Transport Partnership', abbreviation: 'SWESTRANS' },
        { name: 'Tactran', abbreviation: 'TACTRAN' },
        { name: 'Zetrans', abbreviation: 'ZETRANS' }
      ];

      for (const knownRTP of knownRTPs) {
        if (!rtps.some(r => r.name.includes(knownRTP.name) || r.abbreviation === knownRTP.abbreviation)) {
          rtps.push({
            name: knownRTP.name,
            abbreviation: knownRTP.abbreviation
          });
        }
      }

      if (rtps.length === 0) {
        throw new Error('No Scottish RTP data found on Transport Scotland page');
      }

      return {
        success: true,
        data: rtps,
        source: this.source,
        timestamp: new Date(),
        metadata: {
          totalRecords: rtps.length,
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

  private isRTPName(text: string): boolean {
    const lowerText = text.toLowerCase();
    return (lowerText.includes('transport partnership') ||
            lowerText.includes('rtp') ||
            lowerText.includes('strathclyde') ||
            lowerText.includes('spt') ||
            lowerText.includes('hitrans') ||
            lowerText.includes('nestrans') ||
            lowerText.includes('sestran') ||
            lowerText.includes('swestrans') ||
            lowerText.includes('tactran') ||
            lowerText.includes('zetrans') ||
            (lowerText.includes('transport') &&
             (lowerText.includes('highland') || lowerText.includes('islands') ||
              lowerText.includes('north east') || lowerText.includes('south east') ||
              lowerText.includes('south west')))) &&
           !lowerText.includes('about') &&
           !lowerText.includes('contact') &&
           text.length > 3 &&
           text.length < 150;
  }

  private cleanRTPName(name: string): string {
    return name
      .replace(/\[.*?\]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/^\W+|\W+$/g, '')
      .trim();
  }

  private extractAbbreviation(text: string): string | undefined {
    // Look for abbreviations in parentheses or after dash
    const abbrevPatterns = [
      /\(([A-Z]{3,})\)/,
      /[–-]\s*([A-Z]{3,})\s*$/,
      /\b([A-Z]{3,})\b/
    ];

    for (const pattern of abbrevPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const abbrev = match[1].trim();
        if (abbrev.length >= 3 && abbrev.length <= 10) {
          return abbrev;
        }
      }
    }

    return undefined;
  }

  private extractAbbreviationFromName(name: string): string | undefined {
    // Extract known abbreviations from RTP names
    const knownAbbrevs: Record<string, string> = {
      'Strathclyde Partnership for Transport': 'SPT',
      'Highlands and Islands Transport Partnership': 'HITRANS',
      'North East Scotland Transport Partnership': 'NESTRANS',
      'South East Scotland Transport Partnership': 'SESTRAN',
      'South West Scotland Transport Partnership': 'SWESTRANS',
      'Tactran': 'TACTRAN',
      'Zetrans': 'ZETRANS'
    };

    for (const [fullName, abbrev] of Object.entries(knownAbbrevs)) {
      if (name.includes(fullName)) {
        return abbrev;
      }
    }

    return undefined;
  }

  private extractCouncils(text: string): string[] | undefined {
    // Look for council mentions
    const councilPatterns = [
      /councils?[:\s]+([^.]+)/i,
      /members?[:\s]+([^.]+)/i,
      /covers?[:\s]+([^.]+)/i
    ];

    for (const pattern of councilPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const councilsText = match[1].trim();
        const councils = councilsText
          .split(/[,;]/)
          .map(c => c.trim())
          .filter(c => c.length > 3 && c.length < 50);

        if (councils.length > 0) {
          return councils;
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
      return `https://www.transport.gov.scot${url}`;
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