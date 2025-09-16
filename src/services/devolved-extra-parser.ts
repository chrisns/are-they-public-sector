/**
 * Additional Devolved Bodies Parser
 * Fetches and parses additional devolved administration entities from gov.uk guidance
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import type { DevolvedBody, DevolvedParserResponse } from '../models/emergency-services.js';
import { DevolvedAdminParser } from './devolved-admin-parser.js';

export interface DevolvedExtraParserOptions {
  url?: string;
  timeout?: number;
}

export class DevolvedExtraParser {
  private readonly url: string;
  private readonly timeout: number;
  private existingParser: DevolvedAdminParser;

  constructor(options: DevolvedExtraParserOptions = {}) {
    this.url = options.url || 'https://www.gov.uk/guidance/devolution-of-powers-to-scotland-wales-and-northern-ireland';
    this.timeout = options.timeout || 10000; // Reduced timeout
    this.existingParser = new DevolvedAdminParser();
  }

  async fetchAll(): Promise<DevolvedBody[]> {
    console.log('Fetching additional devolved bodies...');
    
    try {
      const response = await axios.get(this.url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; UK Public Sector Aggregator)',
          'Accept': 'text/html'
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 500
      });

      // If we get a non-200 status, throw error
      if (response.status && response.status !== 200) {
        throw new Error(`Devolved bodies page returned status ${response.status}`);
      }

      const bodies = this.parseHTML(response.data);

      // If we couldn't parse any bodies, it might be because DevolvedAdminParser already got them
      if (bodies.length === 0) {
        console.log('No additional devolved bodies found - may already be covered by DevolvedAdminParser');
        return []; // Return empty array instead of throwing
      }

      const deduplicated = await this.deduplicateAgainstExisting(bodies);

      // If we have no additional bodies after deduplication, that's ok - they're already covered
      if (deduplicated.length === 0) {
        console.log('All devolved bodies already covered by DevolvedAdminParser');
        return [];
      }

      console.log(`Fetched ${deduplicated.length} new devolved bodies`);
      return deduplicated;
    } catch (error) {
      console.error('Failed to fetch devolved bodies:', error);
      throw error;
    }
  }

  parseHTML(html: string): DevolvedBody[] {
    const $ = cheerio.load(html);
    const bodies: DevolvedBody[] = [];

    // Only throw if it's clearly an error page or missing expected structure
    const hasMainContent = $('#main-content').length > 0 || $('section').length > 0;
    if (!hasMainContent && $('body').text().length < 100) {
      throw new Error('HTML structure changed - page appears empty');
    }

    // Process Scotland section
    this.extractBodiesFromSection($, 'Scotland', 'scotland', bodies);
    
    // Process Wales section
    this.extractBodiesFromSection($, 'Wales', 'wales', bodies);
    
    // Process Northern Ireland section
    this.extractBodiesFromSection($, 'Northern Ireland', 'northern_ireland', bodies);

    // Don't throw here, let the caller handle empty results
    return bodies;
  }

  private extractBodiesFromSection(
    $: cheerio.CheerioAPI,
    sectionName: string,
    nation: DevolvedBody['nation'],
    bodies: DevolvedBody[]
  ): void {
    // Look for the devolved administrations section specifically
    const devolvedSection = $('#devolved-administrations');

    if (devolvedSection.length > 0) {
      // Find the list items under this section
      const list = devolvedSection.nextAll('ul').first();

      list.find('li').each((_i, li) => {
        const text = $(li).text().trim();

        // Extract specific government names from the list
        if (text.includes('Scottish Government') && nation === 'scotland') {
          bodies.push({
            id: 'scottish-government-extra',
            name: 'Scottish Government',
            nation: 'scotland',
            category: 'Executive',
            website: 'https://www.gov.scot'
          });
        } else if (text.includes('Welsh Government') && nation === 'wales') {
          bodies.push({
            id: 'welsh-government-extra',
            name: 'Welsh Government',
            nation: 'wales',
            category: 'Executive',
            website: 'https://www.gov.wales'
          });
        } else if (text.includes('Northern Ireland Executive') && nation === 'northern_ireland') {
          bodies.push({
            id: 'ni-executive-extra',
            name: 'Northern Ireland Executive',
            nation: 'northern_ireland',
            category: 'Executive',
            website: 'https://www.northernireland.gov.uk'
          });
        }
      });

      return;
    }

    // Fallback to old approach for other sections
    const headings = $(`h2:contains("${sectionName}"), h3:contains("${sectionName}")`);

    headings.each((_i, heading) => {
      const $heading = $(heading);
      let $current = $heading.next();
      
      while ($current.length && !$current.is('h2, h3')) {
        if ($current.is('ul, ol')) {
          $current.find('li').each((_j, li) => {
            const text = $(li).text().trim();
            const body = this.parseBodyFromText(text, nation);
            if (body) {
              bodies.push(body);
            }
          });
        } else if ($current.is('p')) {
          const text = $current.text();
          // Extract departments and bodies from prose
          const matches = text.match(/(?:Department|Agency|Authority|Commission|Office|Service|Council|Board) (?:of|for) [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g);
          if (matches) {
            matches.forEach(match => {
              const body = this.parseBodyFromText(match, nation);
              if (body) {
                bodies.push(body);
              }
            });
          }
        }
        $current = $current.next();
      }
    });
  }

  private parseBodyFromText(text: string, nation: DevolvedBody['nation']): DevolvedBody | null {
    text = text.trim();
    if (!text || text.length < 3) return null;
    
    const parentBody = this.extractParentBody(text, nation);
    return {
      name: text,
      nation,
      bodyType: this.classifyBodyType(text),
      ...(parentBody && { parentBody })
    };
  }

  classifyBodyType(name: string): DevolvedBody['bodyType'] {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('parliament') || lowerName.includes('senedd')) {
      return 'parliament';
    }
    if (lowerName.includes('assembly')) {
      return 'assembly';
    }
    if (lowerName.includes('government')) {
      return 'government';
    }
    if (lowerName.includes('department')) {
      return 'department';
    }
    if (lowerName.includes('agency') || lowerName.includes('authority') || 
        lowerName.includes('transport') || lowerName.includes('invest')) {
      return 'agency';
    }
    
    return 'public_body';
  }

  private extractParentBody(name: string, nation: DevolvedBody['nation']): string | undefined {
    if (name.toLowerCase().includes('department')) {
      switch (nation) {
        case 'scotland': return 'Scottish Government';
        case 'wales': return 'Welsh Government';
        case 'northern_ireland': return 'Northern Ireland Executive';
      }
    }
    return undefined;
  }

  async loadExistingBodies(): Promise<DevolvedBody[]> {
    try {
      const existing = await this.existingParser.fetchAll();
      // Transform DevolvedAdmin to DevolvedBody format
      return existing.map(admin => ({
        name: admin.name,
        nation: admin.administration as DevolvedBody['nation'],
        bodyType: admin.type === 'department' ? 'department' as const :
                 admin.type === 'agency' ? 'agency' as const :
                 'public_body' as const
      }));
    } catch {
      return [];
    }
  }

  private async deduplicateAgainstExisting(bodies: DevolvedBody[]): Promise<DevolvedBody[]> {
    try {
      const existing = await this.loadExistingBodies();
      const existingNames = existing.map(e => e.name.toLowerCase());
      
      return bodies.filter(body => 
        !existingNames.includes(body.name.toLowerCase())
      );
    } catch {
      // If we can't load existing bodies, return all new bodies
      console.log('Could not load existing bodies for deduplication, returning all bodies');
      return bodies;
    }
  }

  mergeRecords(existing: DevolvedBody, newBody: DevolvedBody): DevolvedBody {
    return {
      ...existing,
      ...newBody,
      name: existing.name // Preserve original name
    };
  }


  async aggregate(): Promise<DevolvedParserResponse> {
    const allBodies = await this.fetchAll();
    
    return {
      bodies: allBodies,
      metadata: {
        source: 'gov.uk/guidance',
        fetchedAt: new Date().toISOString(),
        totalCount: allBodies.length,
        newCount: allBodies.length
      }
    };
  }
}