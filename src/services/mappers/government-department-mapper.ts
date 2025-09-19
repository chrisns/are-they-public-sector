/**
 * Mapper for Government Department data to Organisation model
 */

import type { Organisation } from '../../models/organisation.js';
import { OrganisationType, Region } from '../../models/organisation.js';
import type { GovernmentDepartmentData } from '../../models/source-data.js';
import { DataSource } from '../../models/data-source.js';

export class GovernmentDepartmentMapper {
  /**
   * Map a single government department to Organisation
   */
  map(input: GovernmentDepartmentData, source: DataSource): Organisation {
    const id = this.generateId(input.name, source);
    const region = this.detectRegion(source);

    return {
      id,
      name: input.name,
      type: OrganisationType.GOVERNMENT_DEPARTMENT,
      classification: 'Government Department',
      status: 'active',
      region,
      location: {
        country: this.getCountryFromRegion(region),
        region: this.getCountryFromRegion(region)
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
        minister: input.minister,
        responsibilities: input.responsibilities,
        website: input.website
      }
    };
  }

  /**
   * Map multiple government departments to Organisations
   */
  mapMany(inputs: GovernmentDepartmentData[], source: DataSource): Organisation[] {
    return inputs.map(input => this.map(input, source));
  }

  /**
   * Detect region based on source
   */
  private detectRegion(source: DataSource): Region {
    if (source === DataSource.NI_GOVERNMENT) {
      return Region.NORTHERN_IRELAND;
    }
    // Could be extended for Scottish/Welsh government departments
    return Region.UK_WIDE;
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
  private calculateCompleteness(input: GovernmentDepartmentData): number {
    let score = 0.5; // Base score for having name
    if (input.minister) score += 0.2;
    if (input.responsibilities && input.responsibilities.length > 0) score += 0.2;
    if (input.website) score += 0.1;
    return Math.min(score, 1.0);
  }

  /**
   * Map DataSource to DataSourceType string for compatibility
   */
  private mapToDataSourceType(source: DataSource): string {
    const mapping: Record<DataSource, string> = {
      [DataSource.NI_GOVERNMENT]: 'ni_government_departments',
      [DataSource.ONS]: 'ons',
      [DataSource.WIKIPEDIA]: 'wikipedia',
      [DataSource.LAW_GOV_WALES]: 'welsh_government',
      [DataSource.NATIONAL_PARKS_ENGLAND]: 'national_parks',
      [DataSource.NHS]: 'nhs',
      [DataSource.HEALTHWATCH]: 'healthwatch',
      [DataSource.MYGOV_SCOT]: 'scottish_government',
      [DataSource.NHS_SCOTLAND]: 'nhs_scotland',
      [DataSource.TRANSPORT_SCOTLAND]: 'transport_scotland',
      [DataSource.INFRASTRUCTURE_NI]: 'ni_infrastructure',
      [DataSource.UKRI]: 'ukri'
    };
    return mapping[source] || source;
  }
}