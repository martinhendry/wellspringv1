// app.js

/**
 * Main application logic for WellSpring.
 * ... (other comments)
 * *** MODIFIED: Deferred UI initialization for non-active tabs. ***
 */

// --- Core Modules ---
import {
    loadState, saveState, getState, getStateReference, updateCurrentDate,
    addTimelineEntry, saveDay, unlockDayEntry, updateMood, toggleSoundEnabled,
    updateTimelineFilter, updateTimelineSortOrder, prestigeLevel, setUserName,
    saveHabitPlan, deleteHabitPlan, setOnboardingComplete, setUserMode,
    setSimpleModePillarCount, setSimpleModePillars, setShowPlanner,
    setLevel100ToastShown,
    updateNoteInTimeline, deleteNoteFromTimeline,
    setLastBackupReminderShown
} from './state.js';
import { checkAchievements } from './achievementlogic.js';
import { exportData, setupImportListener } from './datamanagement.js';
import { initializeAudio, playSound, handleInteractionForAudio } from './audio.js';
import { findFirstUsageDate, getWeekNumber, calculateLevelData, escapeHtml, formatDate } from './utils.js';

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
import { showSettingsModal as uiShowSettingsModal, hideSettingsModal, updateSettingsModalVisibility, updateSettingsPillarCounter, enableSimpleModeEditing } from './ui/settingsUI.js';


// --- Constants ---
const SAVE_DELAY = 350;
const SWIPE_THRESHOLD = 50;
const SWIPE_MAX_VERTICAL = 75;
const BACKUP_REMINDER_INTERVAL_DAYS = 30;
const MIN_SAVED_DAYS_FOR_BACKUP_REMINDER = 7;
const DAYS_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

// --- State ---
let saveTimeoutId = null;
let currentAnalyticsView = 'stats';
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
// --- START NEW: Flags for one-time UI initializations ---
let journeyTabInitialized = false;
let achievementsTabInitialized = false;
// Planner select is initialized on expand, calendar on tab show by handleShowCalendarTab
// --- END NEW ---


// --- GA4 Event Tracking Helper ---
function trackGAEvent(eventName, eventParams = {}) {
    if (typeof gtag === 'function') {
        gtag('event', eventName, eventParams);
    }
}

// --- Notification Helper Functions ---
// ... (updateNotificationPermissionStatusDisplay, requestNotificationPermission, showLocalNotification)
function updateNotificationPermissionStatusDisplay() {
    const statusEl = document.getElementById('notification-permission-status');
    const enableBtn = document.getElementById('enable-notifications-btn');
    if (!statusEl || !enableBtn) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        statusEl.textContent = 'Status: Reminders not supported by this browser.';
        statusEl.style.color = 'var(--accent)';
        enableBtn.disabled = true; enableBtn.textContent = 'Not Supported'; return;
    }
    switch (Notification.permission) {
        case 'granted':
            statusEl.textContent = 'Status: Reminders Enabled.';
            statusEl.style.color = 'var(--secondary)';
            enableBtn.textContent = 'Reminders Active'; enableBtn.disabled = true; break;
        case 'denied':
            statusEl.textContent = 'Status: Reminders Blocked by browser.';
            statusEl.style.color = 'var(--accent)';
            enableBtn.textContent = 'Enable Reminders (Blocked)'; enableBtn.disabled = true; break;
        default:
            statusEl.textContent = 'Status: Reminders Not Yet Enabled.';
            statusEl.style.color = 'var(--text-muted)';
            enableBtn.textContent = 'Enable Reminders'; enableBtn.disabled = false; break;
    }
}

async function requestNotificationPermission() {
    handleInteractionForAudio();
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        showToast("This browser does not support notifications.", "error");
        playSound('error'); updateNotificationPermissionStatusDisplay();
        trackGAEvent('notification_permission_attempt', { supported: false }); return null;
    }
    if (Notification.permission === 'granted') {
        showToast("Reminders are already enabled!", "info");
        updateNotificationPermissionStatusDisplay(); return 'granted';
    }
    if (Notification.permission === 'denied') {
        showToast("Reminders are blocked. Please enable them in your browser/OS settings.", "error");
        playSound('error'); updateNotificationPermissionStatusDisplay();
        trackGAEvent('notification_permission_blocked_interaction'); return 'denied';
    }
    try {
        const permission = await Notification.requestPermission();
        trackGAEvent('notification_permission_requested', { permission_status: permission });
        if (permission === 'granted') { showToast("Great! Reminders enabled.", "success"); playSound('save'); }
        else if (permission === 'denied') { showToast("Reminders permission denied. You can change this in browser settings.", "info"); playSound('click'); }
        else { showToast("Reminder permission not granted (prompt dismissed).", "info"); playSound('click'); }
        updateNotificationPermissionStatusDisplay(); return permission;
    } catch (error) {
        console.error("[App] Error requesting notification permission:", error);
        showToast("Could not request notification permission.", "error");
        playSound('error'); updateNotificationPermissionStatusDisplay();
        trackGAEvent('notification_permission_error'); return 'error';
    }
}

async function showLocalNotification(title, options) {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || Notification.permission !== 'granted') {
        console.warn("[App] Cannot show local notification: Not supported or permission not granted. Current permission: " + Notification.permission);
        return;
    }
    try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, options);
        console.log(`[App] Local notification shown: "${title}"`);
        trackGAEvent('local_notification_shown', { title: title, tag: options.tag });
    } catch (error) {
        console.error("[App] Error showing local notification:", error);
        trackGAEvent('local_notification_error', { error_message: String(error) });
    }
}


