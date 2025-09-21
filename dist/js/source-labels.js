// Source ID to human-readable website name mapping
// Based on the data sources documented in docs/data-sources.md
// Refactored to eliminate duplication and include all orchestrator source IDs

const SourceLabels = (() => {
    // Define primary mappings with all alternate IDs
    const primaryMappings = {
        // Core Government Sources
        'GOV.UK': ['govuk', 'gov-uk', 'gov.uk-api'],
        'ONS Classification Guide': ['ons', 'ons-institutional-units', 'ons-non-institutional-units'],

        // Education Sector
        'Get Information About Schools': ['gias', 'schools'],
        'OpenDataNI Schools': ['ni-schools', 'northern-ireland-schools', 'ni-education'],
        'Association of Colleges': ['colleges', 'colleges-uk', 'aoc.co.uk'],

        // Healthcare Sector
        'NHS England Provider Directory': ['nhs-provider-directory', 'nhs'],
        'NHS Integrated Care Boards': ['icbs', 'integrated-care', 'nhs-icbs'],
        'NHS Scotland': ['nhs-scotland', 'scottish-health', 'nhs-scotland-boards'],
        'NI Health & Social Care': ['ni-health', 'ni-trusts', 'ni-health-trusts'],
        'Healthwatch England': ['healthwatch', 'local-healthwatch'],
        'NHS Charities Together': ['nhs-charities', 'nhs-charity', 'nhscharitiestogether.co.uk'],

        // Local Government
        'DEFRA UK-AIR': ['defra-uk-air', 'defra', 'la'],
        'ONS Unitary Authorities': ['english-unitary', 'ons-unitary', 'ons-unitary-authorities'],
        'ONS Districts of England': ['districts', 'english-districts', 'wikipedia-districts'],
        'ONS Welsh Authorities': ['welsh-unitary', 'welsh-authorities', 'welsh-unitary-authorities'],
        'Welsh Community Councils': ['welsh-councils', 'welsh-community', 'welsh-community-councils'],
        'Scottish Community Councils': ['scottish-councils', 'scottish-community', 'scottish-community-councils'],
        'National Parks UK': ['national-parks', 'parks'],

        // Emergency Services
        'Police.uk': ['police', 'police-uk', 'police.uk'],
        'National Fire Chiefs Council': ['fire', 'nfcc'],

        // Justice System
        'GOV.UK Courts & Tribunals': ['courts', 'uk-courts'],

        // Devolved Administrations
        'Devolved Administrations': ['devolved', 'manual'],
        'mygov.scot': ['scottish-gov', 'mygov-scot', 'scottish-government'],
        'GOV.UK Devolved Bodies': ['devolved-extra', 'devolved-additional', 'gov.uk-guidance'],
        'NI Direct': ['ni-depts', 'ni-departments', 'ni-government-depts'],

        // Transport
        'Transport Scotland': ['scottish-rtps', 'rtps'],
        'Infrastructure NI Ports': ['ni-ports', 'trust-ports', 'ni-trust-ports'],

        // Research & Development
        'UK Research & Innovation': ['research-councils', 'ukri', 'uk-research-councils'],

        // Other Public Bodies
        'Groundwork UK': ['groundwork', 'groundwork-trusts', 'groundwork.org.uk']
    };

    // Build reverse lookup map on initialization
    const sourceLookup = {};
    for (const [label, sources] of Object.entries(primaryMappings)) {
        for (const source of sources) {
            sourceLookup[source] = label;
        }
    }

    // Development-time validation function
    const validateCoverage = function(organisations) {
        if (window.location.hostname !== 'localhost' &&
            window.location.hostname !== '127.0.0.1' &&
            !window.location.search.includes('debug=true')) {
            return; // Only run in development
        }

        const unmappedSources = new Set();
        const sourceCounts = {};

        organisations.forEach(org => {
            org.sources?.forEach(source => {
                const label = sourceLookup[source.source];
                if (!label) {
                    unmappedSources.add(source.source);
                }
                sourceCounts[source.source] = (sourceCounts[source.source] || 0) + 1;
            });
        });

        if (unmappedSources.size > 0) {
            console.warn('⚠️ Unmapped source IDs found:', Array.from(unmappedSources));
            console.warn('Add these to source-labels.js primaryMappings');
        }

        // Log source usage statistics in development
        console.log('📊 Source ID usage:', sourceCounts);
    };

    // Public API
    return {
        // Get human-readable label for a source ID
        getLabel(sourceId) {
            return sourceLookup[sourceId] || sourceId;
        },

        // Get shortened label for charts (max 20 chars)
        getShortLabel(sourceId, maxLength = 20) {
            const label = this.getLabel(sourceId);
            if (label.length <= maxLength) return label;
            return label.substring(0, maxLength - 3) + '...';
        },

        // Validate coverage in development mode
        validateCoverage,

        // Get all mapped source IDs (for testing/debugging)
        getAllMappedIds() {
            return Object.keys(sourceLookup);
        },

        // Get all labels (for documentation/debugging)
        getAllLabels() {
            return Object.keys(primaryMappings);
        }
    };
})();

// Make available globally
window.SourceLabels = SourceLabels;

// Export for use in modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SourceLabels;
}