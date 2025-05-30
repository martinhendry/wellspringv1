// ui/dailyLogUI.js

/**
 * Manages UI elements and rendering specifically for the Daily Log tab.
 * *** MODIFIED: Added more robust checks for element existence. ***
 */

// --- Imports ---
import { getState, getStateReference, togglePillarStatus, updateMood } from '../state.js';
import { PILLARS } from '../constants.js';
import { ALL_ACHIEVEMENTS } from '../achievements.js';
import {
    formatDate, escapeHtml, calculateLevelData, getMoodEmoji
} from '../utils.js';
import { playSound, handleInteractionForAudio } from '../audio.js';
import { findSuggestedAchievement } from '../achievementlogic.js';
import { showToast } from './globalUI.js';

// --- Constants ---
const MOOD_DESCRIPTIONS = { 1: "Worried", 2: "Confused", 3: "Neutral", 4: "Happy", 5: "Excited" };
const PILLAR_TOOLTIPS = { stillness: "Reduces stress, improves focus.", tidy: "Creates calm, reduces mental clutter.", connect: "Builds resilience, boosts happiness.", progress: "Fosters accomplishment, provides purpose.", nourish: "Engages the mind, expands knowledge.", move: "Boosts mood, improves physical health.", create: "Outlet for expression, potential for 'flow'.", unplug: "Reduces digital overload, enhances presence.", reflect: "Increases self-awareness, aids learning.", enjoy: "Cultivates appreciation, boosts positive emotions." };

// --- Module State ---
let tooltipListenersAdded = false;

// --- Core Rendering Function ---
export function refreshDailyLogUI() {
    const state = getState();
    if (!state || !state.currentDate) {
        console.error("[DailyLogUI] State or currentDate missing in refreshDailyLogUI");
        return;
    }
    renderPillarInputs();
    updateProgress();
    updateMoodDisplay();
    updateLockButtons();
    updateLevelDisplay();
    renderSuggestedAchievement();
    updateWelcomeMessage();

    const dailyLogDateEl = document.getElementById('daily-log-date');
    if (dailyLogDateEl) {
        dailyLogDateEl.textContent = formatDate(state.currentDate);
    } else {
        console.warn("[DailyLogUI] Daily log date element (#daily-log-date) not found.");
    }

    const prestigeButton = document.getElementById('prestige-button');
    if (prestigeButton) {
        try {
            const levelData = calculateLevelData(state.totalXP, state.prestige);
            prestigeButton.style.display = (levelData.level >= 100 && state.userMode !== 'simple') ? 'inline-block' : 'none';
        } catch (e) {
            console.error("[DailyLogUI] Error calculating level data for prestige button visibility:", e);
            prestigeButton.style.display = 'none';
        }
    }
}

