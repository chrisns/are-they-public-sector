/**
 * Parser for Scottish Courts data
 * Scrapes court information from the Scottish Courts and Tribunals Service website
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import type { ScottishCourtRaw, Court, CourtLocation, CourtContact, CourtType } from '../models/court.js';
import { CourtStatus, Jurisdiction } from '../models/court.js';

export class ScottishCourtsParser {
  private lastError?: string;
  private readonly sitemapUrl = 'https://www.scotcourts.gov.uk/sitemap.xml';
  private readonly courtUrlPattern = /courts-and-tribunals\/courts-tribunals-and-office-locations\/find-us\/([^</]+)$/;

  async parse(): Promise<ScottishCourtRaw[]> {
    return await this.fetchData();
  }

  private async fetchData(): Promise<ScottishCourtRaw[]> {
    try {
      // First, get all court URLs from the sitemap
      const courtUrls = await this.fetchCourtUrls();

      // Then fetch data from each court page
      const courts: ScottishCourtRaw[] = [];
      const batchSize = 5; // Process in batches to avoid overwhelming the server

      for (let i = 0; i < courtUrls.length; i += batchSize) {
        const batch = courtUrls.slice(i, i + batchSize);
        const batchPromises = batch.map(url => this.fetchCourtData(url));
        const batchResults = await Promise.allSettled(batchPromises);

        for (const result of batchResults) {
          if (result.status === 'fulfilled' && result.value) {
            courts.push(result.value);
          }
        }

        // Small delay between batches to be polite
        if (i + batchSize < courtUrls.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      return courts;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch Scottish courts data: ${this.lastError}`);
    }
  }

  private async fetchCourtUrls(): Promise<string[]> {
    try {
      const response = await axios.get(this.sitemapUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'UK Public Sector Organisation Aggregator'
        }
      });

      // Extract court URLs from sitemap
      const urls: string[] = [];
      const matches = response.data.matchAll(/<loc>(https:\/\/www\.scotcourts\.gov\.uk\/courts-and-tribunals\/courts-tribunals-and-office-locations\/find-us\/[^<]+)<\/loc>/g);

      for (const match of matches) {
        const url = match[1];
        // Filter out the main find-us page and headquarters page
        if (!url.endsWith('/find-us') && !url.includes('headquarters')) {
          urls.push(url);
        }
      }

      return urls;
    } catch (error) {
      throw new Error(`Failed to fetch sitemap: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async fetchCourtData(url: string): Promise<ScottishCourtRaw | null> {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'UK Public Sector Organisation Aggregator'
        }
      });

      const $ = cheerio.load(response.data);

      // Extract court name from the page title or heading
      let name = $('h1').first().text().trim();
      if (!name) {
        name = $('title').text().replace(' - Scottish Courts and Tribunals Service', '').trim();
      }

      if (!name) {
        return null;
      }

      // Extract address information
      const addressElement = $('.address, .contact-address').first();
      let address = '';
      let postcode = '';

      if (addressElement.length > 0) {
        address = addressElement.text().trim().replace(/\s+/g, ' ');
        // Try to extract postcode
        const postcodeMatch = address.match(/([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})/i);
        if (postcodeMatch) {
          postcode = postcodeMatch[1].toUpperCase();
        }
      } else {
        // Try alternative selectors
        const contentText = $('main').text();
        const addressMatch = contentText.match(/(?:Address|Location):[\s\S]*?([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})/i);
        if (addressMatch) {
          const fullMatch = addressMatch[0];
          address = fullMatch.replace(/(?:Address|Location):\s*/i, '').trim();
          postcode = addressMatch[1].toUpperCase();
        }
      }

      // Extract phone number
      let telephone = '';
      const phoneElement = $('.phone, .telephone, .tel').first();
      if (phoneElement.length > 0) {
        telephone = phoneElement.text().trim();
      } else {
        // Try to find phone in content
        const phoneMatch = $('main').text().match(/(?:Tel|Phone|Telephone):\s*([\d\s]+)/i);
        if (phoneMatch) {
          telephone = phoneMatch[1].trim();
        }
      }

      // Extract email
      let email = '';
      const emailElement = $('a[href^="mailto:"]').first();
      if (emailElement.length > 0) {
        email = emailElement.attr('href')?.replace('mailto:', '') || '';
      }

      // Determine court type from name
      let type = 'Other';
      const nameLower = name.toLowerCase();
      if (nameLower.includes('sheriff')) {
        type = 'Sheriff Court';
      } else if (nameLower.includes('justice of the peace') || nameLower.includes('jp court')) {
        type = 'Justice of the Peace Court';
      } else if (nameLower.includes('high court')) {
        type = 'High Court';
      } else if (nameLower.includes('court of session')) {
        type = 'Court of Session';
      } else if (nameLower.includes('appeal')) {
        type = 'Court of Appeal';
      } else if (nameLower.includes('tribunal')) {
        type = 'Tribunal';
      } else if (nameLower.includes('land court')) {
        type = 'Land Court';
      }

      // Extract town from URL or address
      const urlMatch = url.match(/find-us\/([^/]+)$/);
      let town = '';
      if (urlMatch) {
        town = urlMatch[1].replace(/-/g, ' ')
          .replace(/sheriff court.*$/i, '')
          .replace(/justice of the peace.*$/i, '')
          .replace(/court.*$/i, '')
          .replace(/tribunal.*$/i, '')
          .trim();
        // Capitalize first letter of each word
        town = town.split(' ').map(word =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
      }

      return {
        name,
        type,
        address,
        location: {
          town: town || undefined,
          postcode: postcode || undefined
        },
        telephone: telephone || undefined,
        email: email || undefined,
        website: url
      };
    } catch (error) {
      // Log error but don't throw - we want to continue processing other courts
      console.error(`Failed to fetch data from ${url}: ${error}`);
      return null;
    }
  }


  mapToCourtModel(rawCourts: ScottishCourtRaw[]): Court[] {
    return rawCourts.map(raw => this.mapSingleCourt(raw));
  }

  private mapSingleCourt(raw: ScottishCourtRaw): Court {
    const types = this.inferCourtType(raw);
    const location = this.parseLocation(raw);
    const contact = this.parseContact(raw);

    return {
      name: raw.name,
      type: types,
      jurisdiction: Jurisdiction.SCOTLAND,
      status: CourtStatus.ACTIVE,
      location,
      contact,
      sourceSystem: 'Scottish Courts API',
      lastUpdated: new Date().toISOString()
    };
  }

  private inferCourtType(raw: ScottishCourtRaw): CourtType[] {
    const types: CourtType[] = [];

    if (raw.type) {
      const lowerType = raw.type.toLowerCase();

      if (lowerType.includes('sheriff')) {
        types.push('Sheriff Court' as CourtType);
      } else if (lowerType.includes('justice of the peace') || lowerType.includes('jp')) {
        types.push('Justice of the Peace Court' as CourtType);
      } else if (lowerType.includes('court of session')) {
        types.push('Court of Session' as CourtType);
      } else if (lowerType.includes('high court') || lowerType.includes('justiciary')) {
        types.push('High Court of Justiciary' as CourtType);
      } else if (lowerType.includes('appeal')) {
        types.push('Court of Appeal' as CourtType);
      }
    }

    // Also check the name if type wasn't conclusive
    if (types.length === 0 && raw.name) {
      const lowerName = raw.name.toLowerCase();

      if (lowerName.includes('sheriff')) {
        types.push('Sheriff Court' as CourtType);
      } else if (lowerName.includes('jp') || lowerName.includes('justice of the peace')) {
        types.push('Justice of the Peace Court' as CourtType);
      } else if (lowerName.includes('court of session')) {
        types.push('Court of Session' as CourtType);
      } else if (lowerName.includes('high court') || lowerName.includes('justiciary')) {
        types.push('High Court of Justiciary' as CourtType);
      } else if (lowerName.includes('appeal')) {
        types.push('Court of Appeal' as CourtType);
      } else {
        types.push('Other' as CourtType);
      }
    }

    return types;
  }

  private parseLocation(raw: ScottishCourtRaw): CourtLocation | undefined {
    const location: CourtLocation = {
      country: 'United Kingdom'
    };

    let hasLocation = false;

    if (raw.address) {
      location.fullAddress = raw.address;
      hasLocation = true;

      // Try to extract postcode
      const postcodeMatch = raw.address.match(/([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})/i);
      if (postcodeMatch) {
        location.postcode = postcodeMatch[1].toUpperCase();
      }
    }

    if (raw.location) {
      if (raw.location.town) {
        location.town = raw.location.town;
        hasLocation = true;
      }
      if (raw.location.postcode) {
        location.postcode = raw.location.postcode;
        hasLocation = true;
      }
    }

    if (raw.telephone) {
      location.fullAddress = (location.fullAddress || '') + ` Tel: ${raw.telephone}`;
      hasLocation = true;
    }

    return hasLocation ? location : undefined;
  }

  private parseContact(raw: ScottishCourtRaw): CourtContact | undefined {
    const contact: CourtContact = {};
    let hasContact = false;

    if (raw.telephone) {
      contact.telephone = raw.telephone;
      hasContact = true;
    }

    if (raw.fax) {
      contact.fax = raw.fax;
      hasContact = true;
    }

    if (raw.email) {
      contact.email = raw.email;
      hasContact = true;
    }

    if (raw.website) {
      contact.website = raw.website;
      hasContact = true;
    }

    return hasContact ? contact : undefined;
  }

  getLastError(): string | undefined {
    return this.lastError;
  }

  getMapper() {
    return {
      map: (raw: ScottishCourtRaw) => this.mapSingleCourt(raw)
    };
  }
}

// CLI execution - commented out for Jest compatibility
// if (import.meta.url === `file://${process.argv[1]}`) {
//   const parser = new ScottishCourtsParser();
//   parser.parse()
//     .then(courts => {
//       console.log(`Fetched ${courts.length} Scottish courts`);
//       if (parser.getLastError()) {
//       }
//       console.log(JSON.stringify(courts.slice(0, 3), null, 2));
//     })
//     .catch(error => {
//       console.error('Error:', error.message);
//       process.exit(1);
//     });
// }