// utils.js

/**
 * Utility functions for the WellSpring application.
 * *** MODIFIED: Rebalanced XP constants for leveling and prestige. ***
 */

// Import LEVEL_NAMES from constants
import { LEVEL_NAMES } from './constants.js';

// --- Constants (Level Calculation) ---
// *** MODIFIED VALUES FOR REBALANCING ***
const BASE_XP_PER_LEVEL = 2; // XP needed for level 1 (Was 1000) - Lowered significantly
const LEVEL_SCALING_FACTOR = 1.05; // How much XP needed increases per level (Was 1.1) - Reduced steepness
const PRESTIGE_XP_MULTIPLIER = 1.1; // How much XP needed increases per prestige rank (Was 1.5) - Reduced cycle difficulty increase
// *** END MODIFIED VALUES ***

// --- Date Formatting ---

/**
 * Formats a date string (YYYY-MM-DD) into a more readable format.
 * Example: "Saturday, 19th April, 2025"
 * Uses UTC to avoid timezone issues with the input string.
 * @param {string} dateString - The date string in 'YYYY-MM-DD' format.
 * @returns {string} The formatted date string, or 'Invalid Date' if input is invalid.
 */
export function formatDate(dateString) {
    // Basic validation for the input string
    if (!dateString || typeof dateString !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        console.warn("[Utils] formatDate received invalid input:", dateString);
        return 'Invalid Date';
    }
    try {
        // Parse the date string as UTC
        const date = new Date(dateString + 'T00:00:00Z');
        // Check if the created date object is valid
        if (isNaN(date.getTime())) {
            throw new Error("Invalid Date object created from input");
        }
        // Formatting options for toLocaleDateString
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric', // Use 'numeric' first
            timeZone: 'UTC' // Specify UTC timezone
        };
        // Format the date using English Great Britain locale (or similar for day/month/year order)
        const formatted = date.toLocaleDateString('en-GB', options);
        // Get the numeric day (UTC) and add the ordinal suffix
        const day = date.getUTCDate();
        // Replace the numeric day in the formatted string with day + ordinal suffix
        const dayPattern = new RegExp(`(?<= |^)${day}(?=,?)`);
        return formatted.replace(dayPattern, `${day}${getOrdinal(day)}`);
    } catch (e) {
        console.error("[Utils] Error formatting date:", e, "Input:", dateString);
        return 'Invalid Date'; // Return generic error string on failure
    }
}


/**
 * Returns the ordinal suffix for a given day number (e.g., 'st', 'nd', 'rd', 'th').
 * Handles general cases and exceptions like 11th, 12th, 13th.
 * @param {number} day - The day of the month (1-31).
 * @returns {string} The ordinal suffix.
 */
export function getOrdinal(day) {
    // Check for invalid input
    if (typeof day !== 'number' || day < 1 || day > 31) {
        return ''; // Return empty for invalid day
    }
    // Handle 11th, 12th, 13th which are exceptions to the rule
    if (day > 3 && day < 21) return 'th';
    // Handle general cases based on the last digit
    switch (day % 10) {
        case 1: return "st";
        case 2: return "nd";
        case 3: return "rd";
        default: return "th";
    }
}

/**
 * Gets the ISO week number identifier for a given date string (e.g., "2025-W16").
 * Uses UTC dates to ensure consistency across timezones.
 * Based on the ISO 8601 week date system.
 * @param {string} dateString - The date string in 'YYYY-MM-DD' format.
 * @returns {string|null} The week identifier string (YYYY-Www) or null if date is invalid.
 */
export function getWeekNumber(dateString) {
    // Basic validation for the input string
    if (!dateString || typeof dateString !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        console.warn("[Utils] getWeekNumber received invalid input:", dateString);
        return null;
    }
    try {
        // Parse the input date as UTC
        const date = new Date(Date.UTC(
            parseInt(dateString.substring(0, 4)),
            parseInt(dateString.substring(5, 7)) - 1, // Month is 0-indexed
            parseInt(dateString.substring(8, 10))
        ));
        if (isNaN(date.getTime())) throw new Error('Invalid Date object created');

        // Create a copy to avoid modifying the original date object
        const target = new Date(date.valueOf());

        // Set to Monday of the week (adjust day: 0=Sun, 1=Mon, ..., 6=Sat)
        // ISO week starts on Monday (day 1). If Sunday (day 0), go back 6 days. Otherwise, go back (day - 1) days.
        target.setUTCDate(target.getUTCDate() - (target.getUTCDay() || 7) + 1);

        // Get the year of the Thursday of the target week (ISO standard)
        const weekYear = target.getUTCFullYear();

        // Calculate the day number of the year for the target date (Monday)
        const firstDayOfYear = Date.UTC(weekYear, 0, 1);
        const dayOfYear = Math.floor((target - firstDayOfYear) / (24 * 60 * 60 * 1000)) + 1;

        // Calculate the ISO week number
        const weekNumber = Math.ceil(dayOfYear / 7);

        // Format the result as YYYY-Www (pad week number with leading zero if needed)
        return `${weekYear}-W${weekNumber.toString().padStart(2, '0')}`;
    } catch (e) {
        console.error("[Utils] Error getting week number:", e, "Input:", dateString);
        return null;
    }
}


