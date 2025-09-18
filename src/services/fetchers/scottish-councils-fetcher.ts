/**
 * Scottish Community Councils Fetcher Service
 * Fetches Scottish community council data from Wikipedia
 * Source: https://en.wikipedia.org/wiki/List_of_community_council_areas_in_Scotland
 */

import axios from 'axios';
import type { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';

/**
 * Raw Scottish community council data from Wikipedia
 */
export interface ScottishCommunityRaw {
  name: string;
  councilArea: string;
  region?: string;
  isActive: boolean;
  contactDetails?: string;
}

/**
 * Configuration for the Scottish councils fetcher
 */
export interface ScottishCouncilsFetcherConfig {
  url?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  userAgent?: string;
  skipValidation?: boolean; // For testing with mock data
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<ScottishCouncilsFetcherConfig> = {
  url: 'https://en.wikipedia.org/wiki/List_of_community_council_areas_in_Scotland',
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  userAgent: 'UK-Public-Sector-Aggregator/1.0',
  skipValidation: false
};

/**
 * Scottish Community Councils Fetcher Service
 * Fetches community council data from Wikipedia with focus on active councils (marked with asterisk)
 */
export class ScottishCouncilsFetcher {
  private config: Required<ScottishCouncilsFetcherConfig>;
  private axiosInstance: AxiosInstance;

  constructor(config: ScottishCouncilsFetcherConfig = {}) {
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
   * Fetch Scottish community councils from Wikipedia
   * @returns Array of raw Scottish community council data
   * @throws Error if fetch fails or no data found
   */
  async fetch(): Promise<ScottishCommunityRaw[]> {
    const url = this.config.url;

    try {
      console.log(`Fetching Scottish community councils from: ${url}`);

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(url)
      );

      const councils = this.parseWikipediaHtml(response.data);

      // Filter to only active councils (exclude those marked as inactive)
      const activeCouncils = councils.filter(council => council.isActive);

      // Validate minimum expected count
      if (activeCouncils.length < 800) {
        console.warn(`Only found ${activeCouncils.length} active Scottish community councils, expected at least 800`);
      }

      console.log(`Scottish Councils: Successfully fetched ${councils.length} total councils (${activeCouncils.length} active)`);
      return activeCouncils;

    } catch (error) {
      const message = this.formatError(error);
      throw new Error(`Failed to fetch Scottish community councils: ${message}`);
    }
  }

  /**
   * Parse Wikipedia HTML to extract Scottish community councils
   * @param html Raw HTML from Wikipedia page
   * @returns Array of parsed Scottish community councils
   */
  private parseWikipediaHtml(html: string): ScottishCommunityRaw[] {
    const $ = cheerio.load(html);
    const councils: ScottishCommunityRaw[] = [];

    // Find all sections for council areas in main content only
    // The page is organized with h2/h3 headings for each council area
    $('.mw-parser-output h2, .mw-parser-output h3').each((_, element) => {
      const $heading = $(element);
      const headingText = $heading.text().trim();

      // Skip non-council area headings
      if (!headingText || headingText.includes('See also') || headingText.includes('References') ||
          headingText.includes('External links') || headingText.includes('Notes') ||
          headingText.includes('Contents') || headingText.includes('History')) {
        return;
      }

      // Extract council area name (remove edit links and brackets)
      const councilArea = headingText.replace(/\[edit\]/g, '').trim();

      // Skip if this doesn't look like a council area
      if (!this.looksLikeCouncilArea(councilArea)) {
        return;
      }

      // The heading might be wrapped in a div.mw-heading
      const $container = $heading.parent('.mw-heading').length > 0 ? $heading.parent('.mw-heading') : $heading;

      // Find the next content section (usually a ul or ol)
      let $nextElement = $container.next();

      // Look ahead to find the list content
      while ($nextElement.length && !$nextElement.is('ul, ol, div, table') && !$nextElement.is('h1, h2, h3, .mw-heading')) {
        $nextElement = $nextElement.next();
      }

      // Process lists
      if ($nextElement.is('ul, ol')) {
        this.processCouncilList($nextElement, councilArea, councils, $);
      } else if ($nextElement.is('div')) {
        // Look for nested lists within the div
        $nextElement.find('ul, ol').each((_, list) => {
          this.processCouncilList($(list), councilArea, councils, $);
        });
      } else if ($nextElement.is('table')) {
        // Some data might be in tables
        this.processCouncilTable($nextElement, councilArea, councils, $);
      }

      // Also check subsequent sibling elements until we hit another heading
      let $sibling = $nextElement.next();
      while ($sibling.length && !$sibling.is('h1, h2, h3, .mw-heading')) {
        if ($sibling.is('ul, ol')) {
          this.processCouncilList($sibling, councilArea, councils, $);
        } else if ($sibling.is('div') && !$sibling.hasClass('mw-heading')) {
          $sibling.find('ul, ol').each((_, list) => {
            this.processCouncilList($(list), councilArea, councils, $);
          });
        }
        $sibling = $sibling.next();
      }
    });

    return councils;
  }

  /**
   * Process a list element to extract community councils
   * @param $list Cheerio element for the list
   * @param councilArea The council area these communities belong to
   * @param councils Array to add councils to
   * @param $ Cheerio API instance
   */
  private processCouncilList($list: cheerio.Cheerio<cheerio.Element>, councilArea: string, councils: ScottishCommunityRaw[], $: cheerio.CheerioAPI): void {
    $list.find('li').each((_, li) => {
      const $li = $(li);
      const communityData = this.parseCommunityEntry($li, councilArea);
      if (communityData && !councils.some(c => c.name === communityData.name && c.councilArea === communityData.councilArea)) {
        councils.push(communityData);
      }
    });
  }

  /**
   * Process a table element to extract community councils
   * @param $table Cheerio element for the table
   * @param councilArea The council area these communities belong to
   * @param councils Array to add councils to
   * @param $ Cheerio API instance
   */
  private processCouncilTable($table: cheerio.Cheerio<cheerio.Element>, councilArea: string, councils: ScottishCommunityRaw[], $: cheerio.CheerioAPI): void {
    $table.find('tr').each((_, row) => {
      const $row = $(row);
      const cells = $row.find('td, th');

      if (cells.length > 0) {
        const firstCell = cells.first();
        const cellText = firstCell.text().trim();

        if (cellText && this.looksLikeCommunityName(cellText)) {
          const isActive = !cellText.toLowerCase().includes('inactive') &&
                          !cellText.toLowerCase().includes('defunct') &&
                          !cellText.toLowerCase().includes('dissolved');
          const name = this.cleanCommunityName(cellText);

          if (name) {
            councils.push({
              name,
              councilArea,
              isActive,
              contactDetails: cells.length > 1 ? cells.eq(1).text().trim() : undefined
            });
          }
        }
      }
    });
  }

  /**
   * Parse a single community entry from a list item
   * @param $li Cheerio element for list item
   * @param councilArea The council area this community belongs to
   * @returns Parsed community data or null if invalid
   */
  private parseCommunityEntry($li: cheerio.Cheerio<cheerio.Element>, councilArea: string): ScottishCommunityRaw | null {
    const fullText = $li.text().trim();
    if (!fullText || fullText.length < 2) {
      return null;
    }

    // Most councils are active unless explicitly marked as inactive
    // The asterisk notation is no longer used on the current Wikipedia page
    const isActive = !fullText.toLowerCase().includes('inactive') &&
                     !fullText.toLowerCase().includes('defunct') &&
                     !fullText.toLowerCase().includes('dissolved');

    // Extract community name (first link or main text)
    const $firstLink = $li.find('a').first();
    let name = $firstLink.length ? $firstLink.text().trim() : fullText.split(',')[0].trim();

    // Clean up the name
    name = this.cleanCommunityName(name);

    if (!name || !this.looksLikeCommunityName(name)) {
      return null;
    }

    // Extract contact details if available
    let contactDetails: string | undefined;
    const textParts = fullText.split(name);
    if (textParts.length > 1) {
      contactDetails = textParts.slice(1).join('').trim();
      if (contactDetails.length < 3 || contactDetails === '*') {
        contactDetails = undefined;
      }
    }

    // Extract region if mentioned in parentheses
    const regionMatch = fullText.match(/\(([^)]+)\)/);
    const region = regionMatch ? regionMatch[1].trim() : undefined;

    return {
      name,
      councilArea,
      region,
      isActive,
      contactDetails
    };
  }

  /**
   * Clean and normalize community name
   * @param name Raw community name
   * @returns Cleaned community name
   */
  private cleanCommunityName(name: string): string {
    return name
      .replace(/\*/g, '') // Remove asterisks (active markers)
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
      /^(this|that|these|those|the|a|an)/i,
      /^(contents|history|background)/i
    ];

    return !excludePatterns.some(pattern => pattern.test(name));
  }

  /**
   * Check if a string looks like a council area name
   * @param name Potential council area name
   * @returns True if it looks like a council area
   */
  private looksLikeCouncilArea(name: string): boolean {
    if (!name || name.length < 3) {
      return false;
    }

    // Common patterns for Scottish council areas
    const councilPatterns = [
      /council$/i,
      /city$/i,
      /shire$/i,
      /islands?$/i,
      /highland/i,
      /border/i,
      /dumfries/i,
      /galloway/i,
      /lothian/i,
      /tayside/i,
      /grampian/i,
      /strathclyde/i,
      /fife/i,
      /perth/i,
      /kinross/i,
      /angus/i,
      /moray/i,
      /aberdeenshire/i,
      /glasgow/i,
      /edinburgh/i,
      /dundee/i,
      /aberdeen/i,
      /stirling/i,
      /falkirk/i,
      /clackmannanshire/i,
      /inverclyde/i,
      /renfrewshire/i,
      /lanarkshire/i,
      /ayrshire/i
    ];

    return councilPatterns.some(pattern => pattern.test(name)) ||
           name.split(' ').length <= 3; // Most council areas are 1-3 words
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
          console.log(`Scottish Councils: Retrying after ${delay}ms... (attempt ${attempt + 1}/${this.config.maxRetries})`);
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
 * Create a default Scottish councils fetcher instance
 */
export const createScottishCouncilsFetcher = (config?: ScottishCouncilsFetcherConfig): ScottishCouncilsFetcher => {
  return new ScottishCouncilsFetcher(config);
};