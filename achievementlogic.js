// achievementlogic.js

/**
 * Contains logic for checking achievement criteria and suggesting achievements.
 */

// --- Imports ---
import { getStateReference, unlockAchievement } from './state.js'; // State access and unlocking
import { ALL_ACHIEVEMENTS } from './achievements.js';         // Achievement definitions
import { PILLARS } from './constants.js';                     // Pillar definitions
// UI/Audio imports are generally not needed here, as feedback is handled
// by the state mutation (unlockAchievement) or the calling function.
// import { showToast } from './ui/globalUI.js';
// import { playSound } from './audio.js';

// --- Core Achievement Checking ---

/**
 * Checks all defined achievements against the current state and unlocks them if criteria are met.
 * Calls the unlockAchievement function from state.js, which handles state updates,
 * timeline entries, and notifications.
 * @param {object} stateRef - A direct reference to the application state object.
 */
export function checkAchievements(stateRef) {
    // 1. Validate Input
    if (!stateRef || typeof stateRef !== 'object' || !stateRef.achievements || !ALL_ACHIEVEMENTS) {
        console.error("[AchLogic] Cannot check achievements: Invalid state reference or achievement definitions missing.");
        return;
    }

    // console.log("[AchLogic] Checking achievements..."); // Optional debug log
    const achievementIds = Object.keys(ALL_ACHIEVEMENTS); // Get all defined achievement IDs

    // 2. Iterate Through Achievements
    achievementIds.forEach(id => {
        const achievementDef = ALL_ACHIEVEMENTS[id];
        const achievementState = stateRef.achievements ? stateRef.achievements[id] : null;

        // Skip if definition missing, state entry missing, or already unlocked
        if (!achievementDef || !achievementState || achievementState.unlocked) {
            // Log warning if state entry is missing for a defined achievement
            if (achievementDef && !achievementState) {
                console.warn(`[AchLogic] State entry missing for achievement ID: ${id}. Ensure state initialization is correct.`);
            }
            return; // Continue to the next achievement
        }

        // 3. Evaluate Criteria
        let criteriaMet = false;
        const criteria = achievementDef.criteria;

        // Validate criteria object structure
        if (!criteria || typeof criteria.type !== 'string') {
            console.warn(`[AchLogic] Skipping achievement ${id}: Invalid or missing criteria definition/type.`);
            return;
        }

        try {
            // Evaluate based on criteria type using helper functions
            switch (criteria.type) {
                case 'streak':
                    criteriaMet = checkStreakCriteria(stateRef, criteria);
                    break;
                case 'totalXP':
                    criteriaMet = checkTotalXPCriteria(stateRef, criteria);
                    break;
                case 'daysLogged':
                    criteriaMet = checkDaysLoggedCriteria(stateRef, criteria);
                    break;
                case 'specificPillarCount':
                    criteriaMet = checkSpecificPillarCountCriteria(stateRef, criteria);
                    break;
                case 'allPillarsOneDay':
                    criteriaMet = checkAllPillarsOneDayCriteria(stateRef); // No specific value needed
                    break;
                case 'notesAdded':
                    criteriaMet = checkNotesAddedCriteria(stateRef, criteria);
                    break;
                case 'prestigeLevel':
                    criteriaMet = checkPrestigeLevelCriteria(stateRef, criteria);
                    break;
                case 'mood':
                    criteriaMet = checkMoodCriteria(stateRef, criteria);
                    break;
                case 'meta':
                    criteriaMet = checkMetaAchievementCriteria(stateRef, criteria, id); // Pass self ID
                    break;
                case 'meta_all_pillars':
                    criteriaMet = checkMetaAllPillarsCriteria(stateRef); // No specific value needed
                    break;
                // Add cases for other criteria types (combo, feature, etc.) here
                // case 'comboStreak': criteriaMet = checkComboStreakCriteria(stateRef, criteria); break;
                default:
                    console.warn(`[AchLogic] Unknown achievement criteria type for ${id}: ${criteria.type}`);
            }
        } catch (error) {
            console.error(`[AchLogic] Error evaluating criteria for achievement ${id}:`, error);
            criteriaMet = false; // Ensure it's false on error
        }

        // 4. Unlock if Criteria Met
        if (criteriaMet) {
            // unlockAchievement handles state update, timeline, saving, and notification
            unlockAchievement(id);
            // console.log(`[AchLogic] Criteria met for ${id}, attempting unlock.`); // Optional log
        }
    });
    // console.log("[AchLogic] Finished checking achievements."); // Optional debug log
}

