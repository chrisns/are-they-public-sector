/**
 * Parser for Scottish Courts data
 */

// import axios from 'axios'; // Not needed currently, no API available
import type { ScottishCourtRaw, Court, CourtLocation, CourtContact, CourtType } from '../models/court.js';
import { CourtStatus, Jurisdiction } from '../models/court.js';

export class ScottishCourtsParser {
  private lastError?: string;

  async parse(): Promise<ScottishCourtRaw[]> {
    return await this.fetchData();
  }

  private async fetchData(): Promise<ScottishCourtRaw[]> {
    // No API is available for Scottish courts data
    // This would need to be implemented when a data source becomes available
    throw new Error('No live data source available for Scottish courts');
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