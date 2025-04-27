// ui/dailyLogUI.js

/**
 * Manages UI elements and rendering specifically for the Daily Log tab.
 * Includes pillar inputs, mood tracker, progress bar, level display,
 * suggested achievement rendering, and personalized welcome message.
 */

// --- Imports ---
import { getState, getStateReference, togglePillarStatus, updateMood } from '../state.js'; // State functions
import { PILLARS } from '../constants.js'; // Pillar definitions
import { ALL_ACHIEVEMENTS } from '../achievements.js'; // Needed for suggestion display
import {
    formatDate, escapeHtml, calculateLevelData, getMoodEmoji // Utilities (getMoodEmoji moved to utils)
} from '../utils.js';
import { playSound, handleInteractionForAudio } from '../audio.js'; // Audio feedback
import { findSuggestedAchievement } from '../achievementlogic.js'; // Achievement suggestion logic
// Import global UI functions if needed (e.g., showToast - though maybe handled by app.js)
import { showToast } from './globalUI.js';

// --- Constants ---
const MOOD_DESCRIPTIONS = { 1: "Worried", 2: "Confused", 3: "Neutral", 4: "Happy", 5: "Excited" };
const PILLAR_TOOLTIPS = { stillness: "Reduces stress, improves focus.", tidy: "Creates calm, reduces mental clutter.", connect: "Builds resilience, boosts happiness.", progress: "Fosters accomplishment, provides purpose.", nourish: "Engages the mind, expands knowledge.", move: "Boosts mood, improves physical health.", create: "Outlet for expression, potential for 'flow'.", unplug: "Reduces digital overload, enhances presence.", reflect: "Increases self-awareness, aids learning.", enjoy: "Cultivates appreciation, boosts positive emotions." };

// --- Module State ---
let tooltipListenersAdded = false; // Flag to prevent adding tooltip listeners multiple times

// --- Core Rendering Function ---

/**
 * Refreshes the entire daily log UI based on the current state.
 * This is the main function to call when the date changes or state updates affect this view.
 */
export function refreshDailyLogUI() {
    const state = getState(); // Get a fresh copy of the state
    if (!state || !state.currentDate) {
        console.error("[DailyLogUI] State or currentDate missing in refreshDailyLogUI");
        return;
    }

    // Render/Update components of the Daily Log tab
    renderPillarInputs();
    updateProgress();
    updateMoodDisplay();
    updateLockButtons();
    updateLevelDisplay(); // Updates level text, progress bar, and prestige stars
    renderSuggestedAchievement();
    updateWelcomeMessage();

    // Update the date display specifically within the daily log section header
    const dailyLogDateEl = document.getElementById('daily-log-date');
    if (dailyLogDateEl) {
        dailyLogDateEl.textContent = formatDate(state.currentDate);
    } else {
        console.warn("[DailyLogUI] Daily log date element (#daily-log-date) not found.");
    }

    // Update Prestige Button visibility based on current level
    // (Button itself is on the Journey tab, but visibility logic depends on Daily Log state)
    const prestigeButton = document.getElementById('prestige-button');
    if (prestigeButton) {
        try {
            // Calculate level data based on current XP and prestige
            const levelData = calculateLevelData(state.totalXP, state.prestige);
            // Show button only if level is 100 or more AND user is not in Simple Mode
            prestigeButton.style.display = (levelData.level >= 100 && state.userMode !== 'simple') ? 'inline-block' : 'none';
        } catch (e) {
            console.error("[DailyLogUI] Error calculating level data for prestige button visibility:", e);
            prestigeButton.style.display = 'none'; // Hide button on error
        }
    }
}


// --- Pillar Rendering and Interaction ---

/**
 * Renders the pillar input cards based on the current state and mode.
 */
