/**
 * Contract test for NHS Charities Parser
 * This test MUST be written before implementation (TDD)
 */

import { NHSCharitiesParser } from '../../src/services/nhs-charities-parser';

describe('NHSCharitiesParser Contract', () => {
  let parser: NHSCharitiesParser;

  beforeEach(() => {
    parser = new NHSCharitiesParser();
  });

  describe('parse()', () => {
    it('should fetch and parse NHS Charities from API', async () => {
      // Act
      const result = await parser.parse();

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(100); // Expect many charities
    });

    it('should filter for England and Wales charities only', async () => {
      // Act
      const result = await parser.parse();

      // Assert
      const countries = result.map(c => c.country).filter(Boolean);
      const validCountries = ['England', 'Wales'];

      countries.forEach(country => {
        expect(validCountries).toContain(country);
      });
    });

    it('should extract charity details from API response', async () => {
      // Act
      const result = await parser.parse();

      // Assert
      const firstCharity = result[0];
      expect(firstCharity.name).toBeDefined();
      expect(typeof firstCharity.name).toBe('string');
      expect(firstCharity.name.length).toBeGreaterThan(0);
    });

    it('should include location data where available', async () => {
      // Act
      const result = await parser.parse();

      // Assert
      const charitiesWithCoords = result.filter(c => c.lat && c.lng);
      expect(charitiesWithCoords.length).toBeGreaterThan(0);

      const charity = charitiesWithCoords[0];
      expect(typeof charity.lat).toBe('number');
      expect(typeof charity.lng).toBe('number');
    });
  });

  describe('discoverApiUrl()', () => {
    it('should extract API URL from NHS Charities webpage', async () => {
      // Act
      const apiUrl = await (parser['discoverApiUrl'] as () => Promise<string>)();

      // Assert
      expect(apiUrl).toBeDefined();
      expect(apiUrl).toContain('storepoint.co');
      expect(apiUrl).toContain('/locations');
    });

    it('should extract map ID from JavaScript', async () => {
      // Arrange
      const mockHtml = `
        <script>
          const mapId = "163c6c5d80adb7";
          loadMap(mapId);
        </script>
      `;

      // Act
      const mapId = (parser['extractMapId'] as (html: string) => string)(mockHtml);

      // Assert
      expect(mapId).toBe('163c6c5d80adb7');
    });

    it('should handle missing map ID', async () => {
      // Arrange
      const mockHtml = '<html><body>No map here</body></html>';

      // Act & Assert
      expect(() => (parser['extractMapId'] as (html: string) => string)(mockHtml)).toThrow('Map ID not found');
    });
  });

  describe('fetchApiData()', () => {
    it('should fetch JSON from Storepoint API', async () => {
      // Arrange
      const apiUrl = 'https://api.storepoint.co/v1/163c6c5d80adb7/locations?rq';

      // Act
      const data = await (parser['fetchApiData'] as (url: string) => Promise<{success: boolean, results: unknown[]}>)(apiUrl);

      // Assert
      expect(data).toBeDefined();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.results)).toBe(true);
    });

    it('should handle API errors gracefully', async () => {
      // Arrange - Mock API failure
      jest.spyOn(parser, 'fetchApiData' as keyof typeof parser).mockRejectedValue(
        new Error('API error')
      );

      // Act & Assert
      await expect(parser.parse()).rejects.toThrow('Failed to fetch NHS Charities');
    });
  });

  describe('filterEnglandWales()', () => {
    it('should filter charities to England and Wales only', () => {
      // Arrange
      const mockCharities = [
        { name: 'England Charity', country: 'England' },
        { name: 'Wales Charity', country: 'Wales' },
        { name: 'Scotland Charity', country: 'Scotland' },
        { name: 'NI Charity', country: 'Northern Ireland' },
        { name: 'Unknown Charity', country: null }
      ];

      // Act
      const filtered = (parser['filterEnglandWales'] as (charities: unknown[]) => unknown[])(mockCharities);

      // Assert
      expect(filtered).toHaveLength(3); // England, Wales, and Unknown
      expect(filtered.map(c => c.name)).toContain('England Charity');
      expect(filtered.map(c => c.name)).toContain('Wales Charity');
      expect(filtered.map(c => c.name)).toContain('Unknown Charity'); // Include if country unknown
      expect(filtered.map(c => c.name)).not.toContain('Scotland Charity');
      expect(filtered.map(c => c.name)).not.toContain('NI Charity');
    });
  });

  describe('retry logic', () => {
    it('should retry on network failure', async () => {
      // Arrange
      const fetchSpy = jest.spyOn(parser, 'fetchHTML' as keyof typeof parser)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('<html>...</html>');

      // Act
      await (parser['fetchWithRetry'] as () => Promise<string>)();

      // Assert
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      // Arrange
      jest.spyOn(parser, 'fetchHTML' as keyof typeof parser)
        .mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect((parser['fetchWithRetry'] as () => Promise<string>)()).rejects.toThrow('Failed after retries');
    });
  });
});