// ui/plannerUI.js

/**
 * Manages UI elements and rendering for the collapsible Habit Planner section
 * within the Daily Log tab.
 */

// --- Imports ---
import { getState } from '../state.js'; // State access
import { PILLARS } from '../constants.js'; // Pillar definitions
import { escapeHtml } from '../utils.js'; // Utilities
// Import global UI functions if needed (e.g., showToast, but often handled by app.js)
// import { showToast } from './globalUI.js';
// Import audio functions if needed (usually handled by app.js)
// import { playSound, handleInteractionForAudio } from '../audio.js';

// --- Initialization Functions ---

/**
 * Populates the primary pillar select dropdown in the habit planner form.
 * Ensures it only populates once.
 */
export function populatePillarSelect() {
    const primarySelectEl = document.getElementById('habit-plan-pillar-select');
    if (!primarySelectEl) {
        console.error("[PlannerUI] Primary Pillar select dropdown (#habit-plan-pillar-select) not found.");
        return;
    }
    // Check if already populated (avoids duplicates on multiple calls, e.g., if section is toggled)
    // Check if more than the default "-- Select --" option exists.
    if (primarySelectEl.options.length > 1) {
        // console.log("[PlannerUI] Primary pillar select already populated."); // Optional log
        return;
    }

    // Add options for each pillar
    PILLARS.forEach(pillar => {
        const option = document.createElement('option');
        option.value = pillar.id;
        // Display emoji and escaped pillar name
        option.textContent = `${pillar.emoji} ${escapeHtml(pillar.name)}`;
        primarySelectEl.appendChild(option);
    });
    console.log("[PlannerUI] Primary pillar select dropdown populated.");

    // Also populate the secondary dropdown when the primary is populated
    populateSecondaryPillarSelect();
}

/**
 * Populates the secondary pillar select dropdown in the habit planner form.
 * Ensures it only populates once.
 */
function populateSecondaryPillarSelect() {
    const secondarySelectEl = document.getElementById('habit-plan-secondary-pillar-select');
    if (!secondarySelectEl) {
        console.error("[PlannerUI] Secondary Pillar select dropdown (#habit-plan-secondary-pillar-select) not found.");
        return;
    }
    // Check if only the default "-- None --" option exists before populating
    if (secondarySelectEl.options.length === 1) {
        // Add options for each pillar (after the default "-- None --" option)
        PILLARS.forEach(pillar => {
            const option = document.createElement('option');
            option.value = pillar.id;
            option.textContent = `${pillar.emoji} ${escapeHtml(pillar.name)}`;
            secondarySelectEl.appendChild(option);
        });
        console.log("[PlannerUI] Secondary pillar select dropdown populated.");
    } else {
        // console.log("[PlannerUI] Secondary pillar select already populated or has unexpected initial state."); // Optional log
    }
}

// --- Form Management Functions ---

/**
 * Resets the habit planner form to its default state.
 * Clears input fields, resets dropdowns, hides the delete button,
 * and sets the default radio button selection.
 */
export function resetHabitPlanForm() {
    const form = document.getElementById('habit-plan-form');
    const planIdInput = document.getElementById('habit-plan-id');
    const deleteBtn = document.getElementById('delete-habit-plan-btn');
    const intentionRadio = document.getElementById('plan-type-intention');
    const pillarSelect = document.getElementById('habit-plan-pillar-select');
    const secondaryPillarSelect = document.getElementById('habit-plan-secondary-pillar-select');
    const activityInput = document.getElementById('habit-plan-activity');
    const cueInput = document.getElementById('habit-plan-cue');
    const anchorInput = document.getElementById('habit-plan-anchor');

    // Use form.reset() for basic fields, then handle specifics
    if (form) {
        form.reset();
    } else {
        console.warn("[PlannerUI] Habit plan form not found for reset.");
        // Manual reset if form element is missing (less ideal)
        if (pillarSelect) pillarSelect.value = "";
        if (secondaryPillarSelect) secondaryPillarSelect.value = "";
        if (activityInput) activityInput.value = "";
        if (cueInput) cueInput.value = "";
        if (anchorInput) anchorInput.value = "";
    }

    // Explicitly clear/reset specific fields after form.reset()
    if (planIdInput) planIdInput.value = ''; // Clear hidden ID
    if (deleteBtn) deleteBtn.style.display = 'none'; // Hide delete button
    if (intentionRadio) intentionRadio.checked = true; // Default to intention radio

    // Ensure input visibility matches the default radio button state
    togglePlanTypeInputs();
    // console.log("[PlannerUI] Habit plan form reset."); // Optional log
}

