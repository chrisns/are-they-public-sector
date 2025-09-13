import axios, { AxiosError } from 'axios';
import type {
  School,
  FetchPageResult,
  SchoolsParserOptions,
  SchoolsResponse
} from '../models/school.js';
import { SchoolsParserError, SchoolsErrorCode } from '../models/school.js';

/**
 * Parser for UK Schools data from Get Information About Schools (GIAS) service
 */
export class SchoolsParser {
  private readonly baseUrl = 'https://get-information-schools.service.gov.uk/Establishments/Search/results-json';
  private readonly defaultOptions: Required<SchoolsParserOptions> = {
    searchTerm: 'e',  // Not used with EstablishmentAll search
    delayMs: 100,  // Only used for explicit delays, not between normal requests
    maxRetries: 15,  // Increased from 5 for better resilience
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  /**
   * Fetch a single page of schools from GIAS API
   */
  async fetchPage(startIndex: number, options?: SchoolsParserOptions): Promise<FetchPageResult> {
    const opts = { ...this.defaultOptions, ...options };
    
    // Use EstablishmentAll to get all schools without search term gaps
    const params = new URLSearchParams({
      SearchType: 'EstablishmentAll',
      startIndex: startIndex.toString()
    });

    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff: 1s, 2s, 4s, 8s, 16s
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 16000);
          await this.delay(backoffMs);
        }

        const response = await axios.get(`${this.baseUrl}?${params}`, {
          headers: {
            'User-Agent': opts.userAgent,
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-GB,en;q=0.9',
            'Referer': 'https://get-information-schools.service.gov.uk/',
            'Origin': 'https://get-information-schools.service.gov.uk'
          },
          timeout: 30000
        });

        // Handle "No results available" response
        if (response.data && response.data.message === 'No results available') {
          return {
            schools: [],
            hasMore: false,
            nextIndex: startIndex
          };
        }

        // Handle empty array (end of pagination)
        if (Array.isArray(response.data) && response.data.length === 0) {
          return {
            schools: [],
            hasMore: false,
            nextIndex: startIndex
          };
        }

        // Parse the response
        if (!Array.isArray(response.data)) {
          throw new SchoolsParserError(
            'Unexpected response format from GIAS API',
            SchoolsErrorCode.FORMAT_CHANGE_ERROR
          );
        }

        const schools = this.parseResponse(response.data);
        // Continue fetching until we get 0 results (true end of data)
        const hasMore = schools.length > 0;
        
