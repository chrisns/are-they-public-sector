/**
 * Fetcher for UK Research Councils from UKRI
 * Parses UKRI for 7 research councils
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { DataSource } from '../../models/data-source.js';
import type { ResearchCouncilData, FetcherResponse } from '../../models/source-data.js';
import { DEFAULT_RETRY_CONFIG } from '../../models/source-data.js';

export class UKResearchCouncilsFetcher {
  public readonly source = DataSource.UKRI;
  public readonly url = 'https://www.ukri.org/about-us/our-councils/';

  async fetch(): Promise<FetcherResponse<ResearchCouncilData>> {
    try {
      const response = await this.fetchWithRetry(this.url);
      const $ = cheerio.load(response.data);

      const researchCouncils: ResearchCouncilData[] = [];

      // Look for research council listings in various formats
      $('.council-item, .research-council, .ukri-council, article').each((_, element) => {
        const $element = $(element);

        // Look for headings or titles containing research council names
        $element.find('h1, h2, h3, h4, .title, .name, .council-name').each((_, titleElement) => {
          const title = $(titleElement).text().trim();

          if (this.isResearchCouncilName(title)) {
            const name = this.cleanCouncilName(title);

            // Look for additional information in surrounding content
            const parentElement = $(titleElement).closest('.council-item, .research-council, .ukri-council, article');
            const abbreviation = this.extractAbbreviation(parentElement.text());
            const fullName = this.extractFullName(parentElement.text());
            const researchArea = this.extractResearchArea(parentElement.text());
            const website = this.extractWebsite(parentElement);

            if (name && !researchCouncils.some(r => r.name === name)) {
              researchCouncils.push({
                name,
                abbreviation: abbreviation || undefined,
                fullName: fullName || undefined,
                researchArea: researchArea || undefined,
                website: website || undefined
              });
            }
          }
        });
      });

      // Look for links that might be research council names
      $('a').each((_, link) => {
        const $link = $(link);
        const linkText = $link.text().trim();
        const href = $link.attr('href');

        if (this.isResearchCouncilName(linkText)) {
          const name = this.cleanCouncilName(linkText);

          if (name && !researchCouncils.some(r => r.name === name)) {
            const website = this.normalizeUrl(href);
            const abbreviation = this.extractAbbreviationFromName(name);
            const researchArea = this.extractResearchAreaFromName(name);

            researchCouncils.push({
              name,
              abbreviation: abbreviation || undefined,
              researchArea: researchArea || undefined,
              website: website || undefined
            });
          }
        }
      });

      // Look for list items containing research council information
      $('ul li, ol li').each((_, li) => {
        const $li = $(li);
        const text = $li.text().trim();

        if (this.isResearchCouncilName(text)) {
          const name = this.cleanCouncilName(text);

          if (name && !researchCouncils.some(r => r.name === name)) {
            const website = this.extractWebsite($li);
            const abbreviation = this.extractAbbreviation(text);
            const fullName = this.extractFullName(text);
            const researchArea = this.extractResearchArea(text);

            researchCouncils.push({
              name,
              abbreviation: abbreviation || undefined,
              fullName: fullName || undefined,
              researchArea: researchArea || undefined,
              website: website || undefined
            });
          }
        }
      });

      // Add well-known UK research councils if not found
      const knownCouncils = [
        {
          name: 'Arts and Humanities Research Council',
          abbreviation: 'AHRC',
          researchArea: 'Arts and Humanities'
        },
        {
          name: 'Biotechnology and Biological Sciences Research Council',
          abbreviation: 'BBSRC',
          researchArea: 'Biosciences'
        },
        {
          name: 'Engineering and Physical Sciences Research Council',
          abbreviation: 'EPSRC',
          researchArea: 'Engineering and Physical Sciences'
        },
        {
          name: 'Economic and Social Research Council',
          abbreviation: 'ESRC',
          researchArea: 'Economic and Social Sciences'
        },
        {
          name: 'Medical Research Council',
          abbreviation: 'MRC',
          researchArea: 'Medical Research'
        },
        {
          name: 'Natural Environment Research Council',
          abbreviation: 'NERC',
          researchArea: 'Environmental Sciences'
        },
        {
          name: 'Science and Technology Facilities Council',
          abbreviation: 'STFC',
          researchArea: 'Physical Sciences and Technology'
        }
      ];

      for (const knownCouncil of knownCouncils) {
        if (!researchCouncils.some(r => r.name.includes(knownCouncil.name) || r.abbreviation === knownCouncil.abbreviation)) {
          researchCouncils.push({
            name: knownCouncil.name,
            abbreviation: knownCouncil.abbreviation,
            researchArea: knownCouncil.researchArea
          });
        }
      }

      if (researchCouncils.length === 0) {
        throw new Error('No UK research council data found on UKRI page');
      }

      return {
        success: true,
        data: researchCouncils,
        source: this.source,
        timestamp: new Date(),
        metadata: {
          totalRecords: researchCouncils.length,
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

  private isResearchCouncilName(text: string): boolean {
    const lowerText = text.toLowerCase();
    return (lowerText.includes('research council') ||
            lowerText.includes('ahrc') ||
            lowerText.includes('bbsrc') ||
            lowerText.includes('epsrc') ||
            lowerText.includes('esrc') ||
            lowerText.includes('mrc') ||
            lowerText.includes('nerc') ||
            lowerText.includes('stfc') ||
            (lowerText.includes('council') &&
             (lowerText.includes('arts') || lowerText.includes('humanities') ||
              lowerText.includes('biotechnology') || lowerText.includes('biological') ||
              lowerText.includes('engineering') || lowerText.includes('physical') ||
              lowerText.includes('economic') || lowerText.includes('social') ||
              lowerText.includes('medical') || lowerText.includes('natural') ||
              lowerText.includes('environment') || lowerText.includes('science') ||
              lowerText.includes('technology') || lowerText.includes('facilities')))) &&
           !lowerText.includes('about') &&
           !lowerText.includes('contact') &&
           text.length > 5 &&
           text.length < 200;
  }

  private cleanCouncilName(name: string): string {
    return name
      .replace(/\[.*?\]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/^\W+|\W+$/g, '')
      .trim();
  }

  private extractAbbreviation(text: string): string | undefined {
    // Look for abbreviations in parentheses or after dash
    const abbrevPatterns = [
      /\(([A-Z]{3,6})\)/,
      /[–-]\s*([A-Z]{3,6})\s*$/,
      /\b(AHRC|BBSRC|EPSRC|ESRC|MRC|NERC|STFC)\b/
    ];

    for (const pattern of abbrevPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const abbrev = match[1].trim();
        if (abbrev.length >= 3 && abbrev.length <= 6) {
          return abbrev;
        }
      }
    }

    return undefined;
  }

  private extractAbbreviationFromName(name: string): string | undefined {
    // Extract known abbreviations from research council names
    const knownAbbrevs: Record<string, string> = {
      'Arts and Humanities Research Council': 'AHRC',
      'Biotechnology and Biological Sciences Research Council': 'BBSRC',
      'Engineering and Physical Sciences Research Council': 'EPSRC',
      'Economic and Social Research Council': 'ESRC',
      'Medical Research Council': 'MRC',
      'Natural Environment Research Council': 'NERC',
      'Science and Technology Facilities Council': 'STFC'
    };

    for (const [fullName, abbrev] of Object.entries(knownAbbrevs)) {
      if (name.includes(fullName)) {
        return abbrev;
      }
    }

    return undefined;
  }

  private extractFullName(text: string): string | undefined {
    // Look for full name patterns
    const fullNamePatterns = [
      /full\s+name[:\s]+([^.]+)/i,
      /officially\s+known\s+as[:\s]+([^.]+)/i
    ];

    for (const pattern of fullNamePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const fullName = match[1].trim();
        if (fullName.length > 10 && fullName.length < 200) {
          return fullName;
        }
      }
    }

    return undefined;
  }

  private extractResearchArea(text: string): string | undefined {
    // Look for research area indicators
    const areaPatterns = [
      /research\s+area[:\s]+([^.]+)/i,
      /focuses?\s+on[:\s]+([^.]+)/i,
      /covers?[:\s]+([^.]+)/i,
      /supports?[:\s]+([^.]+)/i
    ];

    for (const pattern of areaPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const area = match[1].trim();
        if (area.length > 5 && area.length < 100) {
          return area;
        }
      }
    }

    return undefined;
  }

  private extractResearchAreaFromName(name: string): string | undefined {
    const lowerName = name.toLowerCase();

    if (lowerName.includes('arts') || lowerName.includes('humanities')) {
      return 'Arts and Humanities';
    }
    if (lowerName.includes('biotechnology') || lowerName.includes('biological')) {
      return 'Biosciences';
    }
    if (lowerName.includes('engineering') || lowerName.includes('physical sciences')) {
      return 'Engineering and Physical Sciences';
    }
    if (lowerName.includes('economic') || lowerName.includes('social')) {
      return 'Economic and Social Sciences';
    }
    if (lowerName.includes('medical')) {
      return 'Medical Research';
    }
    if (lowerName.includes('natural') || lowerName.includes('environment')) {
      return 'Environmental Sciences';
    }
    if (lowerName.includes('science') && lowerName.includes('technology')) {
      return 'Physical Sciences and Technology';
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
      return `https://www.ukri.org${url}`;
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