/**
 * Contract Test for GIAS CSV Fetcher Service
 * Tests MUST be written to fail initially (RED phase of RED-GREEN-Refactor)
 */

import { GIASCSVFetcher } from '../../src/services/gias-csv-fetcher';

describe('GIASCSVFetcher Contract', () => {
  let fetcher: GIASCSVFetcher;

  beforeEach(() => {
    fetcher = new GIASCSVFetcher();
  });

  describe('fetch()', () => {
    it('should fetch complete UK schools dataset', async () => {
      // Act
      const result = await fetcher.fetch();

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(50000);
      expect(result.length).toBeLessThanOrEqual(60000);
    }, 60000); // 60 second timeout

    it('should complete within performance target', async () => {
      // Arrange
      const maxDurationMs = 30000; // 30 seconds
      const startTime = Date.now();

      // Act
      await fetcher.fetch();
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(maxDurationMs);
    }, 35000);

    it('should return schools with required GIAS fields', async () => {
      // Act
      const schools = await fetcher.fetch();
      const firstSchool = schools[0];

      // Assert - Core required fields from GIAS CSV
      expect(firstSchool).toHaveProperty('URN');
      expect(firstSchool).toHaveProperty('EstablishmentName');
      expect(firstSchool).toHaveProperty('EstablishmentStatus (name)');
      expect(firstSchool).toHaveProperty('LA (name)');
      expect(firstSchool).toHaveProperty('TypeOfEstablishment (name)');
      expect(firstSchool).toHaveProperty('PhaseOfEducation (name)');
    }, 60000);

    it('should include location data', async () => {
      // Act
      const schools = await fetcher.fetch();
      const schoolsWithPostcode = schools.filter(s => s.Postcode);

      // Assert
      expect(schoolsWithPostcode.length).toBeGreaterThan(45000); // Most schools have postcodes
      const school = schoolsWithPostcode[0];
      expect(school.Postcode).toMatch(/^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i);
    }, 60000);

    it('should handle both open and closed schools', async () => {
      // Act
      const schools = await fetcher.fetch();
      const openSchools = schools.filter(s => s['EstablishmentStatus (name)'] === 'Open');
      const closedSchools = schools.filter(s => s['EstablishmentStatus (name)'] === 'Closed');

      // Assert - adjusted to match current data
      expect(openSchools.length).toBeGreaterThan(25000);
      expect(closedSchools.length).toBeGreaterThan(15000);
    }, 60000);

    it('should ensure URNs are unique', async () => {
      // Act
      const schools = await fetcher.fetch();
      const urns = schools.map(s => s.URN);
      const uniqueUrns = new Set(urns);

      // Assert
      expect(uniqueUrns.size).toBe(urns.length);
    }, 60000);
  });

  describe('error handling', () => {
    it('should throw meaningful error when service unavailable', async () => {
      // Arrange
      const fetcherWithBadUrl = new GIASCSVFetcher({
        baseUrl: 'https://invalid-domain-that-does-not-exist.gov.uk'
      });

      // Act & Assert
      await expect(fetcherWithBadUrl.fetch()).rejects.toThrow();
    });
  });
});