/**
 * Unit tests for MapperService
 * Tests field mapping, data transformation, and quality calculations
 */

import { MapperService } from '../../src/services/mapper';
import { OrganisationType, DataSourceType } from '../../src/models/organisation';
import type { Organisation, DataQuality } from '../../src/models/organisation';
import type {
  GovUKOrganisation,
  ONSInstitutionalUnit,
  ONSNonInstitutionalUnit
} from '../../src/models/sources';

// Mock the crypto module for UUID generation
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid-123')
}));

describe('MapperService', () => {
  let mapper: MapperService;

  beforeEach(() => {
    jest.clearAllMocks();
    mapper = new MapperService();
  });

  describe('mapGovUkOrganisation', () => {
    it('should map GOV.UK organisation to unified model', () => {
      const govUkOrg: GovUKOrganisation = {
        content_id: 'gov-123',
        title: 'Department of Health',
        organisation_govuk_status: { status: 'live' },
        format: 'Executive agency',
        base_path: '/government/organisations/department-of-health',
        web_url: 'https://www.gov.uk/government/organisations/department-of-health',
        public_timestamp: '2021-01-01T00:00:00Z',
        links: {
          parent_organisations: [
            { content_id: 'parent-123', title: 'Parent Org' }
          ]
        },
        locale: 'en',
        phase: 'live',
        document_type: 'organisation',
        schema_name: 'organisation',
        withdrawn: false,
        details: {
          acronym: 'DH',
          brand: 'department-of-health',
          default_news_image: null,
          logo: {
            crest: 'single-identity',
            formatted_title: 'Department<br/>of Health'
          },
          organisation_featuring_priority: 0,
          organisation_govuk_closed_status: null,
          organisation_type: 'executive_agency',
          parent_organisations: [],
          child_organisations: [],
          superseded_organisations: [],
          superseding_organisations: []
        },
        description: 'The Department of Health',
        updated_at: '2021-01-01T00:00:00Z',
        analytics_identifier: 'DH'
      };

      const result = mapper.mapGovUkOrganisation(govUkOrg);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      const org = result.data as Organisation;
      expect(org.id).toBe('mock-uuid-123');
      expect(org.name).toBe('Department of Health');
      expect(org.alternativeNames).toContain('DH');
      expect(org.type).toBe(OrganisationType.DEPARTMENT);
      expect(org.status).toBe('active');
      expect(org.parentOrganisation).toBe('parent-123');
      expect(org.sources).toHaveLength(1);
      expect(org.sources[0]).toMatchObject({
        source: DataSourceType.GOV_UK_API,
        sourceId: 'gov-123',
        url: 'https://www.gov.uk/government/organisations/department-of-health',
        confidence: 0.8
      });
    });

    it('should map organisation types correctly', () => {
      const testCases = [
        { input: 'ministerial_department', expected: OrganisationType.DEPARTMENT },
        { input: 'non_ministerial_department', expected: OrganisationType.NDPB },
        { input: 'executive_agency', expected: OrganisationType.AGENCY },
        { input: 'executive_ndpb', expected: OrganisationType.NDPB },
        { input: 'advisory_ndpb', expected: OrganisationType.NDPB },
        { input: 'tribunal', expected: OrganisationType.TRIBUNAL },
        { input: 'public_corporation', expected: OrganisationType.PUBLIC_CORPORATION },
        { input: 'other', expected: OrganisationType.OTHER }
      ];

      testCases.forEach(({ input, expected }) => {
        const govUkOrg: Partial<GovUKOrganisation> = {
          content_id: 'test-id',
          title: 'Test Org',
          details: { organisation_type: input }
        };

        const result = mapper.mapGovUkOrganisation(govUkOrg as GovUKOrganisation);
        expect(result.data?.type).toBe(expected);
      });
    });

    it('should map organisation status correctly', () => {
      const testCases = [
        { status: 'live', closed: null, withdrawn: false, expected: 'active' },
        { status: 'closed', closed: 'closed', withdrawn: false, expected: 'inactive' },
        { status: 'live', closed: null, withdrawn: true, expected: 'dissolved' },
        { status: 'exempt', closed: null, withdrawn: false, expected: 'active' }
      ];

      testCases.forEach(({ status, closed, withdrawn, expected }) => {
        const govUkOrg: Partial<GovUKOrganisation> = {
          content_id: 'test-id',
          title: 'Test Org',
          organisation_govuk_status: { status },
          withdrawn,
          details: { organisation_govuk_closed_status: closed }
        };

        const result = mapper.mapGovUkOrganisation(govUkOrg as GovUKOrganisation);
        expect(result.data?.status).toBe(expected);
      });
    });

    it('should map locale to location', () => {
      const testCases = [
        { locale: 'en', expected: 'England' },
        { locale: 'cy', expected: 'Wales' },
        { locale: 'gd', expected: 'Scotland' },
        { locale: 'en-GB', expected: 'United Kingdom' },
        { locale: 'unknown', expected: 'United Kingdom' }
      ];

      testCases.forEach(({ locale, expected }) => {
        const govUkOrg: Partial<GovUKOrganisation> = {
          content_id: 'test-id',
          title: 'Test Org',
          locale
        };

        const result = mapper.mapGovUkOrganisation(govUkOrg as GovUKOrganisation);
        expect(result.data?.location?.country).toBe(expected);
      });
    });

    it('should handle missing optional fields', () => {
      const minimalOrg: Partial<GovUKOrganisation> = {
        content_id: 'minimal-123',
        title: 'Minimal Org'
      };

      const result = mapper.mapGovUkOrganisation(minimalOrg as GovUKOrganisation);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('Minimal Org');
      expect(result.data?.alternativeNames).toEqual([]);
      expect(result.data?.parentOrganisation).toBeUndefined();
    });

    it('should handle transformation errors', () => {
      const invalidOrg = null;

      const result = mapper.mapGovUkOrganisation(invalidOrg as any);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('mapOnsInstitutional', () => {
    it('should map ONS institutional unit to unified model', () => {
      const onsUnit: ONSInstitutionalUnit = {
        CDID: 'CDID001',
        Name: 'NHS England',
        Classification: 'Central Government',
        Sector: 'S.1311',
        'Sub-sector': 'Central government',
        'ONS List 1': 'Y',
        'ESA 2010': 'Y',
        MGDD: 'Y',
        'Start date': '01/01/2020',
        'End date': null
      };

      const result = mapper.mapOnsInstitutional(onsUnit);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      const org = result.data as Organisation;
      expect(org.name).toBe('NHS England');
      expect(org.type).toBe(OrganisationType.NDPB);
      expect(org.classification).toMatchObject({
        sector: 'S.1311',
        subSector: 'Central government',
        onsList1: true,
        esa2010: true,
        mgdd: true
      });
      expect(org.sources).toHaveLength(1);
      expect(org.sources[0].source).toBe(DataSourceType.ONS_INSTITUTIONAL);
    });

    it('should map classification to organisation type', () => {
      const testCases = [
        { classification: 'Central Government', expected: OrganisationType.NDPB },
        { classification: 'Local Government', expected: OrganisationType.LOCAL_AUTHORITY },
        { classification: 'Public Corporation', expected: OrganisationType.PUBLIC_CORPORATION },
        { classification: 'Public Financial Corporation', expected: OrganisationType.PUBLIC_CORPORATION },
        { classification: 'Unknown', expected: OrganisationType.OTHER }
      ];

      testCases.forEach(({ classification, expected }) => {
        const onsUnit: Partial<ONSInstitutionalUnit> = {
          Name: 'Test Org',
          Classification: classification
        };

        const result = mapper.mapOnsInstitutional(onsUnit as ONSInstitutionalUnit);
        expect(result.data?.type).toBe(expected);
      });
    });

    it('should handle date fields correctly', () => {
      const onsUnit: ONSInstitutionalUnit = {
        Name: 'Test Org',
        'Start date': '15/03/2020',
        'End date': '31/12/2023'
      };

      const result = mapper.mapOnsInstitutional(onsUnit);

      expect(result.data?.establishedDate).toBe('2020-03-15');
      expect(result.data?.dissolvedDate).toBe('2023-12-31');
    });

    it('should set status based on end date', () => {
      const activeUnit: Partial<ONSInstitutionalUnit> = {
        Name: 'Active Org',
        'End date': null
      };

      const inactiveUnit: Partial<ONSInstitutionalUnit> = {
        Name: 'Inactive Org',
        'End date': '31/12/2022'
      };

      const activeResult = mapper.mapOnsInstitutional(activeUnit as ONSInstitutionalUnit);
      expect(activeResult.data?.status).toBe('active');

      const inactiveResult = mapper.mapOnsInstitutional(inactiveUnit as ONSInstitutionalUnit);
      expect(inactiveResult.data?.status).toBe('dissolved');
    });

    it('should handle Y/N boolean fields', () => {
      const testCases = [
        { value: 'Y', expected: true },
        { value: 'N', expected: false },
        { value: 'Yes', expected: true },
        { value: 'No', expected: false },
        { value: null, expected: false },
        { value: undefined, expected: false },
        { value: 'Maybe', expected: false }
      ];

      testCases.forEach(({ value, expected }) => {
        const onsUnit: Partial<ONSInstitutionalUnit> = {
          Name: 'Test Org',
          'ONS List 1': value as any
        };

        const result = mapper.mapOnsInstitutional(onsUnit as ONSInstitutionalUnit);
        expect(result.data?.classification?.onsList1).toBe(expected);
      });
    });
  });

  describe('mapOnsNonInstitutional', () => {
    it('should map ONS non-institutional unit to unified model', () => {
      const onsUnit: ONSNonInstitutionalUnit = {
        Name: 'British Business Bank',
        Classification: 'Public Corporation',
        Sector: 'S.12701',
        'Sub-sector': 'Public monetary financial institutions',
        'Trading fund': 'N',
        'Market body / Regulator / Other': 'Market body',
        'Start date': '01/04/2014',
        'End date': null
      };

      const result = mapper.mapOnsNonInstitutional(onsUnit);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      const org = result.data as Organisation;
      expect(org.name).toBe('British Business Bank');
      expect(org.type).toBe(OrganisationType.PUBLIC_CORPORATION);
      expect(org.classification).toMatchObject({
        sector: 'S.12701',
        subSector: 'Public monetary financial institutions',
        tradingFund: false,
        marketBodyType: 'Market body'
      });
      expect(org.sources).toHaveLength(1);
      expect(org.sources[0].source).toBe(DataSourceType.ONS_NON_INSTITUTIONAL);
    });

    it('should handle trading fund flag', () => {
      const tradingFund: Partial<ONSNonInstitutionalUnit> = {
        Name: 'Trading Fund Org',
        'Trading fund': 'Y'
      };

      const nonTradingFund: Partial<ONSNonInstitutionalUnit> = {
        Name: 'Non-Trading Fund Org',
        'Trading fund': 'N'
      };

      const tradingResult = mapper.mapOnsNonInstitutional(tradingFund as ONSNonInstitutionalUnit);
      expect(tradingResult.data?.classification?.tradingFund).toBe(true);

      const nonTradingResult = mapper.mapOnsNonInstitutional(nonTradingFund as ONSNonInstitutionalUnit);
      expect(nonTradingResult.data?.classification?.tradingFund).toBe(false);
    });

    it('should map market body types', () => {
      const testCases = [
        'Market body',
        'Regulator',
        'Other',
        'Market body / Regulator'
      ];

      testCases.forEach((marketBodyType) => {
        const onsUnit: Partial<ONSNonInstitutionalUnit> = {
          Name: 'Test Org',
          'Market body / Regulator / Other': marketBodyType
        };

        const result = mapper.mapOnsNonInstitutional(onsUnit as ONSNonInstitutionalUnit);
        expect(result.data?.classification?.marketBodyType).toBe(marketBodyType);
      });
    });
  });

  describe('data quality calculations', () => {
    it('should calculate completeness score', () => {
      const completeOrg: Partial<GovUKOrganisation> = {
        content_id: 'complete-123',
        title: 'Complete Org',
        description: 'A complete organisation',
        details: {
          acronym: 'CO',
          organisation_type: 'executive_agency'
        },
        links: {
          parent_organisations: [{ content_id: 'parent-123' }]
        },
        web_url: 'https://www.gov.uk/org',
        updated_at: '2021-01-01T00:00:00Z'
      };

      const incompleteOrg: Partial<GovUKOrganisation> = {
        content_id: 'incomplete-123',
        title: 'Incomplete Org'
      };

      const completeResult = mapper.mapGovUkOrganisation(completeOrg as GovUKOrganisation);
      const incompleteResult = mapper.mapGovUkOrganisation(incompleteOrg as GovUKOrganisation);

      expect(completeResult.data?.dataQuality?.completeness).toBeGreaterThan(0.7);
      expect(incompleteResult.data?.dataQuality?.completeness).toBeLessThan(0.5);
    });

    it('should set confidence based on source', () => {
      const govUkOrg: Partial<GovUKOrganisation> = {
        content_id: 'test-123',
        title: 'Test Org'
      };

      const result = mapper.mapGovUkOrganisation(govUkOrg as GovUKOrganisation);
      
      // Default confidence for GOV_UK_API
      expect(result.data?.dataQuality?.confidence).toBe(0.8);
    });

    it('should flag organisations requiring review', () => {
      const lowQualityOrg: Partial<GovUKOrganisation> = {
        content_id: 'low-quality-123',
        title: 'LQ'  // Very short name
      };

      const result = mapper.mapGovUkOrganisation(lowQualityOrg as GovUKOrganisation);
      
      expect(result.data?.dataQuality?.requiresReview).toBe(true);
      expect(result.data?.dataQuality?.reviewReasons).toContain('Low completeness score');
    });

    it('should not flag high quality organisations for review', () => {
      const highQualityOrg: Partial<GovUKOrganisation> = {
        content_id: 'high-quality-123',
        title: 'High Quality Organisation',
        description: 'A well-documented organisation with complete information',
        details: {
          acronym: 'HQO',
          organisation_type: 'executive_agency'
        },
        web_url: 'https://www.gov.uk/hqo'
      };

      const result = mapper.mapGovUkOrganisation(highQualityOrg as GovUKOrganisation);
      
      expect(result.data?.dataQuality?.requiresReview).toBe(false);
      expect(result.data?.dataQuality?.reviewReasons).toEqual([]);
    });
  });

  describe('configuration options', () => {
    it('should generate IDs when configured', () => {
      const mapper = new MapperService({ generateIds: true });
      const govUkOrg: Partial<GovUKOrganisation> = {
        content_id: 'test-123',
        title: 'Test Org'
      };

      const result = mapper.mapGovUkOrganisation(govUkOrg as GovUKOrganisation);
      
      expect(result.data?.id).toBe('mock-uuid-123');
    });

    it('should preserve source IDs when configured', () => {
      const mapper = new MapperService({ 
        generateIds: false,
        preserveSourceIds: true 
      });
      const govUkOrg: Partial<GovUKOrganisation> = {
        content_id: 'source-123',
        title: 'Test Org'
      };

      const result = mapper.mapGovUkOrganisation(govUkOrg as GovUKOrganisation);
      
      expect(result.data?.id).toBe('source-123');
    });

    it('should use custom default confidence', () => {
      const mapper = new MapperService({ defaultConfidence: 0.95 });
      const govUkOrg: Partial<GovUKOrganisation> = {
        content_id: 'test-123',
        title: 'Test Org'
      };

      const result = mapper.mapGovUkOrganisation(govUkOrg as GovUKOrganisation);
      
      expect(result.data?.sources[0].confidence).toBe(0.95);
    });

    it('should skip completeness calculation when disabled', () => {
      const mapper = new MapperService({ calculateCompleteness: false });
      const govUkOrg: Partial<GovUKOrganisation> = {
        content_id: 'test-123',
        title: 'Test Org'
      };

      const result = mapper.mapGovUkOrganisation(govUkOrg as GovUKOrganisation);
      
      expect(result.data?.dataQuality?.completeness).toBe(1.0);
    });
  });

  describe('field mapping edge cases', () => {
    it('should handle very long organisation names', () => {
      const longName = 'A'.repeat(500);
      const govUkOrg: Partial<GovUKOrganisation> = {
        content_id: 'long-name-123',
        title: longName
      };

      const result = mapper.mapGovUkOrganisation(govUkOrg as GovUKOrganisation);
      
      expect(result.data?.name).toBe(longName);
      expect(result.data?.dataQuality?.requiresReview).toBe(true);
      expect(result.data?.dataQuality?.reviewReasons).toContain('Unusually long name');
    });

    it('should handle special characters in names', () => {
      const specialName = 'Test & Co. (UK) Ltd. - "Special" Division';
      const govUkOrg: Partial<GovUKOrganisation> = {
        content_id: 'special-123',
        title: specialName
      };

      const result = mapper.mapGovUkOrganisation(govUkOrg as GovUKOrganisation);
      
      expect(result.data?.name).toBe(specialName);
    });

    it('should handle multiple parent organisations', () => {
      const govUkOrg: Partial<GovUKOrganisation> = {
        content_id: 'multi-parent-123',
        title: 'Multi-Parent Org',
        links: {
          parent_organisations: [
            { content_id: 'parent-1', title: 'Parent 1' },
            { content_id: 'parent-2', title: 'Parent 2' },
            { content_id: 'parent-3', title: 'Parent 3' }
          ]
        }
      };

      const result = mapper.mapGovUkOrganisation(govUkOrg as GovUKOrganisation);
      
      // Should take the first parent
      expect(result.data?.parentOrganisation).toBe('parent-1');
    });

    it('should handle invalid date formats', () => {
      const onsUnit: Partial<ONSInstitutionalUnit> = {
        Name: 'Test Org',
        'Start date': 'invalid-date',
        'End date': '32/13/2020'  // Invalid date
      };

      const result = mapper.mapOnsInstitutional(onsUnit as ONSInstitutionalUnit);
      
      expect(result.data?.establishedDate).toBeUndefined();
      expect(result.data?.dissolvedDate).toBeUndefined();
    });
  });
});