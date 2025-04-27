// app.js

/**
 * Main application logic for WellSpring.
 * Initializes the app, sets up event listeners, and coordinates interactions
 * between the state, UI modules, and other logic components.
 * *** MODIFIED: Added Service Worker registration. ***
 */

// --- Core Modules ---
import {
    loadState, saveState, getState, getStateReference, updateCurrentDate,
    addTimelineEntry, saveDay, unlockDayEntry, updateMood, toggleSoundEnabled,
    updateTimelineFilter, updateTimelineSortOrder, prestigeLevel, setUserName,
    saveHabitPlan, deleteHabitPlan, setOnboardingComplete, setUserMode,
    setSimpleModePillarCount, setSimpleModePillars, setShowPlanner,
    setLevel100ToastShown
} from './state.js';
import { checkAchievements } from './achievementlogic.js';
import { exportData, setupImportListener } from './datamanagement.js';
import { initializeAudio, playSound, handleInteractionForAudio } from './audio.js';
import { findFirstUsageDate, getWeekNumber, calculateLevelData, escapeHtml } from './utils.js';

// --- UI Modules ---
import { initTheme, toggleTheme, updateAudioToggleButton, showToast, showTab, updateUIVisibilityForMode } from './ui/globalUI.js';
import { refreshDailyLogUI, handlePillarClick, handleMoodClick, deselectMood, resetDateDisplay } from './ui/dailyLogUI.js';
import { renderCalendar } from './ui/calendarUI.js';
import { switchAnalyticsView, toggleAnalyticsVisibility } from './ui/analyticsUI.js';
import { renderTimeline, updateTimelineControls, setupAutoResizeTextarea, updateNoteHeaderPrompt } from './ui/timelineUI.js';
import { renderAchievementBoard, showAchievementModal, hideAchievementModal } from './ui/achievementsUI.js';
import { populatePillarSelect, resetHabitPlanForm, togglePlanTypeInputs, renderSavedHabitPlans, handleEditHabitPlan } from './ui/plannerUI.js';
import { showWelcomeMessage, showNamePromptModal, closeNamePromptModal, closeWelcomeModal } from './ui/modalsUI.js';
import { showOnboardingModal, hideOnboardingModal, goToOnboardingStep, updatePillarSelectionCounter, populateOnboardingPillarList } from './ui/onboardingUI.js';
import { toggleCollapsibleSection, closeGuide } from './ui/collapsibleUI.js';
import { showDatePicker } from './ui/datePickerUI.js';
import { showSettingsModal, hideSettingsModal, updateSettingsModalVisibility, updateSettingsPillarCounter, enableSimpleModeEditing } from './ui/settingsUI.js';


// --- Constants ---
const SAVE_DELAY = 350; // ms delay before saving state after changes
const SWIPE_THRESHOLD = 50; // Minimum horizontal distance for a swipe
const SWIPE_MAX_VERTICAL = 75; // Maximum vertical distance allowed for a horizontal swipe

// --- State ---
let saveTimeoutId = null; // For debouncing state saves
let currentAnalyticsView = 'stats'; // Track the active analytics view
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

// --- Initialization ---

/**
 * Initializes the WellSpring application.
 * *** MODIFIED: Added Service Worker registration call. ***
 */
function init() {
    console.log("[App] Initializing WellSpring v2...");
    document.body.classList.add('js-loaded');

    // 1. Load State & Initialize Core Systems
    loadState();
    initTheme();
    initializeAudio();
    registerServiceWorker(); // *** ADDED: Register the Service Worker ***

    // 2. Initial UI Setup
    updateAudioToggleButton();
    populatePillarSelect(); // For planner
    setupAutoResizeTextarea();
    setupImportListener(); // Sets up listener for the original #file-input

    // 3. Render Initial Views
    const initialStateData = getState();
    updateUIVisibilityForMode(initialStateData.userMode); // Initial visibility based on loaded mode
    updatePlannerVisibility(initialStateData.showPlanner); // Initial planner visibility
    resetDateDisplay(); // Set initial date display in header
    refreshDailyLogUI(); // Render daily log (also sets date in its header)
    showTab('daily'); // Show initial tab

    // 4. Setup Event Listeners
    setupEventListeners();

    // 5. Handle Onboarding / Initial User State
    if (!initialStateData.isOnboardingComplete) {
        console.log("[App] Onboarding not complete, showing modal.");
        showOnboardingModal();
        goToOnboardingStep(1);
    } else if (!initialStateData.userName) {
        console.log("[App] Onboarding complete but name missing, showing name prompt.");
        showNamePromptModal();
    } else {
        console.log("[App] Onboarding complete, user name exists.");
        // Update welcome message if name exists
        refreshDailyLogUI();
    }

    // 6. Initial Achievement Check
    checkAchievements(getStateReference());

    // 7. Setup Debounced Saving
    setupDebouncedSave();

    console.log("[App] WellSpring Initialization complete.");
}

// --- Service Worker Registration ---

/**
 * Registers the service worker.
 * Checks for browser support before attempting registration.
 * *** NEW FUNCTION ***
 */
function registerServiceWorker() {
    // Check if the browser supports service workers
    if ('serviceWorker' in navigator) {
        // Use window.onload to ensure the page is fully loaded before registering.
        // This prevents the SW registration from potentially delaying initial page render.
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js') // Path to your service worker file
                .then(registration => {
                    console.log('[App] Service Worker registered successfully with scope:', registration.scope);
                })
                .catch(error => {
                    console.error('[App] Service Worker registration failed:', error);
                });
        });
    } else {
        console.warn('[App] Service workers are not supported in this browser.');
    }
}


// --- Debounced Saving ---

/** Sets up the listener for the custom 'stateChanged' event to debounce saves. */
function setupDebouncedSave() {
    document.removeEventListener('stateChanged', handleStateChangeForSave); // Remove previous if any
    document.addEventListener('stateChanged', handleStateChangeForSave);
    console.log("[App] Debounced save mechanism set up.");
}

