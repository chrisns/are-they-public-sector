/**
 * Maps Police Forces to Organisation model
 */

import { OrganisationType, DataSourceType } from '../../models/organisation.js';
import type { Organisation } from '../../models/organisation.js';
import type { PoliceForce } from '../../models/emergency-services.js';

export class PoliceMapper {
  mapToOrganisation(force: PoliceForce): Organisation {
    const id = this.generateId(force.name);
    
    return {
      id: `police-${id}`,
      name: force.name,
      type: OrganisationType.EMERGENCY_SERVICE,
      classification: `Police Force - ${this.formatForceType(force.forceType)}`,
      status: 'active',
      location: {
        country: 'United Kingdom',
        region: force.jurisdiction
      },
      sources: [{
        source: DataSourceType.POLICE_UK,
        sourceId: force.name,
        retrievedAt: new Date().toISOString(),
        url: force.website || 'https://www.police.uk/pu/contact-us/uk-police-forces/',
        confidence: 1.0
      }],
      dataQuality: {
        completeness: this.calculateCompleteness(force),
        hasConflicts: false,
        requiresReview: false
      },
      lastUpdated: new Date().toISOString(),
      additionalProperties: {
        serviceType: 'police',
        forceType: force.forceType,
        jurisdiction: force.jurisdiction,
        website: force.website,
        chiefConstable: force.chiefConstable,
        pcc: force.policeAndCrimeCommissioner
      }
    };
  }

  private generateId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private formatForceType(type: string): string {
    const typeMap: Record<string, string> = {
      'territorial': 'Territorial',
      'special': 'Special',
      'crown_dependency': 'Crown Dependency',
      'overseas_territory': 'Overseas Territory'
    };
    return typeMap[type] || type;
  }

  private calculateCompleteness(force: PoliceForce): number {
    const fields = ['name', 'serviceType', 'forceType', 'jurisdiction', 'website'];
    const populated = fields.filter(field => force[field as keyof PoliceForce]);
    return populated.length / fields.length;
  }
}