// --- Reminder Logic Functions ---
// ... (checkAndShowBackupReminder, checkAndShowMissedDayReminder) ...
function checkAndShowBackupReminder() {
    const state = getState();
    if (!state.isOnboardingComplete || Notification.permission !== 'granted') return;
    const lastReminderTime = state.lastBackupReminderShown ? new Date(state.lastBackupReminderShown).getTime() : 0;
    const lastExportTime = state.lastDataExportTime ? new Date(state.lastDataExportTime).getTime() : 0;
    const relevantLastTime = Math.max(lastReminderTime, lastExportTime);
    const now = new Date().getTime();
    const daysSinceLastRelevant = (now - relevantLastTime) / DAYS_IN_MILLISECONDS;
    const totalSavedDays = Object.keys(state.savedDays || {}).length;
    if (totalSavedDays >= MIN_SAVED_DAYS_FOR_BACKUP_REMINDER && daysSinceLastRelevant >= BACKUP_REMINDER_INTERVAL_DAYS) {
        showLocalNotification('WellSpring Backup Reminder', {
            body: `It's been about ${BACKUP_REMINDER_INTERVAL_DAYS} days. Consider backing up your WellSpring data to keep it safe!`,
            icon: 'assets/favicon.png', badge: 'assets/favicon.png',
            tag: 'wellspring-backup-reminder', data: { url: './index.html#settings-modal' }
        });
        setLastBackupReminderShown();
    }
}

function checkAndShowMissedDayReminder() {
    const state = getState();
    if (!state.isOnboardingComplete || Notification.permission !== 'granted' || !state.savedDays) return;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];
    const firstUsage = findFirstUsageDate(state);
    if (firstUsage && yesterdayString < firstUsage) return;
    if (!state.savedDays[yesterdayString] && state.currentDate !== yesterdayString) {
        showLocalNotification('WellSpring Catch-up', {
            body: `Did you forget to log for ${escapeHtml(formatDate(yesterdayString))}? Tap to log now!`,
            icon: 'assets/favicon.png', badge: 'assets/favicon.png',
            tag: 'wellspring-missed-day-reminder-' + yesterdayString,
            data: { url: `./index.html?date=${yesterdayString}` }
        });
    }
}


// --- Initialization ---
function init() {
    console.log("[App] Initializing WellSpring v2...");
    document.body.classList.add('js-loaded');
    loadState();
    initTheme();
    initializeAudio();
    registerServiceWorker();
    updateAudioToggleButton();

    // populatePillarSelect(); // Moved to planner expand
    // setupAutoResizeTextarea(); // Moved to journey tab activation

    setupImportListener();
    const initialStateData = getState();
    updateUIVisibilityForMode(initialStateData.userMode);
    updatePlannerVisibility(initialStateData.showPlanner);
    resetDateDisplay();

    showTab('daily'); // Show initial tab
    trackGAEvent('view_tab', { tab_id: 'daily' });

    // Defer initial daily log refresh to ensure DOM is ready
    requestAnimationFrame(() => {
        refreshDailyLogUI();
    });

    setupEventListeners();
    updateNotificationPermissionStatusDisplay();

    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        console.log(`[App] Date parameter found in URL: ${dateParam}. Setting current date.`);
        updateCurrentDate(dateParam);
        resetDateDisplay();
        requestAnimationFrame(() => {
             refreshDailyLogUI();
        });
        showTab('daily');
        // window.history.replaceState({}, document.title, "./index.html");
    }

    if (!initialStateData.isOnboardingComplete) {
        showOnboardingModal();
        goToOnboardingStep(1);
        trackGAEvent('onboarding_started');
    } else {
        if (!initialStateData.userName) {
            showNamePromptModal();
            trackGAEvent('name_prompt_shown');
        }
        // refreshDailyLogUI(); // Already called via requestAnimationFrame
        setTimeout(() => {
            if (Notification.permission === 'granted') {
                checkAndShowBackupReminder();
                checkAndShowMissedDayReminder();
            }
        }, 2000);
    }
    checkAchievements(getStateReference());
    setupDebouncedSave();
    console.log("[App] WellSpring Initialization complete.");
}

// --- Service Worker Registration ---
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
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


