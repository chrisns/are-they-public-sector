export interface LocalAuthority {
  name: string;           // Authority name from HTML
  code: string;           // Generated from name + domain
  type: 'county' | 'district' | 'borough' | 'city' | 'unitary';
  url: string;            // Authority website URL
}

export interface LocalAuthorityParserResult {
  authorities: LocalAuthority[];
  count: number;
  timestamp: string;
}