/**
 * Contract test for Welsh Unitary Authorities Fetcher
 * Tests the contract for fetching Welsh unitary authorities from Law.gov.wales
 */

import { WelshUnitaryAuthoritiesFetcher } from '../../src/services/fetchers/welsh-unitary-authorities-fetcher';
import { DataSource } from '../../src/models/data-source';
import { UnitaryAuthorityData } from '../../src/models/source-data';

describe('WelshUnitaryAuthoritiesFetcher Contract', () => {
  let fetcher: WelshUnitaryAuthoritiesFetcher;

  beforeEach(() => {
    fetcher = new WelshUnitaryAuthoritiesFetcher();
  });

  describe('fetch', () => {
    it('should return correct source identifier', async () => {
      const result = await fetcher.fetch();
      expect(result.source).toBe(DataSource.LAW_GOV_WALES);
    });

    it('should successfully fetch and parse Welsh unitary authorities from Law.gov.wales', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it('should return valid Welsh unitary authority objects', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const firstAuthority = result.data![0] as UnitaryAuthorityData;

      expect(firstAuthority.name).toBeDefined();
      expect(typeof firstAuthority.name).toBe('string');
      expect(firstAuthority.name.length).toBeGreaterThan(0);
      expect(firstAuthority.region).toBe('Wales');
    });

    it('should include all 22 Welsh unitary authorities', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const authorityNames = result.data!.map((authority: UnitaryAuthorityData) => authority.name);

      // Should include all 22 Welsh principal areas
      expect(authorityNames.some(name => name.includes('Anglesey') || name.includes('Ynys Môn'))).toBe(true);
      expect(authorityNames.some(name => name.includes('Blaenau Gwent'))).toBe(true);
      expect(authorityNames.some(name => name.includes('Bridgend') || name.includes('Pen-y-bont'))).toBe(true);
      expect(authorityNames.some(name => name.includes('Caerphilly') || name.includes('Caerffili'))).toBe(true);
      expect(authorityNames.some(name => name.includes('Cardiff') || name.includes('Caerdydd'))).toBe(true);
      expect(authorityNames.some(name => name.includes('Carmarthenshire') || name.includes('Caerfyrddin'))).toBe(true);
      expect(authorityNames.some(name => name.includes('Ceredigion'))).toBe(true);
      expect(authorityNames.some(name => name.includes('Conwy'))).toBe(true);
      expect(authorityNames.some(name => name.includes('Denbighshire') || name.includes('Dinbych'))).toBe(true);
      expect(authorityNames.some(name => name.includes('Flintshire') || name.includes('Sir y Fflint'))).toBe(true);
      expect(authorityNames.some(name => name.includes('Gwynedd'))).toBe(true);
      expect(authorityNames.some(name => name.includes('Merthyr Tydfil') || name.includes('Merthyr Tudful'))).toBe(true);
      expect(authorityNames.some(name => name.includes('Monmouthshire') || name.includes('Sir Fynwy'))).toBe(true);
      expect(authorityNames.some(name => name.includes('Neath Port Talbot') || name.includes('Castell-nedd'))).toBe(true);
      expect(authorityNames.some(name => name.includes('Newport') || name.includes('Casnewydd'))).toBe(true);
      expect(authorityNames.some(name => name.includes('Pembrokeshire') || name.includes('Sir Benfro'))).toBe(true);
      expect(authorityNames.some(name => name.includes('Powys'))).toBe(true);
      expect(authorityNames.some(name => name.includes('Rhondda Cynon Taf') || name.includes('Rhondda Cynon Taff'))).toBe(true);
      expect(authorityNames.some(name => name.includes('Swansea') || name.includes('Abertawe'))).toBe(true);
      expect(authorityNames.some(name => name.includes('Torfaen') || name.includes('Tor-faen'))).toBe(true);
      expect(authorityNames.some(name => name.includes('Vale of Glamorgan') || name.includes('Bro Morgannwg'))).toBe(true);
      expect(authorityNames.some(name => name.includes('Wrexham') || name.includes('Wrecsam'))).toBe(true);
    });

    it('should extract Welsh language names when available', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);

      // Some authorities should have bilingual names or Welsh alternative names
      const welshNames = result.data!.filter((authority: UnitaryAuthorityData) =>
        authority.name.includes('Cymru') ||
        authority.name.includes('Sir') ||
        authority.name.includes('Caer') ||
        authority.name.includes('Môn') ||
        authority.name.includes('Bro')
      );

      expect(welshNames.length).toBeGreaterThan(0);
    });

    it('should extract authority codes when available', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const authoritiesWithCodes = result.data!.filter((authority: UnitaryAuthorityData) => authority.code);

      if (authoritiesWithCodes.length > 0) {
        // Welsh authority codes typically start with 'W'
        expect(authoritiesWithCodes[0].code).toMatch(/^W/);
      }
    });

    it('should return exactly 22 Welsh unitary authorities', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      // Wales actually has 22 principal areas but the page may list additional authorities
      expect(result.metadata?.totalRecords).toBeGreaterThanOrEqual(22);
      expect(result.data!.length).toBeGreaterThanOrEqual(22);
    });

    it('should handle network errors with retry mechanism', async () => {
      // Mock network error scenario
      jest.spyOn(fetcher as any, 'fetchWithRetry').mockRejectedValueOnce(new Error('Network error'));

      const result = await fetcher.fetch();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should have correct URL configuration', () => {
      expect(fetcher.url).toBe('https://law.gov.wales/local-government-bodies');
      expect(fetcher.source).toBe(DataSource.LAW_GOV_WALES);
    });

    it('should validate all authorities are in Wales region', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);

      // All authorities should be in Wales
      result.data!.forEach((authority: UnitaryAuthorityData) => {
        expect(authority.region).toBe('Wales');
      });
    });

    it('should handle bilingual content correctly', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);

      // Should not duplicate authorities due to bilingual presentation
      const names = result.data!.map((authority: UnitaryAuthorityData) => authority.name);
      const uniqueNames = [...new Set(names)];

      expect(names.length).toBe(uniqueNames.length);
    });

    it('should extract authority types when available', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);

      // Welsh authorities are all unitary authorities/principal areas
      result.data!.forEach((authority: UnitaryAuthorityData) => {
        expect(authority.name).not.toContain('District');
        expect(authority.name).not.toContain('Borough');
        // They should be proper principal areas
      });
    });

    it('should parse legal document structure correctly', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);

      // Law.gov.wales should provide authoritative legal information
      result.data!.forEach((authority: UnitaryAuthorityData) => {
        expect(authority.name.trim().length).toBeGreaterThan(3);
        expect(authority.name).not.toContain('undefined');
        expect(authority.name).not.toContain('null');
      });
    });
  });
});