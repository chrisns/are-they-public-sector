/**
 * Contract Test for GIAS CSV Fetcher Service
 * This file defines the expected behavior and interface for the GIAS CSV download service
 * Tests MUST be written to fail initially (RED phase of RED-GREEN-Refactor)
 */

import { GIASCSVFetcher } from '../../../src/services/gias-csv-fetcher';
import type { Organisation } from '../../../src/models/organisation';

describe('GIASCSVFetcher Contract', () => {
  let fetcher: GIASCSVFetcher;

  beforeEach(() => {
    fetcher = new GIASCSVFetcher();
  });

  describe('Service Interface', () => {
    it('should expose a fetch() method that returns schools data', async () => {
      // Arrange
      const expectedMinimumSchools = 50000;

      // Act
      const result = await fetcher.fetch();

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(expectedMinimumSchools);
    });

    it('should complete within performance target', async () => {
      // Arrange
      const maxDurationMs = 30000; // 30 seconds
      const startTime = Date.now();

      // Act
      await fetcher.fetch();
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(maxDurationMs);
    });
  });

  describe('Data Structure', () => {
    it('should return schools with required fields', async () => {
      // Act
      const schools = await fetcher.fetch();
      const firstSchool = schools[0];

      // Assert - Core required fields
      expect(firstSchool.URN).toBeDefined();
      expect(typeof firstSchool.URN).toBe('string');
      expect(firstSchool.EstablishmentName).toBeDefined();
      expect(typeof firstSchool.EstablishmentName).toBe('string');
      expect(firstSchool.EstablishmentStatus).toBeDefined();
      expect(firstSchool.LocalAuthorityName).toBeDefined();
    });

    it('should include location data where available', async () => {
      // Act
      const schools = await fetcher.fetch();
      const schoolsWithPostcode = schools.filter(s => s.Postcode);

      // Assert
      expect(schoolsWithPostcode.length).toBeGreaterThan(0);
      const school = schoolsWithPostcode[0];
      expect(school.Postcode).toMatch(/^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i);
    });

    it('should preserve all CSV fields', async () => {
      // Act
      const schools = await fetcher.fetch();
      const firstSchool = schools[0];

      // Assert - Should have 150+ fields from GIAS
      const fieldCount = Object.keys(firstSchool).length;
      expect(fieldCount).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Session Management', () => {
    it('should handle session initialization automatically', async () => {
      // This is internal but we test the outcome
      // Act & Assert - Should not throw
      await expect(fetcher.fetch()).resolves.toBeDefined();
    });

    it('should manage CSRF tokens transparently', async () => {
      // This is internal but affects success
      // Multiple calls should work (new session each time)

      // Act & Assert
      const result1 = await fetcher.fetch();
      expect(result1).toBeDefined();

      const result2 = await fetcher.fetch();
      expect(result2).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw meaningful error when service unavailable', async () => {
      // Arrange - Mock network failure
      const fetcherWithBadUrl = new GIASCSVFetcher({
        baseUrl: 'https://invalid-domain-that-does-not-exist.gov.uk'
      });

      // Act & Assert
      await expect(fetcherWithBadUrl.fetch()).rejects.toThrow(/service unavailable|network|connection/i);
    });

    it('should handle rate limiting gracefully', async () => {
      // Arrange - Rapid sequential requests
      const promises = Array(3).fill(null).map(() => fetcher.fetch());

      // Act & Assert - Should handle without crashing
      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThanOrEqual(1);
    });

    it('should provide clear error for corrupted downloads', async () => {
      // This would need mock implementation
      // Testing the contract that errors are meaningful

      // Arrange
      jest.spyOn(fetcher, 'extractCSV' as any).mockImplementation(() => {
        throw new Error('Invalid ZIP file: corrupted data at byte 1024');
      });

      // Act & Assert
      await expect(fetcher.fetch()).rejects.toThrow(/ZIP|corrupt|extract/i);
    });
  });

  describe('Data Validation', () => {
    it('should validate school count is within expected range', async () => {
      // Act
      const schools = await fetcher.fetch();

      // Assert
      expect(schools.length).toBeGreaterThanOrEqual(50000);
      expect(schools.length).toBeLessThanOrEqual(60000);
    });

    it('should ensure URNs are unique', async () => {
      // Act
      const schools = await fetcher.fetch();
      const urns = schools.map(s => s.URN);
      const uniqueUrns = new Set(urns);

      // Assert
      expect(uniqueUrns.size).toBe(urns.length);
    });

    it('should include both open and closed schools', async () => {
      // Act
      const schools = await fetcher.fetch();
      const openSchools = schools.filter(s => s.EstablishmentStatus === 'Open');
      const closedSchools = schools.filter(s => s.EstablishmentStatus === 'Closed');

      // Assert
      expect(openSchools.length).toBeGreaterThan(0);
      expect(closedSchools.length).toBeGreaterThan(0);
    });
  });

  describe('CSV Parsing', () => {
    it('should handle quoted fields with commas correctly', async () => {
      // Act
      const schools = await fetcher.fetch();
      const schoolsWithCommasInName = schools.filter(s =>
        s.EstablishmentName && s.EstablishmentName.includes(',')
      );

      // Assert - Should parse these correctly
      if (schoolsWithCommasInName.length > 0) {
        const school = schoolsWithCommasInName[0];
        expect(school.EstablishmentName).not.toContain('"');
        expect(school.URN).toBeDefined();
      }
    });

    it('should handle empty fields as empty strings', async () => {
      // Act
      const schools = await fetcher.fetch();
      const schoolWithEmptyFields = schools.find(s => !s.SchoolWebsite);

      // Assert
      expect(schoolWithEmptyFields).toBeDefined();
      expect(schoolWithEmptyFields!.SchoolWebsite).toBe('');
    });

    it('should preserve special characters and encoding', async () => {
      // Act
      const schools = await fetcher.fetch();
      const schoolsWithSpecialChars = schools.filter(s =>
        s.EstablishmentName && /[''&]/.test(s.EstablishmentName)
      );

      // Assert
      expect(schoolsWithSpecialChars.length).toBeGreaterThan(0);
    });
  });

  describe('Integration Points', () => {
    it('should be compatible with SchoolsMapper', async () => {
      // Arrange
      const { SchoolsMapper } = await import('../../../src/services/mappers/schools-mapper');
      const mapper = new SchoolsMapper();

      // Act
      const schools = await fetcher.fetch();
      const mapped = mapper.mapMany(schools.slice(0, 10));

      // Assert
      expect(mapped).toBeDefined();
      expect(mapped.length).toBe(10);
      mapped.forEach(org => {
        expect(org.id).toBeDefined();
        expect(org.name).toBeDefined();
        expect(org.type).toBeDefined();
        expect(org.classification).toBe('School');
      });
    });

    it('should provide data suitable for orchestrator', async () => {
      // Act
      const schools = await fetcher.fetch();

      // Assert - Check data structure matches orchestrator expectations
      expect(schools).toBeDefined();
      expect(Array.isArray(schools)).toBe(true);
      expect(schools.length).toBeGreaterThan(0);

      // Should be directly mappable
      const sample = schools[0];
      expect(sample).toHaveProperty('URN');
      expect(sample).toHaveProperty('EstablishmentName');
    });
  });
});

/**
 * Expected Implementation Notes:
 *
 * 1. The service should follow the pattern from test/gias.js
 * 2. Session management should be internal (not exposed to consumers)
 * 3. All retries and error recovery should be automatic
 * 4. The service should be stateless (new session per fetch())
 * 5. Performance target of 30 seconds is critical
 * 6. Data completeness (all schools) is more important than speed
 */