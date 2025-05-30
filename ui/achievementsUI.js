// ui/achievementsUI.js

/**
 * Manages the UI elements and rendering for the Achievements tab.
 * *** MODIFIED: Added more robust checks for element existence. ***
 */

// --- Imports ---
import { getState, getStateReference } from '../state.js';
import { ALL_ACHIEVEMENTS } from '../achievements.js';
import { formatDate, escapeHtml, calculateTotalAchievementsUnlocked } from '../utils.js';
import { playSound, handleInteractionForAudio } from '../audio.js';

// --- Rendering Functions ---
export function renderAchievementBoard() {
    const gridContainer = document.getElementById('achievement-board-grid');
    const counterElement = document.getElementById('achievements-counter');

    // --- MODIFIED: More robust checks ---
    if (!gridContainer) {
        console.error("[AchievementsUI] CRITICAL: Achievement board grid container (#achievement-board-grid) not found. Cannot render board.");
        // If counter exists, we might still update it.
    }
    if (!counterElement) {
        console.error("[AchievementsUI] CRITICAL: Achievements counter element (#achievements-counter) not found. Cannot update counter.");
    }
    if (!gridContainer && !counterElement) { // If both are missing, nothing to do.
        return;
    }
    // --- END MODIFICATION ---

    const state = getState();
    if (!state || typeof state.achievements !== 'object') {
        console.error("[AchievementsUI] State or achievements data missing/invalid in renderAchievementBoard");
        if (gridContainer) gridContainer.innerHTML = '<p class="error-message">Error loading achievements state.</p>';
        if (counterElement) counterElement.textContent = 'Achievements Unlocked: Error';
        return;
    }

    const achievementsData = state.achievements;
    const userName = state.userName || 'You';
    const totalAchievementsAvailable = Object.keys(ALL_ACHIEVEMENTS).length;
    const totalAchievementsUnlocked = calculateTotalAchievementsUnlocked(achievementsData);

    if (counterElement) { // Check if counter element exists before updating
        counterElement.textContent = `Achievements Unlocked: ${totalAchievementsUnlocked} / ${totalAchievementsAvailable}`;
    }

    if (!gridContainer) return; // If grid container is missing, cannot proceed to render cards

    const achievementIds = Object.keys(ALL_ACHIEVEMENTS);
    achievementIds.sort((a, b) => (ALL_ACHIEVEMENTS[a]?.name || '').localeCompare(ALL_ACHIEVEMENTS[b]?.name || ''));

    if (achievementIds.length === 0) {
        gridContainer.innerHTML = '<p>No achievements are defined for this application.</p>';
        return;
    }

    let achievementsHTML = '';
    achievementIds.forEach((id) => {
        const definition = ALL_ACHIEVEMENTS[id];
        const userAchievementState = achievementsData[id];
        if (!userAchievementState) {
            console.warn(`[AchievementsUI] Missing state data for achievement ID: ${id}. Skipping card render.`);
            return;
        }
        const isUnlocked = userAchievementState.unlocked ?? false;
        const title = definition.name || 'Unknown Achievement';
        const icon = definition.icon || 'fa-solid fa-question-circle';
        const iconClass = `${icon} ${isUnlocked ? 'icon-unlocked' : 'icon-locked'}`;
        const cardClasses = `achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`;
        achievementsHTML += `
            <div class="${cardClasses}" data-achievement-id="${id}" role="button" tabindex="0" aria-label="View details for ${escapeHtml(title)} (${isUnlocked ? 'Unlocked' : 'Locked'})">
                <div class="icon-container">
                     <i class="${iconClass}" aria-hidden="true"></i>
                     <p class="achievement-title">${escapeHtml(title)}</p>
                </div>
            </div>`;
    });
    gridContainer.innerHTML = achievementsHTML;
}

export function showAchievementModal(achievementId) {
    const modalOverlay = document.getElementById('achievement-detail-modal');
    const modalIcon = document.getElementById('achievement-modal-icon');
    const modalTitle = document.getElementById('achievement-modal-title');
    const modalStatus = document.getElementById('achievement-modal-status');
    const modalDesc = document.getElementById('achievement-modal-desc');
    const modalFlavor = document.getElementById('achievement-modal-flavor');
    const modalDate = document.getElementById('achievement-modal-date');
    const closeButton = document.getElementById('close-achievement-modal-btn');

    if (!modalOverlay || !modalIcon || !modalTitle || !modalStatus || !modalDesc || !modalFlavor || !modalDate || !closeButton) {
        console.error("[AchievementsUI] One or more achievement modal elements not found.");
        return;
    }
    // ... (rest of showAchievementModal logic remains the same)
    const state = getState();
    const definition = ALL_ACHIEVEMENTS[achievementId];
    const userAchievementState = state?.achievements?.[achievementId];
    const userName = state?.userName || 'You';

    if (!definition || !userAchievementState) {
        console.error(`[AchievementsUI] Achievement definition or state not found for ID: ${achievementId}`);
        return;
    }

    const isUnlocked = userAchievementState.unlocked ?? false;
    const unlockDate = userAchievementState.date ?? null;

    modalIcon.className = `${definition.icon || 'fa-solid fa-question-circle'} ${isUnlocked ? 'unlocked' : 'locked'}`;
    modalTitle.innerHTML = escapeHtml(definition.name || 'Unnamed Achievement');
    modalDesc.innerHTML = escapeHtml(definition.description || 'No description available.');

    if (isUnlocked) {
        modalStatus.textContent = 'Status: Unlocked!';
        modalStatus.className = 'achievement-modal-status unlocked';
    } else {
        modalStatus.textContent = 'Status: Locked';
        modalStatus.className = 'achievement-modal-status locked';
    }

    const rawFlavorText = definition.flavor || '';
    if (rawFlavorText && isUnlocked) {
        const personalizedFlavor = rawFlavorText.replace(/\[Name\]/g, escapeHtml(userName));
        const flavorParts = personalizedFlavor.split('\n');
        let formattedFlavorHTML = '';
        if (flavorParts.length > 0) formattedFlavorHTML += `<p class="flavor-quote">${escapeHtml(flavorParts[0].trim())}</p>`;
        if (flavorParts.length > 2) formattedFlavorHTML += `<p class="flavor-encouragement">${escapeHtml(flavorParts[2].trim())}</p>`;
        if (flavorParts.length > 1) formattedFlavorHTML += `<p class="flavor-tip">${escapeHtml(flavorParts[1].trim())}</p>`;
        modalFlavor.innerHTML = formattedFlavorHTML;
        modalFlavor.style.display = 'block';
    } else {
        modalFlavor.innerHTML = '';
        modalFlavor.style.display = 'none';
    }

    if (isUnlocked && unlockDate) {
        modalDate.textContent = `Unlocked on: ${formatDate(unlockDate.split('T')[0])}`;
        modalDate.style.display = 'block';
    } else {
        modalDate.style.display = 'none';
        modalDate.textContent = '';
    }

    modalOverlay.classList.add('visible');
    setTimeout(() => closeButton.focus({ preventScroll: true }), 50);
    playSound('click', 'C5', '16n');
}

export function hideAchievementModal() {
    const modalOverlay = document.getElementById('achievement-detail-modal');
    if (modalOverlay && modalOverlay.classList.contains('visible')) {
        modalOverlay.classList.remove('visible');
        playSound('click', 'A4', '16n');
    }
}
