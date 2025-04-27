// ui/analyticsUI.js

/**
 * Manages the UI elements and rendering for the Analytics section,
 * including the statistics dashboard and the habit balance polygon chart.
 */

// --- Imports ---
import { getState, getStateReference } from '../state.js'; // State access
import { PILLARS } from '../constants.js'; // Pillar definitions
import {
    formatDate, escapeHtml, calculateLevelData, findFirstUsageDate,
    calculateTotalDaysLogged, calculateTotalPillarEntries, calculateTotalNotesAdded,
    calculateTotalAchievementsUnlocked
} from '../utils.js'; // Utilities
import { ALL_ACHIEVEMENTS } from '../achievements.js'; // For total achievements count
// Import global UI functions if needed (e.g., showToast - though maybe handled by app.js)
// import { showToast } from './globalUI.js';
// Import audio functions if needed (usually handled by app.js)
// import { playSound, handleInteractionForAudio } from '../audio.js';

// --- Module State ---
// Keep track of the currently active analytics view ('stats' or 'polygon')
let currentAnalyticsView = 'stats'; // Default to stats view

// --- Core Functions ---

/**
 * Toggles the visibility of the main analytics section versus the calendar view.
 * Updates the trigger button text and state.
 * Renders the appropriate analytics view if showing analytics.
 * @param {boolean} [forceShow] - Optional. If true, forces the analytics view to show. If false, forces calendar view. If undefined, toggles.
 */
export function toggleAnalyticsVisibility(forceShow) {
    // console.log(`[AnalyticsUI] toggleAnalyticsVisibility called. forceShow: ${forceShow}`); // Debug log
    // handleInteractionForAudio(); // Usually called by the event handler in app.js

    const analyticsContainer = document.getElementById("analytics-container");
    const calendarView = document.getElementById("calendar-view"); // Assumes calendar grid is wrapped
    const analyticsBtn = document.getElementById("view-analytics-btn");

    if (!analyticsContainer || !calendarView || !analyticsBtn) {
        console.error("[AnalyticsUI] Missing elements needed for toggleAnalyticsVisibility (analytics-container, calendar-view, view-analytics-btn).");
        return;
    }

    const isCurrentlyVisible = analyticsContainer.style.display === "block";
    const showAnalytics = (forceShow === undefined) ? !isCurrentlyVisible : forceShow;

    if (showAnalytics) {
        calendarView.style.display = "none"; // Hide calendar
        calendarView.setAttribute('aria-hidden', 'true');
        analyticsContainer.style.display = "block"; // Show analytics
        analyticsContainer.removeAttribute('aria-hidden');
        analyticsBtn.textContent = "Return to Calendar View";
        analyticsBtn.setAttribute('aria-pressed', 'true');
        // Render the currently selected analytics view when showing the container
        console.log(`[AnalyticsUI] Showing analytics, rendering view: ${currentAnalyticsView}`);
        switchAnalyticsView(currentAnalyticsView); // Render the active view
    } else {
        analyticsContainer.style.display = "none"; // Hide analytics
        analyticsContainer.setAttribute('aria-hidden', 'true');
        calendarView.style.display = "block"; // Show calendar
        calendarView.removeAttribute('aria-hidden');
        analyticsBtn.textContent = "View Analytics";
        analyticsBtn.setAttribute('aria-pressed', 'false');
        console.log("[AnalyticsUI] Hiding analytics, showing calendar view.");
    }
    // playSound('click', 'B4', '16n'); // Sound usually played by event handler
}

/**
 * Switches between different analytics views (e.g., 'stats', 'polygon').
 * Updates toggle buttons, shows/hides view containers, and triggers rendering.
 * @param {string} view - The view to switch to ('stats' or 'polygon').
 */
