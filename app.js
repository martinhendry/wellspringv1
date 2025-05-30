// app.js

/**
 * Main application logic for WellSpring.
 * Initializes the app, sets up event listeners, and coordinates interactions
 * between the state, UI modules, and other logic components.
 * *** MODIFIED: Added Service Worker registration. ***
 * *** MODIFIED: Added Edit/Delete functionality for timeline notes. ***
 */

// --- Core Modules ---
import {
    loadState, saveState, getState, getStateReference, updateCurrentDate,
    addTimelineEntry, saveDay, unlockDayEntry, updateMood, toggleSoundEnabled,
    updateTimelineFilter, updateTimelineSortOrder, prestigeLevel, setUserName,
    saveHabitPlan, deleteHabitPlan, setOnboardingComplete, setUserMode,
    setSimpleModePillarCount, setSimpleModePillars, setShowPlanner,
    setLevel100ToastShown,
    // --- START IMPORT: New state functions for note editing/deleting ---
    updateNoteInTimeline, deleteNoteFromTimeline
    // --- END IMPORT ---
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
const SAVE_DELAY = 350;
const SWIPE_THRESHOLD = 50;
const SWIPE_MAX_VERTICAL = 75;

// --- State ---
let saveTimeoutId = null;
let currentAnalyticsView = 'stats';
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

// --- Initialization ---
function init() {
    console.log("[App] Initializing WellSpring v2...");
    document.body.classList.add('js-loaded');
    loadState();
    initTheme();
    initializeAudio();
    registerServiceWorker();
    updateAudioToggleButton();
    populatePillarSelect();
    setupAutoResizeTextarea();
    setupImportListener();
    const initialStateData = getState();
    updateUIVisibilityForMode(initialStateData.userMode);
    updatePlannerVisibility(initialStateData.showPlanner);
    resetDateDisplay();
    refreshDailyLogUI();
    showTab('daily');
    setupEventListeners();
    if (!initialStateData.isOnboardingComplete) {
        showOnboardingModal();
        goToOnboardingStep(1);
    } else if (!initialStateData.userName) {
        showNamePromptModal();
    } else {
        refreshDailyLogUI();
    }
    checkAchievements(getStateReference());
    setupDebouncedSave();
    console.log("[App] WellSpring Initialization complete.");
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
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

function setupDebouncedSave() {
    document.removeEventListener('stateChanged', handleStateChangeForSave);
    document.addEventListener('stateChanged', handleStateChangeForSave);
}

function handleStateChangeForSave(e) {
    if (saveTimeoutId) clearTimeout(saveTimeoutId);
    saveTimeoutId = setTimeout(() => {
        saveState(`debouncedSave (trigger: ${e.detail?.action || 'unknown'})`);
        saveTimeoutId = null;
    }, SAVE_DELAY);
}

// --- Event Handlers ---

function handleDateChangeInput(newDateString) {
    handleInteractionForAudio();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDateString)) {
        showToast("Invalid date selected.", "error");
        resetDateDisplay(); return;
    }
    const selectedDate = new Date(newDateString + 'T00:00:00Z');
    const today = new Date(); today.setUTCHours(23, 59, 59, 999);
    if (selectedDate > today) {
        showToast("Future dates cannot be selected!", "error");
        playSound('error');
        resetDateDisplay(); return;
    }
    updateCurrentDate(newDateString);
    resetDateDisplay();
    refreshDailyLogUI();
    updateNoteHeaderPrompt();
    playSound('navigate', 'D5', '16n');
}

function handleDateArrowChange(offset) {
    handleInteractionForAudio();
    const currentDateStr = getState().currentDate;
    const currentDateObj = new Date(currentDateStr + 'T00:00:00Z');
    currentDateObj.setUTCDate(currentDateObj.getUTCDate() + offset);
    const today = new Date(); today.setUTCHours(23, 59, 59, 999);
    if (currentDateObj > today) {
        playSound('error'); return;
    }
    const newDateStr = currentDateObj.toISOString().split('T')[0];
    updateCurrentDate(newDateStr);
    resetDateDisplay();
    refreshDailyLogUI();
    updateNoteHeaderPrompt();
    playSound('navigate', offset > 0 ? 'E5' : 'C5', '16n');
}

function handleShowDatePicker() {
    handleInteractionForAudio();
    showDatePicker();
}

