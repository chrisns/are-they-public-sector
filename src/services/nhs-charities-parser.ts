import axios from 'axios';
import type { NHSCharityRaw } from '../models/nhs-charity.js';

export class NHSCharitiesParser {
  private readonly pageUrl = 'https://nhscharitiestogether.co.uk/about-us/nhs-charities-across-the-uk/';
  private readonly maxRetries = 3;

  public async parse(): Promise<NHSCharityRaw[]> {
    try {
      const apiUrl = await this.discoverApiUrl();
      const data = await this.fetchApiData(apiUrl);
      return this.filterEnglandWales(data);
    } catch (error) {
      throw new Error(`Failed to fetch NHS Charities: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async discoverApiUrl(): Promise<string> {
    const html = await this.fetchWithRetry();
    const mapId = this.extractMapId(html);
    return `https://api.storepoint.co/v1/${mapId}/locations?rq`;
  }

  private extractMapId(html: string): string {
    // Look for mapId in the JavaScript
    const mapIdMatch = html.match(/mapId\s*=\s*["']([a-f0-9]+)["']/i) ||
                       html.match(/const\s+mapId\s*=\s*["']([a-f0-9]+)["']/i) ||
                       html.match(/var\s+mapId\s*=\s*["']([a-f0-9]+)["']/i);

    if (!mapIdMatch || !mapIdMatch[1]) {
      throw new Error('Map ID not found in page');
    }

    return mapIdMatch[1];
  }

  private async fetchWithRetry(retryCount = 0): Promise<string> {
    try {
      return await this.fetchHTML();
    } catch (error) {
      if (retryCount < this.maxRetries - 1) {
        console.log(`Retry ${retryCount + 1}/${this.maxRetries - 1} after error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        await this.delay(1000 * Math.pow(2, retryCount));
        return this.fetchWithRetry(retryCount + 1);
      }
      throw new Error(`Failed after retries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async fetchHTML(): Promise<string> {
    const response = await axios.get(this.pageUrl, {
      timeout: 30000,
      headers: {
        'User-Agent': 'UK-Public-Sector-Aggregator/1.0'
      }
    });
    return response.data;
  }

  private async fetchApiData(apiUrl: string): Promise<NHSCharityRaw[]> {
    const response = await axios.get(apiUrl, {
      timeout: 30000,
      headers: {
        'User-Agent': 'UK-Public-Sector-Aggregator/1.0',
        'Accept': 'application/json'
      }
    });

    if (!response.data || !response.data.success) {
      throw new Error('Invalid API response format');
    }

    // Check for both possible structures
    const results = response.data.results?.locations || response.data.results || [];

    if (!Array.isArray(results)) {
      throw new Error('Invalid API response format - results not an array');
    }

    return results.map((item: unknown) => {
      const charity = item as Record<string, unknown>;

      // Extract postcode from streetaddress if not in separate field
      let postcode = charity.postcode as string || charity.zip as string;
      const address = charity.streetaddress as string || charity.address as string || charity.street as string;
      const city = charity.city as string || charity.town as string;
      let country = charity.country as string;

      // Parse address if it's combined in streetaddress
      if (!postcode && address && address.includes(',')) {
        const parts = address.split(',').map(s => s.trim());
        // UK postcodes are typically at the end
        const lastPart = parts[parts.length - 1];
        if (lastPart === 'United Kingdom' || lastPart === 'UK') {
          const possiblePostcode = parts[parts.length - 2];
          if (possiblePostcode && /[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}/i.test(possiblePostcode)) {
            postcode = possiblePostcode;
            // Set country based on UK
            country = parts.includes('Scotland') ? 'Scotland' :
                     parts.includes('Wales') ? 'Wales' :
                     parts.includes('Northern Ireland') ? 'Northern Ireland' : 'England';
          }
        }
      }

      return {
        name: charity.name as string || charity.title as string,
        address: address,
        city: city,
        postcode: postcode,
        country: country,
        website: charity.website as string || charity.url as string,
        lat: typeof charity.loc_lat === 'number' ? charity.loc_lat :
             typeof charity.lat === 'number' ? charity.lat :
             parseFloat(charity.loc_lat as string || charity.lat as string),
        lng: typeof charity.loc_long === 'number' ? charity.loc_long :
             typeof charity.lng === 'number' ? charity.lng :
             parseFloat(charity.loc_long as string || charity.lng as string),
        ...charity // Preserve other fields
      };
    });
  }

  private filterEnglandWales(charities: NHSCharityRaw[]): NHSCharityRaw[] {
    return charities.filter(charity => {
      // Include if country is England, Wales, or unknown
      if (!charity.country) return true;
      const country = charity.country.toLowerCase();
      return country.includes('england') || country.includes('wales');
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