function renderPillarInputs() {
    const container = document.getElementById('pillar-inputs');
    if (!container) {
        console.error("[DailyLogUI] Pillar inputs container (#pillar-inputs) not found.");
        return;
    }

    const state = getState();
    const currentPillarsState = state?.pillars;
    const currentDate = state?.currentDate;
    const userMode = state?.userMode;
    const simpleModePillars = state?.simpleModePillars || []; // Get selected pillars for simple mode

    // Validate necessary state properties
    if (!currentPillarsState || !currentDate) {
        console.error("[DailyLogUI] Pillar data or current date missing in renderPillarInputs");
        container.innerHTML = '<p class="error-message">Error loading pillars.</p>';
        return;
    }

    // Determine which pillars to display based on mode
    let pillarsToDisplay = PILLARS; // Default to all pillars
    if (userMode === 'simple') {
        if (Array.isArray(simpleModePillars) && simpleModePillars.length > 0) {
            // Filter PILLARS array to only include those selected in simpleModePillars
            pillarsToDisplay = PILLARS.filter(pillar => simpleModePillars.includes(pillar.id));
        } else {
            // Handle case where simple mode is active but no pillars are selected (shouldn't happen ideally)
            console.warn("[DailyLogUI] Simple Mode active, but no pillars selected in state.");
            container.innerHTML = '<p>No pillars selected for Simple Mode. Check Settings.</p>';
            return;
        }
    }

    // Generate HTML for the pillar cards
    if (pillarsToDisplay.length === 0) {
        container.innerHTML = '<p class="error-message">Error: No pillars available to display.</p>';
    } else {
        container.innerHTML = pillarsToDisplay.map(p => {
            const pillarData = currentPillarsState[p.id];
            const isActive = currentDate && pillarData?.days?.[currentDate]; // Check if logged for current date
            const pillarIdLower = p.id ? p.id.toLowerCase() : '';
            const tooltipText = PILLAR_TOOLTIPS[pillarIdLower] || p.description || 'No details available.';
            const tooltipId = `tooltip-${p.id}`;
            const pillarName = p.name || 'Unknown Pillar';
            const pillarEmoji = p.emoji || '❓';
            const pillarDescription = p.description || '';
            const pillarColor = p.color || '#cccccc'; // Use defined color or default gray

            // Generate HTML for a single pillar card
            return `
                <div class="pillar-card ${isActive ? 'active' : ''}"
                     data-pillar="${p.id}"
                     style="--pillar-color: ${pillarColor}"
                     role="checkbox"
                     aria-checked="${isActive ? 'true' : 'false'}"
                     tabindex="0"
                     aria-labelledby="pillar-label-${p.id}"
                     aria-describedby="pillar-desc-${p.id}">

                    <div class="pillar-header">
                         <span class="pillar-emoji" aria-hidden="true">${pillarEmoji}</span>
                         <h3 id="pillar-label-${p.id}">${escapeHtml(pillarName)}</h3>
                    </div>
                    <div class="pillar-description" id="pillar-desc-${p.id}">${escapeHtml(pillarDescription)}</div>
                    <div class="tooltip-container">
                        <button class="info-icon" data-pillar-id="${p.id}" aria-describedby="${tooltipId}" aria-label="Info about ${escapeHtml(pillarName)}" tabindex="0">?</button>
                    </div>
                    <span class="pillar-tooltip-text" role="tooltip" id="${tooltipId}" data-tooltip-for="${p.id}">${escapeHtml(tooltipText)}</span>
                 </div>`;
        }).join('');

        // Attach event listeners for interaction (click, keydown)
        attachPillarCardListeners(container);
        // Add tooltip listeners only once
        if (!tooltipListenersAdded) {
            addTooltipListeners(container);
            tooltipListenersAdded = true;
        }
    }
}

/**
 * Attaches delegated event listeners to the pillar grid container for card interactions.
 * @param {HTMLElement} container - The pillar grid container element.
 */
function attachPillarCardListeners(container) {
    // Use a single handler for both click and keydown events
    const handlePillarCardInteraction = (e) => {
        const card = e.target.closest('.pillar-card');
        if (!card) return; // Exit if the click wasn't on a card or its descendant

        // Handle click or Enter/Space key press
        if (e.type === 'click' || (e.type === 'keydown' && (e.key === 'Enter' || e.key === ' '))) {
            if (e.type === 'keydown') e.preventDefault(); // Prevent space bar scrolling

            // Ignore clicks on the info icon or tooltip itself
            if (!e.target.classList.contains('info-icon') && !e.target.classList.contains('pillar-tooltip-text')) {
                handlePillarClick(card); // Call the main click handler
            }
        }
    };

    // Remove existing listeners before adding new ones (if re-rendering frequently)
    // Note: Simple removal might not work if the handler function reference changes.
    // Using delegation generally avoids the need for explicit removal on re-render.
    // container.removeEventListener('click', handlePillarCardInteraction);
    // container.removeEventListener('keydown', handlePillarCardInteraction);

    // Add the delegated listeners
    container.addEventListener('click', handlePillarCardInteraction);
    container.addEventListener('keydown', handlePillarCardInteraction);
}