function handleSaveDay() {
    handleInteractionForAudio();
    const stateRef = getStateReference();
    if (!stateRef || !stateRef.currentDate) { showToast("Error saving day.", "error"); return; }
    const currentDate = stateRef.currentDate;
    const activePillars = Object.keys(stateRef.pillars || {}).filter(id => stateRef.pillars[id]?.days?.[currentDate]);
    const mood = stateRef.mood?.[currentDate];
    if (activePillars.length === 0 && !mood) {
        showToast("Log at least one pillar or mood to save the day.", "info");
        playSound('error'); return;
    }
    const saved = saveDay(currentDate);
    if (saved) {
        const updatedState = getState();
        const currentPrestige = updatedState.prestige;
        checkAchievements(getStateReference());
        refreshDailyLogUI();
        showToast("Day saved successfully!", "success");
        playSound('save', 'E5', '8n');
        try {
            const levelData = calculateLevelData(updatedState.totalXP, currentPrestige);
            if (levelData.level >= 100 && updatedState.level100ToastShownForCycle !== currentPrestige) {
                showToast("🎉 Level 100! Ready for the next Cycle? Find the button on the Journey tab!", "info", 8000);
                setLevel100ToastShown(currentPrestige);
                playSound('achievement');
            }
        } catch(e) { console.error("[App] Error checking for Level 100 toast:", e); }
        const isSunday = new Date(currentDate + 'T00:00:00Z').getUTCDay() === 0;
        const noteTextArea = document.getElementById('new-note-textarea');
        const journeyTabButton = document.querySelector('.tab-button[data-tab="journey"]');
        const weekId = getWeekNumber(currentDate);
        const hasWeeklyNote = updatedState.timeline.some(e => e?.type === 'note' && e.text?.toLowerCase().includes('#weeklyreflection') && getWeekNumber(e.date?.split('T')[0]) === weekId);
        const hasAnyNoteToday = updatedState.timeline.some(e => e?.type === 'note' && e.date?.startsWith(currentDate));
        if (isSunday && noteTextArea && journeyTabButton && !hasWeeklyNote) {
            setTimeout(() => { if (confirm("It's Sunday! Would you like to add a weekly reflection note now?")) { showTab('journey'); updateNoteHeaderPrompt(); noteTextArea.value = "#WeeklyReflection "; noteTextArea.focus({ preventScroll: true }); requestAnimationFrame(() => { noteTextArea.style.height = 'auto'; noteTextArea.style.height = `${noteTextArea.scrollHeight}px`; }); } }, 600);
        } else if (!isSunday && noteTextArea && journeyTabButton && !hasAnyNoteToday) {
             setTimeout(() => { if (confirm("Day saved! Add a quick gratitude or reflection note to your Journey?")) { showTab('journey'); updateNoteHeaderPrompt(); noteTextArea.value = ""; noteTextArea.focus({ preventScroll: true }); requestAnimationFrame(() => { noteTextArea.style.height = 'auto'; noteTextArea.style.height = `${noteTextArea.scrollHeight}px`; }); } }, 600);
        }
    } else { showToast("This day is already saved.", "info"); }
}

function handleUnlockDay() {
    handleInteractionForAudio();
    const state = getState();
    if (!state || !state.currentDate) return;
    if (confirm("Are you sure you want to unlock this day? This allows editing but removes the 'saved' status and may affect your streak.")) {
        if (unlockDayEntry(state.currentDate)) {
            refreshDailyLogUI();
            showToast("Day unlocked for editing.", "info");
            playSound('unlock', 'C4', '8n');
        }
    }
}

function handleAddNote() {
    handleInteractionForAudio();
    const textarea = document.getElementById("new-note-textarea");
    if (!textarea) return;
    const noteText = textarea.value.trim();
    if (!noteText) {
        showToast("Please enter some text for your note.", "info");
        playSound('error'); return;
    }
    addTimelineEntry({ type: 'note', text: noteText, date: new Date().toISOString() });
    showToast("Note added to timeline.", "success");
    textarea.value = "";
    setupAutoResizeTextarea();
    renderTimeline();
    playSound('save', 'D5', '16n');
    checkAchievements(getStateReference());
    refreshDailyLogUI();
}

function handlePrestigeClick() {
    handleInteractionForAudio();
    const state = getState();
    if (!state) return;
    const levelData = calculateLevelData(state.totalXP, state.prestige);
    if (levelData.level < 100) {
        showToast("You must reach Level 100 to enter the next Cycle!", "info");
        playSound('error'); return;
    }
    if (confirm(`Are you sure you want to begin Cycle ${levelData.prestige + 1}? Your Level and XP will reset, but your progress and achievements remain.`)) {
        if (prestigeLevel()) {
            refreshDailyLogUI();
            renderTimeline();
            showToast(`Congratulations! You've entered Cycle ${getState().prestige}!`, "success", 5000);
            playSound('achievement');
        } else {
            showToast("An error occurred while trying to prestige.", "error");
            playSound('error');
        }
    }
}

