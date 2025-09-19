/**
 * Mapper for Unitary Authority data to Organisation model
 */

import type { Organisation } from '../../models/organisation.js';
import { OrganisationType, Region } from '../../models/organisation.js';
import type { UnitaryAuthorityData } from '../../models/source-data.js';
import { DataSource } from '../../models/data-source.js';

export class UnitaryAuthorityMapper {
  /**
   * Map a single unitary authority to Organisation
   */
  map(input: UnitaryAuthorityData, source: DataSource): Organisation {
    const id = this.generateId(input.name, source);
    const region = this.mapRegion(input.region);

    return {
      id,
      name: input.name,
      type: OrganisationType.UNITARY_AUTHORITY,
      classification: 'Local Government',
      status: 'active',
      region,
      location: {
        country: input.region === 'Wales' ? 'Wales' : 'England',
        region: input.region
      },
      sources: [{
        source: this.mapToDataSourceType(source),
        sourceId: input.code,
        retrievedAt: new Date().toISOString(),
        confidence: 1.0
      }],
      lastUpdated: new Date().toISOString(),
      dataQuality: {
        completeness: input.code ? 0.9 : 0.7,
        hasConflicts: false,
        requiresReview: false
      },
      additionalProperties: {
        onsCode: input.code
      }
    };
  }

  /**
   * Map multiple unitary authorities to Organisations
   */
  mapMany(inputs: UnitaryAuthorityData[], source: DataSource): Organisation[] {
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
   * Map region string to Region enum
   */
  private mapRegion(region: 'England' | 'Wales'): Region {
    return region === 'Wales' ? Region.WALES : Region.ENGLAND;
  }

  /**
   * Map DataSource to DataSourceType string for compatibility
   */
  private mapToDataSourceType(source: DataSource): string {
    const mapping: Record<DataSource, string> = {
      [DataSource.ONS]: 'ons_unitary_authorities',
      [DataSource.LAW_GOV_WALES]: 'welsh_government',
      [DataSource.WIKIPEDIA]: 'wikipedia',
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