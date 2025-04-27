// ui/onboardingUI.js

/**
 * Manages the UI elements and logic for the multi-step onboarding modal.
 */

// --- Imports ---
import { PILLARS } from '../constants.js'; // Pillar definitions
import { escapeHtml } from '../utils.js'; // HTML escaping utility
// Import global UI functions if needed (e.g., showToast - though maybe handled by app.js)
// import { showToast } from './globalUI.js';
// Import audio functions if needed (usually handled by app.js)
// import { playSound, handleInteractionForAudio } from '../audio.js';

// --- Modal Visibility ---

/**
 * Shows the onboarding modal overlay.
 */
export function showOnboardingModal() {
    const modalOverlay = document.getElementById('onboarding-modal');
    if (modalOverlay) {
        modalOverlay.classList.add('visible');
        // Focus the first interactive element (e.g., the first 'Next' button in step 1)
        const firstButton = modalOverlay.querySelector('#onboarding-next-1');
        if (firstButton) {
            // Delay focus slightly to ensure modal transition completes
            setTimeout(() => firstButton.focus({ preventScroll: true }), 50);
        }
        console.log("[OnboardingUI] Onboarding modal shown.");
    } else {
        console.error("[OnboardingUI] Onboarding modal overlay (#onboarding-modal) not found.");
    }
}

/**
 * Hides the onboarding modal overlay.
 */
export function hideOnboardingModal() {
    const modalOverlay = document.getElementById('onboarding-modal');
    if (modalOverlay && modalOverlay.classList.contains('visible')) {
        modalOverlay.classList.remove('visible');
        console.log("[OnboardingUI] Onboarding modal hidden.");
    } else {
        // console.warn("[OnboardingUI] Onboarding modal overlay not found or not visible."); // Optional log
    }
}

// --- Step Navigation & Content Population ---

/**
 * Navigates to a specific step within the onboarding modal.
 * Hides other steps, shows the target step, and performs step-specific setup.
 * @param {number} stepNumber - The number of the step to show (e.g., 1, 2, 3, 4, 5).
 */
export function goToOnboardingStep(stepNumber) {
    const modalOverlay = document.getElementById('onboarding-modal');
    if (!modalOverlay) {
        console.error("[OnboardingUI] Cannot navigate steps: Onboarding modal overlay not found.");
        return;
    }

    const steps = modalOverlay.querySelectorAll('.onboarding-step');
    let targetStepElement = null; // To store the step element we are navigating to

    // Hide all steps and remove active class
    steps.forEach(step => {
        step.style.display = 'none'; // Hide step
        step.classList.remove('active-step'); // Remove active class marker
        // Identify the target step element
        if (step.id === `onboarding-step-${stepNumber}`) {
            targetStepElement = step;
        }
    });

    // Show the target step and add active class
    if (targetStepElement) {
        targetStepElement.style.display = 'block'; // Show target step
        targetStepElement.classList.add('active-step'); // Mark as active
        console.log(`[OnboardingUI] Navigated to onboarding step ${stepNumber}`);

        // --- Actions specific to the target step ---
        performStepSpecificSetup(stepNumber);

        // --- Focus Management ---
        // Focus the first focusable element in the target step for accessibility
        // Prioritize input fields, then buttons
        const firstInput = targetStepElement.querySelector('input[type="text"], input[type="radio"], input[type="checkbox"], select');
        const firstButton = targetStepElement.querySelector('button'); // Find first button

        if (firstInput) {
            // Delay focus slightly to ensure the element is fully visible and ready
            setTimeout(() => firstInput.focus({ preventScroll: true }), 50);
        } else if (firstButton) {
            // Focus the first button if no input found
            setTimeout(() => firstButton.focus({ preventScroll: true }), 50);
        }

    } else {
        console.error(`[OnboardingUI] Onboarding step element for step ${stepNumber} not found.`);
    }
}

/**
 * Performs setup actions required when navigating *to* a specific step.
 * @param {number} stepNumber - The step number being navigated to.
 */
