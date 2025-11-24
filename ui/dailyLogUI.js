// ui/dailyLogUI.js

/**
 * Manages UI elements and rendering specifically for the Daily Log tab.
 * *** MODIFIED: Added debounce logic to prevent toast spam on locked days. ***
 */

// --- Imports ---
import { getState, getStateReference, togglePillarStatus, updateMood } from '../state.js';
import { PILLARS } from '../constants.js';
import {
    formatDate, escapeHtml, calculateLevelData, getMoodEmoji
} from '../utils.js';
import { playSound, handleInteractionForAudio } from '../audio.js';
import { findSuggestedAchievement } from '../achievementlogic.js';
import { showToast } from './globalUI.js';

// --- Constants ---
const PILLAR_TOOLTIPS = { stillness: "Reduces stress, improves focus.", tidy: "Creates calm, reduces mental clutter.", connect: "Builds resilience, boosts happiness.", progress: "Fosters accomplishment, provides purpose.", nourish: "Engages the mind, expands knowledge.", move: "Boosts mood, improves physical health.", create: "Outlet for expression, potential for 'flow'.", unplug: "Reduces digital overload, enhances presence.", reflect: "Increases self-awareness, aids learning.", enjoy: "Cultivates appreciation, boosts positive emotions." };

// --- Module State ---
let tooltipListenersAdded = false;
let isLockedToastActive = false; // Flag to prevent spamming the locked notification

// --- Core Rendering Function ---
export function refreshDailyLogUI() {
    const state = getState();
    if (!state || !state.currentDate) return;
    
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
    }

    const prestigeButton = document.getElementById('prestige-button');
    if (prestigeButton) {
        const levelData = calculateLevelData(state.totalXP, state.prestige);
        prestigeButton.style.display = (levelData.level >= 100 && state.userMode !== 'simple') ? 'inline-block' : 'none';
    }
}

function renderPillarInputs() {
    const container = document.getElementById('pillar-inputs');
    if (!container) return;

    const state = getState();
    const currentPillarsState = state?.pillars;
    const currentDate = state?.currentDate;
    const userMode = state?.userMode;
    const simpleModePillars = state?.simpleModePillars || [];

    if (!currentPillarsState || !currentDate) {
        container.innerHTML = '<p class="error-message">Error loading pillars.</p>';
        return;
    }

    let pillarsToDisplay = PILLARS;
    if (userMode === 'simple' && Array.isArray(simpleModePillars) && simpleModePillars.length > 0) {
        pillarsToDisplay = PILLARS.filter(pillar => simpleModePillars.includes(pillar.id));
    }

    container.innerHTML = pillarsToDisplay.map(p => {
        const pillarData = currentPillarsState[p.id];
        const isActive = currentDate && pillarData?.days?.[currentDate];
        const tooltipText = PILLAR_TOOLTIPS[p.id.toLowerCase()] || p.description;
        const pillarColor = p.color || '#cccccc';

        return `
            <div class="pillar-card ${isActive ? 'active' : ''}"
                 data-pillar="${p.id}"
                 style="--pillar-color: ${pillarColor}"
                 role="checkbox"
                 aria-checked="${isActive ? 'true' : 'false'}"
                 tabindex="0">
                <div class="pillar-header">
                     <span class="pillar-emoji" aria-hidden="true">${p.emoji}</span>
                     <h3>${escapeHtml(p.name)}</h3>
                </div>
                <div class="pillar-description">${escapeHtml(p.description)}</div>
                <div class="tooltip-container">
                    <button class="info-icon" data-pillar-id="${p.id}" aria-label="Info about ${escapeHtml(p.name)}" tabindex="0">?</button>
                </div>
                <span class="pillar-tooltip-text" role="tooltip" data-tooltip-for="${p.id}">${escapeHtml(tooltipText)}</span>
             </div>`;
    }).join('');
    
    // Re-attach listeners after rendering
    attachPillarCardListeners(container);
    if (!tooltipListenersAdded) {
        addTooltipListeners(container);
        tooltipListenersAdded = true;
    }
}

