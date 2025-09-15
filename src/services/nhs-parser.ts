import axios from 'axios';
import * as cheerio from 'cheerio';
import type { NHSTrust, NHSParserResult } from '../models/nhs-trust.js';

export class NHSParser {
  async parse(url: string): Promise<NHSParserResult> {
    try {
      const html = await this.fetchHTML(url);
      return this.parseHTML(html);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('structure changed')) {
        throw error;
      }
      throw new Error('Failed to fetch NHS Provider Directory');
    }
  }

  async fetchAndParse(url: string): Promise<NHSParserResult> {
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
    } catch {
      throw new Error('Failed to fetch NHS Provider Directory');
    }
  }

  private parseHTML(html: string): NHSParserResult {
    const $ = cheerio.load(html);
    const trusts: NHSTrust[] = [];
    
    // Look for the main content area with NHS Trust links
    // The NHS Provider Directory page has trusts in alphabetical sections
    const contentArea = $('.nhsuk-width-container, .page-content, main, #content').first();
    
    if (contentArea.length === 0) {
      throw new Error('Unable to parse NHS Provider Directory - structure changed');
    }

    // Find all links that look like NHS Trust names
    const links = contentArea.find('a').filter((_, el) => {
      const text = $(el).text().trim();
      return text.includes('NHS') || text.includes('Trust') || text.includes('Foundation');
    });

    if (links.length < 50) {
      // If we find too few links, try a different selector strategy
      // Look for list items or paragraphs containing trust names
      $('li, p').each((_, el) => {
        const text = $(el).text().trim();
        if ((text.includes('NHS') && (text.includes('Trust') || text.includes('Foundation'))) 
            && text.length < 200) { // Avoid long paragraphs
          const trustName = this.extractTrustName(text);
          if (trustName && !trusts.some(t => t.name === trustName)) {
            trusts.push({
              name: trustName,
              code: this.generateCode(trustName),
              type: this.identifyTrustType(trustName)
            });
          }
        }
      });
    } else {
      links.each((_, el) => {
        const $el = $(el);
        const name = $el.text().trim();
        const href = $el.attr('href');
        
        if (name && name.length > 0) {
          const trust: NHSTrust = {
            name: name,
            code: this.generateCode(name),
            type: this.identifyTrustType(name)
          };
          
          if (href) {
            trust.url = this.resolveURL(href);
          }
          
          // Avoid duplicates
          if (!trusts.some(t => t.name === name)) {
            trusts.push(trust);
          }
        }
      });
    }

    if (trusts.length < 100) {
      throw new Error('Unable to parse NHS Provider Directory - structure changed');
    }

    return {
      trusts,
      count: trusts.length,
      timestamp: new Date().toISOString()
    };
  }

  private extractTrustName(text: string): string | null {
    // Extract trust name from text that might contain other content
    const match = text.match(/(.*?NHS.*?(?:Foundation\s+)?Trust)/i);
    return match && match[1] ? match[1].trim() : null;
  }

  identifyTrustType(name: string): 'trust' | 'foundation-trust' {
    return name.toLowerCase().includes('foundation') ? 'foundation-trust' : 'trust';
  }

  generateCode(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private resolveURL(href: string): string {
    if (href.startsWith('http')) {
      return href;
    }
    if (href.startsWith('//')) {
      return 'https:' + href;
    }
    if (href.startsWith('/')) {
      return 'https://www.england.nhs.uk' + href;
    }
    return 'https://www.england.nhs.uk/' + href;
  }
}