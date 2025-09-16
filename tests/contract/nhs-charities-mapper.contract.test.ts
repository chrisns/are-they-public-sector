/**
 * Contract test for NHS Charities to Organisation mapper
 * This test MUST be written before implementation (TDD)
 */

import { NHSCharitiesMapper } from '../../src/services/mappers/nhs-charities-mapper';
import type { NHSCharityRaw } from '../../src/models/nhs-charity';
import { OrganisationType } from '../../src/models/organisation';

describe('NHSCharitiesMapper Contract', () => {
  let mapper: NHSCharitiesMapper;

  beforeEach(() => {
    mapper = new NHSCharitiesMapper();
  });

  describe('map()', () => {
    it('should map NHS Charity to Organisation', () => {
      // Arrange
      const rawCharity: NHSCharityRaw = {
        name: 'Leeds Teaching Hospitals Charity',
        address: '123 Hospital Road',
        city: 'Leeds',
        postcode: 'LS1 3EX',
        country: 'England'
      };

      // Act
      const org = mapper.map(rawCharity);

      // Assert
      expect(org.name).toBe('Leeds Teaching Hospitals Charity');
      expect(org.type).toBe(OrganisationType.CENTRAL_GOVERNMENT);
      expect(org.classification).toBe('NHS Charity');
      expect(org.status).toBe('active');
    });

    it('should include location data when available', () => {
      // Arrange
      const rawCharity: NHSCharityRaw = {
        name: 'Test NHS Charity',
        address: '456 Medical Way',
        city: 'Manchester',
        postcode: 'M1 2AB',
        country: 'England',
        lat: 53.4808,
        lng: -2.2426
      };

      // Act
      const org = mapper.map(rawCharity);

      // Assert
      expect(org.location?.address).toBe('456 Medical Way');
      expect(org.location?.region).toBe('Manchester');
      expect(org.location?.postalCode).toBe('M1 2AB');
      expect(org.location?.country).toBe('United Kingdom');
      expect(org.location?.coordinates?.latitude).toBe(53.4808);
      expect(org.location?.coordinates?.longitude).toBe(-2.2426);
    });

    it('should set sponsor information', () => {
      // Arrange
      const rawCharity: NHSCharityRaw = {
        name: 'Test NHS Charity'
      };

      // Act
      const org = mapper.map(rawCharity);

      // Assert
      expect(org.additionalProperties?.sponsor).toBe('Department of Health');
      expect(org.additionalProperties?.onsCode).toBe('S.1311');
      expect(org.additionalProperties?.source).toBe('nhs_charities');
    });

    it('should generate unique ID based on name and postcode', () => {
      // Arrange
      const charity1: NHSCharityRaw = { name: 'Charity A', postcode: 'AB1 2CD' };
      const charity2: NHSCharityRaw = { name: 'Charity B', postcode: 'EF3 4GH' };
      const charity3: NHSCharityRaw = { name: 'Charity A', postcode: 'AB1 2CD' };

      // Act
      const org1 = mapper.map(charity1);
      const org2 = mapper.map(charity2);
      const org3 = mapper.map(charity3);

      // Assert
      expect(org1.id).toBeDefined();
      expect(org2.id).toBeDefined();
      expect(org3.id).toBeDefined();
      expect(org1.id).not.toBe(org2.id);
      expect(org1.id).toBe(org3.id); // Same name and postcode = same ID
    });

    it('should preserve original country in additionalProperties', () => {
      // Arrange
      const rawCharity: NHSCharityRaw = {
        name: 'Wales NHS Charity',
        country: 'Wales'
      };

      // Act
      const org = mapper.map(rawCharity);

      // Assert
      expect(org.additionalProperties?.originalCountry).toBe('Wales');
      expect(org.location?.country).toBe('United Kingdom');
    });

    it('should include website when available', () => {
      // Arrange
      const rawCharity: NHSCharityRaw = {
        name: 'Test Charity',
        website: 'https://example.nhs.uk'
      };

      // Act
      const org = mapper.map(rawCharity);

      // Assert
      expect(org.website).toBe('https://example.nhs.uk');
    });

    it('should calculate data quality score', () => {
      // Arrange
      const rawCharity: NHSCharityRaw = {
        name: 'Test Charity',
        address: '123 Street',
        postcode: 'AB1 2CD',
        website: 'https://example.com'
      };

      // Act
      const org = mapper.map(rawCharity);

      // Assert
      expect(org.dataQuality).toBeDefined();
      expect(org.dataQuality?.completeness).toBeGreaterThan(0.5);
      expect(org.dataQuality?.completeness).toBeLessThanOrEqual(1);
      expect(org.dataQuality?.source).toBe('live_fetch');
    });

    it('should set lastUpdated timestamp', () => {
      // Arrange
      const rawCharity: NHSCharityRaw = {
        name: 'Test Charity'
      };

      // Act
      const beforeTime = new Date().toISOString();
      const org = mapper.map(rawCharity);
      const afterTime = new Date().toISOString();

      // Assert
      expect(org.lastUpdated).toBeDefined();
      expect(org.lastUpdated >= beforeTime).toBe(true);
      expect(org.lastUpdated <= afterTime).toBe(true);
    });
  });

  describe('mapMany()', () => {
    it('should map multiple charities', () => {
      // Arrange
      const rawCharities: NHSCharityRaw[] = [
        { name: 'Charity One' },
        { name: 'Charity Two' },
        { name: 'Charity Three' }
      ];

      // Act
      const orgs = mapper.mapMany(rawCharities);

      // Assert
      expect(orgs).toHaveLength(3);
      expect(orgs[0].name).toBe('Charity One');
      expect(orgs[1].name).toBe('Charity Two');
      expect(orgs[2].name).toBe('Charity Three');
    });

    it('should handle empty array', () => {
      // Arrange
      const rawCharities: NHSCharityRaw[] = [];

      // Act
      const orgs = mapper.mapMany(rawCharities);

      // Assert
      expect(orgs).toHaveLength(0);
    });
  });
});