/** Handles the stateChanged event for debounced saving */
function handleStateChangeForSave(e) {
    // console.log(`[App] stateChanged event detected (Action: ${e.detail?.action}). Debouncing save...`);
    if (saveTimeoutId) {
        clearTimeout(saveTimeoutId);
    }
    saveTimeoutId = setTimeout(() => {
        // console.log("[App] Save timeout reached. Saving state...");
        saveState(`debouncedSave (trigger: ${e.detail?.action || 'unknown'})`);
        saveTimeoutId = null;
    }, SAVE_DELAY);
}


// --- Event Handlers ---

/** Handles date changes from navigation arrows or date picker input. */
function handleDateChangeInput(newDateString) {
    handleInteractionForAudio();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDateString)) {
        console.error(`[App] Invalid date string received: ${newDateString}`);
        showToast("Invalid date selected.", "error");
        resetDateDisplay(); // Reset header date display to previous valid state
        return;
    }

    const selectedDate = new Date(newDateString + 'T00:00:00Z');
    const today = new Date();
    today.setUTCHours(23, 59, 59, 999);
    if (selectedDate > today) {
        showToast("Future dates cannot be selected!", "error");
        playSound('error');
        resetDateDisplay(); // Reset header date display to previous valid state
        return;
    }

    updateCurrentDate(newDateString);
    resetDateDisplay(); // Update header date display
    refreshDailyLogUI();
    updateNoteHeaderPrompt();
    playSound('navigate', 'D5', '16n');
}

/** Handles date changes triggered by arrow buttons. */
function handleDateArrowChange(offset) {
    handleInteractionForAudio();
    const currentDateStr = getState().currentDate;
    const currentDateObj = new Date(currentDateStr + 'T00:00:00Z');
    currentDateObj.setUTCDate(currentDateObj.getUTCDate() + offset);

    const today = new Date();
    today.setUTCHours(23, 59, 59, 999);
    if (currentDateObj > today) {
        // Prevent navigating to future dates
        console.log("[App] Prevented navigation to future date.");
        playSound('error'); // Optional: Play an error/boundary sound
        return;
    }

    const newDateStr = currentDateObj.toISOString().split('T')[0];
    updateCurrentDate(newDateStr);
    resetDateDisplay(); // Update header date display
    refreshDailyLogUI();
    updateNoteHeaderPrompt();
    playSound('navigate', offset > 0 ? 'E5' : 'C5', '16n');
}

/** Handles showing the date picker modal/dialog. */
function handleShowDatePicker() {
    handleInteractionForAudio();
    showDatePicker(); // From datePickerUI.js
}

/** Handles saving the current day's entry. */
function handleSaveDay() {
    handleInteractionForAudio();
    const stateRef = getStateReference(); // Use reference for initial checks
    if (!stateRef || !stateRef.currentDate) {
        console.error("[App] Cannot save day: State or current date missing.");
        showToast("Error saving day.", "error");
        return;
    }
    const currentDate = stateRef.currentDate;
    const activePillars = Object.keys(stateRef.pillars || {}).filter(id => stateRef.pillars[id]?.days?.[currentDate]);
    const mood = stateRef.mood?.[currentDate];

    if (activePillars.length === 0 && !mood) {
        showToast("Log at least one pillar or mood to save the day.", "info");
        playSound('error');
        return;
    }

    // Call saveDay - this updates state (XP, streak, savedDays) and triggers saveState
    const saved = saveDay(currentDate);

    if (saved) {
        // Get the updated state *after* saveDay has run
        const updatedState = getState(); // Get a fresh copy
        const currentPrestige = updatedState.prestige;

        // Check achievements based on the updated state
        checkAchievements(getStateReference()); // Pass reference for efficiency if checkAchievements doesn't modify

        // Refresh UI based on the updated state
        refreshDailyLogUI();
        showToast("Day saved successfully!", "success");
        playSound('save', 'E5', '8n');

        // --- Level 100 Toast Logic ---
        try {
            const levelData = calculateLevelData(updatedState.totalXP, currentPrestige);
            // Check if level 100 reached AND toast hasn't been shown for this cycle
            if (levelData.level >= 100 && updatedState.level100ToastShownForCycle !== currentPrestige) {
                showToast("🎉 Level 100! Ready for the next Cycle? Find the button on the Journey tab!", "info", 8000);
                setLevel100ToastShown(currentPrestige); // Update state to mark toast as shown for this cycle
                playSound('achievement'); // Play a sound for reaching level 100
            }
        } catch(e) {
            console.error("[App] Error checking for Level 100 toast:", e);
        }
        // --- End Level 100 Toast Logic ---


        // --- Note Prompt Logic ---
        const isSunday = new Date(currentDate + 'T00:00:00Z').getUTCDay() === 0;
        const noteTextArea = document.getElementById('new-note-textarea');
        const journeyTabButton = document.querySelector('.tab-button[data-tab="journey"]');
        const weekId = getWeekNumber(currentDate);
        const hasWeeklyNote = updatedState.timeline.some(e => // Use updatedState here
            e?.type === 'note' &&
            e.text?.toLowerCase().includes('#weeklyreflection') &&
            getWeekNumber(e.date?.split('T')[0]) === weekId
        );
        const hasAnyNoteToday = updatedState.timeline.some(e => e?.type === 'note' && e.date?.startsWith(currentDate)); // Use updatedState here

        // Sunday Reflection Prompt
        if (isSunday && noteTextArea && journeyTabButton && !hasWeeklyNote) {
            setTimeout(() => {
                if (confirm("It's Sunday! Would you like to add a weekly reflection note now?")) {
                    showTab('journey');
                    updateNoteHeaderPrompt();
                    noteTextArea.value = "#WeeklyReflection ";
                    noteTextArea.focus({ preventScroll: true });
                    requestAnimationFrame(() => {
                        noteTextArea.style.height = 'auto';
                        noteTextArea.style.height = `${noteTextArea.scrollHeight}px`;
                    });
                }
            }, 600);
        }
        // General Gratitude/Reflection Prompt
        else if (!isSunday && noteTextArea && journeyTabButton && !hasAnyNoteToday) {
             setTimeout(() => {
                if (confirm("Day saved! Add a quick gratitude or reflection note to your Journey?")) {
                    showTab('journey');
                    updateNoteHeaderPrompt();
                    noteTextArea.value = "";
                    noteTextArea.focus({ preventScroll: true });
                    requestAnimationFrame(() => {
                        noteTextArea.style.height = 'auto';
                        noteTextArea.style.height = `${noteTextArea.scrollHeight}px`;
                    });
                }
            }, 600);
        }
        // --- End Note Prompt Logic ---

    } else {
        showToast("This day is already saved.", "info");
    }
}


