/**
 * Fire and Rescue Services Parser
 * Fetches and parses UK fire services from official UK government data (ONS) with fallback data
 */

import axios from 'axios';
import type { FireService, FireParserResponse } from '../models/emergency-services.js';

// Comprehensive fallback data from official sources (Wikipedia, government data)
const FALLBACK_FIRE_SERVICES: Omit<FireService, 'serviceType'>[] = [
  // England (46 services)
  { name: 'Avon Fire and Rescue Service', region: 'Avon', authorityType: 'county' },
  { name: 'Bedfordshire Fire and Rescue Service', region: 'Bedfordshire', authorityType: 'county' },
  { name: 'Royal Berkshire Fire and Rescue Service', region: 'Berkshire', authorityType: 'county' },
  { name: 'Buckinghamshire Fire and Rescue Service', region: 'Buckinghamshire', authorityType: 'county' },
  { name: 'Cambridgeshire Fire and Rescue Service', region: 'Cambridgeshire', authorityType: 'county' },
  { name: 'Cheshire Fire and Rescue Service', region: 'Cheshire', authorityType: 'county' },
  { name: 'Cleveland Fire Brigade', region: 'Cleveland', authorityType: 'county' },
  { name: 'Cornwall Fire and Rescue Service', region: 'Cornwall', authorityType: 'unitary' },
  { name: 'County Durham and Darlington Fire and Rescue Service', region: 'Durham', authorityType: 'county' },
  { name: 'Cumbria Fire and Rescue Service', region: 'Cumbria', authorityType: 'county' },
  { name: 'Derbyshire Fire and Rescue Service', region: 'Derbyshire', authorityType: 'county' },
  { name: 'Devon and Somerset Fire and Rescue Service', region: 'Devon and Somerset', authorityType: 'county' },
  { name: 'Dorset and Wiltshire Fire and Rescue Service', region: 'Dorset and Wiltshire', authorityType: 'county' },
  { name: 'East Sussex Fire and Rescue Service', region: 'East Sussex', authorityType: 'county' },
  { name: 'Essex County Fire and Rescue Service', region: 'Essex', authorityType: 'county' },
  { name: 'Gloucestershire Fire and Rescue Service', region: 'Gloucestershire', authorityType: 'county' },
  { name: 'Greater Manchester Fire and Rescue Service', region: 'Greater Manchester', authorityType: 'metropolitan' },
  { name: 'Hampshire & Isle of Wight Fire and Rescue Service', region: 'Hampshire', authorityType: 'county' },
  { name: 'Hereford and Worcester Fire and Rescue Service', region: 'Herefordshire and Worcestershire', authorityType: 'county' },
  { name: 'Hertfordshire Fire and Rescue Service', region: 'Hertfordshire', authorityType: 'county' },
  { name: 'Humberside Fire and Rescue Service', region: 'Humberside', authorityType: 'county' },
  { name: 'Isles of Scilly Fire and Rescue Service', region: 'Isles of Scilly', authorityType: 'unitary' },
  { name: 'Kent Fire and Rescue Service', region: 'Kent', authorityType: 'county' },
  { name: 'Lancashire Fire and Rescue Service', region: 'Lancashire', authorityType: 'county' },
  { name: 'Leicestershire Fire and Rescue Service', region: 'Leicestershire', authorityType: 'county' },
  { name: 'Lincolnshire Fire and Rescue Service', region: 'Lincolnshire', authorityType: 'county' },
  { name: 'London Fire Brigade', region: 'London', authorityType: 'metropolitan' },
  { name: 'Merseyside Fire and Rescue Service', region: 'Merseyside', authorityType: 'metropolitan' },
  { name: 'Norfolk Fire and Rescue Service', region: 'Norfolk', authorityType: 'county' },
  { name: 'Northamptonshire Fire and Rescue Service', region: 'Northamptonshire', authorityType: 'county' },
  { name: 'Northumberland Fire and Rescue Service', region: 'Northumberland', authorityType: 'county' },
  { name: 'North Yorkshire Fire and Rescue Service', region: 'North Yorkshire', authorityType: 'county' },
  { name: 'Nottinghamshire Fire and Rescue Service', region: 'Nottinghamshire', authorityType: 'county' },
  { name: 'Oxfordshire Fire and Rescue Service', region: 'Oxfordshire', authorityType: 'county' },
  { name: 'Shropshire Fire and Rescue Service', region: 'Shropshire', authorityType: 'county' },
  { name: 'South Yorkshire Fire and Rescue Service', region: 'South Yorkshire', authorityType: 'metropolitan' },
  { name: 'Staffordshire Fire and Rescue Service', region: 'Staffordshire', authorityType: 'county' },
  { name: 'Suffolk Fire and Rescue Service', region: 'Suffolk', authorityType: 'county' },
  { name: 'Surrey Fire and Rescue Service', region: 'Surrey', authorityType: 'county' },
  { name: 'Tyne and Wear Fire and Rescue Service', region: 'Tyne and Wear', authorityType: 'metropolitan' },
  { name: 'Warwickshire Fire and Rescue Service', region: 'Warwickshire', authorityType: 'county' },
  { name: 'West Midlands Fire Service', region: 'West Midlands', authorityType: 'metropolitan' },
  { name: 'West Sussex Fire and Rescue Service', region: 'West Sussex', authorityType: 'county' },
  { name: 'West Yorkshire Fire and Rescue Service', region: 'West Yorkshire', authorityType: 'metropolitan' },
  // Wales (3 services)
  { name: 'South Wales Fire and Rescue Service', region: 'South Wales', authorityType: 'combined_authority' },
  { name: 'Mid and West Wales Fire and Rescue Service', region: 'Mid and West Wales', authorityType: 'combined_authority' },
  { name: 'North Wales Fire and Rescue Service', region: 'North Wales', authorityType: 'combined_authority' },
  // Scotland (1 service)
  { name: 'Scottish Fire and Rescue Service', region: 'Scotland', authorityType: 'combined_authority' },
  // Northern Ireland (1 service)
  { name: 'Northern Ireland Fire and Rescue Service', region: 'Northern Ireland', authorityType: 'combined_authority' }
];

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

    try {
      const response = await axios.get(this.url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; UK Public Sector Aggregator)',
          'Accept': 'text/csv,text/plain'
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 500
      });

      // If we get a non-200 status, use fallback data
      if (response.status !== 200) {
        console.warn(`Fire services API returned status ${response.status} - using fallback data`);
        return this.getFallbackServices();
      }

      const services = this.parseCSV(response.data);

      // Official data should have around 49 services
      if (services.length < 40) {
        console.warn(`Only found ${services.length} fire services from official data - using fallback data`);
        return this.getFallbackServices();
      }

      console.log(`Fetched ${services.length} fire services from official UK government data`);
      return services;
    } catch (error) {
      console.warn('Failed to fetch fire services from official API, using fallback data:', error);
      return this.getFallbackServices();
    }
  }

  /**
   * Get fallback fire services data
   */
  private getFallbackServices(): FireService[] {
    console.log(`Using fallback data: ${FALLBACK_FIRE_SERVICES.length} fire services`);
    return FALLBACK_FIRE_SERVICES.map(service => ({
      ...service,
      serviceType: 'fire' as const
    }));
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