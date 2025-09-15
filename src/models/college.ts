/**
 * College entity model for UK Further Education colleges
 */

export type CollegeRegion = 'Scotland' | 'Wales' | 'Northern Ireland';

export interface College {
  // Core fields (from PDF)
  name: string;           // Required, college name from PDF

  // Derived fields
  region: CollegeRegion;  // Scotland, Wales, or Northern Ireland

  // Metadata
  source: string;         // PDF URL source
  fetchedAt: string;      // ISO timestamp of extraction
}

export interface CollegeCounts {
  scotland: number;
  wales: number;
  northernIreland: number;
  total?: number;
}

export interface CollegeValidation {
  scotlandMatch: boolean;
  walesMatch: boolean;
  northernIrelandMatch: boolean;
}

export interface CollegesResult {
  colleges: College[];
  metadata: {
    source: string;       // 'aoc.co.uk'
    fetchedAt: string;    // ISO timestamp
    counts: CollegeCounts & { total: number };
    validation: CollegeValidation;
  };
}

export interface PdfLinks {
  scotland: string;
  wales: string;
  northernIreland: string;
}

export interface WebpageResult {
  html: string;
  url: string;
}