/** Handles unlocking the current day's entry. */
function handleUnlockDay() {
    handleInteractionForAudio();
    const state = getState();
    if (!state || !state.currentDate) {
        console.error("[App] Cannot unlock day: State or current date missing.");
        return;
    }
    if (confirm("Are you sure you want to unlock this day? This allows editing but removes the 'saved' status and may affect your streak.")) {
        const unlocked = unlockDayEntry(state.currentDate);
        if (unlocked) {
            refreshDailyLogUI();
            showToast("Day unlocked for editing.", "info");
            playSound('unlock', 'C4', '8n');
        }
    }
}

/** Handles adding a custom note to the timeline. */
function handleAddNote() {
    handleInteractionForAudio();
    const textarea = document.getElementById("new-note-textarea");
    if (!textarea) { console.error("[App] Textarea not found."); return; }

    const noteText = textarea.value.trim();
    if (!noteText) {
        showToast("Please enter some text for your note.", "info");
        playSound('error');
        return;
    }

    // addTimelineEntry handles adding XP and saving state
    addTimelineEntry({ type: 'note', text: noteText, date: new Date().toISOString() });

    showToast("Note added to timeline.", "success");
    textarea.value = "";
    setupAutoResizeTextarea(); // Reset height
    renderTimeline(); // Refresh timeline view
    playSound('save', 'D5', '16n');

    // Check achievements *after* note XP is added and state is saved
    checkAchievements(getStateReference());
    refreshDailyLogUI(); // Refresh daily log to update XP display
}

/** Handles clicking the Prestige button. */
function handlePrestigeClick() {
    handleInteractionForAudio();
    const state = getState();
    if (!state) return;

    const levelData = calculateLevelData(state.totalXP, state.prestige);
    if (levelData.level < 100) {
        showToast("You must reach Level 100 to enter the next Cycle!", "info");
        playSound('error');
        return;
    }

    if (confirm(`Are you sure you want to begin Cycle ${levelData.prestige + 1}? Your Level and XP will reset, but your progress and achievements remain.`)) {
        const prestigeSuccess = prestigeLevel(); // This resets XP, increments prestige, resets toast tracker, and saves state

        if (prestigeSuccess) {
            refreshDailyLogUI(); // Refresh UI to show reset level/XP and new cycle
            renderTimeline(); // Refresh timeline to show prestige entry
            showToast(`Congratulations! You've entered Cycle ${getState().prestige}!`, "success", 5000);
            playSound('achievement');
        } else {
            showToast("An error occurred while trying to prestige.", "error");
            playSound('error');
        }
    }
}


/** Handles saving or updating a habit plan from the form. */
function handleSaveHabitPlan(event) {
    event.preventDefault(); // Prevent default form submission
    handleInteractionForAudio();
    const form = event.target.closest('form'); // Ensure we get the form element
    if (!form) {
        console.error("[App] Could not find habit plan form.");
        return;
    }
    const formData = new FormData(form);
    const planId = formData.get('planId') || null;

    const planData = {
        id: planId || crypto.randomUUID(),
        pillarId: formData.get('pillarId'),
        activityDescription: formData.get('activityDescription')?.trim(),
        type: formData.get('planType'),
        cue: formData.get('planType') === 'intention' ? formData.get('cue')?.trim() : null,
        anchorHabit: formData.get('planType') === 'stacking' ? formData.get('anchorHabit')?.trim() : null,
        secondaryPillarId: formData.get('planType') === 'stacking' ? (formData.get('secondaryPillarId') || null) : null,
    };

    // Validation
    let isValid = true;
    let errorMessage = '';
    if (!planData.pillarId) { isValid = false; errorMessage = "Please select a primary pillar."; }
    else if (!planData.activityDescription) { isValid = false; errorMessage = "Please describe the activity."; }
    else if (planData.type === 'intention' && !planData.cue) { isValid = false; errorMessage = "Please provide the 'When/If' cue."; }
    else if (planData.type === 'stacking' && !planData.anchorHabit) { isValid = false; errorMessage = "Please provide the 'After/Before' anchor habit."; }

    if (!isValid) {
        showToast(errorMessage, "error");
        playSound('error');
        return;
    }

    const success = saveHabitPlan(planData);

    if (success) {
        showToast(`Habit plan ${planId ? 'updated' : 'saved'}!`, "success");
        playSound('save', 'D5', '8n');
        resetHabitPlanForm();
        renderSavedHabitPlans();
    } else {
        showToast("Error saving habit plan.", "error");
        playSound('error');
    }
}

/** Handles deleting a habit plan. */
function handleDeleteHabitPlan(planId) {
    handleInteractionForAudio();
    if (!planId) { console.warn("[App] Delete plan called without ID."); return; }
    const planName = getState().habitPlans?.[planId]?.activityDescription || 'this plan';

    if (confirm(`Delete plan: "${escapeHtml(planName)}"?`)) {
        const deleted = deleteHabitPlan(planId);
        if (deleted) {
            showToast("Habit plan deleted.", "success");
            playSound('delete', 'C3', '8n');
            resetHabitPlanForm();
            renderSavedHabitPlans();
        } else {
            showToast("Could not find plan to delete.", "error");
            playSound('error');
        }
    }
}

