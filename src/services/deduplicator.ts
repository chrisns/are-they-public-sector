/**
 * Deduplication Service
 * Identifies and merges duplicate organisations across sources
 */

import { DataSourceType, qualityThresholds } from '../models/organisation.js';
import type {
  Organisation,
  DataSourceReference,
  DataQuality
} from '../models/organisation.js';
import type {
  DeduplicationResult,
  DataConflict
} from '../models/processing.js';
import { randomUUID } from 'crypto';
import { mappingConfig } from '../config/mapping-rules.js';

/**
 * Configuration for the deduplicator service
 */
export interface DeduplicatorConfig {
  similarityThreshold?: number;
  exactMatchFields?: string[];
  fuzzyMatchFields?: string[];
  conflictResolutionStrategy?: 'newest' | 'highest_confidence' | 'most_complete' | 'manual';
  trackProvenance?: boolean;
}

/**
 * Match result between two organisations
 */
interface MatchResult {
  organisation1: Organisation;
  organisation2: Organisation;
  similarityScore: number;
  matchedFields: string[];
  conflictingFields?: string[];
  isExactMatch: boolean;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<DeduplicatorConfig> = {
  similarityThreshold: mappingConfig.deduplicationConfig.similarityThreshold,
  exactMatchFields: mappingConfig.deduplicationConfig.exactMatchFields,
  fuzzyMatchFields: mappingConfig.deduplicationConfig.fuzzyMatchFields,
  conflictResolutionStrategy: mappingConfig.deduplicationConfig.conflictResolutionStrategy,
  trackProvenance: mappingConfig.deduplicationConfig.trackProvenance
};

/**
 * Deduplication Service
 * Provides methods to identify and merge duplicate organisations
 */
export class DeduplicatorService {
  private config: Required<DeduplicatorConfig>;
  private similarityCache: Map<string, number>;
  private processedComparisons: Set<string>;

  constructor(config: DeduplicatorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.similarityCache = new Map();
    this.processedComparisons = new Set();
  }

  /**
   * Deduplicate a list of organisations
   * @param organisations List of organisations to deduplicate
   * @returns DeduplicationResult with merged organisations and conflicts
   */
  deduplicate(organisations: Organisation[]): DeduplicationResult & { 
    organisations: Organisation[];
    conflicts?: DataConflict[];
  } {
    const originalCount = organisations.length;
    const mergedRecords: Array<{
      mergedIds: string[];
      resultingId: string;
      confidence: number;
    }> = [];
    const conflicts: DataConflict[] = [];

    // Create a map to track processed organisations
    const processedMap = new Map<string, Organisation>();
    const processedIds = new Set<string>();

    console.log(`[Deduplicator] Starting deduplication of ${originalCount} organisations...`);
    
    // Find all matches
    const matches = this.findAllMatches(organisations);
    
    console.log(`[Deduplicator] Found ${matches.length} potential matches`);

    // Group matches into clusters
    const clusters = this.clusterMatches(matches, organisations);

    // Process each cluster
    for (const cluster of clusters) {
      if (cluster.length === 1) {
        // No duplicates, add as-is
        const org = cluster[0];
        if (org) {
          processedMap.set(org.id, org);
        }
      } else {
        // Merge duplicates
        const mergeResult = this.mergeOrganisations(cluster);
        processedMap.set(mergeResult.merged.id, mergeResult.merged);
        
        // Track merged records
        mergedRecords.push({
          mergedIds: cluster.map(org => org.id),
          resultingId: mergeResult.merged.id,
          confidence: mergeResult.confidence
        });

        // Track conflicts
        if (mergeResult.conflicts.length > 0) {
          conflicts.push(...mergeResult.conflicts);
        }

        // Mark all source IDs as processed
        cluster.forEach(org => processedIds.add(org.id));
      }
    }

    // Add any unmatched organisations
    for (const org of organisations) {
      if (!processedIds.has(org.id) && !processedMap.has(org.id)) {
        processedMap.set(org.id, org);
      }
    }

    const deduplicatedOrganisations = Array.from(processedMap.values());

    return {
      originalCount,
      deduplicatedCount: deduplicatedOrganisations.length,
      mergedRecords,
      organisations: deduplicatedOrganisations,
      ...(conflicts.length > 0 && { conflicts })
    };
  }

