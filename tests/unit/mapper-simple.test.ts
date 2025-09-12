/**
 * Unit tests for SimpleMapperService
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { SimpleMapperService } from '../../src/services/mapper-simple';
import { OrganisationType, DataSourceType } from '../../src/models/organisation';

describe('SimpleMapperService', () => {
  let mapper: SimpleMapperService;

  beforeEach(() => {
    mapper = new SimpleMapperService();
  });

  describe('mapGovUkOrganisation', () => {
    test('should map basic GOV.UK organisation', () => {
      const source = {
        title: 'Department of Test',
        slug: 'department-of-test',
        format: 'Ministerial department',
        withdrawn: false,
        updated_at: '2024-01-01T00:00:00Z',
        web_url: 'https://www.gov.uk/test',
        details: { info: 'test' }
      };

      const result = mapper.mapGovUkOrganisation(source);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('Department of Test');
      expect(result.data?.id).toBe('department-of-test');
      expect(result.data?.type).toBe(OrganisationType.MINISTERIAL_DEPARTMENT);
      expect(result.data?.status).toBe('active');
      expect(result.data?.sources[0].source).toBe(DataSourceType.GOV_UK_API);
    });

    test('should handle withdrawn organisation', () => {
      const source = {
        title: 'Closed Org',
        slug: 'closed-org',
        withdrawn: true
      };

      const result = mapper.mapGovUkOrganisation(source);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('dissolved');
    });

    test('should handle missing fields gracefully', () => {
      const source = {};

      const result = mapper.mapGovUkOrganisation(source);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Unknown');
      expect(result.data?.id).toContain('govuk-');
    });
  });

  describe('mapOnsOrganisation', () => {
    test('should map ONS organisation with Organisation field', () => {
      const source = {
        'Organisation': 'Test Council',
        '_source_sheet': 'Local Government',
        'Sponsoring Entity': 'UK Gov'
      };

      const result = mapper.mapOnsOrganisation(source);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Test Council');
      expect(result.data?.type).toBe(OrganisationType.OTHER);
      expect(result.data?.sources[0].source).toBe(DataSourceType.ONS_INSTITUTIONAL);
    });

    test('should determine type from source sheet', () => {
      const centralGov = {
        'Organisation': 'Test Dept',
        '_source_sheet': 'Central Government'
      };

      const result = mapper.mapOnsOrganisation(centralGov);

      expect(result.success).toBe(true);
      expect(result.data?.type).toBe(OrganisationType.MINISTERIAL_DEPARTMENT);
    });

    test('should handle missing organisation name', () => {
      const source = {
        '_source_sheet': 'Local Government'
      };

      const result = mapper.mapOnsOrganisation(source);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Unknown');
    });
  });
});