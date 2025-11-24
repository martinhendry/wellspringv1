// state.js

/**
 * Manages the application state for WellSpring.
 * *** MODIFIED: Implemented retroactive XP recalculation and state reloading. ***
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
const XP_PER_PILLAR = 5; // Base XP per pillar
const STREAK_BONUS_DIVISOR = 5; // Bonus XP = streak / 5

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

    // Notification Reminder Tracking
    lastBackupReminderShown: null,
    lastDataExportTime: null,
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
        Object.keys(initialState).forEach(key => {
            if (key === 'currentDate' || key === 'currentMonth' || key === 'currentYear') {
                return;
            }
            if (loadedState.hasOwnProperty(key) && loadedState[key] !== undefined && loadedState[key] !== null) {
                 if (['pillars', 'mood', 'savedDays', 'habitPlans'].includes(key)) {
                    if (typeof loadedState[key] === 'object') {
                        finalState[key] = { ...(initialState[key] || {}), ...loadedState[key] };
                    }
                } else if (key === 'timeline') {
                    finalState[key] = Array.isArray(loadedState[key]) ? loadedState[key] : [...initialState[key]];
                } else if (key === 'simpleModePillars') {
                     finalState[key] = (Array.isArray(loadedState[key])) ? loadedState[key] : [...initialState[key]];
                } else {
                     finalState[key] = loadedState[key];
                }
            }
        });
    }

    // Merge Achievements
    const initialAchievements = {};
    const loadedAchievements = loadedState?.achievements || {};
    if (ALL_ACHIEVEMENTS) {
        Object.keys(ALL_ACHIEVEMENTS).forEach(id => {
             const definition = ALL_ACHIEVEMENTS[id];
             initialAchievements[id] = {
                 id: definition.id,
                 name: definition.name,
                 description: definition.description,
                 flavor: definition.flavor || '',
                 icon: definition.icon || 'fa-solid fa-question-circle',
                 criteria: { ...(definition.criteria) },
                 unlocked: loadedAchievements[id]?.unlocked ?? false,
                 date: loadedAchievements[id]?.date ?? null,
             };
        });
    }
    finalState.achievements = initialAchievements;

    appState = finalState;
    // Recalculate XP on load to ensure data integrity
    recalculateTotalXP(); 
    console.log("[State] State loaded.");
}

/**
 * Reloads the state from local storage. Used for cross-tab synchronization.
 * @returns {boolean} True if state was reloaded successfully.
 */
export function reloadState() {
    try {
        const storedState = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedState) {
            const parsed = JSON.parse(storedState);
            // We preserve the current date/view settings to not jar the user
            const currentViewSettings = {
                currentDate: appState.currentDate,
                currentMonth: appState.currentMonth,
                currentYear: appState.currentYear,
                // Keep UI transient state if needed
            };
            
            appState = { ...appState, ...parsed, ...currentViewSettings };
            // Re-merge complex objects to ensure safety
            if (parsed.pillars) appState.pillars = parsed.pillars;
            if (parsed.mood) appState.mood = parsed.mood;
            if (parsed.savedDays) appState.savedDays = parsed.savedDays;
            if (parsed.timeline) appState.timeline = parsed.timeline;
            
            console.log("[State] State reloaded from external change.");
            return true;
        }
    } catch (e) {
        console.error("[State] Error reloading state:", e);
    }
    return false;
}

export function saveState(action = 'unknown') {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appState));
        document.dispatchEvent(new CustomEvent('stateChanged', { detail: { action: action } }));
    } catch (error) {
        console.error("[State] Error saving state to localStorage:", error);
    }
}

export function resetState() {
    try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        localStorage.removeItem('wellnessTrackerVisited');
        return true;
    } catch (error) {
        return false;
    }
}

export function getState() {
    if (typeof appState !== 'object' || appState === null) return JSON.parse(JSON.stringify(initialState));
    try { return JSON.parse(JSON.stringify(appState)); } catch (e) { return { ...appState }; }
}

