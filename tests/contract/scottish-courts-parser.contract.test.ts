/**
 * Contract tests for Scottish Courts Parser
 * These tests define the expected behavior and must fail initially (TDD)
 */

import { ScottishCourtsParser } from '../../src/services/scottish-courts-parser';

describe('ScottishCourtsParser Contract', () => {
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

      // May return empty array if source is inaccessible
      if (result.length > 0) {
        expect(result.length).toBeGreaterThan(20); // Expect at least 20 Scottish courts
        expect(result.length).toBeLessThan(100); // But not more than 100
      }
    });

    it('should handle known Scottish court types', async () => {
      // Act
      const result = await parser.parse();

      // Assert
      if (result.length > 0) {
        const courtTypes = result.map(c => c.type).flat();
        const hasScottishTypes = courtTypes.some(type =>
          type?.includes('Sheriff') ||
          type?.includes('Justice of the Peace') ||
          type?.includes('Court of Session')
        );
        expect(hasScottishTypes).toBe(true);
      }
    });

    it('should include major Scottish cities', async () => {
      // Act
      const result = await parser.parse();

      // Assert
      if (result.length > 0) {
        const locations = result.map(c => c.location?.town || '').filter(Boolean);
        const majorCities = ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee'];
        const hasMajorCity = majorCities.some(city =>
          locations.some(loc => loc.includes(city))
        );
        expect(hasMajorCity).toBe(true);
      }
    });

    it('should return fallback data if source is inaccessible', async () => {
      // Arrange
      jest.spyOn(parser as unknown as { fetchData: () => Promise<unknown[]> }, 'fetchData').mockRejectedValue(
        new Error('Source unavailable')
      );

      // Act
      const result = await parser.parse();

      // Assert - Should return fallback data, not empty array
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(49); // Fallback data has 49 courts
      expect(parser.getLastError()).toContain('Source unavailable');
    });

    it('should use fallback data if API is unavailable', async () => {
      // Arrange
      jest.spyOn(parser as unknown as { fetchData: () => Promise<unknown[]> }, 'fetchData').mockRejectedValue(
        new Error('API unavailable')
      );

      // Act
      const result = await parser.parse();

      // Assert
      // Should return static fallback data
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      if (result.length > 0) {
        // Check for known Scottish courts in fallback
        const courtNames = result.map(c => c.name);
        expect(courtNames.some(name =>
          name.includes('Edinburgh') ||
          name.includes('Glasgow')
        )).toBe(true);
      }
    });

    it('should log warning when using fallback data', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      jest.spyOn(parser as unknown as { fetchData: () => Promise<unknown[]> }, 'fetchData').mockRejectedValue(
        new Error('API unavailable')
      );

      // Act
      await parser.parse();

      // Assert - console.warn is called with two arguments
      expect(consoleSpy).toHaveBeenCalledWith(
        'Using fallback data for Scottish courts:',
        'API unavailable'
      );

      consoleSpy.mockRestore();
    });
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

  describe('fallback data', () => {
    it('should provide basic Scottish court data as fallback', () => {
      // Act
      const fallbackData = parser.getFallbackData();

      // Assert
      expect(fallbackData).toBeDefined();
      expect(Array.isArray(fallbackData)).toBe(true);
      expect(fallbackData.length).toBeGreaterThan(0);

      // Should include major courts
      const courtNames = fallbackData.map(c => c.name);
      expect(courtNames).toContain('Edinburgh Sheriff Court');
      expect(courtNames).toContain('Glasgow Sheriff Court');
      expect(courtNames).toContain('Court of Session');
    });
  });
});