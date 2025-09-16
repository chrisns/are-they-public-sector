import axios from 'axios';
import { NHSCharitiesParser } from '../../src/services/nhs-charities-parser';
import { NHSCharitiesMapper } from '../../src/services/mappers/nhs-charities-mapper';
import { OrganisationType } from '../../src/models/organisation';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('NHS Charities Integration', () => {
  describe('Full flow: discover API → fetch → filter → map', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should discover API, fetch, filter, and map NHS Charities to Organisations', async () => {
      // Arrange - Mock page HTML with map ID
      const mockPageHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <script>
            const mapId = "163c6c5d80adb7";
            loadMap(mapId);
          </script>
        </head>
        <body>Map widget here</body>
        </html>
      `;

      // Mock API response
      const mockApiResponse = {
        success: true,
        results: [
          {
            name: 'Leeds Teaching Hospitals Charity',
            address: '123 Hospital Road',
            city: 'Leeds',
            postcode: 'LS1 3EX',
            country: 'England',
            website: 'https://example.nhs.uk',
            lat: 53.8008,
            lng: -1.5491
          },
          {
            name: 'Cardiff NHS Charity',
            address: '456 Medical Way',
            city: 'Cardiff',
            postcode: 'CF1 2AB',
            country: 'Wales'
          },
          {
            name: 'Edinburgh NHS Charity',
            city: 'Edinburgh',
            country: 'Scotland'
          },
          {
            name: 'Belfast NHS Charity',
            country: 'Northern Ireland'
          },
          {
            name: 'Unknown Location Charity'
            // No country specified
          }
        ]
      };

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockPageHtml }) // Page HTML
        .mockResolvedValueOnce({ data: mockApiResponse }); // API response

      // Act
      const parser = new NHSCharitiesParser();
      const mapper = new NHSCharitiesMapper();
      const charities = await parser.parse();
      const organisations = mapper.mapMany(charities);

      // Assert - Check API discovery
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://nhscharitiestogether.co.uk/about-us/nhs-charities-across-the-uk/',
        expect.objectContaining({
          timeout: 30000,
          headers: expect.objectContaining({
            'User-Agent': 'UK-Public-Sector-Aggregator/1.0'
          })
        })
      );

      // Assert - Check API call
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.storepoint.co/v1/163c6c5d80adb7/locations?rq',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/json'
          })
        })
      );

      // Should filter to England, Wales, and unknown only
      expect(charities).toHaveLength(3);
      expect(organisations).toHaveLength(3);

      // Verify first organisation (England)
      const firstOrg = organisations[0];
      expect(firstOrg.name).toBe('Leeds Teaching Hospitals Charity');
      expect(firstOrg.type).toBe(OrganisationType.CENTRAL_GOVERNMENT);
      expect(firstOrg.classification).toBe('NHS Charity');
      expect(firstOrg.location?.address).toBe('123 Hospital Road');
      expect(firstOrg.location?.region).toBe('Leeds');
      expect(firstOrg.location?.postalCode).toBe('LS1 3EX');
      expect(firstOrg.location?.country).toBe('United Kingdom');
      expect(firstOrg.location?.coordinates?.latitude).toBe(53.8008);
      expect(firstOrg.location?.coordinates?.longitude).toBe(-1.5491);
      expect(firstOrg.website).toBe('https://example.nhs.uk');
      expect(firstOrg.additionalProperties?.sponsor).toBe('Department of Health');
      expect(firstOrg.additionalProperties?.onsCode).toBe('S.1311');
      expect(firstOrg.additionalProperties?.source).toBe('nhs_charities');
      expect(firstOrg.additionalProperties?.originalCountry).toBe('England');

      // Verify second organisation (Wales)
      const secondOrg = organisations[1];
      expect(secondOrg.name).toBe('Cardiff NHS Charity');
      expect(secondOrg.additionalProperties?.originalCountry).toBe('Wales');

      // Verify third organisation (Unknown country)
      const thirdOrg = organisations[2];
      expect(thirdOrg.name).toBe('Unknown Location Charity');
      expect(thirdOrg.additionalProperties?.originalCountry).toBeUndefined();
    });

    it('should handle missing map ID', async () => {
      // Arrange
      mockedAxios.get.mockResolvedValueOnce({
        data: '<html><body>No map ID here</body></html>'
      });

      // Act & Assert
      const parser = new NHSCharitiesParser();
      await expect(parser.parse()).rejects.toThrow('Failed to fetch NHS Charities');
    });

    it('should handle API errors', async () => {
      // Arrange
      mockedAxios.get
        .mockResolvedValueOnce({
          data: '<script>const mapId = "test123";</script>'
        })
        .mockRejectedValueOnce(new Error('API error'));

      // Act & Assert
      const parser = new NHSCharitiesParser();
      await expect(parser.parse()).rejects.toThrow('Failed to fetch NHS Charities');
    });

    it('should handle invalid API response', async () => {
      // Arrange
      mockedAxios.get
        .mockResolvedValueOnce({
          data: '<script>const mapId = "test123";</script>'
        })
        .mockResolvedValueOnce({
          data: { success: false, error: 'Invalid request' }
        });

      // Act & Assert
      const parser = new NHSCharitiesParser();
      await expect(parser.parse()).rejects.toThrow('Invalid API response format');
    });

    it('should filter out Scotland and NI charities', async () => {
      // Arrange
      mockedAxios.get
        .mockResolvedValueOnce({
          data: '<script>const mapId = "test";</script>'
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            results: [
              { name: 'Scotland Charity', country: 'Scotland' },
              { name: 'NI Charity', country: 'Northern Ireland' },
              { name: 'England Charity', country: 'England' }
            ]
          }
        });

      // Act
      const parser = new NHSCharitiesParser();
      const charities = await parser.parse();

      // Assert
      expect(charities).toHaveLength(1);
      expect(charities[0].name).toBe('England Charity');
    });
  });
});