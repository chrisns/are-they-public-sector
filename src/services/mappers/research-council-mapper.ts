/**
 * Mapper for Research Council data to Organisation model
 */

import type { Organisation } from '../../models/organisation.js';
import { OrganisationType, Region } from '../../models/organisation.js';
import type { ResearchCouncilData } from '../../models/source-data.js';
import { DataSource } from '../../models/data-source.js';

export class ResearchCouncilMapper {
  /**
   * Map a single research council to Organisation
   */
  map(input: ResearchCouncilData, source: DataSource): Organisation {
    const id = this.generateId(input.name, source);

    return {
      id,
      name: input.fullName || input.name,
      alternativeNames: input.fullName ? [input.name] : undefined,
      type: OrganisationType.RESEARCH_COUNCIL,
      classification: 'Research and Innovation',
      status: 'active',
      region: Region.UK_WIDE, // Research councils are UK-wide
      location: {
        country: 'United Kingdom',
        region: 'UK-wide'
      },
      parentOrganisation: 'uk-research-innovation-ukri', // All councils are part of UKRI
      sources: [{
        source: this.mapToDataSourceType(source),
        retrievedAt: new Date().toISOString(),
        url: input.website,
        confidence: 1.0
      }],
      lastUpdated: new Date().toISOString(),
      dataQuality: {
        completeness: this.calculateCompleteness(input),
        hasConflicts: false,
        requiresReview: false
      },
      additionalProperties: {
        abbreviation: input.abbreviation,
        researchArea: input.researchArea,
        website: input.website,
        shortName: input.name
      }
    };
  }

  /**
   * Map multiple research councils to Organisations
   */
  mapMany(inputs: ResearchCouncilData[], source: DataSource): Organisation[] {
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
  private calculateCompleteness(input: ResearchCouncilData): number {
    let score = 0.5; // Base score for having name
    if (input.abbreviation) score += 0.15;
    if (input.fullName) score += 0.15;
    if (input.researchArea) score += 0.1;
    if (input.website) score += 0.1;
    return Math.min(score, 1.0);
  }

  /**
   * Map DataSource to DataSourceType string for compatibility
   */
  private mapToDataSourceType(source: DataSource): string {
    const mapping: Record<DataSource, string> = {
      [DataSource.UKRI]: 'uk_research_councils',
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
      [DataSource.NI_GOVERNMENT]: 'ni_government'
    };
    return mapping[source] || source;
  }
}