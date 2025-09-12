/**
 * Source-specific data models for UK Public Sector Organisation Aggregator
 * Raw structures from different data sources
 */

/**
 * Logo information from GOV.UK API
 */
interface GovUKLogo {
  formatted_title?: string;
  crest?: string;
}

/**
 * Organisation status from GOV.UK API
 */
interface GovUKOrganisationStatus {
  status?: string;
  updated_at?: string;
}

/**
 * Details section from GOV.UK API
 */
interface GovUKDetails {
  acronym?: string;
  brand?: string;
  default_news_image?: any;
  logo?: GovUKLogo;
  organisation_govuk_status?: GovUKOrganisationStatus;
}

/**
 * Linked organisation reference from GOV.UK API
 */
interface GovUKLinkedOrganisation {
  analytics_identifier?: string;
  api_path?: string;
  base_path?: string;
  content_id?: string;
  title?: string;
}

/**
 * Links section from GOV.UK API
 */
interface GovUKLinks {
  parent_organisations?: GovUKLinkedOrganisation[];
  child_organisations?: any[];
}

/**
 * Raw structure from GOV.UK API
 * Represents organisation data as received from the GOV.UK Content API
 */
export interface GovUKOrganisation {
  analytics_identifier?: string;
  base_path: string;
  content_id: string;
  description?: string;
  details?: GovUKDetails;
  document_type: string;
  first_published_at?: string;
  links?: GovUKLinks;
  locale?: string;
  phase?: string;
  public_updated_at?: string;
  schema_name?: string;
  title: string;
  updated_at?: string;
  withdrawn?: boolean;
}

/**
 * Structure from ONS Excel "Organisation|Institutional Unit" tab
 * Represents institutional units in the public sector classification
 */
export interface ONSInstitutionalUnit {
  'Organisation name': string;
  'ONS code'?: string;
  'Classification': string;
  'Parent organisation'?: string;
  'Start date'?: string;
  'End date'?: string;
  [key: string]: any;  // Preserve unmapped columns
}

/**
 * Structure from ONS Excel "Non-Institutional Units" tab
 * Represents non-institutional units in the public sector classification
 */
export interface ONSNonInstitutionalUnit {
  'Non-Institutional Unit name': string;
  'Sponsoring Entity': string;
  'Classification'?: string;
  'Status'?: string;
  [key: string]: any;  // Preserve unmapped columns
}

/**
 * Type guard for GovUKOrganisation
 */
export function isGovUKOrganisation(data: any): data is GovUKOrganisation {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.base_path === 'string' &&
    typeof data.content_id === 'string' &&
    typeof data.title === 'string' &&
    typeof data.document_type === 'string'
  );
}

/**
 * Type guard for ONSInstitutionalUnit
 */
export function isONSInstitutionalUnit(data: any): data is ONSInstitutionalUnit {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data['Organisation name'] === 'string' &&
    typeof data['Classification'] === 'string'
  );
}

/**
 * Type guard for ONSNonInstitutionalUnit
 */
export function isONSNonInstitutionalUnit(data: any): data is ONSNonInstitutionalUnit {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data['Non-Institutional Unit name'] === 'string' &&
    typeof data['Sponsoring Entity'] === 'string'
  );
}