function handleSaveHabitPlan(event) {
    event.preventDefault();
    handleInteractionForAudio();
    const form = event.target.closest('form');
    if (!form) return;
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
    let isValid = true, errorMessage = '';
    if (!planData.pillarId) { isValid = false; errorMessage = "Please select a primary pillar."; }
    else if (!planData.activityDescription) { isValid = false; errorMessage = "Please describe the activity."; }
    else if (planData.type === 'intention' && !planData.cue) { isValid = false; errorMessage = "Please provide the 'When/If' cue."; }
    else if (planData.type === 'stacking' && !planData.anchorHabit) { isValid = false; errorMessage = "Please provide the 'After/Before' anchor habit."; }
    if (!isValid) { showToast(errorMessage, "error"); playSound('error'); return; }
    if (saveHabitPlan(planData)) {
        showToast(`Habit plan ${planId ? 'updated' : 'saved'}!`, "success");
        playSound('save', 'D5', '8n');
        resetHabitPlanForm();
        renderSavedHabitPlans();
    } else { showToast("Error saving habit plan.", "error"); playSound('error'); }
}

function handleDeleteHabitPlan(planId) {
    handleInteractionForAudio();
    if (!planId) return;
    const planName = getState().habitPlans?.[planId]?.activityDescription || 'this plan';
    if (confirm(`Delete plan: "${escapeHtml(planName)}"?`)) {
        if (deleteHabitPlan(planId)) {
            showToast("Habit plan deleted.", "success");
            playSound('delete', 'C3', '8n');
            resetHabitPlanForm();
            renderSavedHabitPlans();
        } else { showToast("Could not find plan to delete.", "error"); playSound('error'); }
    }
}

function handleSaveName(fromOnboarding = false) {
    handleInteractionForAudio();
    const inputId = fromOnboarding ? 'onboarding-name-input' : 'name-input';
    const nameInput = document.getElementById(inputId);
    if (!nameInput) return false;
    const name = nameInput.value.trim();
    if (name) {
        setUserName(name);
        if (!fromOnboarding) { closeNamePromptModal(); showToast(`Welcome, ${escapeHtml(name)}!`, "success"); refreshDailyLogUI(); }
        playSound('save', 'G5', '8n'); return true;
    } else { showToast("Please enter your name.", "info"); playSound('error'); nameInput.focus(); return false; }
}

function handleCompleteOnboarding() {
    handleInteractionForAudio();
    if (!handleSaveName(true)) return;
    const selectedMode = document.querySelector('input[name="onboardingMode"]:checked')?.value || 'full';
    let selectedPillarIds = [], validationPassed = true, simpleModeCount = null;
    if (selectedMode === 'simple') {
        const requiredCountInput = document.querySelector('input[name="simpleModePillarCount"]:checked');
        const requiredCount = requiredCountInput ? parseInt(requiredCountInput.value) : 0;
        simpleModeCount = requiredCount || null;
        const listContainer = document.getElementById('onboarding-pillar-list');
        const selectedCheckboxes = listContainer ? listContainer.querySelectorAll('input[type="checkbox"]:checked') : [];
        selectedPillarIds = Array.from(selectedCheckboxes).map(cb => cb.value);
        if (!simpleModeCount || ![3, 5, 7].includes(simpleModeCount)) { showToast("Please select a valid pillar count (3, 5, or 7).", "error"); playSound('error'); validationPassed = false; }
        else if (requiredCount > 0 && selectedPillarIds.length !== requiredCount) { showToast(`Please select exactly ${requiredCount} pillars.`, "error"); playSound('error'); validationPassed = false; }
    }
    if (validationPassed) {
        setUserMode(selectedMode);
        if (selectedMode === 'simple') { setSimpleModePillarCount(simpleModeCount); setSimpleModePillars(selectedPillarIds); }
        setOnboardingComplete(true);
        hideOnboardingModal();
        updateUIVisibilityForMode(selectedMode);
        updatePlannerVisibility(getState().showPlanner);
        refreshDailyLogUI();
        showToast("Setup complete! Welcome to WellSpring.", "success");
        playSound('achievement');
    }
}

