/**
 * Contract test for Northern Ireland Government Departments Fetcher
 * Tests the contract for fetching NI government departments
 */

import { NIGovernmentDeptsFetcher } from '../../src/services/fetchers/ni-government-depts-fetcher';
import { DataSource } from '../../src/models/data-source';
import { GovernmentDepartmentData } from '../../src/models/source-data';

describe('NIGovernmentDeptsFetcher Contract', () => {
  let fetcher: NIGovernmentDeptsFetcher;

  beforeEach(() => {
    fetcher = new NIGovernmentDeptsFetcher();
  });

  describe('fetch', () => {
    it('should return correct source identifier', async () => {
      const result = await fetcher.fetch();
      expect(result.source).toBe(DataSource.NI_GOVERNMENT);
    });

    it('should successfully fetch and parse NI government departments', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it('should return valid government department objects', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const firstDept = result.data![0] as GovernmentDepartmentData;

      expect(firstDept.name).toBeDefined();
      expect(typeof firstDept.name).toBe('string');
      expect(firstDept.name.length).toBeGreaterThan(0);
    });

    it('should include all main NI government departments', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const deptNames = result.data!.map((dept: GovernmentDepartmentData) => dept.name);

      // Should include the main NI Executive departments
      expect(deptNames.some(name => name.includes('Department of Agriculture, Environment and Rural Affairs') || name.includes('DAERA'))).toBe(true);
      expect(deptNames.some(name => name.includes('Department for Communities') || name.includes('DfC'))).toBe(true);
      expect(deptNames.some(name => name.includes('Department for the Economy') || name.includes('DfE'))).toBe(true);
      expect(deptNames.some(name => name.includes('Department of Education') || name.includes('DE'))).toBe(true);
      expect(deptNames.some(name => name.includes('Department of Finance') || name.includes('DoF'))).toBe(true);
      expect(deptNames.some(name => name.includes('Department of Health') || name.includes('DoH'))).toBe(true);
      expect(deptNames.some(name => name.includes('Department for Infrastructure') || name.includes('DfI'))).toBe(true);
      expect(deptNames.some(name => name.includes('Department of Justice') || name.includes('DoJ'))).toBe(true);
      expect(deptNames.some(name => name.includes('The Executive Office') || name.includes('TEO'))).toBe(true);
    });

    it('should extract minister information when available', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const deptsWithMinisters = result.data!.filter((dept: GovernmentDepartmentData) => dept.minister);

      if (deptsWithMinisters.length > 0) {
        expect(deptsWithMinisters[0].minister!.length).toBeGreaterThan(3);
        // Ministers should have proper names
        expect(deptsWithMinisters[0].minister).toMatch(/[A-Z][a-z]/);
      }
    });

    it('should extract departmental responsibilities when available', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const deptsWithResponsibilities = result.data!.filter((dept: GovernmentDepartmentData) =>
        dept.responsibilities && dept.responsibilities.length > 0
      );

      if (deptsWithResponsibilities.length > 0) {
        expect(deptsWithResponsibilities[0].responsibilities!.length).toBeGreaterThan(0);
        expect(deptsWithResponsibilities[0].responsibilities![0].length).toBeGreaterThan(5);
      }
    });

    it('should extract website URLs when available', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      const deptsWithWebsites = result.data!.filter((dept: GovernmentDepartmentData) => dept.website);

      expect(deptsWithWebsites.length).toBeGreaterThan(0);
      // NI government websites typically use .gov.uk or .nidirect.gov.uk
      expect(deptsWithWebsites[0].website).toMatch(/\.gov\.uk|\.nidirect\.gov\.uk/);
    });

    it('should return approximately 9 main government departments', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);
      expect(result.metadata?.totalRecords).toBeDefined();
      // NI Executive has 9 main departments
      expect(result.metadata?.totalRecords).toBeGreaterThan(7);
      expect(result.metadata?.totalRecords).toBeLessThan(15);
    });

    it('should handle network errors with retry mechanism', async () => {
      // Mock network error scenario
      jest.spyOn(fetcher as any, 'fetchWithRetry').mockRejectedValueOnce(new Error('Network error'));

      const result = await fetcher.fetch();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should have correct URL configuration', () => {
      expect(fetcher.url).toBe('https://www.northernireland.gov.uk/articles/northern-ireland-executive-departments');
      expect(fetcher.source).toBe(DataSource.NI_GOVERNMENT);
    });

    it('should validate department names contain appropriate terminology', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);

      // Department names should contain appropriate government terminology
      result.data!.forEach((dept: GovernmentDepartmentData) => {
        expect(dept.name).toMatch(/Department|Office|Executive|Ministry|Agency/i);
      });
    });

    it('should distinguish between departments and executive agencies', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);

      // Should focus on main departments rather than subordinate agencies
      const mainDepts = result.data!.filter((dept: GovernmentDepartmentData) =>
        dept.name.includes('Department') || dept.name.includes('Executive Office')
      );

      expect(mainDepts.length).toBeGreaterThan(5);
    });

    it('should handle Northern Ireland specific governance structure', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);

      // Should include The Executive Office as unique to NI
      const executiveOffice = result.data!.find((dept: GovernmentDepartmentData) =>
        dept.name.includes('Executive Office')
      );

      expect(executiveOffice).toBeDefined();
    });

    it('should extract policy areas correctly', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);

      // Departments should cover major policy areas
      const deptNames = result.data!.map((dept: GovernmentDepartmentData) => dept.name);
      const majorAreas = ['Health', 'Education', 'Justice', 'Finance', 'Infrastructure', 'Agriculture', 'Communities', 'Economy'];

      majorAreas.forEach(area => {
        expect(deptNames.some(name => name.includes(area))).toBe(true);
      });
    });

    it('should handle devolved vs reserved matters appropriately', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);

      // Should not include reserved matters departments (like Defence, Foreign Office)
      const deptNames = result.data!.map((dept: GovernmentDepartmentData) => dept.name);

      expect(deptNames.some(name => name.includes('Defence') || name.includes('Foreign'))).toBe(false);
      expect(deptNames.some(name => name.includes('Home Office') || name.includes('Treasury'))).toBe(false);
    });

    it('should parse Northern Ireland government website structure correctly', async () => {
      const result = await fetcher.fetch();

      expect(result.success).toBe(true);

      // All departments should have valid, non-empty names
      result.data!.forEach((dept: GovernmentDepartmentData) => {
        expect(dept.name.trim().length).toBeGreaterThan(5);
        expect(dept.name).not.toContain('undefined');
        expect(dept.name).not.toContain('null');
      });
    });
  });
});