import type { LocalAuthority } from '../../models/local-authority.js';
import type { Organisation } from '../../models/organisation.js';
import { OrganisationType, DataSourceType } from '../../models/organisation.js';

export class LocalAuthorityMapper {
  mapToOrganisation(authority: LocalAuthority): Organisation {
    const now = new Date().toISOString();
    
    const organisation: Organisation = {
      // Generate unique ID from code
      id: `la-${authority.code}`,
      
      // Core fields
      name: authority.name,
      alternativeNames: [],
      type: OrganisationType.LOCAL_AUTHORITY,
      classification: this.getClassification(authority.type),
      
      // Status - all scraped authorities are assumed active
      status: 'active',
      
      // Location - infer country
      location: {
        country: 'United Kingdom'
      },
      
      // Source tracking
      sources: [{
        source: DataSourceType.DEFRA_UK_AIR,
        sourceId: authority.code,
        retrievedAt: now,
        url: authority.url,
        confidence: 0.95
      }],
      
      // Metadata
      lastUpdated: now,
      dataQuality: {
        completeness: this.calculateCompleteness(authority),
        hasConflicts: false,
        requiresReview: false
      },
      
      // Store authority-specific data
      additionalProperties: {
        website: authority.url,
        authorityType: authority.type
      }
    };
    
    return organisation;
  }
  
  mapMultiple(authorities: LocalAuthority[]): Organisation[] {
    return authorities.map(authority => this.mapToOrganisation(authority));
  }
  
  private getClassification(type: string): string {
    switch (type) {
      case 'county':
        return 'County Council';
      case 'district':
        return 'District Council';
      case 'borough':
        return 'Borough Council';
      case 'city':
        return 'City Council';
      case 'unitary':
      default:
        return 'Unitary Authority';
    }
  }
  
  private calculateCompleteness(authority: LocalAuthority): number {
    let filledFields = 0;
    const totalFields = 4; // name, code, type, url
    
    if (authority.name) filledFields++;
    if (authority.code) filledFields++;
    if (authority.type) filledFields++;
    if (authority.url) filledFields++;
    
    return filledFields / totalFields;
  }
}