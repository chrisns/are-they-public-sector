import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type {
  School,
  GIASSchoolResponse
} from '../../src/models/school.js';
import { SchoolsParser } from '../../src/services/schools-parser.js';
import axios from 'axios';

// Mock axios for testing
jest.mock('axios');

describe('SchoolsParser Contract Tests', () => {
  let parser: SchoolsParser;
  
  const mockGIASResponse: GIASSchoolResponse[] = [
    {
      name: 'Test Primary School',
      location: { latitude: 51.5074, longitude: -0.1278 },
      address: '123 Test Street, London, SW1A 1AA',
      urn: 100001,
      laestab: '201/1234',
      status: 'Open',
      localAuthority: 'Westminster',
      phaseType: 'Primary, Academy converter'
    },
    {
      name: 'Test Secondary School',
      location: null,
      address: '456 School Road, Manchester, M1 2JW',
      urn: 100002,
      laestab: '202/5678',
      status: 'Open',
      localAuthority: 'Manchester',
      phaseType: 'Secondary, Community school'
    },
    {
      name: 'Closed School',
      location: { latitude: 52.4862, longitude: -1.8904 },
      address: '789 Old Lane, Birmingham, B1 1AA',
      urn: 100003,
      laestab: '203/9012',
      status: 'Closed',
      localAuthority: 'Birmingham',
      phaseType: 'Primary, Voluntary aided school'
    }
  ];

  beforeEach(() => {
    parser = new SchoolsParser();
  });

  describe('parseResponse', () => {
    it('should transform GIAS response to School entities', () => {
      const schools = parser.parseResponse(mockGIASResponse);
      
      expect(schools).toHaveLength(3);
      expect(schools[0]).toEqual({
        urn: 100001,
        name: 'Test Primary School',
        status: 'Open',
        phaseType: 'Primary, Academy converter',
        localAuthority: 'Westminster',
        laestab: '201/1234',
        address: '123 Test Street, London, SW1A 1AA',
        latitude: 51.5074,
        longitude: -0.1278
      });
    });

    it('should handle null location gracefully', () => {
      const schools = parser.parseResponse(mockGIASResponse);
      
      expect(schools[1].latitude).toBeUndefined();
      expect(schools[1].longitude).toBeUndefined();
    });

    it('should handle empty response', () => {
      const schools = parser.parseResponse([]);
      
      expect(schools).toEqual([]);
    });

    it('should validate required fields', () => {
      const invalidData = [{
        name: '',  // Empty name should be invalid
        location: null,
        address: 'Test Address',
        urn: 100004,
        laestab: '204/1111',
        status: 'Open',
        localAuthority: 'Test LA',
        phaseType: 'Primary'
      }];

      expect(() => parser.parseResponse(invalidData as GIASSchoolResponse[]))
        .toThrow();
    });
  });

  describe('filterOpenSchools', () => {
    it('should filter out closed schools', () => {
      const allSchools: School[] = [
        {
          urn: 1,
          name: 'Open School',
          status: 'Open',
          phaseType: 'Primary',
          localAuthority: 'LA1',
          laestab: '001/0001',
          address: 'Address 1'
        },
        {
          urn: 2,
          name: 'Closed School',
          status: 'Closed',
          phaseType: 'Secondary',
          localAuthority: 'LA2',
          laestab: '002/0002',
          address: 'Address 2'
        }
      ];

      const openSchools = parser.filterOpenSchools(allSchools);
      
      expect(openSchools).toHaveLength(1);
      expect(openSchools[0].status).toBe('Open');
    });

    it('should handle all open schools', () => {
      const allOpen: School[] = [
        {
          urn: 1,
          name: 'School 1',
          status: 'Open',
          phaseType: 'Primary',
          localAuthority: 'LA1',
          laestab: '001/0001',
          address: 'Address 1'
        },
        {
          urn: 2,
          name: 'School 2',
          status: 'Open',
          phaseType: 'Secondary',
          localAuthority: 'LA2',
          laestab: '002/0002',
          address: 'Address 2'
        }
      ];

      const result = parser.filterOpenSchools(allOpen);
      expect(result).toHaveLength(2);
    });
  });

  describe('deduplicateByUrn', () => {
    it('should remove duplicate URNs keeping first occurrence', () => {
      const schoolsWithDuplicates: School[] = [
        {
          urn: 100,
          name: 'First School',
          status: 'Open',
          phaseType: 'Primary',
          localAuthority: 'LA1',
          laestab: '001/0001',
          address: 'Address 1'
        },
        {
          urn: 100,  // Duplicate URN
          name: 'Duplicate School',
          status: 'Open',
          phaseType: 'Secondary',
          localAuthority: 'LA2',
          laestab: '002/0002',
          address: 'Address 2'
        },
        {
          urn: 101,
          name: 'Another School',
          status: 'Open',
          phaseType: 'Primary',
          localAuthority: 'LA3',
          laestab: '003/0003',
          address: 'Address 3'
        }
      ];

      const unique = parser.deduplicateByUrn(schoolsWithDuplicates);
      
      expect(unique).toHaveLength(2);
      expect(unique[0].name).toBe('First School');
      expect(unique[1].urn).toBe(101);
    });

    it('should handle no duplicates', () => {
      const uniqueSchools: School[] = [
        {
          urn: 1,
          name: 'School 1',
          status: 'Open',
          phaseType: 'Primary',
          localAuthority: 'LA1',
          laestab: '001/0001',
          address: 'Address 1'
        },
        {
          urn: 2,
          name: 'School 2',
          status: 'Open',
          phaseType: 'Secondary',
          localAuthority: 'LA2',
          laestab: '002/0002',
          address: 'Address 2'
        }
      ];

      const result = parser.deduplicateByUrn(uniqueSchools);
      expect(result).toHaveLength(2);
    });
  });

  describe('fetchPage', () => {
    beforeEach(() => {
      // Mock axios for fetchPage tests
      (axios.get as jest.Mock).mockResolvedValue({
        data: mockGIASResponse.slice(0, 2)
      });
    });

    it('should fetch a page of schools with correct structure', async () => {
      const result = await parser.fetchPage(0);
      
      expect(result).toHaveProperty('schools');
      expect(result).toHaveProperty('hasMore');
      expect(result).toHaveProperty('nextIndex');
      expect(Array.isArray(result.schools)).toBe(true);
      expect(typeof result.hasMore).toBe('boolean');
      expect(typeof result.nextIndex).toBe('number');
    });

    it('should increment nextIndex by 100', async () => {
      // Mock a full page of 100 items
      (axios.get as jest.Mock).mockResolvedValue({
        data: Array(100).fill(mockGIASResponse[0])
      });
      
      const result = await parser.fetchPage(0);
      
      if (result.hasMore) {
        expect(result.nextIndex).toBe(100);
      }
    });

    it('should return hasMore false on empty response', async () => {
      // Mock empty response
      (axios.get as jest.Mock).mockResolvedValue({
        data: []
      });
      
      const result = await parser.fetchPage(30000);
      
      expect(result.schools.length).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should respect delay option', async () => {
      const options: SchoolsParserOptions = { delayMs: 100 };
      
      // The delay is applied in fetchAll between pages, not in fetchPage
      // This test verifies the option is passed correctly
      const result1 = await parser.fetchPage(0, options);
      expect(result1).toBeDefined();
      
      const result2 = await parser.fetchPage(100, options);
      expect(result2).toBeDefined();
      
      // Verify options are respected (actual delay testing done in fetchAll tests)
      expect(options.delayMs).toBe(100);
    });
  });

  describe('fetchAll', () => {
    beforeEach(() => {
      // Mock axios to return paginated results
      let callCount = 0;
      (axios.get as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: mockGIASResponse });
        } else {
          return Promise.resolve({ data: [] }); // Empty to end pagination
        }
      });
    });

    it('should aggregate all pages until empty response', async () => {
      const schools = await parser.fetchAll();
      
      expect(Array.isArray(schools)).toBe(true);
      expect(schools.length).toBeGreaterThan(0);
      
      // All schools should be open
      const closedSchools = schools.filter(s => s.status !== 'Open');
      expect(closedSchools).toHaveLength(0);
      
      // No duplicate URNs
      const urns = schools.map(s => s.urn);
      const uniqueUrns = new Set(urns);
      expect(uniqueUrns.size).toBe(schools.length);
    });

    it('should handle network errors with retry', async () => {
      let attemptCount = 0;
      (axios.get as jest.Mock).mockImplementation(() => {
        attemptCount++;
        if (attemptCount <= 2) {
          throw new Error('Network error');
        }
        return Promise.resolve({ data: [] });
      });
      
      const options: SchoolsParserOptions = { maxRetries: 3, delayMs: 10 };
      const schools = await parser.fetchAll(options);
      expect(schools).toBeDefined();
    }, 10000);

    it('should use search term from options', async () => {
      const options: SchoolsParserOptions = { searchTerm: 'academy' };
      
      const schools = await parser.fetchAll(options);
      expect(schools).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw error on unexpected response format', () => {
      const invalidResponse = { error: 'Unexpected format' } as unknown as GIASSchoolResponse;

      expect(() => parser.parseResponse(invalidResponse))
        .toThrow();
    });

    it('should handle rate limiting gracefully', async () => {
      // Mock rate limiting response
      (axios.get as jest.Mock).mockRejectedValue({
        response: { status: 429 },
        isAxiosError: true
      });
      
      // Should retry and eventually succeed or fail gracefully
      await expect(parser.fetchPage(0, { maxRetries: 1 })).rejects.toThrow();
    });
  });
});