function updateProgress() {
    const progressFill = document.getElementById("xp-progress");
    const totalXpSpan = document.getElementById("total-xp");
    const streakSpan = document.getElementById("current-streak");
    const progressBarTextEl = document.getElementById("progress-bar-text");
    const progressBarEl = document.querySelector(".progress-bar[role='progressbar']");

    if (!progressFill || !totalXpSpan || !streakSpan) return;

    const state = getState();
    const isSaved = state.savedDays[state.currentDate];
    
    // Determine which pillars count towards progress
    let activeCount = 0;
    let totalPillarsToShow = PILLARS.length;
    
    if (state.userMode === 'simple' && state.simpleModePillars.length > 0) {
        totalPillarsToShow = state.simpleModePillars.length;
        activeCount = state.simpleModePillars.filter(id => state.pillars[id]?.days?.[state.currentDate]).length;
    } else {
        activeCount = PILLARS.filter(p => state.pillars[p.id]?.days?.[state.currentDate]).length;
    }

    const progressPercent = totalPillarsToShow > 0 ? (activeCount / totalPillarsToShow) * 100 : 0;
    
    progressBarTextEl.textContent = `${activeCount}/${totalPillarsToShow}`;
    totalXpSpan.textContent = state.totalXP || 0;
    streakSpan.textContent = state.streak || 0;

    if (isSaved) {
        progressFill.classList.add("saved");
        progressFill.style.width = "100%";
        progressBarEl.setAttribute('aria-valuenow', '100');
        progressBarTextEl.textContent = `Day Saved (${activeCount}/${totalPillarsToShow})`;
    } else {
        progressFill.style.width = `${progressPercent}%`;
        progressFill.classList.remove("saved");
        progressBarEl.setAttribute('aria-valuenow', String(Math.round(progressPercent)));
    }
}

function updateLevelDisplay() {
    const levelInfoEl = document.getElementById('level-info');
    const levelFillEl = document.getElementById('level-progress-fill');
    const levelTextEl = document.getElementById('level-progress-text');
    const starsContainer = document.getElementById('prestige-stars');

    if (!levelInfoEl) return;

    const state = getState();
    const levelData = calculateLevelData(state.totalXP, state.prestige);

    // Update Stars
    starsContainer.innerHTML = '⭐'.repeat(levelData.prestige);
    starsContainer.style.display = levelData.prestige > 0 ? 'block' : 'none';

    // Update Level Info
    let levelDisplayText = levelData.levelName ? `${levelData.levelName} - ` : "";
    levelDisplayText += `Level ${levelData.level}`;
    levelInfoEl.textContent = levelDisplayText;
    
    // Update Bar
    let levelPercent = 0;
    if (levelData.xpNeededForNext > 0) {
        levelPercent = Math.min(100, (levelData.xpTowardsNext / levelData.xpNeededForNext) * 100);
        levelTextEl.textContent = `XP: ${Math.floor(levelData.xpTowardsNext)} / ${Math.floor(levelData.xpNeededForNext)}`;
    } else if (levelData.level >= 100) {
        levelPercent = 100;
        levelTextEl.textContent = "Max Level Reached";
    }
    levelFillEl.style.width = `${levelPercent}%`;
}

// --- User Interaction Handlers ---

export function handlePillarClick(cardElement) {
    handleInteractionForAudio();
    const stateRef = getStateReference();
    
    // Check lock status
    if (stateRef.savedDays[stateRef.currentDate]) {
        // Anti-spam logic for the locked toast
        if (!isLockedToastActive) {
            showToast("Day is locked. Unlock to make changes.", "info");
            playSound('error', 'C3', '16n');
            isLockedToastActive = true;
            // Reset flag after 2 seconds
            setTimeout(() => { isLockedToastActive = false; }, 2000);
        }
        return;
    }

    const pillarId = cardElement.dataset.pillar;
    const isActive = togglePillarStatus(pillarId, stateRef.currentDate);
    
    cardElement.classList.toggle("active", isActive);
    cardElement.setAttribute('aria-checked', String(isActive));
    
    updateProgress(); 
    playSound('click', isActive ? 'E4' : 'C4', '16n');
}

