/**
 * Raw data model for NHS Charities from Storepoint API
 */
export interface NHSCharityRaw {
  name: string;
  address?: string;
  city?: string;
  postcode?: string;
  country?: string;
  website?: string;
  lat?: number;
  lng?: number;
  [key: string]: unknown;
}