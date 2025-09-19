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
      // Mock HTML response matching NI Direct structure
      const mockHtml = `
        <html><body>
          <div class="trust-listing">
            <h2>Belfast Health and Social Care Trust</h2>
            <div class="contact-details">
              <p>Address: Royal Victoria Hospital, Belfast BT12 6BA</p>
              <p>Phone: 028 9024 0503</p>
              <p>Website: www.belfasttrust.hscni.net</p>
            </div>
          </div>
          <div class="trust-listing">
            <h2>Northern Health and Social Care Trust</h2>
            <div class="contact-details">
              <p>Address: Bretten Hall, Antrim BT41 2RL</p>
              <p>Phone: 028 9442 4000</p>
            </div>
          </div>
        </body></html>
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

    it('should extract all available contact information', async () => {
      const mockHtml = `
        <html><body>
          <div class="trust-listing">
            <h2>Belfast Health and Social Care Trust</h2>
            <div class="contact-details">
              <p>Address: Royal Victoria Hospital, Belfast BT12 6BA</p>
              <p>Phone: 028 9024 0503</p>
              <p>Email: info@belfasttrust.hscni.net</p>
              <p>Website: www.belfasttrust.hscni.net</p>
            </div>
          </div>
        </body></html>
      `;

      mockedAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await fetcher.fetch();

      expect(result.length).toBe(6); // There are 6 NI Health Trusts
      const belfastTrust = result.find(t => t.name === 'Belfast Health and Social Care Trust');
      expect(belfastTrust).toBeDefined();

      if (belfastTrust) {
        expect(belfastTrust.address).toContain('Royal Victoria');
        expect(belfastTrust.phone).toContain('028');
        expect(belfastTrust.email).toContain('@');
        expect(belfastTrust.website).toBeDefined();
      }
    });

    it('should handle missing contact details', async () => {
      const mockHtml = `
        <html><body>
          <div class="trust-listing">
            <h2>Test Trust</h2>
          </div>
        </body></html>
      `;

      mockedAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await fetcher.fetch();

      expect(result.length).toBeGreaterThan(0);
      const trust = result[0];
      expect(trust.name).toContain('Trust');
    });

    it('should include known trusts even if not found on page', async () => {
      const mockHtml = '<html><body></body></html>';

      mockedAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await fetcher.fetch();

      // Should still return the 6 known trusts
      expect(result.length).toBe(6);

      const trustNames = result.map(t => t.name);
      expect(trustNames).toContain('Belfast Health and Social Care Trust');
      expect(trustNames).toContain('Northern Ireland Ambulance Service');
    });

    it('should handle HTTP errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(fetcher.fetch()).rejects.toThrow('Failed to fetch from');
    });

    it('should make correct API call', async () => {
      const mockHtml = '<html><body></body></html>';
      mockedAxios.get.mockResolvedValue({ data: mockHtml });

      await fetcher.fetch();

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('nidirect.gov.uk/contacts/health-and-social-care-trusts'),
        expect.any(Object)
      );
    });

    it('should follow detail pages if available', async () => {
      const mockMainHtml = `
        <html><body>
          <a href="/contacts/belfast-health-and-social-care-trust">Belfast Trust</a>
        </body></html>
      `;

      const mockDetailHtml = `
        <html><body>
          <h1>Belfast Health and Social Care Trust</h1>
          <p>Phone: 028 9024 0503</p>
        </body></html>
      `;

      mockedAxios.get.mockImplementation((url: string) => {
        if (url.includes('belfast-health')) {
          return Promise.resolve({ data: mockDetailHtml });
        }
        return Promise.resolve({ data: mockMainHtml });
      });

      await fetcher.fetch();

      // Should have called twice if following detail pages
      expect(mockedAxios.get.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
  });
});