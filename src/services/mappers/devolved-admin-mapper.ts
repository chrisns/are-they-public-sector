/**
 * Mapper for Devolved Administration data to Organisation model
 */

import type { DevolvedAdmin } from '../../models/devolved-admin.js';
import type { Organisation, DataSourceReference } from '../../models/organisation.js';
import { DataSourceType, OrganisationType } from '../../models/organisation.js';

export class DevolvedAdminMapper {
  /**
   * Map a single devolved admin entity to Organisation model
   */
  map(entity: DevolvedAdmin): Organisation {
    // Determine organisation type based on entity type
    const orgType = this.determineOrgType(entity.type);
    
    // Build additional properties object
    const additionalProperties: Record<string, string | string[] | undefined> = {
      entityType: entity.type,
      administration: entity.administration,
      subcategory: this.determineSubcategory(entity)
    };

    if (entity.parentId) {
      additionalProperties['parentId'] = entity.parentId;
    }

    if (entity.established) {
      additionalProperties['established'] = entity.established;
    }

    if (entity.minister) {
      additionalProperties['minister'] = entity.minister;
    }

    if (entity.responsibilities && entity.responsibilities.length > 0) {
      additionalProperties['responsibilities'] = entity.responsibilities;
    }

    if (entity.alternativeNames && entity.alternativeNames.length > 0) {
      additionalProperties['alternativeNames'] = entity.alternativeNames;
    }

    // Create data source reference
    const sourceRef: DataSourceReference = {
      source: DataSourceType.MANUAL,
      sourceId: entity.id,
      retrievedAt: new Date().toISOString(),
      confidence: 1.0
    };

    // Determine country based on administration
    const country = this.determineCountry(entity.administration);

    return {
      id: `devolved-${entity.id}`,
      name: entity.name,
      type: orgType,
      classification: this.determineClassification(entity),
      status: 'active', // All devolved entities are assumed active
      ...(entity.website && { website: entity.website }),
      location: {
        country
      },
      sources: [sourceRef],
      lastUpdated: new Date().toISOString(),
      dataQuality: {
        completeness: this.calculateCompleteness(entity),
        hasConflicts: false,
        requiresReview: false
      },
      additionalProperties
    };
  }

  /**
   * Map multiple devolved admin entities to Organisation model
   */
  mapMultiple(entities: DevolvedAdmin[]): Organisation[] {
    return entities.map(entity => this.map(entity));
  }

  /**
   * Determine organisation type based on entity type
   */
  private determineOrgType(entityType: string): OrganisationType {
    switch (entityType) {
      case 'parliament':
        return OrganisationType.LEGISLATIVE_BODY;
      case 'government':
      case 'department':
      case 'directorate':
        return OrganisationType.MINISTERIAL_DEPARTMENT;
      case 'agency':
        return OrganisationType.EXECUTIVE_AGENCY;
      case 'public_body':
        return OrganisationType.PUBLIC_BODY;
      default:
        return OrganisationType.PUBLIC_BODY;
    }
  }

  /**
   * Determine classification based on entity
   */
  private determineClassification(entity: DevolvedAdmin): string {
    const administration = entity.administration.replace('_', ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    switch (entity.type) {
      case 'parliament':
        return `${administration} Legislature`;
      case 'government':
        return `${administration} Executive`;
      case 'department':
        return `${administration} Government Department`;
      case 'directorate':
        return `${administration} Government Directorate`;
      case 'agency':
        return `${administration} Executive Agency`;
      case 'public_body':
        return `${administration} Public Body`;
      default:
        return `${administration} Government`;
    }
  }

  /**
   * Determine subcategory based on entity
   */
  private determineSubcategory(entity: DevolvedAdmin): string {
    // For departments/directorates, try to categorize by responsibilities
    if (entity.responsibilities && entity.responsibilities.length > 0) {
      const respString = entity.responsibilities.join(' ').toLowerCase();
      
      if (respString.includes('health') || respString.includes('nhs')) {
        return 'Health and Social Care';
      }
      if (respString.includes('education') || respString.includes('schools')) {
        return 'Education and Skills';
      }
      if (respString.includes('economy') || respString.includes('business')) {
        return 'Economy and Business';
      }
      if (respString.includes('environment') || respString.includes('natural')) {
        return 'Environment and Natural Resources';
      }
      if (respString.includes('justice') || respString.includes('police')) {
        return 'Justice and Security';
      }
      if (respString.includes('transport') || respString.includes('infrastructure')) {
        return 'Infrastructure and Transport';
      }
      if (respString.includes('finance') || respString.includes('spending')) {
        return 'Finance and Public Spending';
      }
      if (respString.includes('communities') || respString.includes('housing')) {
        return 'Communities and Local Government';
      }
    }

    // Default based on type
    switch (entity.type) {
      case 'parliament':
        return 'Legislative Body';
      case 'government':
        return 'Executive Government';
      case 'department':
        return 'Government Department';
      case 'directorate':
        return 'Government Directorate';
      case 'agency':
        return 'Executive Agency';
      default:
        return 'Public Body';
    }
  }

  /**
   * Determine country based on administration
   */
  private determineCountry(administration: string): string {
    switch (administration) {
      case 'scotland':
        return 'Scotland';
      case 'wales':
        return 'Wales';
      case 'northern_ireland':
        return 'Northern Ireland';
      default:
        return 'United Kingdom';
    }
  }

  /**
   * Calculate data completeness score for an entity
   */
  private calculateCompleteness(entity: DevolvedAdmin): number {
    let fields = 0;
    let completed = 0;

    // Check required fields
    const fieldChecks = [
      entity.id,
      entity.name,
      entity.type,
      entity.administration,
      entity.website,
      entity.established,
      entity.minister,
      entity.responsibilities && entity.responsibilities.length > 0,
      entity.alternativeNames && entity.alternativeNames.length > 0
    ];

    fields = fieldChecks.length;
    completed = fieldChecks.filter(f => f !== undefined && f !== null && f !== false).length;

    return completed / fields;
  }
}