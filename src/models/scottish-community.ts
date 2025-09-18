/**
 * Scottish Community Council data model
 */

export interface ScottishCommunityRaw {
  name: string;
  councilArea: string;
  region?: string;
  isActive: boolean;
  contactDetails?: string;
}