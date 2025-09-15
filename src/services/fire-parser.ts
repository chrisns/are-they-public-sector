/**
 * Fire and Rescue Services Parser
 * Fetches and parses UK fire services from NFCC
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { FireService, FireParserResponse } from '../models/emergency-services.js';

export interface FireParserOptions {
  url?: string;
  timeout?: number;
}

export class FireParser {
  private readonly url: string;
  private readonly timeout: number;

  constructor(options: FireParserOptions = {}) {
    this.url = options.url || 'https://nfcc.org.uk/contacts/fire-and-rescue-services/';
    this.timeout = options.timeout || 10000; // Reduced timeout
  }

  /**
   * Fetch all fire services
   */
  async fetchAll(): Promise<FireService[]> {
    console.log('Fetching fire services...');
    
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

      // If we get a non-200 status, return empty array
      if (response.status && response.status !== 200) {
        console.warn(`Fire services page returned status ${response.status}`);
        return [];
      }

      const services = this.parseHTML(response.data);
      
      // If we didn't get enough services, use fallback data
      if (services.length < 45) {
        console.warn(`Only got ${services.length} fire services from live data, using fallback`);
        const fallback = this.loadFallbackData();
        if (fallback.length > 0) {
          return fallback;
        }
        console.warn('No fallback data available, returning live data');
      }

      console.log(`Fetched ${services.length} fire services`);
      return services;
    } catch (error) {
      console.error('Failed to fetch fire services:', error);
      const fallback = this.loadFallbackData();
      if (fallback.length > 0) {
        console.log(`Using fallback data (${fallback.length} services)`);
        return fallback;
      }
      console.warn('No fallback data available, returning empty array');
      return [];
    }
  }

  /**
   * Parse HTML to extract fire services
   */
  parseHTML(html: string): FireService[] {
    const $ = cheerio.load(html);
    const services: FireService[] = [];

    // Check for expected structure
    if ($('body').text().length < 100) {
      throw new Error('HTML structure changed - page appears empty');
    }

    // Try multiple selectors for different possible structures
    const selectors = [
      'table tr',           // Table rows
      '.fire-services tr',  // Table with class
      '.service-item',      // List items
      'article.fire-service', // Article elements with class
      'article',            // Any article elements
      '.services-list article', // Articles in services list
      'ul li',              // List items
      '.contact-list li'    // Contact list
    ];

    let foundElements = false;
    for (const selector of selectors) {
      const elements = $(selector);
      if (elements.length > 0) { // Found some elements
        foundElements = true;
        elements.each((_i, el) => {
          const service = this.extractServiceFromElement($, el);
          if (service) {
            services.push(service);
          }
        });
        if (services.length > 0) break; // Stop if we found services
      }
    }

    // Fallback: look for text patterns
    if (!foundElements) {
      const text = $('body').text();
      const firePattern = /([A-Z][a-z]+(?: [A-Z][a-z]+)*(?:Fire and Rescue Service|Fire Service|Fire Authority|Fire and Rescue Authority|Fire Brigade))/g;
      let match;
      while ((match = firePattern.exec(text)) !== null) {
        const name = match[1]?.trim();
        if (!name) continue;
        if (!services.find(s => s.name === name)) {
          services.push({
            name,
            serviceType: 'fire',
            authorityType: this.classifyAuthorityType(name),
            region: this.extractRegion(name)
          });
        }
      }
    }

    // For parseHTML (not fetchAll), return what we found even if empty
    // Only throw if this is clearly an error page
    if (services.length === 0 && $('body').text().length < 100) {
      throw new Error('Unable to parse fire services - no data found');
    }

    return services;
  }

  /**
   * Extract service data from HTML element
   */
  private extractServiceFromElement($: cheerio.CheerioAPI, element: cheerio.AnyNode): FireService | null {
    const $el = $(element);
    const text = $el.text();
    
    // Skip headers or empty rows
    if (!text || text.length < 5 || text.toLowerCase().includes('service name')) {
      return null;
    }

    // Try to extract from table row  
    // Check if this IS a tr element or contains td elements
    const cells = $el.is('tr') ? $el.children('td') : $el.find('td');
    if (cells.length >= 2) {
      const name = $(cells[0]).text().trim();
      const region = $(cells[1]).text().trim();
      const website = cells.length > 2 ? $(cells[2]).text().trim() : undefined;
      
      if (name && this.isFireService(name)) {
        const normalizedWebsite = this.normalizeWebsite(website);
        const service: FireService = {
          name: this.normalizeName(name),
          serviceType: 'fire',
          authorityType: this.classifyAuthorityType(name),
          region: region || this.extractRegion(name)
        };
        if (normalizedWebsite) {
          service.website = normalizedWebsite;
        }
        return service;
      }
    }

    // Try to extract from other structures
    const heading = $el.find('h3, h4, strong').first().text().trim();
    if (heading && this.isFireService(heading)) {
      const region = $el.find(':contains("Region")').parent().text().replace('Region:', '').trim() ||
                    $el.find(':contains("Area")').parent().text().replace('Area:', '').trim();
      const website = $el.find('a[href*="http"]').attr('href');
      
      return {
        name: this.normalizeName(heading),
        serviceType: 'fire',
        authorityType: this.classifyAuthorityType(heading),
        region: region || this.extractRegion(heading),
        ...(website && { website })
      };
    }

    // Simple text extraction
    if (this.isFireService(text)) {
      const name = text.trim();
      return {
        name: this.normalizeName(name),
        serviceType: 'fire',
        authorityType: this.classifyAuthorityType(name),
        region: this.extractRegion(name)
      };
    }

    return null;
  }

  /**
   * Check if text represents a fire service
   */
  private isFireService(text: string): boolean {
    const lowerText = text.toLowerCase();
    return lowerText.includes('fire') && 
           (lowerText.includes('service') || 
            lowerText.includes('authority') || 
            lowerText.includes('brigade'));
  }

  /**
   * Classify authority type based on name
   */
  classifyAuthorityType(name: string): FireService['authorityType'] {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('london') || 
        lowerName.includes('greater manchester') ||
        lowerName.includes('merseyside') ||
        lowerName.includes('south yorkshire') ||
        lowerName.includes('tyne and wear') ||
        lowerName.includes('west midlands') ||
        lowerName.includes('west yorkshire')) {
      return 'metropolitan';
    }
    
    if (lowerName.includes('combined authority') || 
        lowerName.includes('fire and rescue authority')) {
      return 'combined_authority';
    }
    
    if (lowerName.includes('unitary') || 
        lowerName.includes('council')) {
      return 'unitary';
    }
    
    return 'county';
  }

  /**
   * Extract region from service name
   */
  private extractRegion(name: string): string {
    // Remove fire service suffixes
    const region = name
      .replace(/Fire and Rescue Service/gi, '')
      .replace(/Fire and Rescue Authority/gi, '')
      .replace(/Fire Service/gi, '')
      .replace(/Fire Authority/gi, '')
      .replace(/Fire Brigade/gi, '')
      .trim();
    
    return region || name;
  }

  /**
   * Normalize service name
   */
  private normalizeName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/[^\w\s&()-]/g, '');
  }

  /**
   * Normalize website URL
   */
  private normalizeWebsite(website?: string): string | undefined {
    if (!website) return undefined;
    
    website = website.trim();
    if (!website.startsWith('http')) {
      website = 'https://' + website;
    }
    
    try {
      new URL(website);
      return website;
    } catch {
      return undefined;
    }
  }

  /**
   * Load fallback data when live fetching fails
   */
  private loadFallbackData(): FireService[] {
    try {
      const fallbackPath = join(process.cwd(), 'src', 'data', 'emergency-services-fallback.json');
      const data = readFileSync(fallbackPath, 'utf-8');
      const parsed = JSON.parse(data);
      return parsed.fire || [];
    } catch (error) {
      console.error('Failed to load fallback data:', error);
      return [];
    }
  }

  /**
   * Aggregate with metadata
   */
  async aggregate(): Promise<FireParserResponse> {
    const services = await this.fetchAll();
    
    return {
      services,
      metadata: {
        source: 'NFCC',
        fetchedAt: new Date().toISOString(),
        totalCount: services.length
      }
    };
  }
}