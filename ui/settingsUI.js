// ui/settingsUI.js

/**
 * Manages the UI elements and logic for the settings modal,
 * including populating fields based on current state and handling
 * visibility of conditional sections.
 * *** MODIFIED: Added logic for enabling Simple Mode pillar re-selection. ***
 */

// --- Imports ---
import { getState } from '../state.js'; // To get current settings
import { PILLARS } from '../constants.js'; // Pillar definitions
import { escapeHtml } from '../utils.js'; // HTML escaping utility

// --- DOM Elements ---
const settingsModal = document.getElementById('settings-modal');
const settingsForm = document.getElementById('settings-form');
const nameInput = document.getElementById('settings-name-input');
const modeFullRadio = document.getElementById('settings-mode-full');
const modeSimpleRadio = document.getElementById('settings-mode-simple');
const simpleOptionsDiv = document.getElementById('settings-simple-options');
const simpleCountFieldset = document.getElementById('settings-simple-count-fieldset'); // *** ADDED ***
const changePillarsButton = document.getElementById('settings-change-pillars-btn'); // *** ADDED ***
const pillarChecklistContainer = document.getElementById('settings-pillar-checklist-container');
const pillarChecklist = document.getElementById('settings-pillar-checklist');
const pillarInstruction = document.getElementById('settings-pillar-instruction');
const pillarCounter = document.getElementById('settings-pillar-counter');
const plannerToggleContainer = document.getElementById('settings-planner-toggle-container');
const plannerToggleCheckbox = document.getElementById('settings-planner-toggle');

// --- Modal Visibility ---

/**
 * Shows the settings modal overlay and populates it with current settings.
 * *** MODIFIED: Handles initial state of Simple Mode controls (disabled) and Change button visibility. ***
 */
