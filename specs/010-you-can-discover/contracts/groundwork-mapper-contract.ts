/**
 * Contract test for Groundwork Trust to Organisation mapper
 * This test MUST be written before implementation (TDD)
 */

import { GroundworkMapper } from '../../src/services/mappers/groundwork-mapper';
import type { GroundworkTrustRaw } from '../../src/models/groundwork-trust';
import type { Organisation } from '../../src/models/organisation';
import { OrganisationType } from '../../src/models/organisation';

describe('GroundworkMapper Contract', () => {
  let mapper: GroundworkMapper;

  beforeEach(() => {
    mapper = new GroundworkMapper();
  });

  describe('map()', () => {
    it('should map Groundwork Trust to Organisation', () => {
      // Arrange
      const rawTrust: GroundworkTrustRaw = {
        name: 'Groundwork Yorkshire'
      };

      // Act
      const org = mapper.map(rawTrust);

      // Assert
      expect(org.name).toBe('Groundwork Yorkshire');
      expect(org.type).toBe(OrganisationType.CENTRAL_GOVERNMENT);
      expect(org.classification).toBe('Groundwork Trust');
      expect(org.status).toBe('active');
    });

    it('should extract region from trust name', () => {
      // Arrange
      const rawTrust: GroundworkTrustRaw = {
        name: 'Groundwork West Midlands'
      };

      // Act
      const org = mapper.map(rawTrust);

      // Assert
      expect(org.location?.region).toBe('West Midlands');
      expect(org.location?.country).toBe('United Kingdom');
    });

    it('should set sponsor information', () => {
      // Arrange
      const rawTrust: GroundworkTrustRaw = {
        name: 'Groundwork London'
      };

      // Act
      const org = mapper.map(rawTrust);

      // Assert
      expect(org.additionalProperties?.sponsor).toBe('Department for Communities and Local Government');
      expect(org.additionalProperties?.onsCode).toBe('S.1311');
      expect(org.additionalProperties?.source).toBe('groundwork');
    });

    it('should generate unique ID for each trust', () => {
      // Arrange
      const trust1: GroundworkTrustRaw = { name: 'Groundwork Yorkshire' };
      const trust2: GroundworkTrustRaw = { name: 'Groundwork London' };

      // Act
      const org1 = mapper.map(trust1);
      const org2 = mapper.map(trust2);

      // Assert
      expect(org1.id).toBeDefined();
      expect(org2.id).toBeDefined();
      expect(org1.id).not.toBe(org2.id);
    });

    it('should calculate data quality score', () => {
      // Arrange
      const rawTrust: GroundworkTrustRaw = {
        name: 'Groundwork Test'
      };

      // Act
      const org = mapper.map(rawTrust);

      // Assert
      expect(org.dataQuality).toBeDefined();
      expect(org.dataQuality?.completeness).toBeGreaterThan(0);
      expect(org.dataQuality?.completeness).toBeLessThanOrEqual(1);
      expect(org.dataQuality?.source).toBe('live_fetch');
    });

    it('should set lastUpdated timestamp', () => {
      // Arrange
      const rawTrust: GroundworkTrustRaw = {
        name: 'Groundwork Test'
      };

      // Act
      const beforeTime = new Date().toISOString();
      const org = mapper.map(rawTrust);
      const afterTime = new Date().toISOString();

      // Assert
      expect(org.lastUpdated).toBeDefined();
      expect(org.lastUpdated >= beforeTime).toBe(true);
      expect(org.lastUpdated <= afterTime).toBe(true);
    });
  });

  describe('mapMany()', () => {
    it('should map multiple trusts', () => {
      // Arrange
      const rawTrusts: GroundworkTrustRaw[] = [
        { name: 'Groundwork Yorkshire' },
        { name: 'Groundwork London' },
        { name: 'Groundwork Wales' }
      ];

      // Act
      const orgs = mapper.mapMany(rawTrusts);

      // Assert
      expect(orgs).toHaveLength(3);
      expect(orgs[0].name).toBe('Groundwork Yorkshire');
      expect(orgs[1].name).toBe('Groundwork London');
      expect(orgs[2].name).toBe('Groundwork Wales');
    });

    it('should handle empty array', () => {
      // Arrange
      const rawTrusts: GroundworkTrustRaw[] = [];

      // Act
      const orgs = mapper.mapMany(rawTrusts);

      // Assert
      expect(orgs).toHaveLength(0);
    });
  });

  describe('extractRegion()', () => {
    it('should extract various region formats', () => {
      // Arrange & Act & Assert
      expect(mapper.extractRegion('Groundwork Yorkshire')).toBe('Yorkshire');
      expect(mapper.extractRegion('Groundwork West Midlands')).toBe('West Midlands');
      expect(mapper.extractRegion('Groundwork Cheshire, Lancashire and Merseyside'))
        .toBe('Cheshire, Lancashire and Merseyside');
      expect(mapper.extractRegion('Groundwork North East and Cumbria'))
        .toBe('North East and Cumbria');
      expect(mapper.extractRegion('Scotland UK Office')).toBe('Scotland');
    });
  });
});