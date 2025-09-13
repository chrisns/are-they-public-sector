import { LocalAuthorityParser } from '../../src/services/local-authority-parser';

describe('Local Authority Type Inference', () => {
  let parser: LocalAuthorityParser;

  beforeEach(() => {
    parser = new LocalAuthorityParser();
  });

  describe('inferAuthorityType()', () => {
    it('should identify County Councils', () => {
      const countyNames = [
        'Hertfordshire County Council',
        'Essex County Council',
        'Kent County Council'
      ];

      countyNames.forEach(name => {
        const type = parser.inferAuthorityType(name);
        expect(type).toBe('county');
      });
    });

    it('should identify District Councils', () => {
      const districtNames = [
        'Ashford District Council',
        'Braintree District Council',
        'Dartford District Council'
      ];

      districtNames.forEach(name => {
        const type = parser.inferAuthorityType(name);
        expect(type).toBe('district');
      });
    });

    it('should identify Borough Councils', () => {
      const boroughNames = [
        'Elmbridge Borough Council',
        'Runnymede Borough Council',
        'Woking Borough Council'
      ];

      boroughNames.forEach(name => {
        const type = parser.inferAuthorityType(name);
        expect(type).toBe('borough');
      });
    });

    it('should identify City Councils', () => {
      const cityNames = [
        'Manchester City Council',
        'Birmingham City Council',
        'Leeds City Council'
      ];

      cityNames.forEach(name => {
        const type = parser.inferAuthorityType(name);
        expect(type).toBe('city');
      });
    });

    it('should default to unitary for unspecified types', () => {
      const unitaryNames = [
        'Cornwall Council',
        'Durham Council',
        'Wiltshire Council'
      ];

      unitaryNames.forEach(name => {
        const type = parser.inferAuthorityType(name);
        expect(type).toBe('unitary');
      });
    });
  });

  describe('generateCode()', () => {
    it('should generate codes combining name and domain', () => {
      const testCases = [
        {
          name: 'Aberdeen City Council',
          url: 'https://www.aberdeencity.gov.uk',
          expectedPattern: /aberdeen.*city.*council.*aberdeencity/i
        },
        {
          name: 'Birmingham City Council',
          url: 'https://www.birmingham.gov.uk',
          expectedPattern: /birmingham.*city.*council.*birmingham/i
        }
      ];

      testCases.forEach(({ name, url, expectedPattern }) => {
        const code = parser.generateCode(name, url);
        expect(code).toMatch(/^[a-z0-9-]+$/);
        expect(code.toLowerCase()).toMatch(expectedPattern);
      });
    });

    it('should handle URL variations', () => {
      const urls = [
        'http://example.gov.uk',
        'https://example.gov.uk',
        'https://www.example.gov.uk',
        'https://example.gov.uk/path'
      ];

      urls.forEach(url => {
        const code = parser.generateCode('Test Council', url);
        expect(code).toContain('example');
        expect(code).not.toContain('http');
        expect(code).not.toContain('www');
        expect(code).not.toContain('/');
      });
    });
  });
});