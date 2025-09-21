// Source ID to human-readable website name mapping
// Based on the data sources documented in docs/data-sources.md

const SourceLabels = {
    // Core Government Sources
    'govuk': 'GOV.UK',
    'gov-uk': 'GOV.UK',
    'ons': 'ONS Classification Guide',

    // Education Sector
    'gias': 'Get Information About Schools',
    'schools': 'Get Information About Schools',
    'ni-schools': 'OpenDataNI Schools',
    'northern-ireland-schools': 'OpenDataNI Schools',
    'colleges': 'Association of Colleges',
    'colleges-uk': 'Association of Colleges',

    // Healthcare Sector
    'nhs-provider-directory': 'NHS England Provider Directory',
    'nhs': 'NHS England Provider Directory',
    'icbs': 'NHS Integrated Care Boards',
    'integrated-care': 'NHS Integrated Care Boards',
    'nhs-scotland': 'NHS Scotland',
    'scottish-health': 'NHS Scotland',
    'ni-health': 'NI Health & Social Care',
    'ni-trusts': 'NI Health & Social Care',
    'healthwatch': 'Healthwatch England',
    'local-healthwatch': 'Healthwatch England',
    'nhs-charities': 'NHS Charities Together',
    'nhs-charity': 'NHS Charities Together',

    // Local Government
    'defra-uk-air': 'DEFRA UK-AIR',
    'defra': 'DEFRA UK-AIR',
    'la': 'DEFRA UK-AIR',
    'english-unitary': 'ONS Unitary Authorities',
    'ons-unitary': 'ONS Unitary Authorities',
    'districts': 'ONS Districts of England',
    'english-districts': 'ONS Districts of England',
    'welsh-unitary': 'ONS Welsh Authorities',
    'welsh-authorities': 'ONS Welsh Authorities',
    'welsh-councils': 'Welsh Community Councils',
    'welsh-community': 'Welsh Community Councils',
    'scottish-councils': 'Scottish Community Councils',
    'scottish-community': 'Scottish Community Councils',
    'national-parks': 'National Parks UK',
    'parks': 'National Parks UK',

    // Emergency Services
    'police': 'Police.uk',
    'police-uk': 'Police.uk',
    'fire': 'National Fire Chiefs Council',
    'nfcc': 'National Fire Chiefs Council',

    // Justice System
    'courts': 'GOV.UK Courts & Tribunals',
    'uk-courts': 'GOV.UK Courts & Tribunals',

    // Devolved Administrations
    'devolved': 'Devolved Administrations',
    'manual': 'Devolved Administrations',
    'scottish-gov': 'mygov.scot',
    'mygov-scot': 'mygov.scot',
    'devolved-extra': 'GOV.UK Devolved Bodies',
    'devolved-additional': 'GOV.UK Devolved Bodies',
    'ni-depts': 'NI Direct',
    'ni-departments': 'NI Direct',

    // Transport
    'scottish-rtps': 'Transport Scotland',
    'rtps': 'Transport Scotland',
    'ni-ports': 'Infrastructure NI Ports',
    'trust-ports': 'Infrastructure NI Ports',

    // Research & Development
    'research-councils': 'UK Research & Innovation',
    'ukri': 'UK Research & Innovation',

    // Other Public Bodies
    'groundwork': 'Groundwork UK',
    'groundwork-trusts': 'Groundwork UK',

    // Default fallback - return the ID if not found
    getLabel(sourceId) {
        return this[sourceId] || sourceId;
    },

    // Get shortened label for charts (max 20 chars)
    getShortLabel(sourceId) {
        const label = this.getLabel(sourceId);
        if (label.length > 20) {
            return label.substring(0, 17) + '...';
        }
        return label;
    }
};

// Make available globally
window.SourceLabels = SourceLabels;

// Export for use in modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SourceLabels;
}