/**
 * Parser for English and Welsh Courts CSV data
 */

import axios from 'axios';
import { parse } from 'csv-parse/sync';
import type { EnglishCourtRaw, Court, CourtLocation, CourtContact, CourtType } from '../models/court.js';
import { CourtStatus, Jurisdiction } from '../models/court.js';

export class EnglishCourtsParser {
  private readonly csvUrl = 'https://factprod.blob.core.windows.net/csv/courts-and-tribunals-data.csv';

  async parse(): Promise<EnglishCourtRaw[]> {
    const csv = await this.fetchCSV();
    return this.parseCSV(csv);
  }

  private async fetchCSV(): Promise<string> {
    try {
      const response = await axios.get(this.csvUrl, {
        timeout: 30000,
        headers: {
          'Accept': 'text/csv,application/csv,text/plain'
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch CSV: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private parseCSV(csv: string): EnglishCourtRaw[] {
    try {
      const records = parse(csv, {
        columns: true,
        skip_empty_lines: true,
        relaxColumnCount: true,
        relaxQuotes: true
      });

      if (!Array.isArray(records) || records.length === 0) {
        throw new Error('Invalid CSV format: no data found');
      }

      return records as EnglishCourtRaw[];
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid CSV')) {
        throw error;
      }
      throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  mapToCourtModel(rawCourts: EnglishCourtRaw[]): Court[] {
    return rawCourts.map(raw => this.mapSingleCourt(raw));
  }

  private mapSingleCourt(raw: EnglishCourtRaw): Court {
    const types = this.parseCourtTypes(raw.types || raw.court_types);
    const location = this.parseLocation(raw);
    const contact = this.parseContact(raw);
    const areasOfLaw = this.parseJsonArray(raw.areas_of_law);

    return {
      name: raw.name,
      slug: raw.slug,
      identifier: raw.magistrate_code || raw.crown_location_code || raw.county_location_code,
      type: types,
      jurisdiction: Jurisdiction.ENGLAND_WALES,
      status: this.parseStatus(raw.open),
      location,
      contact,
      areasOfLaw,
      sourceSystem: 'English Courts CSV',
      lastUpdated: new Date().toISOString()
    };
  }

  private parseCourtTypes(typesJson?: string): CourtType[] {
    if (!typesJson) return [];

    try {
      const parsed = JSON.parse(typesJson);
      if (!Array.isArray(parsed)) return [];

      return parsed.map(type => {
        const normalizedType = type.toLowerCase().trim();
        if (normalizedType.includes('crown')) return 'Crown Court' as CourtType;
        if (normalizedType.includes('magistrates')) return "Magistrates' Court" as CourtType;
        if (normalizedType.includes('county')) return 'County Court' as CourtType;
        if (normalizedType.includes('family')) return 'Family Court' as CourtType;
        if (normalizedType.includes('tribunal')) return 'Tribunal' as CourtType;
        if (normalizedType.includes('employment')) return 'Employment Tribunal' as CourtType;
        if (normalizedType.includes('immigration')) return 'Immigration Tribunal' as CourtType;
        if (normalizedType.includes('tax')) return 'Tax Tribunal' as CourtType;
        if (normalizedType.includes('high court')) return 'High Court' as CourtType;
        if (normalizedType.includes('court of appeal')) return 'Court of Appeal' as CourtType;
        if (normalizedType.includes('supreme')) return 'Supreme Court' as CourtType;
        return 'Other' as CourtType;
      });
    } catch {
      return [];
    }
  }

  private parseStatus(openField?: string): CourtStatus {
    if (!openField) return CourtStatus.UNKNOWN;
    return openField.toLowerCase() === 'true' ? CourtStatus.ACTIVE : CourtStatus.INACTIVE;
  }

  private parseLocation(raw: EnglishCourtRaw): CourtLocation | undefined {
    const addresses = this.parseJsonArray(raw.addresses);
    const primaryAddress = addresses.find((addr: Record<string, string>) => addr.type === 'primary' || addr.type === 'visit') || addresses[0];

    if (!primaryAddress && !raw.lat && !raw.postcode) {
      return undefined;
    }

    const location: CourtLocation = {
      country: 'United Kingdom'
    };

    if (primaryAddress) {
      if (primaryAddress.address) {
        const lines = primaryAddress.address.split(',').map((s: string) => s.trim()).filter(Boolean);
        location.addressLines = lines.slice(0, -1); // All but postcode
        const lastLine = lines[lines.length - 1];
        if (lastLine && /[A-Z]{1,2}[0-9]{1,2}/.test(lastLine)) {
          location.postcode = lastLine;
        }
      }
      if (primaryAddress.town) location.town = primaryAddress.town;
      if (primaryAddress.county) location.county = primaryAddress.county;
      if (primaryAddress.postcode) location.postcode = primaryAddress.postcode;
    }

    if (raw.postcode && !location.postcode) {
      location.postcode = raw.postcode;
    }

    if (raw.lat && raw.lon) {
      location.latitude = parseFloat(raw.lat);
      location.longitude = parseFloat(raw.lon);
    }

    return location;
  }

  private parseContact(raw: EnglishCourtRaw): CourtContact | undefined {
    const emails = this.parseJsonArray(raw.emails);
    const dxNumbers = this.parseJsonArray(raw.dxNumbers);

    if (!emails.length && !dxNumbers.length) {
      return undefined;
    }

    const contact: CourtContact = {};

    if (emails.length > 0) {
      contact.email = emails[0].address || emails[0];
    }

    if (dxNumbers.length > 0) {
      contact.dxNumber = dxNumbers[0];
    }

    return Object.keys(contact).length > 0 ? contact : undefined;
  }

  private parseJsonArray(jsonString?: string): Record<string, string>[] {
    if (!jsonString) return [];
    try {
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  getMapper() {
    return {
      map: (raw: EnglishCourtRaw) => this.mapSingleCourt(raw)
    };
  }
}

// CLI execution - commented out for Jest compatibility
// if (import.meta.url === `file://${process.argv[1]}`) {
//   const parser = new EnglishCourtsParser();
//   parser.parse()
//     .then(courts => {
//       console.log(`Fetched ${courts.length} English/Welsh courts`);
//       console.log(JSON.stringify(courts.slice(0, 3), null, 2));
//     })
//     .catch(error => {
//       console.error('Error:', error.message);
//       process.exit(1);
//     });
// }