// --- Criteria Helper Functions ---
// These functions isolate the logic for checking each specific type of criteria.

function checkStreakCriteria(stateRef, criteria) {
    if (typeof criteria.value !== 'number') return false;
    return (stateRef.streak || 0) >= criteria.value;
}

function checkTotalXPCriteria(stateRef, criteria) {
    if (typeof criteria.value !== 'number') return false;
    return (stateRef.totalXP || 0) >= criteria.value;
}

function checkDaysLoggedCriteria(stateRef, criteria) {
    if (typeof criteria.value !== 'number') return false;
    return Object.keys(stateRef.savedDays || {}).length >= criteria.value;
}

function checkSpecificPillarCountCriteria(stateRef, criteria) {
    if (typeof criteria.pillarId !== 'string' || typeof criteria.value !== 'number') {
        console.warn(`[AchLogic] Invalid criteria for specificPillarCount:`, criteria);
        return false;
    }
    const pillarData = stateRef.pillars?.[criteria.pillarId];
    const count = pillarData?.days ? Object.values(pillarData.days).filter(logged => logged === true).length : 0;
    return count >= criteria.value;
}

function checkAllPillarsOneDayCriteria(stateRef) {
    if (!stateRef.savedDays || !stateRef.pillars) return false;
    return Object.keys(stateRef.savedDays).some(date => {
        // Check if every defined pillar was logged (true) on that specific date
        return PILLARS.every(p => stateRef.pillars?.[p.id]?.days?.[date] === true);
    });
}

function checkNotesAddedCriteria(stateRef, criteria) {
    if (typeof criteria.value !== 'number') return false;
    const notesCount = Array.isArray(stateRef.timeline) ? stateRef.timeline.filter(e => e?.type === 'note').length : 0;
    return notesCount >= criteria.value;
}

function checkPrestigeLevelCriteria(stateRef, criteria) {
    if (typeof criteria.value !== 'number') return false;
    return (stateRef.prestige || 0) >= criteria.value;
}

function checkMoodCriteria(stateRef, criteria) {
    if (!Array.isArray(criteria.levels) || typeof criteria.value !== 'number') {
        console.warn(`[AchLogic] Invalid criteria for mood:`, criteria);
        return false;
    }
    const moodLog = stateRef.mood || {};
    // Count days where mood was logged AND the level is included in criteria.levels
    const moodCount = Object.values(moodLog).filter(level => criteria.levels.includes(level)).length;
    return moodCount >= criteria.value;
}

function checkMetaAchievementCriteria(stateRef, criteria, selfId) {
    if (typeof criteria.value !== 'number') return false;
    let unlockedCount = 0;
    for (const achId in stateRef.achievements) {
        // Count *other* unlocked achievements
        if (achId !== selfId && stateRef.achievements[achId]?.unlocked) {
            unlockedCount++;
        }
    }
    return unlockedCount >= criteria.value;
}

function checkMetaAllPillarsCriteria(stateRef) {
    if (!stateRef.pillars) return false;
    // Check if every defined pillar has been logged at least once
    return PILLARS.every(p => {
        const pillarState = stateRef.pillars[p.id];
        return pillarState?.days && Object.values(pillarState.days).some(logged => logged === true);
    });
}

// --- Achievement Suggestion Logic ---

/**
 * Finds a relevant achievement suggestion based on current progress.
 * Prioritizes achievements that are proportionally closest to being unlocked.
 * Excludes meta-achievements from suggestions for simplicity.
 * @param {object} state - The current application state (can be a copy).
 * @returns {object|null} The suggested achievement object (definition + state) or null.
 */
