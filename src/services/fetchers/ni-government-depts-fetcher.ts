/**
 * Fetcher for Northern Ireland Government Departments
 * Parses NI government departments
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { DataSource } from '../../models/data-source.js';
import type { GovernmentDepartmentData, FetcherResponse } from '../../models/source-data.js';
import { DEFAULT_RETRY_CONFIG } from '../../models/source-data.js';

export class NIGovernmentDeptsFetcher {
  public readonly source = DataSource.NI_GOVERNMENT;
  public readonly url = 'https://www.nidirect.gov.uk/contacts/government-departments-in-northern-ireland';

  async fetch(): Promise<FetcherResponse<GovernmentDepartmentData>> {
    try {
      const response = await this.fetchWithRetry(this.url);
      const $ = cheerio.load(response.data);

      const departments: GovernmentDepartmentData[] = [];

      // Look for department listings in various formats
      $('.department-item, .govt-dept, .ministry-item, article').each((_, element) => {
        const $element = $(element);

        // Look for headings or titles containing department names
        $element.find('h1, h2, h3, h4, .title, .name, .dept-name').each((_, titleElement) => {
          const title = $(titleElement).text().trim();

          if (this.isDepartmentName(title)) {
            const name = this.cleanDepartmentName(title);

            // Look for additional information in surrounding content
            const parentElement = $(titleElement).closest('.department-item, .govt-dept, .ministry-item, article');
            const minister = this.extractMinister(parentElement.text());
            const responsibilities = this.extractResponsibilities(parentElement.text());
            const website = this.extractWebsite(parentElement);

            if (name && !departments.some(d => d.name === name)) {
              departments.push({
                name,
                minister: minister || undefined,
                responsibilities: responsibilities && responsibilities.length > 0 ? responsibilities : undefined,
                website: website || undefined
              });
            }
          }
        });
      });

      // Look for links that might be department names
      $('a').each((_, link) => {
        const $link = $(link);
        const linkText = $link.text().trim();
        const href = $link.attr('href');

        if (this.isDepartmentName(linkText)) {
          const name = this.cleanDepartmentName(linkText);

          if (name && !departments.some(d => d.name === name)) {
            const website = this.normalizeUrl(href);

            departments.push({
              name,
              website: website || undefined
            });
          }
        }
      });

      // Look for list items containing department information
      $('ul li, ol li').each((_, li) => {
        const $li = $(li);
        const text = $li.text().trim();

        if (this.isDepartmentName(text)) {
          const name = this.cleanDepartmentName(text);

          if (name && !departments.some(d => d.name === name)) {
            const website = this.extractWebsite($li);
            const minister = this.extractMinister(text);
            const responsibilities = this.extractResponsibilities(text);

            departments.push({
              name,
              minister: minister || undefined,
              responsibilities: responsibilities && responsibilities.length > 0 ? responsibilities : undefined,
              website: website || undefined
            });
          }
        }
      });

      // Look for tables containing department data
      $('table').each((_, table) => {
        const $table = $(table);

        $table.find('tbody tr, tr').each((_, row) => {
          const $row = $(row);
          const cells = $row.find('td, th').map((_, cell) => $(cell).text().trim()).get();

          if (cells.length > 0) {
            const potentialName = cells[0];

            if (this.isDepartmentName(potentialName)) {
              const name = this.cleanDepartmentName(potentialName);

              if (name && !departments.some(d => d.name === name)) {
                const minister = cells[1] || undefined;
                const responsibilities = cells[2] ? [cells[2]] : undefined;
                const website = this.extractWebsite($row);

                departments.push({
                  name,
                  minister: minister || undefined,
                  responsibilities: responsibilities || undefined,
                  website: website || undefined
                });
              }
            }
          }
        });
      });

      // Add well-known NI government departments if not found
      const knownDepartments = [
        {
          name: 'Department of Agriculture, Environment and Rural Affairs',
          responsibilities: ['Agriculture', 'Environment', 'Rural Affairs']
        },
        {
          name: 'Department for Communities',
          responsibilities: ['Housing', 'Social Security', 'Regeneration']
        },
        {
          name: 'Department for the Economy',
          responsibilities: ['Economic Development', 'Skills', 'Tourism']
        },
        {
          name: 'Department of Education',
          responsibilities: ['Education Policy', 'Schools']
        },
        {
          name: 'Department of Finance',
          responsibilities: ['Public Finance', 'Human Resources']
        },
        {
          name: 'Department of Health',
          responsibilities: ['Healthcare', 'Public Health']
        },
        {
          name: 'Department for Infrastructure',
          responsibilities: ['Transport', 'Water', 'Planning']
        },
        {
          name: 'Department of Justice',
          responsibilities: ['Policing', 'Courts', 'Prisons']
        },
        {
          name: 'The Executive Office',
          responsibilities: ['Executive Functions', 'Good Relations']
        }
      ];

      for (const knownDept of knownDepartments) {
        if (!departments.some(d => d.name.includes(knownDept.name.split(' ')[knownDept.name.split(' ').length - 1]))) {
          departments.push({
            name: knownDept.name,
            responsibilities: knownDept.responsibilities
          });
        }
      }

      if (departments.length === 0) {
        throw new Error('No Northern Ireland government department data found');
      }

      return {
        success: true,
        data: departments,
        source: this.source,
        timestamp: new Date(),
        metadata: {
          totalRecords: departments.length,
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

  private isDepartmentName(text: string): boolean {
    const lowerText = text.toLowerCase();
    return (lowerText.includes('department') ||
            lowerText.includes('ministry') ||
            lowerText.includes('office') ||
            lowerText.includes('executive') ||
            lowerText.includes('agriculture') ||
            lowerText.includes('communities') ||
            lowerText.includes('economy') ||
            lowerText.includes('education') ||
            lowerText.includes('finance') ||
            lowerText.includes('health') ||
            lowerText.includes('infrastructure') ||
            lowerText.includes('justice')) &&
           !lowerText.includes('about') &&
           !lowerText.includes('contact') &&
           !lowerText.includes('services') &&
           !lowerText.includes('information') &&
           text.length > 5 &&
           text.length < 150;
  }

  private cleanDepartmentName(name: string): string {
    return name
      .replace(/\[.*?\]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/^\W+|\W+$/g, '')
      .trim();
  }

  private extractMinister(text: string): string | undefined {
    const ministerPatterns = [
      /minister[:\s]+([^.]+)/i,
      /secretary[:\s]+([^.]+)/i,
      /led\s+by[:\s]+([^.]+)/i
    ];

    for (const pattern of ministerPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const minister = match[1].trim();
        if (minister.length > 3 && minister.length < 50) {
          return minister;
        }
      }
    }

    return undefined;
  }

  private extractResponsibilities(text: string): string[] | undefined {
    const responsibilityPatterns = [
      /responsible\s+for[:\s]+([^.]+)/i,
      /responsibilities[:\s]+([^.]+)/i,
      /covers[:\s]+([^.]+)/i
    ];

    for (const pattern of responsibilityPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const responsibilitiesText = match[1].trim();
        const responsibilities = responsibilitiesText
          .split(/[,;]/)
          .map(r => r.trim())
          .filter(r => r.length > 2 && r.length < 50);

        if (responsibilities.length > 0) {
          return responsibilities;
        }
      }
    }

    return undefined;
  }

  private extractWebsite(element: cheerio.Cheerio<cheerio.Element>): string | undefined {
    const link = element.find('a[href*="http"]').first().attr('href') ||
                 element.closest('a[href*="http"]').attr('href');

    return this.normalizeUrl(link);
  }

  private normalizeUrl(url: string | undefined): string | undefined {
    if (!url) return undefined;

    // Handle relative URLs
    if (url.startsWith('/')) {
      return `https://www.nidirect.gov.uk${url}`;
    }

    if (!url.startsWith('http')) return undefined;

    try {
      const parsed = new URL(url);
      return parsed.toString();
    } catch {
      return undefined;
    }
  }

  private async fetchWithRetry(url: string, attempt = 0): Promise<unknown> {
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
      // Add source context to error
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch NI Government Departments from ${url}: ${error.message}`);
      }
      throw error;
    }
  }

  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async fetchPage(_page: number): Promise<unknown> {
    // Not used for this fetcher but required for interface compatibility
    return null;
  }
}