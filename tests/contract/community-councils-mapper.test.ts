import { CommunityCouncilsMapper } from '../../src/services/mappers/community-councils-mapper';
import type { WelshCommunityRaw } from '../../src/models/welsh-community';
import type { ScottishCommunityRaw } from '../../src/models/scottish-community';
import type { NIHealthTrustRaw } from '../../src/models/ni-health-trust';
import type { Organisation } from '../../src/models/organisation';

describe('CommunityCouncilsMapper Contract Tests', () => {
  let mapper: CommunityCouncilsMapper;

  beforeEach(() => {
    mapper = new CommunityCouncilsMapper();
  });

  describe('mapWelshCouncils()', () => {
    it('should map Welsh councils to Organisation model', () => {
      const welshCouncils: WelshCommunityRaw[] = [
        {
          name: 'Abertillery Town Council',
          principalArea: 'Blaenau Gwent',
          ward: 'Abertillery',
          type: 'Town Council',
          website: 'http://example.com',
          email: 'contact@example.com'
        },
        {
          name: 'Cardiff City Council',
          principalArea: 'Cardiff',
          ward: 'City Centre',
          type: 'City Council',
          website: 'http://cardiff.gov.uk',
          email: 'info@cardiff.gov.uk'
        }
      ];

      const result = mapper.mapWelshCouncils(welshCouncils);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);

      result.forEach((org: Organisation) => {
        expect(org).toHaveProperty('id');
        expect(org).toHaveProperty('name');
        expect(org).toHaveProperty('classification');
        expect(org).toHaveProperty('type');
        expect(org).toHaveProperty('location');
        expect(org).toHaveProperty('sources');

        expect(org.id).toMatch(/^WCC_/);
        expect(org.classification).toBe('Welsh Community Council');
        expect(org.type).toBe('welsh_community_council');
        expect(org.sources).toBeDefined();
        expect(Array.isArray(org.sources)).toBe(true);
      });

      // Test specific mapping
      const firstOrg = result[0];
      expect(firstOrg.name).toBe('Abertillery Town Council');
      expect(firstOrg.location?.region).toBe('Blaenau Gwent');
      expect(firstOrg.location?.country).toBe('Wales');
      expect(firstOrg.id).toBe('WCC_ABERTILLERY_TOWN_COUNCIL');
    });

    it('should generate correct IDs with WCC_ prefix', () => {
      const welshCouncils: WelshCommunityRaw[] = [
        {
          name: 'Test Council Name',
          principalArea: 'Test Area',
          ward: 'Test Ward',
          type: 'Community Council'
        }
      ];

      const result = mapper.mapWelshCouncils(welshCouncils);

      expect(result[0].id).toBe('WCC_TEST_COUNCIL_NAME');
      expect(result[0].id).toMatch(/^WCC_/);
    });
  });

  describe('mapScottishCouncils()', () => {
    it('should map Scottish councils to Organisation model', () => {
      const scottishCouncils: ScottishCommunityRaw[] = [
        {
          name: 'Aberdeenshire Community Council',
          councilArea: 'Aberdeenshire',
          isActive: true,
          region: 'North East Scotland',
          contactDetails: 'contact@example.com'
        },
        {
          name: 'Glasgow Community Council',
          councilArea: 'Glasgow City',
          isActive: true,
          region: 'Central Scotland',
          contactDetails: 'info@glasgow.com'
        }
      ];

      const result = mapper.mapScottishCouncils(scottishCouncils);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);

      result.forEach((org: Organisation) => {
        expect(org).toHaveProperty('id');
        expect(org).toHaveProperty('name');
        expect(org).toHaveProperty('classification');
        expect(org).toHaveProperty('type');
        expect(org).toHaveProperty('location');
        expect(org).toHaveProperty('sources');

        expect(org.id).toMatch(/^SCC_/);
        expect(org.classification).toBe('Scottish Community Council');
        expect(org.type).toBe('scottish_community_council');
        expect(org.sources).toBeDefined();
        expect(Array.isArray(org.sources)).toBe(true);
      });

      // Test specific mapping
      const firstOrg = result[0];
      expect(firstOrg.name).toBe('Aberdeenshire Community Council');
      expect(firstOrg.location?.region).toBe('Aberdeenshire');
      expect(firstOrg.location?.country).toBe('Scotland');
      expect(firstOrg.id).toBe('SCC_ABERDEENSHIRE_COMMUNITY_COUNCIL');
    });

    it('should generate correct IDs with SCC_ prefix', () => {
      const scottishCouncils: ScottishCommunityRaw[] = [
        {
          name: 'Test Scottish Council',
          councilArea: 'Test Area',
          isActive: true,
          region: 'Test Region'
        }
      ];

      const result = mapper.mapScottishCouncils(scottishCouncils);

      expect(result[0].id).toBe('SCC_TEST_SCOTTISH_COUNCIL');
      expect(result[0].id).toMatch(/^SCC_/);
    });
  });

  describe('mapNIHealthTrusts()', () => {
    it('should map NI Health Trusts to Organisation model', () => {
      const niHealthTrusts: NIHealthTrustRaw[] = [
        {
          name: 'Belfast Health and Social Care Trust',
          description: 'Belfast HSC Trust',
          website: 'www.belfasttrust.hscni.net'
        },
        {
          name: 'Northern Health and Social Care Trust',
          description: 'Northern HSC Trust',
          website: 'www.northerntrust.hscni.net'
        }
      ];

      const result = mapper.mapNIHealthTrusts(niHealthTrusts);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);

      result.forEach((org: Organisation) => {
        expect(org).toHaveProperty('id');
        expect(org).toHaveProperty('name');
        expect(org).toHaveProperty('classification');
        expect(org).toHaveProperty('type');
        expect(org).toHaveProperty('location');
        expect(org).toHaveProperty('sources');

        expect(org.id).toMatch(/^NIHT_/);
        expect(org.classification).toBe('Health and Social Care Trust');
        expect(org.type).toBe('ni_health_trust');
        expect(org.location?.country).toBe('Northern Ireland');
        expect(org.sources).toBeDefined();
        expect(Array.isArray(org.sources)).toBe(true);
      });

      // Test specific mapping
      const firstOrg = result[0];
      expect(firstOrg.name).toBe('Belfast Health and Social Care Trust');
      expect(firstOrg.id).toBe('NIHT_BELFAST_HEALTH_AND_SOCIAL_CARE_TRUST');
    });

    it('should generate correct IDs with NIHT_ prefix', () => {
      const niHealthTrusts: NIHealthTrustRaw[] = [
        {
          name: 'Test Health Trust',
          description: 'Test trust description'
        }
      ];

      const result = mapper.mapNIHealthTrusts(niHealthTrusts);

      expect(result[0].id).toBe('NIHT_TEST_HEALTH_TRUST');
      expect(result[0].id).toMatch(/^NIHT_/);
    });
  });

  describe('normalizeId()', () => {
    it('should test normalizeId function for consistent ID generation', () => {
      // Test that normalizeId is accessible and works correctly
      const testCases = [
        { input: 'Test Council Name', expected: 'TEST_COUNCIL_NAME' },
        { input: 'Council with & Special Characters!', expected: 'COUNCIL_WITH_SPECIAL_CHARACTERS' },
        { input: 'Multiple   Spaces', expected: 'MULTIPLE_SPACES' },
        { input: 'Hyphenated-Name', expected: 'HYPHENATED_NAME' },
        { input: "Council's Name", expected: 'COUNCIL_S_NAME' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = mapper.normalizeId(input);
        expect(result).toBe(expected);
      });
    });

    it('should handle empty and edge case inputs', () => {
      expect(mapper.normalizeId('')).toBe('');
      expect(mapper.normalizeId('   ')).toBe('');
      expect(mapper.normalizeId('123')).toBe('123');
      expect(mapper.normalizeId('A')).toBe('A');
    });
  });

  describe('Integration tests', () => {
    it('should ensure all mapper methods return valid Organisation objects', () => {
      const welshCouncil: WelshCommunityRaw = {
        name: 'Welsh Test Council',
        principalArea: 'Test Area'
      };

      const scottishCouncil: ScottishCommunityRaw = {
        name: 'Scottish Test Council',
        councilArea: 'Test Area',
        isActive: true
      };

      const niTrust: NIHealthTrustRaw = {
        name: 'Test Health Trust'
      };

      const welshResult = mapper.mapWelshCouncils([welshCouncil]);
      const scottishResult = mapper.mapScottishCouncils([scottishCouncil]);
      const niResult = mapper.mapNIHealthTrusts([niTrust]);

      // All should return valid Organisation arrays
      [welshResult, scottishResult, niResult].forEach(result => {
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(1);

        const org = result[0];
        expect(org.id).toBeDefined();
        expect(org.name).toBeDefined();
        expect(org.classification).toBeDefined();
        expect(org.type).toBeDefined();
        expect(org.location).toBeDefined();
        expect(org.sources).toBeDefined();
      });

      // Verify unique prefixes
      expect(welshResult[0].id).toMatch(/^WCC_/);
      expect(scottishResult[0].id).toMatch(/^SCC_/);
      expect(niResult[0].id).toMatch(/^NIHT_/);
    });
  });
});