export function switchAnalyticsView(view) {
    // console.log(`[AnalyticsUI] switchAnalyticsView called for: ${view}`); // Debug log
    // handleInteractionForAudio(); // Usually called by event handler
    currentAnalyticsView = view; // Update the module state

    // --- Update Toggle Button States ---
    document.querySelectorAll("#analytics-toggles button").forEach(btn => {
        const isActive = btn.dataset.view === view;
        btn.classList.toggle("active", isActive);
        btn.setAttribute('aria-selected', String(isActive));
    });

    // --- Get Container Elements ---
    const statsViewContainer = document.getElementById("stats-dashboard-view");
    const polygonChartContainer = document.getElementById("polygon-chart-container");
    const descriptionContainer = document.getElementById("analytics-description");

    if (!statsViewContainer || !polygonChartContainer || !descriptionContainer) {
        console.error("[AnalyticsUI] Analytics view containers or description not found in switchAnalyticsView.");
        return;
    }

    // --- Hide All Views First ---
    statsViewContainer.style.display = "none";
    polygonChartContainer.style.display = "none";
    statsViewContainer.setAttribute('aria-hidden', 'true');
    polygonChartContainer.setAttribute('aria-hidden', 'true');

    // --- Show and Render the Selected View ---
    if (view === "stats") {
        statsViewContainer.style.display = "block"; // Show stats container
        statsViewContainer.removeAttribute('aria-hidden');
        console.log("[AnalyticsUI] Rendering stats dashboard...");
        renderStatsDashboard(); // Render the dashboard content
        descriptionContainer.textContent = "Your overall progress at a glance.";
    } else if (view === "polygon") {
        polygonChartContainer.style.display = "flex"; // Show polygon container (use flex for layout)
        polygonChartContainer.removeAttribute('aria-hidden');
        console.log("[AnalyticsUI] Rendering polygon chart...");
        renderPolygonChart(); // Render the polygon chart
        descriptionContainer.textContent = "Visual representation of habit frequency and balance.";
    } else {
        console.warn(`[AnalyticsUI] Unknown analytics view requested: ${view}`);
        descriptionContainer.textContent = ""; // Clear description for unknown view
    }
    // playSound('click', 'G4', '16n'); // Sound usually played by event handler
}

// --- Stats Dashboard Rendering ---

/**
 * Renders the statistics dashboard by calculating various metrics from the state
 * and updating the corresponding DOM elements.
 */
function renderStatsDashboard() {
    const state = getState(); // Get current state
    if (!state) {
        console.error("[AnalyticsUI] Cannot render stats dashboard: State is not available.");
        // Optionally clear the dashboard or show an error message
        document.getElementById('stats-dashboard')?.replaceChildren(); // Clear content
        return;
    }

    // Helper to safely update element text content, handling null/undefined values
    const updateElementText = (elementId, value, suffix = '', defaultValue = 'N/A') => {
        const element = document.getElementById(elementId);
        if (element) {
            // Use nullish coalescing (??) to provide defaultValue if value is null or undefined
            element.textContent = (value ?? defaultValue) + suffix;
        } else {
            console.warn(`[AnalyticsUI] Stats element not found: ${elementId}`);
        }
    };

    try {
        // --- Calculate Stats ---
        const startDate = findFirstUsageDate(state);
        const totalDaysLogged = calculateTotalDaysLogged(state.savedDays);
        const currentStreak = state.streak || 0;
        const totalPillarEntries = calculateTotalPillarEntries(state.pillars);
        const totalNotesAdded = calculateTotalNotesAdded(state.timeline);
        const totalAchievementsUnlocked = calculateTotalAchievementsUnlocked(state.achievements);
        const totalAchievementsAvailable = Object.keys(ALL_ACHIEVEMENTS).length; // Get total defined
        const achievementsText = `${totalAchievementsUnlocked} / ${totalAchievementsAvailable}`;
        const levelData = calculateLevelData(state.totalXP, state.prestige);

        // --- Update Dashboard Elements ---
        updateElementText('stat-start-date', startDate ? formatDate(startDate) : null, '', 'N/A');
        updateElementText('stat-days-logged', totalDaysLogged);
        updateElementText('stat-current-streak', currentStreak, ' days');
        updateElementText('stat-pillar-entries', totalPillarEntries);
        updateElementText('stat-notes-added', totalNotesAdded);
        updateElementText('stat-achievements-unlocked', achievementsText, '', '0 / 0'); // Show X / Y format
        updateElementText('stat-current-level', levelData.level);
        updateElementText('stat-cycle-rank', levelData.prestige); // Display prestige level

        // --- Update Welcome Message in Analytics ---
        const welcomeAnalyticsEl = document.getElementById('welcome-user-analytics');
        const analyticsNamePlaceholder = document.getElementById('user-name-placeholder-analytics');

        if (welcomeAnalyticsEl && analyticsNamePlaceholder) {
            const name = state.userName; // Get user name from state
            if (name) {
                analyticsNamePlaceholder.textContent = escapeHtml(name); // Display escaped name
                welcomeAnalyticsEl.style.display = 'block'; // Show the welcome message
            } else {
                welcomeAnalyticsEl.style.display = 'none'; // Hide if no name is set
            }
        } else {
            // console.warn("[AnalyticsUI] Analytics welcome elements not found."); // Keep warning minimal
        }

    } catch (error) {
        console.error("[AnalyticsUI] Error rendering stats dashboard:", error);
        // Optionally clear the dashboard on error
        document.getElementById('stats-dashboard')?.replaceChildren(
             document.createTextNode('Error loading stats.')
        );
    }
}

