// ui/calendarUI.js

/**
 * Manages the rendering and interaction logic for the Calendar view,
 * including the monthly grid display and keyboard navigation.
 */

// --- Imports ---
import { getState } from '../state.js'; // State access
import { PILLARS } from '../constants.js'; // Pillar definitions
import { formatDate, escapeHtml, getMoodEmoji } from '../utils.js'; // Formatting utilities & mood emoji helper

// Note: Click handling (setCurrentDateFromCalendar) is likely managed in app.js

// --- Constants ---
// Mapping for mood level descriptions (used in ARIA labels)
const MOOD_DESCRIPTIONS = {
    1: "Worried",
    2: "Confused",
    3: "Neutral",
    4: "Happy",
    5: "Excited"
};

// --- Core Rendering Function ---

/**
 * Renders the calendar grid for the specified month and year.
 * Populates the grid with day cells, including mood indicators and pillar blocks.
 * Sets up keyboard navigation for the grid.
 * @param {number} month - The month to render (0-indexed, 0=January).
 * @param {number} year - The year to render.
 * @param {string|null} firstUsageDate - The first date the user logged data ('YYYY-MM-DD'), used for highlighting.
 * @param {function} onDayClick - Callback function executed when a clickable day cell is clicked. Receives the date string ('YYYY-MM-DD') as an argument.
 */
export function renderCalendar(month, year, firstUsageDate, onDayClick) {
    // Get necessary DOM elements
    const container = document.getElementById("calendar-grid");
    const emptyState = document.getElementById("calendar-empty-state");
    const monthHeading = document.getElementById("current-month");

    // Validate elements exist
    if (!container || !emptyState || !monthHeading) {
        console.error("[CalendarUI] Calendar elements missing (grid, empty-state, or current-month).");
        return;
    }
    // Validate month and year inputs
    if (typeof month !== 'number' || typeof year !== 'number' || isNaN(month) || isNaN(year) || month < 0 || month > 11) {
        console.error("[CalendarUI] renderCalendar called with invalid month/year:", month, year);
        monthHeading.textContent = "Error: Invalid Date";
        container.innerHTML = ''; // Clear grid
        emptyState.style.display = 'block';
        emptyState.textContent = 'Could not load calendar view due to invalid date.';
        return;
    }

    // --- Update Month Heading ---
    try {
        const monthName = new Date(year, month).toLocaleString("default", { month: "long" });
        monthHeading.textContent = `${monthName} ${year}`;
    } catch (e) {
        console.error("[CalendarUI] Error formatting month name:", e);
        monthHeading.textContent = "Error";
    }

    // --- Calculate Calendar Parameters (using UTC dates) ---
    const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
    const startDayOfWeek = firstDayOfMonth.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate(); // Get last day of the month

    // --- Get State Data ---
    const state = getState();
    // Validate state and necessary properties
    if (!state || typeof state.savedDays === 'undefined' || typeof state.pillars === 'undefined' || typeof state.mood === 'undefined') {
        console.error("[CalendarUI] State properties missing in renderCalendar");
        container.innerHTML = '<p class="error-message">Error loading calendar data.</p>';
        emptyState.style.display = 'block';
        emptyState.textContent = 'Error loading calendar data.';
        return;
    }

    // --- Build Calendar HTML ---
    let calendarHtml = "";
    let hasDataThisMonth = false; // Track if any day in the month has data

    // Add leading empty cells for days before the 1st of the month
    for (let i = 0; i < startDayOfWeek; i++) {
        calendarHtml += '<div class="calendar-day disabled" aria-hidden="true"></div>';
    }

    // Get the end of today (UTC) for future date comparison
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999); // Set to the very end of the current day

    // Generate cells for each day in the month
    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(Date.UTC(year, month, d)); // Create Date object for the current day (UTC)
        const dateStr = dateObj.toISOString().split("T")[0]; // Format as YYYY-MM-DD
        const isFuture = dateObj > todayEnd; // Check if the date is in the future
        const isSaved = state.savedDays[dateStr]; // Check if the day was saved
        // Get pillars logged on this day
        const pillarsLogged = PILLARS.filter(p => state.pillars[p.id]?.days?.[dateStr]);
        const moodLevel = state.mood[dateStr]; // Get mood level for the day

        // Update flag if any data exists for this day
        if (isSaved || pillarsLogged.length > 0 || moodLevel) hasDataThisMonth = true;

        // --- Build CSS Classes ---
        let dayClasses = "calendar-day";
        if (isFuture) dayClasses += " disabled"; // Mark future days as disabled
        if (isSaved) dayClasses += " saved"; // Highlight saved days
        if (dateStr === firstUsageDate) dayClasses += " first-day"; // Highlight first usage day

        // --- Build Title Attribute (Hover Summary) ---
        let titleSummary = "";
        if (isFuture) {
            titleSummary = `${formatDate(dateStr)}\nFuture date.`;
        } else {
            titleSummary = `${formatDate(dateStr)}\n`; // Date on first line
            // Logged Pillars Summary
            titleSummary += `Logged: ${pillarsLogged.length > 0 ? pillarsLogged.map(p => p.emoji).join(' ') : 'None'}\n`;
            // Logged Mood Summary
            titleSummary += `Mood: ${moodLevel && MOOD_DESCRIPTIONS[moodLevel] ? getMoodEmoji(moodLevel) + ' ' + MOOD_DESCRIPTIONS[moodLevel] : 'Not logged'}`;
            // Add extra info if saved or first day
            if (isSaved) titleSummary += "\n(Day Saved)";
            if (dateStr === firstUsageDate) titleSummary += "\n(First Day)";
        }
        const escapedTitle = escapeHtml(titleSummary); // Escape for attribute safety

        // --- Build ARIA Label (Accessibility) ---
        let ariaLabel = `${formatDate(dateStr)}. `;
        if (isFuture) {
            ariaLabel = `${formatDate(dateStr)}. Future date.`;
        } else {
            if (isSaved) ariaLabel += "Day saved. ";
            if (moodLevel && MOOD_DESCRIPTIONS[moodLevel]) ariaLabel += `Mood: ${getMoodEmoji(moodLevel)} ${MOOD_DESCRIPTIONS[moodLevel]}. `;
            if (pillarsLogged.length > 0) {
                ariaLabel += `Pillars: ${pillarsLogged.map(p => p.name).join(', ')}.`;
            } else if (!isSaved) { // Only say "Not logged" if it's not saved and has no pillars/mood
                ariaLabel += "Not logged.";
            }
            if (dateStr === firstUsageDate) ariaLabel += " First recorded day.";
        }
        const escapedAriaLabel = escapeHtml(ariaLabel);

        // --- Generate Day Cell HTML ---
        calendarHtml += `
            <div class="${dayClasses}"
                 data-date="${dateStr}"
                 role="button"
                 tabindex="${isFuture ? -1 : 0}" // Make non-future days focusable
                 aria-label="${escapedAriaLabel}"
                 title="${escapedTitle}">
                <span class="day-number">${d}</span>
                ${moodLevel ? `<div class="mood-indicator" aria-hidden="true">${getMoodEmoji(moodLevel)}</div>` : ''}
                <div class="pillar-blocks" aria-hidden="true">
                    ${pillarsLogged.map(p => `<div class="pillar-block" style="background: ${p.color || '#ccc'}" title="${escapeHtml(p.name || '')}"></div>`).join("")}
                </div>
            </div>`;
    }

    // --- Update DOM ---
    container.innerHTML = calendarHtml; // Update grid content
    emptyState.style.display = hasDataThisMonth ? 'none' : 'block'; // Show/hide empty state message

    // --- Setup Interactions ---
    setupCalendarKeyboardNav(container, onDayClick); // Add keyboard navigation
    // Click listeners are likely added via delegation in app.js using the onDayClick callback
}

