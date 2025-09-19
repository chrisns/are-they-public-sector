/**
 * Contract tests for Scottish Courts Parser
 * These tests define the expected behavior and must fail initially (TDD)
 */

import { ScottishCourtsParser } from '../../src/services/scottish-courts-parser';

const describeIfNetwork = process.env.TEST_NETWORK ? describe : describe.skip;

describeIfNetwork('ScottishCourtsParser Contract', () => {
  let parser: ScottishCourtsParser;

  beforeEach(() => {
    parser = new ScottishCourtsParser();
  });

  describe('parse()', () => {
    it('should attempt to fetch Scottish courts data', async () => {
      // Act
      const result = await parser.parse();

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Should fetch court data from the website
      expect(result.length).toBeGreaterThan(40); // Expect at least 40 Scottish courts
      expect(result.length).toBeLessThan(100); // But not more than 100
    }, 60000); // Increase timeout for web scraping

    it('should handle known Scottish court types', async () => {
      // Act
      const result = await parser.parse();

      // Assert
      const courtTypes = result.map(c => c.type).flat();
      const hasScottishTypes = courtTypes.some(type =>
        type?.includes('Sheriff') ||
        type?.includes('Justice of the Peace') ||
        type?.includes('Court of Session')
      );
      expect(hasScottishTypes).toBe(true);
    }, 60000); // Increase timeout for web scraping

    it('should include major Scottish cities', async () => {
      // Act
      const result = await parser.parse();

      // Assert
      const locations = result.map(c => c.location?.town || '').filter(Boolean);
      const majorCities = ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee'];
      const hasMajorCity = majorCities.some(city =>
        locations.some(loc => loc.includes(city))
      );
      expect(hasMajorCity).toBe(true);
    }, 60000); // Increase timeout for web scraping

    it('should handle network errors gracefully', async () => {
      // Arrange
      jest.spyOn(parser as unknown as { fetchCourtUrls: () => Promise<string[]> }, 'fetchCourtUrls').mockRejectedValue(
        new Error('Network error')
      );

      // Act & Assert
      await expect(parser.parse()).rejects.toThrow('Failed to fetch Scottish courts data');
      expect(parser.getLastError()).toContain('Network error');
    });

    it('should parse court data from HTML correctly', async () => {
      // Arrange - mock the fetch methods
      jest.spyOn(parser as unknown as { fetchCourtUrls: () => Promise<string[]> }, 'fetchCourtUrls')
        .mockResolvedValue(['https://www.scotcourts.gov.uk/courts-and-tribunals/courts-tribunals-and-office-locations/find-us/edinburgh-sheriff-court']);

      // Act
      const result = await parser.parse();

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    }, 10000);

    it('should handle partial failures when fetching individual courts', async () => {
      // Arrange
      jest.spyOn(parser as unknown as { fetchCourtUrls: () => Promise<string[]> }, 'fetchCourtUrls')
        .mockResolvedValue(['https://invalid-url-1', 'https://invalid-url-2']);

      // Act
      const result = await parser.parse();

      // Assert - should return empty array if all URLs fail
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    }, 10000);
  });

  describe('mapping to Court model', () => {
    it('should map Scottish court data correctly', async () => {
      // Arrange
      const mapper = parser.getMapper();
      const rawCourt = {
        name: 'Edinburgh Sheriff Court',
        type: 'Sheriff Court',
        address: '27 Chambers Street, Edinburgh, EH1 1LB',
        telephone: '0131 225 2525'
      };

      // Act
      const court = mapper.map(rawCourt);

      // Assert
      expect(court.name).toBe('Edinburgh Sheriff Court');
      expect(court.type).toContain('Sheriff Court');
      expect(court.jurisdiction).toBe('Scotland');
      expect(court.status).toBe('active');
      expect(court.location).toBeDefined();
      expect(court.location.postcode).toBe('EH1 1LB');
      expect(court.contact).toBeDefined();
      expect(court.contact.telephone).toBe('0131 225 2525');
    });

    it('should handle minimal Scottish court data', async () => {
      // Arrange
      const mapper = parser.getMapper();
      const rawCourt = {
        name: 'Test Sheriff Court'
      };

      // Act
      const court = mapper.map(rawCourt);

      // Assert
      expect(court.name).toBe('Test Sheriff Court');
      expect(court.jurisdiction).toBe('Scotland');
      expect(court.type).toContain('Sheriff Court'); // Inferred from name
      expect(court.status).toBe('active');
    });

    it('should infer court type from name', async () => {
      // Arrange
      const mapper = parser.getMapper();
      const testCases = [
        { name: 'Aberdeen Sheriff Court', expectedType: 'Sheriff Court' },
        { name: 'Glasgow JP Court', expectedType: 'Justice of the Peace Court' },
        { name: 'Court of Session', expectedType: 'Court of Session' },
        { name: 'High Court of Justiciary', expectedType: 'High Court of Justiciary' }
      ];

      // Act & Assert
      testCases.forEach(testCase => {
        const court = mapper.map({ name: testCase.name });
        expect(court.type).toContain(testCase.expectedType);
      });
    });
  });

  describe('error handling', () => {
    it('should store last error message', async () => {
      // Arrange
      jest.spyOn(parser as unknown as { fetchCourtUrls: () => Promise<string[]> }, 'fetchCourtUrls')
        .mockRejectedValue(new Error('Test error'));

      // Act
      try {
        await parser.parse();
      } catch {
        // Expected to throw
      }

      // Assert
      expect(parser.getLastError()).toContain('Test error');
    });
  });
});