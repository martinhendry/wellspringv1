// state.js

/**
 * Manages the application state for WellSpring.
 * ... (other comments)
 * *** MODIFIED: Added state properties for notification reminder tracking. ***
 */

// --- Imports ---
import { ALL_ACHIEVEMENTS } from './achievements.js';
import { PILLARS } from './constants.js';
import { calculateLevelData, getWeekNumber } from './utils.js';
import { showToast } from './ui/globalUI.js';
import { playSound } from './audio.js';

// --- Constants ---
const LOCAL_STORAGE_KEY = 'wellspringAppState_v2';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const XP_PER_NOTE = 10;

// --- Module State ---
let appState = {};

const initialState = {
    // Core Tracking
    currentDate: new Date().toISOString().split('T')[0],
    pillars: {},
    mood: {},
    savedDays: {},

    // Gamification & Progress
    totalXP: 0,
    streak: 0,
    prestige: 0,
    level100ToastShownForCycle: null,

    // Journey & Achievements
    timeline: [],
    achievements: {},

    // Habit Planner
    habitPlans: {},

    // Settings & User Info
    userName: null,
    userMode: null,
    simpleModePillarCount: null,
    simpleModePillars: [],
    isOnboardingComplete: false,
    isSoundEnabled: true,
    showPlanner: false,

    // UI State
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    timelineSortOrder: 'newest',
    timelineFilter: 'all',

    // --- START NEW: Notification Reminder Tracking ---
    lastBackupReminderShown: null, // Timestamp (ISO string) of when the backup reminder was last shown
    lastDataExportTime: null,      // Timestamp (ISO string) of the last successful data export
    // --- END NEW: Notification Reminder Tracking ---
};