export function getStateReference() {
    return appState;
}

// --- State Mutators ---

export function updateCurrentDate(newDate) {
    if (typeof newDate === 'string') {
        appState.currentDate = newDate;
        const dateObj = new Date(newDate + 'T00:00:00Z');
        appState.currentMonth = dateObj.getUTCMonth();
        appState.currentYear = dateObj.getUTCFullYear();
    }
}

export function togglePillarStatus(pillarId, dateString) {
    if (!appState.pillars[pillarId]) appState.pillars[pillarId] = { days: {} };
    const newStatus = !appState.pillars[pillarId].days[dateString];
    appState.pillars[pillarId].days[dateString] = newStatus;
    saveState('togglePillar');
    return newStatus;
}

export function updateMood(dateString, level) {
    if (level === 0) delete appState.mood[dateString];
    else appState.mood[dateString] = level;
    saveState('updateMood');
}

export function addTimelineEntry(entry) {
    if (!appState.timeline) appState.timeline = [];
    if (entry.type === 'note') {
        entry.noteId = crypto.randomUUID();
        // Note XP is handled in recalculateTotalXP
    }
    appState.timeline.unshift(entry);
    recalculateTotalXP(); // Recalculate to include new note XP
    saveState('addTimelineEntry');
}

export function updateNoteInTimeline(noteId, newText) {
    const entry = appState.timeline.find(e => e.type === 'note' && e.noteId === noteId);
    if (entry) {
        entry.text = newText;
        entry.updatedAt = new Date().toISOString();
        saveState('updateNoteInTimeline');
        return true;
    }
    return false;
}

export function deleteNoteFromTimeline(noteId) {
    appState.timeline = appState.timeline.filter(e => !(e.type === 'note' && e.noteId === noteId));
    recalculateTotalXP(); // Recalculate to remove note XP
    saveState('deleteNoteFromTimeline');
    return true;
}

export function prestigeLevel() {
    const levelData = calculateLevelData(appState.totalXP, appState.prestige);
    if (levelData.level >= 100) {
        appState.prestige++;
        // Add timeline entry
        appState.timeline.unshift({ type: 'prestige', date: new Date().toISOString(), prestigeLevel: appState.prestige });
        // Note: totalXP will be recalculated based on history, but calculation logic for *level* handles prestige scaling.
        // However, traditionally prestige resets XP. In this non-destructive model, we might just increase the requirement.
        // If we want to strictly reset XP to 0 visually, we need to offset the calculation or clear history (bad).
        // The 'calculateLevelData' utility handles the math using Total XP vs Prestige Rank.
        // So we simply save the new prestige rank.
        appState.level100ToastShownForCycle = null;
        saveState('prestige');
        return true;
    }
    return false;
}

export function saveDay(dateString) {
    if (appState.savedDays[dateString]) return false;
    appState.savedDays[dateString] = true;
    recalculateTotalXP(); // Full recalculation ensures correct values
    saveState('saveDay');
    return true;
}

export function unlockDayEntry(dateString) {
    if (!appState.savedDays[dateString]) return false;
    delete appState.savedDays[dateString];
    recalculateTotalXP(); // Deducts XP by recalculating history without this day
    saveState('unlockDay');
    return true;
}

// --- Helper: Retroactive XP Calculation ---

/**
 * Recalculates the total XP and Streak from scratch based on the saved history.
 * This prevents "XP farming" by locking/unlocking days and ensures data consistency.
 */