/** Handles saving the user's name from a prompt modal. */
function handleSaveName(fromOnboarding = false) {
    handleInteractionForAudio();
    const inputId = fromOnboarding ? 'onboarding-name-input' : 'name-input';
    const nameInput = document.getElementById(inputId);
    if (!nameInput) { console.error(`[App] Name input (#${inputId}) not found.`); return false; }

    const name = nameInput.value.trim();
    if (name) {
        setUserName(name); // This saves state
        if (!fromOnboarding) {
            closeNamePromptModal(); // Use correct function name
            showToast(`Welcome, ${escapeHtml(name)}!`, "success");
            refreshDailyLogUI(); // Refresh to show personalized welcome
        }
        playSound('save', 'G5', '8n');
        return true;
    } else {
        showToast("Please enter your name.", "info");
        playSound('error');
        nameInput.focus();
        return false;
    }
}

/** Handles completing the final step of the onboarding process. */
function handleCompleteOnboarding() {
    handleInteractionForAudio();
    console.log("[App] Handling complete onboarding...");

    const nameSaved = handleSaveName(true);
    if (!nameSaved) return;

    const selectedMode = document.querySelector('input[name="onboardingMode"]:checked')?.value || 'full';
    let selectedPillarIds = [];
    let validationPassed = true;
    let simpleModeCount = null;

    if (selectedMode === 'simple') {
        const requiredCountInput = document.querySelector('input[name="simpleModePillarCount"]:checked');
        const requiredCount = requiredCountInput ? parseInt(requiredCountInput.value) : 0;
        simpleModeCount = requiredCount || null;
        const listContainer = document.getElementById('onboarding-pillar-list');
        const selectedCheckboxes = listContainer ? listContainer.querySelectorAll('input[type="checkbox"]:checked') : [];
        selectedPillarIds = Array.from(selectedCheckboxes).map(cb => cb.value);

        if (!simpleModeCount || ![3, 5, 7].includes(simpleModeCount)) {
             showToast("Please select a valid pillar count (3, 5, or 7).", "error");
             playSound('error');
             validationPassed = false;
        } else if (requiredCount > 0 && selectedPillarIds.length !== requiredCount) {
            showToast(`Please select exactly ${requiredCount} pillars.`, "error");
            playSound('error');
            validationPassed = false;
        }
    }

    if (validationPassed) {
        setUserMode(selectedMode);
        if (selectedMode === 'simple') {
            setSimpleModePillarCount(simpleModeCount);
            setSimpleModePillars(selectedPillarIds);
        }
        setOnboardingComplete(true);

        hideOnboardingModal();
        updateUIVisibilityForMode(selectedMode); // Update UI based on selected mode
        updatePlannerVisibility(getState().showPlanner); // Update planner visibility
        refreshDailyLogUI(); // Refresh daily log (will show correct pillars)
        showToast("Setup complete! Welcome to WellSpring.", "success");
        playSound('achievement');
        console.log(`[App] Onboarding completed. Mode: ${selectedMode}.`);
    }
}

/** Handles saving the settings form. */
function handleSaveSettings(event) {
    event.preventDefault(); // Prevent default form submission
    handleInteractionForAudio();
    console.log("[App] Saving settings...");

    const form = document.getElementById('settings-form');
    if (!form) {
        console.error("[App] Settings form not found.");
        showToast("Error saving settings.", "error");
        return;
    }

    const formData = new FormData(form);
    const selectedMode = formData.get('settingsMode');
    const showPlannerSetting = formData.get('settingsShowPlanner') === 'on'; // Checkbox value is 'on' if checked
    const newName = formData.get('settingsUserName')?.trim();

    let simpleModeCount = null;
    let selectedPillarIds = [];
    let validationPassed = true;

    // Validate Simple Mode selections ONLY if Simple Mode is chosen
    if (selectedMode === 'simple') {
        const requiredCountValue = formData.get('settingsSimpleModePillarCount');
        simpleModeCount = requiredCountValue ? parseInt(requiredCountValue) : null;
        selectedPillarIds = formData.getAll('settingsPillars'); // Get all checked pillar checkboxes

        if (!simpleModeCount || ![3, 5, 7].includes(simpleModeCount)) {
            showToast("Invalid pillar count selected for Simple Mode.", "error");
            playSound('error');
            validationPassed = false;
        } else if (selectedPillarIds.length !== simpleModeCount) {
            showToast(`Please select exactly ${simpleModeCount} pillars for Simple Mode.`, "error");
            playSound('error');
            validationPassed = false;
        }
    }

    if (validationPassed) {
        // Save settings to state
        setUserName(newName); // Handles trimming and setting to null if empty

        setUserMode(selectedMode);
        setShowPlanner(showPlannerSetting);
        if (selectedMode === 'simple') {
            setSimpleModePillarCount(simpleModeCount);
            setSimpleModePillars(selectedPillarIds);
        } else {
            // Clear simple mode settings if switching to full
            setSimpleModePillarCount(null);
            setSimpleModePillars([]);
        }

        // Update UI based on new settings
        updateUIVisibilityForMode(selectedMode);
        updatePlannerVisibility(showPlannerSetting);
        refreshDailyLogUI(); // Refresh daily log to show correct pillars/planner and potentially updated welcome message

        hideSettingsModal();
        showToast("Settings saved successfully!", "success");
        playSound('save', 'F5', '8n');
        console.log(`[App] Settings saved. Name: ${newName}, Mode: ${selectedMode}, Show Planner: ${showPlannerSetting}`);
    }
}

/**
 * Updates the visibility of the Habit Planner section based on state.
 * @param {boolean} show - Whether to show the planner section.
 */
function updatePlannerVisibility(show) {
    const plannerSection = document.querySelector('.habit-planner-section');
    const plannerToggleBtn = document.getElementById('habit-planner-toggle');

    if (plannerSection && plannerToggleBtn) {
        const shouldBeVisible = show && (getState().userMode !== 'simple'); // Show only if setting is true AND mode is not simple
        plannerSection.style.display = shouldBeVisible ? 'block' : 'none';

        // Ensure the collapsible state matches visibility
        if (!shouldBeVisible && plannerToggleBtn.getAttribute('aria-expanded') === 'true') {
            // If planner should be hidden but is expanded, collapse it
            toggleCollapsibleSection(plannerToggleBtn, 'habit-planner-content');
        }
    } else {
        console.warn("[App] Planner section or toggle button not found for visibility update.");
    }
}

