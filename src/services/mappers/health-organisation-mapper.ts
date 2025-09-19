/**
 * Mapper for Health Organisation data to Organisation model
 */

import type { Organisation } from '../../models/organisation.js';
import { OrganisationType, Region } from '../../models/organisation.js';
import type { HealthOrganisationData } from '../../models/source-data.js';
import { DataSource } from '../../models/data-source.js';

export class HealthOrganisationMapper {
  /**
   * Map a single health organisation to Organisation
   */
  map(input: HealthOrganisationData, source: DataSource): Organisation {
    const id = this.generateId(input.name, source);
    const type = this.mapHealthType(input.type);
    const region = this.detectRegion(source, input.area);

    return {
      id,
      name: input.name,
      type,
      classification: 'Health Service',
      status: 'active',
      region,
      location: {
        country: this.getCountryFromRegion(region),
        region: input.area || region
      },
      parentOrganisation: input.parentOrg,
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
        serviceArea: input.area,
        website: input.website,
        healthOrgType: input.type
      }
    };
  }

  /**
   * Map multiple health organisations to Organisations
   */
  mapMany(inputs: HealthOrganisationData[], source: DataSource): Organisation[] {
    return inputs.map(input => this.map(input, source));
  }

  /**
   * Map health organisation type to OrganisationType
   */
  private mapHealthType(type: 'health_board' | 'integrated_care_board' | 'local_healthwatch'): OrganisationType {
    switch (type) {
      case 'health_board':
        return OrganisationType.HEALTH_BOARD;
      case 'integrated_care_board':
        return OrganisationType.INTEGRATED_CARE_BOARD;
      case 'local_healthwatch':
        return OrganisationType.LOCAL_HEALTHWATCH;
      default:
        return OrganisationType.PUBLIC_BODY;
    }
  }

  /**
   * Detect region based on source and area
   */
  private detectRegion(source: DataSource, area?: string): Region {
    // Source-based detection
    if (source === DataSource.NHS_SCOTLAND) {
      return Region.SCOTLAND;
    }
    if (source === DataSource.NHS || source === DataSource.HEALTHWATCH) {
      return Region.ENGLAND;
    }

    // Area-based detection
    if (area) {
      const lowerArea = area.toLowerCase();
      if (lowerArea.includes('scotland') || lowerArea.includes('scottish')) {
        return Region.SCOTLAND;
      }
      if (lowerArea.includes('wales') || lowerArea.includes('welsh')) {
        return Region.WALES;
      }
      if (lowerArea.includes('northern ireland') || lowerArea.includes('belfast')) {
        return Region.NORTHERN_IRELAND;
      }
    }

    return Region.ENGLAND; // Default to England
  }

  /**
   * Get country from region
   */
  private getCountryFromRegion(region: Region): string {
    switch (region) {
      case Region.SCOTLAND:
        return 'Scotland';
      case Region.WALES:
        return 'Wales';
      case Region.NORTHERN_IRELAND:
        return 'Northern Ireland';
      case Region.UK_WIDE:
        return 'United Kingdom';
      default:
        return 'England';
    }
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
  private calculateCompleteness(input: HealthOrganisationData): number {
    let score = 0.5; // Base score for having name and type
    if (input.area) score += 0.2;
    if (input.website) score += 0.2;
    if (input.parentOrg) score += 0.1;
    return Math.min(score, 1.0);
  }

  /**
   * Map DataSource to DataSourceType string for compatibility
   */
  private mapToDataSourceType(source: DataSource): string {
    const mapping: Record<DataSource, string> = {
      [DataSource.NHS]: 'nhs_integrated_care_boards',
      [DataSource.NHS_SCOTLAND]: 'nhs_scotland_boards',
      [DataSource.HEALTHWATCH]: 'local_healthwatch',
      [DataSource.ONS]: 'ons',
      [DataSource.WIKIPEDIA]: 'wikipedia',
      [DataSource.LAW_GOV_WALES]: 'welsh_government',
      [DataSource.NATIONAL_PARKS_ENGLAND]: 'national_parks',
      [DataSource.MYGOV_SCOT]: 'scottish_government',
      [DataSource.TRANSPORT_SCOTLAND]: 'transport_scotland',
      [DataSource.INFRASTRUCTURE_NI]: 'ni_infrastructure',
      [DataSource.NI_GOVERNMENT]: 'ni_government',
      [DataSource.UKRI]: 'ukri'
    };
    return mapping[source] || source;
  }
}