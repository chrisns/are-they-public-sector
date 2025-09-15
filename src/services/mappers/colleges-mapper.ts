/**
 * Mapper for College entities to Organisation entities
 */

import type { College, CollegeRegion } from '../../models/college.js';
import type { Organisation } from '../../models/organisation.js';
import { OrganisationType, DataSourceType } from '../../models/organisation.js';
import { createHash } from 'crypto';

export class CollegesMapper {
  /**
   * Map College to Organisation
   */
  mapToOrganisation(college: College): Organisation {
    const id = this.generateId(college.name, 'college');
    const country = this.mapRegionToCountry(college.region);

    return {
      id,
      name: college.name,
      type: OrganisationType.EDUCATIONAL_INSTITUTION,
      classification: 'Further Education College',
      status: 'active',
      sources: [{
        source: DataSourceType.GOV_UK_GUIDANCE,
        retrievedAt: college.fetchedAt,
        url: college.source,
        confidence: 1.0
      }],
      lastUpdated: college.fetchedAt,
      dataQuality: {
        completeness: 0.7,
        hasConflicts: false,
        requiresReview: false
      },
      location: {
        region: college.region,
        country
      },
      additionalProperties: {
        subType: 'further-education-college',
        originalSource: 'aoc.co.uk'
      }
    };
  }

  /**
   * Generate unique ID for organisation
   */
  private generateId(name: string, type: string): string {
    const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const hash = createHash('md5').update(`${type}-${normalized}`).digest('hex').substring(0, 8);
    return `${type}-${normalized}-${hash}`;
  }

  /**
   * Map region to country
   */
  private mapRegionToCountry(region: CollegeRegion): string {
    switch (region) {
      case 'Scotland':
        return 'Scotland';
      case 'Wales':
        return 'Wales';
      case 'Northern Ireland':
        return 'Northern Ireland';
      default:
        return 'United Kingdom';
    }
  }
}