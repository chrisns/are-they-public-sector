/**
 * Unit tests for OrganisationFilter utility class
 */

import { OrganisationFilter } from '../../../src/lib/organisation-filter';
import { Organisation, OrganisationType, DataSourceType } from '../../../src/models/organisation';

describe('OrganisationFilter', () => {
  // Helper function to create test organisations
  const createOrg = (id: string, status: 'active' | 'inactive' | 'dissolved'): Organisation => ({
    id,
    name: `Organisation ${id}`,
    type: OrganisationType.OTHER,
    classification: 'Test',
    status,
    sources: [{
      source: DataSourceType.MANUAL,
      retrievedAt: '2025-01-01T00:00:00Z',
      confidence: 1
    }],
    lastUpdated: '2025-01-01T00:00:00Z',
    dataQuality: {
      completeness: 1,
      hasConflicts: false,
      requiresReview: false
    }
  });

  describe('filterActive', () => {
    it('should keep only active organisations', () => {
      const organisations: Organisation[] = [
        createOrg('1', 'active'),
        createOrg('2', 'inactive'),
        createOrg('3', 'dissolved'),
        createOrg('4', 'active'),
        createOrg('5', 'inactive')
      ];

      const result = OrganisationFilter.filterActive(organisations);

      expect(result).toHaveLength(2);
      expect(result.map(o => o.id)).toEqual(['1', '4']);
      expect(result.every(o => o.status === 'active')).toBe(true);
    });

    it('should return empty array when all organisations are inactive', () => {
      const organisations: Organisation[] = [
        createOrg('1', 'inactive'),
        createOrg('2', 'dissolved'),
        createOrg('3', 'inactive')
      ];

      const result = OrganisationFilter.filterActive(organisations);

      expect(result).toHaveLength(0);
    });

    it('should return all organisations when all are active', () => {
      const organisations: Organisation[] = [
        createOrg('1', 'active'),
        createOrg('2', 'active'),
        createOrg('3', 'active')
      ];

      const result = OrganisationFilter.filterActive(organisations);

      expect(result).toHaveLength(3);
    });

    it('should handle empty array', () => {
      const result = OrganisationFilter.filterActive([]);
      expect(result).toEqual([]);
    });
  });

  describe('getFilteredCounts', () => {
    it('should return correct counts for each status', () => {
      const organisations: Organisation[] = [
        createOrg('1', 'active'),
        createOrg('2', 'active'),
        createOrg('3', 'inactive'),
        createOrg('4', 'dissolved'),
        createOrg('5', 'active'),
        createOrg('6', 'inactive')
      ];

      const counts = OrganisationFilter.getFilteredCounts(organisations);

      expect(counts).toEqual({
        active: 3,
        inactive: 2,
        dissolved: 1,
        total: 6
      });
    });

    it('should return zero counts for empty array', () => {
      const counts = OrganisationFilter.getFilteredCounts([]);

      expect(counts).toEqual({
        active: 0,
        inactive: 0,
        dissolved: 0,
        total: 0
      });
    });

    it('should handle single status type', () => {
      const organisations: Organisation[] = [
        createOrg('1', 'active'),
        createOrg('2', 'active'),
        createOrg('3', 'active')
      ];

      const counts = OrganisationFilter.getFilteredCounts(organisations);

      expect(counts).toEqual({
        active: 3,
        inactive: 0,
        dissolved: 0,
        total: 3
      });
    });
  });

  describe('filterActiveWithCounts', () => {
    it('should return active organisations and counts in single pass', () => {
      const organisations: Organisation[] = [
        createOrg('1', 'active'),
        createOrg('2', 'inactive'),
        createOrg('3', 'active'),
        createOrg('4', 'dissolved'),
        createOrg('5', 'inactive'),
        createOrg('6', 'active')
      ];

      const result = OrganisationFilter.filterActiveWithCounts(organisations);

      expect(result.active).toHaveLength(3);
      expect(result.active.map(o => o.id)).toEqual(['1', '3', '6']);
      expect(result.counts).toEqual({
        active: 3,
        inactive: 2,
        dissolved: 1,
        total: 6
      });
    });

    it('should handle empty array', () => {
      const result = OrganisationFilter.filterActiveWithCounts([]);

      expect(result.active).toEqual([]);
      expect(result.counts).toEqual({
        active: 0,
        inactive: 0,
        dissolved: 0,
        total: 0
      });
    });
  });

  describe('getFilterStatistics', () => {
    it('should calculate correct statistics', () => {
      const organisations: Organisation[] = [
        createOrg('1', 'active'),
        createOrg('2', 'active'),
        createOrg('3', 'inactive'),
        createOrg('4', 'dissolved'),
        createOrg('5', 'active')
      ];

      const stats = OrganisationFilter.getFilterStatistics(organisations);

      expect(stats).toEqual({
        total: 5,
        active: 3,
        inactive: 1,
        dissolved: 1,
        percentageActive: 60,
        percentageFiltered: 40
      });
    });

    it('should handle 100% active organisations', () => {
      const organisations: Organisation[] = [
        createOrg('1', 'active'),
        createOrg('2', 'active'),
        createOrg('3', 'active')
      ];

      const stats = OrganisationFilter.getFilterStatistics(organisations);

      expect(stats).toEqual({
        total: 3,
        active: 3,
        inactive: 0,
        dissolved: 0,
        percentageActive: 100,
        percentageFiltered: 0
      });
    });

    it('should handle 0% active organisations', () => {
      const organisations: Organisation[] = [
        createOrg('1', 'inactive'),
        createOrg('2', 'dissolved'),
        createOrg('3', 'inactive')
      ];

      const stats = OrganisationFilter.getFilterStatistics(organisations);

      expect(stats).toEqual({
        total: 3,
        active: 0,
        inactive: 2,
        dissolved: 1,
        percentageActive: 0,
        percentageFiltered: 100
      });
    });

    it('should handle empty array without division by zero', () => {
      const stats = OrganisationFilter.getFilterStatistics([]);

      expect(stats).toEqual({
        total: 0,
        active: 0,
        inactive: 0,
        dissolved: 0,
        percentageActive: 0,
        percentageFiltered: 0
      });
    });

    it('should round percentages to 2 decimal places', () => {
      const organisations: Organisation[] = [
        createOrg('1', 'active'),
        createOrg('2', 'inactive'),
        createOrg('3', 'inactive')
      ];

      const stats = OrganisationFilter.getFilterStatistics(organisations);

      expect(stats.percentageActive).toBe(33.33);
      expect(stats.percentageFiltered).toBe(66.67);
    });
  });
});