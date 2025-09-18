/**
 * Northern Ireland Health and Social Care Trust data model
 */

export interface NIHealthTrustRaw {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  email?: string;
  servicesProvided?: string[];
}