export function handleMoodClick(event) {
    handleInteractionForAudio();
    const targetOption = event.target.closest('.mood-option');
    if (!targetOption) return;

    const stateRef = getStateReference();
    if (stateRef.savedDays[stateRef.currentDate]) {
        if (!isLockedToastActive) {
            showToast("Day is locked. Unlock to change mood.", "info");
            playSound('error', 'C3', '16n');
            isLockedToastActive = true;
            setTimeout(() => { isLockedToastActive = false; }, 2000);
        }
        return;
    }

    const level = parseInt(targetOption.dataset.level);
    const currentMood = stateRef.mood[stateRef.currentDate];
    const newLevel = (currentMood === level) ? 0 : level; // Toggle off if same
    
    updateMood(stateRef.currentDate, newLevel);
    updateMoodDisplay();
    playSound('click', 'G4', '16n');
}

// ... (Remaining helper functions like updateMoodDisplay, updateLockButtons, updateWelcomeMessage, etc. kept concise)

function updateMoodDisplay() {
    const state = getState();
    const currentMood = state.mood[state.currentDate] || 0;
    document.querySelectorAll('.mood-option').forEach(option => {
        const level = parseInt(option.dataset.level);
        option.classList.toggle('selected', level === currentMood);
        option.setAttribute('aria-checked', String(level === currentMood));
    });
}

function updateLockButtons() {
    const lockBtn = document.getElementById("lock-button");
    const unlockBtn = document.getElementById("unlock-button");
    const state = getState();
    const isSaved = state.savedDays[state.currentDate];
    if(lockBtn) lockBtn.style.display = isSaved ? "none" : "inline-block";
    if(unlockBtn) unlockBtn.style.display = isSaved ? "inline-block" : "none";
}

function renderSuggestedAchievement() {
    const container = document.getElementById('suggested-achievement-display');
    if (!container) return;
    const state = getState();
    const suggestion = findSuggestedAchievement(state);
    const userName = state?.userName || 'there';
    
    if (suggestion) {
        const name = suggestion.name.replace(/\[Name\]/g, escapeHtml(userName));
        const desc = suggestion.description.replace(/\[Name\]/g, escapeHtml(userName));
        container.innerHTML = `<h4>Next Goal:</h4><p class="suggestion-details">${name}: ${desc}</p>`;
    } else {
        container.innerHTML = `<h4>Keep going, ${escapeHtml(userName)}!</h4><p class="suggestion-details">Check the Achievements tab for progress.</p>`;
    }
    container.style.display = 'block';
}

function updateWelcomeMessage() {
    const placeholder = document.getElementById('user-name-placeholder');
    const container = document.getElementById('personalized-welcome');
    const state = getState();
    if (placeholder && container) {
        if (state.userName) {
            placeholder.textContent = escapeHtml(state.userName);
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    }
}

export function deselectMood() {
    const stateRef = getStateReference();
    if (!stateRef.savedDays[stateRef.currentDate]) {
        updateMood(stateRef.currentDate, 0);
        updateMoodDisplay();
        return true;
    }
    return false;
}

export function resetDateDisplay() {
    const state = getState();
    const dateEl = document.getElementById('formatted-date');
    const inputEl = document.getElementById('hidden-date-input');
    if (dateEl) dateEl.textContent = formatDate(state.currentDate);
    if (inputEl) inputEl.value = state.currentDate;
}

function attachPillarCardListeners(container) {
    const handler = (e) => {
        const card = e.target.closest('.pillar-card');
        if (card && !e.target.classList.contains('info-icon')) handlePillarClick(card);
    };
    // Remove old to prevent duplicates if re-rendered
    container.removeEventListener('click', handler); 
    container.addEventListener('click', handler);
}

function addTooltipListeners(container) {
    // Basic tooltip delegation logic
    container.addEventListener('mouseover', (e) => {
        if(e.target.classList.contains('info-icon')) {
            const id = e.target.dataset.pillarId;
            const tooltip = document.querySelector(`.pillar-tooltip-text[data-tooltip-for="${id}"]`);
            if(tooltip) tooltip.classList.add('tooltip-visible');
        }
    });
    container.addEventListener('mouseout', (e) => {
        if(e.target.classList.contains('info-icon')) {
            const id = e.target.dataset.pillarId;
            const tooltip = document.querySelector(`.pillar-tooltip-text[data-tooltip-for="${id}"]`);
            if(tooltip) tooltip.classList.remove('tooltip-visible');
        }
    });
}
