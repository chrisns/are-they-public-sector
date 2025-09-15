/**
 * Police Forces Parser
 * Fetches and parses UK police forces from police.uk
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { PoliceForce, PoliceParserResponse } from '../models/emergency-services.js';

export interface PoliceParserOptions {
  ukForcesUrl?: string;
  nonUkForcesUrl?: string;
  timeout?: number;
}

export class PoliceParser {
  private readonly ukForcesUrl: string;
  private readonly nonUkForcesUrl: string;
  private readonly timeout: number;

  constructor(options: PoliceParserOptions = {}) {
    this.ukForcesUrl = options.ukForcesUrl || 'https://www.police.uk/pu/contact-us/uk-police-forces/';
    this.nonUkForcesUrl = options.nonUkForcesUrl || 'https://www.police.uk/pu/find-a-police-force/';
    this.timeout = options.timeout || 10000; // Reduced timeout
  }

  /**
   * Fetch all police forces from both UK and non-UK pages
   */
  async fetchAll(): Promise<PoliceForce[]> {
    console.log('Fetching police forces...');
    
    try {
      // Try to fetch both, but don't fail if one times out
      const results = await Promise.allSettled([
        this.fetchUKForces(),
        this.fetchNonUKForces()
      ]);
      
      const ukForces = results[0].status === 'fulfilled' ? results[0].value : [];
      const nonUkForces = results[1].status === 'fulfilled' ? results[1].value : [];

      const allForces = [...ukForces, ...nonUkForces];
      
      // If we didn't get enough forces, use fallback data
      if (allForces.length < 40) {
        console.warn(`Only got ${allForces.length} police forces from live data, using fallback`);
        const fallback = this.loadFallbackData();
        if (fallback.length > 0) {
          return fallback;
        }
        console.warn('No fallback data available, returning live data');
      }

      console.log(`Fetched ${allForces.length} police forces`);
      return allForces;
    } catch (error) {
      console.error('Failed to fetch police forces:', error);
      const fallback = this.loadFallbackData();
      if (fallback.length > 0) {
        console.log(`Using fallback data (${fallback.length} forces)`);
        return fallback;
      }
      console.warn('No fallback data available, returning empty array');
      return [];
    }
  }

  /**
   * Fetch UK police forces
   */
  private async fetchUKForces(): Promise<PoliceForce[]> {
    try {
      const response = await axios.get(this.ukForcesUrl, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; UK Public Sector Aggregator)',
          'Accept': 'text/html'
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 500 // Accept any status < 500
      });

      // If we get a non-200 status, return empty array
      if (response.status && response.status !== 200) {
        console.warn(`UK forces page returned status ${response.status}`);
        return [];
      }

      return this.parseHTML(response.data, this.ukForcesUrl);
    } catch (error) {
      console.error('Error fetching UK forces:', error instanceof Error ? error.message : String(error));
      // Return empty array instead of throwing
      return [];
    }
  }

  /**
   * Fetch non-UK police forces (Crown Dependencies, etc.)
   */
  private async fetchNonUKForces(): Promise<PoliceForce[]> {
    try {
      const response = await axios.get(this.nonUkForcesUrl, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; UK Public Sector Aggregator)',
          'Accept': 'text/html'
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 500
      });

      if (response.status && response.status !== 200) {
        console.warn(`Non-UK forces page returned status ${response.status}`);
        return [];
      }

      const forces = this.parseHTML(response.data, this.nonUkForcesUrl);
      
      // Mark non-UK forces appropriately
      return forces.map(force => ({
        ...force,
        forceType: this.classifyNonUKForce(force.name)
      }));
    } catch (error) {
      console.error('Error fetching non-UK forces:', error instanceof Error ? error.message : String(error));
      return []; // Non-UK forces are optional
    }
  }

  /**
   * Parse HTML to extract police forces
   */
  parseHTML(html: string, baseUrl: string): PoliceForce[] {
    const $ = cheerio.load(html);
    const forces: PoliceForce[] = [];

    // Check for expected structure
    if ($('body').text().length < 100) {
      throw new Error('HTML structure changed - page appears empty');
    }

    // Try multiple selectors for resilience
    const selectors = [
      '.police-forces-list a',
      '.police-forces a',
      'ul li a[href*="police"]',
      'ul.forces li',  // List items in forces list
      'ul li',         // Any list items
      'article a',
      'main a[href*="/force/"]'
    ];

    let foundElements = false;
    for (const selector of selectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        foundElements = true;
        elements.each((_i, el) => {
          const name = $(el).text().trim();
          const href = $(el).attr('href');
          
          if (name && name.length > 0) {
            // Check if this looks like a police force
            if (name.toLowerCase().includes('police') || name.toLowerCase().includes('constabulary')) {
              const force: PoliceForce = {
                name: this.normalizeName(name),
                serviceType: 'police',
                forceType: this.classifyForceType(name),
                jurisdiction: this.extractJurisdiction(name),
                ...(href && { website: this.resolveUrl(href, baseUrl) })
              };
              forces.push(force);
            }
          }
        });
        break;
      }
    }

    // Fallback: look for any text that looks like a police force
    if (!foundElements) {
      const text = $('body').text();
      const policePattern = /([A-Z][a-z]+(?: [A-Z][a-z]+)*(?:Police|Constabulary))/g;
      let match;
      while ((match = policePattern.exec(text)) !== null) {
        const name = match[1]?.trim();
        if (!name) continue;
        if (!forces.find(f => f.name === name)) {
          forces.push({
            name,
            serviceType: 'police',
            forceType: 'territorial',
            jurisdiction: name.replace(/Police|Constabulary/g, '').trim()
          });
        }
      }
    }

    // For parseHTML (not fetchAll), return what we found even if empty
    // Only throw if this is clearly an error page
    if (forces.length === 0 && $('body').text().length < 100) {
      throw new Error('Unable to parse police forces - no data found');
    }

    return forces;
  }

  /**
   * Classify force type based on name
   */
  private classifyForceType(name: string): PoliceForce['forceType'] {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('british transport') || 
        lowerName.includes('civil nuclear') ||
        lowerName.includes('ministry of defence')) {
      return 'special';
    }
    
    if (lowerName.includes('jersey') || 
        lowerName.includes('guernsey') || 
        lowerName.includes('isle of man')) {
      return 'crown_dependency';
    }
    
    if (lowerName.includes('gibraltar') || 
        lowerName.includes('sovereign base')) {
      return 'overseas_territory';
    }
    
    return 'territorial';
  }

  /**
   * Classify non-UK force type
   */
  private classifyNonUKForce(name: string): PoliceForce['forceType'] {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('jersey') || 
        lowerName.includes('guernsey') || 
        lowerName.includes('isle of man')) {
      return 'crown_dependency';
    }
    
    return 'overseas_territory';
  }

  /**
   * Extract jurisdiction from name and context
   */
  private extractJurisdiction(name: string): string {
    // Remove "Police", "Constabulary" etc.
    const jurisdiction = name
      .replace(/Police Service/gi, '')
      .replace(/Police/gi, '')
      .replace(/Constabulary/gi, '')
      .trim();
    
    // Special cases
    if (name.toLowerCase().includes('metropolitan')) {
      return 'Greater London';
    }
    if (name.toLowerCase().includes('british transport')) {
      return 'UK Rail Network';
    }
    
    return jurisdiction || name;
  }

  /**
   * Normalize police force name
   */
  private normalizeName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/[^\w\s&()-]/g, '');
  }

  /**
   * Resolve relative URLs
   */
  private resolveUrl(href: string, baseUrl: string): string {
    if (href.startsWith('http')) {
      return href;
    }
    if (href.startsWith('/')) {
      const url = new URL(baseUrl);
      return `${url.protocol}//${url.host}${href}`;
    }
    return new URL(href, baseUrl).toString();
  }

  /**
   * Load fallback data when live fetching fails
   */
  private loadFallbackData(): PoliceForce[] {
    try {
      const fallbackPath = join(process.cwd(), 'src', 'data', 'emergency-services-fallback.json');
      const data = readFileSync(fallbackPath, 'utf-8');
      const parsed = JSON.parse(data);
      return parsed.police || [];
    } catch (error) {
      console.error('Failed to load fallback data:', error);
      return [];
    }
  }

  /**
   * Aggregate with metadata
   */
  async aggregate(): Promise<PoliceParserResponse> {
    const forces = await this.fetchAll();
    
    return {
      forces,
      metadata: {
        source: 'police.uk',
        fetchedAt: new Date().toISOString(),
        totalCount: forces.length
      }
    };
  }
}