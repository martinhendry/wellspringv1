// constants.js

/**
 * Defines the 10 core wellness pillars used throughout the WellSpring application.
 * Each pillar object contains:
 * - id: A unique identifier string.
 * - name: The display name of the pillar.
 * - emoji: An emoji representing the pillar.
 * - color: A hex color code associated with the pillar for UI elements.
 * - description: A brief explanation of the pillar's meaning or focus.
 */
export const PILLARS = [
    {
        id: 'stillness', // Changed from 'ground' for clarity
        name: 'Stillness',
        emoji: '🧘‍♂️',
        color: '#8e44ad', // Purple
        description: 'Moments of quiet reflection or meditation.'
    },
    {
        id: 'tidy', // Changed from 'order' for clarity
        name: 'Tidy',
        emoji: '📋',
        color: '#3498db', // Blue
        description: 'Organizing physical or digital space.'
    },
    {
        id: 'connect', // Changed from 'reach' for clarity
        name: 'Connect',
        emoji: '🤝',
        color: '#e74c3c', // Red
        description: 'Meaningful interaction with others.'
    },
    {
        id: 'progress',
        name: 'Progress',
        emoji: '⛰️',
        color: '#2ecc71', // Green
        description: 'Working towards a personal goal.'
    },
    {
        id: 'nourish', // Changed from 'fuel' for clarity
        name: 'Nourish',
        emoji: '📚',
        color: '#f1c40f', // Yellow
        description: 'Engaging with enriching content or ideas.'
    },
    {
        id: 'move',
        name: 'Move',
        emoji: '🏃',
        color: '#e67e22', // Orange
        description: 'Physical activity or exercise.'
    },
    {
        id: 'create',
        name: 'Create',
        emoji: '🎨',
        color: '#9b59b6', // Darker Purple
        description: 'Engaging in creative expression.'
    },
    {
        id: 'unplug', // Changed from 'pause' for clarity
        name: 'Unplug',
        emoji: '📵',
        color: '#7f8c8d', // Gray
        description: 'Disconnecting from screens/digital noise.'
    },
    {
        id: 'reflect',
        name: 'Reflect',
        emoji: '📔',
        color: '#1abc9c', // Teal
        description: 'Journaling or reviewing the day.'
    },
    {
        id: 'enjoy', // Changed from 'savor' for clarity
        name: 'Enjoy',
        emoji: '😌',
        color: '#e84393', // Pink
        description: 'Mindfully appreciating a positive moment.'
    }
];

/**
 * Defines names/titles for specific levels.
 * The index corresponds to the level number minus 1 (e.g., index 9 is for Level 10).
 * If a level doesn't have a specific name, no title will be shown.
 * Max level is 100.
 */
// *** ADDED export keyword ***
export const LEVEL_NAMES = [
    // Level 1-9 (No specific titles)
    "Novice", // Level 1 (Index 0)
    "Apprentice", // Level 2 (Index 1)
    "Initiate", // Level 3
    "Acolyte", // Level 4
    "Practitioner", // Level 5
    "Journeyman", // Level 6
    "Adept", // Level 7
    "Expert", // Level 8
    "Veteran", // Level 9
    // Level 10 Milestone
    "Guardian", // Level 10 (Index 9)
    // Levels 11-19
    null, null, null, null, null, null, null, null, null,
    // Level 20 Milestone
    "Sentinel", // Level 20 (Index 19)
    // Levels 21-29
    null, null, null, null, null, null, null, null, null,
    // Level 30 Milestone
    "Champion", // Level 30 (Index 29)
    // Levels 31-39
    null, null, null, null, null, null, null, null, null,
    // Level 40 Milestone
    "Warden", // Level 40 (Index 39)
    // Levels 41-49
    null, null, null, null, null, null, null, null, null,
    // Level 50 Milestone
    "Master", // Level 50 (Index 49)
    // Levels 51-59
    null, null, null, null, null, null, null, null, null,
    // Level 60 Milestone
    "Grandmaster", // Level 60 (Index 59)
    // Levels 61-69
    null, null, null, null, null, null, null, null, null,
    // Level 70 Milestone
    "Sage", // Level 70 (Index 69)
    // Levels 71-79
    null, null, null, null, null, null, null, null, null,
    // Level 80 Milestone
    "Luminary", // Level 80 (Index 79)
    // Levels 81-89
    null, null, null, null, null, null, null, null, null,
    // Level 90 Milestone
    "Paragon", // Level 90 (Index 89)
    // Levels 91-99
    null, null, null, null, null, null, null, null, null,
    // Level 100 Milestone
    "Ascendant" // Level 100 (Index 99)
];

// Ensure LEVEL_NAMES array has entries up to index 99 (for Level 100)
// Fill remaining spots with null if not defined above
while (LEVEL_NAMES.length < 100) {
    LEVEL_NAMES.push(null);
}