// --- Swipe Navigation Handlers ---
/**
 * Records the starting touch position.
 * @param {TouchEvent} event - The touchstart event.
 */
function handleTouchStart(event) {
    // Check if the touch starts on an element that should allow default scrolling/interaction
    const targetElement = event.target;
    const allowScrollElements = ['textarea', 'select', '.calendar-grid', '.timeline-entries', '.achievement-board-grid', '.guide-content-inner', '#saved-plans-display', '.pillar-checkbox-grid', '.modal-content']; // Added modal-content
    if (allowScrollElements.some(selector => targetElement.closest(selector))) {
        touchStartX = null; // Reset startX to prevent swipe detection on these elements
        return;
    }

    // Record start position for potential swipe
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    touchEndX = touchStartX; // Initialize end points
    touchEndY = touchStartY;
}

/**
 * Records the current touch position during movement.
 * @param {TouchEvent} event - The touchmove event.
 */
function handleTouchMove(event) {
    if (touchStartX === null) return; // Don't track if swipe is disallowed for this element

    touchEndX = event.touches[0].clientX;
    touchEndY = event.touches[0].clientY;
}

/**
 * Determines if a swipe occurred and switches tabs accordingly.
 * @param {TouchEvent} event - The touchend event.
 */
function handleTouchEnd(event) {
    if (touchStartX === null) return; // Swipe detection was disabled for the starting element

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Check if it's primarily a horizontal swipe and exceeds threshold
    if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaY) < SWIPE_MAX_VERTICAL) {
        handleInteractionForAudio(); // Ensure audio context is ready

        // Get currently visible tab buttons (respecting Simple Mode hiding)
        const tabButtons = Array.from(document.querySelectorAll('.nav-tabs .tab-button:not([aria-hidden="true"])'));
        const currentTabIndex = tabButtons.findIndex(btn => btn.classList.contains('active'));
        let nextTabIndex = -1;

        if (deltaX < 0) { // Swipe Left (move to next tab)
            nextTabIndex = currentTabIndex + 1;
            if (nextTabIndex >= tabButtons.length) {
                nextTabIndex = tabButtons.length - 1; // Stop at last visible tab
            }
        } else { // Swipe Right (move to previous tab)
            nextTabIndex = currentTabIndex - 1;
            if (nextTabIndex < 0) {
                nextTabIndex = 0; // Stop at first visible tab
            }
        }

        // Switch tab if index is valid and different
        if (nextTabIndex !== -1 && nextTabIndex !== currentTabIndex) {
            const nextTabButton = tabButtons[nextTabIndex];
            const nextTabId = nextTabButton?.dataset.tab;

            if (nextTabId) {
                console.log(`[App] Swipe detected. Switching to tab: ${nextTabId}`);
                // Simulate clicking the tab button - reuse existing logic
                 if (nextTabId === 'calendar') { handleShowCalendarTab(); }
                 else if (nextTabId === 'journey') { renderTimeline(); updateTimelineControls(); updateNoteHeaderPrompt(); showTab(nextTabId); }
                 else if (nextTabId === 'achievements') { renderAchievementBoard(); showTab(nextTabId); }
                 else { showTab(nextTabId); } // Handles 'daily' and potentially others
                 playSound('navigate', deltaX < 0 ? 'E5' : 'C5', '16n'); // Play sound for swipe
            }
        }
    }

    // Reset touch coordinates
    touchStartX = 0;
    touchStartY = 0;
    touchEndX = 0;
    touchEndY = 0;
}


// --- Event Listener Setup ---

/**
 * Attaches all primary event listeners for the application.
 */
