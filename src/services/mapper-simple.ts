/**
 * Simplified Mapper Service for actual data structure
 */

import type { Organisation } from '../models/organisation.js';
import { OrganisationType, DataSourceType } from '../models/organisation.js';
import type { GovUKOrganisation, ONSInstitutionalUnit } from '../models/sources.js';

/**
 * Raw ONS data can come in different formats after processing
 */
interface ProcessedONSData extends Partial<ONSInstitutionalUnit> {
  _source_sheet?: string;
  Organisation?: string;
  Name?: string;
  name?: string;
  [key: string]: unknown;
}

export class SimpleMapperService {
  /**
   * Map GOV.UK organisation to standard format
   */
  mapGovUkOrganisation(source: GovUKOrganisation): { success: boolean; data?: Organisation } {
    try {
      const org: Organisation = {
        id: source.slug || source.content_id || `govuk-${Date.now()}`,
        name: source.title || 'Unknown',
        type: this.mapGovUkType(source.format || source.details?.type || source.document_type),
        classification: source.format || source.details?.type || source.document_type || 'Unknown',
        status: source.withdrawn ? 'dissolved' : 'active',
        sources: [{
          source: DataSourceType.GOV_UK_API,
          sourceId: source.content_id,
          retrievedAt: new Date().toISOString(),
          confidence: 1.0
        }],
        lastUpdated: source.updated_at || new Date().toISOString(),
        dataQuality: {
          completeness: 0.8,
          hasConflicts: false,
          requiresReview: false
        },
        additionalProperties: {
          base_path: source.base_path,
          details: source.details,
          description: source.description
        }
      };
      
      return { success: true, data: org };
    } catch (error) {
      console.error('Error mapping GOV.UK org:', error);
      return { success: false };
    }
  }

  /**
   * Map ONS organisation to standard format
   */
  mapOnsOrganisation(source: ProcessedONSData): { success: boolean; data?: Organisation } {
    try {
      // Extract name - now in 'Organisation' field
      const name = source['Organisation'] || 
                   source['Organisation name'] || 
                   source['Name'] || 
                   source.name ||
                   'Unknown';
      
      const org: Organisation = {
        id: source['ONS code'] || `ons-${Date.now()}-${Math.random()}`,
        name: name,
        type: this.mapOnsType(source._source_sheet || source.Classification || 'Unknown'),
        classification: source.Classification || source._source_sheet || 'Unknown',
        status: 'active',
        parentOrganisation: source['Parent organisation'],
        establishmentDate: source['Start date'],
        dissolutionDate: source['End date'],
        sources: [{
          source: DataSourceType.ONS_INSTITUTIONAL,
          sourceId: source['ONS code'],
          retrievedAt: new Date().toISOString(),
          confidence: 0.9
        }],
        lastUpdated: new Date().toISOString(),
        dataQuality: {
          completeness: 0.7,
          hasConflicts: false,
          requiresReview: false
        },
        additionalProperties: source
      };
      
      return { success: true, data: org };
    } catch (error) {
      console.error('Error mapping ONS org:', error);
      return { success: false };
    }
  }

  private mapGovUkType(format: string | undefined): OrganisationType {
    const lower = (format || '').toLowerCase();
    if (lower.includes('ministerial')) return OrganisationType.MINISTERIAL_DEPARTMENT;
    if (lower.includes('executive')) return OrganisationType.EXECUTIVE_AGENCY;
    if (lower.includes('ndpb')) return OrganisationType.EXECUTIVE_NDPB;
    if (lower.includes('corporation')) return OrganisationType.PUBLIC_CORPORATION;
    return OrganisationType.OTHER;
  }

  private mapOnsType(sheet: string | undefined): OrganisationType {
    const lower = (sheet || '').toLowerCase();
    if (lower.includes('central')) return OrganisationType.MINISTERIAL_DEPARTMENT;
    if (lower.includes('local')) return OrganisationType.OTHER;
    if (lower.includes('corporation')) return OrganisationType.PUBLIC_CORPORATION;
    return OrganisationType.OTHER;
  }
}

export const createSimpleMapper = () => new SimpleMapperService();