// --- HTML Escaping ---

/**
 * Escapes HTML special characters in a string to prevent XSS vulnerabilities.
 * Replaces &, <, >, ", and ' with their corresponding HTML entities.
 * Converts straight apostrophes (') to typographic apostrophes (’).
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string, or an empty string if input is not a string.
 */
export function escapeHtml(str) {
    // Return empty string if input is not a string
    if (typeof str !== 'string') return '';
    // Perform replacements using regular expressions
    return str
        .replace(/&/g, "&amp;")        // Ampersand
        .replace(/</g, "&lt;")         // Less than
        .replace(/>/g, "&gt;")         // Greater than
        .replace(/"/g, "&quot;")       // Double quote
        .replace(/'/g, "&rsquo;");     // Straight apostrophe to typographic RIGHT SINGLE QUOTATION MARK
}


// --- Level Calculation ---

/**
 * Calculates the current level, prestige, level name, and XP progress based on total XP earned.
 * Handles prestige scaling where XP requirements increase per prestige rank.
 * Caps level at 100 before prestige.
 * Uses the rebalanced constants defined at the top of the file.
 * @param {number} totalXP - The total accumulated XP (defaults to 0).
 * @param {number} prestige - The current prestige rank (defaults to 0).
 * @returns {{level: number, levelName: string|null, prestige: number, xpTowardsNext: number, xpNeededForNext: number}} - Object containing level data.
 */
export function calculateLevelData(totalXP = 0, prestige = 0) {
    let currentLevel = 0; // Start at level 0 internally for calculation
    // Calculate the base XP needed for level 1 of the *current* prestige cycle
    let xpForNextLevel = BASE_XP_PER_LEVEL * Math.pow(PRESTIGE_XP_MULTIPLIER, prestige);
    let cumulativeXPNeeded = 0; // Tracks total XP needed to reach the *start* of the current level
    let xpRemaining = totalXP; // XP available to spend on levels

    // Loop through levels until XP runs out or level cap (99 internally) is reached
    // Level 100 is handled separately after the loop
    while (xpRemaining >= xpForNextLevel && currentLevel < 99) {
        xpRemaining -= xpForNextLevel; // Subtract XP needed for this level
        cumulativeXPNeeded += xpForNextLevel; // Add to cumulative total
        currentLevel++; // Increment level
        // Calculate XP needed for the *next* level using the scaling factor
        xpForNextLevel *= LEVEL_SCALING_FACTOR;
    }

    // Handle reaching or exceeding level 100
    if (currentLevel === 99 && xpRemaining >= xpForNextLevel) {
        // If exactly enough or more XP for level 100 after reaching 99
        currentLevel = 100;
        xpRemaining = 0; // No more XP remaining towards the next level (it's max)
        xpForNextLevel = 0; // No XP needed for the "next" level
    } else if (currentLevel >= 100) {
        // Safety check in case loop somehow exceeds 99
        currentLevel = 100;
        xpRemaining = 0;
        xpForNextLevel = 0;
    }
    // If the loop finished before level 99 because xpRemaining < xpForNextLevel,
    // currentLevel holds the correct current level, and xpRemaining holds XP towards the next.

    // Ensure level is at least 1 for display and array indexing (user sees Level 1, not 0)
    const displayLevel = currentLevel === 0 ? 1 : currentLevel;

    // Look up level name from constants array
    // Adjusting for 0-based index (Level 1 is index 0)
    const levelName = (displayLevel >= 1 && displayLevel <= LEVEL_NAMES.length)
                      ? LEVEL_NAMES[displayLevel - 1]
                      : null; // Default to null if level is out of bounds

    // Return the calculated level data
    return {
        level: displayLevel,
        levelName: levelName,
        prestige: prestige,
        xpTowardsNext: xpRemaining, // How much XP the user has towards the next level
        xpNeededForNext: xpForNextLevel // Total XP needed to reach the next level from the start of the current one
    };
}


// --- Data Analysis Utilities ---

/**
 * Finds the earliest date string ('YYYY-MM-DD') present in any pillar's logged days.
 * Useful for determining the start date of user activity.
 * @param {object} state - The application state object containing pillar data.
 * @returns {string|null} The earliest date string found, or null if no data exists or state is invalid.
 */
export function findFirstUsageDate(state) {
    let earliestDate = null;
    // Validate state and pillars object
    if (!state || typeof state.pillars !== 'object' || state.pillars === null) {
        console.warn("[Utils] Invalid state or missing pillars data in findFirstUsageDate.");
        return null;
    }
    try {
        // Iterate through each pillar's data
        Object.values(state.pillars).forEach(pillarData => {
            // Check if the pillar has logged days
            if (pillarData && typeof pillarData.days === 'object' && pillarData.days !== null) {
                // Get all dates where the pillar was logged (value is true)
                const dates = Object.keys(pillarData.days).filter(date => pillarData.days[date] === true);
                dates.forEach(dateStr => {
                    // Basic validation of date format
                    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                        // Update earliestDate if this date is earlier or if earliestDate is null
                        if (!earliestDate || dateStr < earliestDate) {
                            earliestDate = dateStr;
                        }
                    } else {
                        // Log warning for invalid date formats found in data
                        console.warn(`[Utils] Invalid date format found in pillar data: ${dateStr}`);
                    }
                });
            }
        });
    } catch (error) {
        console.error("[Utils] Error finding first usage date:", error);
        return null; // Return null on error
    }
    return earliestDate; // Return the earliest date found, or null if none
}

/**
 * Calculates the total number of days the user has saved an entry.
 * Counts the number of keys (dates) in the savedDays object.
 * @param {object} savedDays - The savedDays object from the state (e.g., state.savedDays).
 * @returns {number} The total count of saved/logged days.
 */
export function calculateTotalDaysLogged(savedDays = {}) {
    // Validate input type
    if (typeof savedDays !== 'object' || savedDays === null) {
        console.warn("[Utils] Invalid savedDays object provided to calculateTotalDaysLogged.");
        return 0;
    }
    try {
        // Return the number of keys (dates) in the object
        return Object.keys(savedDays).length;
    } catch (error) {
        console.error("[Utils] Error calculating total days logged:", error);
        return 0; // Return 0 on error
    }
}

/**
 * Calculates the total number of individual pillar entries logged across all days.
 * Iterates through all pillars and sums up their logged days.
 * @param {object} pillars - The pillars object from the state (e.g., state.pillars).
 * @returns {number} The total count of individual pillar entries.
 */
export function calculateTotalPillarEntries(pillars = {}) {
    let totalEntries = 0;
    // Validate input type
    if (typeof pillars !== 'object' || pillars === null) {
        console.warn("[Utils] Invalid pillars object provided to calculateTotalPillarEntries.");
        return 0;
    }
    try {
        // Iterate through each pillar's data
        Object.values(pillars).forEach(pillarData => {
            // Check if the pillar has logged days
            if (pillarData && typeof pillarData.days === 'object' && pillarData.days !== null) {
                // Count the number of days where the value is true (logged)
                totalEntries += Object.values(pillarData.days).filter(logged => logged === true).length;
            }
        });
    } catch (error) {
        console.error("[Utils] Error calculating total pillar entries:", error);
        return 0; // Return 0 on error
    }
    return totalEntries;
}

/**
 * Calculates the total number of notes added to the timeline.
 * Filters the timeline array for entries of type 'note'.
 * @param {Array} timeline - The timeline array from the state (e.g., state.timeline).
 * @returns {number} The total count of notes.
 */
export function calculateTotalNotesAdded(timeline = []) {
    // Validate input type
    if (!Array.isArray(timeline)) {
        console.warn("[Utils] Invalid timeline array provided to calculateTotalNotesAdded.");
        return 0;
    }
    try {
        // Filter the array for entries with type 'note' and return the count
        return timeline.filter(entry => entry && entry.type === 'note').length;
    } catch (error) {
        console.error("[Utils] Error calculating total notes added:", error);
        return 0; // Return 0 on error
    }
}

/**
 * Calculates the total number of unlocked achievements.
 * Filters the achievements object for entries where 'unlocked' is true.
 * @param {object} achievements - The achievements object from the state (e.g., state.achievements).
 * @returns {number} The total count of unlocked achievements.
 */
export function calculateTotalAchievementsUnlocked(achievements = {}) {
     // Validate input type
     if (typeof achievements !== 'object' || achievements === null) {
         console.warn("[Utils] Invalid achievements object provided to calculateTotalAchievementsUnlocked.");
         return 0;
     }
     try {
         // Filter the object values for entries where 'unlocked' is true and return the count
         return Object.values(achievements).filter(ach => ach && ach.unlocked === true).length;
     } catch (error) {
         console.error("[Utils] Error calculating total achievements unlocked:", error);
         return 0; // Return 0 on error
     }
}

// --- Mood Emoji Helper ---
/**
 * Returns the emoji corresponding to a mood level.
 * @param {number} level - The mood level (1-5).
 * @returns {string} The corresponding emoji or an empty string if level is invalid.
 */
export function getMoodEmoji(level) {
    const emojis = ['😟', '😕', '🫤', '🙂', '😁']; // Index 0 = level 1, etc.
    // Check if level is within the valid range (1-5)
    if (level >= 1 && level <= 5) {
        return emojis[level - 1]; // Return emoji based on 0-based index
    }
    return ''; // Return empty string for invalid levels
}

// --- Add other general utility functions as needed ---