// --- State Initialization & Persistence ---
export function loadState() {
    console.log(`[State] Loading state from localStorage key: ${LOCAL_STORAGE_KEY}...`);
    let loadedState = null;
    let finalState = {};

    try {
        const storedState = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedState) {
            loadedState = JSON.parse(storedState);
            console.log("[State] Saved state found in localStorage.");
        } else {
            console.log("[State] No saved state found, initializing with defaults.");
        }
    } catch (error) {
        console.error("[State] Error loading/parsing state from localStorage:", error);
    }

    finalState = JSON.parse(JSON.stringify(initialState));
    finalState.currentDate = new Date().toISOString().split('T')[0];
    finalState.currentMonth = new Date().getMonth();
    finalState.currentYear = new Date().getFullYear();

    PILLARS.forEach(p => {
        if (!finalState.pillars[p.id]) {
            finalState.pillars[p.id] = { days: {} };
        }
    });

    if (loadedState) {
        console.log("[State] Merging loaded state with defaults...");
        Object.keys(initialState).forEach(key => {
            if (key === 'currentDate' || key === 'currentMonth' || key === 'currentYear') {
                return;
            }
            if (loadedState.hasOwnProperty(key) && loadedState[key] !== undefined && loadedState[key] !== null) {
                 if (key === 'pillars' || key === 'mood' || key === 'savedDays' || key === 'habitPlans') {
                    if (typeof loadedState[key] === 'object') {
                        finalState[key] = { ...(initialState[key] || {}), ...loadedState[key] };
                    } else {
                        console.warn(`[State Load] Ignoring invalid type for '${key}' in loaded data. Expected object.`);
                    }
                } else if (key === 'timeline') {
                    finalState[key] = Array.isArray(loadedState[key]) ? loadedState[key] : [...initialState[key]];
                } else if (key === 'simpleModePillars') {
                     finalState[key] = (Array.isArray(loadedState[key]) && loadedState[key].every(item => typeof item === 'string'))
                                       ? loadedState[key] : [...initialState[key]];
                } else if (['isSoundEnabled', 'isOnboardingComplete', 'showPlanner'].includes(key)) {
                    finalState[key] = typeof loadedState[key] === 'boolean' ? loadedState[key] : initialState[key];
                } else if (key === 'userMode') {
                    finalState[key] = (loadedState[key] === 'simple' || loadedState[key] === 'full') ? loadedState[key] : initialState[key];
                } else if (key === 'simpleModePillarCount' || key === 'level100ToastShownForCycle') {
                    const validCounts = [3, 5, 7];
                    if (key === 'simpleModePillarCount') {
                         finalState[key] = (typeof loadedState[key] === 'number' && validCounts.includes(loadedState[key])) ? loadedState[key] : initialState[key];
                    } else {
                         finalState[key] = (typeof loadedState[key] === 'number' || loadedState[key] === null) ? loadedState[key] : initialState[key];
                    }
                // --- START NEW: Handle loading of new reminder state properties ---
                } else if (key === 'lastBackupReminderShown' || key === 'lastDataExportTime') {
                    // Ensure it's a string (ISO date) or null
                    finalState[key] = (typeof loadedState[key] === 'string' || loadedState[key] === null) ? loadedState[key] : initialState[key];
                // --- END NEW ---
                } else {
                    if (typeof loadedState[key] === typeof initialState[key] || initialState[key] === null) {
                         finalState[key] = loadedState[key];
                    } else {
                        console.warn(`[State Load] Type mismatch for '${key}'. Expected ${typeof initialState[key]}, got ${typeof loadedState[key]}. Using default.`);
                    }
                }
            }
        });
    }

    console.log("[State] Merging achievement definitions with loaded state...");
    const initialAchievements = {};
    const loadedAchievements = loadedState?.achievements || {};

    if (ALL_ACHIEVEMENTS && typeof ALL_ACHIEVEMENTS === 'object') {
        Object.keys(ALL_ACHIEVEMENTS).forEach(id => {
             const definition = ALL_ACHIEVEMENTS[id];
             if (definition && typeof definition.name === 'string' && typeof definition.description === 'string' && definition.criteria) {
                 initialAchievements[id] = {
                     id: definition.id,
                     name: definition.name,
                     description: definition.description,
                     flavor: definition.flavor || '',
                     icon: definition.icon || 'fa-solid fa-question-circle',
                     criteria: { ...(definition.criteria) },
                     unlocked: loadedAchievements[id]?.unlocked ?? definition.unlocked ?? false,
                     date: loadedAchievements[id]?.date ?? definition.date ?? null,
                 };
             } else {
                 console.warn(`[State Load] Invalid achievement definition for ID: ${id}. Skipping.`);
             }
        });
    } else {
        console.error("[State Load] ALL_ACHIEVEMENTS constant is not defined correctly.");
    }
    finalState.achievements = initialAchievements;

    appState = finalState;
    console.log("[State] State loaded/initialized.");
}

export function saveState(action = 'unknown') {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appState));
        document.dispatchEvent(new CustomEvent('stateChanged', { detail: { action: action } }));
    } catch (error) {
        console.error("[State] Error saving state to localStorage:", error);
    }
}

export function getState() {
    if (typeof appState !== 'object' || appState === null) {
        try { return JSON.parse(JSON.stringify(initialState)); } catch (e) { return {}; }
    }
    if (typeof structuredClone === 'function') {
        try { return structuredClone(appState); } catch (e) { /* Fall through */ }
    }
    try { return JSON.parse(JSON.stringify(appState)); } catch (e) { return { ...appState }; }
}

export function getStateReference() {
    return appState;
}

// --- State Mutators ---
// ... (updateCurrentDate, togglePillarStatus, updateMood, addTimelineEntry, updateNoteInTimeline, deleteNoteFromTimeline, prestigeLevel, etc. - ALL EXISTING MUTATORS REMAIN HERE) ...

export function updateCurrentDate(newDate) {
    if (typeof newDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
        if (appState.currentDate !== newDate) {
            appState.currentDate = newDate;
            try {
                const dateObj = new Date(newDate + 'T00:00:00Z');
                appState.currentMonth = dateObj.getUTCMonth();
                appState.currentYear = dateObj.getUTCFullYear();
            } catch (e) {
                console.error("[State] Error updating calendar month/year from new date:", e);
            }
        }
    } else {
        console.error("[State] Invalid date format provided to updateCurrentDate:", newDate);
    }
}

