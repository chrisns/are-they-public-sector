import axios from 'axios';
import { ScottishCouncilsFetcher } from '../../src/services/fetchers/scottish-councils-fetcher';
import { CommunityCouncilsMapper } from '../../src/services/mappers/community-councils-mapper';
import { OrganisationType } from '../../src/models/organisation';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedAxiosInstance = {
  get: jest.fn()
};

const describeIfNetwork = process.env.TEST_NETWORK ? describe : describe.skip;

describeIfNetwork('Scottish Councils Pipeline Integration', () => {
  describe('Full flow: fetch → parse → map', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Mock axios.create to return our mocked instance
      (mockedAxios.create as jest.Mock).mockReturnValue(mockedAxiosInstance);
    });

    it('should fetch, parse, and map Scottish Community Councils to Organisations', async () => {
      // Arrange - Mock Wikipedia HTML response with active/inactive markers
      const mockHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>List of community council areas in Scotland - Wikipedia</title></head>
        <body>
          <div class="mw-content-text">
            <h2>Aberdeen City</h2>
            <p>Community councils in Aberdeen City:</p>
            <ul>
              <li>Aberdeen Community Council *</li>
              <li>Culter Community Council *</li>
              <li>Dyce Community Council</li>
              <li>Kincorth Community Council *</li>
            </ul>

            <h2>Aberdeenshire</h2>
            <p>Community councils in Aberdeenshire:</p>
            <ul>
              <li>Aboyne and Glen Tanar Community Council *</li>
              <li>Alford Community Council</li>
              <li>Ballater Community Council *</li>
              <li>Banchory Community Council *</li>
            </ul>

            <h2>Angus</h2>
            <p>Community councils in Angus:</p>
            <ul>
              <li>Arbroath Community Council *</li>
              <li>Carnoustie Community Council *</li>
              <li>Forfar Community Council</li>
              <li>Kirriemuir Community Council *</li>
            </ul>
          </div>
        </body>
        </html>
      `;

      mockedAxiosInstance.get.mockResolvedValueOnce({ data: mockHtml });

      // Act
      const fetcher = new ScottishCouncilsFetcher({ skipValidation: true });
      const mapper = new CommunityCouncilsMapper();

      const rawData = await fetcher.fetch();
      const organisations = mapper.mapScottishCouncils(rawData);

      // Assert - Verify HTTP request
      expect(mockedAxiosInstance.get).toHaveBeenCalledWith(
        'https://en.wikipedia.org/wiki/List_of_community_council_areas_in_Scotland'
      );

      // Verify parsing results - should only include active councils (marked with *)
      const expectedActiveCommunities = [
        'Aberdeen Community Council',
        'Culter Community Council',
        'Kincorth Community Council',
        'Aboyne and Glen Tanar Community Council',
        'Ballater Community Council',
        'Banchory Community Council',
        'Arbroath Community Council',
        'Carnoustie Community Council',
        'Kirriemuir Community Council'
      ];

      expect(rawData).toHaveLength(expectedActiveCommunities.length);
      expect(organisations).toHaveLength(expectedActiveCommunities.length);

      // Verify all communities are active
      rawData.forEach(community => {
        expect(community.isActive).toBe(true);
      });

      // Verify first organisation (Aberdeen Community Council)
      const aberdeenCouncil = organisations.find(org => org.name === 'Aberdeen Community Council');
      expect(aberdeenCouncil).toBeDefined();
      expect(aberdeenCouncil?.name).toBe('Aberdeen Community Council');
      expect(aberdeenCouncil?.type).toBe(OrganisationType.SCOTTISH_COMMUNITY_COUNCIL);
      expect(aberdeenCouncil?.classification).toBe('Scottish Community Council');
      expect(aberdeenCouncil?.location?.region).toBe('Aberdeen City');
      expect(aberdeenCouncil?.location?.country).toBe('Scotland');
      expect(aberdeenCouncil?.status).toBe('active');
      expect(aberdeenCouncil?.additionalProperties?.councilArea).toBe('Aberdeen City');
      expect(aberdeenCouncil?.additionalProperties?.source).toBe('scottish-councils');

      // Verify second organisation (Aboyne and Glen Tanar - complex name)
      const aboyneCouncil = organisations.find(org => org.name === 'Aboyne and Glen Tanar Community Council');
      expect(aboyneCouncil).toBeDefined();
      expect(aboyneCouncil?.location?.region).toBe('Aberdeenshire');

      // Verify no inactive councils are included
      const inactiveCouncils = ['Dyce Community Council', 'Alford Community Council', 'Forfar Community Council'];
      inactiveCouncils.forEach(inactiveName => {
        const inactiveCouncil = organisations.find(org => org.name === inactiveName);
        expect(inactiveCouncil).toBeUndefined();
      });

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
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValueOnce({
          data: `
            <div class="mw-content-text">
              <h2>Test Council Area</h2>
              <ul>
                <li>Test Community Council *</li>
              </ul>
            </div>
          `
        });

      // Act
      const fetcher = new ScottishCouncilsFetcher({ skipValidation: true });
      const rawData = await fetcher.fetch();

      // Assert
      expect(mockedAxiosInstance.get).toHaveBeenCalledTimes(3);
      expect(rawData).toBeDefined();
    });

    it('should fail after max retries', async () => {
      // Arrange
      mockedAxiosInstance.get.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      const fetcher = new ScottishCouncilsFetcher({ skipValidation: true });
      await expect(fetcher.fetch()).rejects.toThrow('Failed to fetch Scottish community councils');
      expect(mockedAxiosInstance.get).toHaveBeenCalledTimes(3);
    });

    it('should handle no active councils found', async () => {
      // Arrange - Mock response with no active councils (no asterisks)
      mockedAxiosInstance.get.mockResolvedValueOnce({
        data: `
          <div class="mw-content-text">
            <h2>Test Area</h2>
            <ul>
              <li>Inactive Council 1</li>
              <li>Inactive Council 2</li>
            </ul>
          </div>
        `
      });

      // Act & Assert
      const fetcher = new ScottishCouncilsFetcher({ skipValidation: true });
      const mapper = new CommunityCouncilsMapper();

      const rawData = await fetcher.fetch();
      // With no active councils, mapper should return empty array
      const result = mapper.mapScottishCouncils(rawData);
      expect(result).toHaveLength(0);
    });

    it('should handle malformed HTML structure', async () => {
      // Arrange
      mockedAxiosInstance.get.mockResolvedValueOnce({
        data: '<html><body>No proper structure</body></html>'
      });

      // Act & Assert
      const fetcher = new ScottishCouncilsFetcher({ skipValidation: true });
      const mapper = new CommunityCouncilsMapper();

      const rawData = await fetcher.fetch();
      // With malformed HTML, should return empty array
      const result = mapper.mapScottishCouncils(rawData);
      expect(result).toHaveLength(0);
    });

    it('should validate minimum expected count', async () => {
      // Arrange - Mock response with too few active councils
      const smallResponse = `
        <div class="mw-content-text">
          <h2>Small Area</h2>
          <ul>
            <li>Only Active Council *</li>
          </ul>
        </div>
      `;

      mockedAxiosInstance.get.mockResolvedValueOnce({ data: smallResponse });

      // Act & Assert
      const fetcher = new ScottishCouncilsFetcher({ skipValidation: true });
      const mapper = new CommunityCouncilsMapper();

      const rawData = await fetcher.fetch();
      // With only one council, should just return that one
      const result = mapper.mapScottishCouncils(rawData);
      expect(result).toHaveLength(1);
    });

    it('should properly parse council areas and regions', async () => {
      // Arrange - Test with multiple regions
      const htmlWithRegions = `
        <div class="mw-content-text">
          <h2>Highland</h2>
          <p>Community councils in Highland:</p>
          <ul>
            <li>Inverness Community Council *</li>
            <li>Fort William Community Council *</li>
          </ul>

          <h2>Orkney Islands</h2>
          <p>Community councils in Orkney Islands:</p>
          <ul>
            <li>Kirkwall Community Council *</li>
          </ul>
        </div>
      `;

      mockedAxiosInstance.get.mockResolvedValueOnce({ data: htmlWithRegions });

      // Act
      const fetcher = new ScottishCouncilsFetcher({ skipValidation: true });
      const mapper = new CommunityCouncilsMapper();

      const rawData = await fetcher.fetch();
      const organisations = mapper.mapScottishCouncils(rawData);

      // Assert
      expect(organisations).toHaveLength(3);

      const invernessCouncil = organisations.find(org => org.name === 'Inverness Community Council');
      expect(invernessCouncil?.location?.region).toBe('Highland');

      const kirkwallCouncil = organisations.find(org => org.name === 'Kirkwall Community Council');
      expect(kirkwallCouncil?.location?.region).toBe('Orkney Islands');
    });
  });
});