/**
 * Handles the logic when a pillar card is clicked or activated via keyboard.
 * Toggles the pillar's status for the current date in the state.
 * Updates the UI (card appearance, progress bar).
 * Plays sound effects.
 * @param {HTMLElement} cardElement - The pillar card element that was interacted with.
 */
export function handlePillarClick(cardElement) {
    handleInteractionForAudio(); // Ensure audio context is ready

    const stateRef = getStateReference(); // Get direct state reference for checks
    // Validate state before proceeding
    if (!stateRef || !stateRef.savedDays || !stateRef.currentDate) {
        console.error("[DailyLogUI] Cannot handle pillar click: State or current date invalid.");
        showToast("Error updating pillar.", "error");
        return;
    }

    // Prevent changes if the day is already saved/locked
    if (stateRef.savedDays[stateRef.currentDate]) {
        showToast("Day is locked, cannot change pillars.", "info");
        return;
    }

    const pillarId = cardElement.dataset.pillar;
    if (!pillarId) {
        console.error("[DailyLogUI] Pillar ID missing from card dataset.");
        return;
    }
    if (!stateRef.pillars) {
        console.error("[DailyLogUI] stateRef.pillars is missing in handlePillarClick");
        return;
    }

    // Toggle the pillar status in the state
    const isActive = togglePillarStatus(pillarId, stateRef.currentDate);

    // Update the card's visual state
    cardElement.classList.toggle("active", isActive);
    cardElement.setAttribute('aria-checked', String(isActive)); // Update ARIA state

    // Update the progress bar based on the new pillar count
    updateProgress();

    // Play appropriate sound effect
    playSound('click', isActive ? 'E4' : 'C4', '16n');
}

/**
 * Adds delegated event listeners for showing/hiding pillar tooltips.
 * @param {HTMLElement} container - The pillar grid container element.
 */
function addTooltipListeners(container) {
    // Show tooltip on mouseover or focusin of the info icon
    container.addEventListener('mouseover', handleTooltipShow);
    container.addEventListener('focusin', handleTooltipShow);

    // Hide tooltip on mouseout or focusout of the info icon
    container.addEventListener('mouseout', handleTooltipHide);
    container.addEventListener('focusout', handleTooltipHide);

    // Prevent card click when clicking the info icon itself
    container.addEventListener('click', (e) => {
        if (e.target.classList.contains('info-icon')) {
            e.stopPropagation(); // Stop the click from bubbling up to the card
        }
    });
}

/**
 * Event handler to show a specific tooltip.
 * @param {Event} e - The event object (mouseover or focusin).
 */
function handleTooltipShow(e) {
    // Check if the event target is an info icon
    if (e.target.classList.contains('info-icon')) {
        const pillarId = e.target.dataset.pillarId;
        const card = e.target.closest('.pillar-card'); // Find the parent card
        if (pillarId && card) {
            // Find the corresponding tooltip text element within the card
            const tooltip = card.querySelector(`.pillar-tooltip-text[data-tooltip-for="${pillarId}"]`);
            if (tooltip) {
                tooltip.classList.add('tooltip-visible'); // Make it visible
            }
        }
    }
}

/**
 * Event handler to hide a specific tooltip.
 * @param {Event} e - The event object (mouseout or focusout).
 */
function handleTooltipHide(e) {
    // Check if the event target is an info icon
    if (e.target.classList.contains('info-icon')) {
        const pillarId = e.target.dataset.pillarId;
        const card = e.target.closest('.pillar-card'); // Find the parent card
        if (pillarId && card) {
            // Find the corresponding tooltip text element within the card
            const tooltip = card.querySelector(`.pillar-tooltip-text[data-tooltip-for="${pillarId}"]`);
            if (tooltip) {
                tooltip.classList.remove('tooltip-visible'); // Hide it
            }
        }
    }
}