// --- Internal Helper Functions ---

/**
 * Sets up keyboard navigation (arrow keys, Enter, Space) for the calendar grid.
 * Uses event delegation on the grid container.
 * @param {HTMLElement} calendarGrid - The container element for the calendar days.
 * @param {function} onDayActivate - Callback function executed when a day is activated via Enter/Space. Receives the date string.
 */
function setupCalendarKeyboardNav(calendarGrid, onDayActivate) {
    // Remove existing listener to prevent duplicates if re-rendering
    // Note: This requires storing the listener function reference if not using delegation properly.
    // For simplicity here, we assume re-rendering clears old listeners or rely on delegation.

    calendarGrid.addEventListener('keydown', (e) => {
        const currentFocused = document.activeElement;
        // Ensure the event originated from a focusable calendar day
        if (!currentFocused || !currentFocused.classList.contains('calendar-day') || currentFocused.classList.contains('disabled')) {
            return;
        }

        const days = Array.from(calendarGrid.querySelectorAll('.calendar-day:not(.disabled)'));
        const currentIndex = days.indexOf(currentFocused);
        if (currentIndex === -1) return; // Should not happen if checks above pass

        let targetIndex = currentIndex;
        let shouldPreventDefault = true; // Prevent default scroll for arrows

        // Determine target index based on arrow key pressed
        switch (e.key) {
            case 'ArrowRight':
                targetIndex = Math.min(days.length - 1, currentIndex + 1);
                break;
            case 'ArrowLeft':
                targetIndex = Math.max(0, currentIndex - 1);
                break;
            case 'ArrowDown':
                // Attempt to move down 7 days (next week), stay within bounds
                targetIndex = Math.min(days.length - 1, currentIndex + 7);
                break;
            case 'ArrowUp':
                // Attempt to move up 7 days (previous week), stay within bounds
                targetIndex = Math.max(0, currentIndex - 7);
                break;
            case 'Enter':
            case ' ': // Activate day on Enter or Space
                if (typeof onDayActivate === 'function') {
                    const dateStr = currentFocused.dataset.date;
                    if (dateStr) {
                        onDayActivate(dateStr); // Call the activation callback
                    }
                }
                break;
            default:
                shouldPreventDefault = false; // Don't prevent default for other keys
                return; // Ignore other keys
        }

        if (shouldPreventDefault) {
            e.preventDefault(); // Prevent default scroll behavior
        }

        // Focus the target day cell if it changed
        if (targetIndex !== currentIndex && days[targetIndex]) {
            // Use preventScroll: true to avoid page jump on focus change
            days[targetIndex].focus({ preventScroll: true });
        }
    });
    // console.log("[CalendarUI] Keyboard navigation set up."); // Optional log
}

// Note: getMoodEmoji function needs to be available via import from utils.js