// --- Polygon Chart Rendering ---

/**
 * Renders the habit balance polygon chart using SVG.
 * Calculates pillar counts, generates SVG elements (grid, axes, polygon, points, labels),
 * creates a legend, and adds hover interactions.
 */
function renderPolygonChart() {
    // Get container elements
    const container = document.getElementById("polygon-chart-container");
    const emptyState = document.getElementById("polygon-chart-empty-state");

    // Validate elements
    if (!container || !emptyState) {
        console.error("[AnalyticsUI] Polygon chart container or empty state not found.");
        return;
    }

    const state = getState(); // Get current state
    // Validate state and pillars data
    if (!state || typeof state.pillars !== 'object') {
        console.error("[AnalyticsUI] State or pillars missing/invalid in renderPolygonChart");
        container.innerHTML = ''; // Clear container
        emptyState.style.display = 'block';
        emptyState.textContent = 'Error loading polygon chart data.';
        container.appendChild(emptyState); // Show error message
        return;
    }

    // --- Prepare Chart Data ---
    const pillarsChartData = PILLARS.map(p => {
        const pillarState = state.pillars[p.id];
        // Count logged days for this pillar
        const count = pillarState?.days ? Object.values(pillarState.days).filter(logged => logged === true).length : 0;
        // Return object with pillar info, count, and color
        return { ...p, count, color: p.color || '#cccccc' }; // Use defined color or default gray
    });

    // Check if there is any data to display
    const hasData = pillarsChartData.some(p => p.count > 0);
    container.innerHTML = ''; // Clear previous content (SVG, legend, empty state)

    // --- Handle Empty State ---
    if (!hasData) {
        emptyState.textContent = 'Log some habits to see your balance here.'; // Set specific message
        emptyState.style.display = 'block';
        container.appendChild(emptyState); // Add empty state message to container
        return;
    }
    emptyState.style.display = 'none'; // Hide empty state if data exists

    // --- Create SVG and Legend Wrappers ---
    const svgWrapper = document.createElement('div');
    svgWrapper.className = 'chart-svg-wrapper';
    svgWrapper.id = 'polygon-svg-wrapper'; // ID for targeting interactions
    const legendList = document.createElement('ul');
    legendList.className = 'chart-legend-list';
    legendList.id = 'polygon-legend-list';
    // Append wrappers to the main container
    container.appendChild(svgWrapper);
    container.appendChild(legendList);

    // --- Chart Configuration ---
    const svgSize = 300; // SVG canvas dimensions (width/height)
    const center = svgSize / 2; // Center coordinates
    const numLevels = 5; // Number of concentric grid circles
    const outerLabelOffset = 15; // Increased space between chart and labels
    const maxDataValue = Math.max(...pillarsChartData.map(d => d.count), 1); // Find max count (at least 1)
    const scaleFactor = 0.65; // Scale down chart radius slightly more
    const radius = center * scaleFactor; // Effective drawing radius
    const totalPillars = pillarsChartData.length;
    const angleSlice = (Math.PI * 2) / totalPillars; // Angle per pillar slice
    // Animation delays (in milliseconds)
    const pointStaggerDelay = 50; // Delay between points appearing
    const polygonDelay = 250; // Delay before polygon shape appears

    try {
        // --- Create SVG Element ---
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", `0 0 ${svgSize} ${svgSize}`); // Use viewBox for scaling
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet"); // Maintain aspect ratio
        svg.setAttribute("role", "img"); // Accessibility role
        svg.setAttribute("aria-labelledby", `polygon-chart-title`); // Link to title
        // Add accessible title
        svg.innerHTML = `<title id="polygon-chart-title">Wellness Habits Polygon Chart - Visualizing frequency of logged pillars</title>`;

        // --- Create SVG Groups for Layering ---
        const gridGroup = document.createElementNS("http://www.w3.org/2000/svg", "g"); gridGroup.classList.add("grid-group");
        const axisGroup = document.createElementNS("http://www.w3.org/2000/svg", "g"); axisGroup.classList.add("axis-group");
        const polygonGroup = document.createElementNS("http://www.w3.org/2000/svg", "g"); polygonGroup.classList.add("polygon-group");
        const pointsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g"); pointsGroup.classList.add("points-group");
        const labelsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g"); labelsGroup.classList.add("labels-group");

        // --- Draw Grid Circles ---
        for (let j = 1; j <= numLevels; j++) {
            const levelRadius = (radius / numLevels) * j; // Calculate radius for this level
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.classList.add("grid-circle");
            circle.setAttribute("cx", String(center)); circle.setAttribute("cy", String(center));
            circle.setAttribute("r", String(levelRadius));
            gridGroup.appendChild(circle);
        }

        // --- Draw Axes and Labels ---
        pillarsChartData.forEach((pillar, i) => {
            const angle = angleSlice * i - Math.PI / 2; // Calculate angle (start from top)
            const angleDeg = angle * (180 / Math.PI); // Angle in degrees for rotation
            // Axis line end point
            const axisX = center + radius * Math.cos(angle); const axisY = center + radius * Math.sin(angle);
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.classList.add("axis-line");
            line.setAttribute("x1", String(center)); line.setAttribute("y1", String(center));
            line.setAttribute("x2", String(axisX)); line.setAttribute("y2", String(axisY));
            line.dataset.pillarId = pillar.id; // Store pillar ID for interaction
            axisGroup.appendChild(line);
            // Label position (outside the main radius)
            const labelRadius = radius + outerLabelOffset;
            const lx = center + labelRadius * Math.cos(angle); const ly = center + labelRadius * Math.sin(angle);
            const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            label.classList.add("axis-label");
            label.setAttribute("x", String(lx)); label.setAttribute("y", String(ly));
            // Rotate label for readability
            label.setAttribute("transform", `rotate(${angleDeg + 90}, ${lx}, ${ly})`);
            label.textContent = pillar.name; // Use pillar name as label text
            label.dataset.pillarId = pillar.id; // Store pillar ID for interaction
            labelsGroup.appendChild(label);
        });

        // --- Prepare Polygon Points and Draw Data Points ---
        let polygonPoints = ""; // String for polygon 'points' attribute
        pillarsChartData.forEach((pillar, i) => {
            const angle = angleSlice * i - Math.PI / 2; // Calculate angle
            // Calculate radius for polygon shape vertex based on count (can be 0)
            const valueRadiusForPolygon = radius * (pillar.count / maxDataValue);
            const xPoly = center + valueRadiusForPolygon * Math.cos(angle);
            const yPoly = center + valueRadiusForPolygon * Math.sin(angle);
            polygonPoints += `${xPoly},${yPoly} `; // Add point to polygon string

            // Only draw a visible point if the count is > 0
            if (pillar.count > 0) {
                // Calculate radius for the data point itself
                const valueRadiusForPoint = radius * (pillar.count / maxDataValue);
                // Ensure point has a minimum visible size if desired, otherwise use calculated
                const effectivePointRadius = Math.max(1.5, valueRadiusForPoint); // Min radius of 1.5px
                const xPoint = center + effectivePointRadius * Math.cos(angle);
                const yPoint = center + effectivePointRadius * Math.sin(angle);

                // Create group for point and its tooltip for easier interaction handling
                const pointGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
                pointGroup.classList.add("data-point-group");
                pointGroup.dataset.pillarId = pillar.id; // Store pillar ID

                // Create the data point circle
                const point = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                point.classList.add("data-point");
                point.setAttribute("cx", String(xPoint)); point.setAttribute("cy", String(yPoint));
                point.style.fill = pillar.color; // Set fill color based on pillar

                // Apply staggered animation class using setTimeout
                setTimeout(() => { point.classList.add('point-visible'); }, polygonDelay + i * pointStaggerDelay);

                pointGroup.appendChild(point); // Add point to group
                // Create and add tooltip (hidden by default via CSS)
                const pointTooltip = createTooltip(`${pillar.name}: ${pillar.count}`, xPoint, yPoint);
                pointGroup.appendChild(pointTooltip);
                pointsGroup.appendChild(pointGroup); // Add group to main points group
            }
        });

        // --- Draw the Main Data Polygon ---
        const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        polygon.classList.add("data-polygon");
        polygon.setAttribute("points", polygonPoints.trim()); // Set calculated points
        // Apply animation delay to polygon fill/stroke via style attribute
        polygon.style.animationDelay = `${polygonDelay}ms`;
        polygonGroup.appendChild(polygon); // Add polygon to its group

        // --- Append Groups to SVG in Correct Rendering Order ---
        svg.appendChild(gridGroup);    // Grid lines (bottom)
        svg.appendChild(axisGroup);    // Axis lines
        svg.appendChild(labelsGroup);  // Axis labels
        svg.appendChild(polygonGroup); // Data polygon shape
        svg.appendChild(pointsGroup);  // Data points and tooltips (top)
        // Append final SVG to its wrapper div
        svgWrapper.appendChild(svg);

        // --- Generate Legend ---
        // Sort data alphabetically by name for consistent legend order
        const sortedData = [...pillarsChartData].sort((a, b) => a.name.localeCompare(b.name));
        sortedData.forEach(pillar => {
            const li = document.createElement("li");
            // Use innerHTML for simple structure with escaped names
            li.innerHTML = `
                <span class="legend-color-box" style="background-color: ${pillar.color};"></span>
                <span class="legend-emoji" aria-hidden="true">${pillar.emoji}</span>
                <span class="legend-name">${escapeHtml(pillar.name)}</span>
                <span class="legend-value">${pillar.count}</span>`;
            legendList.appendChild(li); // Add legend item to list
        });

        // --- Add Hover Interactions ---
        addAxisHighlightInteraction('polygon-svg-wrapper'); // Add hover effects for points/axes

    } catch (error) {
        console.error("[AnalyticsUI] Error rendering polygon chart SVG:", error);
        // Display error message within the chart area
        svgWrapper.innerHTML = `<p class="error-message" style="text-align: center;">Could not render polygon chart.</p>`;
        legendList.innerHTML = ''; // Clear legend on error
    }
}

