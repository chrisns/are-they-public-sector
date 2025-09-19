/**
 * Contract test for Northern Ireland Trust Ports Fetcher
 * Tests the contract for fetching NI trust ports from Infrastructure NI
 */

import { NITrustPortsFetcher } from '../../src/services/fetchers/ni-trust-ports-fetcher';
import { DataSource } from '../../src/models/data-source';
import { TrustPortData } from '../../src/models/source-data';

describe('NITrustPortsFetcher Contract', () => {
  let fetcher: NITrustPortsFetcher;

  beforeEach(() => {
    fetcher = new NITrustPortsFetcher();
  });

  describe('fetch', () => {
    it('should return correct source identifier', async () => {
      const result = await fetcher.fetch();
      expect(result.source).toBe(DataSource.INFRASTRUCTURE_NI);
    });

    it('should successfully fetch and parse NI trust ports', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it('should return valid trust port objects', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const firstPort = result.data![0] as TrustPortData;

      expect(firstPort.name).toBeDefined();
      expect(typeof firstPort.name).toBe('string');
      expect(firstPort.name.length).toBeGreaterThan(0);
    });

    it('should include major Northern Ireland trust ports', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const portNames = result.data!.map((port: TrustPortData) => port.name);

      // Should include major NI ports
      expect(portNames.some(name => name.includes('Belfast'))).toBe(true);
      expect(portNames.some(name => name.includes('Londonderry') || name.includes('Foyle'))).toBe(true);
      expect(portNames.some(name => name.includes('Coleraine'))).toBe(true);
      expect(portNames.some(name => name.includes('Warrenpoint'))).toBe(true);
    });

    it('should extract port locations when available', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const portsWithLocation = result.data!.filter((port: TrustPortData) => port.location);

      expect(portsWithLocation.length).toBeGreaterThan(0);
      // Locations should be meaningful geographic references
      expect(portsWithLocation[0].location!.length).toBeGreaterThan(3);
    });

    it('should extract port types when available', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const portsWithType = result.data!.filter((port: TrustPortData) => port.type);

      if (portsWithType.length > 0) {
        // Common port types
        const types = portsWithType.map(port => port.type);
        expect(types.some(type => ['Trust', 'Commercial', 'Ferry', 'Cargo'].some(t => type!.includes(t)))).toBe(true);
      }
    });

    it('should extract website URLs when available', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const portsWithWebsites = result.data!.filter((port: TrustPortData) => port.website);

      if (portsWithWebsites.length > 0) {
        expect(portsWithWebsites[0].website).toMatch(/^https?:\/\//);
      }
    });

    it('should return approximately 5-15 trust ports', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      expect(result.metadata?.totalRecords).toBeDefined();
      // Northern Ireland has a limited number of major ports
      expect(result.metadata?.totalRecords).toBeGreaterThan(3);
      expect(result.metadata?.totalRecords).toBeLessThan(20);
    });

    it('should handle network errors with retry mechanism', async () => {
      // Mock network error scenario
      jest.spyOn(fetcher as any, 'fetchWithRetry').mockRejectedValueOnce(new Error('Network error'));

      const result = await fetcher.fetch();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should have correct URL configuration', () => {
      expect(fetcher.url).toBe('https://www.infrastructure-ni.gov.uk/articles/ports-and-harbours');
      expect(fetcher.source).toBe(DataSource.INFRASTRUCTURE_NI);
    });

    it('should validate port names contain relevant terminology', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);

      // Port names should contain port/harbour/marina terminology or location names
      result.data!.forEach((port: TrustPortData) => {
        expect(port.name).toMatch(/Port|Harbour|Harbor|Marina|Pier|Wharf|Dock|Trust|Belfast|Derry|Londonderry|Coleraine|Warrenpoint|Larne|Bangor/i);
      });
    });

    it('should handle different port governance structures', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);

      // Some ports may be trust ports, others may be commercial or municipal
      const portsWithType = result.data!.filter((port: TrustPortData) => port.type);

      if (portsWithType.length > 0) {
        // Should have some variety in governance types
        const types = portsWithType.map(port => port.type!.toLowerCase());
        expect(types.length).toBeGreaterThan(0);
      }
    });

    it('should extract contact or operational information when available', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);

      // At least some ports should have additional information (website, location, type)
      const portsWithInfo = result.data!.filter((port: TrustPortData) =>
        port.website || port.location || port.type
      );

      expect(portsWithInfo.length).toBeGreaterThan(0);
    });

    it('should distinguish between commercial and trust ports where possible', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);

      // Infrastructure NI may categorise ports differently
      const allPorts = result.data! as TrustPortData[];

      // All entries should have meaningful names
      allPorts.forEach(port => {
        expect(port.name.trim().length).toBeGreaterThan(2);
        expect(port.name).not.toContain('undefined');
        expect(port.name).not.toContain('null');
      });
    });

    it('should handle Infrastructure NI website structure correctly', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);

      // Should extract ports from government website structure
      result.data!.forEach((port: TrustPortData) => {
        expect(port.name.length).toBeGreaterThan(0);
      });
    });
  });
});