function recalculateTotalXP() {
    let calculatedXP = 0;
    
    // 1. Calculate XP from Notes
    if (Array.isArray(appState.timeline)) {
        const noteCount = appState.timeline.filter(e => e.type === 'note').length;
        calculatedXP += (noteCount * XP_PER_NOTE);
    }

    // 2. Calculate XP from Days (Pillars + Mood + Streak Bonus)
    // We must iterate chronologically to calculate the streak bonus correctly for each day
    const sortedDates = Object.keys(appState.savedDays || {}).sort();
    let currentIterativeStreak = 0;
    
    // Mood multipliers
    const moodMultipliers = { 1: 0.8, 2: 0.9, 3: 1.0, 4: 1.1, 5: 1.2 };

    sortedDates.forEach((dateStr, index) => {
        // A. Update Streak Counter for this specific day in history
        const thisDate = new Date(dateStr + 'T00:00:00Z');
        if (index > 0) {
            const prevDate = new Date(sortedDates[index - 1] + 'T00:00:00Z');
            const diffTime = Math.abs(thisDate - prevDate);
            const diffDays = Math.ceil(diffTime / ONE_DAY_MS); 
            
            if (diffDays === 1) {
                currentIterativeStreak++;
            } else {
                currentIterativeStreak = 1;
            }
        } else {
            currentIterativeStreak = 1;
        }

        // B. Calculate Base Pillar XP for this day
        let dailyPillarXP = 0;
        PILLARS.forEach(p => {
            if (appState.pillars[p.id]?.days?.[dateStr]) {
                dailyPillarXP += XP_PER_PILLAR;
            }
        });

        // C. Calculate Bonus
        const streakBonus = Math.floor(currentIterativeStreak / STREAK_BONUS_DIVISOR);
        
        // D. Apply Mood Multiplier
        const moodLevel = appState.mood[dateStr];
        const multiplier = moodLevel ? (moodMultipliers[moodLevel] || 1.0) : 1.0;

        // E. Finalize Day XP
        const dayTotal = Math.round((dailyPillarXP + streakBonus) * multiplier);
        calculatedXP += dayTotal;
    });

    // Update State
    appState.totalXP = calculatedXP;
    appState.streak = currentIterativeStreak; // The streak at the end of the loop is the current streak
}

// --- Passthrough Setters ---
export function toggleSoundEnabled() { appState.isSoundEnabled = !appState.isSoundEnabled; saveState('toggleSound'); }
export function updateTimelineSortOrder(o) { appState.timelineSortOrder = o; saveState('sortTimeline'); }
export function updateTimelineFilter(f) { appState.timelineFilter = f; saveState('filterTimeline'); }
export function setUserName(n) { appState.userName = n; saveState('setUserName'); }
export function setUserMode(m) { appState.userMode = m; saveState('setUserMode'); }
export function setSimpleModePillarCount(c) { appState.simpleModePillarCount = c; saveState('setSimpleModePillarCount'); }
export function setSimpleModePillars(p) { appState.simpleModePillars = p; saveState('setSimpleModePillars'); }
export function setOnboardingComplete(c) { appState.isOnboardingComplete = c; saveState('setOnboardingComplete'); }
export function setShowPlanner(s) { appState.showPlanner = s; saveState('setShowPlanner'); }
export function setLevel100ToastShown(c) { appState.level100ToastShownForCycle = c; saveState('setLevel100ToastShown'); }
export function setLastBackupReminderShown() { appState.lastBackupReminderShown = new Date().toISOString(); saveState('setLastBackupReminderShown'); }
export function setLastDataExportTime() { appState.lastDataExportTime = new Date().toISOString(); saveState('setLastDataExportTime'); }
export function unlockAchievement(id) { 
    if (!appState.achievements[id].unlocked) {
        appState.achievements[id].unlocked = true; 
        appState.achievements[id].date = new Date().toISOString();
        addTimelineEntry({ type: 'achievement', date: new Date().toISOString(), achievementId: id });
        return true;
    }
    return false;
}
export function saveHabitPlan(p) { appState.habitPlans = appState.habitPlans || {}; appState.habitPlans[p.id] = p; saveState('saveHabitPlan'); return true; }
export function deleteHabitPlan(id) { delete appState.habitPlans[id]; saveState('deleteHabitPlan'); return true; }
