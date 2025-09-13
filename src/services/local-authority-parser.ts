import axios from 'axios';
import * as cheerio from 'cheerio';
import type { LocalAuthority, LocalAuthorityParserResult } from '../models/local-authority.js';

export class LocalAuthorityParser {
  async parse(url: string): Promise<LocalAuthorityParserResult> {
    try {
      const html = await this.fetchHTML(url);
      return this.parseHTML(html);
    } catch (error: any) {
      if (error.message.includes('structure changed')) {
        throw error;
      }
      throw new Error('Failed to fetch DEFRA UK-AIR Local Authorities page');
    }
  }

  async fetchAndParse(url: string): Promise<LocalAuthorityParserResult> {
    return this.parse(url);
  }

  private async fetchHTML(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; UK-Public-Sector-Aggregator/1.0)'
        },
        timeout: 30000
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch DEFRA UK-AIR Local Authorities page');
    }
  }

  private parseHTML(html: string): LocalAuthorityParserResult {
    const $ = cheerio.load(html);
    const authorities: LocalAuthority[] = [];
    
    // The DEFRA UK-AIR page has local authorities in an unordered list
    // organized by alphabetical sections
    const lists = $('ul');
    
    if (lists.length === 0) {
      throw new Error('Unable to parse Local Authorities - structure changed');
    }

    // Find all list items containing council links
    $('li').each((_, el) => {
      const $el = $(el);
      const $link = $el.find('a').first();
      
      if ($link.length > 0) {
        const name = $link.text().trim();
        const href = $link.attr('href');
        
        // Only process if it looks like a council
        if (name && (name.includes('Council') || name.includes('Authority'))) {
          const authority: LocalAuthority = {
            name: name,
            code: this.generateCode(name, href || ''),
            type: this.inferAuthorityType(name),
            url: this.normalizeURL(href || '')
          };
          
          // Avoid duplicates
          if (!authorities.some(a => a.name === name)) {
            authorities.push(authority);
          }
        }
      }
    });

    // If we didn't find enough, try looking for links directly
    if (authorities.length < 200) {
      $('a').each((_, el) => {
        const $el = $(el);
        const name = $el.text().trim();
        const href = $el.attr('href');
        const title = $el.attr('title');
        
        // Check if it's a council link
        if ((name && name.includes('Council')) || (title && title.includes('Council'))) {
          const councilName = name.includes('Council') ? name : title;
          
          if (councilName && !authorities.some(a => a.name === councilName)) {
            authorities.push({
              name: councilName,
              code: this.generateCode(councilName, href || ''),
              type: this.inferAuthorityType(councilName),
              url: this.normalizeURL(href || '')
            });
          }
        }
      });
    }

    if (authorities.length < 300) {
      throw new Error('Unable to parse Local Authorities - structure changed');
    }

    return {
      authorities,
      count: authorities.length,
      timestamp: new Date().toISOString()
    };
  }

  inferAuthorityType(name: string): 'county' | 'district' | 'borough' | 'city' | 'unitary' {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('county council')) {
      return 'county';
    }
    if (lowerName.includes('district council')) {
      return 'district';
    }
    if (lowerName.includes('borough council')) {
      return 'borough';
    }
    if (lowerName.includes('city council')) {
      return 'city';
    }
    
    // Default to unitary for generic "Council" names
    return 'unitary';
  }

  generateCode(name: string, url: string): string {
    // Extract domain from URL
    let domain = '';
    try {
      const urlObj = new URL(url.startsWith('http') ? url : 'http://' + url);
      domain = urlObj.hostname.replace(/^www\./, '').replace(/\./g, '-');
    } catch {
      domain = 'unknown';
    }
    
    const nameSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    
    return `${nameSlug}-${domain}`.replace(/-+/g, '-');
  }

  private normalizeURL(href: string): string {
    if (!href) {
      return '';
    }
    
    // Already a full URL
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return href;
    }
    
    // Protocol-relative URL
    if (href.startsWith('//')) {
      return 'https:' + href;
    }
    
    // Assume it's a domain without protocol
    if (href.includes('.')) {
      return 'https://' + href;
    }
    
    // Relative URL (shouldn't happen for external council sites)
    return 'https://uk-air.defra.gov.uk' + (href.startsWith('/') ? href : '/' + href);
  }
}