/**
 * Toggles the visibility of the 'Cue' input group versus the 'Anchor Habit'
 * and 'Secondary Pillar' input groups based on the selected plan type radio button.
 * Also manages the 'required' attribute for relevant inputs.
 */
export function togglePlanTypeInputs() {
    // Get relevant elements
    const intentionRadio = document.getElementById('plan-type-intention');
    const cueGroup = document.getElementById('habit-plan-cue-group');
    const anchorGroup = document.getElementById('habit-plan-anchor-group');
    const secondaryPillarGroup = document.getElementById('habit-plan-secondary-pillar-group');
    const cueInput = document.getElementById('habit-plan-cue');
    const anchorInput = document.getElementById('habit-plan-anchor');
    const secondarySelect = document.getElementById('habit-plan-secondary-pillar-select');

    // Check if all necessary elements exist
    if (!intentionRadio || !cueGroup || !anchorGroup || !secondaryPillarGroup || !cueInput || !anchorInput || !secondarySelect) {
        console.warn("[PlannerUI] Missing elements for toggling plan type inputs.");
        return;
    }

    // Determine which radio button is checked
    const isIntentionSelected = intentionRadio.checked;

    // Toggle display style for the groups
    cueGroup.style.display = isIntentionSelected ? 'block' : 'none';
    anchorGroup.style.display = isIntentionSelected ? 'none' : 'block';
    secondaryPillarGroup.style.display = isIntentionSelected ? 'none' : 'block'; // Show secondary only for stacking

    // Toggle 'required' attribute for inputs
    cueInput.required = isIntentionSelected;
    anchorInput.required = !isIntentionSelected;
    secondarySelect.required = false; // Secondary pillar is always optional

    // Clear the value of the input field that is being hidden
    if (isIntentionSelected) {
        anchorInput.value = ''; // Clear anchor habit input
        secondarySelect.value = ''; // Clear secondary pillar selection
    } else {
        cueInput.value = ''; // Clear cue input
    }
    // console.log(`[PlannerUI] Plan type inputs toggled. Is Intention: ${isIntentionSelected}`); // Optional log
}

// --- Saved Plans Rendering ---

/**
 * Renders the list of saved habit plans into the display area.
 * Fetches plans from the state, sorts them, and generates HTML for each plan item.
 */
