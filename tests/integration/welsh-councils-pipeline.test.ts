import axios from 'axios';
import { WelshCouncilsFetcher } from '../../src/services/fetchers/welsh-councils-fetcher';
import { CommunityCouncilsMapper } from '../../src/services/mappers/community-councils-mapper';
import { OrganisationType } from '../../src/models/organisation';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedAxiosInstance = {
  get: jest.fn()
};

const describeIfNetwork = process.env.TEST_NETWORK ? describe : describe.skip;

describeIfNetwork('Welsh Councils Pipeline Integration', () => {
  describe('Full flow: fetch → parse → map', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Mock axios.create to return our mocked instance
      (mockedAxios.create as jest.Mock).mockReturnValue(mockedAxiosInstance);
    });

    it('should fetch, parse, and map Welsh Community Councils to Organisations', async () => {
      // Arrange - Mock Wikipedia HTML response
      const mockHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>List of communities in Wales - Wikipedia</title></head>
        <body>
          <div class="mw-content-text">
            <h2>Blaenau Gwent</h2>
            <table class="wikitable">
              <tr>
                <th>Community</th>
                <th>Population</th>
                <th>Website</th>
              </tr>
              <tr>
                <td><a href="/wiki/Abertillery" title="Abertillery">Abertillery</a></td>
                <td>11,194</td>
                <td><a href="http://www.abertillery.gov.uk">www.abertillery.gov.uk</a></td>
              </tr>
              <tr>
                <td><a href="/wiki/Blaina" title="Blaina">Blaina</a></td>
                <td>4,830</td>
                <td></td>
              </tr>
            </table>

            <h2>Bridgend</h2>
            <table class="wikitable">
              <tr>
                <th>Community</th>
                <th>Population</th>
                <th>Notes</th>
              </tr>
              <tr>
                <td><a href="/wiki/Brackla" title="Brackla">Brackla</a></td>
                <td>13,030</td>
                <td>Large suburban community</td>
              </tr>
              <tr>
                <td><a href="/wiki/Coity" title="Coity">Coity</a></td>
                <td>2,456</td>
                <td>Historic village</td>
              </tr>
            </table>
          </div>
        </body>
        </html>
      `;

      mockedAxiosInstance.get.mockResolvedValueOnce({ data: mockHtml });

      // Act
      const fetcher = new WelshCouncilsFetcher({ skipValidation: true }); // Skip validation for test data
      const mapper = new CommunityCouncilsMapper();

      const rawData = await fetcher.fetch();
      const organisations = mapper.mapWelshCouncils(rawData);

      // Assert - Verify HTTP request
      expect(mockedAxiosInstance.get).toHaveBeenCalledWith(
        'https://en.wikipedia.org/wiki/List_of_communities_in_Wales'
      );

      // Verify parsing results
      expect(rawData).toHaveLength(4);
      expect(organisations).toHaveLength(4);

      // Verify first organisation (Abertillery)
      const abertillery = organisations.find(org => org.name === 'Abertillery');
      expect(abertillery).toBeDefined();
      expect(abertillery?.name).toBe('Abertillery');
      expect(abertillery?.type).toBe(OrganisationType.WELSH_COMMUNITY_COUNCIL);
      expect(abertillery?.classification).toBe('Welsh Community Council');
      expect(abertillery?.location?.region).toBe('Blaenau Gwent');
      expect(abertillery?.location?.country).toBe('Wales');
      expect(abertillery?.status).toBe('active');
      expect(abertillery?.additionalProperties?.population).toBe(11194);
      expect(abertillery?.additionalProperties?.website).toBe('http://www.abertillery.gov.uk');
      expect(abertillery?.additionalProperties?.source).toBe('welsh-councils');

      // Verify second organisation (Blaina - no website)
      const blaina = organisations.find(org => org.name === 'Blaina');
      expect(blaina).toBeDefined();
      expect(blaina?.additionalProperties?.population).toBe(4830);
      expect(blaina?.additionalProperties?.website).toBeUndefined();

      // Verify third organisation (Brackla with notes)
      const brackla = organisations.find(org => org.name === 'Brackla');
      expect(brackla).toBeDefined();
      expect(brackla?.location?.region).toBe('Bridgend');
      expect(brackla?.additionalProperties?.notes).toBe('Large suburban community');

      // Verify data quality
      organisations.forEach(org => {
        expect(org.sources).toHaveLength(1);
        expect(org.sources[0].source).toBe('manual');
        expect(org.sources[0].confidence).toBe(0.9);
        expect(org.dataQuality.completeness).toBeGreaterThan(0.7);
        expect(org.lastUpdated).toBeDefined();
      });
    });

    it('should handle network errors with retries', async () => {
      // Arrange - Mock network failures then success
      mockedAxiosInstance.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({
          data: `
            <div class="mw-content-text">
              <h2>Test Area</h2>
              <table class="wikitable">
                <tr><th>Community</th><th>Population</th></tr>
                <tr><td><a href="/wiki/Test">Test Community</a></td><td>1000</td></tr>
              </table>
            </div>
          `
        });

      // Act
      const fetcher = new WelshCouncilsFetcher({ skipValidation: true });
      const rawData = await fetcher.fetch();

      // Assert
      expect(mockedAxiosInstance.get).toHaveBeenCalledTimes(3);
      expect(rawData).toBeDefined();
    });

    it('should fail after max retries', async () => {
      // Arrange
      mockedAxiosInstance.get.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      const fetcher = new WelshCouncilsFetcher({ skipValidation: true });
      await expect(fetcher.fetch()).rejects.toThrow('Failed to fetch Welsh community councils');
      expect(mockedAxiosInstance.get).toHaveBeenCalledTimes(3);
    });

    it('should handle empty table data', async () => {
      // Arrange
      mockedAxiosInstance.get.mockResolvedValueOnce({
        data: `
          <div class="mw-content-text">
            <h2>Empty Area</h2>
            <table class="wikitable">
              <tr><th>Community</th><th>Population</th></tr>
            </table>
          </div>
        `
      });

      // Act & Assert
      const fetcher = new WelshCouncilsFetcher({ skipValidation: true });
      const mapper = new CommunityCouncilsMapper();

      const rawData = await fetcher.fetch();
      expect(() => mapper.mapWelshCouncils(rawData)).toThrow('No valid communities found');
    });

    it('should handle malformed HTML', async () => {
      // Arrange
      mockedAxiosInstance.get.mockResolvedValueOnce({
        data: '<html><body>Invalid structure</body></html>'
      });

      // Act & Assert
      const fetcher = new WelshCouncilsFetcher({ skipValidation: true });
      const mapper = new CommunityCouncilsMapper();

      const rawData = await fetcher.fetch();
      // With no valid data, mapper should return empty array
      const result = mapper.mapWelshCouncils(rawData);
      expect(result).toHaveLength(0);
    });

    it('should validate minimum expected count', async () => {
      // Arrange - Mock response with too few communities
      const smallResponse = `
        <div class="mw-content-text">
          <h2>Small Area</h2>
          <table class="wikitable">
            <tr><th>Community</th><th>Population</th></tr>
            <tr><td><a href="/wiki/Only">Only Community</a></td><td>100</td></tr>
          </table>
        </div>
      `;

      mockedAxiosInstance.get.mockResolvedValueOnce({ data: smallResponse });

      // Act & Assert
      const fetcher = new WelshCouncilsFetcher();
      const mapper = new CommunityCouncilsMapper();

      const rawData = await fetcher.fetch();
      expect(() => mapper.mapWelshCouncils(rawData)).toThrow('Expected at least 400 communities');
    });
  });
});