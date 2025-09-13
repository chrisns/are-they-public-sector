import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { SchoolsParser } from '../../src/services/schools-parser.js';
import type { School, SchoolsResponse } from '../../src/models/school.js';
import axios from 'axios';

// Integration tests with mocked HTTP responses for reliability
describe('Schools Aggregation Integration Tests', () => {
  let parser: SchoolsParser;
  
  // Mock data that simulates real GIAS responses
  const mockSchoolsPage1 = Array.from({ length: 100 }, (_, i) => ({
    name: `School ${i + 1}`,
    location: i % 3 === 0 ? null : { 
      latitude: 51.5 + (i * 0.001), 
      longitude: -0.1 + (i * 0.001) 
    },
    address: `${i + 1} School Street, London, SW1A ${i}AA`,
    urn: 100000 + i,
    laestab: `201/${1000 + i}`,
    status: i % 10 === 0 ? 'Closed' : 'Open',
    localAuthority: ['Westminster', 'Camden', 'Islington'][i % 3],
    phaseType: ['Primary, Academy', 'Secondary, Community', 'Special'][i % 3]
  }));

  const mockSchoolsPage2 = Array.from({ length: 50 }, (_, i) => ({
    name: `School ${i + 101}`,
    location: { latitude: 52.5 + (i * 0.001), longitude: -1.9 + (i * 0.001) },
    address: `${i + 101} Academy Road, Birmingham, B1 ${i}AA`,
    urn: 100100 + i,
    laestab: `202/${2000 + i}`,
    status: 'Open',
    localAuthority: 'Birmingham',
    phaseType: 'Secondary, Academy converter'
  }));

  // Add a duplicate for deduplication testing
  mockSchoolsPage2[10] = {
    ...mockSchoolsPage1[50],
    name: 'Duplicate School Name'  // Different name but same URN
  };

  beforeAll(() => {
    parser = new SchoolsParser();
    
    // Mock axios for predictable testing
    jest.spyOn(axios, 'get').mockImplementation(async (url: string) => {
      const urlObj = new URL(url);
      const startIndex = parseInt(urlObj.searchParams.get('startIndex') || '0');
      
      if (startIndex === 0) {
        return { data: mockSchoolsPage1 };
      } else if (startIndex === 100) {
        return { data: mockSchoolsPage2 };
      } else {
        return { data: [] };  // Empty array signals end of pagination
      }
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('Full Aggregation Flow', () => {
    it('should aggregate all schools with pagination', async () => {
      const result = await parser.aggregate();
      
      expect(result).toBeDefined();
      expect(result.schools).toBeDefined();
      expect(result.metadata).toBeDefined();
      
      // Should have filtered out closed schools and deduplicated
      const expectedOpenSchools = [...mockSchoolsPage1, ...mockSchoolsPage2]
        .filter(s => s.status === 'Open');
      const uniqueUrns = new Set(expectedOpenSchools.map(s => s.urn));
      
      expect(result.schools.length).toBeLessThanOrEqual(uniqueUrns.size);
      expect(result.metadata.source).toBe('GIAS');
      expect(result.metadata.fetchedAt).toBeDefined();
    });

    it('should filter out closed schools', async () => {
      const result = await parser.aggregate();
      
      const closedSchools = result.schools.filter(s => s.status !== 'Open');
      expect(closedSchools).toHaveLength(0);
      
      // All schools should be open
      result.schools.forEach(school => {
        expect(school.status).toBe('Open');
      });
    });

    it('should handle null locations gracefully', async () => {
      const result = await parser.aggregate();
      
      // Some schools should have undefined lat/lng
      const schoolsWithoutLocation = result.schools.filter(
        s => s.latitude === undefined && s.longitude === undefined
      );
      
      expect(schoolsWithoutLocation.length).toBeGreaterThan(0);
      
      // Schools with location should have valid coordinates
      const schoolsWithLocation = result.schools.filter(
        s => s.latitude !== undefined && s.longitude !== undefined
      );
      
      schoolsWithLocation.forEach(school => {
        expect(typeof school.latitude).toBe('number');
        expect(typeof school.longitude).toBe('number');
        expect(school.latitude).toBeGreaterThanOrEqual(-90);
        expect(school.latitude).toBeLessThanOrEqual(90);
        expect(school.longitude).toBeGreaterThanOrEqual(-180);
        expect(school.longitude).toBeLessThanOrEqual(180);
      });
    });

    it('should deduplicate schools by URN', async () => {
      const result = await parser.aggregate();
      
      const urns = result.schools.map(s => s.urn);
      const uniqueUrns = new Set(urns);
      
      expect(urns.length).toBe(uniqueUrns.size);
    });

    it('should preserve all required fields', async () => {
      const result = await parser.aggregate();
      
      expect(result.schools.length).toBeGreaterThan(0);
      
      result.schools.forEach(school => {
        expect(school.urn).toBeDefined();
        expect(typeof school.urn).toBe('number');
        expect(school.name).toBeDefined();
        expect(school.name).not.toBe('');
        expect(school.status).toBe('Open');
        expect(school.phaseType).toBeDefined();
        expect(school.localAuthority).toBeDefined();
        expect(school.laestab).toBeDefined();
        expect(school.address).toBeDefined();
      });
    });
  });

  describe('Pagination Logic', () => {
    it('should fetch multiple pages until empty response', async () => {
      const schools = await parser.fetchAll();
      
      // Should have fetched from both pages
      expect(schools.length).toBeGreaterThan(100);
      expect(schools.length).toBeLessThan(200); // Some filtered out
    });

    it('should handle single page response', async () => {
      // Mock single page response
      jest.spyOn(axios, 'get').mockImplementation(async (url: string) => {
        const urlObj = new URL(url);
        const startIndex = parseInt(urlObj.searchParams.get('startIndex') || '0');
        
        if (startIndex === 0) {
          return { data: mockSchoolsPage2 };  // Just 50 schools
        } else {
          return { data: [] };
        }
      });

      const schools = await parser.fetchAll();
      expect(schools.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Error Recovery', () => {
    it('should retry on network failure', async () => {
      let attemptCount = 0;
      
      jest.spyOn(axios, 'get').mockImplementation(async () => {
        attemptCount++;
        if (attemptCount <= 2) {
          throw new Error('Network error');
        }
        return { data: mockSchoolsPage2 };
      });

      const schools = await parser.fetchAll();
      
      expect(attemptCount).toBeGreaterThan(2);
      expect(schools.length).toBeGreaterThan(0);
    });

    it('should handle rate limiting with exponential backoff', async () => {
      let attemptCount = 0;
      
      jest.spyOn(axios, 'get').mockImplementation(async () => {
        attemptCount++;
        if (attemptCount <= 1) {
          const error: any = new Error('Rate limited');
          error.response = { status: 429 };
          error.isAxiosError = true;
          throw error;
        }
        return { data: [] };
      });

      const startTime = Date.now();
      await parser.fetchPage(0);
      const duration = Date.now() - startTime;
      
      // Should have delayed due to backoff
      expect(duration).toBeGreaterThanOrEqual(1000);
      expect(attemptCount).toBe(2);
    });

    it('should fail fast on format changes', async () => {
      jest.spyOn(axios, 'get').mockImplementation(async () => {
        return { data: { error: 'Unexpected format' } };
      });

      await expect(parser.fetchPage(0)).rejects.toThrow();
    }, 10000);
  });

  describe('Metadata Generation', () => {
    it('should include accurate metadata', async () => {
      const beforeFetch = new Date();
      const result = await parser.aggregate();
      const afterFetch = new Date();
      
      expect(result.metadata.source).toBe('GIAS');
      
      const fetchedAt = new Date(result.metadata.fetchedAt);
      expect(fetchedAt.getTime()).toBeGreaterThanOrEqual(beforeFetch.getTime());
      expect(fetchedAt.getTime()).toBeLessThanOrEqual(afterFetch.getTime());
      
      expect(result.metadata.totalCount).toBe(result.schools.length);
      expect(result.metadata.openCount).toBe(result.schools.length);
    }, 10000);
  });

  describe('Performance', () => {
    it('should complete aggregation within reasonable time', async () => {
      const startTime = Date.now();
      const result = await parser.aggregate({ delayMs: 10 }); // Faster for testing
      const duration = Date.now() - startTime;
      
      // Should complete quickly with mocked data
      expect(duration).toBeLessThan(5000);
      expect(result.schools.length).toBeGreaterThan(0);
    }, 10000);
  });
});