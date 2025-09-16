/**
 * Contract Test: Police Forces Parser
 * Validates police-parser service behavior and output format using data.police.uk API
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PoliceParser } from '../../src/services/police-parser.js';
import axios from 'axios';

// Mock axios for testing
jest.mock('axios');

describe('Police Parser Contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchAll()', () => {
    it('should return array of PoliceForce objects from data.police.uk API', async () => {
      // GIVEN: data.police.uk API is available
      const mockForcesResponse = [
        { id: 'metropolitan', name: 'Metropolitan Police Service' },
        { id: 'west-midlands', name: 'West Midlands Police' },
        { id: 'greater-manchester', name: 'Greater Manchester Police' },
        { id: 'west-yorkshire', name: 'West Yorkshire Police' },
        { id: 'merseyside', name: 'Merseyside Police' }
      ];

      const mockForceDetails = {
        'metropolitan': {
          id: 'metropolitan',
          name: 'Metropolitan Police Service',
          url: 'https://www.met.police.uk/',
          telephone: '101'
        },
        'west-midlands': {
          id: 'west-midlands',
          name: 'West Midlands Police',
          url: 'https://www.west-midlands.police.uk/',
          telephone: '101'
        },
        'greater-manchester': {
          id: 'greater-manchester',
          name: 'Greater Manchester Police',
          url: 'https://www.gmp.police.uk/',
          telephone: '101'
        },
        'west-yorkshire': {
          id: 'west-yorkshire',
          name: 'West Yorkshire Police',
          url: 'https://www.westyorkshire.police.uk/',
          telephone: '101'
        },
        'merseyside': {
          id: 'merseyside',
          name: 'Merseyside Police',
          url: 'https://www.merseyside.police.uk/',
          telephone: '101'
        }
      };

      (axios.get as jest.MockedFunction<typeof axios.get>).mockImplementation((url) => {
        if (url === 'https://data.police.uk/api/forces') {
          return Promise.resolve({ data: mockForcesResponse });
        } else if (url.includes('/api/forces/')) {
          const forceId = url.split('/').pop();
          return Promise.resolve({ data: mockForceDetails[forceId as keyof typeof mockForceDetails] });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      const parser = new PoliceParser();

      // WHEN: Fetching all UK police forces
      const forces = await parser.fetchAll();

      // THEN: Should return valid police force data
      expect(Array.isArray(forces)).toBe(true);
      expect(forces.length).toBe(5);

      forces.forEach(force => {
        expect(force).toMatchObject({
          name: expect.any(String),
          serviceType: 'police',
          forceType: expect.stringMatching(/^(territorial|special|crown_dependency|overseas_territory)$/)
        });

        // Name should not be empty
        expect(force.name.length).toBeGreaterThan(0);

        // Territorial forces should have jurisdiction
        if (force.forceType === 'territorial') {
          expect(force.jurisdiction).toBeDefined();
          expect(force.jurisdiction.length).toBeGreaterThan(0);
        }
      });
    });

    it('should classify force types correctly', async () => {
      // GIVEN: API responses set up in first test
      const parser = new PoliceParser();

      // WHEN: Fetching all forces
      const forces = await parser.fetchAll();

      // THEN: Should classify forces as territorial (data.police.uk only has territorial forces)
      const forceTypes = new Set(forces.map(f => f.forceType));
      expect(forceTypes.has('territorial')).toBe(true);

      // Check for specific known forces
      const forceNames = forces.map(f => f.name.toLowerCase());
      const hasMetropolitan = forceNames.some(n => n.includes('metropolitan'));
      expect(hasMetropolitan).toBe(true);
    });

    it('should handle API response with website URLs', async () => {
      // GIVEN: API responses include website URLs
      const parser = new PoliceParser();

      // WHEN: Fetching all forces
      const forces = await parser.fetchAll();

      // THEN: Forces should include website URLs where available
      const forcesWithWebsites = forces.filter(f => f.website);
      expect(forcesWithWebsites.length).toBeGreaterThan(0);

      // Website URLs should be valid
      forcesWithWebsites.forEach(force => {
        expect(force.website).toMatch(/^https?:\/\//);
      });
    });
  });


  describe('Data Quality', () => {
    it('should have clean police force names from API', async () => {
      // GIVEN: API responses set up in first test
      const parser = new PoliceParser();

      // WHEN: Fetching forces
      const forces = await parser.fetchAll();

      // THEN: Names should be properly formatted
      forces.forEach(force => {
        // No leading/trailing whitespace
        expect(force.name).toBe(force.name.trim());

        // No double spaces
        expect(force.name).not.toMatch(/\s{2,}/);

        // Should have meaningful content
        expect(force.name.length).toBeGreaterThan(3);
      });
    });

    it('should handle missing optional fields gracefully', async () => {
      // GIVEN: API response with minimal data
      const mockMinimalResponse = [{ id: 'test-force', name: 'Test Police' }];
      const mockMinimalDetail = { id: 'test-force', name: 'Test Police' }; // No URL or telephone

      (axios.get as jest.MockedFunction<typeof axios.get>).mockImplementation((url) => {
        if (url === 'https://data.police.uk/api/forces') {
          return Promise.resolve({ data: mockMinimalResponse });
        } else if (url.includes('/api/forces/test-force')) {
          return Promise.resolve({ data: mockMinimalDetail });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      const parser = new PoliceParser();

      // WHEN: Fetching forces with minimal data
      const forces = await parser.fetchAll();

      // THEN: Should still create valid objects
      expect(forces).toHaveLength(1);
      expect(forces[0]).toMatchObject({
        name: 'Test Police',
        serviceType: 'police',
        forceType: 'territorial',
        jurisdiction: 'Test'
      });
      // website is optional and should not be present
      expect(forces[0].website).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // GIVEN: Network failure scenario
      (axios.get as jest.MockedFunction<typeof axios.get>).mockRejectedValue(new Error('Network error'));
      const parser = new PoliceParser();

      // WHEN: Attempting to fetch
      // THEN: Should throw error (no fallback for API-based approach)
      await expect(parser.fetchAll()).rejects.toThrow('Network error');
    });

    it('should handle empty API response', async () => {
      // GIVEN: API returns empty array
      (axios.get as jest.MockedFunction<typeof axios.get>).mockResolvedValue({ data: [] });
      const parser = new PoliceParser();

      // WHEN: Fetching forces
      // THEN: Should throw appropriate error
      await expect(parser.fetchAll()).rejects.toThrow('No police forces found in API response');
    });

    it('should handle individual force detail fetch failures', async () => {
      // GIVEN: Main API works but individual force details fail
      const mockResponse = [{ id: 'test-force', name: 'Test Police' }];

      (axios.get as jest.MockedFunction<typeof axios.get>).mockImplementation((url) => {
        if (url === 'https://data.police.uk/api/forces') {
          return Promise.resolve({ data: mockResponse });
        } else {
          return Promise.reject(new Error('Detail fetch failed'));
        }
      });

      const parser = new PoliceParser();

      // WHEN: Fetching forces
      const forces = await parser.fetchAll();

      // THEN: Should still return force with basic info
      expect(forces).toHaveLength(1);
      expect(forces[0]).toMatchObject({
        name: 'Test Police',
        serviceType: 'police'
      });
    });
  });
});

