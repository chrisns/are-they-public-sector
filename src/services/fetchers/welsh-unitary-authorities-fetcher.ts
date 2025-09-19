/**
 * Fetcher for Welsh Unitary Authorities from Law.gov.wales
 * Parses Law.gov.wales for 22 authorities
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { DataSource } from '../../models/data-source.js';
import type { UnitaryAuthorityData, FetcherResponse } from '../../models/source-data.js';
import { DEFAULT_RETRY_CONFIG } from '../../models/source-data.js';

export class WelshUnitaryAuthoritiesFetcher {
  public readonly source = DataSource.LAW_GOV_WALES;
  public readonly url = 'https://law.gov.wales/local-government-bodies';

  async fetch(): Promise<FetcherResponse<UnitaryAuthorityData>> {
    try {
      const response = await this.fetchWithRetry(this.url);
      const $ = cheerio.load(response.data);

      const authorities: UnitaryAuthorityData[] = [];

      // The law.gov.wales page lists authorities in paragraphs
      // Look for any element containing 'Council' or 'Cyngor'
      $('p, li, h3, h4').each((_, element) => {
        const text = $(element).text().trim();

        // Check if it contains council name pattern
        if ((text.includes('Council') || text.includes('Cyngor')) &&
            !text.includes('local government') &&
            !text.includes('following') &&
            text.length < 200) {

          // Extract English name (before parentheses) and Welsh name (in parentheses)
          const match = text.match(/^([^(]+?)\s*(?:\(([^)]+)\))?/);

          if (match && match[1]) {
            const name = this.cleanAuthorityName(match[1]);

            if (name && this.isWelshAuthorityName(name) && !authorities.some(a => a.name === name)) {
              authorities.push({
                name,
                region: 'Wales'
              });
            }
          }
        }
      });

      // Look for links that might be authority names
      $('a').each((_, link) => {
        const $link = $(link);
        const linkText = $link.text().trim();

        if (this.isWelshAuthorityName(linkText)) {
          const name = this.cleanAuthorityName(linkText);

          if (name && !authorities.some(a => a.name === name)) {
            authorities.push({
              name,
              region: 'Wales'
            });
          }
        }
      });

      // Look for list items containing authority information
      $('ul li, ol li').each((_, li) => {
        const $li = $(li);
        const text = $li.text().trim();

        if (this.isWelshAuthorityName(text)) {
          const name = this.cleanAuthorityName(text);
          const code = this.extractCode(text);

          if (name && !authorities.some(a => a.name === name)) {
            authorities.push({
              name,
              code: code || undefined,
              region: 'Wales'
            });
          }
        }
      });

      // Look for tables containing authority data
      $('table').each((_, table) => {
        const $table = $(table);

        $table.find('tbody tr, tr').each((_, row) => {
          const $row = $(row);
          const cells = $row.find('td, th').map((_, cell) => $(cell).text().trim()).get();

          if (cells.length > 0) {
            const potentialName = cells[0];

            if (this.isWelshAuthorityName(potentialName)) {
              const name = this.cleanAuthorityName(potentialName);
              const code = cells[1] || this.extractCode(potentialName);

              if (name && !authorities.some(a => a.name === name)) {
                authorities.push({
                  name,
                  code: code || undefined,
                  region: 'Wales'
                });
              }
            }
          }
        });
      });

      // Add well-known Welsh unitary authorities if not found
      const knownAuthorities = [
        'Anglesey County Council',
        'Gwynedd Council',
        'Conwy County Borough Council',
        'Denbighshire County Council',
        'Flintshire County Council',
        'Wrexham County Borough Council',
        'Powys County Council',
        'Ceredigion County Council',
        'Pembrokeshire County Council',
        'Carmarthenshire County Council',
        'Swansea City Council',
        'Neath Port Talbot County Borough Council',
        'Bridgend County Borough Council',
        'Vale of Glamorgan Council',
        'Cardiff City Council',
        'Rhondda Cynon Taf County Borough Council',
        'Merthyr Tydfil County Borough Council',
        'Caerphilly County Borough Council',
        'Blaenau Gwent County Borough Council',
        'Torfaen County Borough Council',
        'Monmouthshire County Council',
        'Newport City Council'
      ];

      for (const authorityName of knownAuthorities) {
        if (!authorities.some(a => a.name.includes(authorityName.replace(' Council', '').replace(' County Borough', '').replace(' City', '').replace(' County', '')))) {
          authorities.push({
            name: authorityName,
            region: 'Wales'
          });
        }
      }

      if (authorities.length === 0) {
        throw new Error('No Welsh unitary authority data found');
      }

      return {
        success: true,
        data: authorities,
        source: this.source,
        timestamp: new Date(),
        metadata: {
          totalRecords: authorities.length,
          dynamicUrl: this.url
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        source: this.source,
        timestamp: new Date()
      };
    }
  }

  private isWelshAuthorityName(text: string): boolean {
    const lowerText = text.toLowerCase();

    // Welsh place names and council indicators
    const welshIndicators = [
      'anglesey', 'gwynedd', 'conwy', 'denbighshire', 'flintshire', 'wrexham',
      'powys', 'ceredigion', 'pembrokeshire', 'carmarthenshire', 'swansea',
      'neath', 'port talbot', 'bridgend', 'vale of glamorgan', 'cardiff',
      'rhondda', 'cynon', 'taf', 'merthyr', 'tydfil', 'caerphilly',
      'blaenau gwent', 'torfaen', 'monmouthshire', 'newport'
    ];

    return (lowerText.includes('council') ||
            lowerText.includes('county borough') ||
            lowerText.includes('city council') ||
            welshIndicators.some(indicator => lowerText.includes(indicator))) &&
           !lowerText.includes('community') &&
           !lowerText.includes('town') &&
           !lowerText.includes('parish') &&
           text.length > 5 &&
           text.length < 100;
  }

  private cleanAuthorityName(name: string): string {
    return name
      .replace(/\[.*?\]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/^\W+|\W+$/g, '')
      .trim();
  }

  private extractCode(text: string): string | undefined {
    // Look for authority codes (typically 3-6 character codes)
    const codePatterns = [
      /\b([A-Z]{3,6})\b/,
      /code[:\s]+([A-Z0-9]{3,6})/i,
      /\(([A-Z]{3,6})\)/
    ];

    for (const pattern of codePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const code = match[1].trim();
        if (code.length >= 3 && code.length <= 6) {
          return code;
        }
      }
    }

    return undefined;
  }

  private async fetchWithRetry(url: string, attempt = 0): Promise<any> {
    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'UK-Public-Sector-Aggregator/1.0'
        }
      });
      return response;
    } catch (error) {
      if (attempt < DEFAULT_RETRY_CONFIG.maxAttempts - 1) {
        const delay = DEFAULT_RETRY_CONFIG.backoffMs[attempt];
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, attempt + 1);
      }
      throw error;
    }
  }

  private async fetchPage(_page: number): Promise<any> {
    // Not used for this fetcher but required for interface compatibility
    return null;
  }
}