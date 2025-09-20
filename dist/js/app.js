// Main application controller for UK Public Sector Organisations website

function app() {
    return {
        // Data properties
        organisations: [],
        filteredOrganisations: [],
        paginatedOrganisations: [],
        metadata: null,

        // UI state
        loading: true,
        loadingProgress: '0',
        error: null,
        selectedOrg: null,

        // Search and filter state
        searchTerm: '',
        selectedType: '',
        selectedLocation: '',
        fuse: null, // Fuse.js instance

        // Pagination state
        currentPage: 1,
        itemsPerPage: 50,
        totalPages: 1,

        // Statistics
        totalOrganisations: 0,
        organisationTypes: [],
        typeBreakdown: {},
        fileSizeMB: '0',

        // Initialize the application
        async init() {
            try {
                await this.loadData();
                this.setupSearch();
                this.calculateStatistics();
                this.applyFilters();
            } catch (err) {
                console.error('Initialization error:', err);
                this.error = err.message || 'Failed to initialize application';
                this.loading = false;
            }
        },

        // Load data from JSON file
        async loadData() {
            try {
                // Load metadata first if available
                try {
                    const metaResponse = await fetch('metadata.json');
                    if (metaResponse.ok) {
                        this.metadata = await metaResponse.json();
                        this.fileSizeMB = ((this.metadata.fileSize || 0) / (1024 * 1024)).toFixed(2);
                    }
                } catch (metaErr) {
                    console.warn('Metadata not available:', metaErr);
                }

                // Load main data
                const response = await fetch('orgs.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                // Get response size for progress tracking
                const contentLength = response.headers.get('content-length');
                if (contentLength) {
                    const total = parseInt(contentLength, 10);
                    const reader = response.body.getReader();
                    let receivedLength = 0;
                    let chunks = [];

                    while(true) {
                        const {done, value} = await reader.read();

                        if (done) break;

                        chunks.push(value);
                        receivedLength += value.length;

                        // Update progress
                        const progress = Math.round((receivedLength / total) * 100);
                        this.loadingProgress = `${progress}%`;
                    }

                    // Combine chunks and parse JSON
                    const chunksAll = new Uint8Array(receivedLength);
                    let position = 0;
                    for(let chunk of chunks) {
                        chunksAll.set(chunk, position);
                        position += chunk.length;
                    }

                    const text = new TextDecoder("utf-8").decode(chunksAll);
                    const data = JSON.parse(text);

                    this.organisations = data.organisations || [];

                    // Update metadata if it's in the data
                    if (data.metadata && !this.metadata) {
                        this.metadata = data.metadata;
                    }
                } else {
                    // Fallback for servers that don't send content-length
                    const data = await response.json();
                    this.organisations = data.organisations || [];

                    if (data.metadata && !this.metadata) {
                        this.metadata = data.metadata;
                    }
                }

                this.totalOrganisations = this.organisations.length;
                this.loading = false;

                console.log(`Loaded ${this.totalOrganisations} organisations`);

            } catch (err) {
                console.error('Error loading data:', err);
                this.error = `Failed to load data: ${err.message}`;
                this.loading = false;
                throw err;
            }
        },

        // Setup Fuse.js search index
        setupSearch() {
            const options = {
                keys: ['name', 'alternativeNames'],
                threshold: 0.3, // Fuzzy matching threshold
                includeScore: true,
                useExtendedSearch: true,
                ignoreLocation: true, // Search anywhere in the string
                minMatchCharLength: 2
            };

            this.fuse = new Fuse(this.organisations, options);
            console.log('Search index created');
        },

        // Calculate statistics
        calculateStatistics() {
            // Get unique organisation types
            const types = new Set();
            const typeCount = {};
            const regionCount = {};
            const statusCount = {};
            const sourceCount = {};

            this.organisations.forEach(org => {
                if (org.type) {
                    types.add(org.type);
                    typeCount[org.type] = (typeCount[org.type] || 0) + 1;
                }

                // Count by region
                const region = org.region || 'Unknown';
                regionCount[region] = (regionCount[region] || 0) + 1;

                // Count by status
                const status = org.status || 'unknown';
                statusCount[status] = (statusCount[status] || 0) + 1;

                // Count by sources
                if (org.sources && org.sources.length > 0) {
                    org.sources.forEach(source => {
                        sourceCount[source.source] = (sourceCount[source.source] || 0) + 1;
                    });
                }
            });

            this.organisationTypes = Array.from(types).sort();
            this.typeBreakdown = typeCount;
            this.regionBreakdown = regionCount;
            this.statusBreakdown = statusCount;
            this.sourceBreakdown = sourceCount;

            // Calculate file size if not from metadata
            if (!this.fileSizeMB || this.fileSizeMB === '0') {
                // Estimate based on data
                const jsonString = JSON.stringify(this.organisations);
                const sizeInBytes = new Blob([jsonString]).size;
                this.fileSizeMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
            }

            // Create charts after calculating statistics
            setTimeout(() => this.createCharts(), 100);
        },

        // Perform search using Fuse.js
        performSearch() {
            if (!this.searchTerm.trim()) {
                this.applyFilters();
                return;
            }

            const results = this.fuse.search(this.searchTerm);
            const searchedOrgs = results.map(result => result.item);

            // Apply other filters to search results
            this.filteredOrganisations = this.applyTypeAndLocationFilters(searchedOrgs);
            this.updatePagination();
        },

        // Apply filters
        applyFilters() {
            let filtered = [...this.organisations];

            // Apply search if present
            if (this.searchTerm.trim()) {
                const results = this.fuse.search(this.searchTerm);
                filtered = results.map(result => result.item);
            }

            // Apply type and location filters
            filtered = this.applyTypeAndLocationFilters(filtered);

            this.filteredOrganisations = filtered;
            this.updatePagination();
        },

        // Apply type and location filters to a list
        applyTypeAndLocationFilters(orgs) {
            let filtered = orgs;

            // Filter by type
            if (this.selectedType) {
                filtered = filtered.filter(org => org.type === this.selectedType);
            }

            // Filter by location
            if (this.selectedLocation) {
                filtered = filtered.filter(org => org.region === this.selectedLocation);
            }

            return filtered;
        },

        // Update pagination
        updatePagination() {
            this.totalPages = Math.ceil(this.filteredOrganisations.length / this.itemsPerPage);
            this.currentPage = 1;
            this.paginateResults();
        },

        // Paginate results
        paginateResults() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            this.paginatedOrganisations = this.filteredOrganisations.slice(start, end);
        },

        // Navigation methods
        previousPage() {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.paginateResults();
            }
        },

        nextPage() {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.paginateResults();
            }
        },

        // Show organisation details
        showDetails(org) {
            this.selectedOrg = org;
        },

        // Download organisation data as JSON
        downloadOrgData(org) {
            const dataStr = JSON.stringify(org, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

            const exportName = `${org.id || 'organisation'}.json`;

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportName);
            linkElement.click();
        },

        // Format functions
        formatType(type) {
            if (!type) return 'Unknown';
            return type.split('_').map(word =>
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        },

        formatDate(dateStr) {
            if (!dateStr) return 'Unknown';
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-GB', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        formatPropertyKey(key) {
            return key.split(/(?=[A-Z])/).join(' ').replace(/_/g, ' ')
                .split(' ').map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ');
        },

        getStatusClass(status) {
            switch(status) {
                case 'active': return 'status-active';
                case 'inactive': return 'status-inactive';
                case 'dissolved': return 'status-dissolved';
                default: return 'text-gray-500';
            }
        },

        // Create data visualization charts
        createCharts() {
            // Destroy existing charts if they exist
            if (this.regionChart) this.regionChart.destroy();
            if (this.sourceChart) this.sourceChart.destroy();
            if (this.statusChart) this.statusChart.destroy();

            // Chart.js defaults
            Chart.defaults.font.size = 11;
            Chart.defaults.plugins.legend.display = false;

            // Regional Distribution Chart
            const regionCtx = document.getElementById('regionChart');
            if (regionCtx) {
                const regions = Object.entries(this.regionBreakdown)
                    .filter(([region]) => region !== 'Unknown')
                    .sort((a, b) => b[1] - a[1]);

                this.regionChart = new Chart(regionCtx, {
                    type: 'doughnut',
                    data: {
                        labels: regions.map(([region]) => region),
                        datasets: [{
                            data: regions.map(([, count]) => count),
                            backgroundColor: [
                                'rgba(59, 130, 246, 0.5)',
                                'rgba(34, 197, 94, 0.5)',
                                'rgba(168, 85, 247, 0.5)',
                                'rgba(251, 146, 60, 0.5)',
                                'rgba(239, 68, 68, 0.5)',
                                'rgba(14, 165, 233, 0.5)'
                            ],
                            borderColor: [
                                'rgba(59, 130, 246, 1)',
                                'rgba(34, 197, 94, 1)',
                                'rgba(168, 85, 247, 1)',
                                'rgba(251, 146, 60, 1)',
                                'rgba(239, 68, 68, 1)',
                                'rgba(14, 165, 233, 1)'
                            ],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'right',
                                labels: {
                                    padding: 10,
                                    font: {
                                        size: 11
                                    }
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const label = context.label || '';
                                        const value = context.parsed;
                                        const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return label + ': ' + value.toLocaleString() + ' (' + percentage + '%)';
                                    }
                                }
                            }
                        }
                    }
                });
            }

            // Data Sources Chart
            const sourceCtx = document.getElementById('sourceChart');
            if (sourceCtx) {
                const topSources = Object.entries(this.sourceBreakdown)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8); // Limit to top 8 sources for pie chart

                this.sourceChart = new Chart(sourceCtx, {
                    type: 'pie',
                    data: {
                        labels: topSources.map(([source]) => source),
                        datasets: [{
                            data: topSources.map(([, count]) => count),
                            backgroundColor: [
                                'rgba(168, 85, 247, 0.5)',
                                'rgba(239, 68, 68, 0.5)',
                                'rgba(34, 197, 94, 0.5)',
                                'rgba(59, 130, 246, 0.5)',
                                'rgba(251, 146, 60, 0.5)',
                                'rgba(14, 165, 233, 0.5)',
                                'rgba(236, 72, 153, 0.5)',
                                'rgba(156, 163, 175, 0.5)'
                            ],
                            borderColor: [
                                'rgba(168, 85, 247, 1)',
                                'rgba(239, 68, 68, 1)',
                                'rgba(34, 197, 94, 1)',
                                'rgba(59, 130, 246, 1)',
                                'rgba(251, 146, 60, 1)',
                                'rgba(14, 165, 233, 1)',
                                'rgba(236, 72, 153, 1)',
                                'rgba(156, 163, 175, 1)'
                            ],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'right',
                                labels: {
                                    padding: 10,
                                    font: {
                                        size: 11
                                    }
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const label = context.label || '';
                                        const value = context.parsed;
                                        const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return label + ': ' + value.toLocaleString() + ' (' + percentage + '%)';
                                    }
                                }
                            }
                        }
                    }
                });
            }

            // Status Distribution Chart
            const statusCtx = document.getElementById('statusChart');
            if (statusCtx) {
                const statuses = Object.entries(this.statusBreakdown)
                    .sort((a, b) => b[1] - a[1]);

                const statusColors = {
                    'active': 'rgba(34, 197, 94, 0.5)',
                    'inactive': 'rgba(251, 146, 60, 0.5)',
                    'dissolved': 'rgba(239, 68, 68, 0.5)',
                    'unknown': 'rgba(156, 163, 175, 0.5)'
                };

                const statusBorderColors = {
                    'active': 'rgba(34, 197, 94, 1)',
                    'inactive': 'rgba(251, 146, 60, 1)',
                    'dissolved': 'rgba(239, 68, 68, 1)',
                    'unknown': 'rgba(156, 163, 175, 1)'
                };

                this.statusChart = new Chart(statusCtx, {
                    type: 'pie',
                    data: {
                        labels: statuses.map(([status]) => status.charAt(0).toUpperCase() + status.slice(1)),
                        datasets: [{
                            data: statuses.map(([, count]) => count),
                            backgroundColor: statuses.map(([status]) => statusColors[status] || 'rgba(156, 163, 175, 0.5)'),
                            borderColor: statuses.map(([status]) => statusBorderColors[status] || 'rgba(156, 163, 175, 1)'),
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'right',
                                labels: {
                                    padding: 10,
                                    font: {
                                        size: 11
                                    }
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const label = context.label || '';
                                        const value = context.parsed;
                                        const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return label + ': ' + value.toLocaleString() + ' (' + percentage + '%)';
                                    }
                                }
                            }
                        }
                    }
                });
            }
        }
    };
}