export function togglePillarStatus(pillarId, dateString) {
    if (!appState.pillars) appState.pillars = {};
    if (!appState.pillars[pillarId]) appState.pillars[pillarId] = { days: {} };
    if (!appState.pillars[pillarId].days) appState.pillars[pillarId].days = {};
    const currentStatus = appState.pillars[pillarId].days[dateString] || false;
    const newStatus = !currentStatus;
    appState.pillars[pillarId].days[dateString] = newStatus;
    saveState('togglePillar');
    return newStatus;
}

export function updateMood(dateString, level) {
    if (!appState.mood) appState.mood = {};
    const currentMood = appState.mood[dateString];
    let changed = false;
    if (typeof level === 'number' && level >= 1 && level <= 5) {
        if (currentMood !== level) {
            appState.mood[dateString] = level;
            changed = true;
        }
    } else if (level === 0 || level === null || typeof level === 'undefined') {
        if (currentMood !== undefined) {
            delete appState.mood[dateString];
            changed = true;
        }
    } else {
        console.warn("[State] Invalid mood level provided to updateMood:", level);
    }
    if (changed) saveState('updateMood');
}

export function addTimelineEntry(entry) {
    if (!appState.timeline) appState.timeline = [];
    if (!entry || typeof entry !== 'object' || !entry.type || !entry.date) {
        console.error("[State] Invalid timeline entry provided:", entry);
        return;
    }
    if (entry.type === 'note' && !entry.noteId) {
        entry.noteId = crypto.randomUUID();
    }
    let alreadyExists = false;
    if (entry.type === 'achievement') {
        alreadyExists = appState.timeline.some(item => item?.type === 'achievement' && item.achievementId === entry.achievementId);
        if (alreadyExists) return;
    } else if (entry.type === 'prestige') {
        alreadyExists = appState.timeline.some(item => item?.type === 'prestige' && item.prestigeLevel === entry.prestigeLevel);
        if (alreadyExists) return;
    }
    let xpAdded = 0;
    if (entry.type === 'note') {
        appState.totalXP = (appState.totalXP || 0) + XP_PER_NOTE;
        xpAdded = XP_PER_NOTE;
    }
    appState.timeline.unshift(entry);
    saveState('addTimelineEntry');
    if (xpAdded > 0) {
        checkAchievements(getStateReference());
    }
}

export function updateNoteInTimeline(noteId, newText) {
    if (!appState.timeline || !noteId || typeof newText !== 'string') return false;
    const noteIndex = appState.timeline.findIndex(entry => entry.type === 'note' && entry.noteId === noteId);
    if (noteIndex !== -1) {
        const trimmedText = newText.trim();
        if (trimmedText === "") return deleteNoteFromTimeline(noteId);
        appState.timeline[noteIndex].text = trimmedText;
        appState.timeline[noteIndex].updatedAt = new Date().toISOString();
        saveState('updateNoteInTimeline');
        return true;
    }
    return false;
}

export function deleteNoteFromTimeline(noteId) {
    if (!appState.timeline || !noteId) return false;
    const initialLength = appState.timeline.length;
    appState.timeline = appState.timeline.filter(entry => !(entry.type === 'note' && entry.noteId === noteId));
    if (appState.timeline.length < initialLength) {
        saveState('deleteNoteFromTimeline');
        return true;
    }
    return false;
}

export function prestigeLevel() {
    if (typeof calculateLevelData !== 'function') return false;
    try {
        const levelData = calculateLevelData(appState.totalXP, appState.prestige);
        if (levelData.level >= 100) {
            const newCycleNumber = (appState.prestige || 0) + 1;
            addTimelineEntry({ type: 'prestige', date: new Date().toISOString(), prestigeLevel: newCycleNumber });
            appState.prestige = newCycleNumber;
            appState.totalXP = 0;
            appState.level100ToastShownForCycle = null;
            saveState('prestige');
            return true;
        }
        return false;
    } catch (error) { return false; }
}

export function toggleSoundEnabled() {
    appState.isSoundEnabled = !(appState.isSoundEnabled ?? true);
    saveState('toggleSound');
}