// --- Progress Bar and Stats ---

/**
 * Updates the daily progress bar based on the number of active pillars for the current date.
 * Also updates the total XP and streak display.
 */
function updateProgress() {
    // Get progress bar elements
    const progressFill = document.getElementById("xp-progress");
    const totalXpSpan = document.getElementById("total-xp");
    const streakSpan = document.getElementById("current-streak");
    const progressBarText = document.getElementById("progress-bar-text");
    const progressBar = document.querySelector(".progress-bar[role='progressbar']"); // For ARIA updates

    // Validate elements exist
    if (!progressFill || !totalXpSpan || !streakSpan || !progressBarText || !progressBar) {
        console.warn("[DailyLogUI] One or more progress elements not found.");
        return;
    }

    const state = getState(); // Get current state
    // Validate necessary state properties
    if (!state || typeof state.savedDays === 'undefined' || typeof state.pillars === 'undefined' || typeof state.currentDate === 'undefined') {
        console.error("[DailyLogUI] State properties missing in updateProgress");
        // Reset display on error
        progressFill.style.width = '0%';
        progressBarText.textContent = `0/${PILLARS.length}`;
        totalXpSpan.textContent = '0';
        streakSpan.textContent = '0';
        progressBar.setAttribute('aria-valuenow', '0');
        progressBar.setAttribute('aria-valuetext', '0%');
        return;
    }

    const isSaved = state.savedDays[state.currentDate]; // Check if the current day is saved
    let activeCount = 0;
    let totalPillarsToShow = PILLARS.length; // Default total

    // Calculate active count based on mode
    if (state.userMode === 'simple' && Array.isArray(state.simpleModePillars) && state.simpleModePillars.length > 0) {
        totalPillarsToShow = state.simpleModePillars.length; // Use selected pillar count
        // Count active pillars only from the selected list
        activeCount = state.simpleModePillars.filter(id => state.pillars[id]?.days?.[state.currentDate]).length;
    } else {
        // Count active pillars from the full list
        try {
            activeCount = PILLARS.filter(p => state.pillars[p.id]?.days?.[state.currentDate]).length;
        } catch (e) {
            console.error("[DailyLogUI] Error counting active pillars:", e);
        }
    }

    // Calculate progress percentage
    const progressPercent = totalPillarsToShow > 0 ? (activeCount / totalPillarsToShow) * 100 : 0;
    const roundedPercent = Math.round(progressPercent);

    // Update progress bar text
    progressBarText.textContent = `${activeCount}/${totalPillarsToShow}`;

    // Update progress bar appearance and ARIA attributes
    if (isSaved) {
        // Style for saved day
        progressFill.classList.add("saved");
        progressFill.style.width = "100%"; // Show as full when saved
        progressBar.setAttribute('aria-valuenow', '100');
        progressBar.setAttribute('aria-valuetext', 'Day Saved');
        progressBarText.textContent = `Day Saved (${activeCount}/${totalPillarsToShow})`; // Update text
    } else {
        // Style for unsaved day
        progressFill.style.width = `${progressPercent}%`;
        progressFill.classList.remove("saved");
        progressBar.setAttribute('aria-valuenow', String(roundedPercent));
        progressBar.setAttribute('aria-valuetext', `${roundedPercent}%`);
    }

    // Update total XP and streak display
    totalXpSpan.textContent = state.totalXP || 0;
    streakSpan.textContent = state.streak || 0;
}

// --- Mood Tracker ---

/**
 * Updates the visual state of the mood tracker options based on the current date's mood.
 */
function updateMoodDisplay() {
    const state = getState();
    if (!state || typeof state.mood === 'undefined' || typeof state.currentDate === 'undefined') {
        console.error("[DailyLogUI] State or mood data missing in updateMoodDisplay");
        return;
    }

    const currentMoodLevel = state.mood[state.currentDate] || 0; // Get mood for current date (0 if none)

    // Iterate through each mood option element
    document.querySelectorAll('.mood-option').forEach(option => {
        try {
            const level = parseInt(option.dataset.level); // Get mood level from data attribute
            const isSelected = level === currentMoodLevel; // Check if this option is the selected one
            option.classList.toggle('selected', isSelected); // Add/remove 'selected' class
            option.setAttribute('aria-checked', String(isSelected)); // Update ARIA state
        } catch (e) {
            console.error("[DailyLogUI] Error updating mood option:", e, option);
        }
    });
}