export function renderSavedHabitPlans() {
    const displayContainer = document.getElementById('saved-plans-display');
    if (!displayContainer) {
        console.error("[PlannerUI] Saved plans display container (#saved-plans-display) not found.");
        return;
    }

    const state = getState(); // Get current state
    // Validate state and habitPlans data
    if (!state || typeof state.habitPlans !== 'object') {
        console.error("[PlannerUI] State or habitPlans data missing/invalid in renderSavedHabitPlans");
        displayContainer.innerHTML = '<h4>Your Plans:</h4><p class="error-message">Error loading saved plans.</p>';
        return;
    }

    const plans = state.habitPlans;
    const planIds = Object.keys(plans);

    // Create a map for quick pillar lookup by ID
    const pillarMap = PILLARS.reduce((map, p) => { map[p.id] = p; return map; }, {});

    // Start building HTML, always include the header
    let plansHtml = '<h4>Your Plans:</h4>';

    if (planIds.length === 0) {
        // Display message if no plans are saved
        plansHtml += '<p><small>No plans saved yet. Create one above!</small></p>';
    } else {
        // --- Sort Plans ---
        // Sort plans alphabetically by primary pillar name for consistent order
        planIds.sort((a, b) => {
            const planA = plans[a];
            const planB = plans[b];
            // Handle cases where plan data might be missing (shouldn't happen ideally)
            if (!planA || !planB) return 0;
            // Safely access pillar names using the map
            const nameA = pillarMap[planA.pillarId]?.name || '';
            const nameB = pillarMap[planB.pillarId]?.name || '';
            return nameA.localeCompare(nameB);
        });

        // --- Generate List Items ---
        plansHtml += '<ul class="saved-plans-list">'; // Start the list
        planIds.forEach(planId => {
            const plan = plans[planId];
            if (!plan) return; // Skip if plan data is somehow missing for this ID

            // Get primary pillar info safely, provide defaults
            const primaryPillarInfo = pillarMap[plan.pillarId] || { name: 'Unknown', emoji: '❓' };
            // Get secondary pillar info only if applicable (stacking type and ID exists)
            const secondaryPillarInfo = (plan.type === 'stacking' && plan.secondaryPillarId && pillarMap[plan.secondaryPillarId])
                                        ? pillarMap[plan.secondaryPillarId]
                                        : null;

            // Determine the trigger text based on plan type
            let planTrigger = '';
            if (plan.type === 'intention' && plan.cue) {
                planTrigger = `<strong>When/If:</strong> ${escapeHtml(plan.cue)}`;
            } else if (plan.type === 'stacking' && plan.anchorHabit) {
                planTrigger = `<strong>After/Before:</strong> ${escapeHtml(plan.anchorHabit)}`;
            }

            // Define the planned action text
            const planAction = `<strong>Then:</strong> ${escapeHtml(plan.activityDescription || 'No activity specified')}`;

            // Build the pillar display string (e.g., "🧘‍♂️ Stillness" or "🏃 Move + 😌 Enjoy")
            let pillarDisplay = `${primaryPillarInfo.emoji} ${escapeHtml(primaryPillarInfo.name)}`;
            if (secondaryPillarInfo) {
                pillarDisplay += ` + ${secondaryPillarInfo.emoji} ${escapeHtml(secondaryPillarInfo.name)}`;
            }

            // Build the list item HTML, including data-plan-id for edit/delete actions
            plansHtml += `
                <li class="saved-plan-item" data-plan-id="${plan.id}">
                    <div class="plan-details">
                        <span class="plan-pillar-info">${pillarDisplay}</span>
                        <p class="plan-description">
                            ${planTrigger ? planTrigger + '<br>' : ''}
                            ${planAction}
                        </p>
                    </div>
                    <div class="plan-actions">
                        <button class="edit-plan-btn plan-list-btn" data-plan-id="${plan.id}" aria-label="Edit plan for ${escapeHtml(primaryPillarInfo.name)}">Edit</button>
                        <button class="delete-plan-btn plan-list-btn" data-plan-id="${plan.id}" aria-label="Delete plan for ${escapeHtml(primaryPillarInfo.name)}">Delete</button>
                    </div>
                </li>
            `;
        });
        plansHtml += '</ul>'; // Close the list
    }
    // Update the display container's content
    displayContainer.innerHTML = plansHtml;
    // console.log("[PlannerUI] Saved habit plans rendered."); // Optional log
}

// --- Edit Plan Handling ---

/**
 * Populates the habit planner form with the data of a specific plan for editing.
 * Scrolls the form into view and focuses the first element.
 * Note: This function only populates the form; the actual update/save logic
 * is handled by the form's submit event listener in app.js.
 * @param {string} planId - The ID of the habit plan to edit.
 */
