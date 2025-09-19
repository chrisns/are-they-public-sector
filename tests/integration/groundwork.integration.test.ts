import axios from 'axios';
import { GroundworkParser } from '../../src/services/groundwork-parser';
import { GroundworkMapper } from '../../src/services/mappers/groundwork-mapper';
import { OrganisationType } from '../../src/models/organisation';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const describeIfNetwork = process.env.TEST_NETWORK ? describe : describe.skip;

describeIfNetwork('Groundwork Integration', () => {
  describe('Full flow: fetch → parse → map', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should fetch, parse, and map Groundwork Trusts to Organisations', async () => {
      // Arrange - Mock HTML response
      const mockHtml = `
        <!DOCTYPE html>
        <html>
        <body>
          <select class="gnm_button">
            <option value="">Select a region</option>
            <option>Groundwork Yorkshire</option>
            <option>Groundwork London</option>
            <option>Groundwork West Midlands</option>
            <option>Groundwork Wales</option>
            <option>Groundwork Cheshire, Lancashire and Merseyside</option>
          </select>
        </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValueOnce({ data: mockHtml });

      // Act
      const parser = new GroundworkParser();
      const mapper = new GroundworkMapper();
      const trusts = await parser.parse();
      const organisations = mapper.mapMany(trusts);

      // Assert
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://www.groundwork.org.uk/find-groundwork-near-me/',
        expect.objectContaining({
          timeout: 30000,
          headers: expect.objectContaining({
            'User-Agent': 'UK-Public-Sector-Aggregator/1.0'
          })
        })
      );

      expect(trusts).toHaveLength(5);
      expect(organisations).toHaveLength(5);

      // Verify first organisation
      const firstOrg = organisations[0];
      expect(firstOrg.name).toBe('Groundwork Yorkshire');
      expect(firstOrg.type).toBe(OrganisationType.CENTRAL_GOVERNMENT);
      expect(firstOrg.classification).toBe('Groundwork Trust');
      expect(firstOrg.location?.region).toBe('Yorkshire');
      expect(firstOrg.location?.country).toBe('United Kingdom');
      expect(firstOrg.additionalProperties?.sponsor).toBe('Department for Communities and Local Government');
      expect(firstOrg.additionalProperties?.onsCode).toBe('S.1311');
      expect(firstOrg.additionalProperties?.source).toBe('groundwork');
    });

    it('should handle network errors with retries', async () => {
      // Arrange - Mock network failures then success
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: `
            <select class="gnm_button">
              <option>Groundwork Test</option>
            </select>
          `
        });

      // Act
      const parser = new GroundworkParser();
      const trusts = await parser.parse();

      // Assert
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
      expect(trusts).toHaveLength(1);
      expect(trusts[0].name).toBe('Groundwork Test');
    });

    it('should fail after max retries', async () => {
      // Arrange
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      const parser = new GroundworkParser();
      await expect(parser.parse()).rejects.toThrow('Failed to fetch Groundwork Trusts');
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });

    it('should handle empty dropdown', async () => {
      // Arrange
      mockedAxios.get.mockResolvedValueOnce({
        data: `
          <select class="gnm_button">
            <option value="">Select a region</option>
          </select>
        `
      });

      // Act & Assert
      const parser = new GroundworkParser();
      await expect(parser.parse()).rejects.toThrow('no valid trusts found');
    });

    it('should handle missing dropdown', async () => {
      // Arrange
      mockedAxios.get.mockResolvedValueOnce({
        data: '<html><body>No dropdown here</body></html>'
      });

      // Act & Assert
      const parser = new GroundworkParser();
      await expect(parser.parse()).rejects.toThrow('dropdown not found');
    });
  });
});