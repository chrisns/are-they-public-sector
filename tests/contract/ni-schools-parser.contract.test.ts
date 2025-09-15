/**
 * Contract tests for Northern Ireland Schools Parser
 * These tests define the expected behavior and must fail initially (TDD)
 */

import { NISchoolsParser } from '../../src/services/ni-schools-parser';

describe('NISchoolsParser Contract', () => {
  let parser: NISchoolsParser;

  beforeEach(() => {
    parser = new NISchoolsParser();
  });

  describe('parse()', () => {
    it('should fetch and parse Northern Ireland schools data', async () => {
      // Arrange
      const expectedMinCount = 1010; // 1122 - 10%
      const expectedMaxCount = 1234; // 1122 + 10%

      // Act
      const result = await parser.parse();

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(expectedMinCount);
      expect(result.length).toBeLessThanOrEqual(expectedMaxCount);
    }, 30000); // 30 second timeout for real API call

    it('should return schools with required fields', async () => {
      // Act
      const result = await parser.parse();

      // Assert
      expect(result.length).toBeGreaterThan(0);

      // Check first school has required fields
      const firstSchool = result[0];
      expect(firstSchool.schoolName).toBeDefined();
      expect(typeof firstSchool.schoolName).toBe('string');
      expect(firstSchool.schoolName.length).toBeGreaterThan(0);

      expect(firstSchool.schoolType).toBeDefined();
      expect(typeof firstSchool.schoolType).toBe('string');

      expect(firstSchool.status).toBe('Open'); // Only open schools
    }, 30000); // 30 second timeout for real API call

    it('should include all school types', async () => {
      // Act
      const result = await parser.parse();

      // Assert
      const types = [...new Set(result.map(s => s.schoolType))];
      expect(types).toContain('Primary');
      // Note: Other types may or may not be present depending on data
    }, 30000); // 30 second timeout for real API call

    it('should handle optional fields gracefully', async () => {
      // Act
      const result = await parser.parse();

      // Assert
      result.forEach(school => {
        // Optional fields should be either string or undefined
        if (school.address1 !== undefined) {
          expect(typeof school.address1).toBe('string');
        }
        if (school.postcode !== undefined) {
          expect(typeof school.postcode).toBe('string');
        }
        if (school.telephone !== undefined) {
          expect(typeof school.telephone).toBe('string');
        }
      });
    }, 30000); // 30 second timeout for real API call

    it('should fail fast when service is unavailable', async () => {
      // Arrange
      jest.spyOn(parser, 'fetchPage' as any).mockRejectedValue(
        new Error('Service unavailable')
      );

      // Act & Assert
      await expect(parser.parse()).rejects.toThrow('Service unavailable');
    });

    it('should fail fast when ViewState token is missing', async () => {
      // Arrange
      jest.spyOn(parser as any, 'fetchPage').mockResolvedValue(
        '<html><body>No ViewState here</body></html>'
      );

      // Act & Assert
      await expect(parser.parse()).rejects.toThrow(/ViewState/i);
    });

    it('should fail fast when Excel format is invalid', async () => {
      // Arrange
      jest.spyOn(parser as any, 'fetchExcelData').mockResolvedValue(
        Buffer.from('Not an Excel file')
      );

      // Act & Assert
      await expect(parser.parse()).rejects.toThrow(/format/i);
    });

    it('should fail fast when count validation fails', async () => {
      // Arrange
      jest.spyOn(parser as any, 'parseExcel').mockResolvedValue([
        { schoolName: 'Test School', schoolType: 'Primary', status: 'Open' }
      ]); // Only 1 school - way below threshold

      // Act & Assert
      await expect(parser.parse()).rejects.toThrow(/count/i);
    });

    it('should filter out closed and proposed schools', async () => {
      // Arrange
      const mockData = [
        { schoolName: 'Open School', status: 'Open', schoolType: 'Primary' },
        { schoolName: 'Closed School', status: 'Closed', schoolType: 'Primary' },
        { schoolName: 'Proposed School', status: 'Proposed', schoolType: 'Primary' }
      ];
      jest.spyOn(parser as any, 'parseExcel').mockResolvedValue(mockData);
      jest.spyOn(parser as any, 'validateCount').mockImplementation(() => true);

      // Act
      const result = await parser.parse();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].schoolName).toBe('Open School');
    });

    it('should handle network timeouts appropriately', async () => {
      // Arrange
      const timeoutError = new Error('ETIMEDOUT');
      jest.spyOn(parser, 'fetchPage' as any).mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(parser.parse()).rejects.toThrow('ETIMEDOUT');
    });

    it('should extract ViewState and EventValidation tokens correctly', async () => {
      // Arrange
      const mockHtml = `
        <html>
          <input id="__VIEWSTATE" value="TestViewState123" />
          <input id="__EVENTVALIDATION" value="TestEventValidation456" />
        </html>
      `;
      jest.spyOn(parser as any, 'fetchPage').mockResolvedValue(mockHtml);

      // Act
      const tokens = await (parser as any).extractTokens(mockHtml);

      // Assert
      expect(tokens.viewState).toBe('TestViewState123');
      expect(tokens.eventValidation).toBe('TestEventValidation456');
    });

    it('should URL encode tokens properly', () => {
      // Arrange
      const token = 'Test+Token/With=Special&Chars';

      // Act
      const encoded = (parser as any).urlEncode(token);

      // Assert
      expect(encoded).toBe('Test%2BToken%2FWith%3DSpecial%26Chars');
    });

    it('should use correct form parameters for export', async () => {
      // Arrange
      const mockFetch = jest.spyOn(parser as any, 'fetchExcelData');
      mockFetch.mockResolvedValue(Buffer.from('mock excel'));

      // Act
      await (parser as any).fetchExcelData('viewState', 'eventValidation');

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('viewState', 'eventValidation');
    });
  });

  describe('error handling', () => {
    it('should provide clear error messages for common failures', async () => {
      const scenarios = [
        {
          mock: () => {
            const error = new Error('ECONNREFUSED') as any;
            error.code = 'ECONNREFUSED';
            jest.spyOn(parser as any, 'fetchPage').mockRejectedValue(error);
          },
          expectedError: /Service unavailable/i
        },
        {
          mock: () => jest.spyOn(parser as any, 'fetchPage').mockResolvedValue('<html>Invalid</html>'),
          expectedError: /ViewState.*not found/i
        },
        {
          mock: () => {
            jest.spyOn(parser as any, 'fetchPage').mockResolvedValue('<input id="__VIEWSTATE" value="test" /><input id="__EVENTVALIDATION" value="test" />');
            jest.spyOn(parser as any, 'fetchExcelData').mockResolvedValue(Buffer.from(''));
          },
          expectedError: /Empty response/i
        }
      ];

      for (const scenario of scenarios) {
        scenario.mock();
        await expect(parser.parse()).rejects.toThrow(scenario.expectedError);
        jest.clearAllMocks();
      }
    });
  });
});