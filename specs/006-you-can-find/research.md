# Research: Emergency Services HTML Structure Analysis

**Date**: 2025-01-13  
**Sources Analyzed**: police.uk, NFCC, gov.uk devolution guidance

## Police Forces (police.uk)

### UK Police Forces Page
**URL**: https://www.police.uk/pu/contact-us/uk-police-forces/

**Structure Analysis**:
- Main content in div with class `policeforces` or similar container
- Each force listed as a link element with force name
- Territorial forces grouped by region (England, Wales, Scotland, NI)
- Special forces listed separately (e.g., British Transport Police)

**Expected Selectors**:
```javascript
// Likely patterns based on gov.uk standards
'.police-forces-list a'
'.territorial-forces li'
'[data-force-type="territorial"]'
```

**Data Available**:
- Force name (text content)
- Force URL (href attribute)
- Region/jurisdiction (from parent container)
- Force type (territorial vs special)

### Non-UK Police Forces Page  
**URL**: https://www.police.uk/pu/find-a-police-force/

**Structure Analysis**:
- Crown Dependencies section (Jersey, Guernsey, Isle of Man)
- Overseas Territories section if present
- Similar HTML structure to UK forces page

**Classification Strategy**:
- Crown Dependencies → `CROWN_DEPENDENCY_POLICE`
- Overseas Territories → `OVERSEAS_TERRITORY_POLICE`

## Fire and Rescue Services (NFCC)

### NFCC Contacts Page
**URL**: https://nfcc.org.uk/contacts/fire-and-rescue-services/

**Structure Analysis**:
- Table or list format with service details
- Each entry contains:
  - Service name (e.g., "Greater Manchester Fire and Rescue Service")
  - Region/area covered
  - Contact information (may include website)

**Expected Selectors**:
```javascript
// Common patterns for contact pages
'.fire-services-table tr'
'.contact-list .service-item'
'article.fire-service'
```

**Data Extraction**:
- Service name normalization (handle "Fire and Rescue", "Fire Service", "Fire Authority")
- Region extraction from name or separate field
- Website URL if available

**Variations to Handle**:
- Combined authorities (e.g., "West Yorkshire Fire and Rescue Authority")
- Metropolitan vs county services
- Scottish, Welsh, NI naming conventions

## Devolved Administration (gov.uk)

### Devolution Guidance Page
**URL**: https://www.gov.uk/guidance/devolution-of-powers-to-scotland-wales-and-northern-ireland

**Structure Analysis**:
- Sections for each devolved nation
- Lists of devolved bodies and departments
- May be in prose format requiring text extraction

**Expected Content**:
- Scottish Government departments
- Welsh Government departments  
- Northern Ireland Executive departments
- Devolved public bodies and agencies

**Extraction Strategy**:
```javascript
// Text-based extraction
'h2:contains("Scotland") ~ ul li'
'h2:contains("Wales") ~ ul li'
'h2:contains("Northern Ireland") ~ ul li'
```

**Deduplication Required**:
- Check against existing devolved-administrations.json
- Match on normalized names
- Update existing records rather than duplicate

## Error Handling Strategy

### Fail-Fast Approach
All parsers will implement fail-fast for structure changes:

```typescript
if (!expectedElement) {
  throw new Error(`HTML structure changed at ${url} - expected selector "${selector}" not found`);
}
```

### Validation Rules
1. Minimum expected records:
   - Police forces: >= 40 (45 territorial + specials)
   - Fire services: >= 45 (50+ services in UK)
   - Devolved bodies: >= 10 (supplement existing)

2. Required fields per entity:
   - Name (non-empty string)
   - Type/classification
   - Source attribution

3. Structure change detection:
   - Check for expected container elements
   - Verify minimum record count
   - Validate data format consistency

## Classification Mapping

### Police Forces
```typescript
OrganisationType.EMERGENCY_SERVICE // New type needed
// Sub-classification in additionalProperties:
{
  serviceType: 'police',
  jurisdiction: 'territorial' | 'special' | 'crown_dependency' | 'overseas'
}
```

### Fire Services  
```typescript
OrganisationType.EMERGENCY_SERVICE
// Sub-classification:
{
  serviceType: 'fire',
  coverage: 'county' | 'metropolitan' | 'combined_authority'
}
```

### Devolved Bodies
```typescript
OrganisationType.DEVOLVED_ADMINISTRATION // Existing
// Additional classification:
{
  devolvedNation: 'scotland' | 'wales' | 'northern_ireland',
  bodyType: 'department' | 'agency' | 'public_body'
}
```

## Implementation Notes

### Cheerio Usage
```typescript
import * as cheerio from 'cheerio';

const $ = cheerio.load(html);
const forces = $('.selector').map((i, el) => ({
  name: $(el).text().trim(),
  url: $(el).attr('href')
})).get();
```

### Network Resilience
- Use existing fetcher service with retry logic
- Set appropriate timeout (30s for large pages)
- Add User-Agent header for police.uk (may require browser identity)

### Data Quality
- Trim all text fields
- Normalize whitespace
- Handle special characters (e.g., Welsh names)
- Preserve original names in alternativeNames field

## Decisions

**Decision**: Use cheerio for all HTML parsing  
**Rationale**: jQuery-like API, proven in existing NHS/LA parsers  
**Alternatives considered**: puppeteer (overkill), regex (fragile)

**Decision**: Fail-fast on structure changes  
**Rationale**: Better to know immediately than have bad data  
**Alternatives considered**: Best-effort parsing (risk of incomplete data)

**Decision**: Add EMERGENCY_SERVICE organisation type  
**Rationale**: Clear distinction from other public services  
**Alternatives considered**: Reuse PUBLIC_BODY (too generic)

**Decision**: Separate parsers for each source  
**Rationale**: Independent failure handling, easier testing  
**Alternatives considered**: Single combined parser (coupling risk)

---
*Research complete - ready for contract and model design*