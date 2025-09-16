# Research: Groundwork Trusts and NHS Charities Data Sources

**Date**: 2025-01-16
**Feature**: 010-you-can-discover

## Executive Summary
Research confirms both data sources are accessible with different extraction methods:
- Groundwork Trusts: HTML select dropdown with 15 trusts
- NHS Charities: Storepoint API with JSON data for ~240 charities

## Groundwork Trusts Website Analysis

### Decision: HTML Scraping with Cheerio
**URL**: https://www.groundwork.org.uk/find-groundwork-near-me/

### Findings
- Data is presented in a `<select>` dropdown element with class "gnm_button"
- Contains 15 Groundwork Trusts plus Scotland UK Office
- Static HTML content (not dynamically loaded)
- JavaScript function `selectedRegion()` handles user interaction but data is in HTML

### Data Available
```html
<select class="gnm_button">
  <option>Groundwork Cheshire, Lancashire and Merseyside</option>
  <option>Groundwork Five Counties</option>
  <option>Groundwork East</option>
  <!-- ... 12 more trusts -->
  <option>Scotland UK Office</option>
</select>
```

### Extraction Method
1. Fetch HTML page with axios
2. Parse with cheerio
3. Extract all `<option>` elements from select.gnm_button
4. Each option text is a trust name

### Alternatives Considered
- **API**: None available
- **Sitemap crawling**: Rejected - data is on single page
- **PDF scraping**: Not applicable

## NHS Charities API Discovery

### Decision: Storepoint API with Dynamic Discovery
**Page URL**: https://nhscharitiestogether.co.uk/about-us/nhs-charities-across-the-uk/
**API Pattern**: Storepoint map service

### Findings
1. Page loads Storepoint map widget
2. Map ID embedded in JavaScript: `163c6c5d80adb7`
3. API endpoints discovered:
   - JavaScript loader: `https://cdn.storepoint.co/api/v1/js/163c6c5d80adb7.js`
   - Data endpoint: `https://api.storepoint.co/v1/163c6c5d80adb7/locations?rq`

### API Response Format
The locations endpoint returns JSON with charity data:
```json
{
  "success": true,
  "results": [
    {
      "name": "Charity Name",
      "address": "Full address",
      "city": "City",
      "postcode": "XX1 1XX",
      "country": "England/Wales/Scotland/Northern Ireland",
      "website": "https://...",
      "lat": 51.5074,
      "lng": -0.1278
    }
  ]
}
```

### Extraction Method
1. Fetch NHS Charities webpage
2. Extract map ID from JavaScript (regex: `/mapId\s*=\s*"([^"]+)"/ `)
3. Construct API URL: `https://api.storepoint.co/v1/{mapId}/locations?rq`
4. Fetch JSON data
5. Filter for England and Wales charities only

### Alternatives Considered
- **Direct HTML scraping**: Rejected - data loaded via JavaScript
- **Static API URL**: Risky - map ID might change
- **Selenium/Puppeteer**: Overkill - API is accessible directly

## Data Characteristics

### Groundwork Trusts
- **Count**: 15 trusts + 1 Scotland office
- **Fields**: Name only (from dropdown)
- **Classification**: Central Government (S.1311)
- **Sponsor**: Department for Communities and Local Government

### NHS Charities
- **Count**: ~240 charities total
- **Fields**: name, address, city, postcode, country, website, coordinates
- **Filter**: England and Wales only (exclude Scotland, NI)
- **Classification**: Central Government (S.1311)
- **Sponsor**: Department of Health

## Error Handling Strategy

### Website Structure Changes
- **Groundwork**: If select.gnm_button not found → fail after retry
- **NHS**: If map ID extraction fails → fail after retry
- **Both**: Log detailed errors for debugging

### Network Issues
- Retry with exponential backoff (1s, 2s, 4s)
- Maximum 3 retries
- Fail fast after retries exhausted

### Data Validation
- **Minimum viable**: Organisation name required
- **Optional fields**: All other data is best-effort
- **Empty results**: Fail (indicates structure change)

## Performance Considerations
- Both sources are lightweight (HTML page + JSON API)
- Expected total time: <10 seconds for both sources
- Can be parallelized (independent sources)
- No rate limiting observed

## Recommendations
1. Implement both parsers as separate services
2. Use existing axios/cheerio patterns from codebase
3. Follow TDD approach with contract tests first
4. Include retry logic with clear error messages
5. Log extraction progress for debugging