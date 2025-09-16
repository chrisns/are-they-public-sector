/**
 * Data models for Emergency Services and Additional Devolved Bodies
 */

/**
 * Base interface for emergency services
 */
export interface EmergencyService {
  name: string;                    // Service name
  serviceType: 'police' | 'fire';  // Type of emergency service
  website?: string;                // Official website URL
  region?: string;                 // Geographic coverage area
  headquarters?: string;           // HQ location if available
}

/**
 * Police Force entity
 */
export interface PoliceForce extends EmergencyService {
  serviceType: 'police';
  forceType: 'territorial' | 'special' | 'crown_dependency' | 'overseas_territory';
  jurisdiction: string;            // Area of operation
  chiefConstable?: string;         // Current leadership
  policeAndCrimeCommissioner?: string; // PCC if applicable
}

/**
 * Fire and Rescue Service entity
 */
export interface FireService extends EmergencyService {
  serviceType: 'fire';
  authorityType: 'county' | 'metropolitan' | 'combined_authority' | 'unitary';
  stationCount?: number;           // Number of fire stations
  coverage?: string[];             // List of areas covered
  officialCode?: string;           // Official government code (e.g. E31000001)
}

/**
 * Additional Devolved Body entity
 */
export interface DevolvedBody {
  name: string;                    // Organisation name
  nation: 'scotland' | 'wales' | 'northern_ireland';
  bodyType: 'parliament' | 'assembly' | 'government' | 'department' | 'agency' | 'public_body';
  parentBody?: string;             // Parent organisation if applicable
  established?: string;            // ISO date
  responsibilities?: string[];     // Key areas of responsibility
  website?: string;
}

/**
 * Parser response types
 */
export interface PoliceParserResponse {
  forces: PoliceForce[];
  metadata: {
    source: string;
    fetchedAt: string;
    totalCount: number;
  };
}

export interface FireParserResponse {
  services: FireService[];
  metadata: {
    source: string;
    fetchedAt: string;
    totalCount: number;
  };
}

export interface DevolvedParserResponse {
  bodies: DevolvedBody[];
  metadata: {
    source: string;
    fetchedAt: string;
    totalCount: number;
    newCount: number;
  };
}