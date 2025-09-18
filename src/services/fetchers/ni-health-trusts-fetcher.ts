/**
 * Northern Ireland Health and Social Care Trusts Fetcher
 * Fetches health trust data from NI Direct
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import type { NIHealthTrustRaw } from '../../models/ni-health-trust.js';

export class NIHealthTrustsFetcher {
  private readonly url = 'https://www.nidirect.gov.uk/contacts/health-and-social-care-trusts';
  private readonly timeout = 30000;
  private readonly maxRetries = 3;
  private readonly userAgent = 'UK-Public-Sector-Aggregator/1.0';
  private readonly followDetailPages = true;

  async fetch(): Promise<NIHealthTrustRaw[]> {
    const html = await this.fetchWithRetry(this.url);
    const trusts = await this.parseHTML(html);

    console.log(`Fetched ${trusts.length} NI Health and Social Care Trusts`);

    if (trusts.length < 5 || trusts.length > 7) {
      console.warn(`Warning: Expected 5-6 NI Health Trusts but found ${trusts.length}`);
    }

    return trusts;
  }

  private async fetchWithRetry(url: string, retryCount = 0): Promise<string> {
    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-GB,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br'
        }
      });
      return response.data;
    } catch (error) {
      if (retryCount < this.maxRetries - 1) {
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`Retry ${retryCount + 1}/${this.maxRetries} after ${delay}ms...`);
        await this.sleep(delay);
        return this.fetchWithRetry(url, retryCount + 1);
      }
      throw new Error(`Failed to fetch from ${url} after ${this.maxRetries} attempts: ${error}`);
    }
  }

  private async parseHTML(html: string): Promise<NIHealthTrustRaw[]> {
    const $ = cheerio.load(html);
    const trusts: NIHealthTrustRaw[] = [];

    // Find trust listings - NI Direct uses various formats
    // Try to find lists containing trust names
    $('ul li a, .article-content a, .contact-list a').each((_, element) => {
      const $link = $(element);
      const text = $link.text().trim();
      const href = $link.attr('href');

      // Check if this looks like a health trust
      if (this.looksLikeHealthTrust(text)) {
        const trust: NIHealthTrustRaw = {
          name: this.cleanTrustName(text)
        };

        // Get the detail page URL if available
        if (href && this.followDetailPages) {
          const detailUrl = href.startsWith('http') ? href : `https://www.nidirect.gov.uk${href}`;
          trust.website = detailUrl;
        }

        // Check if we already have this trust
        if (!trusts.some(t => t.name === trust.name)) {
          trusts.push(trust);
        }
      }
    });

    // Also check for trusts in definition lists or contact sections
    $('.contact-details, dl').each((_, element) => {
      const $element = $(element);
      const heading = $element.find('h2, h3, dt').first().text().trim();

      if (this.looksLikeHealthTrust(heading)) {
        const trust: NIHealthTrustRaw = {
          name: this.cleanTrustName(heading)
        };

        // Extract contact details from the element
        const contactText = $element.text();

        // Extract phone number
        const phoneMatch = contactText.match(/(?:Tel|Phone|T):?\s*([\d\s()-]+)/i);
        if (phoneMatch) {
          trust.phone = phoneMatch[1].trim();
        }

        // Extract email
        const emailMatch = contactText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) {
          trust.email = emailMatch[1];
        }

        // Extract address
        const addressLines = $element.find('address, .address').text().trim();
        if (addressLines) {
          trust.address = addressLines.replace(/\s+/g, ' ').trim();
        }

        // Extract website
        const websiteLink = $element.find('a[href*="hscni"], a[href*="trust"]').attr('href');
        if (websiteLink) {
          trust.website = websiteLink;
        }

        // Check if we already have this trust
        if (!trusts.some(t => t.name === trust.name)) {
          trusts.push(trust);
        }
      }
    });

    // If we have detail page URLs and want to follow them, fetch additional details
    if (this.followDetailPages) {
      for (const trust of trusts) {
        if (trust.website && trust.website.includes('nidirect.gov.uk')) {
          try {
            const detailHtml = await this.fetchWithRetry(trust.website);
            await this.parseDetailPage(trust, detailHtml);
          } catch (error) {
            console.warn(`Failed to fetch details for ${trust.name}: ${error}`);
          }
        }
      }
    }

    // Ensure we have the known NI Health Trusts
    const knownTrusts = [
      'Belfast Health and Social Care Trust',
      'Northern Health and Social Care Trust',
      'South Eastern Health and Social Care Trust',
      'Southern Health and Social Care Trust',
      'Western Health and Social Care Trust',
      'Northern Ireland Ambulance Service'
    ];

    for (const knownName of knownTrusts) {
      if (!trusts.some(t => t.name.includes(knownName.replace(' Health and Social Care Trust', '')))) {
        trusts.push({ name: knownName });
      }
    }

    return trusts;
  }

  private async parseDetailPage(trust: NIHealthTrustRaw, html: string): Promise<void> {
    const $ = cheerio.load(html);

    // Extract additional contact details from detail page
    if (!trust.phone) {
      const phoneMatch = $('body').text().match(/(?:Tel|Phone|T):?\s*([\d\s()-]+)/i);
      if (phoneMatch) {
        trust.phone = phoneMatch[1].trim();
      }
    }

    if (!trust.email) {
      const emailMatch = $('body').text().match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch) {
        trust.email = emailMatch[1];
      }
    }

    if (!trust.address) {
      const address = $('address, .address, .contact-address').first().text().trim();
      if (address) {
        trust.address = address.replace(/\s+/g, ' ').trim();
      }
    }

    // Extract services if listed
    const services: string[] = [];
    $('.services li, .service-list li').each((_, element) => {
      const service = $(element).text().trim();
      if (service) {
        services.push(service);
      }
    });

    if (services.length > 0) {
      trust.servicesProvided = services;
    }
  }

  private looksLikeHealthTrust(text: string): boolean {
    if (!text || text.length < 5) {
      return false;
    }

    const trustPatterns = [
      /health.*trust/i,
      /social.*care.*trust/i,
      /hsc.*trust/i,
      /ambulance.*service/i,
      /belfast.*trust/i,
      /northern.*trust/i,
      /south.*eastern.*trust/i,
      /southern.*trust/i,
      /western.*trust/i
    ];

    return trustPatterns.some(pattern => pattern.test(text));
  }

  private cleanTrustName(name: string): string {
    return name
      .replace(/\[edit\]/g, '')
      .replace(/^\d+\.\s*/, '')
      .replace(/^[•·]\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}