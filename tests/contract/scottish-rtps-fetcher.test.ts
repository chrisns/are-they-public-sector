/**
 * Contract test for Scottish Regional Transport Partnerships Fetcher
 * Tests the contract for fetching Scottish RTPs from Transport Scotland
 */

import { ScottishRTPsFetcher } from '../../src/services/fetchers/scottish-rtps-fetcher';
import { DataSource } from '../../src/models/data-source';
import { TransportPartnershipData } from '../../src/models/source-data';

// Skip these tests in CI as they require network access to Transport Scotland
const describeIfNotCI = process.env.CI ? describe.skip : describe;

describeIfNotCI('ScottishRTPsFetcher Contract', () => {
  let fetcher: ScottishRTPsFetcher;

  beforeEach(() => {
    fetcher = new ScottishRTPsFetcher();
  });

  describe('fetch', () => {
    it('should return correct source identifier', async () => {
      const result = await fetcher.fetch();
      expect(result.source).toBe(DataSource.TRANSPORT_SCOTLAND);
    });

    it('should successfully fetch and parse Scottish RTPs', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it('should return valid Scottish RTP objects', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const firstRTP = result.data![0] as TransportPartnershipData;

      expect(firstRTP.name).toBeDefined();
      expect(typeof firstRTP.name).toBe('string');
      expect(firstRTP.name.length).toBeGreaterThan(0);
    });

    it('should include all 7 Scottish Regional Transport Partnerships', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const rtpNames = result.data!.map((rtp: TransportPartnershipData) => rtp.name);

      // Should include all 7 RTPs
      expect(rtpNames.some(name => name.includes('Strathclyde Partnership for Transport') || name.includes('SPT'))).toBe(true);
      expect(rtpNames.some(name => name.includes('SESTRAN') || name.includes('South East Scotland'))).toBe(true);
      expect(rtpNames.some(name => name.includes('TACTRAN') || name.includes('Tayside and Central Scotland'))).toBe(true);
      expect(rtpNames.some(name => name.includes('NESTRANS') || name.includes('North East Scotland'))).toBe(true);
      expect(rtpNames.some(name => name.includes('HITRANS') || name.includes('Highlands and Islands'))).toBe(true);
      expect(rtpNames.some(name => name.includes('SWESTRANS') || name.includes('South West Scotland'))).toBe(true);
      expect(rtpNames.some(name => name.includes('ZetTrans') || name.includes('Shetland'))).toBe(true);
    });

    it('should extract RTP abbreviations when available', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const rtpsWithAbbrev = result.data!.filter((rtp: TransportPartnershipData) => rtp.abbreviation);

      expect(rtpsWithAbbrev.length).toBeGreaterThan(0);
      // Common abbreviations
      const abbreviations = rtpsWithAbbrev.map(rtp => rtp.abbreviation);
      expect(abbreviations.some(abbrev => ['SPT', 'SESTRAN', 'TACTRAN', 'NESTRANS', 'HITRANS', 'SWESTRANS'].includes(abbrev!))).toBe(true);
    });

    it('should extract member councils when available', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const rtpsWithCouncils = result.data!.filter((rtp: TransportPartnershipData) => rtp.councils && rtp.councils.length > 0);

      expect(rtpsWithCouncils.length).toBeGreaterThan(0);
      // Each RTP should have multiple member councils
      expect(rtpsWithCouncils[0].councils!.length).toBeGreaterThan(1);
    });

    it('should extract website URLs when available', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const rtpsWithWebsites = result.data!.filter((rtp: TransportPartnershipData) => rtp.website);

      expect(rtpsWithWebsites.length).toBeGreaterThan(0);
      // RTP websites typically use various domains
      expect(rtpsWithWebsites[0].website).toMatch(/^https?:\/\//);
    });

    it('should return exactly 7 Regional Transport Partnerships', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      expect(result.metadata?.totalRecords).toBe(7);
      expect(result.data!.length).toBe(7);
    });

    it('should handle network errors with retry mechanism', async () => {
      // Mock network error scenario
      jest.spyOn(fetcher as unknown as { fetchWithRetry: jest.Mock }, 'fetchWithRetry').mockRejectedValueOnce(new Error('Network error'));

      const result = await fetcher.fetch();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should have correct URL configuration', () => {
      expect(fetcher.url).toBe('https://www.transport.gov.scot/our-approach/strategy/regional-transport-partnerships/');
      expect(fetcher.source).toBe(DataSource.TRANSPORT_SCOTLAND);
    });

    it('should validate partnership names contain transport terminology', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);

      // All RTPs should have transport-related names
      result.data!.forEach((rtp: TransportPartnershipData) => {
        expect(rtp.name).toMatch(/Transport|RTP|Partnership|TRANS/i);
      });
    });

    it('should extract geographic coverage information', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);

      // RTPs should have member councils that indicate their geographic coverage
      const rtpsWithCouncils = result.data!.filter((rtp: TransportPartnershipData) => rtp.councils);

      if (rtpsWithCouncils.length > 0) {
        // SPT should include Glasgow, Renfrewshire councils
        const spt = rtpsWithCouncils.find(rtp => rtp.name.includes('SPT') || rtp.name.includes('Strathclyde'));
        if (spt && spt.councils) {
          expect(spt.councils.some(council => council.includes('Glasgow') || council.includes('Renfrewshire'))).toBe(true);
        }
      }
    });

    it('should handle different data formats from Transport Scotland', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);

      // Each RTP should have at minimum a name
      result.data!.forEach((rtp: TransportPartnershipData) => {
        expect(rtp.name.trim().length).toBeGreaterThan(3);
      });
    });
  });
});