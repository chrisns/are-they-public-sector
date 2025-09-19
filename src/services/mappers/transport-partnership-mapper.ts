/**
 * Mapper for Transport Partnership data to Organisation model
 */

import type { Organisation } from '../../models/organisation.js';
import { OrganisationType, Region } from '../../models/organisation.js';
import type { TransportPartnershipData } from '../../models/source-data.js';
import { DataSource } from '../../models/data-source.js';

export class TransportPartnershipMapper {
  /**
   * Map a single transport partnership to Organisation
   */
  map(input: TransportPartnershipData, source: DataSource): Organisation {
    const id = this.generateId(input.name, source);

    return {
      id,
      name: input.name,
      type: OrganisationType.REGIONAL_TRANSPORT_PARTNERSHIP,
      classification: 'Transport Authority',
      status: 'active',
      region: Region.SCOTLAND, // RTPs are Scottish
      location: {
        country: 'Scotland',
        region: 'Scotland'
      },
      sources: [{
        source: this.mapToDataSourceType(source),
        retrievedAt: new Date().toISOString(),
        url: input.website,
        confidence: 0.95
      }],
      lastUpdated: new Date().toISOString(),
      dataQuality: {
        completeness: this.calculateCompleteness(input),
        hasConflicts: false,
        requiresReview: false
      },
      additionalProperties: {
        abbreviation: input.abbreviation,
        memberCouncils: input.councils,
        website: input.website
      }
    };
  }

  /**
   * Map multiple transport partnerships to Organisations
   */
  mapMany(inputs: TransportPartnershipData[], source: DataSource): Organisation[] {
    return inputs.map(input => this.map(input, source));
  }

  /**
   * Generate unique ID for organisation
   */
  private generateId(name: string, source: DataSource): string {
    const normalised = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return `${normalised}-${source}`;
  }

  /**
   * Calculate data completeness score
   */
  private calculateCompleteness(input: TransportPartnershipData): number {
    let score = 0.5; // Base score for having name
    if (input.abbreviation) score += 0.2;
    if (input.councils && input.councils.length > 0) score += 0.2;
    if (input.website) score += 0.1;
    return Math.min(score, 1.0);
  }

  /**
   * Map DataSource to DataSourceType string for compatibility
   */
  private mapToDataSourceType(source: DataSource): string {
    const mapping: Record<DataSource, string> = {
      [DataSource.TRANSPORT_SCOTLAND]: 'scottish_regional_transport',
      [DataSource.ONS]: 'ons',
      [DataSource.WIKIPEDIA]: 'wikipedia',
      [DataSource.LAW_GOV_WALES]: 'welsh_government',
      [DataSource.NATIONAL_PARKS_ENGLAND]: 'national_parks',
      [DataSource.NHS]: 'nhs',
      [DataSource.HEALTHWATCH]: 'healthwatch',
      [DataSource.MYGOV_SCOT]: 'scottish_government',
      [DataSource.NHS_SCOTLAND]: 'nhs_scotland',
      [DataSource.INFRASTRUCTURE_NI]: 'ni_infrastructure',
      [DataSource.NI_GOVERNMENT]: 'ni_government',
      [DataSource.UKRI]: 'ukri'
    };
    return mapping[source] || source;
  }
}