// --- Polygon Chart Internal Helpers ---

/**
 * Creates an SVG group element representing a tooltip.
 * Includes a background rectangle and the text content.
 * Initially hidden via CSS (.tooltip class).
 * @param {string} text - The text content of the tooltip.
 * @param {number} x - The x-coordinate for the tooltip anchor point.
 * @param {number} y - The y-coordinate for the tooltip anchor point.
 * @returns {SVGGElement} The SVG group element representing the tooltip.
 */
function createTooltip(text, x, y) {
    const tooltipGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    tooltipGroup.classList.add("tooltip"); // CSS class for styling and visibility
    // Position tooltip group slightly above the anchor point (adjust y offset as needed)
    tooltipGroup.setAttribute("transform", `translate(0, -15)`);

    // Create text element first to measure its size (approximately)
    const textElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
    textElement.classList.add("tooltip-text");
    textElement.setAttribute("x", String(x)); // Center text horizontally at anchor x
    textElement.setAttribute("y", String(y)); // Position text at anchor y (adjusted by group transform)
    textElement.setAttribute("text-anchor", "middle"); // Center text
    textElement.setAttribute("dominant-baseline", "central"); // Better vertical alignment
    textElement.textContent = text;
    tooltipGroup.appendChild(textElement); // Add text to group

    // --- Calculate background size based on text BBox ---
    // Note: getBBox might not work reliably until element is in the DOM and rendered.
    // Using an estimation or fixed padding might be more reliable here.
    let bbox = { x: x - (text.length * 3), y: y - 8, width: text.length * 6, height: 16 }; // Basic estimation
    try {
        // Try getting BBox, might fail if not rendered yet
        const renderedBBox = textElement.getBBox();
        // Use BBox if valid and has dimensions
        if (renderedBBox && renderedBBox.width > 0 && renderedBBox.height > 0) {
            bbox = renderedBBox;
        }
    } catch (e) {
        // console.warn("Could not get BBox for tooltip text, using estimation:", text, e);
    }
    const padding = 4; // Padding around the text

    // Create background rectangle
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.classList.add("tooltip-bg");
    rect.setAttribute("x", String(bbox.x - padding));
    rect.setAttribute("y", String(bbox.y - padding));
    rect.setAttribute("width", String(bbox.width + 2 * padding));
    rect.setAttribute("height", String(bbox.height + 2 * padding));
    rect.setAttribute("rx", "3"); // Rounded corners
    rect.setAttribute("ry", "3");

    // Insert background rectangle *before* the text element in the group
    tooltipGroup.insertBefore(rect, textElement);

    return tooltipGroup;
}

