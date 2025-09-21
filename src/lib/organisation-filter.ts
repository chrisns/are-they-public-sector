/**
 * Organisation Filter Utility
 * Provides filtering functionality for organisations based on their status
 */

import type { Organisation } from '../models/organisation.js';

/**
 * Utility class for filtering organisations based on status
 */
export class OrganisationFilter {
  /**
   * Filter out inactive/dissolved organisations
   * @param organisations Array of organisations to filter
   * @returns Only active organisations
   */
  static filterActive(organisations: Organisation[]): Organisation[] {
    return organisations.filter(org => {
      // The status field is required and typed as 'active' | 'inactive' | 'dissolved'
      // Only keep organisations with 'active' status
      return org.status === 'active';
    });
  }

  /**
   * Get count of filtered organisations by status
   * @param organisations Array of organisations to count
   * @returns Object with counts for each status type
   */
  static getFilteredCounts(organisations: Organisation[]): {
    active: number;
    inactive: number;
    dissolved: number;
    total: number;
  } {
    const counts = organisations.reduce((acc, org) => {
      acc[org.status]++;
      acc.total++;
      return acc;
    }, { active: 0, inactive: 0, dissolved: 0, total: 0 });

    return counts;
  }

  /**
   * Filter active organisations and return both filtered array and counts
   * Single-pass optimization for large datasets
   * @param organisations Array of organisations to process
   * @returns Object containing active organisations and status counts
   */
  static filterActiveWithCounts(organisations: Organisation[]): {
    active: Organisation[];
    counts: {
      active: number;
      inactive: number;
      dissolved: number;
      total: number;
    };
  } {
    const active: Organisation[] = [];
    const counts = { active: 0, inactive: 0, dissolved: 0, total: 0 };

    for (const org of organisations) {
      counts[org.status]++;
      counts.total++;
      if (org.status === 'active') {
        active.push(org);
      }
    }

    return { active, counts };
  }

  /**
   * Get detailed statistics about filtered organisations
   * @param organisations Array of organisations to analyze
   * @returns Detailed statistics about the filtering
   */
  static getFilterStatistics(organisations: Organisation[]): {
    total: number;
    active: number;
    inactive: number;
    dissolved: number;
    percentageActive: number;
    percentageFiltered: number;
  } {
    const counts = this.getFilteredCounts(organisations);

    return {
      total: counts.total,
      active: counts.active,
      inactive: counts.inactive,
      dissolved: counts.dissolved,
      percentageActive: counts.total > 0
        ? Math.round((counts.active / counts.total) * 100 * 100) / 100
        : 0,
      percentageFiltered: counts.total > 0
        ? Math.round(((counts.inactive + counts.dissolved) / counts.total) * 100 * 100) / 100
        : 0
    };
  }
}