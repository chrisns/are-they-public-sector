/**
 * Mapper for National Park Authority data to Organisation model
 */

import type { Organisation } from '../../models/organisation.js';
import { OrganisationType, Region } from '../../models/organisation.js';
import type { NationalParkData } from '../../models/source-data.js';
import { DataSource } from '../../models/data-source.js';

export class NationalParkMapper {
  /**
   * Map a single national park authority to Organisation
   */
  map(input: NationalParkData, source: DataSource): Organisation {
    const id = this.generateId(input.name, source);

    return {
      id,
      name: input.name + ' National Park Authority',
      type: OrganisationType.UNITARY_AUTHORITY,
      subType: 'National Park Authority',
      classification: 'Local Government',
      status: 'active',
      region: Region.ENGLAND, // All English/Welsh national parks
      location: {
        country: 'England',
        region: input.area || 'England'
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
        established: input.established,
        area: input.area,
        website: input.website
      }
    };
  }

  /**
   * Map multiple national park authorities to Organisations
   */
  mapMany(inputs: NationalParkData[], source: DataSource): Organisation[] {
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
    return `${normalised}-national-park-${source}`;
  }

  /**
   * Calculate data completeness score
   */
  private calculateCompleteness(input: NationalParkData): number {
    let score = 0.5; // Base score for having name
    if (input.established) score += 0.2;
    if (input.area) score += 0.2;
    if (input.website) score += 0.1;
    return Math.min(score, 1.0);
  }

  /**
   * Map DataSource to DataSourceType string for compatibility
   */
  private mapToDataSourceType(source: DataSource): string {
    const mapping: Record<DataSource, string> = {
      [DataSource.NATIONAL_PARKS_ENGLAND]: 'national_parks_authorities',
      [DataSource.ONS]: 'ons',
      [DataSource.WIKIPEDIA]: 'wikipedia',
      [DataSource.LAW_GOV_WALES]: 'welsh_government',
      [DataSource.NHS]: 'nhs',
      [DataSource.HEALTHWATCH]: 'healthwatch',
      [DataSource.MYGOV_SCOT]: 'scottish_government',
      [DataSource.NHS_SCOTLAND]: 'nhs_scotland',
      [DataSource.TRANSPORT_SCOTLAND]: 'transport_scotland',
      [DataSource.INFRASTRUCTURE_NI]: 'ni_infrastructure',
      [DataSource.NI_GOVERNMENT]: 'ni_government',
      [DataSource.UKRI]: 'ukri'
    };
    return mapping[source] || source;
  }
}