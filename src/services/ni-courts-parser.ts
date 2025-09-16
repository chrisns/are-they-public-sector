/**
 * Parser for Northern Ireland Courts data from NI Direct website
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import type { NICourtRaw, Court, CourtLocation, CourtContact, CourtType } from '../models/court.js';
import { CourtStatus, Jurisdiction } from '../models/court.js';

export class NICourtsParser {
  private readonly url = 'https://www.nidirect.gov.uk/contacts/northern-ireland-courts-and-tribunals-service';

  async parse(): Promise<NICourtRaw[]> {
    const html = await this.fetchHTML();
    return this.parseHTML(html);
  }

  private async fetchHTML(): Promise<string> {
    try {
      const response = await axios.get(this.url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; UK-Public-Sector-Aggregator/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch HTML: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private parseHTML(html: string): NICourtRaw[] {
    const $ = cheerio.load(html);
    const courts: NICourtRaw[] = [];

    // Primary extraction from links
    $('ul li a[href^="/node/"]').each((_, element) => {
      const $el = $(element);
      const name = $el.text().trim();
      const nodeId = $el.attr('href')?.replace('/node/', '');

      if (name) {
        courts.push({
          name,
          nodeId
        });
      }
    });

    // Secondary extraction for any courts mentioned in plain text
    $('ul li').each((_, element) => {
      const $el = $(element);
      const text = $el.text().trim();

      // Only process if it looks like a court name and isn't already captured
      if (text && !courts.some(c => c.name === text)) {
        // Check if it contains court-related keywords
        const courtKeywords = ['Court', 'Tribunal', 'Magistrates'];
        const isLikelyCourt = courtKeywords.some(keyword => text.includes(keyword));

        if (isLikelyCourt || text.match(/^[A-Z][a-z]+ ?[A-Z]?[a-z]*$/)) {
          courts.push({
            name: text
          });
        }
      }
    });

    if (courts.length === 0) {
      throw new Error('No courts found in HTML');
    }

    return courts;
  }

  mapToCourtModel(rawCourts: NICourtRaw[]): Court[] {
    return rawCourts.map(raw => this.mapSingleCourt(raw));
  }

  private mapSingleCourt(raw: NICourtRaw): Court {
    const types = this.inferCourtType(raw.name);
    const location = this.parseLocation(raw);
    const contact = this.parseContact(raw);

    return {
      name: raw.name,
      identifier: raw.nodeId,
      type: types,
      jurisdiction: Jurisdiction.NORTHERN_IRELAND,
      status: CourtStatus.ACTIVE, // Assume active unless otherwise indicated
      location,
      contact,
      sourceSystem: 'NI Direct',
      lastUpdated: new Date().toISOString()
    };
  }

  private inferCourtType(name: string): CourtType[] {
    const types: CourtType[] = [];
    const lowerName = name.toLowerCase();

    if (lowerName.includes('crown')) types.push('Crown Court' as CourtType);
    if (lowerName.includes('magistrates')) types.push("Magistrates' Court" as CourtType);
    if (lowerName.includes('county')) types.push('County Court' as CourtType);
    if (lowerName.includes('family')) types.push('Family Court' as CourtType);
    if (lowerName.includes('tribunal')) types.push('Tribunal' as CourtType);
    if (lowerName.includes('high court')) types.push('High Court' as CourtType);
    if (lowerName.includes('court of appeal')) types.push('Court of Appeal' as CourtType);

    // If no specific type identified, classify as generic court
    if (types.length === 0) {
      types.push('Other' as CourtType);
    }

    return types;
  }

  private parseLocation(raw: NICourtRaw): CourtLocation | undefined {
    if (!raw.address) return undefined;

    const location: CourtLocation = {
      country: 'United Kingdom',
      fullAddress: raw.address
    };

    // Try to parse the address if it's in a standard format
    const addressParts = raw.address.split(',').map(s => s.trim());
    if (addressParts.length > 1) {
      location.addressLines = addressParts.slice(0, -1);
      const lastPart = addressParts[addressParts.length - 1];

      // Check if last part looks like a postcode
      if (/BT\d{1,2}\s?\d[A-Z]{2}/i.test(lastPart)) {
        location.postcode = lastPart.toUpperCase();
      } else if (addressParts.length > 2) {
        location.town = addressParts[addressParts.length - 2];
      }
    }

    return location;
  }

  private parseContact(raw: NICourtRaw): CourtContact | undefined {
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

  getMapper() {
    return {
      map: (raw: NICourtRaw) => this.mapSingleCourt(raw)
    };
  }
}

// CLI execution - commented out for Jest compatibility
// if (import.meta.url === `file://${process.argv[1]}`) {
//   const parser = new NICourtsParser();
//   parser.parse()
//     .then(courts => {
//       console.log(`Fetched ${courts.length} NI courts`);
//       console.log(JSON.stringify(courts, null, 2));
//     })
//     .catch(error => {
//       console.error('Error:', error.message);
//       process.exit(1);
//     });
// }