/**
 * Fire and Rescue Services Parser
 * Fetches and parses UK fire services from official UK government data (ONS)
 */

import axios from 'axios';
import type { FireService, FireParserResponse } from '../models/emergency-services.js';


export interface FireParserOptions {
  url?: string;
  timeout?: number;
}

export class FireParser {
  private readonly url: string;
  private readonly timeout: number;

  constructor(options: FireParserOptions = {}) {
    // Use official UK government data instead of NFCC website
    this.url = options.url || 'https://hub.arcgis.com/api/v3/datasets/5d3cf59290ff4576b44ad73beee09472_0/downloads/data?format=csv&spatialRefId=4326&where=1%3D1';
    this.timeout = options.timeout || 10000;
  }

  /**
   * Fetch all fire services from official UK government data
   */
  async fetchAll(): Promise<FireService[]> {
    console.log('Fetching fire services from official UK government data...');

    const response = await axios.get(this.url, {
      timeout: this.timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; UK Public Sector Aggregator)',
        'Accept': 'text/csv,text/plain'
      },
      maxRedirects: 5,
      validateStatus: (status) => status < 500
    });

    if (response.status !== 200) {
      throw new Error(`Fire services API returned status ${response.status}`);
    }

    const services = this.parseCSV(response.data);

    // Official data should have around 49 services
    if (services.length < 40) {
      throw new Error(`Only found ${services.length} fire services from official data, expected at least 40`);
    }

    console.log(`Fetched ${services.length} fire services from official UK government data`);
    return services;
  }


  /**
   * Parse CSV data to extract fire services from official UK government data
   */
  public parseCSV(csvData: string): FireService[] {
    const services: FireService[] = [];
    const lines = csvData.trim().split('\n');

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (!line) continue;

      // Parse CSV line - format: FRA23CD,FRA23NM,ObjectId
      const [code, name] = line.split(',');

      if (!code || !name) continue;

      // Normalize the name to add "Fire and Rescue Service" suffix if needed
      const normalizedName = this.normalizeOfficialName(name);

      const service: FireService = {
        name: normalizedName,
        serviceType: 'fire',
        authorityType: this.classifyAuthorityType(normalizedName),
        region: this.extractRegion(normalizedName),
        // Store the official code as metadata
        officialCode: code
      };

      services.push(service);
    }

    return services;
  }

  /**
   * Normalize official fire authority names to consistent format
   */
  private normalizeOfficialName(name: string): string {
    // Remove quotes if present
    name = name.replace(/^"(.*)"$/, '$1').trim();

    // Special cases for known official names
    const nameMap: Record<string, string> = {
      'Avon': 'Avon Fire and Rescue Service',
      'Bedfordshire': 'Bedfordshire Fire and Rescue Service',
      'Royal Berkshire': 'Royal Berkshire Fire and Rescue Service',
      'Buckinghamshire & Milton Keynes': 'Buckinghamshire Fire and Rescue Service',
      'Cambridgeshire': 'Cambridgeshire Fire and Rescue Service',
      'Cheshire': 'Cheshire Fire and Rescue Service',
      'Cleveland': 'Cleveland Fire Brigade',
      'Cornwall': 'Cornwall Fire and Rescue Service',
      'Cumbria': 'Cumbria Fire and Rescue Service',
      'Derbyshire': 'Derbyshire Fire and Rescue Service',
      'Devon & Somerset': 'Devon and Somerset Fire and Rescue Service',
      'County Durham and Darlington': 'County Durham and Darlington Fire and Rescue Service',
      'East Sussex': 'East Sussex Fire and Rescue Service',
      'Essex': 'Essex County Fire and Rescue Service',
      'Gloucestershire': 'Gloucestershire Fire and Rescue Service',
      'Hereford & Worcester': 'Hereford and Worcester Fire and Rescue Service',
      'Hertfordshire': 'Hertfordshire Fire and Rescue Service',
      'Humberside': 'Humberside Fire and Rescue Service',
      'Kent': 'Kent Fire and Rescue Service',
      'Lancashire': 'Lancashire Fire and Rescue Service',
      'Leicestershire': 'Leicestershire Fire and Rescue Service',
      'Lincolnshire': 'Lincolnshire Fire and Rescue Service',
      'Norfolk': 'Norfolk Fire and Rescue Service',
      'Northamptonshire': 'Northamptonshire Fire and Rescue Service',
      'Northumberland': 'Northumberland Fire and Rescue Service',
      'North Yorkshire': 'North Yorkshire Fire and Rescue Service',
      'Nottinghamshire': 'Nottinghamshire Fire and Rescue Service',
      'Oxfordshire': 'Oxfordshire Fire and Rescue Service',
      'Shropshire': 'Shropshire Fire and Rescue Service',
      'Stoke-on-Trent and Staffordshire': 'Staffordshire Fire and Rescue Service',
      'Suffolk': 'Suffolk Fire and Rescue Service',
      'Surrey': 'Surrey Fire and Rescue Service',
      'Warwickshire': 'Warwickshire Fire and Rescue Service',
      'West Sussex': 'West Sussex Fire and Rescue Service',
      'Isles of Scilly': 'Isles of Scilly Fire and Rescue Service',
      'Greater Manchester': 'Greater Manchester Fire and Rescue Service',
      'Merseyside': 'Merseyside Fire and Rescue Service',
      'South Yorkshire': 'South Yorkshire Fire and Rescue Service',
      'Tyne and Wear': 'Tyne and Wear Fire and Rescue Service',
      'West Midlands': 'West Midlands Fire Service',
      'West Yorkshire': 'West Yorkshire Fire and Rescue Service',
      'London Fire and Emergency Planning Authority': 'London Fire Brigade',
      'Dorset & Wiltshire': 'Dorset and Wiltshire Fire and Rescue Service',
      'Hampshire and Isle of Wight': 'Hampshire & Isle of Wight Fire and Rescue Service',
      'Northern Ireland Fire and Rescue Service': 'Northern Ireland Fire and Rescue Service',
      'Scotland': 'Scottish Fire and Rescue Service',
      'North Wales': 'North Wales Fire and Rescue Service',
      'Mid and West Wales': 'Mid and West Wales Fire and Rescue Service',
      'South Wales': 'South Wales Fire and Rescue Service'
    };

    return nameMap[name] || name + ' Fire and Rescue Service';
  }


  /**
   * Classify authority type based on name
   */
  classifyAuthorityType(name: string): FireService['authorityType'] {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('london') || 
        lowerName.includes('greater manchester') ||
        lowerName.includes('merseyside') ||
        lowerName.includes('south yorkshire') ||
        lowerName.includes('tyne and wear') ||
        lowerName.includes('west midlands') ||
        lowerName.includes('west yorkshire')) {
      return 'metropolitan';
    }
    
    if (lowerName.includes('combined authority') || 
        lowerName.includes('fire and rescue authority')) {
      return 'combined_authority';
    }
    
    if (lowerName.includes('unitary') || 
        lowerName.includes('council')) {
      return 'unitary';
    }
    
    return 'county';
  }

  /**
   * Extract region from service name
   */
  private extractRegion(name: string): string {
    // Remove fire service suffixes
    const region = name
      .replace(/Fire and Rescue Service/gi, '')
      .replace(/Fire and Rescue Authority/gi, '')
      .replace(/Fire Service/gi, '')
      .replace(/Fire Authority/gi, '')
      .replace(/Fire Brigade/gi, '')
      .trim();
    
    return region || name;
  }



  /**
   * Aggregate with metadata
   */
  async aggregate(): Promise<FireParserResponse> {
    const services = await this.fetchAll();

    return {
      services,
      metadata: {
        source: 'Official UK Government Data (ONS)',
        fetchedAt: new Date().toISOString(),
        totalCount: services.length
      }
    };
  }
}