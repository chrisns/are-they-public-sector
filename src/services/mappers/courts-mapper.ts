/**
 * Mapper for converting Court entities to Organisation model
 */

import type { Court, CourtType as CourtTypeEnum, CourtStatus, Jurisdiction, CourtLocation } from '../../models/court.js';
import type { Organisation, OrganisationLocation, DataSourceType } from '../../models/organisation.js';
import { OrganisationType } from '../../models/organisation.js';
import crypto from 'crypto';

export class CourtsMapper {
  map(court: Court): Organisation {
    if (!court.name || court.name.trim() === '') {
      throw new Error('Invalid court: missing name');
    }

    return {
      id: this.generateId(court),
      name: court.name,
      type: OrganisationType.JUDICIAL_BODY,
      classification: this.getClassification(court.type),
      status: this.mapStatus(court.status),
      location: this.mapLocation(court.location, court.jurisdiction),
      sources: [{
        source: this.mapDataSource(court.sourceSystem),
        retrievedAt: court.lastUpdated,
        confidence: 1.0
      }],
      lastUpdated: court.lastUpdated,
      dataQuality: {
        completeness: this.calculateCompleteness(court),
        hasConflicts: false,
        requiresReview: false
      },
      additionalProperties: {
        courtTypes: court.type,
        jurisdiction: court.jurisdiction,
        areasOfLaw: court.areasOfLaw,
        services: court.services,
        contact: court.contact,
        identifier: court.identifier,
        slug: court.slug,
        sourceSystem: court.sourceSystem
      }
    };
  }

  mapMany(courts: Court[]): Organisation[] {
    return courts
      .filter(court => court.name && court.name.trim() !== '')
      .map(court => this.map(court));
  }

  private generateId(court: Court): string {
    // Generate a stable ID based on court name, jurisdiction and type
    const baseString = `${court.jurisdiction}-${court.name}-${court.type.join(',')}`.toLowerCase();
    return crypto.createHash('md5').update(baseString).digest('hex');
  }

  private getClassification(types: CourtTypeEnum[]): string {
    // Return the first type as the primary classification
    if (types.length === 0) {
      return 'Court';
    }
    return types[0];
  }

  private mapStatus(status: CourtStatus): 'active' | 'inactive' {
    if (status === 'inactive') {
      return 'inactive';
    }
    // Default to active for unknown or active status
    return 'active';
  }

  private mapLocation(location?: CourtLocation, jurisdiction?: Jurisdiction): OrganisationLocation | undefined {
    if (!location) {
      // If no location but we have jurisdiction, at least set the region
      if (jurisdiction) {
        return {
          region: jurisdiction,
          country: 'United Kingdom'
        };
      }
      return undefined;
    }

    const orgLocation: OrganisationLocation = {
      country: location.country || 'United Kingdom'
    };

    // Build address string from components
    if (location.addressLines && location.addressLines.length > 0) {
      orgLocation.address = location.addressLines.join(', ');
      if (location.postcode) {
        orgLocation.address += `, ${location.postcode}`;
      }
    } else if (location.fullAddress) {
      orgLocation.address = location.fullAddress;
    }

    if (location.town) {
      orgLocation.region = location.town;
    } else if (jurisdiction) {
      orgLocation.region = jurisdiction;
    }

    if (location.postcode) {
      orgLocation.postalCode = location.postcode;
    }

    if (location.latitude && location.longitude) {
      orgLocation.coordinates = {
        latitude: location.latitude,
        longitude: location.longitude
      };
    }

    return orgLocation;
  }

  private mapDataSource(source: string): DataSourceType {
    const sourceMap: Record<string, DataSourceType> = {
      'English Courts CSV': 'OFFICIAL_WEBSITE' as DataSourceType,
      'NI Direct': 'OFFICIAL_WEBSITE' as DataSourceType,
      'Scottish Courts API': 'OFFICIAL_API' as DataSourceType,
      'Scottish Courts Fallback': 'STATIC_DATA' as DataSourceType
    };

    return sourceMap[source] || ('OTHER' as DataSourceType);
  }

  private calculateCompleteness(court: Court): number {
    let score = 0;
    let maxScore = 0;

    // Required fields (weighted higher)
    maxScore += 2;
    if (court.name) score += 2;

    maxScore += 2;
    if (court.type && court.type.length > 0) score += 2;

    maxScore += 2;
    if (court.jurisdiction) score += 2;

    maxScore += 2;
    if (court.status !== 'unknown') score += 2;

    // Optional but valuable fields
    maxScore += 1;
    if (court.location) score += 1;

    maxScore += 1;
    if (court.contact) score += 1;

    maxScore += 1;
    if (court.areasOfLaw && court.areasOfLaw.length > 0) score += 1;

    maxScore += 1;
    if (court.services && court.services.length > 0) score += 1;

    maxScore += 1;
    if (court.identifier) score += 1;

    maxScore += 1;
    if (court.slug) score += 1;

    // Detailed location information
    if (court.location) {
      maxScore += 1;
      if (court.location.postcode) score += 1;

      maxScore += 1;
      if (court.location.latitude && court.location.longitude) score += 1;
    }

    // Detailed contact information
    if (court.contact) {
      maxScore += 0.5;
      if (court.contact.telephone) score += 0.5;

      maxScore += 0.5;
      if (court.contact.email) score += 0.5;

      maxScore += 0.5;
      if (court.contact.website) score += 0.5;
    }

    return maxScore > 0 ? score / maxScore : 0;
  }
}