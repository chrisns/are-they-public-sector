import { NIHealthTrustsFetcher } from '../../src/services/fetchers/ni-health-trusts-fetcher';
import type { NIHealthTrustRaw } from '../../src/models/ni-health-trust';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('NIHealthTrustsFetcher Contract Tests', () => {
  let fetcher: NIHealthTrustsFetcher;

  beforeEach(() => {
    fetcher = new NIHealthTrustsFetcher();
    jest.clearAllMocks();
  });

  describe('fetch()', () => {
    it('should return array of NIHealthTrustRaw objects', async () => {
      // Mock response with NI Health Trust data
      const mockHtml = `
        <div class="trust-listing">
          <div class="trust-item">
            <h3><a href="/trust/belfast-trust">Belfast Health and Social Care Trust</a></h3>
            <p>Belfast HSC Trust</p>
          </div>
          <div class="trust-item">
            <h3><a href="/trust/northern-trust">Northern Health and Social Care Trust</a></h3>
            <p>Northern HSC Trust</p>
          </div>
          <div class="trust-item">
            <h3><a href="/trust/south-eastern-trust">South Eastern Health and Social Care Trust</a></h3>
            <p>South Eastern HSC Trust</p>
          </div>
          <div class="trust-item">
            <h3><a href="/trust/southern-trust">Southern Health and Social Care Trust</a></h3>
            <p>Southern HSC Trust</p>
          </div>
          <div class="trust-item">
            <h3><a href="/trust/western-trust">Western Health and Social Care Trust</a></h3>
            <p>Western HSC Trust</p>
          </div>
          <div class="trust-item">
            <h3><a href="/trust/ambulance-service">Northern Ireland Ambulance Service</a></h3>
            <p>NI Ambulance Service</p>
          </div>
        </div>
      `;

      mockedAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await fetcher.fetch();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Verify each item conforms to NIHealthTrustRaw interface
      result.forEach((trust: NIHealthTrustRaw) => {
        expect(trust).toHaveProperty('name');
        expect(typeof trust.name).toBe('string');
        expect(trust.name.length).toBeGreaterThan(0);
      });
    });

    it('should return exactly 6 trusts', async () => {
      const mockHtml = `
        <div class="trust-listing">
          <div class="trust-item">
            <h3><a href="/trust/belfast-trust">Belfast Health and Social Care Trust</a></h3>
          </div>
          <div class="trust-item">
            <h3><a href="/trust/northern-trust">Northern Health and Social Care Trust</a></h3>
          </div>
          <div class="trust-item">
            <h3><a href="/trust/south-eastern-trust">South Eastern Health and Social Care Trust</a></h3>
          </div>
          <div class="trust-item">
            <h3><a href="/trust/southern-trust">Southern Health and Social Care Trust</a></h3>
          </div>
          <div class="trust-item">
            <h3><a href="/trust/western-trust">Western Health and Social Care Trust</a></h3>
          </div>
          <div class="trust-item">
            <h3><a href="/trust/ambulance-service">Northern Ireland Ambulance Service</a></h3>
          </div>
        </div>
      `;

      mockedAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await fetcher.fetch();

      expect(result.length).toBe(6);
    });

    it('should check required field name', async () => {
      const mockHtml = `
        <div class="trust-listing">
          <div class="trust-item">
            <h3><a href="/trust/test-trust">Test Health Trust</a></h3>
            <p>Test description</p>
          </div>
        </div>
      `;

      mockedAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await fetcher.fetch();

      expect(result.length).toBe(1);
      const trust = result[0];

      // Required field
      expect(trust.name).toBeDefined();
      expect(trust.name).toBe('Test Health Trust');
    });

    it('should test optional detail page fetching', async () => {
      const mockListingHtml = `
        <div class="trust-listing">
          <div class="trust-item">
            <h3><a href="/trust/belfast-trust">Belfast Health and Social Care Trust</a></h3>
          </div>
        </div>
      `;

      const mockDetailHtml = `
        <div class="trust-details">
          <h1>Belfast Health and Social Care Trust</h1>
          <div class="contact-info">
            <p>Address: Belfast, Northern Ireland</p>
            <p>Phone: +44 28 9063 3333</p>
            <p>Website: www.belfasttrust.hscni.net</p>
          </div>
        </div>
      `;

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockListingHtml })
        .mockResolvedValueOnce({ data: mockDetailHtml });

      const result = await fetcher.fetch();

      expect(result.length).toBe(1);
      const trust = result[0];
      expect(trust.name).toBe('Belfast Health and Social Care Trust');

      // Verify detail page was fetched if implementation supports it
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('hscni.net'),
        expect.any(Object)
      );
    });

    it('should handle HTTP errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Connection timeout'));

      await expect(fetcher.fetch()).rejects.toThrow('Connection timeout');
    });

    it('should make correct API call to NI health service', async () => {
      mockedAxios.get.mockResolvedValue({ data: '<div></div>' });

      await fetcher.fetch();

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('hscni.net'),
        expect.any(Object)
      );
    });

    it('should handle empty response gracefully', async () => {
      mockedAxios.get.mockResolvedValue({ data: '<div></div>' });

      const result = await fetcher.fetch();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });
});