export function updateTimelineSortOrder(newOrder) {
    if ((newOrder === 'newest' || newOrder === 'oldest') && appState.timelineSortOrder !== newOrder) {
        appState.timelineSortOrder = newOrder;
        saveState('sortTimeline');
    }
}

export function updateTimelineFilter(newFilter) {
    const validFilters = ['all', 'note', 'achievement', 'prestige'];
    if (validFilters.includes(newFilter) && appState.timelineFilter !== newFilter) {
        appState.timelineFilter = newFilter;
        saveState('filterTimeline');
    }
}

export function setUserName(newName) {
    if (typeof newName === 'string') {
        const trimmedName = newName.trim();
        if (trimmedName && appState.userName !== trimmedName) { appState.userName = trimmedName; saveState('setUserName'); }
        else if (!trimmedName && appState.userName !== null) { appState.userName = null; saveState('setUserName'); }
    } else if (newName === null && appState.userName !== null) { appState.userName = null; saveState('setUserName'); }
}

export function setUserMode(mode) {
    if ((mode === 'simple' || mode === 'full' || mode === null) && appState.userMode !== mode) {
        appState.userMode = mode;
        if (mode === 'full' || mode === null) { appState.simpleModePillarCount = null; appState.simpleModePillars = []; }
        saveState('setUserMode');
    }
}

export function setSimpleModePillarCount(count) {
    const validCounts = [3, 5, 7];
    if ((count === null || (typeof count === 'number' && validCounts.includes(count))) && appState.simpleModePillarCount !== count) {
        appState.simpleModePillarCount = count;
        saveState('setSimpleModePillarCount');
    }
}

export function setSimpleModePillars(selectedPillars) {
    if (!Array.isArray(selectedPillars) || !selectedPillars.every(id => typeof id === 'string')) return;
    if (JSON.stringify(appState.simpleModePillars) !== JSON.stringify(selectedPillars)) {
        appState.simpleModePillars = [...selectedPillars];
        saveState('setSimpleModePillars');
    }
}

export function unlockAchievement(achievementId) {
    if (!appState.achievements || !appState.achievements[achievementId] || appState.achievements[achievementId].unlocked) return false;
    const unlockDate = new Date().toISOString();
    const achievementName = appState.achievements[achievementId].name || 'Achievement';
    appState.achievements[achievementId].unlocked = true;
    appState.achievements[achievementId].date = unlockDate;
    addTimelineEntry({ type: 'achievement', date: unlockDate, achievementId: achievementId });
    showToast(`🏆 Achievement Unlocked: ${achievementName}!`, 'success', 5000);
    playSound('achievement');
    return true;
}

export function saveHabitPlan(planData) {
    if (!planData || typeof planData !== 'object' || !planData.id || !planData.type || !planData.pillarId || !planData.activityDescription) return false;
    if (!appState.habitPlans) appState.habitPlans = {};
    const planId = planData.id;
    const isUpdating = !!appState.habitPlans[planId];
    appState.habitPlans[planId] = { ...planData, createdAt: isUpdating ? (appState.habitPlans[planId].createdAt) : (planData.createdAt || new Date().toISOString()), updatedAt: new Date().toISOString() };
    saveState(isUpdating ? 'updateHabitPlan' : 'addHabitPlan');
    return true;
}

export function deleteHabitPlan(planId) {
    if (!planId || !appState.habitPlans || !appState.habitPlans[planId]) return false;
    delete appState.habitPlans[planId];
    saveState('deleteHabitPlan');
    return true;
}

export function saveDay(dateString) {
    if (!appState.savedDays) appState.savedDays = {};
    if (appState.savedDays[dateString]) return false;
    appState.savedDays[dateString] = true;
    calculateXP(dateString);
    calculateStreak();
    saveState('saveDay');
    return true;
}

export function unlockDayEntry(dateString) {
    if (!appState.savedDays || !appState.savedDays[dateString]) return false;
    delete appState.savedDays[dateString];
    calculateStreak();
    saveState('unlockDay');
    return true;
}

export function setOnboardingComplete(isComplete) {
    if (typeof isComplete === 'boolean' && appState.isOnboardingComplete !== isComplete) {
        appState.isOnboardingComplete = isComplete;
        saveState('setOnboardingComplete');
    }
}