function handleSaveSettings(event) {
    event.preventDefault();
    handleInteractionForAudio();
    const form = document.getElementById('settings-form');
    if (!form) { showToast("Error saving settings.", "error"); return; }
    const formData = new FormData(form);
    const selectedMode = formData.get('settingsMode');
    const showPlannerSetting = formData.get('settingsShowPlanner') === 'on';
    const newName = formData.get('settingsUserName')?.trim();
    let simpleModeCount = null, selectedPillarIds = [], validationPassed = true;
    if (selectedMode === 'simple') {
        const requiredCountValue = formData.get('settingsSimpleModePillarCount');
        simpleModeCount = requiredCountValue ? parseInt(requiredCountValue) : null;
        selectedPillarIds = formData.getAll('settingsPillars');
        if (!simpleModeCount || ![3, 5, 7].includes(simpleModeCount)) { showToast("Invalid pillar count selected for Simple Mode.", "error"); playSound('error'); validationPassed = false; }
        else if (selectedPillarIds.length !== simpleModeCount) { showToast(`Please select exactly ${simpleModeCount} pillars for Simple Mode.`, "error"); playSound('error'); validationPassed = false; }
    }
    if (validationPassed) {
        setUserName(newName);
        setUserMode(selectedMode);
        setShowPlanner(showPlannerSetting);
        if (selectedMode === 'simple') { setSimpleModePillarCount(simpleModeCount); setSimpleModePillars(selectedPillarIds); }
        else { setSimpleModePillarCount(null); setSimpleModePillars([]); }
        updateUIVisibilityForMode(selectedMode);
        updatePlannerVisibility(showPlannerSetting);
        refreshDailyLogUI();
        hideSettingsModal();
        showToast("Settings saved successfully!", "success");
        playSound('save', 'F5', '8n');
    }
}

function updatePlannerVisibility(show) {
    const plannerSection = document.querySelector('.habit-planner-section');
    const plannerToggleBtn = document.getElementById('habit-planner-toggle');
    if (plannerSection && plannerToggleBtn) {
        const shouldBeVisible = show && (getState().userMode !== 'simple');
        plannerSection.style.display = shouldBeVisible ? 'block' : 'none';
        if (!shouldBeVisible && plannerToggleBtn.getAttribute('aria-expanded') === 'true') {
            toggleCollapsibleSection(plannerToggleBtn, 'habit-planner-content');
        }
    }
}

// --- START NEW HANDLER FUNCTIONS for Note Edit/Delete ---
/**
 * Handles the click event for editing a timeline note.
 * @param {string} noteId - The ID of the note to edit.
 */
function handleEditNoteClick(noteId) {
    handleInteractionForAudio();
    const timeline = getState().timeline;
    const noteEntry = timeline.find(entry => entry.type === 'note' && entry.noteId === noteId);

    if (!noteEntry) {
        showToast("Could not find the note to edit.", "error");
        playSound('error');
        return;
    }

    const currentText = noteEntry.text;
    const newText = prompt("Edit your note:", currentText);

    if (newText !== null && newText.trim() !== currentText.trim()) { // Check if newText is not null (user didn't cancel) and text actually changed
        if (updateNoteInTimeline(noteId, newText.trim())) {
            showToast("Note updated successfully!", "success");
            playSound('save', 'E5', '16n');
            renderTimeline(); // Refresh the timeline to show the updated note
        } else {
            // This case might occur if the note was deleted between finding and updating, though unlikely here.
            showToast("Failed to update note. It might have been deleted.", "error");
            playSound('error');
            renderTimeline(); // Refresh timeline just in case
        }
    } else if (newText !== null && newText.trim() === currentText.trim()) {
        // No change was made
        showToast("No changes made to the note.", "info");
    } else {
        // User cancelled the prompt
        showToast("Note edit cancelled.", "info");
    }
}

/**
 * Handles the click event for deleting a timeline note.
 * @param {string} noteId - The ID of the note to delete.
 */
function handleDeleteNoteClick(noteId) {
    handleInteractionForAudio();
    if (confirm("Are you sure you want to delete this note? This action cannot be undone.")) {
        if (deleteNoteFromTimeline(noteId)) {
            showToast("Note deleted successfully.", "success");
            playSound('delete', 'C3', '8n');
            renderTimeline(); // Refresh the timeline to remove the note
        } else {
            showToast("Failed to delete note. It might have already been deleted.", "error");
            playSound('error');
            renderTimeline(); // Refresh timeline just in case
        }
    } else {
        showToast("Note deletion cancelled.", "info");
    }
}
// --- END NEW HANDLER FUNCTIONS ---


