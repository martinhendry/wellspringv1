// state.js

/**
 * Manages the application state for WellSpring, including loading, saving,
 * accessing, and mutating data related to pillars, mood, timeline, achievements,
 * settings, and user progress.
 * *** MODIFIED: Adjusted XP calculation logic (v3). ***
 */

// --- Imports ---
import { ALL_ACHIEVEMENTS } from './achievements.js'; // Achievement definitions
import { PILLARS } from './constants.js';             // Pillar definitions
import { calculateLevelData, getWeekNumber } from './utils.js'; // Utility functions
import { showToast } from './ui/globalUI.js';
import { playSound } from './audio.js';

// --- Constants ---
const LOCAL_STORAGE_KEY = 'wellspringAppState_v2'; // Use a distinct key for the new structure
const ONE_DAY_MS = 24 * 60 * 60 * 1000; // Milliseconds in a day
// *** ADDED: XP Constants for Notes ***
const XP_PER_NOTE = 10;

// --- Module State ---
let appState = {}; // Holds the current application state

// Define the initial structure and default values for a new user's state.
const initialState = {
    // Core Tracking
    currentDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD
    pillars: {}, // { pillarId: { days: { 'YYYY-MM-DD': true/false } } }
    mood: {}, // { 'YYYY-MM-DD': moodLevel (1-5) }
    savedDays: {}, // { 'YYYY-MM-DD': true } - Tracks which days have been explicitly saved

    // Gamification & Progress
    totalXP: 0,
    streak: 0, // Current consecutive days logged streak
    prestige: 0, // Cycle count
    level100ToastShownForCycle: null, // Stores the cycle number for which the toast was last shown

    // Journey & Achievements
    timeline: [], // Array of { type: 'note'/'achievement'/'prestige', date: ISOString, ... }
    achievements: {}, // { achievementId: { unlocked: bool, date: ISOString | null, ... } }

    // Habit Planner
    habitPlans: {}, // { planId: { id, type, pillarId, activityDescription, cue?, anchorHabit?, secondaryPillarId?, createdAt, updatedAt } }

    // Settings & User Info
    userName: null,
    userMode: null, // 'simple' or 'full' (or null if onboarding not done)
    simpleModePillarCount: null, // 3, 5, or 7 (if userMode is 'simple')
    simpleModePillars: [], // Array of pillar IDs selected for simple mode
    isOnboardingComplete: false,
    isSoundEnabled: true,
    showPlanner: false, // Whether to show the planner section in Full Mode (Default: OFF)

    // UI State (Not strictly core data, but useful to persist)
    currentMonth: new Date().getMonth(), // 0-indexed month for calendar view
    currentYear: new Date().getFullYear(), // Year for calendar view
    timelineSortOrder: 'newest', // 'newest' or 'oldest'
    timelineFilter: 'all', // 'all', 'note', 'achievement', 'prestige'
};

// --- State Initialization & Persistence ---

/**
 * Loads the application state from localStorage.
 * If no saved state is found or if parsing fails, it initializes with default values.
 * Merges loaded data with defaults to handle potential missing keys in older versions.
 */
