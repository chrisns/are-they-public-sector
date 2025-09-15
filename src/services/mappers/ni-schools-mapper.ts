/**
 * Mapper for Northern Ireland Schools
 * Converts raw NI school data to Organisation format
 */

import type { Organisation, DataSourceReference, OrganisationLocation, DataQuality } from '../../models/organisation.js';
import { OrganisationType, DataSourceType } from '../../models/organisation.js';
import type { NISchoolRaw } from '../ni-schools-parser.js';

export class NISchoolsMapper {
  /**
   * Map a single NI school to Organisation format
   */
  map(school: NISchoolRaw): Organisation {
    // Skip invalid schools
    if (!school || !school.schoolName || school.schoolName.trim() === '') {
      throw new Error('Invalid school data: missing school name');
    }

    // Build location if available
    const location = this.buildLocation(school);

    // Build additional properties to preserve all data
    const additionalProperties: Record<string, unknown> = {
      category: 'Northern Ireland School',
      subcategory: this.mapSchoolType(school.schoolType),
      identifier: school.referenceNumber,
      contact: this.buildContact(school),
      metadata: this.buildMetadata(school)
    };

    // Create data source reference
    const sourceRef: DataSourceReference = {
      source: DataSourceType.MANUAL,
      retrievedAt: new Date().toISOString(),
      confidence: 1.0
    };

    // Create data quality metadata
    const dataQuality: DataQuality = {
      completeness: this.calculateCompleteness(school),
      hasConflicts: false,
      requiresReview: false
    };

    const org: Organisation = {
      id: `ni-school-${school.referenceNumber || school.schoolName.toLowerCase().replace(/\s+/g, '-')}`,
      name: this.normalizeString(school.schoolName),
      type: OrganisationType.EDUCATIONAL_INSTITUTION,
      classification: this.mapSchoolType(school.schoolType),
      status: 'active',
      location,
      sources: [sourceRef],
      lastUpdated: new Date().toISOString(),
      dataQuality,
      additionalProperties
    };

    return org;
  }

  /**
   * Map multiple NI schools to Organisation format
   */
  mapMany(schools: NISchoolRaw[]): Organisation[] {
    if (!schools || schools.length === 0) {
      return [];
    }

    return schools
      .filter(school => this.isValidSchool(school))
      .map(school => this.map(school));
  }

  /**
   * Check if school data is valid
   */
  private isValidSchool(school: unknown): boolean {
    const s = school as NISchoolRaw;
    return !!(s &&
           s.schoolName &&
           s.schoolName.trim() !== '');
  }

  /**
   * Calculate data completeness score
   */
  private calculateCompleteness(school: NISchoolRaw): number {
    const fields = [
      school.schoolName,
      school.referenceNumber,
      school.schoolType,
      school.managementType,
      school.address1,
      school.town,
      school.postcode,
      school.telephone,
      school.email,
      school.website
    ];

    const filledFields = fields.filter(f => f !== undefined && f !== '').length;
    return filledFields / fields.length;
  }

  /**
   * Map school type to subcategory
   */
  private mapSchoolType(schoolType?: string): string {
    if (!schoolType) {
      return 'Other School';
    }

    const typeMap: { [key: string]: string } = {
      'primary': 'Primary School',
      'post-primary': 'Post-Primary School',
      'post primary': 'Post-Primary School',
      'secondary': 'Post-Primary School',
      'grammar': 'Post-Primary School',
      'special': 'Special School',
      'nursery': 'Nursery School',
      'prep': 'Primary School',
      'preparatory': 'Primary School'
    };

    const normalizedType = schoolType.toLowerCase().trim();

    // Check for exact matches first
    if (typeMap[normalizedType]) {
      return typeMap[normalizedType];
    }

    // Check for partial matches
    for (const [key, value] of Object.entries(typeMap)) {
      if (normalizedType.includes(key)) {
        return value;
      }
    }

    return 'Other School';
  }

  /**
   * Build location object from school data
   */
  private buildLocation(school: NISchoolRaw): OrganisationLocation | undefined {
    const addressParts = [];

    if (school.address1) {
      addressParts.push(this.normalizeString(school.address1));
    }
    if (school.address2) {
      addressParts.push(this.normalizeString(school.address2));
    }
    if (school.address3) {
      addressParts.push(this.normalizeString(school.address3));
    }

    const hasLocation = addressParts.length > 0 || school.town || school.postcode;

    if (!hasLocation) {
      return undefined;
    }

    const location: OrganisationLocation = {
      country: 'Northern Ireland'
    };

    if (addressParts.length > 0) {
      location.address = addressParts.join(', ');
    }

    if (school.town) {
      location.region = this.normalizeString(school.town);
    }

    // Store postcode in additional properties since it's not in the interface
    // Will be preserved via additionalProperties

    return location;
  }

  /**
   * Build contact object from school data
   */
  private buildContact(school: NISchoolRaw): Record<string, string> | undefined {
    const hasContact = school.telephone || school.email || school.website;

    if (!hasContact) {
      return undefined;
    }

    const contact: Record<string, string> = {};

    if (school.telephone) {
      contact['telephone'] = this.normalizeString(school.telephone);
    }

    if (school.email) {
      contact['email'] = this.normalizeString(school.email);
    }

    if (school.website) {
      contact['website'] = this.normalizeString(school.website);
    }

    return contact;
  }

  /**
   * Build metadata object from school data
   */
  private buildMetadata(school: NISchoolRaw): Record<string, unknown> {
    const metadata: Record<string, unknown> = {
      sourceSystem: 'NI Education Department',
      lastUpdated: new Date().toISOString()
    };

    if (school.managementType) {
      metadata['managementType'] = this.normalizeString(school.managementType);
    }

    if (school.principalName) {
      metadata['principal'] = this.normalizeString(school.principalName);
    }

    if (school.enrolment !== undefined) {
      metadata['enrolment'] = school.enrolment;
    }

    if (school.ageRange) {
      metadata['ageRange'] = this.normalizeString(school.ageRange);
    }

    if (school.ward) {
      metadata['ward'] = this.normalizeString(school.ward);
    }

    if (school.constituency) {
      metadata['constituency'] = this.normalizeString(school.constituency);
    }

    if (school.postcode) {
      metadata['postcode'] = this.normalizeString(school.postcode);
    }

    return metadata;
  }

  /**
   * Normalize string by trimming and removing extra spaces
   */
  private normalizeString(value?: string): string {
    if (!value) {
      return '';
    }

    return value
      .trim()
      .replace(/\s+/g, ' ');  // Replace multiple spaces with single space
  }
}