// --- Event Handlers (abbreviated, full logic from previous version wellspring_app_reminders_1) ---
function handleDateChangeInput(newDateString) {
    handleInteractionForAudio();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDateString)) { showToast("Invalid date selected.", "error"); resetDateDisplay(); return; }
    const selectedDate = new Date(newDateString + 'T00:00:00Z');
    const today = new Date(); today.setUTCHours(23, 59, 59, 999);
    if (selectedDate > today) { showToast("Future dates cannot be selected!", "error"); playSound('error'); resetDateDisplay(); return; }
    updateCurrentDate(newDateString); resetDateDisplay(); refreshDailyLogUI(); updateNoteHeaderPrompt(); playSound('navigate', 'D5', '16n'); trackGAEvent('date_changed', { method: 'picker' });
}
function handleDateArrowChange(offset) {
    handleInteractionForAudio();
    const currentDateStr = getState().currentDate;
    const currentDateObj = new Date(currentDateStr + 'T00:00:00Z');
    currentDateObj.setUTCDate(currentDateObj.getUTCDate() + offset);
    const today = new Date(); today.setUTCHours(23, 59, 59, 999);
    if (currentDateObj > today) { playSound('error'); return; }
    const newDateStr = currentDateObj.toISOString().split('T')[0];
    updateCurrentDate(newDateStr); resetDateDisplay(); refreshDailyLogUI(); updateNoteHeaderPrompt(); playSound('navigate', offset > 0 ? 'E5' : 'C5', '16n'); trackGAEvent('date_changed', { method: 'arrows', direction: offset > 0 ? 'next' : 'previous' });
}
function handleShowDatePicker() { handleInteractionForAudio(); showDatePicker(); trackGAEvent('show_date_picker'); }
function handleSaveDay() {
    handleInteractionForAudio();
    const stateRef = getStateReference();
    if (!stateRef || !stateRef.currentDate) { showToast("Error saving day.", "error"); return; }
    const currentDate = stateRef.currentDate;
    const activePillars = Object.keys(stateRef.pillars || {}).filter(id => stateRef.pillars[id]?.days?.[currentDate]);
    const mood = stateRef.mood?.[currentDate];
    if (activePillars.length === 0 && !mood) { showToast("Log at least one pillar or mood to save the day.", "info"); playSound('error'); return; }
    const saved = saveDay(currentDate);
    if (saved) {
        trackGAEvent('day_saved', { pillar_count: activePillars.length, mood_logged: !!mood });
        const updatedState = getState(); const currentPrestige = updatedState.prestige;
        checkAchievements(getStateReference()); refreshDailyLogUI(); showToast("Day saved successfully!", "success"); playSound('save', 'E5', '8n');
        try {
            const levelData = calculateLevelData(updatedState.totalXP, currentPrestige);
            if (levelData.level >= 100 && updatedState.level100ToastShownForCycle !== currentPrestige) {
                showToast("🎉 Level 100! Ready for the next Cycle? Find the button on the Journey tab!", "info", 8000);
                setLevel100ToastShown(currentPrestige); playSound('achievement'); trackGAEvent('level_100_reached', { cycle: currentPrestige });
            }
        } catch(e) { console.error("[App] Error checking for Level 100 toast:", e); }
        const isSunday = new Date(currentDate + 'T00:00:00Z').getUTCDay() === 0;
        const noteTextArea = document.getElementById('new-note-textarea');
        const journeyTabButton = document.querySelector('.tab-button[data-tab="journey"]');
        const weekId = getWeekNumber(currentDate);
        const hasWeeklyNote = updatedState.timeline.some(e => e?.type === 'note' && e.text?.toLowerCase().includes('#weeklyreflection') && getWeekNumber(e.date?.split('T')[0]) === weekId);
        const hasAnyNoteToday = updatedState.timeline.some(e => e?.type === 'note' && e.date?.startsWith(currentDate));
        if (isSunday && noteTextArea && journeyTabButton && !hasWeeklyNote) {
            setTimeout(() => { if (confirm("It's Sunday! Would you like to add a weekly reflection note now?")) { showTab('journey'); trackGAEvent('view_tab', { tab_id: 'journey', source: 'sunday_prompt' }); updateNoteHeaderPrompt(); noteTextArea.value = "#WeeklyReflection "; noteTextArea.focus({ preventScroll: true }); requestAnimationFrame(() => { noteTextArea.style.height = 'auto'; noteTextArea.style.height = `${noteTextArea.scrollHeight}px`; }); } }, 600);
        } else if (!isSunday && noteTextArea && journeyTabButton && !hasAnyNoteToday) {
             setTimeout(() => { if (confirm("Day saved! Add a quick gratitude or reflection note to your Journey?")) { showTab('journey'); trackGAEvent('view_tab', { tab_id: 'journey', source: 'save_day_prompt' }); updateNoteHeaderPrompt(); noteTextArea.value = ""; noteTextArea.focus({ preventScroll: true }); requestAnimationFrame(() => { noteTextArea.style.height = 'auto'; noteTextArea.style.height = `${noteTextArea.scrollHeight}px`; }); } }, 600);
        }
    } else { showToast("This day is already saved.", "info"); }
}
function handleUnlockDay() {
    handleInteractionForAudio(); const state = getState(); if (!state || !state.currentDate) return;
    if (confirm("Are you sure you want to unlock this day? This allows editing but removes the 'saved' status and may affect your streak.")) {
        if (unlockDayEntry(state.currentDate)) { trackGAEvent('day_unlocked'); refreshDailyLogUI(); showToast("Day unlocked for editing.", "info"); playSound('unlock', 'C4', '8n'); }
    }
}
function handleAddNote() {
    handleInteractionForAudio(); const textarea = document.getElementById("new-note-textarea"); if (!textarea) return;
    const noteText = textarea.value.trim(); if (!noteText) { showToast("Please enter some text for your note.", "info"); playSound('error'); return; }
    addTimelineEntry({ type: 'note', text: noteText, date: new Date().toISOString() }); trackGAEvent('note_added');
    showToast("Note added to timeline.", "success"); textarea.value = ""; setupAutoResizeTextarea(); renderTimeline();
    const timelineEntriesContainer = document.getElementById('timeline-entries'); if (timelineEntriesContainer) timelineEntriesContainer.scrollTop = 0;
    playSound('save', 'D5', '16n'); checkAchievements(getStateReference()); refreshDailyLogUI();
}
function handlePrestigeClick() {
    handleInteractionForAudio(); const state = getState(); if (!state) return;
    const levelData = calculateLevelData(state.totalXP, state.prestige);
    if (levelData.level < 100) { showToast("You must reach Level 100 to enter the next Cycle!", "info"); playSound('error'); return; }
    if (confirm(`Are you sure you want to begin Cycle ${levelData.prestige + 1}? Your Level and XP will reset, but your progress and achievements remain.`)) {
        if (prestigeLevel()) { trackGAEvent('prestige_completed', { new_cycle: getState().prestige }); refreshDailyLogUI(); renderTimeline(); showToast(`Congratulations! You've entered Cycle ${getState().prestige}!`, "success", 5000); playSound('achievement'); }
        else { showToast("An error occurred while trying to prestige.", "error"); playSound('error'); }
    }
}
function handleSaveHabitPlan(event) {
    event.preventDefault(); handleInteractionForAudio(); const form = event.target.closest('form'); if (!form) return;
    const formData = new FormData(form); const planId = formData.get('planId') || null;
    const planData = { id: planId || crypto.randomUUID(), pillarId: formData.get('pillarId'), activityDescription: formData.get('activityDescription')?.trim(), type: formData.get('planType'), cue: formData.get('planType') === 'intention' ? formData.get('cue')?.trim() : null, anchorHabit: formData.get('planType') === 'stacking' ? formData.get('anchorHabit')?.trim() : null, secondaryPillarId: formData.get('planType') === 'stacking' ? (formData.get('secondaryPillarId') || null) : null, };
    let isValid = true, errorMessage = '';
    if (!planData.pillarId) { isValid = false; errorMessage = "Please select a primary pillar."; }
    else if (!planData.activityDescription) { isValid = false; errorMessage = "Please describe the activity."; }
    else if (planData.type === 'intention' && !planData.cue) { isValid = false; errorMessage = "Please provide the 'When/If' cue."; }
    else if (planData.type === 'stacking' && !planData.anchorHabit) { isValid = false; errorMessage = "Please provide the 'After/Before' anchor habit."; }
    if (!isValid) { showToast(errorMessage, "error"); playSound('error'); return; }
    if (saveHabitPlan(planData)) { trackGAEvent(planId ? 'habit_plan_updated' : 'habit_plan_saved', { plan_type: planData.type }); showToast(`Habit plan ${planId ? 'updated' : 'saved'}!`, "success"); playSound('save', 'D5', '8n'); resetHabitPlanForm(); renderSavedHabitPlans(); }
    else { showToast("Error saving habit plan.", "error"); playSound('error'); }
}
function handleDeleteHabitPlan(planId) {
    handleInteractionForAudio(); if (!planId) return;
    const planName = getState().habitPlans?.[planId]?.activityDescription || 'this plan';
    if (confirm(`Delete plan: "${escapeHtml(planName)}"?`)) {
        if (deleteHabitPlan(planId)) { trackGAEvent('habit_plan_deleted'); showToast("Habit plan deleted.", "success"); playSound('delete', 'C3', '8n'); resetHabitPlanForm(); renderSavedHabitPlans(); }
        else { showToast("Could not find plan to delete.", "error"); playSound('error'); }
    }
}
function handleSaveName(fromOnboarding = false) {
    handleInteractionForAudio(); const inputId = fromOnboarding ? 'onboarding-name-input' : 'name-input';
    const nameInput = document.getElementById(inputId); if (!nameInput) return false;
    const name = nameInput.value.trim();
    if (name) {
        setUserName(name);
        if (!fromOnboarding) { trackGAEvent('user_name_set', { source: 'name_prompt_modal'}); closeNamePromptModal(); showToast(`Welcome, ${escapeHtml(name)}!`, "success"); refreshDailyLogUI(); }
        else { trackGAEvent('user_name_set', { source: 'onboarding'}); }
        playSound('save', 'G5', '8n'); return true;
    } else { showToast("Please enter your name.", "info"); playSound('error'); nameInput.focus(); return false; }
}
function handleCompleteOnboarding() {
    handleInteractionForAudio(); if (!handleSaveName(true)) return;
    const selectedMode = document.querySelector('input[name="onboardingMode"]:checked')?.value || 'full';
    let selectedPillarIds = [], validationPassed = true, simpleModeCount = null;
    if (selectedMode === 'simple') {
        const requiredCountInput = document.querySelector('input[name="simpleModePillarCount"]:checked');
        const requiredCount = requiredCountInput ? parseInt(requiredCountInput.value) : 0; simpleModeCount = requiredCount || null;
        const listContainer = document.getElementById('onboarding-pillar-list');
        const selectedCheckboxes = listContainer ? listContainer.querySelectorAll('input[type="checkbox"]:checked') : [];
        selectedPillarIds = Array.from(selectedCheckboxes).map(cb => cb.value);
        if (!simpleModeCount || ![3, 5, 7].includes(simpleModeCount)) { showToast("Please select a valid pillar count (3, 5, or 7).", "error"); playSound('error'); validationPassed = false; }
        else if (requiredCount > 0 && selectedPillarIds.length !== requiredCount) { showToast(`Please select exactly ${requiredCount} pillars.`, "error"); playSound('error'); validationPassed = false; }
    }
    if (validationPassed) {
        setUserMode(selectedMode);
        if (selectedMode === 'simple') { setSimpleModePillarCount(simpleModeCount); setSimpleModePillars(selectedPillarIds); }
        setOnboardingComplete(true); trackGAEvent('onboarding_completed', { mode_selected: selectedMode, simple_pillar_count: simpleModeCount });
        hideOnboardingModal(); updateUIVisibilityForMode(selectedMode); updatePlannerVisibility(getState().showPlanner); refreshDailyLogUI();
        showToast("Setup complete! Welcome to WellSpring.", "success"); playSound('achievement');
    }
}
function handleSaveSettings(event) {
    event.preventDefault(); handleInteractionForAudio(); const form = document.getElementById('settings-form'); if (!form) { showToast("Error saving settings.", "error"); return; }
    const formData = new FormData(form); const selectedMode = formData.get('settingsMode'); const showPlannerSetting = formData.get('settingsShowPlanner') === 'on'; const newName = formData.get('settingsUserName')?.trim();
    let simpleModeCount = null, selectedPillarIds = [], validationPassed = true;
    if (selectedMode === 'simple') {
        const requiredCountValue = formData.get('settingsSimpleModePillarCount'); simpleModeCount = requiredCountValue ? parseInt(requiredCountValue) : null;
        selectedPillarIds = formData.getAll('settingsPillars');
        if (!simpleModeCount || ![3, 5, 7].includes(simpleModeCount)) { showToast("Invalid pillar count selected for Simple Mode.", "error"); playSound('error'); validationPassed = false; }
        else if (selectedPillarIds.length !== simpleModeCount) { showToast(`Please select exactly ${simpleModeCount} pillars for Simple Mode.`, "error"); playSound('error'); validationPassed = false; }
    }
    if (validationPassed) {
        setUserName(newName); setUserMode(selectedMode); setShowPlanner(showPlannerSetting);
        if (selectedMode === 'simple') { setSimpleModePillarCount(simpleModeCount); setSimpleModePillars(selectedPillarIds); }
        else { setSimpleModePillarCount(null); setSimpleModePillars([]); }
        trackGAEvent('settings_saved', { mode_changed_to: selectedMode, show_planner: showPlannerSetting, name_updated: !!(newName && newName !== getState().userName) });
        updateUIVisibilityForMode(selectedMode); updatePlannerVisibility(showPlannerSetting); refreshDailyLogUI(); hideSettingsModal();
        showToast("Settings saved successfully!", "success"); playSound('save', 'F5', '8n');
    }
}
function updatePlannerVisibility(show) {
    const plannerSection = document.querySelector('.habit-planner-section'); const plannerToggleBtn = document.getElementById('habit-planner-toggle');
    if (plannerSection && plannerToggleBtn) {
        const shouldBeVisible = show && (getState().userMode !== 'simple');
        plannerSection.style.display = shouldBeVisible ? 'block' : 'none';
        if (!shouldBeVisible && plannerToggleBtn.getAttribute('aria-expanded') === 'true') { toggleCollapsibleSection(plannerToggleBtn, 'habit-planner-content'); }
    }
}
function handleEditNoteClick(noteId) {
    handleInteractionForAudio(); const timeline = getState().timeline; const noteEntry = timeline.find(entry => entry.type === 'note' && entry.noteId === noteId);
    if (!noteEntry) { showToast("Could not find the note to edit.", "error"); playSound('error'); return; }
    const currentText = noteEntry.text; const newText = prompt("Edit your note:", currentText);
    if (newText !== null && newText.trim() !== currentText.trim()) {
        if (updateNoteInTimeline(noteId, newText.trim())) { trackGAEvent('note_edited'); showToast("Note updated successfully!", "success"); playSound('save', 'E5', '16n'); renderTimeline(); }
        else { showToast("Failed to update note. It might have been deleted.", "error"); playSound('error'); renderTimeline(); }
    } else if (newText !== null && newText.trim() === currentText.trim()) { showToast("No changes made to the note.", "info"); }
    else { showToast("Note edit cancelled.", "info"); }
}
function handleDeleteNoteClick(noteId) {
    handleInteractionForAudio();
    if (confirm("Are you sure you want to delete this note? This action cannot be undone.")) {
        if (deleteNoteFromTimeline(noteId)) { trackGAEvent('note_deleted'); showToast("Note deleted successfully.", "success"); playSound('delete', 'C3', '8n'); renderTimeline(); }
        else { showToast("Failed to delete note. It might have already been deleted.", "error"); playSound('error'); renderTimeline(); }
    } else { showToast("Note deletion cancelled.", "info"); }
}
function handleTouchStart(event) {
    const targetElement = event.target; const allowScrollElements = ['textarea', 'select', '.calendar-grid', '.timeline-entries', '.achievement-board-grid', '.guide-content-inner', '#saved-plans-display', '.pillar-checkbox-grid', '.modal-content'];
    if (allowScrollElements.some(selector => targetElement.closest(selector))) { touchStartX = null; return; }
    touchStartX = event.touches[0].clientX; touchStartY = event.touches[0].clientY; touchEndX = touchStartX; touchEndY = touchStartY;
}
function handleTouchMove(event) { if (touchStartX === null) return; touchEndX = event.touches[0].clientX; touchEndY = event.touches[0].clientY; }
function handleTouchEnd(event) {
    if (touchStartX === null) return; const deltaX = touchEndX - touchStartX; const deltaY = touchEndY - touchStartY;
    if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaY) < SWIPE_MAX_VERTICAL) {
        handleInteractionForAudio(); const tabButtons = Array.from(document.querySelectorAll('.nav-tabs .tab-button:not([aria-hidden="true"])'));
        const currentTabIndex = tabButtons.findIndex(btn => btn.classList.contains('active')); let nextTabIndex = -1;
        if (deltaX < 0) { nextTabIndex = Math.min(tabButtons.length - 1, currentTabIndex + 1); } else { nextTabIndex = Math.max(0, currentTabIndex - 1); }
        if (nextTabIndex !== -1 && nextTabIndex !== currentTabIndex) {
            const nextTabButton = tabButtons[nextTabIndex]; const nextTabId = nextTabButton?.dataset.tab;
            if (nextTabId) {
                 if (nextTabId === 'calendar') { handleShowCalendarTab(); }
                 else if (nextTabId === 'journey') { renderTimeline(); updateTimelineControls(); setupAutoResizeTextarea(); updateNoteHeaderPrompt(); showTab(nextTabId); trackGAEvent('view_tab', { tab_id: nextTabId, source: 'swipe' }); }
                 else if (nextTabId === 'achievements') { renderAchievementBoard(); showTab(nextTabId); trackGAEvent('view_tab', { tab_id: nextTabId, source: 'swipe' }); }
                 else { showTab(nextTabId); trackGAEvent('view_tab', { tab_id: nextTabId, source: 'swipe' });}
                 playSound('navigate', deltaX < 0 ? 'E5' : 'C5', '16n');
            }
        }
    }
    touchStartX = 0; touchStartY = 0; touchEndX = 0; touchEndY = 0;
}
function appShowSettingsModal() { handleInteractionForAudio(); uiShowSettingsModal(); updateNotificationPermissionStatusDisplay(); trackGAEvent('settings_opened'); playSound('click', 'B4', '16n'); }

