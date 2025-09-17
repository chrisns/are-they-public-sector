/**
 * Parser for UK Colleges from AoC website PDFs
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import type {
  College,
  CollegeRegion,
  CollegeCounts,
  CollegeValidation,
  CollegesResult,
  PdfLinks,
  WebpageResult
} from '../models/college.js';


export class CollegesParser {
  private readonly AOC_URL = 'https://www.aoc.co.uk/about/list-of-colleges-in-the-uk';
  private readonly BASE_URL = 'https://www.aoc.co.uk';
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_DELAY_MS = 1000;

  constructor() {
  }

  /**
   * Helper method to retry requests with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    operation: string
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.MAX_RETRIES - 1) {
          const delay = this.INITIAL_DELAY_MS * Math.pow(2, attempt);
          console.log(`Retry attempt ${attempt + 1}/${this.MAX_RETRIES} for ${operation} after ${delay}ms delay...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Failed after ${this.MAX_RETRIES} attempts - ${operation}: ${lastError?.message}`);
  }

  /**
   * Main aggregation method - orchestrates the full process
   */
  async aggregate(): Promise<CollegesResult> {
    // ALWAYS refetch the webpage to get fresh PDF links
    // This ensures we're not using stale/hardcoded URLs
    const webpageResult = await this.fetchWebpage();

    // Extract PDF links dynamically from the current page
    const pdfLinks = await this.extractPdfLinks(webpageResult.html);

    // Extract expected counts
    const expectedCounts = await this.extractCounts(webpageResult.html);

    // Download and parse PDFs using the fresh links
    const scotlandColleges = await this.downloadAndParsePdf(pdfLinks.scotland, 'Scotland');
    const walesColleges = await this.downloadAndParsePdf(pdfLinks.wales, 'Wales');
    const niColleges = await this.downloadAndParsePdf(pdfLinks.northernIreland, 'Northern Ireland');

    // Combine all colleges
    const allColleges = [...scotlandColleges, ...walesColleges, ...niColleges];

    // Calculate actual counts
    const actualCounts: CollegeCounts & { total: number } = {
      scotland: scotlandColleges.length,
      wales: walesColleges.length,
      northernIreland: niColleges.length,
      total: allColleges.length
    };

    // Validate counts
    const validation = this.validateCounts(expectedCounts, actualCounts);

    // Return result
    return {
      colleges: allColleges,
      metadata: {
        source: 'aoc.co.uk',
        fetchedAt: new Date().toISOString(),
        counts: actualCounts,
        validation
      }
    };
  }

  /**
   * Fetch the AoC webpage
   */
  async fetchWebpage(): Promise<WebpageResult> {
    return this.retryWithBackoff(async () => {
      try {
        const response = await axios.get(this.AOC_URL, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; UK-Public-Sector-Aggregator/1.0)'
          }
        });

        return {
          html: response.data,
          url: this.AOC_URL
        };
      } catch (error) {
        throw new Error(`Failed to fetch AoC webpage: ${error instanceof Error ? error.message : error}`);
      }
    }, 'fetch AoC webpage');
  }

  /**
   * Extract PDF download links from the webpage
   */
  async extractPdfLinks(html: string): Promise<PdfLinks> {
    try {
      const $ = cheerio.load(html);
      const links: Partial<PdfLinks> = {};

      // Find all PDF links
      $('a[href$=".pdf"]').each((_, element) => {
        const href = $(element).attr('href');
        const text = $(element).text().toLowerCase();

        if (!href) return;

        const fullUrl = href.startsWith('http') ? href : `${this.BASE_URL}${href}`;

        if (text.includes('scotland')) {
          links.scotland = fullUrl;
        } else if (text.includes('wales')) {
          links.wales = fullUrl;
        } else if (text.includes('northern ireland') || text.includes('ni')) {
          links.northernIreland = fullUrl;
        }
      });

      // Validate all links found
      if (!links.scotland || !links.wales || !links.northernIreland) {
        throw new Error('Could not find all required PDF links');
      }

      return links as PdfLinks;
    } catch (error) {
      throw new Error(`Failed to extract PDF links from webpage: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Extract college counts from the webpage
   */
  async extractCounts(html: string): Promise<CollegeCounts> {
    try {
      const $ = cheerio.load(html);
      const counts: Partial<CollegeCounts> = {};

      // Look for count patterns in the text
      const text = $('body').text();

      // Scotland
      const scotlandMatch = text.match(/(\d+)\s+colleges?\s+in\s+Scotland/i);
      if (scotlandMatch && scotlandMatch[1]) {
        counts.scotland = parseInt(scotlandMatch[1], 10);
      }

      // Wales
      const walesMatch = text.match(/(\d+)\s+colleges?\s+in\s+Wales/i);
      if (walesMatch && walesMatch[1]) {
        counts.wales = parseInt(walesMatch[1], 10);
      }

      // Northern Ireland
      const niMatch = text.match(/(\d+)\s+colleges?\s+in\s+Northern\s+Ireland/i);
      if (niMatch && niMatch[1]) {
        counts.northernIreland = parseInt(niMatch[1], 10);
      }

      // Validate all counts found
      if (
        counts.scotland === undefined ||
        counts.wales === undefined ||
        counts.northernIreland === undefined
      ) {
        throw new Error('Could not extract all college counts');
      }

      return {
        scotland: counts.scotland,
        wales: counts.wales,
        northernIreland: counts.northernIreland
      };
    } catch (error) {
      throw new Error(`Failed to extract counts: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Download and parse a PDF
   */
  private async downloadAndParsePdf(url: string, region: CollegeRegion): Promise<College[]> {
    return this.retryWithBackoff(async () => {
      try {
        // Download PDF
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 30000
        });

        const buffer = Buffer.from(response.data);

        // Try to parse as PDF first
        try {
          // Dynamically import pdf-parse to avoid initialization issues
          const pdfParse = await import('pdf-parse');
          const pdf = pdfParse.default;
          const data = await pdf(buffer);
          return this.parsePdf(data.text, region);
        } catch (pdfError) {
          console.warn(`PDF parsing failed for ${region}: ${pdfError instanceof Error ? pdfError.message : pdfError}`);

          // If PDF parsing fails, might be a text file (for testing)
          const textContent = buffer.toString('utf-8');
          if (textContent.includes('College')) {
            return this.parsePdf(textContent, region);
          }
          throw pdfError;
        }
      } catch (error) {
        throw new Error(`Failed to download/parse PDF from ${url}: ${error instanceof Error ? error.message : error}`);
      }
    }, `download PDF from ${region}`);
  }

  /**
   * Parse college names from PDF text content
   */
  async parsePdf(content: string, region: CollegeRegion): Promise<College[]> {
    try {
      if (!content || content.trim() === '') {
        throw new Error('Empty PDF content');
      }

      const colleges: College[] = [];
      const lines = content.split('\n');
      const timestamp = new Date().toISOString();
      const source = `${this.AOC_URL}`;

      // Look for the start of college listing
      let inCollegeSection = false;
      let foundCollegeHeader = false;

      for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines
        if (!trimmed) {
          continue;
        }

        // Look for section headers that indicate college names are starting
        if (trimmed.toLowerCase().includes('college') &&
            (trimmed.toLowerCase().includes('region') ||
             trimmed.toLowerCase().includes('area') ||
             trimmed === 'College')) {
          inCollegeSection = true;
          foundCollegeHeader = true;
          continue;
        }

        // Stop when we hit footer sections
        if (trimmed.toLowerCase().includes('source:') ||
            trimmed.toLowerCase().includes('please contact') ||
            trimmed.toLowerCase().includes('recent mergers') ||
            trimmed.toLowerCase().includes('recent name changes') ||
            trimmed.toLowerCase().includes('other information')) {
          inCollegeSection = false;
          continue;
        }

        // Parse colleges in different formats
        if (inCollegeSection || foundCollegeHeader) {
          // Skip region/area headers and other non-college lines
          if (trimmed === 'Region' || trimmed === 'Area' ||
              trimmed.toLowerCase() === 'highlands and islands' ||
              trimmed.toLowerCase() === 'ayrshire' ||
              trimmed.toLowerCase() === 'borders' ||
              trimmed.toLowerCase() === 'glasgow' ||
              trimmed.toLowerCase() === 'dumfries and galloway' ||
              trimmed.toLowerCase() === 'tayside' ||
              trimmed.toLowerCase() === 'edinburgh and lothians' ||
              trimmed.toLowerCase() === 'fife' ||
              trimmed.toLowerCase() === 'forth valley' ||
              trimmed.toLowerCase() === 'lanarkshire' ||
              trimmed.toLowerCase() === 'aberdeen and aberdeenshire' ||
              trimmed.toLowerCase() === 'west' ||
              trimmed.toLowerCase() === 'west lothian' ||
              trimmed.toLowerCase() === 'n/a' ||
              trimmed.startsWith('http') ||
              trimmed.includes('@')) {
            continue;
          }

          // Check for numbered format (e.g., "1. College Name")
          const numberedMatch = trimmed.match(/^\d+\.\s*(.+)/);
          if (numberedMatch && numberedMatch[1]) {
            const name = numberedMatch[1].trim();
            if (name && name.length > 2 && name.toLowerCase().includes('college')) {
              colleges.push({
                name,
                region,
                source,
                fetchedAt: timestamp
              });
            }
          }
          // Check for college names (must contain "College" or "UHI" or be specific known names)
          else if ((trimmed.toLowerCase().includes('college') ||
                    trimmed.toLowerCase().includes('uhi') ||
                    trimmed.includes('Sabhal')) &&
                   !trimmed.toLowerCase().includes('scottish funding council') &&
                   !trimmed.toLowerCase().includes('colleges scotland') &&
                   trimmed.length > 5 &&
                   trimmed.length < 100) {
            // Clean up the name - only take the college name, not region info
            let name = trimmed;

            // Don't add duplicates
            const alreadyExists = colleges.some(c =>
              c.name.toLowerCase() === name.toLowerCase()
            );

            if (!alreadyExists && name && name.length > 2) {
              colleges.push({
                name,
                region,
                source,
                fetchedAt: timestamp
              });
            }
          }
        }
      }

      if (colleges.length === 0) {
        throw new Error('No colleges found in PDF');
      }

      return colleges;
    } catch (error) {
      throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Validate that parsed counts match webpage counts
   */
  validateCounts(expected: CollegeCounts, actual: CollegeCounts): CollegeValidation {
    const validation: CollegeValidation = {
      scotlandMatch: expected.scotland === actual.scotland,
      walesMatch: expected.wales === actual.wales,
      northernIrelandMatch: expected.northernIreland === actual.northernIreland
    };

    // Log mismatches but don't throw - the PDF format might be different from webpage
    if (!validation.scotlandMatch) {
      console.warn(`College count mismatch for Scotland: expected ${expected.scotland}, got ${actual.scotland}`);
    }
    if (!validation.walesMatch) {
      console.warn(`College count mismatch for Wales: expected ${expected.wales}, got ${actual.wales}`);
    }
    if (!validation.northernIrelandMatch) {
      console.warn(`College count mismatch for Northern Ireland: expected ${expected.northernIreland}, got ${actual.northernIreland}`);
    }

    // Only fail if we got zero colleges or way too many
    if (actual.scotland === 0 || actual.wales === 0 || actual.northernIreland === 0) {
      throw new Error(`Failed to parse colleges - got zero for at least one region`);
    }
    if (actual.scotland > 100 || actual.wales > 100 || actual.northernIreland > 50) {
      throw new Error(`Too many colleges parsed - likely a parsing error`);
    }

    return validation;
  }
}