/**
 * Handles clicks on mood tracker options.
 * Updates the mood state for the current date.
 * @param {Event} event - The click event object.
 */
export function handleMoodClick(event) {
    handleInteractionForAudio(); // Ensure audio context ready

    const targetOption = event.target.closest('.mood-option'); // Find the clicked mood option
    const stateRef = getStateReference(); // Get direct state reference for checks

    // Validate target and state
    if (!targetOption || !stateRef || typeof stateRef.savedDays === 'undefined' || typeof stateRef.currentDate === 'undefined') {
        console.error("[DailyLogUI] Cannot handle mood click: State invalid or target invalid.");
        return;
    }

    // Prevent changes if the day is already saved/locked
    if (stateRef.savedDays[stateRef.currentDate]) {
        showToast("Day is locked, cannot change mood.", "info");
        return;
    }

    try {
        const level = parseInt(targetOption.dataset.level); // Get level from clicked option
        if (isNaN(level)) {
            console.error("[DailyLogUI] Invalid mood level in dataset:", targetOption.dataset.level);
            return;
        }

        const currentMood = stateRef.mood[stateRef.currentDate]; // Get current mood for the date
        // If clicking the already selected mood, deselect it (set to 0). Otherwise, select the new level.
        const newLevel = (currentMood === level) ? 0 : level;

        updateMood(stateRef.currentDate, newLevel); // Update mood in state
        updateMoodDisplay(); // Refresh the mood UI
        playSound('click', 'G4', '16n'); // Play click sound

    } catch (e) {
        console.error("[DailyLogUI] Error handling mood click:", e);
    }
}

// --- Lock/Unlock Buttons ---

/**
 * Updates the visibility of the Save/Unlock buttons based on whether the current day is saved.
 */
function updateLockButtons() {
    const lockBtn = document.getElementById("lock-button");
    const unlockBtn = document.getElementById("unlock-button");

    // Validate buttons exist
    if (!lockBtn || !unlockBtn) {
        console.warn("[DailyLogUI] Lock/Unlock buttons not found.");
        return;
    }

    const state = getState();
    // Validate state
    if (!state || typeof state.savedDays === 'undefined' || typeof state.currentDate === 'undefined') {
        console.error("[DailyLogUI] State or savedDays missing in updateLockButtons");
        // Default to showing lock button on error
        lockBtn.style.display = "inline-block";
        unlockBtn.style.display = "none";
        return;
    }

    const currentDate = state.currentDate;
    const isSaved = state.savedDays[currentDate]; // Check if current day is saved

    // Toggle button visibility based on saved status
    lockBtn.style.display = isSaved ? "none" : "inline-block";
    unlockBtn.style.display = isSaved ? "inline-block" : "none";
}

// --- Level Display ---

/**
 * Updates the level progress bar, text display, and prestige stars based on total XP and prestige.
 * *** MODIFIED to control visibility of prestige stars container. ***
 */
