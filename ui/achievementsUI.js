// ui/achievementsUI.js

/**
 * Manages the UI elements and rendering for the Achievements tab,
 * including the achievement board grid and the detail modal.
 * *** MODIFIED: Ensured correct HTML structure in renderAchievementBoard. ***
 */

// --- Imports ---
import { getState, getStateReference } from '../state.js'; // State access
import { ALL_ACHIEVEMENTS } from '../achievements.js'; // Achievement definitions
import { formatDate, escapeHtml, calculateTotalAchievementsUnlocked } from '../utils.js'; // Utilities
import { playSound, handleInteractionForAudio } from '../audio.js'; // Audio feedback
// Import global UI functions if needed (e.g., showToast)
// import { showToast } from './globalUI.js'; // Assuming globalUI handles toasts

// --- Rendering Functions ---

/**
 * Renders the achievement board grid with locked/unlocked achievement cards.
 * Also updates the achievements counter (e.g., "Achievements Unlocked: X / Y").
 * *** MODIFIED: Corrected HTML structure generation. ***
 */
export function renderAchievementBoard() {
    console.log("[AchievementsUI] Rendering achievement board...");
    // Get container elements
    const gridContainer = document.getElementById('achievement-board-grid');
    const counterElement = document.getElementById('achievements-counter'); // Counter element

    // Validate elements exist
    if (!gridContainer || !counterElement) {
        console.error("[AchievementsUI] Achievement board grid container or counter element not found.");
        if (gridContainer) gridContainer.innerHTML = '<p class="error-message">Error loading achievements display.</p>';
        if (counterElement) counterElement.textContent = 'Achievements Unlocked: Error';
        return;
    }

    const state = getState(); // Get current state
    // Validate state and achievements data
    if (!state || typeof state.achievements !== 'object') {
        console.error("[AchievementsUI] State or achievements data missing/invalid in renderAchievementBoard");
        gridContainer.innerHTML = '<p class="error-message">Error loading achievements state.</p>';
        counterElement.textContent = 'Achievements Unlocked: Error';
        return;
    }

    const achievementsData = state.achievements; // User's achievement progress
    const userName = state.userName || 'You'; // Default username for flavor text

    // --- Calculate and Update Counter ---
    const totalAchievementsAvailable = Object.keys(ALL_ACHIEVEMENTS).length; // Total defined achievements
    const totalAchievementsUnlocked = calculateTotalAchievementsUnlocked(achievementsData); // Use utility
    counterElement.textContent = `Achievements Unlocked: ${totalAchievementsUnlocked} / ${totalAchievementsAvailable}`;

    // --- Prepare and Sort Achievement IDs ---
    const achievementIds = Object.keys(ALL_ACHIEVEMENTS);
    achievementIds.sort((a, b) => {
        const nameA = ALL_ACHIEVEMENTS[a]?.name || '';
        const nameB = ALL_ACHIEVEMENTS[b]?.name || '';
        return nameA.localeCompare(nameB);
    });

    // --- Generate HTML for Achievement Cards ---
    if (achievementIds.length === 0) {
        console.warn("[AchievementsUI] No achievement definitions found in ALL_ACHIEVEMENTS.");
        gridContainer.innerHTML = '<p>No achievements are defined for this application.</p>';
        return;
    }

    let achievementsHTML = '';
    achievementIds.forEach((id) => {
        const definition = ALL_ACHIEVEMENTS[id];
        const userAchievementState = achievementsData[id];

        // Ensure we have state data for the achievement before proceeding
        if (!userAchievementState) {
            console.warn(`[AchievementsUI] Missing state data for achievement ID: ${id}. Skipping card render.`);
            return; // Skip rendering this card if state is missing
        }

        const isUnlocked = userAchievementState.unlocked ?? false;
        const title = definition.name || 'Unknown Achievement';
        const icon = definition.icon || 'fa-solid fa-question-circle';
        const iconClass = `${icon} ${isUnlocked ? 'icon-unlocked' : 'icon-locked'}`;
        const cardClasses = `achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`;
        const titleId = `ach-title-${id}`; // Unique ID for the title paragraph

        // *** Ensure correct structure: icon (<i>) then title (<p>) inside .icon-container ***
        achievementsHTML += `
            <div class="${cardClasses}"
                 data-achievement-id="${id}"
                 role="button"
                 tabindex="0"
                 aria-label="View details for ${escapeHtml(title)} (${isUnlocked ? 'Unlocked' : 'Locked'})">
                <div class="icon-container">
                     <i class="${iconClass}" aria-hidden="true"></i>
                     <p class="achievement-title" id="${titleId}">${escapeHtml(title)}</p>
                </div>
            </div>
        `;
    });

    // Update the grid container's content
    gridContainer.innerHTML = achievementsHTML;

    // No need to set innerHTML again for titles if using escapeHtml during generation

    // console.log("[AchievementsUI] Achievement board rendered."); // Optional log
}

// --- Achievement Detail Modal Functions ---

/**
 * Shows the achievement detail modal and populates it with data for the specified achievement.
 * *** MODIFIED to reorder flavor text (Encouragement before Tip). ***
 * @param {string} achievementId - The ID of the achievement to display.
 */
