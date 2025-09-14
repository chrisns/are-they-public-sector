/**
 * Unit Tests: Emergency Service Mappers
 * Tests mapping of emergency services to Organisation model
 */

import { describe, it, expect } from '@jest/globals';
import { PoliceMapper } from '../../src/services/mappers/police-mapper';
import { FireMapper } from '../../src/services/mappers/fire-mapper';
import { DevolvedExtraMapper } from '../../src/services/mappers/devolved-extra-mapper';
import { OrganisationType, DataSourceType } from '../../src/models/organisation';
import type { PoliceForce, FireService, DevolvedBody } from '../../src/models/emergency-services';

describe('Emergency Service Mappers', () => {
  describe('PoliceMapper', () => {
    const mapper = new PoliceMapper();

    it('should map police force to organisation', () => {
      // GIVEN: A police force
      const force: PoliceForce = {
        name: 'Metropolitan Police Service',
        serviceType: 'police',
        forceType: 'territorial',
        jurisdiction: 'Greater London',
        website: 'https://www.met.police.uk'
      };

      // WHEN: Mapping to organisation
      const org = mapper.mapToOrganisation(force);

      // THEN: Should create valid organisation
      expect(org.id).toBe('police-metropolitan-police-service');
      expect(org.name).toBe('Metropolitan Police Service');
      expect(org.type).toBe(OrganisationType.EMERGENCY_SERVICE);
      expect(org.classification).toBe('Police Force - Territorial');
      expect(org.status).toBe('active');
      expect(org.location.country).toBe('United Kingdom');
      expect(org.location.region).toBe('Greater London');
      expect(org.sources[0].source).toBe(DataSourceType.POLICE_UK);
      expect(org.additionalProperties.serviceType).toBe('police');
      expect(org.additionalProperties.forceType).toBe('territorial');
      expect(org.additionalProperties.website).toBe('https://www.met.police.uk');
    });

    it('should handle special police forces', () => {
      // GIVEN: A special police force
      const force: PoliceForce = {
        name: 'British Transport Police',
        serviceType: 'police',
        forceType: 'special',
        jurisdiction: 'UK Rail Network'
      };

      // WHEN: Mapping to organisation
      const org = mapper.mapToOrganisation(force);

      // THEN: Should classify correctly
      expect(org.classification).toBe('Police Force - Special');
      expect(org.location.region).toBe('UK Rail Network');
    });

    it('should handle crown dependency forces', () => {
      // GIVEN: A crown dependency force
      const force: PoliceForce = {
        name: 'States of Jersey Police',
        serviceType: 'police',
        forceType: 'crown_dependency',
        jurisdiction: 'Jersey'
      };

      // WHEN: Mapping to organisation
      const org = mapper.mapToOrganisation(force);

      // THEN: Should classify correctly
      expect(org.classification).toBe('Police Force - Crown Dependency');
    });

    it('should calculate completeness correctly', () => {
      // GIVEN: Force with partial data
      const minimalForce: PoliceForce = {
        name: 'Test Police',
        serviceType: 'police',
        forceType: 'territorial',
        jurisdiction: 'Test Area'
      };

      const completeForce: PoliceForce = {
        name: 'Test Police',
        serviceType: 'police',
        forceType: 'territorial',
        jurisdiction: 'Test Area',
        website: 'https://test.police.uk',
        chiefConstable: 'John Smith',
        policeAndCrimeCommissioner: 'Jane Doe'
      };

      // WHEN: Mapping both
      const minimalOrg = mapper.mapToOrganisation(minimalForce);
      const completeOrg = mapper.mapToOrganisation(completeForce);

      // THEN: Completeness should reflect data presence
      expect(minimalOrg.dataQuality.completeness).toBeLessThan(1);
      expect(completeOrg.dataQuality.completeness).toBeGreaterThan(minimalOrg.dataQuality.completeness);
    });
  });

  describe('FireMapper', () => {
    const mapper = new FireMapper();

    it('should map fire service to organisation', () => {
      // GIVEN: A fire service
      const service: FireService = {
        name: 'London Fire Brigade',
        serviceType: 'fire',
        authorityType: 'metropolitan',
        region: 'Greater London',
        website: 'https://www.london-fire.gov.uk',
        stationCount: 102
      };

      // WHEN: Mapping to organisation
      const org = mapper.mapToOrganisation(service);

      // THEN: Should create valid organisation
      expect(org.id).toBe('fire-london-fire-brigade');
      expect(org.name).toBe('London Fire Brigade');
      expect(org.type).toBe(OrganisationType.EMERGENCY_SERVICE);
      expect(org.classification).toBe('Fire and Rescue Service - Metropolitan');
      expect(org.status).toBe('active');
      expect(org.location.country).toBe('United Kingdom');
      expect(org.location.region).toBe('Greater London');
      expect(org.sources[0].source).toBe(DataSourceType.NFCC);
      expect(org.additionalProperties.serviceType).toBe('fire');
      expect(org.additionalProperties.authorityType).toBe('metropolitan');
      expect(org.additionalProperties.stationCount).toBe(102);
    });

    it('should handle different authority types', () => {
      // GIVEN: Services with different authority types
      const countyService: FireService = {
        name: 'Kent Fire and Rescue Service',
        serviceType: 'fire',
        authorityType: 'county',
        region: 'Kent'
      };

      const combinedService: FireService = {
        name: 'West Yorkshire Fire and Rescue Authority',
        serviceType: 'fire',
        authorityType: 'combined_authority',
        region: 'West Yorkshire'
      };

      // WHEN: Mapping to organisations
      const countyOrg = mapper.mapToOrganisation(countyService);
      const combinedOrg = mapper.mapToOrganisation(combinedService);

      // THEN: Should classify correctly
      expect(countyOrg.classification).toBe('Fire and Rescue Service - County');
      expect(combinedOrg.classification).toBe('Fire and Rescue Service - Combined Authority');
    });

    it('should handle coverage areas', () => {
      // GIVEN: Service with coverage areas
      const service: FireService = {
        name: 'Devon & Somerset Fire and Rescue Service',
        serviceType: 'fire',
        authorityType: 'county',
        region: 'Devon and Somerset',
        coverage: ['Devon', 'Somerset', 'Plymouth', 'Torbay']
      };

      // WHEN: Mapping to organisation
      const org = mapper.mapToOrganisation(service);

      // THEN: Should include coverage in additional properties
      expect(org.additionalProperties.coverage).toEqual(['Devon', 'Somerset', 'Plymouth', 'Torbay']);
    });
  });

  describe('DevolvedExtraMapper', () => {
    const mapper = new DevolvedExtraMapper();

    it('should map devolved body to organisation', () => {
      // GIVEN: A devolved body
      const body: DevolvedBody = {
        name: 'Transport Scotland',
        nation: 'scotland',
        bodyType: 'agency',
        parentBody: 'Scottish Government',
        website: 'https://www.transport.gov.scot'
      };

      // WHEN: Mapping to organisation
      const org = mapper.mapToOrganisation(body);

      // THEN: Should create valid organisation
      expect(org.id).toBe('devolved-transport-scotland');
      expect(org.name).toBe('Transport Scotland');
      expect(org.type).toBe(OrganisationType.DEVOLVED_ADMINISTRATION);
      expect(org.classification).toBe('Scotland Agency');
      expect(org.status).toBe('active');
      expect(org.location.country).toBe('United Kingdom');
      expect(org.location.region).toBe('Scotland');
      expect(org.parentOrganisation).toBe('Scottish Government');
      expect(org.sources[0].source).toBe(DataSourceType.GOV_UK_GUIDANCE);
      expect(org.additionalProperties.nation).toBe('scotland');
      expect(org.additionalProperties.bodyType).toBe('agency');
    });

    it('should handle different nations', () => {
      // GIVEN: Bodies from different nations
      const welshBody: DevolvedBody = {
        name: 'Natural Resources Wales',
        nation: 'wales',
        bodyType: 'public_body'
      };

      const niBody: DevolvedBody = {
        name: 'Invest Northern Ireland',
        nation: 'northern_ireland',
        bodyType: 'agency'
      };

      // WHEN: Mapping to organisations
      const welshOrg = mapper.mapToOrganisation(welshBody);
      const niOrg = mapper.mapToOrganisation(niBody);

      // THEN: Should format nations correctly
      expect(welshOrg.classification).toBe('Wales Public Body');
      expect(welshOrg.location.region).toBe('Wales');
      expect(niOrg.classification).toBe('Northern Ireland Agency');
      expect(niOrg.location.region).toBe('Northern Ireland');
    });

    it('should handle different body types', () => {
      // GIVEN: Bodies with different types
      const parliament: DevolvedBody = {
        name: 'Scottish Parliament',
        nation: 'scotland',
        bodyType: 'parliament'
      };

      const department: DevolvedBody = {
        name: 'Department of Health',
        nation: 'northern_ireland',
        bodyType: 'department',
        parentBody: 'Northern Ireland Executive'
      };

      // WHEN: Mapping to organisations
      const parliamentOrg = mapper.mapToOrganisation(parliament);
      const departmentOrg = mapper.mapToOrganisation(department);

      // THEN: Should classify correctly
      expect(parliamentOrg.classification).toBe('Scotland Parliament');
      expect(departmentOrg.classification).toBe('Northern Ireland Department');
      expect(departmentOrg.parentOrganisation).toBe('Northern Ireland Executive');
    });

    it('should handle optional fields', () => {
      // GIVEN: Body with minimal data
      const minimalBody: DevolvedBody = {
        name: 'Test Body',
        nation: 'scotland',
        bodyType: 'agency'
      };

      // WHEN: Mapping to organisation
      const org = mapper.mapToOrganisation(minimalBody);

      // THEN: Should handle missing fields gracefully
      expect(org.parentOrganisation).toBeUndefined();
      expect(org.additionalProperties.website).toBeUndefined();
      expect(org.additionalProperties.established).toBeUndefined();
      expect(org.additionalProperties.responsibilities).toBeUndefined();
    });
  });
});