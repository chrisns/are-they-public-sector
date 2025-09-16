import { createHash } from 'crypto';
import type { NHSCharityRaw } from '../../models/nhs-charity.js';
import type { Organisation } from '../../models/organisation.js';
import { OrganisationType } from '../../models/organisation.js';

export class NHSCharitiesMapper {
  public map(charity: NHSCharityRaw): Organisation {
    const id = this.generateId(charity.name, charity.postcode);

    const organisation: Organisation = {
      id,
      name: charity.name,
      type: OrganisationType.CENTRAL_GOVERNMENT,
      classification: 'NHS Charity',
      status: 'active',
      additionalProperties: {
        source: 'nhs_charities',
        sponsor: 'Department of Health',
        onsCode: 'S.1311',
        ...(charity.country && { originalCountry: charity.country })
      },
      dataQuality: {
        completeness: this.calculateCompleteness(charity),
        lastValidated: new Date().toISOString(),
        source: 'live_fetch'
      },
      lastUpdated: new Date().toISOString()
    };

    // Always add location with country
    organisation.location = {
      country: 'United Kingdom',
      ...(charity.address && { address: charity.address }),
      ...(charity.city && { region: charity.city }),
      ...(charity.postcode && { postalCode: charity.postcode })
    };

    // Add coordinates if available
    if (typeof charity.lat === 'number' && typeof charity.lng === 'number') {
      organisation.location.coordinates = {
        latitude: charity.lat,
        longitude: charity.lng
      };
    }

    // Add website if available
    if (charity.website) {
      organisation.website = charity.website;
    }

    return organisation;
  }

  public mapMany(charities: NHSCharityRaw[]): Organisation[] {
    return charities.map(charity => this.map(charity));
  }

  private generateId(name: string, postcode?: string): string {
    const hash = createHash('sha256');
    hash.update(name + (postcode || '') + 'nhs');
    return hash.digest('hex').substring(0, 8);
  }

  private calculateCompleteness(charity: NHSCharityRaw): number {
    const fieldWeights = {
      name: 1.0,
      address: 0.5,
      postcode: 0.5,
      website: 0.5,
      city: 0.25,
      lat: 0.25,
      lng: 0.25
    };

    let score = 0;
    const maxScore = Object.values(fieldWeights).reduce((sum, weight) => sum + weight, 0);

    for (const [field, weight] of Object.entries(fieldWeights)) {
      if (charity[field as keyof NHSCharityRaw]) {
        score += weight;
      }
    }

    return score / maxScore;
  }
}