function updateLevelDisplay() {
    // Get UI elements for level display
    const levelInfoEl = document.getElementById('level-info');
    const levelFillEl = document.getElementById('level-progress-fill');
    const levelTextEl = document.getElementById('level-progress-text');
    const levelProgressBar = document.querySelector(".level-progress-bar[role='progressbar']"); // For ARIA
    const starsContainer = document.getElementById('prestige-stars'); // Get stars container

    // Check if all elements exist
    if (!levelInfoEl || !levelFillEl || !levelTextEl || !levelProgressBar || !starsContainer) {
        console.warn("[DailyLogUI] Level display or prestige stars elements not found.");
        return;
    }

    const state = getState(); // Get current state
    // Check state validity for level calculation
    if (!state || typeof state.totalXP === 'undefined' || typeof state.prestige === 'undefined') {
        console.error("[DailyLogUI] State properties missing for level calculation");
        // Reset display on error
        levelInfoEl.textContent = "Level ?";
        levelFillEl.style.width = '0%';
        levelTextEl.textContent = "XP: ? / ?";
        levelProgressBar.setAttribute('aria-valuenow', '0');
        levelProgressBar.setAttribute('aria-valuetext', 'Level ?');
        starsContainer.innerHTML = ''; // Clear stars
        starsContainer.style.display = 'none'; // Hide container on error
        starsContainer.setAttribute('aria-label', 'Prestige Cycles'); // Reset ARIA label
        return;
    }

    try {
        // Calculate level data using the utility function
        const levelData = calculateLevelData(state.totalXP, state.prestige);

        // Populate Prestige Stars and control visibility
        starsContainer.innerHTML = ''; // Clear previous stars
        if (levelData.prestige > 0) {
            // Add one star emoji for each prestige level
            for (let i = 0; i < levelData.prestige; i++) {
                const starSpan = document.createElement('span');
                starSpan.textContent = '⭐';
                starSpan.setAttribute('aria-hidden', 'true'); // Hide decorative stars from screen readers
                starsContainer.appendChild(starSpan);
            }
            // Update the aria-label for screen readers to announce the cycle number
            starsContainer.setAttribute('aria-label', `Prestige Cycle ${levelData.prestige}`);
            // *** ADDED: Show the container if prestige > 0 ***
            starsContainer.style.display = 'block';
        } else {
             starsContainer.setAttribute('aria-label', 'Prestige Cycles'); // Reset label if prestige is 0
             // *** ADDED: Hide the container if prestige is 0 ***
             starsContainer.style.display = 'none';
        }

        // Build level display string (including level name)
        let levelDisplayText = "";
        if (levelData.levelName) {
            levelDisplayText += `${escapeHtml(levelData.levelName)} - `;
        }
        levelDisplayText += `Level ${levelData.level}`;
        levelInfoEl.textContent = levelDisplayText;

        // Add milestone class for visual flair
        levelInfoEl.classList.toggle('milestone', levelData.level % 10 === 0 && levelData.level > 0);

        // Calculate progress percentage and text for the progress bar
        let levelPercent = 0;
        let progressText = "XP: 0 / 0";
        let ariaValueText = `Level ${levelData.level}`;
        if (levelData.prestige > 0) {
            ariaValueText += `, Cycle ${levelData.prestige}`; // Add cycle to ARIA text for accessibility
        }

        if (levelData.xpNeededForNext > 0) { // If not max level (100)
            levelPercent = Math.min(100, (levelData.xpTowardsNext / levelData.xpNeededForNext) * 100);
            progressText = `XP: ${Math.floor(levelData.xpTowardsNext)} / ${Math.floor(levelData.xpNeededForNext)}`;
            ariaValueText += `, ${Math.round(levelPercent)}% to next`;
        } else if (levelData.level >= 100) { // Handle max level case
            levelPercent = 100;
            progressText = "Level 100!";
            ariaValueText += ", Max Level Reached";
        }

        // Update UI elements for the progress bar
        levelFillEl.style.width = `${levelPercent}%`;
        levelTextEl.textContent = progressText;
        levelProgressBar.setAttribute('aria-valuenow', String(Math.round(levelPercent)));
        levelProgressBar.setAttribute('aria-valuetext', ariaValueText);

    } catch (e) {
        console.error("[DailyLogUI] Error calculating or updating level display:", e);
        // Reset display on error
        levelInfoEl.textContent = "Level ?";
        levelFillEl.style.width = '0%';
        levelTextEl.textContent = "Error";
        levelProgressBar.setAttribute('aria-valuenow', '0');
        levelProgressBar.setAttribute('aria-valuetext', 'Level Error');
        starsContainer.innerHTML = ''; // Clear stars on error
        starsContainer.style.display = 'none'; // Hide container on error
        starsContainer.setAttribute('aria-label', 'Prestige Cycles');
    }
}


// --- Suggested Achievement ---

/**
 * Renders the suggested achievement section based on current progress.
 */
