/**
 * Parser for Scottish Courts data with fallback support
 */

// import axios from 'axios'; // Not needed currently, using fallback data
import type { ScottishCourtRaw, Court, CourtLocation, CourtContact, CourtType } from '../models/court.js';
import { CourtStatus, Jurisdiction } from '../models/court.js';

export class ScottishCourtsParser {
  private lastError?: string;

  async parse(): Promise<ScottishCourtRaw[]> {
    try {
      return await this.fetchData();
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      console.warn('Using fallback data for Scottish courts:', error.message);
      return this.getFallbackData();
    }
  }

  private async fetchData(): Promise<ScottishCourtRaw[]> {
    // Currently no API is available, so we'll use fallback data
    // This method is here for future API integration
    throw new Error('API unavailable - using fallback');
  }

  getFallbackData(): ScottishCourtRaw[] {
    // Comprehensive list of Scottish courts based on official data
    return [
      // Sheriff Courts
      { name: 'Edinburgh Sheriff Court', type: 'Sheriff Court', location: { town: 'Edinburgh', postcode: 'EH1 1LB' } },
      { name: 'Glasgow Sheriff Court', type: 'Sheriff Court', location: { town: 'Glasgow', postcode: 'G2 1QX' } },
      { name: 'Aberdeen Sheriff Court', type: 'Sheriff Court', location: { town: 'Aberdeen', postcode: 'AB10 1WP' } },
      { name: 'Dundee Sheriff Court', type: 'Sheriff Court', location: { town: 'Dundee', postcode: 'DD1 1NJ' } },
      { name: 'Paisley Sheriff Court', type: 'Sheriff Court', location: { town: 'Paisley', postcode: 'PA1 1UN' } },
      { name: 'Airdrie Sheriff Court', type: 'Sheriff Court', location: { town: 'Airdrie', postcode: 'ML6 6LN' } },
      { name: 'Hamilton Sheriff Court', type: 'Sheriff Court', location: { town: 'Hamilton', postcode: 'ML3 6AA' } },
      { name: 'Kilmarnock Sheriff Court', type: 'Sheriff Court', location: { town: 'Kilmarnock', postcode: 'KA1 1ED' } },
      { name: 'Ayr Sheriff Court', type: 'Sheriff Court', location: { town: 'Ayr', postcode: 'KA7 1DR' } },
      { name: 'Dumbarton Sheriff Court', type: 'Sheriff Court', location: { town: 'Dumbarton', postcode: 'G82 1QB' } },
      { name: 'Greenock Sheriff Court', type: 'Sheriff Court', location: { town: 'Greenock', postcode: 'PA15 1TR' } },
      { name: 'Dunfermline Sheriff Court', type: 'Sheriff Court', location: { town: 'Dunfermline', postcode: 'KY12 7RT' } },
      { name: 'Kirkcaldy Sheriff Court', type: 'Sheriff Court', location: { town: 'Kirkcaldy', postcode: 'KY1 1XQ' } },
      { name: 'Falkirk Sheriff Court', type: 'Sheriff Court', location: { town: 'Falkirk', postcode: 'FK1 1AD' } },
      { name: 'Stirling Sheriff Court', type: 'Sheriff Court', location: { town: 'Stirling', postcode: 'FK8 1JA' } },
      { name: 'Alloa Sheriff Court', type: 'Sheriff Court', location: { town: 'Alloa', postcode: 'FK10 1HR' } },
      { name: 'Perth Sheriff Court', type: 'Sheriff Court', location: { town: 'Perth', postcode: 'PH2 8NL' } },
      { name: 'Forfar Sheriff Court', type: 'Sheriff Court', location: { town: 'Forfar', postcode: 'DD8 1BX' } },
      { name: 'Inverness Sheriff Court', type: 'Sheriff Court', location: { town: 'Inverness', postcode: 'IV1 1QY' } },
      { name: 'Fort William Sheriff Court', type: 'Sheriff Court', location: { town: 'Fort William', postcode: 'PH33 6EE' } },
      { name: 'Wick Sheriff Court', type: 'Sheriff Court', location: { town: 'Wick', postcode: 'KW1 4AJ' } },
      { name: 'Kirkwall Sheriff Court', type: 'Sheriff Court', location: { town: 'Kirkwall', postcode: 'KW15 1PD' } },
      { name: 'Lerwick Sheriff Court', type: 'Sheriff Court', location: { town: 'Lerwick', postcode: 'ZE1 0HJ' } },
      { name: 'Lochmaddy Sheriff Court', type: 'Sheriff Court', location: { town: 'Lochmaddy', postcode: 'HS6 5AE' } },
      { name: 'Stornoway Sheriff Court', type: 'Sheriff Court', location: { town: 'Stornoway', postcode: 'HS1 2RF' } },
      { name: 'Portree Sheriff Court', type: 'Sheriff Court', location: { town: 'Portree', postcode: 'IV51 9EH' } },
      { name: 'Tain Sheriff Court', type: 'Sheriff Court', location: { town: 'Tain', postcode: 'IV19 1AA' } },
      { name: 'Dornoch Sheriff Court', type: 'Sheriff Court', location: { town: 'Dornoch', postcode: 'IV25 3SD' } },
      { name: 'Elgin Sheriff Court', type: 'Sheriff Court', location: { town: 'Elgin', postcode: 'IV30 1BU' } },
      { name: 'Banff Sheriff Court', type: 'Sheriff Court', location: { town: 'Banff', postcode: 'AB45 1AU' } },
      { name: 'Peterhead Sheriff Court', type: 'Sheriff Court', location: { town: 'Peterhead', postcode: 'AB42 1XB' } },
      { name: 'Dumfries Sheriff Court', type: 'Sheriff Court', location: { town: 'Dumfries', postcode: 'DG1 2AN' } },
      { name: 'Stranraer Sheriff Court', type: 'Sheriff Court', location: { town: 'Stranraer', postcode: 'DG9 7AA' } },
      { name: 'Jedburgh Sheriff Court', type: 'Sheriff Court', location: { town: 'Jedburgh', postcode: 'TD8 6AP' } },
      { name: 'Selkirk Sheriff Court', type: 'Sheriff Court', location: { town: 'Selkirk', postcode: 'TD7 4LE' } },
      { name: 'Livingston Sheriff Court', type: 'Sheriff Court', location: { town: 'Livingston', postcode: 'EH54 6FF' } },
      { name: 'Lanark Sheriff Court', type: 'Sheriff Court', location: { town: 'Lanark', postcode: 'ML11 7JT' } },
      { name: 'Oban Sheriff Court', type: 'Sheriff Court', location: { town: 'Oban', postcode: 'PA34 4AL' } },
      { name: 'Campbeltown Sheriff Court', type: 'Sheriff Court', location: { town: 'Campbeltown', postcode: 'PA28 6AN' } },
      { name: 'Dunoon Sheriff Court', type: 'Sheriff Court', location: { town: 'Dunoon', postcode: 'PA23 8BQ' } },

      // Justice of the Peace Courts
      { name: 'Edinburgh Justice of the Peace Court', type: 'Justice of the Peace Court', location: { town: 'Edinburgh' } },
      { name: 'Glasgow Justice of the Peace Court', type: 'Justice of the Peace Court', location: { town: 'Glasgow' } },
      { name: 'Aberdeen Justice of the Peace Court', type: 'Justice of the Peace Court', location: { town: 'Aberdeen' } },
      { name: 'Dundee Justice of the Peace Court', type: 'Justice of the Peace Court', location: { town: 'Dundee' } },

      // Superior Courts
      { name: 'Court of Session', type: 'Court of Session', location: { town: 'Edinburgh', postcode: 'EH1 1RQ' } },
      { name: 'High Court of Justiciary', type: 'High Court of Justiciary', location: { town: 'Edinburgh', postcode: 'EH1 1RQ' } },
      { name: 'High Court of Justiciary Glasgow', type: 'High Court of Justiciary', location: { town: 'Glasgow', postcode: 'G2 1QX' } },
      { name: 'High Court of Justiciary Aberdeen', type: 'High Court of Justiciary', location: { town: 'Aberdeen', postcode: 'AB10 1WP' } },

      // Appeal Court
      { name: 'Scottish Court of Appeal', type: 'Court of Appeal', location: { town: 'Edinburgh', postcode: 'EH1 1RQ' } }
    ];
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
      status: CourtStatus.ACTIVE, // Assume active for fallback data
      location,
      contact,
      sourceSystem: this.lastError ? 'Scottish Courts Fallback' : 'Scottish Courts API',
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
//         console.warn('Note: Using fallback data');
//       }
//       console.log(JSON.stringify(courts.slice(0, 3), null, 2));
//     })
//     .catch(error => {
//       console.error('Error:', error.message);
//       process.exit(1);
//     });
// }