function performStepSpecificSetup(stepNumber) {
    switch (stepNumber) {
        case 1:
            // No specific setup needed for step 1 usually
            break;
        case 2:
            // Ensure name input is cleared or pre-filled if needed (usually cleared)
            const nameInput = document.getElementById('onboarding-name-input');
            if (nameInput) nameInput.value = ''; // Start with empty name field
            break;
        case 3:
            // Ensure 'Full Mode' is checked by default if re-visiting
            const fullModeRadio = document.getElementById('mode-full');
            if (fullModeRadio) fullModeRadio.checked = true;
            break;
        case 4:
            // Ensure '3 Pillars' is checked by default if re-visiting
            const count3Radio = document.getElementById('simple-count-3');
            if (count3Radio) count3Radio.checked = true;
            break;
        case 5:
            // Populate pillar list if not already done (idempotent check inside)
            populateOnboardingPillarList();
            // Update instruction and counter based on selection from step 4
            updatePillarSelectionInstructionsAndCounter();
            // Clear previous selections in the pillar list
            clearPillarSelections();
            break;
        default:
            // No specific setup for other steps
            break;
    }
}

/**
 * Populates the pillar selection checklist in Onboarding Step 5.
 * Uses the PILLARS constant.
 */
export function populateOnboardingPillarList() {
    const container = document.getElementById('onboarding-pillar-list');
    if (!container) {
        console.error("[OnboardingUI] Onboarding pillar list container (#onboarding-pillar-list) not found.");
        return;
    }

    // Avoid re-populating if already done
    if (container.children.length > 1) { // Check if more than the initial <p> exists
        // console.log("[OnboardingUI] Pillar list already populated."); // Optional log
        return;
    }

    // Generate HTML for each pillar checkbox item
    container.innerHTML = PILLARS.map(pillar => {
        const checkboxId = `onboarding-pillar-${pillar.id}`;
        return `
            <div class="pillar-checkbox-item">
                <input type="checkbox" id="${checkboxId}" name="onboardingPillars" value="${pillar.id}">
                <label for="${checkboxId}">
                    <span>${pillar.emoji}</span>
                    <span>${escapeHtml(pillar.name)}</span>
                </label>
                <small class="pillar-description-onboarding">${escapeHtml(pillar.description || '')}</small>
            </div>
        `;
    }).join('');
    console.log("[OnboardingUI] Onboarding pillar list populated.");
}

/**
 * Updates the instruction text and selection counter in Onboarding Step 5
 * based on the number of pillars chosen in Step 4.
 */
function updatePillarSelectionInstructionsAndCounter() {
    const instructionEl = document.getElementById('pillar-selection-instruction');
    const counterEl = document.getElementById('pillar-selection-counter');
    const selectedCountInput = document.querySelector('input[name="simpleModePillarCount"]:checked');
    // Determine required count, default to 3 if selection somehow missing
    const requiredCount = selectedCountInput ? parseInt(selectedCountInput.value) : 3;

    if (instructionEl) {
        instructionEl.textContent = `Select ${requiredCount} pillars to track:`;
    } else {
        console.warn("[OnboardingUI] Pillar selection instruction element not found.");
    }

    if (counterEl) {
        // Get current count of checked boxes (might be 0 initially)
        const listContainer = document.getElementById('onboarding-pillar-list');
        const currentlyChecked = listContainer ? listContainer.querySelectorAll('input[type="checkbox"]:checked').length : 0;
        counterEl.textContent = `Selected: ${currentlyChecked} / ${requiredCount}`;
    } else {
        console.warn("[OnboardingUI] Pillar selection counter element not found.");
    }
}

/**
 * Clears any existing selections in the pillar checklist (Step 5).
 * Useful when navigating back to Step 5.
 */
function clearPillarSelections() {
    const listContainer = document.getElementById('onboarding-pillar-list');
    if (listContainer) {
        const checkboxes = listContainer.querySelectorAll('input[type="checkbox"]:checked');
        checkboxes.forEach(cb => cb.checked = false);
        // console.log("[OnboardingUI] Cleared pillar selections."); // Optional log
        // Update counter after clearing
         updatePillarSelectionInstructionsAndCounter();
    }
}


/**
 * Updates the pillar selection counter text in the onboarding modal (Step 5).
 * @param {number} currentCount - The number of currently selected pillars.
 * @param {number} requiredCount - The number of pillars required based on Step 4 selection.
 */
export function updatePillarSelectionCounter(currentCount, requiredCount) {
    const counterEl = document.getElementById('pillar-selection-counter');
    if (counterEl) {
        counterEl.textContent = `Selected: ${currentCount} / ${requiredCount}`;
    }
}