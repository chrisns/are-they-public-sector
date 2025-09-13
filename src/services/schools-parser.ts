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
    searchTerm: 'e',  // 'e' returns most comprehensive results
    delayMs: 500,
    maxRetries: 5,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  };

  /**
   * Fetch a single page of schools from GIAS API
   */
  async fetchPage(startIndex: number, options?: SchoolsParserOptions): Promise<FetchPageResult> {
    const opts = { ...this.defaultOptions, ...options };
    
    const params = new URLSearchParams({
      searchType: 'text',
      'textSearchModel.Text': opts.searchTerm,
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
            'User-Agent': opts.userAgent
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
        const hasMore = schools.length === 100; // API returns 100 per page
        
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

    console.log('Starting schools aggregation...');
    console.log(`Search term: "${opts.searchTerm}"`);

    while (hasMore) {
      // Add delay between requests to avoid rate limiting
      if (pageCount > 0) {
        await this.delay(opts.delayMs);
      }

      console.log(`Fetching page ${pageCount + 1} (index ${startIndex})...`);
      
      const result = await this.fetchPage(startIndex, opts);
      
      allSchools.push(...result.schools);
      hasMore = result.hasMore;
      startIndex = result.nextIndex;
      pageCount++;

      console.log(`  Retrieved ${result.schools.length} schools (total: ${allSchools.length})`);
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