export function findSuggestedAchievement(state) {
    // 1. Validate Input
    if (!state || typeof state !== 'object' || !state.achievements || !ALL_ACHIEVEMENTS) {
        console.warn("[AchLogic] Cannot find suggestion: Invalid state or achievement definitions missing.");
        return null;
    }

    let suggestions = [];
    const achievementIds = Object.keys(ALL_ACHIEVEMENTS);

    // 2. Iterate and Calculate Progress for Suggestible Achievements
    achievementIds.forEach(id => {
        const achievementDef = ALL_ACHIEVEMENTS[id];
        const achievementState = state.achievements ? state.achievements[id] : null;

        // Skip if definition missing, state missing, already unlocked, or criteria missing
        if (!achievementDef || !achievementState || achievementState.unlocked || !achievementDef.criteria) {
            return;
        }

        const criteria = achievementDef.criteria;
        let progress = 0;
        let target = 0; // Initialize target
        let isValidTarget = false; // Flag to check if target value is valid for ratio calculation

        // Skip meta-achievements and types without clear numeric progress
        const skippableTypes = ['meta', 'meta_all_pillars', 'allPillarsOneDay'];
        if (skippableTypes.includes(criteria.type)) {
            return;
        }

        // Ensure target value is a valid number for progress calculation
        if (typeof criteria.value === 'number' && criteria.value > 0) {
            target = criteria.value;
            isValidTarget = true;
        } else {
             // If value is missing or not a positive number for types that need it, skip suggesting
             // (except for types explicitly handled without value, which are already skipped above)
             console.warn(`[AchLogic Suggest] Skipping suggestion for ${id}: Invalid or missing target value (${criteria.value}) for type ${criteria.type}.`);
             return;
        }


        try { // Add try-catch for robustness during progress calculation
            // Calculate current progress based on criteria type
            switch (criteria.type) {
                case 'streak':
                    progress = state.streak || 0;
                    break;
                case 'totalXP':
                    progress = state.totalXP || 0;
                    break;
                case 'daysLogged':
                    progress = Object.keys(state.savedDays || {}).length;
                    break;
                case 'specificPillarCount':
                    if (typeof criteria.pillarId !== 'string') break; // Need pillarId
                    const pillarData = state.pillars?.[criteria.pillarId];
                    progress = pillarData?.days ? Object.values(pillarData.days).filter(logged => logged === true).length : 0;
                    break;
                case 'notesAdded':
                    progress = Array.isArray(state.timeline) ? state.timeline.filter(e => e?.type === 'note').length : 0;
                    break;
                case 'prestigeLevel':
                    progress = state.prestige || 0;
                    break;
                case 'mood':
                    if (!Array.isArray(criteria.levels)) break; // Need levels array
                    const moodLog = state.mood || {};
                    progress = Object.values(moodLog).filter(level => criteria.levels.includes(level)).length;
                    break;
                // Add other suggestible types here if needed
                default:
                    isValidTarget = false; // Mark target as invalid if type not handled for suggestions
            }

            // 3. Calculate Relevance and Add to Suggestions
            // Only consider if target is valid and progress is less than target
            if (isValidTarget && progress < target) {
                const relevanceScore = progress / target; // Ratio (0 to < 1)
                // Add the achievement definition and calculated relevance score
                suggestions.push({ ...achievementDef, relevance: relevanceScore });
            }

        } catch (error) {
             console.error(`[AchLogic Suggest] Error calculating progress for suggestion ${id}:`, error);
        }
    });

    // 4. Sort Suggestions by Relevance
    // Sort in descending order of relevance (highest ratio first)
    suggestions.sort((a, b) => b.relevance - a.relevance);

    // 5. Return Top Suggestion
    // Return the most relevant suggestion (first element after sorting) or null if none qualify
    // console.log("[AchLogic Suggest] Potential suggestions:", suggestions); // Optional debug log
    return suggestions.length > 0 ? suggestions[0] : null;
}