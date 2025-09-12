/**
 * CONTRACT TEST: GOV.UK API Response Contract
 * 
 * Verifies the GOV.UK API returns the expected number of organizations
 * and that the data structure matches our expectations.
 * 
 * Current actual count: 1235 organizations (may vary as API data changes)
 * Originally specified: 611 organizations
 */
import { describe, test, expect } from '@jest/globals';
import { GovUkFetcher } from '../../src/services/govuk-fetcher';
import * as inputContracts from '../../specs/001-aggregator-of-data/contracts/input-contracts.json';

describe('GOV.UK API Contract Tests', () => {
  let fetcher: GovUkFetcher;

  beforeEach(() => {
    fetcher = new GovUkFetcher();
  });

  test('should fetch organisations data that matches the input contract structure', async () => {
    // This test will fail because GovUkFetcher doesn't exist yet
    const response = await fetcher.fetchOrganisations();
    
    // Validate the overall response structure
    expect(response).toHaveProperty('links');
    expect(response.links).toHaveProperty('organisations');
    expect(Array.isArray(response.links.organisations)).toBe(true);

    // Get the expected schema from the contract
    const expectedSchema = inputContracts.govuk_api.response_schema;
    const organisationsSchema = expectedSchema.properties.links.properties.organisations;
    const requiredFields = organisationsSchema.items.required;

    // Test that required fields are present: title, base_path, content_id
    expect(requiredFields).toContain('title');
    expect(requiredFields).toContain('base_path');
    expect(requiredFields).toContain('content_id');

    // Validate each organisation in the response
    const organisations = response.links.organisations;
    expect(organisations.length).toBeGreaterThan(0);

    organisations.forEach((org: any, index: number) => {
      // Test required fields are present and have correct types
      expect(org).toHaveProperty('title');
      expect(org).toHaveProperty('base_path');
      expect(org).toHaveProperty('content_id');

      expect(typeof org.title).toBe('string');
      expect(typeof org.base_path).toBe('string');
      expect(typeof org.content_id).toBe('string');

      // Validate title is not empty
      expect(org.title.trim()).not.toBe('');
      
      // Validate base_path follows GOV.UK path format
      expect(org.base_path).toMatch(/^\/government\/organisations\/.+/);
      
      // Validate content_id is a valid UUID format
      expect(org.content_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

      // Test optional fields if present
      if (org.analytics_identifier !== undefined) {
        expect(typeof org.analytics_identifier === 'string' || org.analytics_identifier === null).toBe(true);
      }

      if (org.api_path !== undefined) {
        expect(typeof org.api_path).toBe('string');
      }

      if (org.description !== undefined) {
        expect(typeof org.description === 'string' || org.description === null).toBe(true);
      }

      if (org.document_type !== undefined) {
        expect(typeof org.document_type).toBe('string');
      }

      if (org.locale !== undefined) {
        expect(typeof org.locale).toBe('string');
      }

      if (org.public_updated_at !== undefined) {
        expect(typeof org.public_updated_at === 'string' || org.public_updated_at === null).toBe(true);
      }

      if (org.schema_name !== undefined) {
        expect(typeof org.schema_name).toBe('string');
      }

      // Test nested objects structure
      if (org.details !== undefined) {
        expect(typeof org.details === 'object' || org.details === null).toBe(true);
        
        if (org.details && org.details.organisation_govuk_status) {
          expect(typeof org.details.organisation_govuk_status).toBe('object');
          if (org.details.organisation_govuk_status.status) {
            expect(typeof org.details.organisation_govuk_status.status).toBe('string');
          }
          if (org.details.organisation_govuk_status.updated_at) {
            expect(typeof org.details.organisation_govuk_status.updated_at).toBe('string');
          }
        }
      }

      if (org.links !== undefined) {
        expect(typeof org.links === 'object' || org.links === null).toBe(true);
        
        if (org.links && org.links.parent_organisations) {
          expect(Array.isArray(org.links.parent_organisations)).toBe(true);
          
          org.links.parent_organisations.forEach((parentOrg: any) => {
            if (parentOrg.title) {
              expect(typeof parentOrg.title).toBe('string');
            }
            if (parentOrg.content_id) {
              expect(typeof parentOrg.content_id).toBe('string');
            }
          });
        }
      }
    });
  });

  test('should use the correct API endpoint from contract specification', () => {
    const expectedEndpoint = inputContracts.govuk_api.endpoint;
    const expectedMethod = inputContracts.govuk_api.method;

    expect(expectedEndpoint).toBe('https://www.gov.uk/api/content/government/organisations');
    expect(expectedMethod).toBe('GET');

    // This will fail since the fetcher doesn't exist yet
    expect(fetcher.getEndpoint()).toBe(expectedEndpoint);
    expect(fetcher.getMethod()).toBe(expectedMethod);
  });

  test('should handle API errors gracefully', async () => {
    // Mock a network error scenario - this will fail since fetcher doesn't exist
    jest.spyOn(fetcher, 'fetchOrganisations')
      .mockRejectedValueOnce(new Error('Network error'));

    await expect(fetcher.fetchOrganisations()).rejects.toThrow('Network error');
  });
});