  /**
   * Find all matches between organisations
   * @param organisations List of organisations
   * @returns Array of match results
   */
  private findAllMatches(organisations: Organisation[]): MatchResult[] {
    const matches: MatchResult[] = [];
    
    // Group organizations by type to reduce comparisons
    const orgsByType = new Map<string, Organisation[]>();
    for (const org of organisations) {
      const key = `${org.type}-${org.classification || 'unknown'}`;
      if (!orgsByType.has(key)) {
        orgsByType.set(key, []);
      }
      orgsByType.get(key)?.push(org);
    }
    
    console.log(`[Deduplicator] Grouped into ${orgsByType.size} type groups`);
    let comparisonCount = 0;
    let skippedCount = 0;
    
    // Compare within each type group
    for (const [typeKey, orgs] of orgsByType) {
      console.log(`[Deduplicator] Comparing ${orgs.length} organisations in group ${typeKey}`);
      
      // Skip very large groups or limit comparisons
      const maxGroupSize = 100; // Limit group size for performance
      const orgsToCompare = orgs.length > maxGroupSize ? orgs.slice(0, maxGroupSize) : orgs;
      
      if (orgs.length > maxGroupSize) {
        console.log(`[Deduplicator] WARNING: Group ${typeKey} has ${orgs.length} orgs, limiting to first ${maxGroupSize} for performance`);
      }
      
      for (let i = 0; i < orgsToCompare.length; i++) {
        const org1 = orgsToCompare[i];
        if (!org1) continue;
        
        // Limit comparisons per organization
        let comparisonsForOrg = 0;
        const maxComparisonsPerOrg = 50; // Limit comparisons per org
        
        for (let j = i + 1; j < orgsToCompare.length && comparisonsForOrg < maxComparisonsPerOrg; j++) {
          const org2 = orgsToCompare[j];
          if (!org2) continue;
          
          // Skip if we've already compared these
          const comparisonKey = org1.id < org2.id ? `${org1.id}|${org2.id}` : `${org2.id}|${org1.id}`;
          if (this.processedComparisons.has(comparisonKey)) {
            skippedCount++;
            continue;
          }
          this.processedComparisons.add(comparisonKey);
          
          comparisonCount++;
          comparisonsForOrg++;
          
          if (comparisonCount % 1000 === 0) {
            console.log(`[Deduplicator] Progress: ${comparisonCount} comparisons, ${matches.length} matches found`);
          }
          
          const matchResult = this.compareOrganisations(org1, org2);

          if (matchResult.similarityScore >= this.config.similarityThreshold) {
            matches.push(matchResult);
          }
        }
      }
    }
    
    console.log(`[Deduplicator] Completed ${comparisonCount} comparisons (${skippedCount} skipped), found ${matches.length} matches`);
    return matches;
  }