export function showSettingsModal() {
    if (!settingsModal || !settingsForm) {
        console.error("[SettingsUI] Settings modal or form not found.");
        return;
    }

    const currentState = getState();
    if (!currentState) {
        console.error("[SettingsUI] Cannot show settings modal: State not available.");
        return; // Exit if state is not loaded
    }

    // --- Populate Fields ---

    // Populate Name Input
    if (nameInput) {
        nameInput.value = currentState.userName || ''; // Set to current name or empty string
    } else {
        console.warn("[SettingsUI] Name input field (#settings-name-input) not found in modal.");
    }

    // Populate Mode Radio Buttons
    let isCurrentlySimpleMode = false; // Track if the user *starts* in simple mode
    if (modeFullRadio && modeSimpleRadio) {
        if (currentState.userMode === 'simple') {
            modeSimpleRadio.checked = true;
            isCurrentlySimpleMode = true;
        } else {
            modeFullRadio.checked = true; // Default to Full if null or 'full'
        }
    } else {
        console.warn("[SettingsUI] Mode radio buttons not found.");
    }

    // Populate Simple Mode Pillar Count
    if (currentState.simpleModePillarCount) {
        const countRadio = settingsForm.querySelector(`input[name="settingsSimpleModePillarCount"][value="${currentState.simpleModePillarCount}"]`);
        if (countRadio) {
            countRadio.checked = true;
        } else {
            const defaultCountRadio = document.getElementById('settings-simple-count-3');
            if (defaultCountRadio) defaultCountRadio.checked = true;
            console.warn(`[SettingsUI] Saved simpleModePillarCount (${currentState.simpleModePillarCount}) is invalid. Defaulting to 3.`);
        }
    } else {
        // Default to 3 if count is null
        const defaultCountRadio = document.getElementById('settings-simple-count-3');
        if (defaultCountRadio) defaultCountRadio.checked = true;
    }

    // Populate Pillar Checklist
    populateSettingsPillarList(); // Populate if not already done
    // Clear existing checks first
    pillarChecklist.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    // Check the saved pillars if in simple mode
    if (isCurrentlySimpleMode && Array.isArray(currentState.simpleModePillars)) {
        currentState.simpleModePillars.forEach(pillarId => {
            const checkbox = pillarChecklist.querySelector(`input[value="${pillarId}"]`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }

    // Populate Planner Toggle Checkbox
    if (plannerToggleCheckbox) {
        plannerToggleCheckbox.checked = currentState.showPlanner === true;
    } else {
        console.warn("[SettingsUI] Planner toggle checkbox not found.");
    }

    // --- Initial Control State & Visibility ---
    updateSettingsModalVisibility(); // Update visibility based on populated mode
    updateSettingsPillarCounter(); // Update counter based on populated checks

    // *** ADDED: Handle initial disabled state for Simple Mode re-selection ***
    if (isCurrentlySimpleMode) {
        // If starting in Simple Mode, show the button and disable controls initially
        if (changePillarsButton) changePillarsButton.style.display = 'block';
        setSimpleModeControlsEnabled(false); // Disable count radios and checklist
    } else {
        // If starting in Full Mode, hide the button and ensure controls are enabled (if simple mode is selected later)
        if (changePillarsButton) changePillarsButton.style.display = 'none';
        // Controls will be enabled by updateSettingsModalVisibility if user switches to Simple
    }
    // *** END ADDED ***

    // --- Show Modal ---
    settingsModal.classList.add('visible');
    // Focus management (as before)
    if (nameInput) {
        setTimeout(() => nameInput.focus({ preventScroll: true }), 50);
    } else {
         const firstButton = settingsForm.querySelector('button, input[type="radio"], input[type="checkbox"]');
         if (firstButton) {
             setTimeout(() => firstButton.focus({ preventScroll: true }), 50);
         }
    }
    console.log("[SettingsUI] Settings modal shown and populated.");
}

/**
 * Hides the settings modal overlay.
 */
export function hideSettingsModal() {
    if (settingsModal && settingsModal.classList.contains('visible')) {
        settingsModal.classList.remove('visible');
        console.log("[SettingsUI] Settings modal hidden.");
    }
}

// --- Dynamic UI Updates ---

/**
 * Updates the visibility of Simple Mode options and Planner toggle
 * based on the selected Application Mode radio button.
 * *** MODIFIED: Handles Change Pillar button visibility and enables/disables controls. ***
 */
export function updateSettingsModalVisibility() {
    const isSimpleModeSelected = modeSimpleRadio?.checked;
    const isFullModeSelected = modeFullRadio?.checked;

    if (simpleOptionsDiv) {
        simpleOptionsDiv.style.display = isSimpleModeSelected ? 'block' : 'none';
    } else {
        console.warn("[SettingsUI] Simple mode options container not found.");
    }

    if (plannerToggleContainer) {
        plannerToggleContainer.style.display = isFullModeSelected ? 'block' : 'none';
    } else {
        console.warn("[SettingsUI] Planner toggle container not found.");
    }

    // --- Handle Change Pillar Button and Control Enabled State ---
    if (changePillarsButton) {
        // Hide the "Change Pillars" button if Full Mode is selected,
        // OR if Simple Mode is selected *now* (implying initial setup or switch)
        changePillarsButton.style.display = 'none';
    }

    // Enable Simple Mode controls ONLY if Simple Mode is selected *now*
    // If the user opened the modal while *already* in simple mode,
    // the controls remain disabled until the "Change Pillars" button is clicked.
    setSimpleModeControlsEnabled(isSimpleModeSelected);

}

/**
 * Enables or disables the Simple Mode pillar count radio buttons and pillar checklist checkboxes.
 * @param {boolean} enabled - True to enable, false to disable.
 */
function setSimpleModeControlsEnabled(enabled) {
    // Enable/disable pillar count radio buttons
    if (simpleCountFieldset) {
        const countRadios = simpleCountFieldset.querySelectorAll('input[type="radio"]');
        countRadios.forEach(radio => radio.disabled = !enabled);
        // Add/remove a class for visual styling of disabled state if needed
        simpleCountFieldset.classList.toggle('controls-disabled', !enabled);
    } else {
        console.warn("[SettingsUI] Simple mode count fieldset not found.");
    }

    // Enable/disable pillar checklist checkboxes
    if (pillarChecklist) {
        const checkboxes = pillarChecklist.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.disabled = !enabled);
         // Add/remove a class for visual styling of disabled state if needed
        pillarChecklistContainer?.classList.toggle('controls-disabled', !enabled);
    } else {
        console.warn("[SettingsUI] Settings pillar checklist not found.");
    }

    // Also update the instruction text slightly based on enabled state
    if (pillarInstruction) {
         pillarInstruction.textContent = enabled
             ? `Select ${getSelectedPillarCountRequirement()} pillars to track:`
             : `Current Simple Mode Pillars:`; // Change text when disabled
    }
}

/**
 * Function called when the "Change Pillars" button is clicked.
 * Enables the Simple Mode controls and hides the button.
 * *** NEW FUNCTION ***
 */
export function enableSimpleModeEditing() {
    console.log("[SettingsUI] Enabling Simple Mode pillar editing...");
    setSimpleModeControlsEnabled(true); // Enable controls
    if (changePillarsButton) {
        changePillarsButton.style.display = 'none'; // Hide the button after clicking
    }
    // Focus the first count radio button
    const firstCountRadio = document.getElementById('settings-simple-count-3');
    if (firstCountRadio) {
        setTimeout(() => firstCountRadio.focus({ preventScroll: true }), 50);
    }
    // Re-update counter in case it was showing old state
    updateSettingsPillarCounter();
}


/**
 * Populates the pillar selection checklist in the Settings modal if not already done.
 */
function populateSettingsPillarList() {
    if (!pillarChecklist) {
        console.error("[SettingsUI] Settings pillar checklist container (#settings-pillar-checklist) not found.");
        return;
    }

    // Avoid re-populating if already done
    if (pillarChecklist.children.length > 1) {
        return;
    }

    // Generate HTML for each pillar checkbox item
    pillarChecklist.innerHTML = PILLARS.map(pillar => {
        const checkboxId = `settings-pillar-${pillar.id}`;
        return `
            <div class="pillar-checkbox-item">
                <input type="checkbox" id="${checkboxId}" name="settingsPillars" value="${pillar.id}">
                <label for="${checkboxId}">
                    <span>${pillar.emoji}</span>
                    <span>${escapeHtml(pillar.name)}</span>
                </label>
            </div>
        `;
    }).join('');
    console.log("[SettingsUI] Settings pillar checklist populated.");
}

/** Helper function to get the currently selected pillar count requirement */
function getSelectedPillarCountRequirement() {
     const selectedCountInput = settingsForm?.querySelector('input[name="settingsSimpleModePillarCount"]:checked');
     return selectedCountInput ? parseInt(selectedCountInput.value) : 0;
}

/**
 * Updates the pillar selection counter text in the Settings modal (Simple Mode).
 */
export function updateSettingsPillarCounter() {
    if (!simpleOptionsDiv || simpleOptionsDiv.style.display === 'none') {
        return;
    }

    const requiredCount = getSelectedPillarCountRequirement();
    const checkedCheckboxes = pillarChecklist ? pillarChecklist.querySelectorAll('input[type="checkbox"]:checked').length : 0;

    // Update instruction text (might have changed if controls were disabled)
    if (pillarInstruction) {
         const controlsEnabled = !simpleCountFieldset?.classList.contains('controls-disabled');
         pillarInstruction.textContent = controlsEnabled
             ? `Select ${requiredCount} pillars to track:`
             : `Current Simple Mode Pillars:`;
    }

    // Update counter text and style
    if (pillarCounter) {
        pillarCounter.textContent = `Selected: ${checkedCheckboxes} / ${requiredCount}`;
        // Add visual feedback if count doesn't match AND controls are enabled
        const controlsEnabled = !simpleCountFieldset?.classList.contains('controls-disabled');
        if (controlsEnabled && requiredCount > 0 && checkedCheckboxes !== requiredCount) {
            pillarCounter.classList.add('count-mismatch');
        } else {
            pillarCounter.classList.remove('count-mismatch');
        }
    } else {
        console.warn("[SettingsUI] Settings pillar counter element not found.");
    }
}