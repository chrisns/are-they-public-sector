export interface NHSTrust {
  name: string;           // Full trust name from HTML
  code: string;           // Generated from slugified name
  type: 'trust' | 'foundation-trust';  // Based on "Foundation" in name
  url?: string;           // If individual trust page URL available
}

export interface NHSParserResult {
  trusts: NHSTrust[];
  count: number;
  timestamp: string;
}