  /**
   * Compare two organisations for similarity
   * @param org1 First organisation
   * @param org2 Second organisation
   * @returns MatchResult with similarity score
   */
  private compareOrganisations(org1: Organisation, org2: Organisation): MatchResult {
    const matchedFields: string[] = [];
    const conflictingFields: string[] = [];
    let totalScore = 0;
    let maxScore = 0;

    // Early exit: If sources are different and types are very different, skip
    if (org1.type !== org2.type && org1.classification !== org2.classification) {
      return {
        organisation1: org1,
        organisation2: org2,
        similarityScore: 0,
        matchedFields: [],
        isExactMatch: false
      };
    }
    
    // Quick name check first (most common match criteria)
    if (org1.name && org2.name) {
      const nameSimilarity = this.calculateStringSimilarity(org1.name, org2.name);
      // If names are very different, skip the rest
      if (nameSimilarity < 0.3) {
        return {
          organisation1: org1,
          organisation2: org2,
          similarityScore: nameSimilarity,
          matchedFields: [],
          isExactMatch: false
        };
      }
    }

    // Check exact match fields
    for (const field of this.config.exactMatchFields) {
      maxScore += 1;
      const value1 = (org1 as unknown as Record<string, unknown>)[field];
      const value2 = (org2 as unknown as Record<string, unknown>)[field];

      if (value1 && value2 && value1 === value2) {
        totalScore += 1;
        matchedFields.push(field);
      }
    }

    // Check fuzzy match fields
    for (const field of this.config.fuzzyMatchFields) {
      maxScore += 1;
      const value1 = (org1 as unknown as Record<string, unknown>)[field];
      const value2 = (org2 as unknown as Record<string, unknown>)[field];

      if (value1 && value2) {
        const similarity = this.calculateStringSimilarity(value1 as string | string[], value2 as string | string[]);
        if (similarity >= 0.8) {
          totalScore += similarity;
          matchedFields.push(field);
        } else if (similarity > 0.3) {
          conflictingFields.push(field);
        }
      }
    }

    // Check for alternative names
    if (org1.alternativeNames && org2.name) {
      for (const altName of org1.alternativeNames) {
        if (this.calculateStringSimilarity(altName, org2.name) >= 0.8) {
          totalScore += 0.5;
          matchedFields.push('alternativeNames');
          break;
        }
      }
    }
    if (org2.alternativeNames && org1.name) {
      for (const altName of org2.alternativeNames) {
        if (this.calculateStringSimilarity(altName, org1.name) >= 0.8) {
          totalScore += 0.5;
          matchedFields.push('alternativeNames');
          break;
        }
      }
    }

    // Check parent organisation
    if (org1.parentOrganisation && org2.parentOrganisation) {
      maxScore += 0.5;
      if (org1.parentOrganisation === org2.parentOrganisation) {
        totalScore += 0.5;
        matchedFields.push('parentOrganisation');
      } else {
        conflictingFields.push('parentOrganisation');
      }
    }

    // Check classification
    if (org1.classification && org2.classification) {
      maxScore += 0.3;
      if (org1.classification === org2.classification) {
        totalScore += 0.3;
        matchedFields.push('classification');
      }
    }

    const similarityScore = maxScore > 0 ? totalScore / maxScore : 0;
    const isExactMatch = matchedFields.includes('id') || 
                        (matchedFields.includes('name') && similarityScore >= 0.95);

    return {
      organisation1: org1,
      organisation2: org2,
      similarityScore,
      matchedFields,
      conflictingFields,
      isExactMatch
    };
  }