function setupEventListeners() {
    console.log("[App] Setting up event listeners...");

    // Theme Toggle
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        handleInteractionForAudio(); // Ensure audio ready
        toggleTheme((newTheme) => {
            // Re-render theme-sensitive components if needed
            const analyticsContainer = document.getElementById('analytics-container');
            if (analyticsContainer && analyticsContainer.style.display === 'block') {
                switchAnalyticsView(currentAnalyticsView); // Re-render analytics view
            }
            const achievementsTab = document.getElementById('achievements');
            if (achievementsTab?.classList.contains('active')) {
                renderAchievementBoard(); // Re-render achievements
            }
        });
        playSound('click', 'E5', '16n'); // Play sound after toggle
    });


    // Audio Toggle
    document.getElementById('audio-toggle')?.addEventListener('click', () => {
        handleInteractionForAudio(); toggleSoundEnabled(); updateAudioToggleButton(); playSound('click', getStateReference().isSoundEnabled ? 'C5' : 'C4', '8n');
    });

    // Settings Button Listener
    document.getElementById('settings-btn')?.addEventListener('click', () => {
        handleInteractionForAudio();
        showSettingsModal();
        playSound('click', 'B4', '16n');
    });

    // Tab Navigation
    document.querySelector('.nav-tabs')?.addEventListener('click', (e) => {
        if (e.target.matches('.tab-button')) {
            handleInteractionForAudio();
            const tabId = e.target.dataset.tab;
            if (tabId) {
                if (tabId === 'calendar') { handleShowCalendarTab(); }
                else if (tabId === 'journey') { renderTimeline(); updateTimelineControls(); updateNoteHeaderPrompt(); showTab(tabId); }
                else if (tabId === 'achievements') { renderAchievementBoard(); showTab(tabId); }
                else { showTab(tabId); }
            }
        }
    });

    // Date Navigation & Picker
    document.getElementById('prev-day-btn')?.addEventListener('click', () => handleDateArrowChange(-1));
    document.getElementById('next-day-btn')?.addEventListener('click', () => handleDateArrowChange(1));
    document.getElementById('formatted-date')?.addEventListener('click', handleShowDatePicker);
    document.getElementById('hidden-date-input')?.addEventListener('change', (e) => handleDateChangeInput(e.target.value));

    // Daily Log Interactions
    // Pillar clicks handled by delegated listener in dailyLogUI.js -> handlePillarClick
    document.getElementById('pillar-inputs')?.addEventListener('click', (e) => {
        const card = e.target.closest('.pillar-card');
        if (card && !e.target.classList.contains('info-icon')) { // Ignore clicks on info icon
            handlePillarClick(card); // Calls audio interaction internally
        }
    });
    document.getElementById('pillar-inputs')?.addEventListener('keydown', (e) => {
        const card = e.target.closest('.pillar-card');
        if (card && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault(); // Prevent space scrolling
            handlePillarClick(card); // Calls audio interaction internally
        }
    });
    document.querySelector('.mood-options')?.addEventListener('click', handleMoodClick); // Calls audio interaction internally
    document.getElementById('lock-button')?.addEventListener('click', handleSaveDay); // Calls audio interaction internally
    document.getElementById('unlock-button')?.addEventListener('click', handleUnlockDay); // Calls audio interaction internally

    // Journey Tab
    document.getElementById('add-note-btn')?.addEventListener('click', handleAddNote); // Calls audio interaction internally
    document.getElementById('timeline-filter')?.addEventListener('change', (e) => {
        handleInteractionForAudio(); updateTimelineFilter(e.target.value); renderTimeline(); playSound('click', 'D5', '16n');
    });
    document.getElementById('timeline-sort')?.addEventListener('change', (e) => {
        handleInteractionForAudio(); updateTimelineSortOrder(e.target.value); renderTimeline(); playSound('click', 'E5', '16n');
    });
    document.getElementById('prestige-button')?.addEventListener('click', handlePrestigeClick); // Calls audio interaction internally
    document.getElementById('new-note-textarea')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { // Submit on Enter, allow Shift+Enter for new lines (optional)
            e.preventDefault(); // Prevent default newline insertion
            handleAddNote(); // Call the existing add note handler
        }
    });

    // Calendar Tab
    document.getElementById('calendar-grid')?.addEventListener('click', (e) => {
        const dayCell = e.target.closest('.calendar-day:not(.disabled)');
        if (dayCell?.dataset.date) { handleInteractionForAudio(); handleDateChangeInput(dayCell.dataset.date); showTab('daily'); playSound('click', 'E5', '16n'); }
    });
    document.getElementById('prev-month-btn')?.addEventListener('click', () => handleMonthChange(-1)); // Calls audio interaction internally
    document.getElementById('next-month-btn')?.addEventListener('click', () => handleMonthChange(1)); // Calls audio interaction internally
    document.getElementById('view-analytics-btn')?.addEventListener('click', () => {
         handleInteractionForAudio(); toggleAnalyticsVisibility(); playSound('click', 'B4', '16n');
    });
    document.getElementById('analytics-toggles')?.addEventListener('click', (e) => {
        if (e.target.matches('button')) {
            const view = e.target.dataset.view;
            if (view && view !== currentAnalyticsView) { handleInteractionForAudio(); switchAnalyticsView(view); playSound('click', 'G4', '16n'); }
        }
    });

    // Achievements Tab
    document.getElementById('achievement-board-grid')?.addEventListener('click', (e) => {
        const card = e.target.closest('.achievement-card');
        if (card?.dataset.achievementId) { handleInteractionForAudio(); showAchievementModal(card.dataset.achievementId); } // showAchievementModal plays sound
    });
    document.getElementById('achievement-board-grid')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const card = e.target.closest('.achievement-card');
            if (card?.dataset.achievementId) { e.preventDefault(); handleInteractionForAudio(); showAchievementModal(card.dataset.achievementId); } // showAchievementModal plays sound
        }
    });

    // Modals
    document.getElementById('dismiss-welcome-btn')?.addEventListener('click', () => { handleInteractionForAudio(); closeWelcomeModal(); playSound('save', 'E5', '8n'); });
    document.querySelector('#welcome-modal .modal-close-btn')?.addEventListener('click', () => { handleInteractionForAudio(); closeWelcomeModal(); playSound('click', 'D4', '16n'); });
    document.getElementById('welcome-modal')?.addEventListener('click', (e) => { if (e.target.id === 'welcome-modal') { handleInteractionForAudio(); closeWelcomeModal(); playSound('click', 'D4', '16n'); } });

    document.getElementById('save-name-btn')?.addEventListener('click', () => handleSaveName(false)); // Calls audio interaction internally
    document.querySelector('#name-prompt-modal .modal-close-btn')?.addEventListener('click', () => { handleInteractionForAudio(); closeNamePromptModal(); playSound('click', 'D4', '16n'); });
    document.getElementById('name-prompt-modal')?.addEventListener('click', (e) => { if (e.target.id === 'name-prompt-modal') { handleInteractionForAudio(); closeNamePromptModal(); playSound('click', 'D4', '16n'); } });
    document.getElementById('name-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent potential form submission if it were in a form
            handleSaveName(false); // Calls audio interaction internally
        }
    });

    document.getElementById('close-achievement-modal-btn')?.addEventListener('click', () => { handleInteractionForAudio(); hideAchievementModal(); }); // hideAchievementModal plays sound
    document.getElementById('achievement-detail-modal')?.addEventListener('click', (e) => { if (e.target.id === 'achievement-detail-modal') { handleInteractionForAudio(); hideAchievementModal(); } }); // hideAchievementModal plays sound

    // Onboarding Modal
    document.getElementById('onboarding-modal')?.addEventListener('click', (e) => {
        if (e.target.matches('.onboarding-btn')) {
            handleInteractionForAudio(); // Called once at the start of any button click
            const buttonId = e.target.id;
            let playNavSound = true;
            let soundNote = 'C5'; // Default next sound

            if (buttonId === 'onboarding-next-1') goToOnboardingStep(2);
            else if (buttonId === 'onboarding-prev-2') { goToOnboardingStep(1); soundNote = 'A4'; }
            else if (buttonId === 'onboarding-next-2') { if (handleSaveName(true)) goToOnboardingStep(3); else playNavSound = false; } // handleSaveName calls audio
            else if (buttonId === 'onboarding-prev-3') { goToOnboardingStep(2); soundNote = 'A4'; }
            else if (buttonId === 'onboarding-next-3') {
                const mode = document.querySelector('input[name="onboardingMode"]:checked')?.value;
                if (mode) { if (mode === 'simple') goToOnboardingStep(4); else { handleCompleteOnboarding(); playNavSound = false; } } // handleCompleteOnboarding calls audio
                else { showToast("Please select a mode.", "error"); playSound('error'); playNavSound = false; }
            }
            else if (buttonId === 'onboarding-prev-4') { goToOnboardingStep(3); soundNote = 'A4'; }
            else if (buttonId === 'onboarding-next-4') {
                 const count = document.querySelector('input[name="simpleModePillarCount"]:checked')?.value;
                 if (count) { goToOnboardingStep(5); }
                 else { showToast("Please select number of pillars.", "error"); playSound('error'); playNavSound = false; }
            }
            else if (buttonId === 'onboarding-prev-5') { goToOnboardingStep(4); soundNote = 'A4'; }
            else if (buttonId === 'onboarding-finish') { handleCompleteOnboarding(); playNavSound = false; } // handleCompleteOnboarding calls audio

            if (playNavSound) {
                playSound('navigate', soundNote, '16n');
            }
        }
    });
     document.getElementById('onboarding-name-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // Simulate click on the "Next" button for this step
            document.getElementById('onboarding-next-2')?.click();
        }
    });
    document.getElementById('onboarding-pillar-list')?.addEventListener('change', (e) => {
        if (e.target.matches('input[type="checkbox"]')) {
            handleInteractionForAudio(); // Ensure audio ready on checkbox change
            const listContainer = document.getElementById('onboarding-pillar-list');
            const requiredCountInput = document.querySelector('input[name="simpleModePillarCount"]:checked');
            const requiredCount = requiredCountInput ? parseInt(requiredCountInput.value) : 0;
            const checkedCheckboxes = listContainer ? listContainer.querySelectorAll('input[type="checkbox"]:checked') : [];
            if (requiredCount > 0 && checkedCheckboxes.length > requiredCount) {
                e.target.checked = false; showToast(`You can only select ${requiredCount} pillars.`, "info"); playSound('error');
            } else {
                updatePillarSelectionCounter(checkedCheckboxes.length, requiredCount); playSound('click', 'D4', '16n');
            }
        }
    });

    // Collapsible Sections
    document.getElementById('guide-toggle-btn')?.addEventListener('click', function() {
        handleInteractionForAudio(); toggleCollapsibleSection(this, 'guide-content-area'); playSound('click', this.getAttribute('aria-expanded') === 'true' ? 'F#4' : 'F4', '16n');
    });
    document.getElementById('habit-planner-toggle')?.addEventListener('click', function() {
        handleInteractionForAudio();
        const isExpanding = this.getAttribute('aria-expanded') === 'false';
        toggleCollapsibleSection(this, 'habit-planner-content', () => {
            if (isExpanding) { populatePillarSelect(); resetHabitPlanForm(); renderSavedHabitPlans(); }
        });
        playSound('click', this.getAttribute('aria-expanded') === 'true' ? 'F#4' : 'F4', '16n');
    });

    // Habit Planner Form & List
    document.getElementById('habit-plan-form')?.addEventListener('submit', handleSaveHabitPlan); // Calls audio interaction
     ['habit-plan-activity', 'habit-plan-cue', 'habit-plan-anchor'].forEach(inputId => {
        document.getElementById(inputId)?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent default action
                // Find the submit button for the form and click it
                const form = e.target.closest('form');
                const submitButton = form?.querySelector('button[type="submit"]');
                submitButton?.click(); // handleSaveHabitPlan calls audio
            }
        });
    });
    document.querySelectorAll('input[name="planType"]')?.forEach(radio => {
        radio.addEventListener('change', () => { handleInteractionForAudio(); togglePlanTypeInputs(); playSound('click', 'C4', '16n'); });
    });
    document.getElementById('saved-plans-display')?.addEventListener('click', (e) => {
        const planId = e.target.dataset.planId;
        if (!planId) return;
        if (e.target.classList.contains('edit-plan-btn')) { handleInteractionForAudio(); handleEditHabitPlan(planId); playSound('click', 'E5', '16n'); showToast("Editing plan...", "info", 4000); }
        else if (e.target.classList.contains('delete-plan-btn')) { handleDeleteHabitPlan(planId); } // Calls audio interaction
    });
    document.getElementById('delete-habit-plan-btn')?.addEventListener('click', function() {
        const planIdInput = document.getElementById('habit-plan-id');
        if (planIdInput?.value) { handleDeleteHabitPlan(planIdInput.value); } // Calls audio interaction
    });

    // Data Management (Original buttons in guide)
    document.getElementById('export-data-btn')?.addEventListener('click', () => {
        handleInteractionForAudio();
        exportData();
        // playSound('save', 'C5', '8n'); // Sound played by exportData
    });
    document.getElementById('import-data-trigger-btn')?.addEventListener('click', () => {
        handleInteractionForAudio();
        document.getElementById('file-input')?.click(); // Trigger original file input
        playSound('click', 'D5', '16n');
    });
    // Import listener setup is called in init() - its handler calls audio interaction

    // Settings Modal Listeners
    document.getElementById('close-settings-modal-btn')?.addEventListener('click', () => {
        handleInteractionForAudio(); hideSettingsModal(); playSound('click', 'A4', '16n');
    });
    document.getElementById('settings-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'settings-modal') { // Click on overlay
            handleInteractionForAudio(); hideSettingsModal(); playSound('click', 'A4', '16n');
        }
    });
    document.getElementById('settings-form')?.addEventListener('submit', handleSaveSettings); // Calls audio interaction
     document.getElementById('settings-name-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent default action
            // Simulate click on the form's submit button
            document.getElementById('save-settings-btn')?.click(); // handleSaveSettings calls audio
        }
    });
    // Listener for changes within the settings form to update visibility/counters
    document.getElementById('settings-form')?.addEventListener('change', (e) => {
        // Update visibility when mode radios change
        if (e.target.matches('input[name="settingsMode"]')) {
            handleInteractionForAudio();
            updateSettingsModalVisibility();
            playSound('click', 'C4', '16n');
        }
        // Update counter when simple mode count radios change
        else if (e.target.matches('input[name="settingsSimpleModePillarCount"]')) {
            handleInteractionForAudio();
            updateSettingsPillarCounter();
            playSound('click', 'C4', '16n');
        }
        // Update counter and check limit when pillar checkboxes change
        else if (e.target.matches('input[name="settingsPillars"]')) {
             handleInteractionForAudio();
             const listContainer = document.getElementById('settings-pillar-checklist');
             const requiredCountInput = document.querySelector('input[name="settingsSimpleModePillarCount"]:checked');
             const requiredCount = requiredCountInput ? parseInt(requiredCountInput.value) : 0;
             const checkedCheckboxes = listContainer ? listContainer.querySelectorAll('input[type="checkbox"]:checked') : [];

             if (requiredCount > 0 && checkedCheckboxes.length > requiredCount) {
                 e.target.checked = false; // Prevent checking more than allowed
                 showToast(`You can only select ${requiredCount} pillars.`, "info");
                 playSound('error');
             } else {
                 updateSettingsPillarCounter();
                 playSound('click', 'D4', '16n');
             }
        }
        // Note: Planner toggle change doesn't need immediate action other than saving on form submit
    });

    // Listener for "Change Pillars" button in Settings Modal
    document.getElementById('settings-change-pillars-btn')?.addEventListener('click', () => {
        handleInteractionForAudio();
        enableSimpleModeEditing(); // Enable the controls
        playSound('click', 'E4', '16n'); // Play a sound indicating change/edit enabled
    });

    // Listeners for Data Management buttons in Settings Modal
    document.getElementById('settings-export-data-btn')?.addEventListener('click', () => {
        handleInteractionForAudio();
        exportData(); // Call the existing export function
        // playSound('save', 'C5', '8n'); // Sound played by exportData
    });
    document.getElementById('settings-import-data-trigger-btn')?.addEventListener('click', () => {
        handleInteractionForAudio();
        document.getElementById('file-input')?.click(); // Trigger the original hidden file input
        playSound('click', 'D5', '16n');
        hideSettingsModal(); // Close settings modal when triggering import
    });

    // Global Keydown Listener (Escape Key)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Ensure audio context is ready before playing close sounds
            if (document.getElementById('settings-modal')?.classList.contains('visible')) { handleInteractionForAudio(); hideSettingsModal(); } // Plays sound
            else if (document.getElementById('achievement-detail-modal')?.classList.contains('visible')) { handleInteractionForAudio(); hideAchievementModal(); } // Plays sound
            else if (document.getElementById('onboarding-modal')?.classList.contains('visible')) { /* No action */ }
            else if (document.getElementById('name-prompt-modal')?.classList.contains('visible')) { handleInteractionForAudio(); closeNamePromptModal(); playSound('click', 'D4', '16n'); }
            else if (document.getElementById('welcome-modal')?.classList.contains('visible')) { handleInteractionForAudio(); closeWelcomeModal(); playSound('click', 'D4', '16n'); }
            else if (document.getElementById('guide-toggle-btn')?.getAttribute('aria-expanded') === 'true') { handleInteractionForAudio(); closeGuide(); playSound('click', 'F4', '16n'); } // Close guide if open
            else if (deselectMood()) { handleInteractionForAudio(); /* Action handled, sound played by deselect */ }
        }
    });

    // Touch listeners for swipe navigation
    const mainContentArea = document.querySelector('main'); // Target the main content area
    if (mainContentArea) {
        mainContentArea.addEventListener('touchstart', handleTouchStart, { passive: true }); // Use passive for performance if preventDefault isn't needed
        mainContentArea.addEventListener('touchmove', handleTouchMove, { passive: true });
        mainContentArea.addEventListener('touchend', handleTouchEnd);
    } else {
        console.error("[App] Main content area not found for swipe listeners.");
    }

    console.log("[App] All event listeners set up.");
}

