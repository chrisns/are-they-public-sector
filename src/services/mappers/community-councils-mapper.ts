/**
 * Community Councils and Health Trusts Mapper Service
 * Maps raw data to unified Organisation model
 */

import type { Organisation, DataQuality } from '../../models/organisation.js';
import { OrganisationType, DataSourceType } from '../../models/organisation.js';
import type { WelshCommunityRaw } from '../../models/welsh-community.js';
import type { ScottishCommunityRaw } from '../../models/scottish-community.js';
import type { NIHealthTrustRaw } from '../../models/ni-health-trust.js';

export class CommunityCouncilsMapper {
  /**
   * Maps Welsh community councils to Organisation model
   * @param raw Array of raw Welsh community council data
   * @returns Array of mapped Organisation objects
   */
  mapWelshCouncils(raw: WelshCommunityRaw[]): Organisation[] {
    return raw.map(council => this.mapWelshCouncil(council));
  }

  /**
   * Maps a single Welsh community council to Organisation model
   */
  private mapWelshCouncil(council: WelshCommunityRaw): Organisation {
    const id = `WCC_${this.normalizeId(council.name)}`;
    const now = new Date().toISOString();

    const org: Organisation = {
      id,
      name: council.name,
      alternativeNames: [],
      type: OrganisationType.WELSH_COMMUNITY_COUNCIL,
      classification: 'Welsh Community Council',
      status: 'active',
      location: {
        region: council.principalArea,
        country: 'Wales'
      },
      sources: [
        {
          source: DataSourceType.MANUAL,
          retrievedAt: now,
          url: 'https://en.wikipedia.org/wiki/List_of_communities_in_Wales',
          confidence: 0.9
        }
      ],
      lastUpdated: now,
      dataQuality: this.calculateDataQuality(council)
    };

    // Add additional properties if available
    if (council.population || council.website || council.notes) {
      org.additionalProperties = {};
      if (council.population) {
        org.additionalProperties.population = council.population;
      }
      if (council.website) {
        org.additionalProperties.website = council.website;
      }
      if (council.notes) {
        org.additionalProperties.notes = council.notes;
      }
    }

    return org;
  }

  /**
   * Maps Scottish community councils to Organisation model
   * @param raw Array of raw Scottish community council data
   * @returns Array of mapped Organisation objects
   */
  mapScottishCouncils(raw: ScottishCommunityRaw[]): Organisation[] {
    return raw
      .filter(council => council.isActive) // Only include active councils
      .map(council => this.mapScottishCouncil(council));
  }

  /**
   * Maps a single Scottish community council to Organisation model
   */
  private mapScottishCouncil(council: ScottishCommunityRaw): Organisation {
    const id = `SCC_${this.normalizeId(council.name)}`;
    const now = new Date().toISOString();

    const org: Organisation = {
      id,
      name: council.name,
      alternativeNames: [],
      type: OrganisationType.SCOTTISH_COMMUNITY_COUNCIL,
      classification: 'Scottish Community Council',
      status: council.isActive ? 'active' : 'inactive',
      location: {
        region: council.councilArea,
        country: 'Scotland'
      },
      sources: [
        {
          source: DataSourceType.MANUAL,
          retrievedAt: now,
          url: 'https://en.wikipedia.org/wiki/List_of_community_council_areas_in_Scotland',
          confidence: 0.9
        }
      ],
      lastUpdated: now,
      dataQuality: this.calculateDataQuality(council)
    };

    // Add additional properties if available
    if (council.region || council.contactDetails) {
      org.additionalProperties = {};
      if (council.region) {
        org.additionalProperties.subRegion = council.region;
      }
      if (council.contactDetails) {
        org.additionalProperties.contactDetails = council.contactDetails;
      }
      org.additionalProperties.isActive = council.isActive;
    }

    return org;
  }

  /**
   * Maps NI Health Trusts to Organisation model
   * @param raw Array of raw NI Health Trust data
   * @returns Array of mapped Organisation objects
   */
  mapNIHealthTrusts(raw: NIHealthTrustRaw[]): Organisation[] {
    return raw.map(trust => this.mapNIHealthTrust(trust));
  }

  /**
   * Maps a single NI Health Trust to Organisation model
   */
  private mapNIHealthTrust(trust: NIHealthTrustRaw): Organisation {
    const id = `NIHT_${this.normalizeId(trust.name)}`;
    const now = new Date().toISOString();

    const org: Organisation = {
      id,
      name: trust.name,
      alternativeNames: [],
      type: OrganisationType.NI_HEALTH_TRUST,
      classification: 'Health and Social Care Trust',
      status: 'active',
      location: {
        country: 'Northern Ireland'
      },
      sources: [
        {
          source: DataSourceType.MANUAL,
          retrievedAt: now,
          url: 'https://www.nidirect.gov.uk/contacts/health-and-social-care-trusts',
          confidence: 0.95 // Higher confidence for official government source
        }
      ],
      lastUpdated: now,
      dataQuality: this.calculateDataQuality(trust)
    };

    // Add location details if address provided
    if (trust.address) {
      org.location!.address = trust.address;
    }

    // Add additional properties if available
    const hasAdditionalData = trust.phone || trust.email || trust.website || trust.servicesProvided;
    if (hasAdditionalData) {
      org.additionalProperties = {};
      if (trust.phone) {
        org.additionalProperties.phone = trust.phone;
      }
      if (trust.email) {
        org.additionalProperties.email = trust.email;
      }
      if (trust.website) {
        org.additionalProperties.website = trust.website;
      }
      if (trust.servicesProvided && trust.servicesProvided.length > 0) {
        org.additionalProperties.servicesProvided = trust.servicesProvided;
      }
    }

    return org;
  }

  /**
   * Normalizes an organisation name for ID generation
   * @param name The organisation name to normalize
   * @returns Normalized string suitable for ID
   */
  normalizeId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')  // Replace non-alphanumeric with underscore
      .replace(/^_+|_+$/g, '')       // Trim underscores from ends
      .substring(0, 50);             // Limit length to 50 characters
  }

  /**
   * Calculate data quality score for a raw entity
   */
  private calculateDataQuality(entity: WelshCommunityRaw | ScottishCommunityRaw | NIHealthTrustRaw): DataQuality {
    let filledFields = 0;
    let totalFields = 0;

    // Count fields based on entity type
    if ('principalArea' in entity) {
      // Welsh Community
      totalFields = 5;
      filledFields = 2; // name and principalArea are always present
      if (entity.population) filledFields++;
      if (entity.website) filledFields++;
      if (entity.notes) filledFields++;
    } else if ('councilArea' in entity) {
      // Scottish Community
      totalFields = 5;
      filledFields = 3; // name, councilArea, and isActive are always present
      if (entity.region) filledFields++;
      if (entity.contactDetails) filledFields++;
    } else {
      // NI Health Trust
      totalFields = 6;
      filledFields = 1; // name is always present
      if (entity.address) filledFields++;
      if (entity.phone) filledFields++;
      if (entity.email) filledFields++;
      if (entity.website) filledFields++;
      if (entity.servicesProvided) filledFields++;
    }

    const completeness = filledFields / totalFields;

    return {
      completeness,
      hasConflicts: false,
      requiresReview: completeness < 0.6
    };
  }
}