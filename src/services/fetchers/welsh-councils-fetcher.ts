/**
 * Welsh Community Councils Fetcher Service
 * Fetches Welsh community council data from Wikipedia
 * Source: https://en.wikipedia.org/wiki/List_of_communities_in_Wales
 */

import axios from 'axios';
import type { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';

/**
 * Raw Welsh community council data from Wikipedia
 */
export interface WelshCommunityRaw {
  name: string;
  principalArea: string;
  population?: number;
  website?: string;
  notes?: string;
}

/**
 * Configuration for the Welsh councils fetcher
 */
export interface WelshCouncilsFetcherConfig {
  url?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  userAgent?: string;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<WelshCouncilsFetcherConfig> = {
  url: 'https://en.wikipedia.org/wiki/List_of_communities_in_Wales',
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  userAgent: 'UK-Public-Sector-Aggregator/1.0'
};

/**
 * Welsh Community Councils Fetcher Service
 * Fetches community council data from Wikipedia with retry logic and proper error handling
 */
export class WelshCouncilsFetcher {
  private config: Required<WelshCouncilsFetcherConfig>;
  private axiosInstance: AxiosInstance;

  constructor(config: WelshCouncilsFetcherConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Create axios instance with default configuration
    this.axiosInstance = axios.create({
      timeout: this.config.timeout,
      headers: {
        'User-Agent': this.config.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      }
    });
  }

  /**
   * Fetch Welsh community councils from Wikipedia
   * @returns Array of raw Welsh community council data
   * @throws Error if fetch fails or no data found
   */
  async fetch(): Promise<WelshCommunityRaw[]> {
    const url = this.config.url;

    try {
      console.log(`Fetching Welsh community councils from: ${url}`);

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(url)
      );

      const councils = this.parseWikipediaHtml(response.data);

      // Validate minimum expected count
      if (councils.length < 400) {
        throw new Error(`Only found ${councils.length} Welsh community councils, expected at least 400`);
      }

      console.log(`Welsh Councils: Successfully fetched ${councils.length} community councils`);
      return councils;

    } catch (error) {
      const message = this.formatError(error);
      throw new Error(`Failed to fetch Welsh community councils: ${message}`);
    }
  }

  /**
   * Parse Wikipedia HTML to extract Welsh community councils
   * @param html Raw HTML from Wikipedia page
   * @returns Array of parsed Welsh community councils
   */
  private parseWikipediaHtml(html: string): WelshCommunityRaw[] {
    const $ = cheerio.load(html);
    const councils: WelshCommunityRaw[] = [];

    // Find all sections for principal areas
    // The page is organized with h3 headings for each principal area
    $('h3').each((_, element) => {
      const $heading = $(element);
      const headingText = $heading.text().trim();

      // Skip non-principal area headings
      if (!headingText || headingText.includes('See also') || headingText.includes('References') ||
          headingText.includes('External links') || headingText.includes('Notes')) {
        return;
      }

      // Extract principal area name (remove edit links and brackets)
      const principalArea = headingText.replace(/\[edit\]/g, '').trim();

      // Find the next content section (usually a div or ul)
      let $nextElement = $heading.next();

      // Sometimes the content is in a sibling element, so we need to look ahead
      while ($nextElement.length && !$nextElement.is('ul, ol, div, p') && !$nextElement.is('h2, h3, h4')) {
        $nextElement = $nextElement.next();
      }

      // Process lists and text content
      if ($nextElement.is('ul, ol')) {
        // Process list items
        $nextElement.find('li').each((_, li) => {
          const $li = $(li);
          const communityData = this.parseCommunityEntry($li, principalArea);
          if (communityData) {
            councils.push(communityData);
          }
        });
      } else if ($nextElement.is('div, p')) {
        // Some sections might have communities listed in paragraphs or divs
        // Look for nested lists or comma-separated communities
        $nextElement.find('ul, ol').each((_, list) => {
          $(list).find('li').each((_, li) => {
            const $li = $(li);
            const communityData = this.parseCommunityEntry($li, principalArea);
            if (communityData) {
              councils.push(communityData);
            }
          });
        });

        // Also check for text-based listings
        const text = $nextElement.text();
        if (text && !text.includes('main article') && text.length > 10) {
          // Split by common delimiters and process each potential community
          const potentialCommunities = text.split(/[,;]|\sand\s|\sor\s/).map(s => s.trim());
          potentialCommunities.forEach(name => {
            if (name && name.length > 2 && !name.includes('See') && !name.includes('main article')) {
              councils.push({
                name: this.cleanCommunityName(name),
                principalArea
              });
            }
          });
        }
      }
    });

    // Also check for any standalone lists that might contain communities
    $('ul').each((_, ul) => {
      const $ul = $(ul);
      // Skip navigation and reference lists
      if ($ul.closest('.navbox, .references, .reflist, .toc').length) {
        return;
      }

      // Check if this list might contain communities
      const firstItem = $ul.find('li').first().text();
      if (firstItem && this.looksLikeCommunityName(firstItem)) {
        // Try to determine the principal area from context
        const $precedingHeading = $ul.prevAll('h3, h2').first();
        const principalArea = $precedingHeading.length ?
          $precedingHeading.text().replace(/\[edit\]/g, '').trim() :
          'Unknown';

        $ul.find('li').each((_, li) => {
          const $li = $(li);
          const communityData = this.parseCommunityEntry($li, principalArea);
          if (communityData && !councils.some(c => c.name === communityData.name && c.principalArea === communityData.principalArea)) {
            councils.push(communityData);
          }
        });
      }
    });

    return councils;
  }

  /**
   * Parse a single community entry from a list item
   * @param $li Cheerio element for list item
   * @param principalArea The principal area this community belongs to
   * @returns Parsed community data or null if invalid
   */
  private parseCommunityEntry($li: cheerio.Cheerio<cheerio.Element>, principalArea: string): WelshCommunityRaw | null {
    const fullText = $li.text().trim();
    if (!fullText || fullText.length < 2) {
      return null;
    }

    // Extract community name (first link or main text)
    const $firstLink = $li.find('a').first();
    let name = $firstLink.length ? $firstLink.text().trim() : fullText.split(',')[0].trim();

    // Clean up the name
    name = this.cleanCommunityName(name);

    if (!name || !this.looksLikeCommunityName(name)) {
      return null;
    }

    // Extract additional information if available
    const website = $li.find('a[href^="http"]').attr('href');

    // Look for population data in parentheses
    const populationMatch = fullText.match(/\((\d{1,3}(?:,\d{3})*)\)/);
    const population = populationMatch ? parseInt(populationMatch[1].replace(/,/g, ''), 10) : undefined;

    // Extract notes (anything after the main name and population)
    let notes: string | undefined;
    const textParts = fullText.split(/\([^)]*\)/); // Remove parenthetical content
    if (textParts.length > 1) {
      notes = textParts.slice(1).join(' ').trim();
      if (notes.length < 3) {
        notes = undefined;
      }
    }

    return {
      name,
      principalArea,
      population,
      website,
      notes
    };
  }

  /**
   * Clean and normalize community name
   * @param name Raw community name
   * @returns Cleaned community name
   */
  private cleanCommunityName(name: string): string {
    return name
      .replace(/\[edit\]/g, '') // Remove Wikipedia edit links
      .replace(/^\d+\.\s*/, '') // Remove numbering
      .replace(/^[•·]\s*/, '') // Remove bullet points
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Check if a string looks like a valid community name
   * @param name Potential community name
   * @returns True if it looks like a community name
   */
  private looksLikeCommunityName(name: string): boolean {
    if (!name || name.length < 2) {
      return false;
    }

    // Exclude common non-community text
    const excludePatterns = [
      /^(see|main|article|list|category|template|portal)/i,
      /^(edit|source|view|history)/i,
      /^(external|links|references|notes)/i,
      /^\d+\s*(references?|notes?|links?)/i,
      /^(this|that|these|those|the|a|an)/i
    ];

    return !excludePatterns.some(pattern => pattern.test(name));
  }

  /**
   * Retry a request with exponential backoff
   * @param requestFn Function that returns a promise for the request
   * @returns Response from the successful request
   */
  private async retryRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;

        // Don't retry on 4xx errors (except 429)
        if (axios.isAxiosError(error) && error.response?.status >= 400 &&
            error.response?.status < 500 && error.response?.status !== 429) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < this.config.maxRetries - 1) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          await this.sleep(delay);
          console.log(`Welsh Councils: Retrying after ${delay}ms... (attempt ${attempt + 1}/${this.config.maxRetries})`);
        }
      }
    }

    throw lastError;
  }

  /**
   * Sleep for specified milliseconds
   * @param ms Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Format error message from various error types
   * @param error Error object
   * @returns Formatted error message
   */
  private formatError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        return `HTTP ${error.response.status}: ${error.response.statusText}`;
      } else if (error.request) {
        return 'No response received from server';
      } else {
        return error.message;
      }
    }

    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}

/**
 * Create a default Welsh councils fetcher instance
 */
export const createWelshCouncilsFetcher = (config?: WelshCouncilsFetcherConfig): WelshCouncilsFetcher => {
  return new WelshCouncilsFetcher(config);
};