function handleTouchStart(event) {
    const targetElement = event.target;
    const allowScrollElements = ['textarea', 'select', '.calendar-grid', '.timeline-entries', '.achievement-board-grid', '.guide-content-inner', '#saved-plans-display', '.pillar-checkbox-grid', '.modal-content'];
    if (allowScrollElements.some(selector => targetElement.closest(selector))) {
        touchStartX = null; return;
    }
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    touchEndX = touchStartX; touchEndY = touchStartY;
}
function handleTouchMove(event) {
    if (touchStartX === null) return;
    touchEndX = event.touches[0].clientX;
    touchEndY = event.touches[0].clientY;
}
function handleTouchEnd(event) {
    if (touchStartX === null) return;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaY) < SWIPE_MAX_VERTICAL) {
        handleInteractionForAudio();
        const tabButtons = Array.from(document.querySelectorAll('.nav-tabs .tab-button:not([aria-hidden="true"])'));
        const currentTabIndex = tabButtons.findIndex(btn => btn.classList.contains('active'));
        let nextTabIndex = -1;
        if (deltaX < 0) { nextTabIndex = Math.min(tabButtons.length - 1, currentTabIndex + 1); }
        else { nextTabIndex = Math.max(0, currentTabIndex - 1); }
        if (nextTabIndex !== -1 && nextTabIndex !== currentTabIndex) {
            const nextTabButton = tabButtons[nextTabIndex];
            const nextTabId = nextTabButton?.dataset.tab;
            if (nextTabId) {
                 if (nextTabId === 'calendar') { handleShowCalendarTab(); }
                 else if (nextTabId === 'journey') { renderTimeline(); updateTimelineControls(); updateNoteHeaderPrompt(); showTab(nextTabId); }
                 else if (nextTabId === 'achievements') { renderAchievementBoard(); showTab(nextTabId); }
                 else { showTab(nextTabId); }
                 playSound('navigate', deltaX < 0 ? 'E5' : 'C5', '16n');
            }
        }
    }
    touchStartX = 0; touchStartY = 0; touchEndX = 0; touchEndY = 0;
}

