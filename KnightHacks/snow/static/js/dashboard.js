document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Element References ---
    const tableBody = document.getElementById('recommendations-table-body');
    const plotContainer = document.getElementById('cluster-plot');
    const plotLoader = document.getElementById('plot-loader');
    const categoryCanvas = document.getElementById('category-chart');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const statTotalRequests = document.getElementById('stat-total-requests');
    const statTotalClusters = document.getElementById('stat-total-clusters');
    const toggleTableBtn = document.getElementById('toggle-table-rows');
    const filterBtnContainer = document.querySelector('.filter-buttons');
    
    // Agent elements
    const analyzeButton = document.getElementById('analyze-button');
    const requestTextarea = document.getElementById('request-textarea');
    const agentResultsContainer = document.getElementById('agent-results-container');

    // Modal elements
    const modal = document.getElementById('details-modal');
    const modalCloseBtn = document.querySelector('.modal-close-btn');
    const modalTitle = document.getElementById('modal-title');
    const modalSearch = document.getElementById('modal-search');
    const modalTableBody = document.getElementById('modal-table-body');

    // --- Global State ---
    let categoryChart;
    let currentModalData = [];
    let allRecommendations = [];
    let isShowingAll = false;
    let currentSort = 'default';
    let clusterChart; // For the scatter plot

    // --- Dark Mode ---
    darkModeToggle.addEventListener('change', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
        loadClusterPlot(); // Re-render plot with new theme
        loadCategoryChart(); // Re-render chart with new theme
    });

    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        darkModeToggle.checked = true;
    }

    // --- Data Loading Functions ---

    async function loadRecommendations() {
        try {
            const response = await fetch('/api/recommendations');
            if (!response.ok) throw new Error('Failed to load recommendations');
            const data = await response.json();
            
            allRecommendations = data; // Store all data
            statTotalClusters.textContent = data.length;
            
            // Set default sort (already sorted by demand, gap)
            currentSort = 'default';
            updateFilterButtons();
            
            renderTable(); // Render initial view (sliced)
            
            toggleTableBtn.style.display = data.length > 6 ? 'block' : 'none';

        } catch (error) {
            console.error(error);
            tableBody.innerHTML = `<tr><td colspan="6" class="placeholder" style="color: var(--negative-color);">Error loading data. Have you run an analysis?</td></tr>`;
        }
    }

    async function loadClusterPlot() {
        plotLoader.style.display = 'flex';
        try {
            const response = await fetch('/api/cluster-plot');
            if (!response.ok) throw new Error('Failed to load plot data');
            const data = await response.json();
            
            renderClusterPlot(data); // Call the new render function
            statTotalRequests.textContent = data.length.toLocaleString(); 
        } catch (error) {
            console.error(error);
            plotContainer.innerHTML = `<div class="placeholder" style="color: var(--negative-color);">Error loading plot.</div>`;
        } finally {
            plotLoader.style.display = 'none';
        }
    }

    async function loadCategoryChart() {
        try {
            const response = await fetch('/api/category-data');
            if (!response.ok) throw new Error('Failed to load category data');
            const data = await response.json();
            renderCategoryChart(data);
        } catch (error) {
            console.error(error);
            document.querySelector('.chart-container-small').innerHTML = `<p style="font-size: 0.8rem; color: var(--negative-color);">Error</p>`;
        }
    }

    // --- Rendering Functions ---

    function renderTable() {
        let dataToRender = allRecommendations;

        // 1. Sort the data
        if (currentSort === 'demand') {
            dataToRender.sort((a, b) => b.demand - a.demand);
        } else if (currentSort === 'gap') {
            dataToRender.sort((a, b) => b.gap - a.gap);
        }
        // 'default' is already pre-sorted from the API

        // 2. Slice the data
        if (!isShowingAll) {
            dataToRender = dataToRender.slice(0, 6);
        }
        
        // 3. Render
        tableBody.innerHTML = ""; // Clear
        if (dataToRender.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" class="placeholder">No clusters found.</td></tr>`;
            return;
        }

        dataToRender.forEach(item => {
            const gapPercent = item.gap * 100;
            const row = `
                <tr>
                    <td><strong>${item.id}</strong></td>
                    <td><span class="keywords">${item.keywords}</span></td>
                    <td>${item.demand}</td>
                    <td>
                        <span style="font-weight: 600; color: ${gapPercent > 40 ? 'var(--negative-color)' : 'var(--text-color)'}">${item.gap.toFixed(2)}</span>
                    </td>
                    <td>${item.best_fit}</td>
                    <td>
                        <button class="details-btn" data-cluster-id="${item.id}" data-cluster-keywords="${item.keywords}">
                            Details
                        </button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });

        // 4. Add event listeners to new buttons
        document.querySelectorAll('.details-btn').forEach(btn => {
            btn.addEventListener('click', handleDetailsClick);
        });
        
        // 5. Update toggle button text
        toggleTableBtn.textContent = isShowingAll ? 'Show Less' : 'Show All';
    }

    function renderClusterPlot(data) {
        const isDark = document.body.classList.contains('dark-mode');
        const plotData = [{
            x: data.map(d => d.x), y: data.map(d => d.y), type: 'scatter', mode: 'markers',
            marker: { color: data.map(d => parseInt(d.cluster)), colorscale: 'Viridis', size: 5, opacity: 0.7 },
            text: data.map(d => `<b>${d.initiative_title}</b><br>Category: ${d.primary_category}<br>Number: ${d.number}`),
            hoverinfo: 'text'
        }];
        const layout = {
            paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: isDark ? '#e0e0e0' : '#333' },
            xaxis: { gridcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)', zerolinecolor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)' },
            yaxis: { gridcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)', zerolinecolor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)' },
            margin: { l: 40, r: 20, t: 20, b: 40 }
        };
        Plotly.newPlot(plotContainer, plotData, layout, {responsive: true});
    }

    function renderCategoryChart(data) {
        if (categoryChart) categoryChart.destroy();
        const isDark = document.body.classList.contains('dark-mode');
        categoryChart = new Chart(categoryCanvas, {
            type: 'doughnut',
            data: { labels: data.labels, datasets: [{ data: data.values, backgroundColor: ['#007bff', '#dc3545', '#ffc107', '#28a745', '#6f42c1', '#fd7e14', '#20c997', '#6610f2', '#e83e8c', '#17a2b8'], borderWidth: 0 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { color: isDark ? '#e0e0e0' : '#333', boxWidth: 12, padding: 10 }}}
            }
        });
    }
    function renderClusterPlot(data) {
        if (clusterChart) {
            clusterChart.destroy(); // Destroy old chart
        }
        
        const isDark = document.body.classList.contains('dark-mode');
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDark ? '#e0e0e0' : '#333';
        
        // Define distinct colors
        const clusterColors = [
            '#007bff', '#dc3545', '#ffc107', '#28a745', '#6f42c1', '#fd7e14',
            '#20c997', '#6610f2', '#e83e8c', '#17a2b8', '#343a40', '#6c757d'
        ];
        
        // Group data by cluster
        const clusters = {};
        data.forEach(point => {
            if (!clusters[point.cluster]) {
                clusters[point.cluster] = [];
            }
            clusters[point.cluster].push({
                x: point.x,
                y: point.y,
                // Store full data for tooltip
                ...point 
            });
        });
        
        // Create one dataset per cluster
        const datasets = Object.keys(clusters).map((clusterId, index) => {
            const colorIndex = parseInt(clusterId) % clusterColors.length;
            return {
                label: `Cluster ${clusterId}`,
                data: clusters[clusterId],
                backgroundColor: clusterColors[colorIndex],
                pointRadius: 5,
                pointHoverRadius: 7
            };
        });

        clusterChart = new Chart(plotContainer.getContext('2d'), {
            type: 'scatter',
            data: {
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: textColor,
                            padding: 20,
                            boxWidth: 12
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const point = context.raw;
                                return `Cluster ${point.cluster}: ${point.initiative_title}`;
                            },
                            afterBody: function(context) {
                                const point = context[0].raw;
                                return `Category: ${point.primary_category}\nNumber: ${point.number}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: gridColor },
                        ticks: { color: textColor }
                    },
                    y: {
                        grid: { color: gridColor },
                        ticks: { color: textColor }
                    }
                }
            }
        });
    }
    
    // --- NEW: Agent Analyzer ---
    analyzeButton.addEventListener('click', async () => {
        const text = requestTextarea.value.trim();
        if (!text) return;

        analyzeButton.disabled = true;
        analyzeButton.textContent = "Analyzing...";
        agentResultsContainer.innerHTML = `<div class="placeholder"><p>Analyzing request...</p></div>`;

        try {
            const response = await fetch('/api/analyze-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text })
            });
            
            const result = await response.json();
            
            if (!response.ok) throw new Error(result.error);
            
            renderAgentResults(result);

        } catch (error) {
            console.error(error);
            renderAgentResults({ error: error.message });
        } finally {
            analyzeButton.disabled = false;
            analyzeButton.textContent = "Analyze Request";
        }
    });

    function renderAgentResults(result) {
        if (result.error) {
            agentResultsContainer.innerHTML = `<div class="agent-recommendation error"><p><strong>Error:</strong> ${result.error}</p></div>`;
            return;
        }

        const similarityClass = result.best_match_score > 0.5 ? "similarity-high" : "similarity-low";
        
        let clusterHTML = '';
        if (result.cluster_id === -1) {
            clusterHTML = `
                <div class="result-card">
                    <h3>Identified Emerging Need</h3>
                    <p class="value">Unique Request (Noise)</p>
                    <ul class="result-details">
                        <li>Does not match a known trend.</li>
                    </ul>
                </div>`;
        } else if (result.cluster_info) {
            const cluster = result.cluster_info;
            clusterHTML = `
                <div class="result-card">
                    <h3>Identified Emerging Need</h3>
                    <p class="value">Cluster ${cluster.id}</p>
                    <ul class="result-details">
                        <li><strong>Keywords:</strong> ${cluster.keywords}</li>
                        <li><strong>Demand:</strong> ${cluster.demand} requests</li>
                        <li><strong>Gap Score:</strong> ${cluster.gap.toFixed(2)}</li>
                    </ul>
                </div>`;
        }

        const recoClass = result.cluster_info && result.cluster_info.gap > 0.4 ? 'high-gap' : 'low-gap';

        agentResultsContainer.innerHTML = `
            <div class="result-card">
                <h3>Closest Existing Accelerator</h3>
                <p class="value">${result.best_match_name}</p>
                <h3 style="margin-top: 10px;">Similarity Score</h3>
                <p class="value ${similarityClass}">${(result.best_match_score * 100).toFixed(0)}%</p>
            </div>
            ${clusterHTML}
            <div class="agent-recommendation ${recoClass}">
                <p><strong>🤖 Agent Recommendation:</strong><br>${result.recommendation}</p>
            </div>
        `;
    }

    // --- Modal Logic ---
    async function handleDetailsClick(event) {
        const clusterId = event.target.dataset.clusterId;
        const keywords = event.target.dataset.clusterKeywords;
        
        modalTitle.textContent = `Details for Cluster ${clusterId} (${keywords})`;
        modal.style.display = 'block';
        modalTableBody.innerHTML = `<tr><td colspan="4" class="placeholder">Loading details...</td></tr>`;

        try {
            const response = await fetch(`/api/cluster-details?id=${clusterId}`);
            if (!response.ok) throw new Error('Failed to load cluster details');
            const data = await response.json();
            currentModalData = data; 
            renderModalTable(data);
        } catch (error) {
            console.error(error);
            modalTableBody.innerHTML = `<tr><td colspan="4" class="placeholder" style="color: var(--negative-color);">Error loading details.</td></tr>`;
        }
    }

    function renderModalTable(data) {
        modalTableBody.innerHTML = "";
        if (data.length === 0) {
            modalTableBody.innerHTML = `<tr><td colspan="4" class="placeholder">No requests found.</td></tr>`;
            return;
        }
        data.forEach(req => {
            const row = `
                <tr>
                    <td>${req.number || 'N/A'}</td>
                    <td>${req.initiative_title || 'N/A'}</td>
                    <td>${req.description || 'N/A'}</td>
                    <td>${req.primary_category || 'N/A'}</td>
                </tr>`;
            modalTableBody.innerHTML += row;
        });
    }

    modalSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        if (!searchTerm) {
            renderModalTable(currentModalData);
            return;
        }
        const filteredData = currentModalData.filter(req => 
            String(req.initiative_title).toLowerCase().includes(searchTerm) ||
            String(req.description).toLowerCase().includes(searchTerm) ||
            String(req.number).toLowerCase().includes(searchTerm) ||
            String(req.primary_category).toLowerCase().includes(searchTerm)
        );
        renderModalTable(filteredData);
    });

    modalCloseBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => { if (e.target == modal) modal.style.display = 'none'; });

    // --- NEW: Table Control Event Listeners ---
    
    // Toggle Show All / Show Less
    toggleTableBtn.addEventListener('click', () => {
        isShowingAll = !isShowingAll; // Toggle the state
        renderTable(); // Re-render the table
    });
    
    // Sort Buttons
    filterBtnContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            currentSort = e.target.dataset.sort;
            updateFilterButtons();
            renderTable();
        }
    });
    
    function updateFilterButtons() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            if (btn.dataset.sort === currentSort) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // --- Initial Load ---
    loadRecommendations();
    loadClusterPlot();
    loadCategoryChart();
});