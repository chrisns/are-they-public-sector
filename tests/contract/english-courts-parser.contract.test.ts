/**
 * Contract tests for English Courts CSV Parser
 * These tests define the expected behavior and must fail initially (TDD)
 */

import { EnglishCourtsParser } from '../../src/services/english-courts-parser';

describe('EnglishCourtsParser Contract', () => {
  let parser: EnglishCourtsParser;

  beforeEach(() => {
    parser = new EnglishCourtsParser();
  });

  describe('parse()', () => {
    it('should fetch and parse courts data from the CSV URL', async () => {
      // Act
      const result = await parser.parse();

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(100); // Expect at least 100 courts
    });

    it('should parse court names correctly', async () => {
      // Act
      const result = await parser.parse();

      // Assert
      const firstCourt = result[0];
      expect(firstCourt.name).toBeDefined();
      expect(typeof firstCourt.name).toBe('string');
      expect(firstCourt.name.length).toBeGreaterThan(0);
    });

    it('should parse court types as array', async () => {
      // Act
      const result = await parser.parse();

      // Assert
      const courtsWithTypes = result.filter(c => c.types);
      expect(courtsWithTypes.length).toBeGreaterThan(0);

      const court = courtsWithTypes[0];
      expect(Array.isArray(court.types)).toBe(true);
    });

    it('should parse court status from open field', async () => {
      // Act
      const result = await parser.parse();

      // Assert
      const activeCourts = result.filter(c => c.open === 'true');
      const inactiveCourts = result.filter(c => c.open === 'false');

      expect(activeCourts.length).toBeGreaterThan(0);
      expect(inactiveCourts.length).toBeGreaterThan(0);
    });

    it('should extract location data from addresses field', async () => {
      // Act
      const result = await parser.parse();

      // Assert
      const courtsWithAddresses = result.filter(c => c.addresses);
      expect(courtsWithAddresses.length).toBeGreaterThan(0);

      // Addresses should be parseable JSON
      const court = courtsWithAddresses[0];
      expect(() => JSON.parse(court.addresses)).not.toThrow();
    });

    it('should include coordinates where available', async () => {
      // Act
      const result = await parser.parse();

      // Assert
      const courtsWithCoords = result.filter(c => c.lat && c.lon);
      expect(courtsWithCoords.length).toBeGreaterThan(0);

      const court = courtsWithCoords[0];
      expect(court.lat).toBeDefined();
      expect(court.lon).toBeDefined();
    });

    it('should parse areas of law as array', async () => {
      // Act
      const result = await parser.parse();

      // Assert
      const courtsWithAreas = result.filter(c => c.areas_of_law);
      expect(courtsWithAreas.length).toBeGreaterThan(0);

      // Should be parseable JSON array
      const court = courtsWithAreas[0];
      const areas = JSON.parse(court.areas_of_law);
      expect(Array.isArray(areas)).toBe(true);
    });

    it('should handle missing optional fields gracefully', async () => {
      // Act
      const result = await parser.parse();

      // Assert
      const courtWithMinimalData = result.find(c => !c.addresses || !c.areas_of_law);
      expect(courtWithMinimalData).toBeDefined();
      expect(courtWithMinimalData.name).toBeDefined();
    });

    it('should fail fast on network error', async () => {
      // Arrange
      jest.spyOn(parser as unknown as { fetchCSV: () => Promise<string> }, 'fetchCSV').mockRejectedValue(
        new Error('Network error')
      );

      // Act & Assert
      await expect(parser.parse()).rejects.toThrow('Network error');
    });

    it('should fail fast on invalid CSV format', async () => {
      // Arrange
      jest.spyOn(parser as unknown as { fetchCSV: () => Promise<string> }, 'fetchCSV').mockResolvedValue(
        'Not a valid CSV format'
      );

      // Act & Assert
      await expect(parser.parse()).rejects.toThrow(/CSV/i);
    });
  });

  describe('mapping to Court model', () => {
    it('should map raw data to Court entities', async () => {
      // Arrange
      const mapper = parser.getMapper();
      const rawCourt = {
        name: 'Test Court',
        types: '["County Court", "Family Court"]',
        open: 'true',
        lat: '51.5074',
        lon: '-0.1278',
        areas_of_law: '["Civil", "Family"]',
        addresses: '[{"type": "primary", "address": "123 Test St"}]'
      };

      // Act
      const court = mapper.map(rawCourt);

      // Assert
      expect(court.name).toBe('Test Court');
      expect(court.type).toEqual(['County Court', 'Family Court']);
      expect(court.status).toBe('active');
      expect(court.location).toBeDefined();
      expect(court.location.latitude).toBe(51.5074);
      expect(court.location.longitude).toBe(-0.1278);
      expect(court.areasOfLaw).toEqual(['Civil', 'Family']);
    });
  });
});