function setupEventListeners() {
    console.log("[App] Setting up event listeners...");
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        handleInteractionForAudio();
        toggleTheme((newTheme) => {
            const analyticsContainer = document.getElementById('analytics-container');
            if (analyticsContainer && analyticsContainer.style.display === 'block') switchAnalyticsView(currentAnalyticsView);
            const achievementsTab = document.getElementById('achievements');
            if (achievementsTab?.classList.contains('active')) renderAchievementBoard();
        });
        playSound('click', 'E5', '16n');
    });
    document.getElementById('audio-toggle')?.addEventListener('click', () => { handleInteractionForAudio(); toggleSoundEnabled(); updateAudioToggleButton(); playSound('click', getStateReference().isSoundEnabled ? 'C5' : 'C4', '8n'); });
    document.getElementById('settings-btn')?.addEventListener('click', () => { handleInteractionForAudio(); showSettingsModal(); playSound('click', 'B4', '16n'); });
    document.querySelector('.nav-tabs')?.addEventListener('click', (e) => {
        if (e.target.matches('.tab-button')) {
            handleInteractionForAudio();
            const tabId = e.target.dataset.tab;
            if (tabId) {
                if (tabId === 'calendar') handleShowCalendarTab();
                else if (tabId === 'journey') { renderTimeline(); updateTimelineControls(); updateNoteHeaderPrompt(); showTab(tabId); }
                else if (tabId === 'achievements') { renderAchievementBoard(); showTab(tabId); }
                else showTab(tabId);
            }
        }
    });
    document.getElementById('prev-day-btn')?.addEventListener('click', () => handleDateArrowChange(-1));
    document.getElementById('next-day-btn')?.addEventListener('click', () => handleDateArrowChange(1));
    document.getElementById('formatted-date')?.addEventListener('click', handleShowDatePicker);
    document.getElementById('hidden-date-input')?.addEventListener('change', (e) => handleDateChangeInput(e.target.value));
    document.getElementById('pillar-inputs')?.addEventListener('click', (e) => {
        const card = e.target.closest('.pillar-card');
        if (card && !e.target.classList.contains('info-icon')) handlePillarClick(card);
    });
    document.getElementById('pillar-inputs')?.addEventListener('keydown', (e) => {
        const card = e.target.closest('.pillar-card');
        if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handlePillarClick(card); }
    });
    document.querySelector('.mood-options')?.addEventListener('click', handleMoodClick);
    document.getElementById('lock-button')?.addEventListener('click', handleSaveDay);
    document.getElementById('unlock-button')?.addEventListener('click', handleUnlockDay);
    document.getElementById('add-note-btn')?.addEventListener('click', handleAddNote);
    document.getElementById('timeline-filter')?.addEventListener('change', (e) => { handleInteractionForAudio(); updateTimelineFilter(e.target.value); renderTimeline(); playSound('click', 'D5', '16n'); });
    document.getElementById('timeline-sort')?.addEventListener('change', (e) => { handleInteractionForAudio(); updateTimelineSortOrder(e.target.value); renderTimeline(); playSound('click', 'E5', '16n'); });
    document.getElementById('prestige-button')?.addEventListener('click', handlePrestigeClick);
    document.getElementById('new-note-textarea')?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote(); } });
    document.getElementById('calendar-grid')?.addEventListener('click', (e) => {
        const dayCell = e.target.closest('.calendar-day:not(.disabled)');
        if (dayCell?.dataset.date) { handleInteractionForAudio(); handleDateChangeInput(dayCell.dataset.date); showTab('daily'); playSound('click', 'E5', '16n'); }
    });
    document.getElementById('prev-month-btn')?.addEventListener('click', () => handleMonthChange(-1));
    document.getElementById('next-month-btn')?.addEventListener('click', () => handleMonthChange(1));
    document.getElementById('view-analytics-btn')?.addEventListener('click', () => { handleInteractionForAudio(); toggleAnalyticsVisibility(); playSound('click', 'B4', '16n'); });
    document.getElementById('analytics-toggles')?.addEventListener('click', (e) => {
        if (e.target.matches('button')) {
            const view = e.target.dataset.view;
            if (view && view !== currentAnalyticsView) { handleInteractionForAudio(); switchAnalyticsView(view); playSound('click', 'G4', '16n'); }
        }
    });
    document.getElementById('achievement-board-grid')?.addEventListener('click', (e) => {
        const card = e.target.closest('.achievement-card');
        if (card?.dataset.achievementId) { handleInteractionForAudio(); showAchievementModal(card.dataset.achievementId); }
    });
    document.getElementById('achievement-board-grid')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const card = e.target.closest('.achievement-card');
            if (card?.dataset.achievementId) { e.preventDefault(); handleInteractionForAudio(); showAchievementModal(card.dataset.achievementId); }
        }
    });
    document.getElementById('dismiss-welcome-btn')?.addEventListener('click', () => { handleInteractionForAudio(); closeWelcomeModal(); playSound('save', 'E5', '8n'); });
    document.querySelector('#welcome-modal .modal-close-btn')?.addEventListener('click', () => { handleInteractionForAudio(); closeWelcomeModal(); playSound('click', 'D4', '16n'); });
    document.getElementById('welcome-modal')?.addEventListener('click', (e) => { if (e.target.id === 'welcome-modal') { handleInteractionForAudio(); closeWelcomeModal(); playSound('click', 'D4', '16n'); } });
    document.getElementById('save-name-btn')?.addEventListener('click', () => handleSaveName(false));
    document.querySelector('#name-prompt-modal .modal-close-btn')?.addEventListener('click', () => { handleInteractionForAudio(); closeNamePromptModal(); playSound('click', 'D4', '16n'); });
    document.getElementById('name-prompt-modal')?.addEventListener('click', (e) => { if (e.target.id === 'name-prompt-modal') { handleInteractionForAudio(); closeNamePromptModal(); playSound('click', 'D4', '16n'); } });
    document.getElementById('name-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveName(false); } });
    document.getElementById('close-achievement-modal-btn')?.addEventListener('click', () => { handleInteractionForAudio(); hideAchievementModal(); });
    document.getElementById('achievement-detail-modal')?.addEventListener('click', (e) => { if (e.target.id === 'achievement-detail-modal') { handleInteractionForAudio(); hideAchievementModal(); } });
    document.getElementById('onboarding-modal')?.addEventListener('click', (e) => {
        if (e.target.matches('.onboarding-btn')) {
            handleInteractionForAudio();
            const buttonId = e.target.id; let playNavSound = true; let soundNote = 'C5';
            if (buttonId === 'onboarding-next-1') goToOnboardingStep(2);
            else if (buttonId === 'onboarding-prev-2') { goToOnboardingStep(1); soundNote = 'A4'; }
            else if (buttonId === 'onboarding-next-2') { if (handleSaveName(true)) goToOnboardingStep(3); else playNavSound = false; }
            else if (buttonId === 'onboarding-prev-3') { goToOnboardingStep(2); soundNote = 'A4'; }
            else if (buttonId === 'onboarding-next-3') { const mode = document.querySelector('input[name="onboardingMode"]:checked')?.value; if (mode) { if (mode === 'simple') goToOnboardingStep(4); else { handleCompleteOnboarding(); playNavSound = false; } } else { showToast("Please select a mode.", "error"); playSound('error'); playNavSound = false; } }
            else if (buttonId === 'onboarding-prev-4') { goToOnboardingStep(3); soundNote = 'A4'; }
            else if (buttonId === 'onboarding-next-4') { const count = document.querySelector('input[name="simpleModePillarCount"]:checked')?.value; if (count) { goToOnboardingStep(5); } else { showToast("Please select number of pillars.", "error"); playSound('error'); playNavSound = false; } }
            else if (buttonId === 'onboarding-prev-5') { goToOnboardingStep(4); soundNote = 'A4'; }
            else if (buttonId === 'onboarding-finish') { handleCompleteOnboarding(); playNavSound = false; }
            if (playNavSound) playSound('navigate', soundNote, '16n');
        }
    });
    document.getElementById('onboarding-name-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('onboarding-next-2')?.click(); } });
    document.getElementById('onboarding-pillar-list')?.addEventListener('change', (e) => {
        if (e.target.matches('input[type="checkbox"]')) {
            handleInteractionForAudio();
            const listContainer = document.getElementById('onboarding-pillar-list');
            const requiredCountInput = document.querySelector('input[name="simpleModePillarCount"]:checked');
            const requiredCount = requiredCountInput ? parseInt(requiredCountInput.value) : 0;
            const checkedCheckboxes = listContainer ? listContainer.querySelectorAll('input[type="checkbox"]:checked') : [];
            if (requiredCount > 0 && checkedCheckboxes.length > requiredCount) { e.target.checked = false; showToast(`You can only select ${requiredCount} pillars.`, "info"); playSound('error'); }
            else { updatePillarSelectionCounter(checkedCheckboxes.length, requiredCount); playSound('click', 'D4', '16n'); }
        }
    });
    document.getElementById('guide-toggle-btn')?.addEventListener('click', function() { handleInteractionForAudio(); toggleCollapsibleSection(this, 'guide-content-area'); playSound('click', this.getAttribute('aria-expanded') === 'true' ? 'F#4' : 'F4', '16n'); });
    document.getElementById('habit-planner-toggle')?.addEventListener('click', function() {
        handleInteractionForAudio();
        const isExpanding = this.getAttribute('aria-expanded') === 'false';
        toggleCollapsibleSection(this, 'habit-planner-content', () => { if (isExpanding) { populatePillarSelect(); resetHabitPlanForm(); renderSavedHabitPlans(); } });
        playSound('click', this.getAttribute('aria-expanded') === 'true' ? 'F#4' : 'F4', '16n');
    });
    document.getElementById('habit-plan-form')?.addEventListener('submit', handleSaveHabitPlan);
    ['habit-plan-activity', 'habit-plan-cue', 'habit-plan-anchor'].forEach(inputId => { document.getElementById(inputId)?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const form = e.target.closest('form'); form?.querySelector('button[type="submit"]')?.click(); } }); });
    document.querySelectorAll('input[name="planType"]')?.forEach(radio => { radio.addEventListener('change', () => { handleInteractionForAudio(); togglePlanTypeInputs(); playSound('click', 'C4', '16n'); }); });
    document.getElementById('saved-plans-display')?.addEventListener('click', (e) => {
        const planId = e.target.dataset.planId; if (!planId) return;
        if (e.target.classList.contains('edit-plan-btn')) { handleInteractionForAudio(); handleEditHabitPlan(planId); playSound('click', 'E5', '16n'); showToast("Editing plan...", "info", 4000); }
        else if (e.target.classList.contains('delete-plan-btn')) handleDeleteHabitPlan(planId);
    });
    document.getElementById('delete-habit-plan-btn')?.addEventListener('click', function() { const planIdInput = document.getElementById('habit-plan-id'); if (planIdInput?.value) handleDeleteHabitPlan(planIdInput.value); });
    document.getElementById('export-data-btn')?.addEventListener('click', () => { handleInteractionForAudio(); exportData(); });
    document.getElementById('import-data-trigger-btn')?.addEventListener('click', () => { handleInteractionForAudio(); document.getElementById('file-input')?.click(); playSound('click', 'D5', '16n'); });
    document.getElementById('close-settings-modal-btn')?.addEventListener('click', () => { handleInteractionForAudio(); hideSettingsModal(); playSound('click', 'A4', '16n'); });
    document.getElementById('settings-modal')?.addEventListener('click', (e) => { if (e.target.id === 'settings-modal') { handleInteractionForAudio(); hideSettingsModal(); playSound('click', 'A4', '16n'); } });
    document.getElementById('settings-form')?.addEventListener('submit', handleSaveSettings);
    document.getElementById('settings-name-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('save-settings-btn')?.click(); } });
    document.getElementById('settings-form')?.addEventListener('change', (e) => {
        if (e.target.matches('input[name="settingsMode"]')) { handleInteractionForAudio(); updateSettingsModalVisibility(); playSound('click', 'C4', '16n'); }
        else if (e.target.matches('input[name="settingsSimpleModePillarCount"]')) { handleInteractionForAudio(); updateSettingsPillarCounter(); playSound('click', 'C4', '16n'); }
        else if (e.target.matches('input[name="settingsPillars"]')) {
             handleInteractionForAudio();
             const listContainer = document.getElementById('settings-pillar-checklist');
             const requiredCountInput = document.querySelector('input[name="settingsSimpleModePillarCount"]:checked');
             const requiredCount = requiredCountInput ? parseInt(requiredCountInput.value) : 0;
             const checkedCheckboxes = listContainer ? listContainer.querySelectorAll('input[type="checkbox"]:checked') : [];
             if (requiredCount > 0 && checkedCheckboxes.length > requiredCount) { e.target.checked = false; showToast(`You can only select ${requiredCount} pillars.`, "info"); playSound('error'); }
             else { updateSettingsPillarCounter(); playSound('click', 'D4', '16n'); }
        }
    });
    document.getElementById('settings-change-pillars-btn')?.addEventListener('click', () => { handleInteractionForAudio(); enableSimpleModeEditing(); playSound('click', 'E4', '16n'); });
    document.getElementById('settings-export-data-btn')?.addEventListener('click', () => { handleInteractionForAudio(); exportData(); });
    document.getElementById('settings-import-data-trigger-btn')?.addEventListener('click', () => { handleInteractionForAudio(); document.getElementById('file-input')?.click(); playSound('click', 'D5', '16n'); hideSettingsModal(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (document.getElementById('settings-modal')?.classList.contains('visible')) { handleInteractionForAudio(); hideSettingsModal(); }
            else if (document.getElementById('achievement-detail-modal')?.classList.contains('visible')) { handleInteractionForAudio(); hideAchievementModal(); }
            else if (document.getElementById('name-prompt-modal')?.classList.contains('visible')) { handleInteractionForAudio(); closeNamePromptModal(); playSound('click', 'D4', '16n'); }
            else if (document.getElementById('welcome-modal')?.classList.contains('visible')) { handleInteractionForAudio(); closeWelcomeModal(); playSound('click', 'D4', '16n'); }
            else if (document.getElementById('guide-toggle-btn')?.getAttribute('aria-expanded') === 'true') { handleInteractionForAudio(); closeGuide(); playSound('click', 'F4', '16n'); }
            else if (deselectMood()) { handleInteractionForAudio(); }
        }
    });
    const mainContentArea = document.querySelector('main');
    if (mainContentArea) {
        mainContentArea.addEventListener('touchstart', handleTouchStart, { passive: true });
        mainContentArea.addEventListener('touchmove', handleTouchMove, { passive: true });
        mainContentArea.addEventListener('touchend', handleTouchEnd);
    }

    // --- START NEW EVENT LISTENER FOR NOTE ACTIONS ---
    document.getElementById('timeline-entries')?.addEventListener('click', (e) => {
        const target = e.target;
        const editButton = target.closest('.edit-note-btn');
        const deleteButton = target.closest('.delete-note-btn');

        if (editButton) {
            const noteId = editButton.dataset.noteId;
            if (noteId) {
                handleEditNoteClick(noteId);
            }
        } else if (deleteButton) {
            const noteId = deleteButton.dataset.noteId;
            if (noteId) {
                handleDeleteNoteClick(noteId);
            }
        }
    });
    // --- END NEW EVENT LISTENER FOR NOTE ACTIONS ---

    console.log("[App] All event listeners set up.");
}

function handleShowCalendarTab() {
    toggleAnalyticsVisibility(false);
    showTab('calendar');
    const state = getState();
    if (state && state.currentMonth !== undefined && state.currentYear !== undefined) {
        const firstUsage = findFirstUsageDate(state);
        renderCalendar(state.currentMonth, state.currentYear, firstUsage, handleCalendarDayClick);
    } else {
        const now = new Date();
        renderCalendar(now.getMonth(), now.getFullYear(), null, handleCalendarDayClick);
    }
}

function handleCalendarDayClick(dateStr) {
    handleInteractionForAudio();
    handleDateChangeInput(dateStr);
    showTab('daily');
}

function handleMonthChange(delta) {
    handleInteractionForAudio();
    const stateRef = getStateReference();
    if (!stateRef || stateRef.currentMonth === undefined || stateRef.currentYear === undefined) return;
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

document.addEventListener("DOMContentLoaded", init);