function renderPillarInputs() {
    const container = document.getElementById('pillar-inputs');
    if (!container) {
        console.error("[DailyLogUI] CRITICAL: Pillar inputs container (#pillar-inputs) not found. Cannot render pillars.");
        return; // Stop if main container is missing
    }
    // ... (rest of renderPillarInputs logic remains the same)
    const state = getState();
    const currentPillarsState = state?.pillars;
    const currentDate = state?.currentDate;
    const userMode = state?.userMode;
    const simpleModePillars = state?.simpleModePillars || [];

    if (!currentPillarsState || !currentDate) {
        console.error("[DailyLogUI] Pillar data or current date missing in renderPillarInputs");
        container.innerHTML = '<p class="error-message">Error loading pillars.</p>';
        return;
    }

    let pillarsToDisplay = PILLARS;
    if (userMode === 'simple') {
        if (Array.isArray(simpleModePillars) && simpleModePillars.length > 0) {
            pillarsToDisplay = PILLARS.filter(pillar => simpleModePillars.includes(pillar.id));
        } else {
            console.warn("[DailyLogUI] Simple Mode active, but no pillars selected in state.");
            container.innerHTML = '<p>No pillars selected for Simple Mode. Check Settings.</p>';
            return;
        }
    }

    if (pillarsToDisplay.length === 0) {
        container.innerHTML = '<p class="error-message">Error: No pillars available to display.</p>';
    } else {
        container.innerHTML = pillarsToDisplay.map(p => {
            const pillarData = currentPillarsState[p.id];
            const isActive = currentDate && pillarData?.days?.[currentDate];
            const pillarIdLower = p.id ? p.id.toLowerCase() : '';
            const tooltipText = PILLAR_TOOLTIPS[pillarIdLower] || p.description || 'No details available.';
            const tooltipId = `tooltip-${p.id}`;
            const pillarName = p.name || 'Unknown Pillar';
            const pillarEmoji = p.emoji || '❓';
            const pillarDescription = p.description || '';
            const pillarColor = p.color || '#cccccc';

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
        attachPillarCardListeners(container);
        if (!tooltipListenersAdded) {
            addTooltipListeners(container);
            tooltipListenersAdded = true;
        }
    }
}


function updateProgress() {
    const progressFill = document.getElementById("xp-progress");
    const totalXpSpan = document.getElementById("total-xp");
    const streakSpan = document.getElementById("current-streak");
    const progressBarTextEl = document.getElementById("progress-bar-text");
    const progressBarEl = document.querySelector(".progress-bar[role='progressbar']");

    // --- MODIFIED: Check if all essential elements exist before proceeding ---
    if (!progressFill || !totalXpSpan || !streakSpan || !progressBarTextEl || !progressBarEl) {
        console.warn("[DailyLogUI] updateProgress: One or more progress elements not found. Skipping update.", {
            progressFillExists: !!progressFill,
            totalXpSpanExists: !!totalXpSpan,
            streakSpanExists: !!streakSpan,
            progressBarTextElExists: !!progressBarTextEl,
            progressBarElExists: !!progressBarEl
        });
        return; // Exit if any critical element is missing
    }
    // --- END MODIFICATION ---

    const state = getState();
    if (!state || typeof state.savedDays === 'undefined' || typeof state.pillars === 'undefined' || typeof state.currentDate === 'undefined') {
        console.error("[DailyLogUI] State properties missing in updateProgress");
        progressFill.style.width = '0%';
        progressBarTextEl.textContent = `0/${PILLARS.length}`;
        totalXpSpan.textContent = '0';
        streakSpan.textContent = '0';
        progressBarEl.setAttribute('aria-valuenow', '0');
        progressBarEl.setAttribute('aria-valuetext', '0%');
        return;
    }

    const isSaved = state.savedDays[state.currentDate];
    let activeCount = 0;
    let totalPillarsToShow = PILLARS.length;

    if (state.userMode === 'simple' && Array.isArray(state.simpleModePillars) && state.simpleModePillars.length > 0) {
        totalPillarsToShow = state.simpleModePillars.length;
        activeCount = state.simpleModePillars.filter(id => state.pillars[id]?.days?.[state.currentDate]).length;
    } else {
        try {
            activeCount = PILLARS.filter(p => state.pillars[p.id]?.days?.[state.currentDate]).length;
        } catch (e) {
            console.error("[DailyLogUI] Error counting active pillars:", e);
        }
    }

    const progressPercent = totalPillarsToShow > 0 ? (activeCount / totalPillarsToShow) * 100 : 0;
    const roundedPercent = Math.round(progressPercent);

    progressBarTextEl.textContent = `${activeCount}/${totalPillarsToShow}`;

    if (isSaved) {
        progressFill.classList.add("saved");
        progressFill.style.width = "100%";
        progressBarEl.setAttribute('aria-valuenow', '100');
        progressBarEl.setAttribute('aria-valuetext', 'Day Saved');
        progressBarTextEl.textContent = `Day Saved (${activeCount}/${totalPillarsToShow})`;
    } else {
        progressFill.style.width = `${progressPercent}%`;
        progressFill.classList.remove("saved");
        progressBarEl.setAttribute('aria-valuenow', String(roundedPercent));
        progressBarEl.setAttribute('aria-valuetext', `${roundedPercent}%`);
    }

    totalXpSpan.textContent = state.totalXP || 0;
    streakSpan.textContent = state.streak || 0;
}

// ... (rest of dailyLogUI.js, including attachPillarCardListeners, handlePillarClick, addTooltipListeners, handleTooltipShow, handleTooltipHide, updateMoodDisplay, handleMoodClick, updateLockButtons, updateLevelDisplay, renderSuggestedAchievement, updateWelcomeMessage, deselectMood, resetDateDisplay)
// Ensure these functions also have guards if they directly manipulate DOM elements that might not exist.
// For example, updateLevelDisplay:
function updateLevelDisplay() {
    const levelInfoEl = document.getElementById('level-info');
    const levelFillEl = document.getElementById('level-progress-fill');
    const levelTextEl = document.getElementById('level-progress-text');
    const levelProgressBar = document.querySelector(".level-progress-bar[role='progressbar']");
    const starsContainer = document.getElementById('prestige-stars');

    if (!levelInfoEl || !levelFillEl || !levelTextEl || !levelProgressBar || !starsContainer) {
        console.warn("[DailyLogUI] updateLevelDisplay: One or more level display elements not found. Skipping update.");
        return;
    }
    // ... rest of the function
    const state = getState();
    if (!state || typeof state.totalXP === 'undefined' || typeof state.prestige === 'undefined') {
        console.error("[DailyLogUI] State properties missing for level calculation");
        levelInfoEl.textContent = "Level ?";
        levelFillEl.style.width = '0%';
        levelTextEl.textContent = "XP: ? / ?";
        levelProgressBar.setAttribute('aria-valuenow', '0');
        levelProgressBar.setAttribute('aria-valuetext', 'Level ?');
        starsContainer.innerHTML = '';
        starsContainer.style.display = 'none';
        starsContainer.setAttribute('aria-label', 'Prestige Cycles');
        return;
    }
    try {
        const levelData = calculateLevelData(state.totalXP, state.prestige);
        starsContainer.innerHTML = '';
        if (levelData.prestige > 0) {
            for (let i = 0; i < levelData.prestige; i++) {
                const starSpan = document.createElement('span');
                starSpan.textContent = '⭐';
                starSpan.setAttribute('aria-hidden', 'true');
                starsContainer.appendChild(starSpan);
            }
            starsContainer.setAttribute('aria-label', `Prestige Cycle ${levelData.prestige}`);
            starsContainer.style.display = 'block';
        } else {
             starsContainer.setAttribute('aria-label', 'Prestige Cycles');
             starsContainer.style.display = 'none';
        }
        let levelDisplayText = "";
        if (levelData.levelName) {
            levelDisplayText += `${escapeHtml(levelData.levelName)} - `;
        }
        levelDisplayText += `Level ${levelData.level}`;
        levelInfoEl.textContent = levelDisplayText;
        levelInfoEl.classList.toggle('milestone', levelData.level % 10 === 0 && levelData.level > 0);
        let levelPercent = 0;
        let progressText = "XP: 0 / 0";
        let ariaValueText = `Level ${levelData.level}`;
        if (levelData.prestige > 0) {
            ariaValueText += `, Cycle ${levelData.prestige}`;
        }
        if (levelData.xpNeededForNext > 0) {
            levelPercent = Math.min(100, (levelData.xpTowardsNext / levelData.xpNeededForNext) * 100);
            progressText = `XP: ${Math.floor(levelData.xpTowardsNext)} / ${Math.floor(levelData.xpNeededForNext)}`;
            ariaValueText += `, ${Math.round(levelPercent)}% to next`;
        } else if (levelData.level >= 100) {
            levelPercent = 100;
            progressText = "Level 100!";
            ariaValueText += ", Max Level Reached";
        }
        levelFillEl.style.width = `${levelPercent}%`;
        levelTextEl.textContent = progressText;
        levelProgressBar.setAttribute('aria-valuenow', String(Math.round(levelPercent)));
        levelProgressBar.setAttribute('aria-valuetext', ariaValueText);
    } catch (e) {
        console.error("[DailyLogUI] Error calculating or updating level display:", e);
        levelInfoEl.textContent = "Level ?";
        levelFillEl.style.width = '0%';
        levelTextEl.textContent = "Error";
        levelProgressBar.setAttribute('aria-valuenow', '0');
        levelProgressBar.setAttribute('aria-valuetext', 'Level Error');
        starsContainer.innerHTML = '';
        starsContainer.style.display = 'none';
        starsContainer.setAttribute('aria-label', 'Prestige Cycles');
    }
}

function updateMoodDisplay() {
    const moodOptionsContainer = document.querySelector('.mood-options');
    if (!moodOptionsContainer) {
        // console.warn("[DailyLogUI] Mood options container not found in updateMoodDisplay.");
        return;
    }
    const state = getState();
    if (!state || typeof state.mood === 'undefined' || typeof state.currentDate === 'undefined') {
        console.error("[DailyLogUI] State or mood data missing in updateMoodDisplay");
        return;
    }
    const currentMoodLevel = state.mood[state.currentDate] || 0;
    moodOptionsContainer.querySelectorAll('.mood-option').forEach(option => {
        try {
            const level = parseInt(option.dataset.level);
            const isSelected = level === currentMoodLevel;
            option.classList.toggle('selected', isSelected);
            option.setAttribute('aria-checked', String(isSelected));
        } catch (e) {
            console.error("[DailyLogUI] Error updating mood option:", e, option);
        }
    });
}

function updateLockButtons() {
    const lockBtn = document.getElementById("lock-button");
    const unlockBtn = document.getElementById("unlock-button");
    if (!lockBtn || !unlockBtn) {
        // console.warn("[DailyLogUI] Lock/Unlock buttons not found in updateLockButtons.");
        return;
    }
    const state = getState();
    if (!state || typeof state.savedDays === 'undefined' || typeof state.currentDate === 'undefined') {
        console.error("[DailyLogUI] State or savedDays missing in updateLockButtons");
        lockBtn.style.display = "inline-block";
        unlockBtn.style.display = "none";
        return;
    }
    const currentDate = state.currentDate;
    const isSaved = state.savedDays[currentDate];
    lockBtn.style.display = isSaved ? "none" : "inline-block";
    unlockBtn.style.display = isSaved ? "inline-block" : "none";
}

function renderSuggestedAchievement() {
    const container = document.getElementById('suggested-achievement-display');
    if (!container) {
        // console.warn("[DailyLogUI] Suggested achievement container not found.");
        return;
    }
    const state = getState();
    if (!state || typeof findSuggestedAchievement !== 'function') {
        container.innerHTML = `<h4>Next achievement:</h4><p class="suggestion-details">Error loading suggestion.</p>`;
        container.style.display = 'block';
        return;
    }
    const suggestion = findSuggestedAchievement(state);
    const userName = state?.userName || 'there';
    if (suggestion && suggestion.name && suggestion.description) {
        const suggestionName = suggestion.name.replace(/\[Name\]/g, escapeHtml(userName));
        const suggestionDesc = suggestion.description.replace(/\[Name\]/g, escapeHtml(userName));
        container.innerHTML = `<h4>Next achievement:</h4><p class="suggestion-details">${escapeHtml(suggestionName)}. ${escapeHtml(suggestionDesc)}</p>`;
    } else {
        container.innerHTML = `<h4>Keep up the great work, ${escapeHtml(userName)}!</h4><p class="suggestion-details">Explore your Achievements tab to see your progress.</p>`;
    }
    container.style.display = 'block';
}

function updateWelcomeMessage() {
    const welcomeContainer = document.getElementById('personalized-welcome');
    const namePlaceholder = document.getElementById('user-name-placeholder');
    if (!welcomeContainer || !namePlaceholder) { return; }
    const state = getState();
    const userName = state?.userName;
    if (userName) {
        namePlaceholder.textContent = escapeHtml(userName);
        welcomeContainer.style.display = 'block';
    } else {
        welcomeContainer.style.display = 'none';
    }
}

export function handlePillarClick(cardElement) {
    handleInteractionForAudio();
    const stateRef = getStateReference();
    if (!stateRef || !stateRef.savedDays || !stateRef.currentDate) {
        showToast("Error updating pillar.", "error"); return;
    }
    if (stateRef.savedDays[stateRef.currentDate]) {
        showToast("Day is locked, cannot change pillars.", "info"); return;
    }
    const pillarId = cardElement.dataset.pillar;
    if (!pillarId || !stateRef.pillars) { return; }
    const isActive = togglePillarStatus(pillarId, stateRef.currentDate);
    cardElement.classList.toggle("active", isActive);
    cardElement.setAttribute('aria-checked', String(isActive));
    updateProgress(); // This should now be more robust
    playSound('click', isActive ? 'E4' : 'C4', '16n');
}

export function handleMoodClick(event) {
    handleInteractionForAudio();
    const targetOption = event.target.closest('.mood-option');
    const stateRef = getStateReference();
    if (!targetOption || !stateRef || typeof stateRef.savedDays === 'undefined' || typeof stateRef.currentDate === 'undefined') return;
    if (stateRef.savedDays[stateRef.currentDate]) {
        showToast("Day is locked, cannot change mood.", "info"); return;
    }
    try {
        const level = parseInt(targetOption.dataset.level);
        if (isNaN(level)) return;
        const currentMood = stateRef.mood[stateRef.currentDate];
        const newLevel = (currentMood === level) ? 0 : level;
        updateMood(stateRef.currentDate, newLevel);
        updateMoodDisplay();
        playSound('click', 'G4', '16n');
    } catch (e) { console.error("[DailyLogUI] Error handling mood click:", e); }
}

export function deselectMood() {
    const selectedMoodOption = document.querySelector('.mood-option.selected');
    if (selectedMoodOption) {
        const stateRef = getStateReference();
        if (!stateRef || !stateRef.savedDays || !stateRef.currentDate || stateRef.savedDays[stateRef.currentDate]) return false;
        updateMood(stateRef.currentDate, 0);
        updateMoodDisplay();
        playSound('click', 'D4', '16n');
        return true;
    }
    return false;
}

export function resetDateDisplay() {
    const state = getState();
    const formattedDateEl = document.getElementById('formatted-date');
    const hiddenInputEl = document.getElementById('hidden-date-input');
    if (state && state.currentDate) {
        if (hiddenInputEl) hiddenInputEl.value = state.currentDate;
        if (formattedDateEl) formattedDateEl.textContent = formatDate(state.currentDate);
    } else {
        if (formattedDateEl) formattedDateEl.textContent = "Error";
    }
}

function attachPillarCardListeners(container) {
    const handlePillarCardInteraction = (e) => {
        const card = e.target.closest('.pillar-card');
        if (!card) return;
        if (e.type === 'click' || (e.type === 'keydown' && (e.key === 'Enter' || e.key === ' '))) {
            if (e.type === 'keydown') e.preventDefault();
            if (!e.target.classList.contains('info-icon') && !e.target.classList.contains('pillar-tooltip-text')) {
                handlePillarClick(card);
            }
        }
    };
    container.removeEventListener('click', handlePillarCardInteraction); // Prevent duplicates
    container.removeEventListener('keydown', handlePillarCardInteraction); // Prevent duplicates
    container.addEventListener('click', handlePillarCardInteraction);
    container.addEventListener('keydown', handlePillarCardInteraction);
}

function addTooltipListeners(container) {
    container.addEventListener('mouseover', handleTooltipShow);
    container.addEventListener('focusin', handleTooltipShow);
    container.addEventListener('mouseout', handleTooltipHide);
    container.addEventListener('focusout', handleTooltipHide);
    container.addEventListener('click', (e) => {
        if (e.target.classList.contains('info-icon')) e.stopPropagation();
    });
}

function handleTooltipShow(e) {
    if (e.target.classList.contains('info-icon')) {
        const pillarId = e.target.dataset.pillarId;
        const card = e.target.closest('.pillar-card');
        if (pillarId && card) {
            const tooltip = card.querySelector(`.pillar-tooltip-text[data-tooltip-for="${pillarId}"]`);
            if (tooltip) tooltip.classList.add('tooltip-visible');
        }
    }
}

function handleTooltipHide(e) {
    if (e.target.classList.contains('info-icon')) {
        const pillarId = e.target.dataset.pillarId;
        const card = e.target.closest('.pillar-card');
        if (pillarId && card) {
            const tooltip = card.querySelector(`.pillar-tooltip-text[data-tooltip-for="${pillarId}"]`);
            if (tooltip) tooltip.classList.remove('tooltip-visible');
        }
    }
}
