/**
 * Maps Additional Devolved Bodies to Organisation model
 */

import { OrganisationType, DataSourceType } from '../../models/organisation.js';
import type { Organisation } from '../../models/organisation.js';
import type { DevolvedBody } from '../../models/emergency-services.js';

export class DevolvedExtraMapper {
  mapToOrganisation(body: DevolvedBody): Organisation {
    const id = this.generateId(body.name);
    
    return {
      id: `devolved-${id}`,
      name: body.name,
      type: OrganisationType.DEVOLVED_ADMINISTRATION,
      classification: `${this.formatNation(body.nation)} ${this.formatBodyType(body.bodyType)}`,
      status: 'active',
      ...(body.parentBody && { parentOrganisation: body.parentBody }),
      location: {
        country: 'United Kingdom',
        region: this.formatNation(body.nation)
      },
      sources: [{
        source: DataSourceType.GOV_UK_GUIDANCE,
        sourceId: body.name,
        retrievedAt: new Date().toISOString(),
        url: 'https://www.gov.uk/guidance/devolution-of-powers-to-scotland-wales-and-northern-ireland',
        confidence: 0.9
      }],
      dataQuality: {
        completeness: this.calculateCompleteness(body),
        hasConflicts: false,
        requiresReview: false
      },
      lastUpdated: new Date().toISOString(),
      additionalProperties: {
        nation: body.nation,
        bodyType: body.bodyType,
        established: body.established,
        responsibilities: body.responsibilities,
        website: body.website
      }
    };
  }

  private generateId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private formatNation(nation: string): string {
    const nationMap: Record<string, string> = {
      'scotland': 'Scotland',
      'wales': 'Wales',
      'northern_ireland': 'Northern Ireland'
    };
    return nationMap[nation] || nation;
  }

  private formatBodyType(type: string): string {
    const typeMap: Record<string, string> = {
      'parliament': 'Parliament',
      'assembly': 'Assembly',
      'government': 'Government',
      'department': 'Department',
      'agency': 'Agency',
      'public_body': 'Public Body'
    };
    return typeMap[type] || type;
  }

  private calculateCompleteness(body: DevolvedBody): number {
    const fields = ['name', 'nation', 'bodyType', 'parentBody', 'website'];
    const populated = fields.filter(field => body[field as keyof DevolvedBody]);
    return populated.length / fields.length;
  }
}