        return {
          schools,
          hasMore,
          nextIndex: startIndex + 100
        };

      } catch (error) {
        lastError = error as Error;
        
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          
          // Don't retry on 4xx errors (except 429)
          if (axiosError.response && 
              axiosError.response.status >= 400 && 
              axiosError.response.status < 500 &&
              axiosError.response.status !== 429) {
            throw new SchoolsParserError(
              `API error: ${axiosError.response.status}`,
              SchoolsErrorCode.NETWORK_ERROR
            );
          }
          
          // Rate limiting
          if (axiosError.response?.status === 429) {
            console.log(`Rate limited, attempt ${attempt + 1}/${opts.maxRetries}`);
            continue;
          }
        }
        
        console.log(`Fetch attempt ${attempt + 1}/${opts.maxRetries} failed:`, error);
      }
    }
    
    throw new SchoolsParserError(
      `Failed to fetch page after ${opts.maxRetries} attempts: ${lastError?.message}`,
      SchoolsErrorCode.NETWORK_ERROR
    );
  }

  /**
   * Fetch all schools from GIAS API with pagination
   */
  async fetchAll(options?: SchoolsParserOptions): Promise<School[]> {
    const opts = { ...this.defaultOptions, ...options };
    const allSchools: School[] = [];
    let startIndex = 0;
    let hasMore = true;
    let pageCount = 0;
    let consecutiveEmptyPages = 0;
    let backoffMs = 0; // Start with no delay
    const MAX_CONSECUTIVE_EMPTY = 3; // Stop after 3 consecutive empty pages

    console.log('Starting schools aggregation...');
    console.log('Fetching all UK schools from GIAS (no delay for successful requests)...');

    while (hasMore) {
      // Only delay if we have a backoff from previous error/empty result
      if (backoffMs > 0) {
        console.log(`  Backing off for ${backoffMs}ms...`);
        await this.delay(backoffMs);
      }

      console.log(`Fetching page ${pageCount + 1} (index ${startIndex})...`);
      
      try {
        const result = await this.fetchPage(startIndex, opts);
        
        allSchools.push(...result.schools);
        
        // Track consecutive empty pages to detect true end
        if (result.schools.length === 0) {
          consecutiveEmptyPages++;
          // Exponential backoff on empty results
          backoffMs = Math.min(1000 * Math.pow(2, consecutiveEmptyPages - 1), 8000);
          
          if (consecutiveEmptyPages >= MAX_CONSECUTIVE_EMPTY) {
            console.log(`Stopping after ${MAX_CONSECUTIVE_EMPTY} consecutive empty pages`);
            hasMore = false;
          }
        } else {
          // Reset backoff on successful fetch with data
          consecutiveEmptyPages = 0;
          backoffMs = 0;
        }
        
        startIndex = result.nextIndex;
        pageCount++;

        console.log(`  Retrieved ${result.schools.length} schools (total: ${allSchools.length})`);
        
      } catch (error) {
        console.log(`  Error fetching page: ${error}. Applying exponential backoff...`);
        // Exponential backoff on errors
        backoffMs = Math.min(backoffMs === 0 ? 1000 : backoffMs * 2, 16000);
        // Don't increment page count or index on error, retry same page
        continue;
      }
      
      // Safety limit to prevent infinite loops
      if (pageCount > 1200) { // 120,000 records max
        console.log('Reached maximum page limit (1200 pages)');
        hasMore = false;
      }
    }

    console.log(`Aggregation complete. Total pages: ${pageCount}`);
    
    // Filter and deduplicate
    const openSchools = this.filterOpenSchools(allSchools);
    const uniqueSchools = this.deduplicateByUrn(openSchools);
    
    console.log(`Total schools: ${allSchools.length}`);
    console.log(`Open schools: ${openSchools.length}`);
    console.log(`Unique schools: ${uniqueSchools.length}`);
    
    return uniqueSchools;
  }

  /**
   * Transform raw GIAS response to School entities
   */
  parseResponse(rawData: any[]): School[] {
    if (!Array.isArray(rawData)) {
      throw new SchoolsParserError(
        'Expected array response from GIAS API',
        SchoolsErrorCode.FORMAT_CHANGE_ERROR
      );
    }

    return rawData.map((item, index) => {
      try {
        // Validate required fields
        if (!item.name || item.name.trim() === '') {
          throw new SchoolsParserError(
            'School name is required',
            SchoolsErrorCode.VALIDATION_ERROR
          );
        }

        if (!item.urn || typeof item.urn !== 'number') {
          throw new SchoolsParserError(
            `Invalid URN for school: ${item.name}`,
            SchoolsErrorCode.VALIDATION_ERROR
          );
        }

        const school: School = {
          urn: item.urn,
          name: item.name,
          status: item.status || 'Unknown',
          phaseType: item.phaseType || '',
          localAuthority: item.localAuthority || '',
          laestab: item.laestab || '',
          address: item.address || ''
        };

        // Handle location (can be null or have null values)
        if (item.location && 
            item.location.latitude !== null && 
            item.location.longitude !== null) {
          school.latitude = item.location.latitude;
          school.longitude = item.location.longitude;
        }

        return school;
      } catch (error) {
        if (error instanceof SchoolsParserError) {
          throw error;
        }
        throw new SchoolsParserError(
          `Failed to parse school at index ${index}: ${error}`,
          SchoolsErrorCode.PARSE_ERROR
        );
      }
    });
  }

  /**
   * Filter schools to only include open establishments
   */
  filterOpenSchools(schools: School[]): School[] {
    return schools.filter(school => school.status === 'Open');
  }

  /**
   * Deduplicate schools by URN
   */
  deduplicateByUrn(schools: School[]): School[] {
    const seen = new Set<number>();
    const unique: School[] = [];
    let duplicateCount = 0;

    for (const school of schools) {
      if (!seen.has(school.urn)) {
        seen.add(school.urn);
        unique.push(school);
      } else {
        duplicateCount++;
      }
    }

    if (duplicateCount > 0) {
      console.log(`Removed ${duplicateCount} duplicate schools`);
    }

    return unique;
  }

  /**
   * Aggregate schools and return with metadata
   */
  async aggregate(options?: SchoolsParserOptions): Promise<SchoolsResponse> {
    const startTime = Date.now();
    const schools = await this.fetchAll(options);
    const duration = Date.now() - startTime;

    console.log(`Aggregation completed in ${(duration / 1000).toFixed(1)} seconds`);

    return {
      schools,
      metadata: {
        source: 'GIAS',
        fetchedAt: new Date().toISOString(),
        totalCount: schools.length,
        openCount: schools.length  // All are open after filtering
      }
    };
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}