export function handleEditHabitPlan(planId) {
    // handleInteractionForAudio(); // Usually called by the triggering event handler in app.js
    console.log(`[PlannerUI] Populating form to edit habit plan: ${planId}`);
    const state = getState(); // Get current state
    const planToEdit = state?.habitPlans?.[planId]; // Find the plan in the state

    // Validate if the plan exists
    if (!planToEdit) {
        console.error(`[PlannerUI] Plan with ID ${planId} not found for editing.`);
        // showToast("Could not find plan to edit.", "error"); // Use globalUI toast if available
        return;
    }

    // Get form elements
    const form = document.getElementById('habit-plan-form');
    const planIdInput = document.getElementById('habit-plan-id');
    const pillarSelect = document.getElementById('habit-plan-pillar-select');
    const secondaryPillarSelect = document.getElementById('habit-plan-secondary-pillar-select');
    const activityInput = document.getElementById('habit-plan-activity');
    const intentionRadio = document.getElementById('plan-type-intention');
    const stackingRadio = document.getElementById('plan-type-stacking');
    const cueInput = document.getElementById('habit-plan-cue');
    const anchorInput = document.getElementById('habit-plan-anchor');
    const deleteBtn = document.getElementById('delete-habit-plan-btn');
    const plannerContent = document.getElementById('habit-planner-content'); // Collapsible content area
    const plannerToggleBtn = document.getElementById('habit-planner-toggle'); // Toggle button

    // Check if all required elements exist
    if (!form || !planIdInput || !pillarSelect || !secondaryPillarSelect || !activityInput || !intentionRadio || !stackingRadio || !cueInput || !anchorInput || !deleteBtn || !plannerContent || !plannerToggleBtn) {
        console.error("[PlannerUI] One or more form elements not found for editing plan.");
        // showToast("Error preparing form for editing.", "error");
        return;
    }

    // --- Expand Section if Collapsed ---
    // Check if the content area is hidden (based on the button's aria-expanded attribute)
    if (plannerToggleBtn.getAttribute('aria-expanded') === 'false') {
        // Call the toggle function (assuming it's available, might need import or be handled by app.js)
        // For now, let's assume app.js handles the toggle click if needed before calling this.
        // If not, you'd need to import and call toggleCollapsibleSection here.
        console.warn("[PlannerUI] Planner section was collapsed. It should ideally be expanded before calling handleEditHabitPlan.");
        // Example: toggleCollapsibleSection(plannerToggleBtn, 'habit-planner-content'); // If imported
    }

    // --- Populate Form Fields ---
    planIdInput.value = planId; // Set the hidden ID field
    pillarSelect.value = planToEdit.pillarId || ''; // Set primary pillar dropdown
    activityInput.value = planToEdit.activityDescription || ''; // Set activity description

    // Populate type-specific fields and set radio button
    if (planToEdit.type === 'stacking') {
        stackingRadio.checked = true; // Select stacking radio
        anchorInput.value = planToEdit.anchorHabit || ''; // Set anchor habit
        cueInput.value = ''; // Clear cue input
        // Set secondary pillar value (use empty string if null/undefined)
        secondaryPillarSelect.value = planToEdit.secondaryPillarId || '';
    } else { // Default to intention
        intentionRadio.checked = true; // Select intention radio
        cueInput.value = planToEdit.cue || ''; // Set cue
        anchorInput.value = ''; // Clear anchor habit input
        secondaryPillarSelect.value = ''; // Clear secondary pillar selection
    }

    // Ensure correct fields are visible based on the populated radio button
    togglePlanTypeInputs();

    // Show the delete button when editing an existing plan
    deleteBtn.style.display = 'inline-block'; // Or 'block' depending on desired layout

    // --- Focus and Scroll ---
    // Scroll the form into view smoothly
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    // Focus the first editable element (pillar select) without causing extra scroll jump
    pillarSelect.focus({ preventScroll: true });

    // playSound('click', 'E5', '16n'); // Sound usually played by the triggering event
    // showToast("Editing plan. Make changes above and click 'Save Plan'.", "info", 4000); // Notification handled by app.js
}