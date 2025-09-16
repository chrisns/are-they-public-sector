/**
 * Police Forces Parser
 * Fetches and parses UK police forces from official data.police.uk API
 */

import axios from 'axios';
import type { PoliceForce, PoliceParserResponse } from '../models/emergency-services.js';

export interface PoliceParserOptions {
  apiUrl?: string;
  timeout?: number;
}

interface PoliceApiForce {
  id: string;
  name: string;
  description?: string | null;
  url?: string;
  telephone?: string;
  engagement_methods?: Array<{
    type: string;
    title: string;
    description?: string | null;
    url: string;
  }>;
}

export class PoliceParser {
  private readonly apiUrl: string;
  private readonly timeout: number;

  constructor(options: PoliceParserOptions = {}) {
    this.apiUrl = options.apiUrl || 'https://data.police.uk/api/forces';
    this.timeout = options.timeout || 10000;
  }

  /**
   * Fetch all police forces from the official data.police.uk API
   */
  async fetchAll(): Promise<PoliceForce[]> {
    console.log('Fetching police forces from data.police.uk API...');

    try {
      // Fetch basic forces list
      const forcesResponse = await axios.get<PoliceApiForce[]>(this.apiUrl, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; UK Public Sector Aggregator)',
          'Accept': 'application/json'
        }
      });

      const forces: PoliceForce[] = [];

      // Process each force
      for (const apiForce of forcesResponse.data) {
        try {
          // Get detailed information for each force
          const detailResponse = await axios.get<PoliceApiForce>(`${this.apiUrl}/${apiForce.id}`, {
            timeout: this.timeout,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; UK Public Sector Aggregator)',
              'Accept': 'application/json'
            }
          });

          const detail = detailResponse.data;

          const force: PoliceForce = {
            name: detail.name,
            serviceType: 'police',
            forceType: this.classifyForceType(detail.name),
            jurisdiction: this.extractJurisdiction(detail.name),
            ...(detail.url && { website: detail.url })
          };

          forces.push(force);
        } catch (detailError) {
          // If we can't get details, use basic info
          const forceName = apiForce?.name || 'Unknown Force';
          console.warn(`Could not fetch details for ${forceName}:`, detailError instanceof Error ? detailError.message : String(detailError));

          // Only add force if we have a valid name
          if (apiForce?.name) {
            const force: PoliceForce = {
              name: apiForce.name,
              serviceType: 'police',
              forceType: this.classifyForceType(apiForce.name),
              jurisdiction: this.extractJurisdiction(apiForce.name)
            };

            forces.push(force);
          }
        }

        // Add small delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      if (forces.length === 0) {
        throw new Error('No police forces found in API response');
      }

      console.log(`Fetched ${forces.length} police forces`);
      return forces;
    } catch (error) {
      console.error('Failed to fetch police forces:', error);
      throw error;
    }
  }


  /**
   * Classify force type based on name
   */
  private classifyForceType(name: string): PoliceForce['forceType'] {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('british transport') || 
        lowerName.includes('civil nuclear') ||
        lowerName.includes('ministry of defence')) {
      return 'special';
    }
    
    if (lowerName.includes('jersey') || 
        lowerName.includes('guernsey') || 
        lowerName.includes('isle of man')) {
      return 'crown_dependency';
    }
    
    if (lowerName.includes('gibraltar') || 
        lowerName.includes('sovereign base')) {
      return 'overseas_territory';
    }
    
    return 'territorial';
  }


  /**
   * Extract jurisdiction from name and context
   */
  private extractJurisdiction(name: string): string {
    // Remove "Police", "Constabulary" etc.
    const jurisdiction = name
      .replace(/Police Service/gi, '')
      .replace(/Police/gi, '')
      .replace(/Constabulary/gi, '')
      .trim();
    
    // Special cases
    if (name.toLowerCase().includes('metropolitan')) {
      return 'Greater London';
    }
    if (name.toLowerCase().includes('british transport')) {
      return 'UK Rail Network';
    }
    
    return jurisdiction || name;
  }



  /**
   * Aggregate with metadata
   */
  async aggregate(): Promise<PoliceParserResponse> {
    const forces = await this.fetchAll();
    
    return {
      forces,
      metadata: {
        source: 'police.uk',
        fetchedAt: new Date().toISOString(),
        totalCount: forces.length
      }
    };
  }
}