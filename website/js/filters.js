// Filter functionality module for UK Public Sector Organisations website

const Filters = {
    // Available filter options
    regions: ['England', 'Scotland', 'Wales', 'Northern Ireland', 'UK'],

    statuses: ['active', 'inactive', 'dissolved'],

    // Organization type groups for better categorization
    typeGroups: {
        'Government': [
            'ministerial_department',
            'executive_agency',
            'government_department',
            'devolved_administration'
        ],
        'Healthcare': [
            'nhs_trust',
            'nhs_foundation_trust',
            'health_board',
            'integrated_care_board',
            'local_healthwatch',
            'ni_health_trust'
        ],
        'Local Government': [
            'local_authority',
            'unitary_authority',
            'district_council',
            'welsh_community_council',
            'scottish_community_council'
        ],
        'Education': [
            'educational_institution',
            'academy_trust'
        ],
        'Emergency Services': [
            'emergency_service'
        ],
        'Public Bodies': [
            'non_departmental_public_body',
            'executive_ndpb',
            'advisory_ndpb',
            'tribunal_ndpb',
            'public_corporation',
            'public_body'
        ],
        'Other': [
            'judicial_body',
            'legislative_body',
            'regional_transport_partnership',
            'trust_port',
            'research_council',
            'national_park_authority',
            'other'
        ]
    },

    // Apply multiple filters
    applyMultipleFilters(organisations, filters) {
        let filtered = [...organisations];

        // Apply type filter
        if (filters.type && filters.type.length > 0) {
            filtered = filtered.filter(org =>
                filters.type.includes(org.type)
            );
        }

        // Apply region filter
        if (filters.region && filters.region.length > 0) {
            filtered = filtered.filter(org =>
                filters.region.includes(org.region)
            );
        }

        // Apply status filter
        if (filters.status && filters.status.length > 0) {
            filtered = filtered.filter(org =>
                filters.status.includes(org.status)
            );
        }

        // Apply data quality filter
        if (filters.minQuality !== undefined) {
            filtered = filtered.filter(org =>
                org.dataQuality.completeness >= filters.minQuality
            );
        }

        // Apply date range filter
        if (filters.establishedAfter) {
            filtered = filtered.filter(org => {
                if (!org.establishmentDate) return false;
                return new Date(org.establishmentDate) >= new Date(filters.establishedAfter);
            });
        }

        if (filters.establishedBefore) {
            filtered = filtered.filter(org => {
                if (!org.establishmentDate) return false;
                return new Date(org.establishmentDate) <= new Date(filters.establishedBefore);
            });
        }

        // Apply source filter
        if (filters.source && filters.source.length > 0) {
            filtered = filtered.filter(org =>
                org.sources.some(s => filters.source.includes(s.source))
            );
        }

        // Apply has conflicts filter
        if (filters.hasConflicts !== undefined) {
            filtered = filtered.filter(org =>
                org.dataQuality.hasConflicts === filters.hasConflicts
            );
        }

        // Apply custom filter function
        if (filters.customFilter && typeof filters.customFilter === 'function') {
            filtered = filtered.filter(filters.customFilter);
        }

        return filtered;
    },

    // Get filter statistics
    getFilterStats(organisations) {
        const stats = {
            byType: {},
            byRegion: {},
            byStatus: {},
            bySource: {},
            qualityDistribution: {
                high: 0,    // > 0.8
                medium: 0,  // 0.5 - 0.8
                low: 0      // < 0.5
            }
        };

        // Count organisations by various criteria
        organisations.forEach(org => {
            // By type
            stats.byType[org.type] = (stats.byType[org.type] || 0) + 1;

            // By region
            if (org.region) {
                stats.byRegion[org.region] = (stats.byRegion[org.region] || 0) + 1;
            }

            // By status
            stats.byStatus[org.status] = (stats.byStatus[org.status] || 0) + 1;

            // By source
            org.sources.forEach(source => {
                stats.bySource[source.source] = (stats.bySource[source.source] || 0) + 1;
            });

            // Quality distribution
            const quality = org.dataQuality.completeness;
            if (quality > 0.8) {
                stats.qualityDistribution.high++;
            } else if (quality >= 0.5) {
                stats.qualityDistribution.medium++;
            } else {
                stats.qualityDistribution.low++;
            }
        });

        return stats;
    },

    // Build filter UI options based on available data
    buildFilterOptions(organisations) {
        const options = {
            types: new Set(),
            regions: new Set(),
            statuses: new Set(),
            sources: new Set()
        };

        organisations.forEach(org => {
            if (org.type) options.types.add(org.type);
            if (org.region) options.regions.add(org.region);
            if (org.status) options.statuses.add(org.status);
            org.sources.forEach(s => options.sources.add(s.source));
        });

        return {
            types: Array.from(options.types).sort(),
            regions: Array.from(options.regions).sort(),
            statuses: Array.from(options.statuses).sort(),
            sources: Array.from(options.sources).sort()
        };
    },

    // Save filter preferences
    saveFilterPreferences(filters) {
        try {
            localStorage.setItem('ukpso-filter-preferences', JSON.stringify(filters));
        } catch (e) {
            console.warn('Failed to save filter preferences:', e);
        }
    },

    // Load filter preferences
    loadFilterPreferences() {
        try {
            const saved = localStorage.getItem('ukpso-filter-preferences');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.warn('Failed to load filter preferences:', e);
            return {};
        }
    },

    // Clear all filters
    clearFilters() {
        return {
            type: [],
            region: [],
            status: [],
            source: [],
            minQuality: undefined,
            establishedAfter: undefined,
            establishedBefore: undefined,
            hasConflicts: undefined
        };
    },

    // Create filter summary text
    getFilterSummary(filters) {
        const parts = [];

        if (filters.type && filters.type.length > 0) {
            parts.push(`Type: ${filters.type.join(', ')}`);
        }

        if (filters.region && filters.region.length > 0) {
            parts.push(`Region: ${filters.region.join(', ')}`);
        }

        if (filters.status && filters.status.length > 0) {
            parts.push(`Status: ${filters.status.join(', ')}`);
        }

        if (filters.minQuality !== undefined) {
            parts.push(`Min Quality: ${Math.round(filters.minQuality * 100)}%`);
        }

        return parts.length > 0 ? parts.join(' • ') : 'No filters applied';
    },

    // Quick filter presets
    presets: {
        'Active NHS': {
            type: ['nhs_trust', 'nhs_foundation_trust', 'health_board', 'integrated_care_board'],
            status: ['active']
        },
        'English Local Authorities': {
            type: ['local_authority', 'unitary_authority', 'district_council'],
            region: ['England']
        },
        'Schools and Education': {
            type: ['educational_institution', 'academy_trust']
        },
        'Emergency Services': {
            type: ['emergency_service']
        },
        'High Quality Data': {
            minQuality: 0.8
        },
        'Needs Review': {
            hasConflicts: true
        }
    },

    // Apply preset filter
    applyPreset(presetName) {
        return this.presets[presetName] || {};
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Filters;
}