// --- Event Listener Setup ---
function setupEventListeners() {
    console.log("[App] Setting up event listeners...");
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        handleInteractionForAudio();
        toggleTheme((newTheme) => {
            trackGAEvent('theme_changed', { new_theme: newTheme });
            const analyticsContainer = document.getElementById('analytics-container');
            if (analyticsContainer && analyticsContainer.style.display === 'block') switchAnalyticsView(currentAnalyticsView);
            const achievementsTab = document.getElementById('achievements');
            if (achievementsTab?.classList.contains('active')) renderAchievementBoard();
        });
        playSound('click', 'E5', '16n');
    });
    document.getElementById('audio-toggle')?.addEventListener('click', () => { handleInteractionForAudio(); toggleSoundEnabled(); updateAudioToggleButton(); const soundEnabled = getStateReference().isSoundEnabled; trackGAEvent('sound_toggled', { enabled: soundEnabled }); playSound('click', soundEnabled ? 'C5' : 'C4', '8n'); });
    document.getElementById('settings-btn')?.addEventListener('click', appShowSettingsModal);

    document.querySelector('.nav-tabs')?.addEventListener('click', (e) => {
        if (e.target.matches('.tab-button')) {
            handleInteractionForAudio();
            const tabId = e.target.dataset.tab;
            if (tabId) {
                // --- START MODIFICATION: Call UI setups on tab switch ---
                if (tabId === 'calendar') {
                    handleShowCalendarTab(); // This already handles its rendering
                } else if (tabId === 'journey') {
                    showTab(tabId); // Show tab first
                    if (!journeyTabInitialized) {
                        setupAutoResizeTextarea();
                        journeyTabInitialized = true;
                    }
                    renderTimeline(); // Always render
                    updateTimelineControls();
                    updateNoteHeaderPrompt();
                    trackGAEvent('view_tab', { tab_id: tabId, source: 'click' });
                } else if (tabId === 'achievements') {
                    showTab(tabId); // Show tab first
                    if (!achievementsTabInitialized) {
                        // Potentially other one-time setups for achievements tab
                        achievementsTabInitialized = true;
                    }
                    renderAchievementBoard(); // Always render
                    trackGAEvent('view_tab', { tab_id: tabId, source: 'click' });
                } else { // For 'daily' or any other tabs
                    showTab(tabId);
                    if (tabId === 'daily') {
                        refreshDailyLogUI(); // Ensure daily log is fresh if explicitly clicked
                    }
                    trackGAEvent('view_tab', { tab_id: tabId, source: 'click' });
                }
                // --- END MODIFICATION ---
            }
        }
    });
    // ... (rest of event listeners from wellspring_app_reminders_1, ensuring #enable-notifications-btn listener is present)
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
    document.querySelector('.mood-options')?.addEventListener('click', (e) => {
        handleMoodClick(e);
        const moodLevel = e.target.closest('.mood-option')?.dataset.level;
        if (moodLevel) trackGAEvent('mood_changed', { level: parseInt(moodLevel) });
    });
    document.getElementById('lock-button')?.addEventListener('click', handleSaveDay);
    document.getElementById('unlock-button')?.addEventListener('click', handleUnlockDay);
    document.getElementById('add-note-btn')?.addEventListener('click', handleAddNote);
    document.getElementById('timeline-filter')?.addEventListener('change', (e) => { handleInteractionForAudio(); updateTimelineFilter(e.target.value); renderTimeline(); trackGAEvent('timeline_filter_changed', { filter_type: e.target.value }); playSound('click', 'D5', '16n'); });
    document.getElementById('timeline-sort')?.addEventListener('change', (e) => { handleInteractionForAudio(); updateTimelineSortOrder(e.target.value); renderTimeline(); trackGAEvent('timeline_sort_changed', { sort_order: e.target.value }); playSound('click', 'E5', '16n'); });
    document.getElementById('prestige-button')?.addEventListener('click', handlePrestigeClick);
    document.getElementById('new-note-textarea')?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote(); } });
    document.getElementById('calendar-grid')?.addEventListener('click', (e) => {
        const dayCell = e.target.closest('.calendar-day:not(.disabled)');
        if (dayCell?.dataset.date) { handleInteractionForAudio(); handleDateChangeInput(dayCell.dataset.date); showTab('daily'); trackGAEvent('view_tab', { tab_id: 'daily', source: 'calendar_day_click' }); playSound('click', 'E5', '16n'); }
    });
    document.getElementById('prev-month-btn')?.addEventListener('click', () => {handleMonthChange(-1); trackGAEvent('calendar_month_changed', { direction: 'previous'}); });
    document.getElementById('next-month-btn')?.addEventListener('click', () => {handleMonthChange(1); trackGAEvent('calendar_month_changed', { direction: 'next'}); });
    document.getElementById('view-analytics-btn')?.addEventListener('click', () => { handleInteractionForAudio(); toggleAnalyticsVisibility(); trackGAEvent('analytics_visibility_toggled', { visible: document.getElementById("analytics-container").style.display === "block" }); playSound('click', 'B4', '16n'); });
    document.getElementById('analytics-toggles')?.addEventListener('click', (e) => {
        if (e.target.matches('button')) {
            const view = e.target.dataset.view;
            if (view && view !== currentAnalyticsView) { handleInteractionForAudio(); switchAnalyticsView(view); trackGAEvent('analytics_view_switched', { view_id: view }); playSound('click', 'G4', '16n'); }
        }
    });
    document.getElementById('achievement-board-grid')?.addEventListener('click', (e) => {
        const card = e.target.closest('.achievement-card');
        if (card?.dataset.achievementId) { handleInteractionForAudio(); showAchievementModal(card.dataset.achievementId); trackGAEvent('achievement_modal_opened', { achievement_id: card.dataset.achievementId }); }
    });
    document.getElementById('achievement-board-grid')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const card = e.target.closest('.achievement-card');
            if (card?.dataset.achievementId) { e.preventDefault(); handleInteractionForAudio(); showAchievementModal(card.dataset.achievementId); trackGAEvent('achievement_modal_opened', { achievement_id: card.dataset.achievementId, source: 'keyboard' });}
        }
    });
    document.getElementById('dismiss-welcome-btn')?.addEventListener('click', () => { handleInteractionForAudio(); closeWelcomeModal(); trackGAEvent('welcome_modal_dismissed'); playSound('save', 'E5', '8n'); });
    document.querySelector('#welcome-modal .modal-close-btn')?.addEventListener('click', () => { handleInteractionForAudio(); closeWelcomeModal(); trackGAEvent('welcome_modal_closed'); playSound('click', 'D4', '16n'); });
    document.getElementById('welcome-modal')?.addEventListener('click', (e) => { if (e.target.id === 'welcome-modal') { handleInteractionForAudio(); closeWelcomeModal(); trackGAEvent('welcome_modal_closed'); playSound('click', 'D4', '16n'); } });
    document.getElementById('save-name-btn')?.addEventListener('click', () => handleSaveName(false));
    document.querySelector('#name-prompt-modal .modal-close-btn')?.addEventListener('click', () => { handleInteractionForAudio(); closeNamePromptModal(); trackGAEvent('name_prompt_closed'); playSound('click', 'D4', '16n'); });
    document.getElementById('name-prompt-modal')?.addEventListener('click', (e) => { if (e.target.id === 'name-prompt-modal') { handleInteractionForAudio(); closeNamePromptModal(); trackGAEvent('name_prompt_closed'); playSound('click', 'D4', '16n'); } });
    document.getElementById('name-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveName(false); } });
    document.getElementById('close-achievement-modal-btn')?.addEventListener('click', () => { handleInteractionForAudio(); hideAchievementModal(); trackGAEvent('achievement_modal_closed'); });
    document.getElementById('achievement-detail-modal')?.addEventListener('click', (e) => { if (e.target.id === 'achievement-detail-modal') { handleInteractionForAudio(); hideAchievementModal(); trackGAEvent('achievement_modal_closed'); } });
    document.getElementById('onboarding-modal')?.addEventListener('click', (e) => {
        if (e.target.matches('.onboarding-btn')) {
            handleInteractionForAudio();
            const buttonId = e.target.id; let playNavSound = true; let soundNote = 'C5';
            const currentStepEl = e.target.closest('.onboarding-step');
            const currentStepNumber = currentStepEl ? parseInt(currentStepEl.id.split('-').pop()) : 0;
            trackGAEvent('onboarding_step_interaction', { step: currentStepNumber, button_id: buttonId });
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
    document.getElementById('guide-toggle-btn')?.addEventListener('click', function() { handleInteractionForAudio(); const isExpanding = this.getAttribute('aria-expanded') === 'false'; toggleCollapsibleSection(this, 'guide-content-area'); trackGAEvent('guide_toggled', { expanded: isExpanding }); playSound('click', isExpanding ? 'F#4' : 'F4', '16n'); });
    document.getElementById('habit-planner-toggle')?.addEventListener('click', function() {
        handleInteractionForAudio();
        const isExpanding = this.getAttribute('aria-expanded') === 'false';
        toggleCollapsibleSection(this, 'habit-planner-content', () => {
            if (isExpanding) {
                populatePillarSelect(); // Initialize planner selects on first expand
                resetHabitPlanForm();
                renderSavedHabitPlans();
            }
        });
        trackGAEvent('planner_toggled', { expanded: isExpanding });
        playSound('click', isExpanding ? 'F#4' : 'F4', '16n');
    });
    document.getElementById('habit-plan-form')?.addEventListener('submit', handleSaveHabitPlan);
    ['habit-plan-activity', 'habit-plan-cue', 'habit-plan-anchor'].forEach(inputId => { document.getElementById(inputId)?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const form = e.target.closest('form'); form?.querySelector('button[type="submit"]')?.click(); } }); });
    document.querySelectorAll('input[name="planType"]')?.forEach(radio => { radio.addEventListener('change', (e) => { handleInteractionForAudio(); togglePlanTypeInputs(); trackGAEvent('planner_type_changed', { type: e.target.value }); playSound('click', 'C4', '16n'); }); });
    document.getElementById('saved-plans-display')?.addEventListener('click', (e) => {
        const planId = e.target.dataset.planId; if (!planId) return;
        if (e.target.classList.contains('edit-plan-btn')) { handleInteractionForAudio(); handleEditHabitPlan(planId); trackGAEvent('planner_edit_initiated'); playSound('click', 'E5', '16n'); showToast("Editing plan...", "info", 4000); }
        else if (e.target.classList.contains('delete-plan-btn')) handleDeleteHabitPlan(planId);
    });
    document.getElementById('delete-habit-plan-btn')?.addEventListener('click', function() { const planIdInput = document.getElementById('habit-plan-id'); if (planIdInput?.value) handleDeleteHabitPlan(planIdInput.value); });
    document.getElementById('export-data-btn')?.addEventListener('click', () => { handleInteractionForAudio(); exportData(); trackGAEvent('data_exported'); });
    document.getElementById('import-data-trigger-btn')?.addEventListener('click', () => { handleInteractionForAudio(); document.getElementById('file-input')?.click(); trackGAEvent('data_import_triggered'); playSound('click', 'D5', '16n'); });
    document.getElementById('close-settings-modal-btn')?.addEventListener('click', () => { handleInteractionForAudio(); hideSettingsModal(); trackGAEvent('settings_closed'); playSound('click', 'A4', '16n'); });
    document.getElementById('settings-modal')?.addEventListener('click', (e) => { if (e.target.id === 'settings-modal') { handleInteractionForAudio(); hideSettingsModal(); trackGAEvent('settings_closed'); playSound('click', 'A4', '16n'); } });
    document.getElementById('settings-form')?.addEventListener('submit', handleSaveSettings);
    document.getElementById('settings-name-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('save-settings-btn')?.click(); } });
    document.getElementById('settings-form')?.addEventListener('change', (e) => {
        if (e.target.matches('input[name="settingsMode"]')) { handleInteractionForAudio(); updateSettingsModalVisibility(); trackGAEvent('settings_mode_radio_changed', { new_mode: e.target.value }); playSound('click', 'C4', '16n'); }
        else if (e.target.matches('input[name="settingsSimpleModePillarCount"]')) { handleInteractionForAudio(); updateSettingsPillarCounter(); trackGAEvent('settings_simple_count_changed', { count: e.target.value }); playSound('click', 'C4', '16n'); }
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
    document.getElementById('settings-change-pillars-btn')?.addEventListener('click', () => { handleInteractionForAudio(); enableSimpleModeEditing(); trackGAEvent('settings_change_pillars_clicked'); playSound('click', 'E4', '16n'); });
    document.getElementById('settings-export-data-btn')?.addEventListener('click', () => { handleInteractionForAudio(); exportData(); trackGAEvent('data_exported_from_settings'); });
    document.getElementById('settings-import-data-trigger-btn')?.addEventListener('click', () => { handleInteractionForAudio(); document.getElementById('file-input')?.click(); trackGAEvent('data_import_triggered_from_settings'); playSound('click', 'D5', '16n'); hideSettingsModal(); });
    document.getElementById('enable-notifications-btn')?.addEventListener('click', requestNotificationPermission);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (document.getElementById('settings-modal')?.classList.contains('visible')) { handleInteractionForAudio(); hideSettingsModal(); trackGAEvent('settings_closed_esc'); }
            else if (document.getElementById('achievement-detail-modal')?.classList.contains('visible')) { handleInteractionForAudio(); hideAchievementModal(); trackGAEvent('achievement_modal_closed_esc'); }
            else if (document.getElementById('name-prompt-modal')?.classList.contains('visible')) { handleInteractionForAudio(); closeNamePromptModal(); trackGAEvent('name_prompt_closed_esc'); playSound('click', 'D4', '16n'); }
            else if (document.getElementById('welcome-modal')?.classList.contains('visible')) { handleInteractionForAudio(); closeWelcomeModal(); trackGAEvent('welcome_modal_closed_esc'); playSound('click', 'D4', '16n'); }
            else if (document.getElementById('guide-toggle-btn')?.getAttribute('aria-expanded') === 'true') { handleInteractionForAudio(); closeGuide(); trackGAEvent('guide_closed_esc'); playSound('click', 'F4', '16n'); }
            else if (deselectMood()) { handleInteractionForAudio(); trackGAEvent('mood_deselected_esc'); }
        }
    });
    const mainContentArea = document.querySelector('main');
    if (mainContentArea) {
        mainContentArea.addEventListener('touchstart', handleTouchStart, { passive: true });
        mainContentArea.addEventListener('touchmove', handleTouchMove, { passive: true });
        mainContentArea.addEventListener('touchend', handleTouchEnd);
    }
    document.getElementById('timeline-entries')?.addEventListener('click', (e) => {
        const target = e.target;
        const editButton = target.closest('.edit-note-btn');
        const deleteButton = target.closest('.delete-note-btn');
        if (editButton) { const noteId = editButton.dataset.noteId; if (noteId) handleEditNoteClick(noteId); }
        else if (deleteButton) { const noteId = deleteButton.dataset.noteId; if (noteId) handleDeleteNoteClick(noteId); }
    });
    console.log("[App] All event listeners set up.");
}

function handleShowCalendarTab() {
    toggleAnalyticsVisibility(false); // Ensure analytics is hidden
    showTab('calendar');
    trackGAEvent('view_tab', { tab_id: 'calendar', source: 'click_or_swipe' });
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
    handleDateChangeInput(dateStr); // This updates state and refreshes daily log UI
    showTab('daily'); // Switch to daily log tab
    trackGAEvent('view_tab', { tab_id: 'daily', source: 'calendar_day_click' });
    // No need to call refreshDailyLogUI() here as handleDateChangeInput should trigger it
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
