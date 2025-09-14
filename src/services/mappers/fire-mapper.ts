/**
 * Maps Fire Services to Organisation model
 */

import { OrganisationType, DataSourceType } from '../../models/organisation.js';
import type { Organisation } from '../../models/organisation.js';
import type { FireService } from '../../models/emergency-services.js';

export class FireMapper {
  mapToOrganisation(service: FireService): Organisation {
    const id = this.generateId(service.name);
    
    return {
      id: `fire-${id}`,
      name: service.name,
      type: OrganisationType.EMERGENCY_SERVICE,
      classification: `Fire and Rescue Service - ${this.formatAuthorityType(service.authorityType)}`,
      status: 'active',
      location: {
        country: 'United Kingdom',
        region: service.region || 'United Kingdom'
      },
      sources: [{
        source: DataSourceType.NFCC,
        sourceId: service.name,
        retrievedAt: new Date().toISOString(),
        url: 'https://nfcc.org.uk/contacts/fire-and-rescue-services/',
        confidence: 1.0
      }],
      dataQuality: {
        completeness: this.calculateCompleteness(service),
        hasConflicts: false,
        requiresReview: false
      },
      lastUpdated: new Date().toISOString(),
      additionalProperties: {
        serviceType: 'fire',
        authorityType: service.authorityType,
        region: service.region,
        coverage: service.coverage,
        stationCount: service.stationCount,
        website: service.website
      }
    };
  }

  private generateId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private formatAuthorityType(type: string): string {
    const typeMap: Record<string, string> = {
      'county': 'County',
      'metropolitan': 'Metropolitan',
      'combined_authority': 'Combined Authority',
      'unitary': 'Unitary'
    };
    return typeMap[type] || type;
  }

  private calculateCompleteness(service: FireService): number {
    const fields = ['name', 'serviceType', 'authorityType', 'region', 'website'];
    const populated = fields.filter(field => service[field as keyof FireService]);
    return populated.length / fields.length;
  }
}