function renderSuggestedAchievement() {
    const container = document.getElementById('suggested-achievement-display');
    if (!container) {
        console.warn("[DailyLogUI] Suggested achievement container not found.");
        return; // Exit silently if container doesn't exist
    }

    const state = getState();
    // Validate state and suggestion function availability
    if (!state || typeof findSuggestedAchievement !== 'function') {
        console.error("[DailyLogUI] State or findSuggestedAchievement function missing.");
        container.innerHTML = `<h4>Next achievement:</h4><p class="suggestion-details">Error loading suggestion.</p>`;
        container.style.display = 'block';
        return;
    }

    // Find the next suggested achievement
    const suggestion = findSuggestedAchievement(state);
    const userName = state?.userName || 'there'; // Get username or default

    // Display the suggestion if found
    if (suggestion && suggestion.name && suggestion.description) {
        // Personalize name and description if needed
        const suggestionName = suggestion.name.replace(/\[Name\]/g, escapeHtml(userName));
        const suggestionDesc = suggestion.description.replace(/\[Name\]/g, escapeHtml(userName));
        // Update container HTML
        container.innerHTML = `
            <h4>Next achievement:</h4>
            <p class="suggestion-details">${escapeHtml(suggestionName)}. ${escapeHtml(suggestionDesc)}</p>`;
        container.style.display = 'block'; // Ensure container is visible
    } else {
        // Display a default message if no specific suggestion is found
        container.innerHTML = `
            <h4>Keep up the great work, ${escapeHtml(userName)}!</h4>
            <p class="suggestion-details">Explore your Achievements tab to see your progress.</p>`;
        container.style.display = 'block'; // Ensure container is visible
    }
}

// --- Welcome Message ---

/**
 * Updates the personalized welcome message visibility and content.
 */
function updateWelcomeMessage() {
    const welcomeContainer = document.getElementById('personalized-welcome');
    const namePlaceholder = document.getElementById('user-name-placeholder');

    // Exit if elements are missing
    if (!welcomeContainer || !namePlaceholder) {
        // console.warn("[DailyLogUI] Welcome message elements not found."); // Optional log
        return;
    }

    const state = getState();
    const userName = state?.userName; // Get username from state

    // Show message and insert name if available, otherwise hide the message
    if (userName) {
        namePlaceholder.textContent = escapeHtml(userName); // Display escaped name
        welcomeContainer.style.display = 'block'; // Show the container
    } else {
        welcomeContainer.style.display = 'none'; // Hide if no name is set
    }
}


// --- Escape Key Actions ---

/**
 * Deselects the currently selected mood option if the day is not locked.
 * Triggered by the Escape key listener in app.js.
 * @returns {boolean} True if a mood was deselected, false otherwise.
 */
export function deselectMood() {
    const selectedMoodOption = document.querySelector('.mood-option.selected');
    if (selectedMoodOption) {
        const stateRef = getStateReference();
        // Check if day is locked before deselecting
        if (!stateRef || !stateRef.savedDays || !stateRef.currentDate || stateRef.savedDays[stateRef.currentDate]) {
            return false; // Cannot deselect if day is locked or state invalid
        }
        // Update mood to 0 (deselected)
        updateMood(stateRef.currentDate, 0);
        updateMoodDisplay(); // Refresh UI
        playSound('click', 'D4', '16n'); // Play sound
        return true; // Indicate mood was deselected
    }
    return false; // No mood was selected
}

/**
 * Resets the main date display (in the header) to match the current state's date.
 * Useful after invalid date selections or when needing to ensure consistency.
 */
export function resetDateDisplay() {
    const state = getState();
    const formattedDateEl = document.getElementById('formatted-date'); // The visible date text
    const hiddenInputEl = document.getElementById('hidden-date-input'); // The actual date input

    if (state && state.currentDate) {
        // Update the hidden input value
        if (hiddenInputEl) {
            hiddenInputEl.value = state.currentDate;
        }
        // Update the visible date text using the formatting function
        if (formattedDateEl) {
            formattedDateEl.textContent = formatDate(state.currentDate);
        }
    } else {
        // Handle error case where state or date is missing
        console.error("[DailyLogUI] State or currentDate missing in resetDateDisplay");
        if (formattedDateEl) {
            formattedDateEl.textContent = "Error"; // Display error text
        }
    }
}