// --- Calendar Specific Tab Handler ---

/** Handles showing the calendar tab, ensuring correct initial view and rendering. */
function handleShowCalendarTab() {
    console.log("[App] Showing Calendar Tab...");
    toggleAnalyticsVisibility(false); // Force calendar view, hide analytics

    showTab('calendar');

    const state = getState();
    if (state && state.currentMonth !== undefined && state.currentYear !== undefined) {
        const firstUsage = findFirstUsageDate(state);
        renderCalendar(state.currentMonth, state.currentYear, firstUsage, handleCalendarDayClick);
    } else {
        console.error("[App] State missing month/year for initial calendar render.");
        const now = new Date();
        renderCalendar(now.getMonth(), now.getFullYear(), null, handleCalendarDayClick);
    }
}

/** Callback function for when a day is clicked/activated on the calendar grid. */
function handleCalendarDayClick(dateStr) {
    handleInteractionForAudio();
    handleDateChangeInput(dateStr);
    showTab('daily');
    // playSound('click', 'E5', '16n'); // Sound played by handleDateChangeInput
}


/** Handles changing the displayed month in the calendar view. */
function handleMonthChange(delta) {
    handleInteractionForAudio();
    const stateRef = getStateReference();
    if (!stateRef || stateRef.currentMonth === undefined || stateRef.currentYear === undefined) {
        console.error("[App] State missing month/year for month change.");
        return;
    }

    let newMonth = stateRef.currentMonth + delta;
    let newYear = stateRef.currentYear;

    if (newMonth > 11) { newMonth = 0; newYear++; }
    else if (newMonth < 0) { newMonth = 11; newYear--; }

    stateRef.currentMonth = newMonth;
    stateRef.currentYear = newYear;
    document.dispatchEvent(new CustomEvent('stateChanged', { detail: { action: 'changeMonth' } }));

    const firstUsage = findFirstUsageDate(getState());
    renderCalendar(newMonth, newYear, firstUsage, handleCalendarDayClick);
    playSound('navigate', delta > 0 ? 'E5' : 'C5', '16n');
}


// --- Run Initialization ---
document.addEventListener("DOMContentLoaded", init);