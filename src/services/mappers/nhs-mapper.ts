import type { NHSTrust } from '../../models/nhs-trust.js';
import type { Organisation } from '../../models/organisation.js';
import { OrganisationType, DataSourceType } from '../../models/organisation.js';

export class NHSMapper {
  mapToOrganisation(trust: NHSTrust): Organisation {
    const now = new Date().toISOString();
    
    const organisation: Organisation = {
      // Generate unique ID from code
      id: `nhs-${trust.code}`,
      
      // Core fields
      name: trust.name,
      alternativeNames: [],
      type: trust.type === 'foundation-trust' 
        ? OrganisationType.NHS_FOUNDATION_TRUST 
        : OrganisationType.NHS_TRUST,
      classification: trust.type === 'foundation-trust'
        ? 'NHS Foundation Trust'
        : 'NHS Trust',
      
      // Status - all scraped trusts are assumed active
      status: 'active',
      
      // Source tracking
      sources: [{
        source: DataSourceType.NHS_PROVIDER_DIRECTORY,
        sourceId: trust.code,
        retrievedAt: now,
        url: trust.url || 'https://www.england.nhs.uk/publication/nhs-provider-directory/',
        confidence: 0.9
      }],
      
      // Metadata
      lastUpdated: now,
      dataQuality: {
        completeness: this.calculateCompleteness(trust),
        hasConflicts: false,
        requiresReview: false
      }
    };
    
    // Add URL to additional properties if available
    if (trust.url) {
      organisation.additionalProperties = {
        website: trust.url
      };
    }
    
    return organisation;
  }
  
  mapMultiple(trusts: NHSTrust[]): Organisation[] {
    return trusts.map(trust => this.mapToOrganisation(trust));
  }
  
  private calculateCompleteness(trust: NHSTrust): number {
    let filledFields = 0;
    const totalFields = 4; // name, code, type, url
    
    if (trust.name) filledFields++;
    if (trust.code) filledFields++;
    if (trust.type) filledFields++;
    if (trust.url) filledFields++;
    
    return filledFields / totalFields;
  }
}