/**
 * Mapper for Schools data to Organisation model
 */

import type { School } from '../../models/school.js';
import type { Organisation, DataSourceReference } from '../../models/organisation.js';
import { DataSourceType, OrganisationType } from '../../models/organisation.js';

export class SchoolsMapper {
  /**
   * Map a single school to Organisation model
   */
  map(school: School): Organisation {
    // Determine organisation type based on phase type
    const orgType = this.determineOrgType(school.phaseType);
    
    // Build additional properties object
    const additionalProperties: Record<string, unknown> = {
      urn: school.urn,
      localAuthority: school.localAuthority,
      laestab: school.laestab,
      address: school.address,
      phaseType: school.phaseType,
      subcategory: this.determineSubcategory(school.phaseType)
    };

    // Add location if available
    if (school.latitude !== undefined && school.longitude !== undefined) {
      additionalProperties['coordinates'] = {
        lat: school.latitude,
        lng: school.longitude
      };
    }

    // Create data source reference
    const sourceRef: DataSourceReference = {
      source: DataSourceType.GIAS,
      sourceId: school.urn.toString(),
      retrievedAt: new Date().toISOString(),
      confidence: 1.0
    };

    return {
      id: `gias-${school.urn}`,
      name: school.name,
      type: orgType,
      classification: this.determineClassification(school.phaseType),
      status: school.status === 'Open' ? 'active' : 'inactive',
      location: {
        address: school.address,
        country: 'United Kingdom'
      },
      sources: [sourceRef],
      lastUpdated: new Date().toISOString(),
      dataQuality: {
        completeness: this.calculateCompleteness(school),
        hasConflicts: false,
        requiresReview: false
      },
      additionalProperties
    };
  }

  /**
   * Map multiple schools to Organisation model
   */
  mapMultiple(schools: School[]): Organisation[] {
    return schools.map(school => this.map(school));
  }

  /**
   * Determine organisation type based on phase type
   */
  private determineOrgType(phaseType: string): OrganisationType {
    const lowerPhase = phaseType.toLowerCase();
    
    // Check for academy
    if (lowerPhase.includes('academy')) {
      return OrganisationType.ACADEMY_TRUST;
    }
    
    // Default to educational institution
    return OrganisationType.EDUCATIONAL_INSTITUTION;
  }

  /**
   * Determine classification based on phase type
   */
  private determineClassification(phaseType: string): string {
    const lowerPhase = phaseType.toLowerCase();
    
    if (lowerPhase.includes('primary')) {
      return 'Primary Education';
    }
    if (lowerPhase.includes('secondary')) {
      return 'Secondary Education';
    }
    if (lowerPhase.includes('special')) {
      return 'Special Education';
    }
    if (lowerPhase.includes('nursery')) {
      return 'Early Years Education';
    }
    if (lowerPhase.includes('sixth form') || lowerPhase.includes('college')) {
      return 'Further Education';
    }
    
    return 'Education';
  }

  /**
   * Determine subcategory based on phase type
   */
  private determineSubcategory(phaseType: string): string {
    const lowerPhase = phaseType.toLowerCase();
    
    // Primary detection
    if (lowerPhase.includes('primary')) {
      if (lowerPhase.includes('academy')) {
        return 'Primary Academy';
      }
      if (lowerPhase.includes('voluntary')) {
        return 'Primary Voluntary School';
      }
      if (lowerPhase.includes('community')) {
        return 'Primary Community School';
      }
      return 'Primary School';
    }
    
    // Secondary detection
    if (lowerPhase.includes('secondary')) {
      if (lowerPhase.includes('academy')) {
        return 'Secondary Academy';
      }
      if (lowerPhase.includes('voluntary')) {
        return 'Secondary Voluntary School';
      }
      if (lowerPhase.includes('community')) {
        return 'Secondary Community School';
      }
      return 'Secondary School';
    }
    
    // Special schools
    if (lowerPhase.includes('special')) {
      return 'Special School';
    }
    
    // Nursery schools
    if (lowerPhase.includes('nursery')) {
      return 'Nursery School';
    }
    
    // All-through schools
    if (lowerPhase.includes('all-through') || lowerPhase.includes('all through')) {
      return 'All-through School';
    }
    
    // Sixth form colleges
    if (lowerPhase.includes('sixth form')) {
      return 'Sixth Form College';
    }
    
    // Further education
    if (lowerPhase.includes('further education') || lowerPhase.includes('fe ')) {
      return 'Further Education College';
    }
    
    // Pupil referral units
    if (lowerPhase.includes('pupil referral') || lowerPhase.includes('pru')) {
      return 'Pupil Referral Unit';
    }
    
    // Alternative provision
    if (lowerPhase.includes('alternative provision')) {
      return 'Alternative Provision';
    }
    
    // Free schools
    if (lowerPhase.includes('free school')) {
      return 'Free School';
    }
    
    // Studio schools
    if (lowerPhase.includes('studio')) {
      return 'Studio School';
    }
    
    // University technical colleges
    if (lowerPhase.includes('university technical') || lowerPhase.includes('utc')) {
      return 'University Technical College';
    }
    
    // Default fallback
    return phaseType || 'School';
  }

  /**
   * Calculate data completeness score for a school
   */
  private calculateCompleteness(school: School): number {
    let fields = 0;
    let completed = 0;

    // Check required fields
    const fieldChecks = [
      school.urn,
      school.name,
      school.status,
      school.phaseType,
      school.localAuthority,
      school.laestab,
      school.address,
      school.latitude,
      school.longitude
    ];

    fields = fieldChecks.length;
    completed = fieldChecks.filter(f => f !== undefined && f !== null && f !== '').length;

    return completed / fields;
  }
}