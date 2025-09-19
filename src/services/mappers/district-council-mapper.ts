/**
 * Mapper for District Council data to Organisation model
 */

import type { Organisation } from '../../models/organisation.js';
import { OrganisationType, Region } from '../../models/organisation.js';
import type { DistrictCouncilData } from '../../models/source-data.js';
import { DataSource } from '../../models/data-source.js';

export class DistrictCouncilMapper {
  /**
   * Map a single district council to Organisation
   */
  map(input: DistrictCouncilData, source: DataSource): Organisation {
    const id = this.generateId(input.name, source);

    return {
      id,
      name: input.name,
      type: OrganisationType.DISTRICT_COUNCIL,
      subType: input.type, // Borough, City, District
      classification: 'Local Government',
      status: 'active',
      region: Region.ENGLAND, // Districts are only in England
      location: {
        country: 'England',
        region: input.county || 'England'
      },
      sources: [{
        source: this.mapToDataSourceType(source),
        retrievedAt: new Date().toISOString(),
        confidence: 0.9
      }],
      lastUpdated: new Date().toISOString(),
      dataQuality: {
        completeness: this.calculateCompleteness(input),
        hasConflicts: false,
        requiresReview: false
      },
      additionalProperties: {
        county: input.county,
        districtType: input.type,
        population: input.population
      }
    };
  }

  /**
   * Map multiple district councils to Organisations
   */
  mapMany(inputs: DistrictCouncilData[], source: DataSource): Organisation[] {
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
  private calculateCompleteness(input: DistrictCouncilData): number {
    let score = 0.5; // Base score for having name
    if (input.county) score += 0.2;
    if (input.type) score += 0.2;
    if (input.population) score += 0.1;
    return Math.min(score, 1.0);
  }

  /**
   * Map DataSource to DataSourceType string for compatibility
   */
  private mapToDataSourceType(source: DataSource): string {
    const mapping: Record<DataSource, string> = {
      [DataSource.WIKIPEDIA]: 'wikipedia_districts',
      [DataSource.ONS]: 'ons',
      [DataSource.LAW_GOV_WALES]: 'welsh_government',
      [DataSource.NATIONAL_PARKS_ENGLAND]: 'national_parks',
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