  /**
   * Calculate string similarity using Levenshtein distance
   * @param str1 First string
   * @param str2 Second string
   * @returns Similarity score between 0 and 1
   */
  private calculateStringSimilarity(str1: string | string[], str2: string | string[]): number {
    // Handle arrays (like alternativeNames)
    if (Array.isArray(str1) && Array.isArray(str2)) {
      let maxSimilarity = 0;
      for (const s1 of str1) {
        for (const s2 of str2) {
          maxSimilarity = Math.max(maxSimilarity, this.calculateStringSimilarity(s1, s2));
        }
      }
      return maxSimilarity;
    }

    if (Array.isArray(str1)) {
      let maxSimilarity = 0;
      for (const s1 of str1) {
        maxSimilarity = Math.max(maxSimilarity, this.calculateStringSimilarity(s1, str2 as string));
      }
      return maxSimilarity;
    }

    if (Array.isArray(str2)) {
      return this.calculateStringSimilarity(str2, str1);
    }

    // Normalize strings
    const s1 = this.normalizeString(str1);
    const s2 = this.normalizeString(str2);

    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;
    
    // Check cache
    const cacheKey = s1 < s2 ? `${s1}|${s2}` : `${s2}|${s1}`;
    const cached = this.similarityCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
    
    // Early exit for very different lengths
    const lengthDiff = Math.abs(s1.length - s2.length);
    const maxLength = Math.max(s1.length, s2.length);
    if (lengthDiff / maxLength > 0.5) {
      this.similarityCache.set(cacheKey, 0);
      return 0;
    }

    // Calculate Levenshtein distance
    const matrix: number[][] = [];

    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= s1.length; j++) {
      const row = matrix[0];
      if (row) row[j] = j;
    }

    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        const currentRow = matrix[i];
        const prevRow = matrix[i - 1];
        if (!currentRow || !prevRow) continue;
        
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          currentRow[j] = prevRow[j - 1] ?? 0;
        } else {
          currentRow[j] = Math.min(
            (prevRow[j - 1] ?? 0) + 1, // substitution
            (currentRow[j - 1] ?? 0) + 1,     // insertion
            (prevRow[j] ?? 0) + 1      // deletion
          );
        }
      }
    }

    const lastRow = matrix[s2.length];
    const distance = lastRow?.[s1.length] ?? 0;
    const similarity = maxLength > 0 ? 1 - (distance / maxLength) : 1;
    
    // Cache the result
    this.similarityCache.set(cacheKey, similarity);
    
    return similarity;
  }

  /**
   * Normalize string for comparison
   * @param str Input string
   * @returns Normalized string
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  /**
   * Cluster matches into groups of related organisations
   * @param matches Array of match results
   * @param organisations Original organisations
   * @returns Array of organisation clusters
   */
  private clusterMatches(matches: MatchResult[], organisations: Organisation[]): Organisation[][] {
    const clusters: Map<string, Set<string>> = new Map();
    const orgMap = new Map(organisations.map(org => [org.id, org]));

    // Initialize clusters with each organisation in its own cluster
    for (const org of organisations) {
      clusters.set(org.id, new Set([org.id]));
    }

    // Merge clusters based on matches
    for (const match of matches) {
      const id1 = match.organisation1.id;
      const id2 = match.organisation2.id;

      const cluster1 = clusters.get(id1);
      const cluster2 = clusters.get(id2);

      if (cluster1 && cluster2 && cluster1 !== cluster2) {
        // Merge cluster2 into cluster1
        for (const id of cluster2) {
          cluster1.add(id);
          clusters.set(id, cluster1);
        }
      }
    }

    // Convert clusters to arrays of organisations
    const uniqueClusters = new Set(clusters.values());
    const result: Organisation[][] = [];

    for (const cluster of uniqueClusters) {
      const orgs = Array.from(cluster)
        .map(id => orgMap.get(id)!)
        .filter((org): org is Organisation => org !== undefined);
      
      if (orgs.length > 0) {
        result.push(orgs);
      }
    }

    return result;
  }

  /**
   * Merge multiple organisations into one
   * @param organisations Organisations to merge
   * @returns Merged organisation with conflicts
   */
  private mergeOrganisations(organisations: Organisation[]): {
    merged: Organisation;
    confidence: number;
    conflicts: DataConflict[];
  } {
    if (organisations.length === 0) {
      throw new Error('Cannot merge empty organisation list');
    }

    if (organisations.length === 1) {
      const org = organisations[0];
      if (!org) {
        throw new Error('Invalid organisation array');
      }
      return {
        merged: org,
        confidence: 1,
        conflicts: []
      };
    }

    // Select base organisation based on strategy
    const base = this.selectBaseOrganisation(organisations);
    const conflicts: DataConflict[] = [];

    // Create merged organisation
    const merged: Organisation = { ...base };
    merged.id = this.config.trackProvenance ? randomUUID() : base.id;

    // Merge sources
    const allSources: DataSourceReference[] = [];
    for (const org of organisations) {
      allSources.push(...org.sources);
    }
    merged.sources = this.deduplicateSources(allSources);

    // Merge fields and detect conflicts
    const fieldsToMerge: (keyof Organisation)[] = [
      'name', 'alternativeNames', 'type', 'classification',
      'parentOrganisation', 'controllingUnit', 'status',
      'establishmentDate', 'dissolutionDate', 'location'
    ];

    for (const field of fieldsToMerge) {
      const values = organisations
        .map(org => ({ org, value: org[field] }))
        .filter(item => item.value !== undefined && item.value !== null);

      if (values.length > 1) {
        const uniqueValues = this.getUniqueValues(values.map(v => v.value));
        
        if (uniqueValues.length > 1) {
          // Conflict detected
          const conflict: DataConflict = {
            id: randomUUID(),
            organisationId: merged.id,
            field: field as string,
            values: values.map(v => ({
              source: v.org.sources[0]?.source || DataSourceType.GOV_UK_API,
              value: v.value,
              retrievedAt: v.org.sources[0]?.retrievedAt || new Date().toISOString()
            }))
          };
          conflicts.push(conflict);

          // Resolve conflict based on strategy
          const resolvedValue = this.resolveConflict(values, field);
          if (resolvedValue !== undefined) {
            (merged as unknown as Record<string, unknown>)[field as string] = resolvedValue;
          }
        }
      }
    }

    // Merge alternative names
    const allAltNames: string[] = [];
    for (const org of organisations) {
      if (org.alternativeNames) {
        allAltNames.push(...org.alternativeNames);
      }
      // Add original names as alternative names if different
      if (org.name !== merged.name) {
        allAltNames.push(org.name);
      }
    }
    merged.alternativeNames = [...new Set(allAltNames)];

    // Merge additional properties
    const allAdditionalProps: Record<string, unknown> = {};
    for (const org of organisations) {
      if (org.additionalProperties) {
        Object.assign(allAdditionalProps, org.additionalProperties);
      }
    }
    if (Object.keys(allAdditionalProps).length > 0) {
      merged.additionalProperties = allAdditionalProps;
    }

    // Update data quality
    merged.dataQuality = this.updateDataQuality(merged, conflicts.length > 0);

    // Update last updated timestamp
    merged.lastUpdated = new Date().toISOString();

    // Calculate confidence
    const confidence = this.calculateMergeConfidence(organisations, conflicts);

    return {
      merged,
      confidence,
      conflicts
    };
  }

  /**
   * Select base organisation for merging based on strategy
   * @param organisations Organisations to choose from
   * @returns Selected base organisation
   */
  private selectBaseOrganisation(organisations: Organisation[]): Organisation {
    switch (this.config.conflictResolutionStrategy) {
      case 'newest':
        return organisations.reduce((newest, org) =>
          new Date(org.lastUpdated) > new Date(newest.lastUpdated) ? org : newest
        );

      case 'highest_confidence':
        return organisations.reduce((best, org) => {
          const bestConfidence = Math.max(...best.sources.map(s => s.confidence));
          const orgConfidence = Math.max(...org.sources.map(s => s.confidence));
          return orgConfidence > bestConfidence ? org : best;
        });

      case 'most_complete':
        return organisations.reduce((best, org) =>
          org.dataQuality.completeness > best.dataQuality.completeness ? org : best
        );

      case 'manual':
      default: {
        // Default to first organisation for manual resolution
        const firstOrg = organisations[0];
        if (!firstOrg) {
          throw new Error('No organisations to select from');
        }
        return firstOrg;
      }
    }
  }

  /**
   * Resolve conflict between values based on strategy
   * @param values Values with their organisations
   * @param field Field name
   * @returns Resolved value
   */
  private resolveConflict(
    values: Array<{ org: Organisation; value: unknown }>,
    field: keyof Organisation
  ): unknown {
    // Field parameter is available for future use in field-specific resolution logic
    void field;
    switch (this.config.conflictResolutionStrategy) {
      case 'newest': {
        const newest = values.reduce((latest, item) =>
          new Date(item.org.lastUpdated) > new Date(latest.org.lastUpdated) ? item : latest
        );
        return newest.value;
      }

      case 'highest_confidence': {
        const highestConfidence = values.reduce((best, item) => {
          const itemConfidence = Math.max(...item.org.sources.map(s => s.confidence));
          const bestConfidence = Math.max(...best.org.sources.map(s => s.confidence));
          return itemConfidence > bestConfidence ? item : best;
        });
        return highestConfidence.value;
      }

      case 'most_complete': {
        // For string fields, prefer longer values
        const firstValue = values[0];
        if (firstValue && typeof firstValue.value === 'string') {
          const longest = values.reduce((longest, item) =>
            (typeof item.value === 'string' && item.value.length > (longest.value as string).length) ? item : longest
          );
          return longest.value;
        }
        // For other fields, use first non-null value
        return firstValue?.value;
      }

      case 'manual':
      default: {
        // Default to first value for manual resolution
        const defaultValue = values[0];
        return defaultValue?.value;
      }
    }
  }

  /**
   * Get unique values from array
   * @param values Array of values
   * @returns Array of unique values
   */
  private getUniqueValues(values: unknown[]): unknown[] {
    const seen = new Set<string>();
    const unique: unknown[] = [];

    for (const value of values) {
      const key = JSON.stringify(value);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(value);
      }
    }

    return unique;
  }

  /**
   * Deduplicate source references
   * @param sources Array of source references
   * @returns Deduplicated sources
   */
  private deduplicateSources(sources: DataSourceReference[]): DataSourceReference[] {
    const sourceMap = new Map<string, DataSourceReference>();
    
    for (const source of sources) {
      const key = `${source.source}-${source.sourceId || 'unknown'}`;
      
      if (!sourceMap.has(key)) {
        sourceMap.set(key, source);
      } else {
        // Keep the one with higher confidence
        const existing = sourceMap.get(key)!;
        if (source.confidence > existing.confidence) {
          sourceMap.set(key, source);
        }
      }
    }
    
    return Array.from(sourceMap.values());
  }

  /**
   * Update data quality after merging
   * @param org Merged organisation
   * @param hasConflicts Whether conflicts were detected
   * @returns Updated data quality
   */
  private updateDataQuality(org: Organisation, hasConflicts: boolean): DataQuality {
    const fields = [
      'name', 'type', 'classification', 'status',
      'parentOrganisation', 'controllingUnit',
      'establishmentDate', 'dissolutionDate',
      'location', 'alternativeNames'
    ];

    const populatedFields = fields.filter(field => {
      const value = (org as Record<string, unknown>)[field];
      return value !== undefined && value !== null &&
             (Array.isArray(value) ? value.length > 0 : value !== '');
    });

    const completeness = populatedFields.length / fields.length;
    const requiresReview = hasConflicts || completeness < qualityThresholds.minCompleteness;
    const reviewReasons = [];

    if (hasConflicts) {
      reviewReasons.push('Data conflicts detected during merge');
    }
    if (completeness < qualityThresholds.minCompleteness) {
      reviewReasons.push('Low data completeness after merge');
    }

    return {
      completeness,
      hasConflicts,
      ...(hasConflicts && { conflictFields: ['multiple'] }),
      requiresReview,
      ...(reviewReasons.length > 0 && { reviewReasons })
    };
  }

  /**
   * Calculate confidence score for merged organisation
   * @param organisations Source organisations
   * @param conflicts Detected conflicts
   * @returns Confidence score between 0 and 1
   */
  private calculateMergeConfidence(
    organisations: Organisation[],
    conflicts: DataConflict[]
  ): number {
    // Start with average confidence from sources
    const sourceConfidences = organisations.flatMap((org: Organisation) =>
      org.sources.map((s: DataSourceReference) => s.confidence)
    );
    const avgConfidence = sourceConfidences.reduce((sum, c) => sum + c, 0) / sourceConfidences.length;

    // Reduce confidence based on conflicts
    const conflictPenalty = Math.min(conflicts.length * 0.1, 0.3);

    // Boost confidence if multiple sources agree
    const sourceBoost = organisations.length > 2 ? 0.1 : 0;

    return Math.max(0, Math.min(1, avgConfidence - conflictPenalty + sourceBoost));
  }
}

/**
 * Create a default deduplicator instance
 */
export const createDeduplicator = (config?: DeduplicatorConfig): DeduplicatorService => {
  return new DeduplicatorService(config);
};