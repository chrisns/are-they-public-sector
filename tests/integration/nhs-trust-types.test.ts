import { NHSParser } from '../../src/services/nhs-parser';

describe('NHS Trust Type Detection', () => {
  let parser: NHSParser;

  beforeEach(() => {
    parser = new NHSParser();
  });

  describe('identifyTrustType()', () => {
    it('should identify Foundation Trusts by name', () => {
      const foundationNames = [
        "Guy's and St Thomas' NHS Foundation Trust",
        'University Hospitals Birmingham NHS Foundation Trust',
        'The Royal Marsden NHS Foundation Trust'
      ];

      foundationNames.forEach(name => {
        const type = parser.identifyTrustType(name);
        expect(type).toBe('foundation-trust');
      });
    });

    it('should identify regular NHS Trusts', () => {
      const trustNames = [
        'Barts Health NHS Trust',
        'London Ambulance Service NHS Trust',
        'NHS England'
      ];

      trustNames.forEach(name => {
        const type = parser.identifyTrustType(name);
        expect(type).toBe('trust');
      });
    });

    it('should handle case variations', () => {
      const variations = [
        'NHS FOUNDATION TRUST',
        'nhs foundation trust',
        'NHS Foundation Trust'
      ];

      variations.forEach(name => {
        const type = parser.identifyTrustType(name);
        expect(type).toBe('foundation-trust');
      });
    });
  });

  describe('generateCode()', () => {
    it('should generate valid codes from trust names', () => {
      const testCases = [
        { 
          name: "Guy's and St Thomas' NHS Foundation Trust",
          expectedPattern: /^[a-z0-9-]+$/
        },
        {
          name: 'University Hospitals Birmingham NHS Foundation Trust',
          expectedPattern: /^[a-z0-9-]+$/
        }
      ];

      testCases.forEach(({ name, expectedPattern }) => {
        const code = parser.generateCode(name);
        expect(code).toMatch(expectedPattern);
        expect(code.length).toBeGreaterThan(0);
        expect(code).not.toContain(' ');
        expect(code).not.toContain("'");
      });
    });

    it('should generate unique codes for different trusts', () => {
      const names = [
        'Barts Health NHS Trust',
        'London Ambulance Service NHS Trust',
        'Great Ormond Street Hospital NHS Trust'
      ];

      const codes = names.map(name => parser.generateCode(name));
      const uniqueCodes = new Set(codes);
      
      expect(uniqueCodes.size).toBe(codes.length);
    });
  });
});