/**
 * Mapper for Schools data to Organisation model
 * Updated to handle both legacy School interface and new GIASSchool CSV format
 */

import type { School } from '../../models/school.js';
import type { GIASSchool } from '../gias-csv-fetcher.js';
import type { Organisation, DataSourceReference } from '../../models/organisation.js';
import { DataSourceType, OrganisationType } from '../../models/organisation.js';

export class SchoolsMapper {
  /**
   * Map a single school to Organisation model (legacy interface)
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
   * Map a GIAS CSV school to Organisation model
   */
  mapGIAS(school: GIASSchool): Organisation {
    // Build full address
    const addressParts = [
      school.Street,
      school.Locality,
      school.Town,
      school['County (name)'],
      school.Postcode
    ].filter(part => part && part.trim());
    const fullAddress = addressParts.join(', ');

    // Determine organisation type
    const orgType = this.determineOrgTypeFromCSV(school['TypeOfEstablishment (name)'] || '');

    // Build additional properties
    const additionalProperties: Record<string, unknown> = {
      urn: school.URN,
      localAuthority: school['LA (name)'],
      localAuthorityCode: school['LA (code)'],
      establishmentType: school['TypeOfEstablishment (name)'],
      establishmentTypeCode: school['TypeOfEstablishment (code)'],
      phaseOfEducation: school['PhaseOfEducation (name)'],
      phaseOfEducationCode: school['PhaseOfEducation (code)'],
      subcategory: this.determineSubcategoryFromCSV(school['TypeOfEstablishment (name)'] || ''),
      statutoryAgeRange: school.StatutoryLowAge && school.StatutoryHighAge
        ? `${school.StatutoryLowAge}-${school.StatutoryHighAge}`
        : undefined,
      numberOfPupils: school.NumberOfPupils ? parseInt(school.NumberOfPupils) : undefined
    };

    // Add head teacher info if available
    if (school.HeadFirstName || school.HeadLastName) {
      const headName = [school.HeadTitle, school.HeadFirstName, school.HeadLastName]
        .filter(p => p)
        .join(' ');
      additionalProperties['headTeacher'] = headName;
    }

    // Create data source reference
    const sourceRef: DataSourceReference = {
      source: DataSourceType.GIAS,
      sourceId: school.URN,
      retrievedAt: new Date().toISOString(),
      confidence: 1.0
    };

    const org: Organisation = {
      id: `gias-${school.URN}`,
      name: school.EstablishmentName,
      type: orgType,
      classification: 'School',
      status: school['EstablishmentStatus (name)'] === 'Open' ? 'active' : 'inactive',
      location: {
        address: fullAddress,
        postalCode: school.Postcode,
        region: school['GOR (name)'],
        country: 'United Kingdom'
      },
      sources: [sourceRef],
      lastUpdated: new Date().toISOString(),
      dataQuality: {
        completeness: this.calculateGIASCompleteness(school),
        hasConflicts: false,
        requiresReview: false,
        source: 'gias_csv'
      },
      additionalProperties
    };

    // Add contact info if available
    if (school.SchoolWebsite || school.TelephoneNum) {
      org.contact = {};
      if (school.SchoolWebsite) {
        org.website = school.SchoolWebsite;
      }
      if (school.TelephoneNum) {
        org.contact.phone = school.TelephoneNum;
      }
    }

    return org;
  }

  /**
   * Map multiple schools to Organisation model (legacy)
   */
  mapMultiple(schools: School[]): Organisation[] {
    return schools.map(school => this.map(school));
  }

  /**
   * Map multiple GIAS CSV schools to Organisation model
   */
  mapMany(schools: GIASSchool[]): Organisation[] {
    return schools.map(school => this.mapGIAS(school));
  }

  /**
   * Determine organisation type from CSV TypeOfEstablishment field
   */
  private determineOrgTypeFromCSV(typeOfEstablishment: string): OrganisationType {
    const lowerType = typeOfEstablishment.toLowerCase();

    // Check for academy
    if (lowerType.includes('academy')) {
      return OrganisationType.ACADEMY_TRUST;
    }

    // Check for local authority
    if (lowerType.includes('community') ||
        lowerType.includes('voluntary') ||
        lowerType.includes('foundation')) {
      return OrganisationType.LOCAL_AUTHORITY;
    }

    // Default to educational institution
    return OrganisationType.EDUCATIONAL_INSTITUTION;
  }

  /**
   * Determine organisation type based on phase type (legacy)
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
   * Determine subcategory from CSV TypeOfEstablishment
   */
  private determineSubcategoryFromCSV(typeOfEstablishment: string): string {
    const lowerType = typeOfEstablishment.toLowerCase();

    // Academy types
    if (lowerType.includes('academy converter')) return 'Academy Converter';
    if (lowerType.includes('academy sponsor led')) return 'Academy Sponsor Led';
    if (lowerType.includes('academy special')) return 'Academy Special School';
    if (lowerType.includes('academy 16-19')) return 'Academy 16-19';
    if (lowerType.includes('academy alternative')) return 'Academy Alternative Provision';

    // Community schools
    if (lowerType.includes('community school')) return 'Community School';
    if (lowerType.includes('community special')) return 'Community Special School';

    // Voluntary schools
    if (lowerType.includes('voluntary aided')) return 'Voluntary Aided School';
    if (lowerType.includes('voluntary controlled')) return 'Voluntary Controlled School';

    // Foundation schools
    if (lowerType.includes('foundation school')) return 'Foundation School';
    if (lowerType.includes('foundation special')) return 'Foundation Special School';

    // Free schools
    if (lowerType.includes('free schools')) return 'Free School';
    if (lowerType.includes('free schools special')) return 'Free School Special';

    // Other types
    if (lowerType.includes('pupil referral unit')) return 'Pupil Referral Unit';
    if (lowerType.includes('nursery')) return 'Nursery School';
    if (lowerType.includes('studio schools')) return 'Studio School';
    if (lowerType.includes('university technical college')) return 'University Technical College';
    if (lowerType.includes('city technology college')) return 'City Technology College';
    if (lowerType.includes('sixth form centres')) return 'Sixth Form Centre';
    if (lowerType.includes('further education')) return 'Further Education College';

    // Default to the type itself
    return typeOfEstablishment || 'School';
  }

  /**
   * Determine subcategory based on phase type (legacy)
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

    // Default value if no specific phase type is matched
    return phaseType || 'School';
  }

  /**
   * Calculate data completeness score for a GIAS CSV school
   */
  private calculateGIASCompleteness(school: GIASSchool): number {
    let fields = 0;
    let completed = 0;

    // Check required fields
    const fieldChecks = [
      school.URN,
      school.EstablishmentName,
      school['EstablishmentStatus (name)'],
      school['TypeOfEstablishment (name)'],
      school['PhaseOfEducation (name)'],
      school['LA (name)'],
      school.Postcode,
      school.Street || school.Town,
      school.SchoolWebsite,
      school.TelephoneNum
    ];

    fields = fieldChecks.length;
    completed = fieldChecks.filter(f => f !== undefined && f !== null && f !== '').length;

    return completed / fields;
  }

  /**
   * Calculate data completeness score for a school (legacy)
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