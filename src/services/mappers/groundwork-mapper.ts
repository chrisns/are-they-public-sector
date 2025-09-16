import { createHash } from 'crypto';
import type { GroundworkTrustRaw } from '../../models/groundwork-trust.js';
import type { Organisation } from '../../models/organisation.js';
import { OrganisationType } from '../../models/organisation.js';

export class GroundworkMapper {
  public map(trust: GroundworkTrustRaw): Organisation {
    const id = this.generateId(trust.name);
    const region = this.extractRegion(trust.name);

    return {
      id,
      name: trust.name,
      type: OrganisationType.CENTRAL_GOVERNMENT,
      classification: 'Groundwork Trust',
      status: 'active',
      location: {
        country: 'United Kingdom',
        ...(region && { region })
      },
      additionalProperties: {
        source: 'groundwork',
        sponsor: 'Department for Communities and Local Government',
        onsCode: 'S.1311'
      },
      dataQuality: {
        completeness: this.calculateCompleteness(trust),
        lastValidated: new Date().toISOString(),
        source: 'live_fetch'
      },
      lastUpdated: new Date().toISOString()
    };
  }

  public mapMany(trusts: GroundworkTrustRaw[]): Organisation[] {
    return trusts.map(trust => this.map(trust));
  }

  public extractRegion(name: string): string {
    // Remove 'Groundwork ' prefix if present
    const cleanName = name.replace(/^Groundwork\s+/i, '');

    // For cases like 'Scotland UK Office', extract first word
    if (cleanName.includes(' UK Office')) {
      return cleanName.split(' ')[0];
    }

    return cleanName;
  }

  private generateId(name: string): string {
    const hash = createHash('sha256');
    hash.update(name + 'groundwork');
    return hash.digest('hex').substring(0, 8);
  }

  private calculateCompleteness(trust: GroundworkTrustRaw): number {
    // Count available fields
    let fieldsPresent = 0;
    const totalFields = 1; // Just name is expected

    if (trust.name) fieldsPresent++;

    return fieldsPresent / totalFields;
  }
}