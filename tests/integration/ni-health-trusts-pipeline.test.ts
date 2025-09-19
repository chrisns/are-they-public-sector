import axios from 'axios';
import { NIHealthTrustsFetcher } from '../../src/services/fetchers/ni-health-trusts-fetcher';
import { CommunityCouncilsMapper } from '../../src/services/mappers/community-councils-mapper';
import { OrganisationType } from '../../src/models/organisation';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const describeIfNetwork = process.env.TEST_NETWORK ? describe : describe.skip;

describeIfNetwork('NI Health Trusts Pipeline Integration', () => {
  describe('Full flow: fetch → parse → map', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should fetch, parse, and map NI Health and Social Care Trusts to Organisations', async () => {
      // Arrange - Mock NI Direct HTML response
      const mockHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Health and social care trusts - nidirect</title></head>
        <body>
          <div class="page-content">
            <h1>Health and social care trusts</h1>
            <p>The following health and social care trusts provide services across Northern Ireland:</p>

            <div class="trust-listing">
              <h2><a href="/contacts/belfast-health-and-social-care-trust">Belfast Health and Social Care Trust</a></h2>
              <div class="contact-details">
                <p><strong>Address:</strong> Belfast City Hospital, Lisburn Road, Belfast BT9 7AB</p>
                <p><strong>Phone:</strong> 028 9032 9241</p>
                <p><strong>Website:</strong> <a href="https://www.belfasttrust.hscni.net">www.belfasttrust.hscni.net</a></p>
                <p><strong>Email:</strong> info@belfasttrust.hscni.net</p>
              </div>
            </div>

            <div class="trust-listing">
              <h2><a href="/contacts/northern-health-and-social-care-trust">Northern Health and Social Care Trust</a></h2>
              <div class="contact-details">
                <p><strong>Address:</strong> Bush House, Bush Road, Antrim BT41 2QB</p>
                <p><strong>Phone:</strong> 028 9441 3333</p>
                <p><strong>Website:</strong> <a href="https://www.northerntrust.hscni.net">www.northerntrust.hscni.net</a></p>
              </div>
            </div>

            <div class="trust-listing">
              <h2><a href="/contacts/south-eastern-health-and-social-care-trust">South Eastern Health and Social Care Trust</a></h2>
              <div class="contact-details">
                <p><strong>Address:</strong> Ulster Hospital, Upper Newtownards Road, Dundonald, Belfast BT16 1RH</p>
                <p><strong>Phone:</strong> 028 9056 1000</p>
                <p><strong>Website:</strong> <a href="https://www.setrust.hscni.net">www.setrust.hscni.net</a></p>
              </div>
            </div>

            <div class="trust-listing">
              <h2><a href="/contacts/southern-health-and-social-care-trust">Southern Health and Social Care Trust</a></h2>
              <div class="contact-details">
                <p><strong>Address:</strong> Craigavon Area Hospital, 68 Lurgan Road, Portadown BT63 5QQ</p>
                <p><strong>Phone:</strong> 028 3756 1000</p>
                <p><strong>Website:</strong> <a href="https://www.southerntrust.hscni.net">www.southerntrust.hscni.net</a></p>
              </div>
            </div>

            <div class="trust-listing">
              <h2><a href="/contacts/western-health-and-social-care-trust">Western Health and Social Care Trust</a></h2>
              <div class="contact-details">
                <p><strong>Address:</strong> Altnagelvin Hospital, Glenshane Road, Londonderry BT47 6SB</p>
                <p><strong>Phone:</strong> 028 7161 1226</p>
                <p><strong>Website:</strong> <a href="https://www.westerntrust.hscni.net">www.westerntrust.hscni.net</a></p>
              </div>
            </div>

            <div class="trust-listing">
              <h2><a href="/contacts/northern-ireland-ambulance-service">Northern Ireland Ambulance Service Trust</a></h2>
              <div class="contact-details">
                <p><strong>Address:</strong> Site 30, Knockbracken Healthcare Park, Saintfield Road, Belfast BT8 8SG</p>
                <p><strong>Phone:</strong> 028 9040 0999</p>
                <p><strong>Website:</strong> <a href="https://www.nias.hscni.net">www.nias.hscni.net</a></p>
                <p><strong>Services:</strong> Emergency ambulance services, patient transport services</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValueOnce({ data: mockHtml });

      // Act
      const fetcher = new NIHealthTrustsFetcher();
      const mapper = new CommunityCouncilsMapper();

      const rawData = await fetcher.fetch();
      const organisations = mapper.mapNIHealthTrusts(rawData);

      // Assert - Verify HTTP request
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://www.nidirect.gov.uk/contacts/health-and-social-care-trusts',
        expect.objectContaining({
          timeout: 30000
        })
      );

      // Verify parsing results - should have all 6 trusts
      expect(rawData).toHaveLength(6);
      expect(organisations).toHaveLength(6);

      // Verify first organisation (Belfast Trust)
      const belfastTrust = organisations.find(org => org.name === 'Belfast Health and Social Care Trust');
      expect(belfastTrust).toBeDefined();
      expect(belfastTrust?.name).toBe('Belfast Health and Social Care Trust');
      expect(belfastTrust?.type).toBe(OrganisationType.NI_HEALTH_TRUST);
      expect(belfastTrust?.classification).toBe('Northern Ireland Health and Social Care Trust');
      expect(belfastTrust?.location?.address).toBe('Belfast City Hospital, Lisburn Road, Belfast BT9 7AB');
      expect(belfastTrust?.location?.country).toBe('Northern Ireland');
      expect(belfastTrust?.status).toBe('active');
      expect(belfastTrust?.additionalProperties?.phone).toBe('028 9032 9241');
      expect(belfastTrust?.additionalProperties?.website).toBe('https://www.belfasttrust.hscni.net');
      expect(belfastTrust?.additionalProperties?.email).toBe('info@belfasttrust.hscni.net');
      expect(belfastTrust?.additionalProperties?.source).toBe('ni-health-trusts');

      // Verify second organisation (Northern Trust - no email)
      const northernTrust = organisations.find(org => org.name === 'Northern Health and Social Care Trust');
      expect(northernTrust).toBeDefined();
      expect(northernTrust?.additionalProperties?.phone).toBe('028 9441 3333');
      expect(northernTrust?.additionalProperties?.email).toBeUndefined();

      // Verify ambulance service (special case with services)
      const ambulanceService = organisations.find(org => org.name === 'Northern Ireland Ambulance Service Trust');
      expect(ambulanceService).toBeDefined();
      expect(ambulanceService?.additionalProperties?.servicesProvided).toEqual([
        'Emergency ambulance services',
        'patient transport services'
      ]);

      // Verify all expected trusts are present
      const expectedTrustNames = [
        'Belfast Health and Social Care Trust',
        'Northern Health and Social Care Trust',
        'South Eastern Health and Social Care Trust',
        'Southern Health and Social Care Trust',
        'Western Health and Social Care Trust',
        'Northern Ireland Ambulance Service Trust'
      ];

      expectedTrustNames.forEach(trustName => {
        const trust = organisations.find(org => org.name === trustName);
        expect(trust).toBeDefined();
      });

      // Verify data quality
      organisations.forEach(org => {
        expect(org.sources).toHaveLength(1);
        expect(org.sources[0].source).toBe('manual');
        expect(org.sources[0].confidence).toBe(0.95);
        expect(org.dataQuality.completeness).toBeGreaterThan(0.8);
        expect(org.lastUpdated).toBeDefined();
      });
    });

    it('should handle network errors with retries', async () => {
      // Arrange - Mock network failures then success
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValueOnce({
          data: `
            <div class="page-content">
              <div class="trust-listing">
                <h2><a href="/test">Test Health Trust</a></h2>
                <div class="contact-details">
                  <p><strong>Phone:</strong> 028 9000 0000</p>
                </div>
              </div>
            </div>
          `
        });

      // Act
      const fetcher = new NIHealthTrustsFetcher();
      const rawData = await fetcher.fetch();

      // Assert
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
      expect(rawData).toBeDefined();
    });

    it('should fail after max retries', async () => {
      // Arrange
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      const fetcher = new NIHealthTrustsFetcher();
      await expect(fetcher.fetch()).rejects.toThrow('Failed to fetch NI health trusts');
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });

    it('should handle missing trust listings', async () => {
      // Arrange
      mockedAxios.get.mockResolvedValueOnce({
        data: `
          <div class="page-content">
            <h1>Health and social care trusts</h1>
            <p>No trust listings found</p>
          </div>
        `
      });

      // Act & Assert
      const fetcher = new NIHealthTrustsFetcher();
      const mapper = new CommunityCouncilsMapper();

      const rawData = await fetcher.fetch();
      const orgs = mapper.mapNIHealthTrusts(rawData);
      expect(orgs.length).toBe(0);
    });

    it('should handle malformed HTML structure', async () => {
      // Arrange
      mockedAxios.get.mockResolvedValueOnce({
        data: '<html><body>Invalid structure without trust listings</body></html>'
      });

      // Act & Assert
      const fetcher = new NIHealthTrustsFetcher();
      const mapper = new CommunityCouncilsMapper();

      const rawData = await fetcher.fetch();
      expect(() => mapper.mapNIHealthTrusts(rawData)).toThrow('trust listings not found');
    });

    it('should validate expected trust count', async () => {
      // Arrange - Mock response with too few trusts
      const incompleteResponse = `
        <div class="page-content">
          <div class="trust-listing">
            <h2><a href="/test">Only Trust</a></h2>
            <div class="contact-details">
              <p><strong>Phone:</strong> 028 9000 0000</p>
            </div>
          </div>
        </div>
      `;

      mockedAxios.get.mockResolvedValueOnce({ data: incompleteResponse });

      // Act & Assert
      const fetcher = new NIHealthTrustsFetcher();
      const mapper = new CommunityCouncilsMapper();

      const rawData = await fetcher.fetch();
      expect(() => mapper.mapNIHealthTrusts(rawData)).toThrow('Expected 5-6 health trusts');
    });

    it('should handle trusts with minimal contact information', async () => {
      // Arrange - Mock response with basic trust info
      const minimalResponse = `
        <div class="page-content">
          <div class="trust-listing">
            <h2><a href="/trust1">Trust One</a></h2>
          </div>
          <div class="trust-listing">
            <h2><a href="/trust2">Trust Two</a></h2>
            <div class="contact-details">
              <p><strong>Website:</strong> <a href="https://www.trust2.net">www.trust2.net</a></p>
            </div>
          </div>
          <div class="trust-listing">
            <h2><a href="/trust3">Trust Three</a></h2>
          </div>
          <div class="trust-listing">
            <h2><a href="/trust4">Trust Four</a></h2>
          </div>
          <div class="trust-listing">
            <h2><a href="/trust5">Trust Five</a></h2>
          </div>
        </div>
      `;

      mockedAxios.get.mockResolvedValueOnce({ data: minimalResponse });

      // Act
      const fetcher = new NIHealthTrustsFetcher();
      const mapper = new CommunityCouncilsMapper();

      const rawData = await fetcher.fetch();
      const organisations = mapper.mapNIHealthTrusts(rawData);

      // Assert
      expect(rawData).toHaveLength(5);
      expect(organisations).toHaveLength(5);

      // Verify minimal trust (Trust One)
      const trustOne = organisations.find(org => org.name === 'Trust One');
      expect(trustOne).toBeDefined();
      expect(trustOne?.additionalProperties?.phone).toBeUndefined();
      expect(trustOne?.additionalProperties?.website).toBeUndefined();

      // Verify trust with website (Trust Two)
      const trustTwo = organisations.find(org => org.name === 'Trust Two');
      expect(trustTwo).toBeDefined();
      expect(trustTwo?.additionalProperties?.website).toBe('https://www.trust2.net');
    });
  });
});