export function showAchievementModal(achievementId) {
    // Get modal elements
    const modalOverlay = document.getElementById('achievement-detail-modal');
    const modalIcon = document.getElementById('achievement-modal-icon');
    const modalTitle = document.getElementById('achievement-modal-title');
    const modalStatus = document.getElementById('achievement-modal-status');
    const modalDesc = document.getElementById('achievement-modal-desc');
    const modalFlavor = document.getElementById('achievement-modal-flavor');
    const modalDate = document.getElementById('achievement-modal-date');
    const closeButton = document.getElementById('close-achievement-modal-btn'); // For focusing

    // Validate modal elements exist
    if (!modalOverlay || !modalIcon || !modalTitle || !modalStatus || !modalDesc || !modalFlavor || !modalDate || !closeButton) {
        console.error("[AchievementsUI] One or more achievement modal elements not found.");
        // showToast("Could not display achievement details.", "error"); // Use globalUI toast if available
        return;
    }

    // Get state and achievement data
    const state = getState();
    const definition = ALL_ACHIEVEMENTS[achievementId]; // Get base definition
    const userAchievementState = state?.achievements?.[achievementId]; // Get user's progress state
    const userName = state?.userName || 'You'; // Default username

    // Validate that achievement definition exists
    if (!definition) {
        console.error(`[AchievementsUI] Achievement definition not found for ID: ${achievementId}`);
        // showToast("Could not load achievement details (definition missing).", "error");
        return;
    }
     // Validate that achievement state exists
     if (!userAchievementState) {
        console.error(`[AchievementsUI] Achievement state not found for ID: ${achievementId}`);
        // showToast("Could not load achievement details (state missing).", "error");
        return;
    }

    // Determine unlocked status and date from user state
    const isUnlocked = userAchievementState.unlocked ?? false;
    const unlockDate = userAchievementState.date ?? null;

    // --- Populate Modal Content ---
    modalIcon.className = `${definition.icon || 'fa-solid fa-question-circle'} ${isUnlocked ? 'unlocked' : 'locked'}`;
    // Use escapeHtml for modal content that doesn't need internal HTML structure
    modalTitle.innerHTML = escapeHtml(definition.name || 'Unnamed Achievement');
    modalDesc.innerHTML = escapeHtml(definition.description || 'No description available.');

    // Status Text and Class
    if (isUnlocked) {
        modalStatus.textContent = 'Status: Unlocked!';
        modalStatus.className = 'achievement-modal-status unlocked';
    } else {
        modalStatus.textContent = 'Status: Locked';
        modalStatus.className = 'achievement-modal-status locked';
    }

    // Flavor Text: Use definition's flavor, replace [Name], split, format, and show only if unlocked and exists
    const rawFlavorText = definition.flavor || '';
    if (rawFlavorText && isUnlocked) {
        const personalizedFlavor = rawFlavorText.replace(/\[Name\]/g, escapeHtml(userName));
        const flavorParts = personalizedFlavor.split('\n'); // Split by newline
        let formattedFlavorHTML = '';

        // Assign classes based on the part number (quote, encouragement, tip) - REORDERED
        // Escape each part *individually* before wrapping in HTML
        if (flavorParts.length > 0) {
            formattedFlavorHTML += `<p class="flavor-quote">${escapeHtml(flavorParts[0].trim())}</p>`;
        }
        // *** ADDED Encouragement (Part 3 / Index 2) BEFORE Tip (Part 2 / Index 1) ***
        if (flavorParts.length > 2) {
            formattedFlavorHTML += `<p class="flavor-encouragement">${escapeHtml(flavorParts[2].trim())}</p>`;
        }
        if (flavorParts.length > 1) {
            formattedFlavorHTML += `<p class="flavor-tip">${escapeHtml(flavorParts[1].trim())}</p>`;
        }
        // Add more parts if flavor text structure changes in the future

        modalFlavor.innerHTML = formattedFlavorHTML; // Set the structured HTML
        modalFlavor.style.display = 'block'; // Show flavor text container
    } else {
        modalFlavor.innerHTML = ''; // Clear content if locked or no flavor text
        modalFlavor.style.display = 'none'; // Hide flavor text container
    }

    // Unlock Date: Format and show only if unlocked and date exists
    if (isUnlocked && unlockDate) {
        modalDate.textContent = `Unlocked on: ${formatDate(unlockDate.split('T')[0])}`; // Format date part only
        modalDate.style.display = 'block'; // Show date paragraph
    } else {
        modalDate.style.display = 'none'; // Hide if locked or no date
        modalDate.textContent = ''; // Clear content
    }

    // --- Show Modal ---
    modalOverlay.classList.add('visible'); // Make modal visible
    // Focus the close button for accessibility after a short delay for transition
    setTimeout(() => closeButton.focus({ preventScroll: true }), 50);
    playSound('click', 'C5', '16n'); // Play modal open sound
    console.log(`[AchievementsUI] Showing modal for achievement: ${achievementId}`);
}

/**
 * Hides the achievement detail modal.
 */
export function hideAchievementModal() {
    const modalOverlay = document.getElementById('achievement-detail-modal');
    if (modalOverlay && modalOverlay.classList.contains('visible')) {
        modalOverlay.classList.remove('visible'); // Hide modal
        playSound('click', 'A4', '16n'); // Play modal close sound
        // console.log("[AchievementsUI] Hiding achievement modal."); // Optional log
    }
}