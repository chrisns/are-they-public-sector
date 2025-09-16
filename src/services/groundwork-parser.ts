import axios from 'axios';
import { load } from 'cheerio';
import type { GroundworkTrustRaw } from '../models/groundwork-trust.js';

export class GroundworkParser {
  private readonly url = 'https://www.groundwork.org.uk/find-groundwork-near-me/';
  private readonly maxRetries = 3;

  public async parse(): Promise<GroundworkTrustRaw[]> {
    try {
      const html = await this.fetchWithRetry();
      return this.parseHTML(html);
    } catch (error) {
      throw new Error(`Failed to fetch Groundwork Trusts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async fetchWithRetry(retryCount = 0): Promise<string> {
    try {
      return await this.fetchHTML();
    } catch (error) {
      if (retryCount < this.maxRetries - 1) {
        console.log(`Retry ${retryCount + 1}/${this.maxRetries - 1} after error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        await this.delay(1000 * Math.pow(2, retryCount)); // Exponential backoff
        return this.fetchWithRetry(retryCount + 1);
      }
      throw error;
    }
  }

  private async fetchHTML(): Promise<string> {
    const response = await axios.get(this.url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'UK-Public-Sector-Aggregator/1.0'
      }
    });
    return response.data;
  }

  private parseHTML(html: string): GroundworkTrustRaw[] {
    const $ = load(html);
    const trusts: GroundworkTrustRaw[] = [];

    // Find the select dropdown with id region_select_component
    const selectElement = $('select#region_select_component');

    if (selectElement.length === 0) {
      throw new Error('Failed to extract Groundwork Trusts: dropdown not found');
    }

    // Extract options, filtering out placeholders and empty values
    selectElement.find('option').each((_, element) => {
      const text = $(element).text().trim();
      const value = $(element).attr('value');

      // Skip placeholder options (empty value or instructional text)
      if (text && value && value.length > 0 && !text.toLowerCase().includes('select area')) {
        trusts.push({ name: text });
      }
    });

    if (trusts.length === 0) {
      throw new Error('Failed to extract Groundwork Trusts: no valid trusts found');
    }

    return trusts;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