/**
 * Adds mouseenter/mouseleave and focusin/focusout event listeners to data points
 * to highlight the corresponding axis line and label on the polygon chart.
 * @param {string} svgWrapperId - The ID of the div wrapping the SVG chart.
 */
function addAxisHighlightInteraction(svgWrapperId) {
    const svgWrapper = document.getElementById(svgWrapperId);
    if (!svgWrapper) return;
    const svg = svgWrapper.querySelector('svg');
    if (!svg) return;

    // Target the groups containing the data points
    const pointGroups = svg.querySelectorAll('.data-point-group');

    pointGroups.forEach(group => {
        const pillarId = group.dataset.pillarId;
        if (!pillarId) return; // Skip if no pillar ID found on the group

        // Find corresponding axis line and label using the pillarId
        const correspondingAxis = svg.querySelector(`.axis-line[data-pillar-id="${pillarId}"]`);
        const correspondingLabel = svg.querySelector(`.axis-label[data-pillar-id="${pillarId}"]`);
        const pillarColor = PILLARS.find(p => p.id === pillarId)?.color || 'var(--primary)'; // Get pillar color

        // Define highlight/unhighlight functions
        const highlight = () => {
            if (correspondingAxis) {
                correspondingAxis.classList.add('highlight-axis');
                correspondingAxis.style.stroke = pillarColor; // Use specific pillar color
                correspondingAxis.style.strokeWidth = '1.5'; // Make it thicker
            }
            if (correspondingLabel) {
                correspondingLabel.classList.add('highlight-label');
            }
        };
        const unhighlight = () => {
            if (correspondingAxis) {
                correspondingAxis.classList.remove('highlight-axis');
                correspondingAxis.style.stroke = ''; // Reset to CSS default color
                correspondingAxis.style.strokeWidth = ''; // Reset to CSS default width
            }
            if (correspondingLabel) {
                correspondingLabel.classList.remove('highlight-label');
            }
        };

        // Add listeners for mouse and keyboard interactions
        group.addEventListener('mouseenter', highlight);
        group.addEventListener('focusin', highlight); // For keyboard accessibility
        group.addEventListener('mouseleave', unhighlight);
        group.addEventListener('focusout', unhighlight); // For keyboard accessibility
    });
}