/**
 * Contract: Community Councils and Health Trusts Mapper Service
 * Maps raw data to unified Organisation model
 */

import { Organisation } from '../../../src/models/organisation';
import { WelshCommunityRaw } from './welsh-councils-fetcher.contract';
import { ScottishCommunityRaw } from './scottish-councils-fetcher.contract';
import { NIHealthTrustRaw } from './ni-health-trusts-fetcher.contract';

export interface CommunityCouncilsMapperContract {
  /**
   * Maps Welsh community councils to Organisation model
   * @param raw Array of raw Welsh community council data
   * @returns Array of mapped Organisation objects
   */
  mapWelshCouncils(raw: WelshCommunityRaw[]): Organisation[];

  /**
   * Maps Scottish community councils to Organisation model
   * @param raw Array of raw Scottish community council data
   * @returns Array of mapped Organisation objects
   */
  mapScottishCouncils(raw: ScottishCommunityRaw[]): Organisation[];

  /**
   * Maps NI Health Trusts to Organisation model
   * @param raw Array of raw NI Health Trust data
   * @returns Array of mapped Organisation objects
   */
  mapNIHealthTrusts(raw: NIHealthTrustRaw[]): Organisation[];

  /**
   * Normalizes an organisation name for ID generation
   * @param name The organisation name to normalize
   * @returns Normalized string suitable for ID
   */
  normalizeId(name: string): string;
}

/**
 * ID Generation Rules:
 * - Welsh councils: Prefix 'WCC_'
 * - Scottish councils: Prefix 'SCC_'
 * - NI Health Trusts: Prefix 'NIHT_'
 * - Normalize: lowercase, replace non-alphanumeric with underscore, max 50 chars
 *
 * Mapping Requirements:
 * - All organisations must have unique IDs
 * - Source URL must be included for data provenance
 * - Type must use new OrganisationType enum values
 * - Location should include country/region context
 */