export function setShowPlanner(show) {
    if (typeof show === 'boolean' && appState.showPlanner !== show) {
        appState.showPlanner = show;
        saveState('setShowPlanner');
    }
}

export function setLevel100ToastShown(cycleNumber) {
    if (typeof cycleNumber === 'number' && appState.level100ToastShownForCycle !== cycleNumber) {
        appState.level100ToastShownForCycle = cycleNumber;
        saveState('setLevel100ToastShown');
    }
}

// --- START NEW: State mutators for reminder tracking ---
/**
 * Updates the timestamp for when the backup reminder was last shown.
 */
export function setLastBackupReminderShown() {
    appState.lastBackupReminderShown = new Date().toISOString();
    saveState('setLastBackupReminderShown');
    console.log(`[State] Last backup reminder shown timestamp updated: ${appState.lastBackupReminderShown}`);
}

/**
 * Updates the timestamp for the last successful data export.
 */
export function setLastDataExportTime() {
    appState.lastDataExportTime = new Date().toISOString();
    // This will also implicitly update when the next backup reminder might be due,
    // so we can also reset the "last shown" if we want the reminder interval to restart after an export.
    // appState.lastBackupReminderShown = null; // Optional: reset reminder shown time
    saveState('setLastDataExportTime');
    console.log(`[State] Last data export timestamp updated: ${appState.lastDataExportTime}`);
}
// --- END NEW: State mutators for reminder tracking ---


// --- Internal Helper Functions ---
function calculateStreak() {
    // ... (existing calculateStreak function)
    const savedDates = Object.keys(appState.savedDays || {}).sort();
    let finalStreak = 0;
    if (savedDates.length > 0) {
        let currentRun = 0;
        let lastDateInRun = null;
        const today = new Date(); today.setUTCHours(0, 0, 0, 0);
        const yesterday = new Date(today); yesterday.setUTCDate(today.getUTCDate() - 1);
        const todayTime = today.getTime();
        const yesterdayTime = yesterday.getTime();

        for (let i = 0; i < savedDates.length; i++) {
            try {
                const currentDate = new Date(savedDates[i] + 'T00:00:00Z');
                if (isNaN(currentDate.getTime())) continue;
                if (i > 0) {
                    const previousDate = new Date(savedDates[i - 1] + 'T00:00:00Z');
                    if (isNaN(previousDate.getTime())) {
                        currentRun = 1;
                    } else {
                        if (currentDate.getTime() - previousDate.getTime() === ONE_DAY_MS) {
                            currentRun++;
                        } else {
                            currentRun = 1;
                        }
                    }
                } else {
                    currentRun = 1;
                }
                lastDateInRun = currentDate;
                const lastDateTime = lastDateInRun.getTime();
                if (lastDateTime === todayTime || lastDateTime === yesterdayTime) {
                    finalStreak = Math.max(finalStreak, currentRun);
                }
            } catch (e) {
                finalStreak = 0; break;
            }
        }
    }
    if (appState.streak !== finalStreak) {
        appState.streak = finalStreak;
    }
}

function calculateXP(dateString) {
    // ... (existing calculateXP function)
    if (!appState.pillars || !appState.mood) return;
    const baseXPPerPillar = 5;
    const streakBonusDivisor = 5;
    const moodMultipliers = { 1: 0.8, 2: 0.9, 3: 1.0, 4: 1.1, 5: 1.2 };
    let pillarXP = 0;
    PILLARS.forEach(p => {
        if (appState.pillars[p.id]?.days?.[dateString]) pillarXP += baseXPPerPillar;
    });
    const streakBonus = Math.floor((appState.streak || 0) / streakBonusDivisor);
    const moodLevel = appState.mood[dateString];
    const moodMultiplier = moodLevel ? (moodMultipliers[moodLevel] || 1.0) : 1.0;
    const baseXpWithBonus = pillarXP + streakBonus;
    const finalXpWithMood = Math.round(baseXpWithBonus * moodMultiplier);
    appState.totalXP = (appState.totalXP || 0) + finalXpWithMood;
}
