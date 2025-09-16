/**
 * Court model and related interfaces for UK Courts and Tribunals
 */

export interface Court {
  name: string;
  slug?: string;
  identifier?: string;
  type: CourtType[];
  jurisdiction: Jurisdiction;
  status: CourtStatus;
  location?: CourtLocation;
  contact?: CourtContact;
  areasOfLaw?: string[];
  services?: string[];
  sourceSystem: string;
  lastUpdated: string;
}

export enum CourtType {
  CROWN_COURT = "Crown Court",
  MAGISTRATES_COURT = "Magistrates' Court",
  COUNTY_COURT = "County Court",
  FAMILY_COURT = "Family Court",
  HIGH_COURT = "High Court",
  COURT_OF_APPEAL = "Court of Appeal",
  SUPREME_COURT = "Supreme Court",
  TRIBUNAL = "Tribunal",
  EMPLOYMENT_TRIBUNAL = "Employment Tribunal",
  IMMIGRATION_TRIBUNAL = "Immigration Tribunal",
  TAX_TRIBUNAL = "Tax Tribunal",
  SHERIFF_COURT = "Sheriff Court",
  JUSTICE_OF_THE_PEACE_COURT = "Justice of the Peace Court",
  COURT_OF_SESSION = "Court of Session",
  HIGH_COURT_OF_JUSTICIARY = "High Court of Justiciary",
  OTHER = "Other"
}

export enum Jurisdiction {
  ENGLAND_WALES = "England & Wales",
  NORTHERN_IRELAND = "Northern Ireland",
  SCOTLAND = "Scotland"
}

export enum CourtStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  UNKNOWN = "unknown"
}

export interface CourtLocation {
  addressLines?: string[];
  town?: string;
  county?: string;
  postcode?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  fullAddress?: string;
}

export interface CourtContact {
  telephone?: string;
  fax?: string;
  email?: string;
  website?: string;
  dxNumber?: string;
  textphone?: string;
}

// Raw data interfaces for parsing
export interface EnglishCourtRaw {
  name: string;
  slug?: string;
  types?: string; // JSON string array
  open?: string; // 'true' or 'false'
  lat?: string;
  lon?: string;
  addresses?: string; // JSON string
  areas_of_law?: string; // JSON string array
  court_types?: string; // JSON string array
  dxNumbers?: string; // JSON string array
  emails?: string; // JSON string array
  image_url?: string;
  info?: string;
  magistrate_code?: string;
  facilities?: string; // JSON string array
  opening_times?: string; // JSON string
  parking?: string; // JSON string
  postcode?: string;
  crown_location_code?: string;
  county_location_code?: string;
  [key: string]: string | undefined; // Allow additional fields
}

export interface NICourtRaw {
  name: string;
  nodeId?: string;
  address?: string;
  telephone?: string;
  fax?: string;
  email?: string;
  website?: string;
  [key: string]: string | undefined; // Allow additional fields
}

export interface ScottishCourtRaw {
  name: string;
  type?: string;
  address?: string;
  telephone?: string;
  fax?: string;
  email?: string;
  website?: string;
  location?: {
    town?: string;
    postcode?: string;
  };
  [key: string]: string | { town?: string; postcode?: string; } | undefined; // Allow additional fields
}