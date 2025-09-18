import { ScottishCouncilsFetcher } from '../../src/services/fetchers/scottish-councils-fetcher';
import type { ScottishCommunityRaw } from '../../src/services/fetchers/scottish-councils-fetcher';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ScottishCouncilsFetcher Contract Tests', () => {
  let fetcher: ScottishCouncilsFetcher;

  beforeEach(() => {
    fetcher = new ScottishCouncilsFetcher();
    jest.clearAllMocks();
  });

  describe('fetch()', () => {
    it('should return array of ScottishCommunityRaw objects', async () => {
      // Mock response with sample Scottish council data
      const mockResponse = {
        data: {
          features: [
            {
              attributes: {
                name: 'Aberdeenshire Community Council',
                councilArea: 'Aberdeenshire',
                isActive: 'Yes',
                ward: 'Central Buchan',
                contactEmail: 'contact@example.com'
              }
            },
            {
              attributes: {
                name: 'Glasgow Community Council',
                councilArea: 'Glasgow City',
                isActive: 'Yes',
                ward: 'City Centre',
                contactEmail: 'info@glasgow.com'
              }
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await fetcher.fetch();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Verify each item conforms to ScottishCommunityRaw interface
      result.forEach((council: ScottishCommunityRaw) => {
        expect(council).toHaveProperty('name');
        expect(council).toHaveProperty('councilArea');
        expect(council).toHaveProperty('isActive');
        expect(typeof council.name).toBe('string');
        expect(typeof council.councilArea).toBe('string');
        expect(typeof council.isActive).toBe('string');
        expect(council.name.length).toBeGreaterThan(0);
        expect(council.councilArea.length).toBeGreaterThan(0);
      });
    });

    it('should return minimum 1100 councils', async () => {
      // Mock large dataset response
      const mockCouncils = Array.from({ length: 1300 }, (_, i) => ({
        attributes: {
          name: `Scottish Council ${i + 1}`,
          councilArea: `Area ${Math.floor(i / 100) + 1}`,
          isActive: 'Yes',
          ward: `Ward ${i % 20}`,
          contactEmail: `council${i}@scotland.gov.uk`
        }
      }));

      mockedAxios.get.mockResolvedValue({
        data: { features: mockCouncils }
      });

      const result = await fetcher.fetch();

      expect(result.length).toBeGreaterThanOrEqual(1100);
    });

    it('should verify required fields are present', async () => {
      const mockResponse = {
        data: {
          features: [
            {
              attributes: {
                name: 'Test Scottish Council',
                councilArea: 'Test Area',
                isActive: 'Yes',
                ward: 'Test Ward'
              }
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await fetcher.fetch();

      expect(result.length).toBe(1);
      const council = result[0];

      // Required fields
      expect(council.name).toBeDefined();
      expect(council.councilArea).toBeDefined();
      expect(council.isActive).toBeDefined();
      expect(council.name).toBe('Test Scottish Council');
      expect(council.councilArea).toBe('Test Area');
      expect(council.isActive).toBe('Yes');
    });

    it('should only include active councils', async () => {
      const mockResponse = {
        data: {
          features: [
            {
              attributes: {
                name: 'Active Council',
                councilArea: 'Active Area',
                isActive: 'Yes'
              }
            },
            {
              attributes: {
                name: 'Inactive Council',
                councilArea: 'Inactive Area',
                isActive: 'No'
              }
            },
            {
              attributes: {
                name: 'Another Active Council',
                councilArea: 'Another Area',
                isActive: 'Yes'
              }
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await fetcher.fetch();

      expect(result.length).toBe(2);
      result.forEach(council => {
        expect(council.isActive).toBe('Yes');
      });
    });

    it('should handle HTTP errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API unavailable'));

      await expect(fetcher.fetch()).rejects.toThrow('API unavailable');
    });

    it('should make correct API call to Scottish Government', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { features: [] }
      });

      await fetcher.fetch();

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('gov.scot'),
        expect.any(Object)
      );
    });
  });
});