export function loadState() {
    console.log(`[State] Loading state from localStorage key: ${LOCAL_STORAGE_KEY}...`);
    let loadedState = null;
    let finalState = {};

    // Try to load and parse state from localStorage
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
        // If loading fails, proceed with defaults
    }

    // Start with a fresh copy of the initial state structure
    finalState = JSON.parse(JSON.stringify(initialState));
    // Ensure current date/month/year reflect the actual current time, not potentially old saved values
    finalState.currentDate = new Date().toISOString().split('T')[0];
    finalState.currentMonth = new Date().getMonth();
    finalState.currentYear = new Date().getFullYear();

    // Initialize Pillar Structure based on constants, ensuring all defined pillars exist
    PILLARS.forEach(p => {
        if (!finalState.pillars[p.id]) {
            finalState.pillars[p.id] = { days: {} };
        }
    });

    // Merge the loaded state (if any) onto the default structure
    if (loadedState) {
        console.log("[State] Merging loaded state with defaults...");
        Object.keys(initialState).forEach(key => {
            // Skip keys that should always be current (date/month/year)
            if (key === 'currentDate' || key === 'currentMonth' || key === 'currentYear') {
                return;
            }

            // Check if the key exists in the loaded data and is not null/undefined
            if (loadedState.hasOwnProperty(key) && loadedState[key] !== undefined && loadedState[key] !== null) {
                // Specific handling for complex objects/arrays to merge correctly
                 if (key === 'pillars' || key === 'mood' || key === 'savedDays' || key === 'habitPlans') {
                    // Ensure loaded data is an object before merging
                    if (typeof loadedState[key] === 'object') {
                        finalState[key] = { ...(initialState[key] || {}), ...loadedState[key] };
                    } else {
                        console.warn(`[State Load] Ignoring invalid type for '${key}' in loaded data. Expected object.`);
                    }
                } else if (key === 'timeline') {
                    // Ensure timeline is an array
                    finalState[key] = Array.isArray(loadedState[key]) ? loadedState[key] : [...initialState[key]];
                } else if (key === 'simpleModePillars') {
                    // Ensure simpleModePillars is an array of strings
                     finalState[key] = (Array.isArray(loadedState[key]) && loadedState[key].every(item => typeof item === 'string'))
                                       ? loadedState[key] : [...initialState[key]];
                } else if (['isSoundEnabled', 'isOnboardingComplete', 'showPlanner'].includes(key)) {
                    // Ensure boolean values are boolean
                    // IMPORTANT: For existing users, respect their saved 'showPlanner' setting
                    // Only use initialState default if the key is missing in loadedState
                    finalState[key] = typeof loadedState[key] === 'boolean' ? loadedState[key] : initialState[key];
                } else if (key === 'userMode') {
                    // Ensure userMode is one of the valid strings or null
                    finalState[key] = (loadedState[key] === 'simple' || loadedState[key] === 'full') ? loadedState[key] : initialState[key];
                } else if (key === 'simpleModePillarCount' || key === 'level100ToastShownForCycle') {
                    // Validate simpleModePillarCount and level100ToastShownForCycle
                    const validCounts = [3, 5, 7];
                    if (key === 'simpleModePillarCount') {
                         finalState[key] = (typeof loadedState[key] === 'number' && validCounts.includes(loadedState[key])) ? loadedState[key] : initialState[key];
                    } else { // For level100ToastShownForCycle
                         finalState[key] = (typeof loadedState[key] === 'number' || loadedState[key] === null) ? loadedState[key] : initialState[key];
                    }
                } else {
                    // For other keys, check type compatibility or if default is null
                    if (typeof loadedState[key] === typeof initialState[key] || initialState[key] === null) {
                         finalState[key] = loadedState[key];
                    } else {
                        console.warn(`[State Load] Type mismatch for '${key}'. Expected ${typeof initialState[key]}, got ${typeof loadedState[key]}. Using default.`);
                    }
                }
            }
            // If key *doesn't* exist in loadedState, it will retain the initialState default value
        });
    }

    // Merge Achievements Separately: Ensure all defined achievements exist in the state,
    // preserving unlocked status and date from loaded data if available.
    console.log("[State] Merging achievement definitions with loaded state...");
    const initialAchievements = {}; // Start with an empty object for the final state
    const loadedAchievements = loadedState?.achievements || {}; // Get loaded achievement progress

    if (ALL_ACHIEVEMENTS && typeof ALL_ACHIEVEMENTS === 'object') {
        Object.keys(ALL_ACHIEVEMENTS).forEach(id => {
             const definition = ALL_ACHIEVEMENTS[id];
             // Validate basic definition structure
             if (definition && typeof definition.name === 'string' && typeof definition.description === 'string' && definition.criteria) {
                 // Create the state entry for this achievement
                 initialAchievements[id] = {
                     // Copy essential definition properties
                     id: definition.id,
                     name: definition.name,
                     description: definition.description,
                     flavor: definition.flavor || '', // Default flavor to empty string
                     icon: definition.icon || 'fa-solid fa-question-circle', // Default icon
                     criteria: { ...(definition.criteria) }, // Copy criteria object
                     // Get unlocked status and date from loaded data, fallback to definition defaults (false/null)
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
    finalState.achievements = initialAchievements; // Assign the merged achievements to the final state

    // Assign the fully merged and validated state to the module's appState variable
    appState = finalState;
    console.log("[State] State loaded/initialized.");
    // console.debug("[State] Final loaded state:", appState); // Optional detailed log
}

/**
 * Saves the current application state to localStorage.
 * Also dispatches a custom 'stateChanged' event for potential debouncing or UI updates.
 * @param {string} [action='unknown'] - A string describing the action that triggered the save (for debugging).
 */
export function saveState(action = 'unknown') {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appState));
        // Dispatch event *after* successful save
        document.dispatchEvent(new CustomEvent('stateChanged', { detail: { action: action } }));
        // console.log(`[State] State saved to localStorage. Triggering action: ${action}`); // Optional log
    } catch (error) {
        console.error("[State] Error saving state to localStorage:", error);
        // Consider showing a user-facing error if saving fails critically
        // showToast("Error: Could not save progress!", "error");
    }
}

// --- State Accessors ---

/**
 * Returns a deep copy of the current application state.
 * Prevents direct modification of the internal state object.
 * Uses structuredClone if available, falls back to JSON methods.
 * @returns {object} A deep copy of the application state.
 */
export function getState() {
    // Basic check if appState is initialized
    if (typeof appState !== 'object' || appState === null) {
        console.error("[State] getState called when appState is not a valid object:", appState);
        // Attempt to return a copy of initialState as a fallback
        try { return JSON.parse(JSON.stringify(initialState)); } catch (e) { return {}; }
    }

    // Prefer structuredClone for a more robust deep copy
    if (typeof structuredClone === 'function') {
        try {
            return structuredClone(appState);
        } catch (e) {
            console.warn("[State] structuredClone failed, falling back to JSON method:", e);
            // Fall through to JSON method
        }
    }

    // Fallback to JSON stringify/parse for deep copy
    try {
        return JSON.parse(JSON.stringify(appState));
    } catch (e) {
        console.error("[State] Fallback deep copy (JSON) failed:", e);
        // As a last resort, return a shallow copy (risk of mutation)
        return { ...appState };
    }
}

/**
 * Returns a direct reference to the internal application state object.
 * Use with caution, as modifications will directly affect the state without validation.
 * Primarily intended for performance-sensitive read operations or internal logic.
 * @returns {object} A direct reference to the application state.
 */
export function getStateReference() {
    return appState;
}

// --- State Mutators ---
// These functions modify the appState and typically call saveState()

/**
 * Updates the current date being viewed in the application.
 * Also updates the calendar's current month and year accordingly.
 * @param {string} newDate - The new date string in 'YYYY-MM-DD' format.
 */
export function updateCurrentDate(newDate) {
    if (typeof newDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
        if (appState.currentDate !== newDate) {
            appState.currentDate = newDate;
            try {
                // Update calendar month/year to match the new date
                const dateObj = new Date(newDate + 'T00:00:00Z'); // Use UTC to parse
                appState.currentMonth = dateObj.getUTCMonth();
                appState.currentYear = dateObj.getUTCFullYear();
                // No saveState here, date changes often, rely on explicit saves or debouncing
                // console.log(`[State] Current date updated to: ${newDate}`); // Optional log
            } catch (e) {
                console.error("[State] Error updating calendar month/year from new date:", e);
            }
        }
    } else {
        console.error("[State] Invalid date format provided to updateCurrentDate:", newDate);
    }
}

/**
 * Toggles the logged status of a specific pillar for a given date.
 * @param {string} pillarId - The ID of the pillar to toggle.
 * @param {string} dateString - The date string ('YYYY-MM-DD').
 * @returns {boolean} The new status of the pillar for that date (true if logged, false otherwise).
 */
export function togglePillarStatus(pillarId, dateString) {
    // Ensure pillar structure exists
    if (!appState.pillars) appState.pillars = {};
    if (!appState.pillars[pillarId]) appState.pillars[pillarId] = { days: {} };
    if (!appState.pillars[pillarId].days) appState.pillars[pillarId].days = {};

    // Get current status (default to false if not set)
    const currentStatus = appState.pillars[pillarId].days[dateString] || false;
    const newStatus = !currentStatus; // Toggle the status

    // Update the state
    appState.pillars[pillarId].days[dateString] = newStatus;

    saveState('togglePillar'); // Save the state change
    return newStatus;
}

/**
 * Updates the mood level for a specific date.
 * Setting level to 0 or null removes the mood entry for that date.
 * @param {string} dateString - The date string ('YYYY-MM-DD').
 * @param {number|null} level - The mood level (1-5) or 0/null to clear.
 */
export function updateMood(dateString, level) {
    if (!appState.mood) appState.mood = {}; // Ensure mood object exists
    const currentMood = appState.mood[dateString];
    let changed = false;

    // Check if the new level is valid (1-5)
    if (typeof level === 'number' && level >= 1 && level <= 5) {
        // Update only if the level is different
        if (currentMood !== level) {
            appState.mood[dateString] = level;
            changed = true;
        }
    }
    // Check if clearing the mood (level 0, null, or undefined)
    else if (level === 0 || level === null || typeof level === 'undefined') {
        // Remove the entry only if it exists
        if (currentMood !== undefined) {
            delete appState.mood[dateString];
            changed = true;
        }
    } else {
        console.warn("[State] Invalid mood level provided to updateMood:", level);
    }

    // Save state only if a change occurred
    if (changed) {
        saveState('updateMood');
    }
}

/**
 * Adds a new entry to the beginning of the timeline array.
 * Prevents duplicate achievement or prestige entries for the same ID/level.
 * *** MODIFIED: Adds XP if the entry is a 'note'. ***
 * @param {object} entry - The timeline entry object ({ type, date, ... }).
 */
export function addTimelineEntry(entry) {
    if (!appState.timeline) appState.timeline = []; // Ensure timeline array exists

    // Validate the entry structure
    if (!entry || typeof entry !== 'object' || !entry.type || !entry.date) {
        console.error("[State] Invalid timeline entry provided:", entry);
        return;
    }

    // Prevent duplicate achievement/prestige entries
    let alreadyExists = false;
    if (entry.type === 'achievement') {
        alreadyExists = appState.timeline.some(item => item?.type === 'achievement' && item.achievementId === entry.achievementId);
        if (alreadyExists) {
            console.log(`[State] Timeline entry for achievement ${entry.achievementId} already exists. Skipping.`);
            return; // Don't add duplicate achievement timeline entries
        }
    } else if (entry.type === 'prestige') {
        alreadyExists = appState.timeline.some(item => item?.type === 'prestige' && item.prestigeLevel === entry.prestigeLevel);
        if (alreadyExists) {
            console.log(`[State] Timeline entry for prestige level ${entry.prestigeLevel} already exists. Skipping.`);
            return; // Don't add duplicate prestige timeline entries
        }
    }

    // *** ADDED: Grant XP for adding a note ***
    let xpAdded = 0;
    if (entry.type === 'note') {
        appState.totalXP = (appState.totalXP || 0) + XP_PER_NOTE;
        xpAdded = XP_PER_NOTE;
        console.log(`[State] Added ${XP_PER_NOTE} XP for new note. New Total XP: ${appState.totalXP}`);
    }
    // *** END ADDED ***

    // Add the new entry to the beginning of the array (for newest first display)
    appState.timeline.unshift(entry);
    saveState('addTimelineEntry'); // Save the state change (including potential XP update)

    // Check achievements after adding note XP (if any)
    if (xpAdded > 0) {
        checkAchievements(getStateReference());
    }
}

/**
 * Initiates the prestige process if the user is at Level 100.
 * Resets XP, increments prestige count, adds a timeline entry, and saves state.
 * @returns {boolean} True if prestige was successful, false otherwise.
 */
export function prestigeLevel() {
    // Ensure calculateLevelData function is available
    if (typeof calculateLevelData !== 'function') {
        console.error("[State] calculateLevelData function is not available for prestige.");
        return false;
    }

    try {
        const levelData = calculateLevelData(appState.totalXP, appState.prestige);
        // Check if user is at or above level 100
        if (levelData.level >= 100) {
            const newCycleNumber = (appState.prestige || 0) + 1; // Increment prestige level

            // Add prestige entry to timeline first (this also saves state)
            const cycleEntry = {
                type: 'prestige',
                date: new Date().toISOString(), // Timestamp of prestige
                prestigeLevel: newCycleNumber
            };
            addTimelineEntry(cycleEntry); // This calls saveState internally

            // Reset XP and toast tracker in the current state object
            appState.prestige = newCycleNumber;
            appState.totalXP = 0;
            appState.level100ToastShownForCycle = null; // Reset toast tracker for the new cycle

            // Save state again to capture the prestige/XP/toast reset
            saveState('prestige');
            console.log(`[State] Completed Cycle ${newCycleNumber}! Level and XP reset.`);
            return true; // Indicate success
        } else {
            console.warn(`[State] Prestige attempt failed: Level ${levelData.level} is less than 100.`);
            return false; // Indicate failure (level too low)
        }
    } catch (error) {
        console.error("[State] Error during prestigeLevel:", error);
        return false; // Indicate failure due to error
    }
}

/**
 * Toggles the global sound enabled setting.
 */
export function toggleSoundEnabled() {
    const currentState = appState.isSoundEnabled ?? true; // Default to true if undefined
    appState.isSoundEnabled = !currentState;
    saveState('toggleSound');
    console.log(`[State] Sound enabled set to: ${appState.isSoundEnabled}`);
}

/**
 * Updates the sort order for the timeline view.
 * @param {string} newOrder - The new sort order ('newest' or 'oldest').
 */
export function updateTimelineSortOrder(newOrder) {
    if (newOrder === 'newest' || newOrder === 'oldest') {
        if (appState.timelineSortOrder !== newOrder) {
            appState.timelineSortOrder = newOrder;
            saveState('sortTimeline');
        }
    } else {
        console.warn("[State] Invalid timeline sort order provided:", newOrder);
    }
}

/**
 * Updates the filter type for the timeline view.
 * @param {string} newFilter - The new filter type ('all', 'note', 'achievement', 'prestige').
 */
export function updateTimelineFilter(newFilter) {
    const validFilters = ['all', 'note', 'achievement', 'prestige'];
    if (validFilters.includes(newFilter)) {
        if (appState.timelineFilter !== newFilter) {
            appState.timelineFilter = newFilter;
            saveState('filterTimeline');
        }
    } else {
        console.warn("[State] Invalid timeline filter type provided:", newFilter);
    }
}

/**
 * Sets the user's name. Trims whitespace. Sets to null if empty.
 * @param {string|null} newName - The new name for the user, or null to clear.
 */
export function setUserName(newName) {
    if (typeof newName === 'string') {
        const trimmedName = newName.trim();
        // Update only if the trimmed name is non-empty and different from current
        if (trimmedName && appState.userName !== trimmedName) {
            appState.userName = trimmedName;
            saveState('setUserName');
            console.log(`[State] User name updated to: ${appState.userName}`);
        }
        // Set to null if the trimmed name is empty and current name is not already null
        else if (!trimmedName && appState.userName !== null) {
            appState.userName = null;
            saveState('setUserName');
            console.warn("[State] setUserName received empty name. Setting to null.");
        }
    } else if (newName === null && appState.userName !== null) {
        // Handle explicitly setting name to null
        appState.userName = null;
        saveState('setUserName');
        console.log(`[State] User name cleared.`);
    } else if (typeof newName !== 'string' && newName !== null) {
        console.warn("[State] setUserName received invalid name type:", newName);
    }
}

/**
 * Sets the application mode ('simple' or 'full').
 * Clears Simple Mode specific settings if switching to 'full'.
 * @param {string|null} mode - The mode to set ('simple', 'full', or null).
 */
export function setUserMode(mode) {
    if (mode === 'simple' || mode === 'full' || mode === null) {
        if (appState.userMode !== mode) {
            appState.userMode = mode;
            // If switching away from simple mode, clear simple mode settings
            if (mode === 'full' || mode === null) {
                appState.simpleModePillarCount = null;
                appState.simpleModePillars = [];
            }
            saveState('setUserMode');
            console.log(`[State] User mode updated to: ${appState.userMode}`);
        }
    } else {
        console.warn("[State] setUserMode received invalid mode:", mode);
    }
}

/**
 * Sets the number of pillars to track in Simple Mode.
 * @param {number|null} count - The number of pillars (3, 5, or 7) or null.
 */
export function setSimpleModePillarCount(count) {
    const validCounts = [3, 5, 7];
    if (count === null || (typeof count === 'number' && validCounts.includes(count))) {
        if (appState.simpleModePillarCount !== count) {
            appState.simpleModePillarCount = count;
            saveState('setSimpleModePillarCount');
            console.log(`[State] Simple Mode pillar count set to: ${count}`);
        }
    } else {
        console.error("[State] Invalid count provided to setSimpleModePillarCount:", count);
    }
}

/**
 * Sets the specific pillars selected for Simple Mode.
 * Expects an array of pillar ID strings.
 * @param {string[]} selectedPillars - An array of pillar IDs.
 */
export function setSimpleModePillars(selectedPillars) {
    // Validate input is an array of strings
    if (!Array.isArray(selectedPillars) || !selectedPillars.every(id => typeof id === 'string')) {
        console.error("[State] Invalid selectedPillars array provided:", selectedPillars);
        return;
    }
    // Update only if the array content has changed
    if (JSON.stringify(appState.simpleModePillars) !== JSON.stringify(selectedPillars)) {
        appState.simpleModePillars = [...selectedPillars]; // Store a copy
        saveState('setSimpleModePillars');
        console.log(`[State] Simple Mode pillars updated: [${selectedPillars.join(', ')}]`);
    }
}

/**
 * Marks an achievement as unlocked and records the unlock date.
 * Adds a corresponding entry to the timeline.
 * Triggers UI feedback (toast, sound).
 * @param {string} achievementId - The ID of the achievement to unlock.
 * @returns {boolean} True if the achievement was newly unlocked, false otherwise.
 */
export function unlockAchievement(achievementId) {
    // Validate achievement state exists
    if (!appState.achievements || !appState.achievements[achievementId]) {
        console.warn(`[State] Attempted to unlock unknown achievement state: ${achievementId}`);
        return false;
    }
    // Check if already unlocked
    if (appState.achievements[achievementId].unlocked) {
        // console.log(`[State] Achievement ${achievementId} already unlocked.`); // Optional log
        return false; // Not newly unlocked
    }

    // Update achievement state
    const unlockDate = new Date().toISOString(); // Timestamp of unlock
    const achievementName = appState.achievements[achievementId].name || 'Achievement';
    appState.achievements[achievementId].unlocked = true;
    appState.achievements[achievementId].date = unlockDate;
    console.log(`[State] Achievement unlocked: ${achievementId}`);

    // Add timeline entry (this also saves the state)
    addTimelineEntry({
        type: 'achievement',
        date: unlockDate,
        achievementId: achievementId
    });

    // Trigger UI feedback (handled by caller or here)
    // Note: Moved toast/sound calls here from app.js for better encapsulation
    showToast(`🏆 Achievement Unlocked: ${achievementName}!`, 'success', 5000);
    playSound('achievement'); // Play achievement sound

    return true; // Indicates achievement was newly unlocked
}

/**
 * Saves or updates a habit plan in the state.
 * @param {object} planData - The habit plan object containing all necessary properties.
 * @returns {boolean} True if the plan was saved/updated successfully, false otherwise.
 */
export function saveHabitPlan(planData) {
    // Basic validation of the input plan data
    if (!planData || typeof planData !== 'object' || !planData.id || !planData.type || !planData.pillarId || !planData.activityDescription) {
        console.error("[State] Invalid planData provided to saveHabitPlan:", planData);
        return false;
    }
    if (!appState.habitPlans) appState.habitPlans = {}; // Ensure habitPlans object exists

    const planId = planData.id;
    const isUpdating = !!appState.habitPlans[planId]; // Check if this ID already exists

    // Construct the final plan object, ensuring all fields are present and correct types
    const finalPlan = {
        id: planId,
        type: planData.type, // 'intention' or 'stacking'
        pillarId: planData.pillarId,
        activityDescription: planData.activityDescription,
        // Include type-specific fields, defaulting to null if not applicable or missing
        cue: (planData.type === 'intention') ? (planData.cue || null) : null,
        anchorHabit: (planData.type === 'stacking') ? (planData.anchorHabit || null) : null,
        secondaryPillarId: (planData.type === 'stacking') ? (planData.secondaryPillarId || null) : null,
        // Preserve original creation date if updating, otherwise set new one
        createdAt: isUpdating ? (appState.habitPlans[planId].createdAt) : (planData.createdAt || new Date().toISOString()),
        updatedAt: new Date().toISOString() // Always update the modification timestamp
    };

    // Save the plan to the state
    appState.habitPlans[planId] = finalPlan;
    console.log(`[State] Habit plan ${isUpdating ? 'updated' : 'added'}:`, finalPlan);
    saveState(isUpdating ? 'updateHabitPlan' : 'addHabitPlan'); // Save state with appropriate action description
    return true;
}

/**
 * Deletes a habit plan from the state.
 * @param {string} planId - The ID of the habit plan to delete.
 * @returns {boolean} True if the plan was deleted, false if not found.
 */
export function deleteHabitPlan(planId) {
    // Validate planId and existence of the plan
    if (!planId || !appState.habitPlans || !appState.habitPlans[planId]) {
        console.warn("[State] Cannot delete habit plan: Plan ID not found or invalid.", planId);
        return false;
    }

    // Delete the plan from the state object
    delete appState.habitPlans[planId];
    console.log("[State] Habit plan deleted:", planId);
    saveState('deleteHabitPlan'); // Save the state change
    return true;
}

/**
 * Marks a specific date as 'saved', calculates XP, and recalculates the streak.
 * @param {string} dateString - The date string ('YYYY-MM-DD') to save.
 * @returns {boolean} True if the day was newly saved, false if already saved.
 */
export function saveDay(dateString) {
    if (!appState.savedDays) appState.savedDays = {}; // Ensure savedDays object exists

    // Check if the day is already saved
    if (appState.savedDays[dateString]) {
        console.warn(`[State] Day already saved: ${dateString}`);
        return false; // Not newly saved
    }

    // Mark the day as saved
    appState.savedDays[dateString] = true;

    // Calculate XP earned for this day
    calculateXP(dateString); // This updates totalXP

    // Recalculate the current streak (important after adding a new saved day)
    calculateStreak(); // Uses full recalculation, updates appState.streak

    // Save the updated state (including XP and streak changes)
    saveState('saveDay');
    console.log(`[State] Day saved: ${dateString}. XP: ${appState.totalXP}, Streak: ${appState.streak}`);
    return true; // Indicate day was newly saved
}

/**
 * Removes the 'saved' status from a specific date, allowing editing.
 * Recalculates the streak after removing the day.
 * @param {string} dateString - The date string ('YYYY-MM-DD') to unlock.
 * @returns {boolean} True if the day was unlocked, false if it wasn't saved.
 */
export function unlockDayEntry(dateString) {
    // Check if the day was actually saved
    if (!appState.savedDays || !appState.savedDays[dateString]) {
        // console.warn(`[State] Attempted to unlock a day that was not saved: ${dateString}`); // Optional log
        return false; // Day wasn't locked
    }

    // Remove the entry from savedDays
    delete appState.savedDays[dateString];

    // Recalculate the streak as removing a day might break it
    calculateStreak(); // Uses full recalculation

    // Save the updated state
    saveState('unlockDay');
    console.log(`[State] Day ${dateString} unlocked. Streak recalculated to ${appState.streak}.`);
    return true; // Indicate day was unlocked
}

/**
 * Sets the onboarding completion status.
 * @param {boolean} isComplete - True if onboarding is complete, false otherwise.
 */
export function setOnboardingComplete(isComplete) {
    if (typeof isComplete === 'boolean') {
        if (appState.isOnboardingComplete !== isComplete) {
            appState.isOnboardingComplete = isComplete;
            saveState('setOnboardingComplete');
            console.log(`[State] Onboarding complete status set to: ${isComplete}`);
        }
    } else {
        console.warn("[State] Invalid value provided to setOnboardingComplete:", isComplete);
    }
}

/**
 * Sets the visibility preference for the Habit Planner section.
 * @param {boolean} show - True to show the planner, false to hide.
 */
export function setShowPlanner(show) {
    if (typeof show === 'boolean') {
        // Only update if the value is actually changing
        if (appState.showPlanner !== show) {
            appState.showPlanner = show;
            saveState('setShowPlanner'); // Save the state change
            console.log(`[State] Show Planner setting updated to: ${show}`);
        }
    } else {
        console.warn("[State] Invalid value provided to setShowPlanner:", show);
    }
}


/**
 * Updates the state to record that the Level 100 toast has been shown for a specific cycle.
 * Prevents the toast from showing repeatedly within the same cycle.
 * @param {number} cycleNumber - The prestige cycle number for which the toast was shown.
 */
export function setLevel100ToastShown(cycleNumber) {
    // Validate input type
    if (typeof cycleNumber === 'number') {
        // Update only if the value is different
        if (appState.level100ToastShownForCycle !== cycleNumber) {
            appState.level100ToastShownForCycle = cycleNumber;
            saveState('setLevel100ToastShown'); // Save the change
            console.log(`[State] Level 100 toast tracker updated for cycle: ${cycleNumber}`);
        }
    } else {
        console.warn("[State] Invalid cycleNumber provided to setLevel100ToastShown:", cycleNumber);
    }
}


// --- Internal Helper Functions ---

/**
 * Calculates and updates the current streak based on saved days.
 * Uses a full recalculation approach for accuracy, especially when days are unlocked.
 * Checks if the latest consecutive run ends today or yesterday.
 */
function calculateStreak() {
    // Get sorted array of saved date strings ('YYYY-MM-DD')
    const savedDates = Object.keys(appState.savedDays || {}).sort();
    let finalStreak = 0; // Initialize the streak to 0

    if (savedDates.length > 0) {
        let currentRun = 0; // Length of the current consecutive run being tracked
        let lastDateInRun = null; // Track the Date object of the last day in the current run

        // Get today's and yesterday's start times in UTC for comparison
        const today = new Date(); today.setUTCHours(0, 0, 0, 0);
        const yesterday = new Date(today); yesterday.setUTCDate(today.getUTCDate() - 1);
        const todayTime = today.getTime();
        const yesterdayTime = yesterday.getTime();

        // Iterate through all saved dates
        for (let i = 0; i < savedDates.length; i++) {
            try {
                // Parse the current date string as UTC
                const currentDate = new Date(savedDates[i] + 'T00:00:00Z');
                if (isNaN(currentDate.getTime())) continue; // Skip invalid dates

                // Check if this date continues the current run
                if (i > 0) {
                    const previousDate = new Date(savedDates[i - 1] + 'T00:00:00Z');
                    if (isNaN(previousDate.getTime())) {
                        // If previous date was invalid, restart the run from the current date
                        currentRun = 1;
                    } else {
                        // Check if the time difference is exactly one day
                        if (currentDate.getTime() - previousDate.getTime() === ONE_DAY_MS) {
                            currentRun++; // Increment run length
                        } else {
                            // Gap detected, reset the current run
                            currentRun = 1;
                        }
                    }
                } else {
                    // First date in the list always starts a run of 1
                    currentRun = 1;
                }

                lastDateInRun = currentDate; // Update the last date of the current run

                // Check if this run ends today or yesterday
                const lastDateTime = lastDateInRun.getTime();
                if (lastDateTime === todayTime || lastDateTime === yesterdayTime) {
                    // If the current run ends today/yesterday, it's a candidate for the final streak.
                    // Update finalStreak if this run is longer than any previous candidate run.
                    finalStreak = Math.max(finalStreak, currentRun);
                }
                // If the run ends before yesterday, it cannot be the *current* streak.
                // We continue iterating in case a later run ends today/yesterday.
                // The `finalStreak` value calculated from a valid run ending today/yesterday will be preserved.

            } catch (e) {
                console.error(`[State] Error parsing date during streak calculation: ${savedDates[i]}`, e);
                // Reset streak calculation on error for safety
                finalStreak = 0;
                break; // Exit loop on error
            }
        }
        // After the loop, finalStreak holds the length of the longest run ending today or yesterday.
    } // else: No saved dates, finalStreak remains 0.

    // Only update state if the calculated streak is different from the current one
    if (appState.streak !== finalStreak) {
        appState.streak = finalStreak;
        console.log(`[State] Streak recalculated (full): ${finalStreak}`);
        // Note: saveState() is not called here directly. It's called by the actions
        // that trigger this calculation (saveDay, unlockDay).
    }
}


/**
 * Calculates XP earned for a given date based on logged pillars, mood multiplier, and streak.
 * Updates the totalXP in the state.
 * *** MODIFIED: Implements new XP rules (5/pillar, mood multiplier, streak bonus). ***
 * @param {string} dateString - The date string ('YYYY-MM-DD') for which to calculate XP.
 */
function calculateXP(dateString) {
    // Validate necessary state parts
    if (!appState.pillars || !appState.mood) {
        console.warn(`[State] Cannot calculate XP for ${dateString}: missing pillar or mood data.`);
        return;
    }

    // --- New XP Constants ---
    const baseXPPerPillar = 5;
    const streakBonusDivisor = 5; // Earn 1 bonus XP for every 5 days of streak
    const moodMultipliers = { // Multipliers based on mood level (1-5)
        1: 0.8, // 😟
        2: 0.9, // 😕
        3: 1.0, // 🫤 (Neutral)
        4: 1.1, // 🙂
        5: 1.2  // 😁
    };
    // --- End New XP Constants ---

    let pillarXP = 0;
    let streakBonus = 0;
    let totalXPEarnedToday = 0;

    // Calculate base XP from pillars
    PILLARS.forEach(p => {
        if (appState.pillars[p.id]?.days?.[dateString]) {
            pillarXP += baseXPPerPillar;
        }
    });

    // Calculate streak bonus (based on streak *before* this day is potentially added)
    // Note: calculateStreak() is called *after* calculateXP within saveDay, so this uses the streak BEFORE the current save.
    streakBonus = Math.floor((appState.streak || 0) / streakBonusDivisor);

    // Determine mood multiplier
    const moodLevel = appState.mood[dateString];
    const moodMultiplier = moodLevel ? (moodMultipliers[moodLevel] || 1.0) : 1.0; // Default to 1.0 if no mood logged

    // Apply mood multiplier to pillar XP and streak bonus
    // Note: We are NOT multiplying note XP by mood.
    const baseXpWithBonus = pillarXP + streakBonus;
    const finalXpWithMood = Math.round(baseXpWithBonus * moodMultiplier); // Round to nearest integer

    // Update total XP
    appState.totalXP = (appState.totalXP || 0) + finalXpWithMood;

    console.log(`[State] XP Earned for ${dateString}: ${finalXpWithMood} (Pillars: ${pillarXP}, Streak Bonus: ${streakBonus}, Mood Multiplier: ${moodMultiplier}). New Total XP: ${appState.totalXP}`);
    // Note: saveState() is not called here directly. It's called by saveDay.
    // Note: Note XP is added separately in addTimelineEntry.
}