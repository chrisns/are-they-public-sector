/**
 * Parser for Northern Ireland Schools data
 * Fetches school data from NI Education Department using two-phase HTTP request
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import * as XLSX from 'xlsx';

export interface NISchoolRaw {
  // Core identification
  schoolName: string;
  referenceNumber?: string;

  // Classification
  schoolType: string;  // "Primary", "Post-Primary", "Special", "Nursery"
  managementType?: string;  // "Controlled", "Voluntary", "Integrated", etc.

  // Location
  address1?: string;
  address2?: string;
  address3?: string;
  town?: string;
  postcode?: string;

  // Status
  status: string;  // "Open", "Closed", "Proposed"

  // Contact (if available)
  telephone?: string;
  email?: string;
  website?: string;

  // Additional metadata
  principalName?: string;
  enrolment?: number;
  ageRange?: string;
  ward?: string;
  constituency?: string;

  // Any additional fields from Excel
  [key: string]: string | number | undefined;
}

export class NISchoolsParser {
  private readonly baseUrl = 'https://apps.education-ni.gov.uk/appinstitutes/default.aspx';
  private readonly timeout = 30000; // 30 seconds
  private readonly expectedCount = 1122;
  private readonly tolerance = 0.1; // 10% tolerance

  async parse(): Promise<NISchoolRaw[]> {
    try {
      // Phase 1: Get initial page and extract tokens
      const html = await this.fetchPage();
      const tokens = await this.extractTokens(html);

      // Phase 2: Make export request with tokens
      const excelData = await this.fetchExcelData(tokens.viewState, tokens.eventValidation);

      // Phase 3: Parse Excel data
      const schools = await this.parseExcel(excelData);

      // Phase 4: Filter for open schools only
      const openSchools = schools.filter(school => school.status === 'Open');

      // Phase 5: Validate count
      this.validateCount(openSchools.length);

      return openSchools;
    } catch (error) {
      // Provide clear error messages
      const err = error as Error & { code?: string; message?: string };
      if (err.code === 'ECONNREFUSED') {
        throw new Error('Service unavailable: Unable to connect to NI Education Department');
      }
      if (err.message?.includes('ViewState')) {
        throw new Error('ViewState token not found - website structure may have changed');
      }
      if (err.message?.includes('format')) {
        throw new Error('Invalid Excel format - export format may have changed');
      }
      if (err.message?.includes('count')) {
        throw new Error(err.message);
      }
      throw error;
    }
  }

  private async fetchPage(): Promise<string> {
    const response = await axios.get(this.baseUrl, {
      timeout: this.timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    return response.data;
  }

  private async extractTokens(html: string): Promise<{ viewState: string; eventValidation: string }> {
    const $ = cheerio.load(html);

    const viewState = $('#__VIEWSTATE').val() as string;
    const eventValidation = $('#__EVENTVALIDATION').val() as string;

    if (!viewState) {
      throw new Error('ViewState token not found');
    }
    if (!eventValidation) {
      throw new Error('EventValidation token not found');
    }

    return { viewState, eventValidation };
  }


  private async fetchExcelData(viewState: string, eventValidation: string): Promise<Buffer> {
    const formData = new URLSearchParams({
      '__EVENTTARGET': 'ctl00$ContentPlaceHolder1$lvSchools$btnDoExport',
      '__VIEWSTATE': viewState,
      '__VIEWSTATEENCRYPTED': '',
      '__EVENTVALIDATION': eventValidation,
      'ctl00$ContentPlaceHolder1$instType': '-1',  // All types
      'ctl00$ContentPlaceHolder1$instStatus': '0',  // Open schools
      'ctl00$ContentPlaceHolder1$lvSchools$exportType': '2'  // Excel format
    });

    const response = await axios.post(this.baseUrl, formData, {
      timeout: this.timeout * 2,  // 60 seconds for download
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      responseType: 'arraybuffer'
    });

    const buffer = Buffer.from(response.data);
    if (buffer.length === 0) {
      throw new Error('Empty response received from export');
    }

    return buffer;
  }

  private async parseExcel(buffer: Buffer): Promise<NISchoolRaw[]> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (!jsonData || jsonData.length === 0) {
        throw new Error('No data found in Excel file');
      }

      // Map Excel columns to our interface
      return jsonData.map((row: Record<string, unknown>) => this.mapExcelRow(row));
    } catch (error) {
      throw new Error(`Failed to parse Excel format: ${error}`);
    }
  }

  private mapExcelRow(row: Record<string, unknown>): NISchoolRaw {
    // Map based on expected column headers
    // Column names may vary, so we try multiple possibilities
    const mappedRow: NISchoolRaw = {
      schoolName: this.cleanString(
        row['School Name'] ||
        row['Name'] ||
        row['Institution Name'] ||
        row['School']
      ) || '',

      referenceNumber: this.cleanString(
        row['Reference Number'] ||
        row['Ref No'] ||
        row['School Reference'] ||
        row['DE Reference']
      ),

      schoolType: this.cleanString(
        row['School Type'] ||
        row['Type'] ||
        row['Institution Type'] ||
        row['School Category']
      ) || 'Unknown',

      managementType: this.cleanString(
        row['Management Type'] ||
        row['Management'] ||
        row['School Management']
      ),

      address1: this.cleanString(
        row['Address 1'] ||
        row['Address Line 1'] ||
        row['Address1']
      ),

      address2: this.cleanString(
        row['Address 2'] ||
        row['Address Line 2'] ||
        row['Address2']
      ),

      address3: this.cleanString(
        row['Address 3'] ||
        row['Address Line 3'] ||
        row['Address3']
      ),

      town: this.cleanString(
        row['Town'] ||
        row['City'] ||
        row['Town/City']
      ),

      postcode: this.cleanString(
        row['Postcode'] ||
        row['Post Code'] ||
        row['Postal Code']
      ),

      status: this.cleanString(
        row['Status'] ||
        row['School Status'] ||
        row['Current Status']
      ) || 'Open',

      telephone: this.cleanString(
        row['Telephone'] ||
        row['Phone'] ||
        row['Contact Number']
      ),

      email: this.cleanString(
        row['Email'] ||
        row['Email Address'] ||
        row['Contact Email']
      ),

      website: this.cleanString(
        row['Website'] ||
        row['Web Address'] ||
        row['URL']
      ),

      principalName: this.cleanString(
        row['Principal'] ||
        row['Principal Name'] ||
        row['Head Teacher']
      ),

      enrolment: this.parseNumber(
        row['Enrolment'] ||
        row['Total Enrolment'] ||
        row['Pupils']
      ),

      ageRange: this.cleanString(
        row['Age Range'] ||
        row['Ages']
      ),

      ward: this.cleanString(
        row['Ward'] ||
        row['Electoral Ward']
      ),

      constituency: this.cleanString(
        row['Constituency'] ||
        row['Parliamentary Constituency']
      ),

    };

    // Preserve any additional fields
    Object.entries(row).forEach(([key, value]) => {
      if (key && !(key in mappedRow)) {
        mappedRow[key] = value as string | number | undefined;
      }
    });

    return mappedRow;
  }

  private cleanString(value: unknown): string | undefined {
    if (!value || value === 'N/A' || value === 'null' || value === 'NULL') {
      return undefined;
    }
    const str = String(value).trim();
    // Normalize multiple spaces to single space
    const normalized = str.replace(/\s+/g, ' ');
    return normalized || undefined;
  }

  private parseNumber(value: unknown): number | undefined {
    if (!value) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }

  private validateCount(count: number): void {
    const minCount = Math.floor(this.expectedCount * (1 - this.tolerance));
    const maxCount = Math.ceil(this.expectedCount * (1 + this.tolerance));

    if (count < minCount || count > maxCount) {
      throw new Error(
        `School count validation failed: Expected ~${this.expectedCount} schools (±${this.tolerance * 100}%), ` +
        `but found ${count}. Valid range is ${minCount}-${maxCount}.`
      );
    }
  }
}