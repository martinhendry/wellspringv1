// ui/timelineUI.js

/**
 * Manages the UI elements and rendering for the Journey Timeline tab.
 * Includes rendering timeline entries, handling controls, and the note input area.
 * *** MODIFIED: Added Edit/Delete buttons for note entries. ***
 * *** MODIFIED to reorder flavor text (Encouragement before Tip). ***
 */

// --- Imports ---
import { getState, getStateReference } from '../state.js'; // State access
import { formatDate, escapeHtml, getWeekNumber } from '../utils.js'; // Utilities

// --- Core Rendering Function ---

/**
 * Renders the journey timeline entries based on current sort/filter state.
 * Fetches data from the state and updates the timeline container.
 */
export function renderTimeline() {
    const container = document.getElementById("timeline-entries");
    if (!container) { console.error("[TimelineUI] Timeline entries container not found."); return; }

    const stateRef = getStateReference();
    const state = getState(); // Read-only copy for username etc.

    if (!stateRef || !Array.isArray(stateRef.timeline) || !stateRef.achievements) {
        console.error("[TimelineUI] State, timeline, or achievements data missing.");
        container.innerHTML = '<div class="timeline-entry error-message"><p>Error loading timeline data.</p></div>';
        return;
    }

    const filterType = stateRef.timelineFilter || 'all';
    const sortOrder = stateRef.timelineSortOrder || 'newest';
    const userName = state?.userName || 'You';

    // --- Filter and Sort Timeline Data ---
    let filteredTimeline = [...stateRef.timeline];
    if (filterType !== 'all') {
        filteredTimeline = filteredTimeline.filter(entry => entry?.type === filterType);
    }
    try {
        filteredTimeline.sort((a, b) => {
            const dateA = new Date(a?.date || 0).getTime();
            const dateB = new Date(b?.date || 0).getTime();
            if (isNaN(dateA) || isNaN(dateB)) { return 0; }
            return sortOrder === 'oldest' ? dateA - dateB : dateB - dateA;
        });
    } catch (error) { console.error("[TimelineUI] Error sorting timeline:", error); }

    // --- Generate HTML ---
    if (filteredTimeline.length === 0) {
        let emptyMessage = "No timeline entries yet.";
        if (filterType !== 'all') {
            const displayFilterType = filterType === 'prestige' ? 'Cycle' : filterType;
            emptyMessage = `No '${escapeHtml(displayFilterType)}' entries found.`;
        }
        container.innerHTML = `<div class="timeline-entry"><p>${emptyMessage}</p></div>`;
        return;
    }

    container.innerHTML = filteredTimeline.map((entry) => {
        if (!entry || !entry.type || !entry.date) {
            console.warn("[TimelineUI] Skipping invalid timeline entry:", entry);
            return '';
        }
        const entryDate = formatDate(entry.date.split('T')[0]) || 'Unknown Date';

        switch (entry.type) {
            case 'note':
                // --- START MODIFICATION: Add Edit/Delete buttons for notes ---
                const noteId = entry.noteId || ''; // Get the noteId
                return `
                    <div class="timeline-entry note-entry" data-note-id="${escapeHtml(noteId)}">
                        <div class="timeline-date">
                            <span class="icon" aria-hidden="true">📝</span> Note Added: ${entryDate}
                        </div>
                        <p class="note-text-content">${escapeHtml(entry.text || 'Empty note.')}</p>
                        <div class="timeline-entry-actions">
                            <button class="timeline-action-btn edit-note-btn" data-note-id="${escapeHtml(noteId)}" aria-label="Edit note">
                                <i class="fas fa-edit" aria-hidden="true"></i> Edit
                            </button>
                            <button class="timeline-action-btn delete-note-btn" data-note-id="${escapeHtml(noteId)}" aria-label="Delete note">
                                <i class="fas fa-trash-alt" aria-hidden="true"></i> Delete
                            </button>
                        </div>
                    </div>`;
                // --- END MODIFICATION ---

            case 'achievement':
                const achievementData = stateRef.achievements?.[entry.achievementId];
                if (achievementData) {
                    const rawFlavorText = (achievementData.flavor || '');
                    const personalizedFlavor = rawFlavorText.replace(/\[Name\]/g, escapeHtml(userName));
                    const flavorParts = personalizedFlavor.split('\n');
                    let formattedFlavorHTML = '';
                    if (flavorParts.length > 0) {
                        formattedFlavorHTML += `<p class="flavor-quote">${escapeHtml(flavorParts[0].trim())}</p>`;
                    }
                    if (flavorParts.length > 2) { // Encouragement (Part 3 / Index 2)
                        formattedFlavorHTML += `<p class="flavor-encouragement">${escapeHtml(flavorParts[2].trim())}</p>`;
                    }
                    if (flavorParts.length > 1) { // Tip (Part 2 / Index 1)
                        formattedFlavorHTML += `<p class="flavor-tip">${escapeHtml(flavorParts[1].trim())}</p>`;
                    }

                    return `
                        <div class="timeline-entry achievement-entry">
                            <div class="timeline-date"><span class="icon" aria-hidden="true"><i class="fas fa-trophy"></i></span> Achievement Unlocked: ${entryDate}</div>
                            <h4><i class="${escapeHtml(achievementData.icon || 'fa-solid fa-question-circle')}" aria-hidden="true"></i> ${escapeHtml(achievementData.name || 'Unnamed Achievement')}</h4>
                            <div class="flavor-text-container">${formattedFlavorHTML}</div>
                            <p class="description">${escapeHtml(achievementData.description || 'No description.')}</p>
                        </div>`;
                } else {
                    console.log(`[TimelineUI] Achievement data missing for ID: ${entry.achievementId}.`);
                    return `
                        <div class="timeline-entry achievement-entry">
                            <div class="timeline-date"><span class="icon" aria-hidden="true"><i class="fas fa-trophy"></i></span> Achievement Unlocked: ${entryDate}</div>
                            <h4><i class="fa-solid fa-question-circle" aria-hidden="true"></i> Achievement Unlocked</h4>
                            <p class="description">(Details for achievement ID '${escapeHtml(String(entry.achievementId))}' not available)</p>
                        </div>`;
                }

            case 'prestige':
                return `
                    <div class="timeline-entry prestige-entry">
                        <div class="timeline-date"><span class="icon" aria-hidden="true"><i class="fas fa-recycle"></i></span> Cycle Completed: ${entryDate}</div>
                        <h4><i class="fas fa-recycle" aria-hidden="true"></i> Reached Cycle ${entry.prestigeLevel || '?'}!</h4>
                        <p class="description">Level and XP reset. The journey continues!</p>
                     </div>`;

            default:
                console.warn("[TimelineUI] Unknown entry type:", entry.type);
                return '';
        }
    }).join("");
}

// --- UI Control Updates ---
export function updateTimelineControls() {
    const state = getState();
    if (!state) { console.error("[TimelineUI] State undefined in updateTimelineControls"); return; }
    const filterSelect = document.getElementById('timeline-filter');
    const sortSelect = document.getElementById('timeline-sort');
    if (filterSelect) { filterSelect.value = state.timelineFilter || 'all'; } else { console.warn("[TimelineUI] Timeline filter select not found."); }
    if (sortSelect) { sortSelect.value = state.timelineSortOrder || 'newest'; } else { console.warn("[TimelineUI] Timeline sort select not found."); }
}

// --- Note Input Area ---
export function setupAutoResizeTextarea() {
    const textarea = document.getElementById('new-note-textarea');
    if (textarea) {
        const adjustHeight = () => { textarea.style.height = 'auto'; textarea.style.height = `${textarea.scrollHeight}px`; };
        textarea.addEventListener('input', adjustHeight);
        adjustHeight(); // Initial adjustment
    } else { console.warn("[TimelineUI] Note textarea not found for auto-resize."); }
}
export function updateNoteHeaderPrompt() {
    const noteHeader = document.querySelector('#add-note-form h3');
    if (!noteHeader) { return; }
    const state = getState();
    if (!state || !state.currentDate) { console.error("[TimelineUI] State or currentDate missing in updateNoteHeaderPrompt"); noteHeader.textContent = "Add a Timeline Note"; return; }
    const currentDate = state.currentDate;
    let dateObj;
    try { dateObj = new Date(currentDate + 'T00:00:00Z'); if (isNaN(dateObj.getTime())) throw new Error("Invalid date"); }
    catch (e) { console.error("[TimelineUI] Invalid date in updateNoteHeaderPrompt:", currentDate); noteHeader.textContent = "Add a Timeline Note"; return; }
    const isSunday = dateObj.getUTCDay() === 0;
    let headerText = "Add a Timeline Note";
    if (isSunday) {
        const weekId = getWeekNumber(currentDate);
        if (weekId && Array.isArray(state.timeline)) {
            const hasWeeklyNote = state.timeline.some(entry => entry?.type === 'note' && entry.text?.toLowerCase().includes('#weeklyreflection') && getWeekNumber(entry.date?.split('T')[0]) === weekId);
            if (!hasWeeklyNote) { headerText = "Add a Timeline Note (Weekly Reflection?)"; }
        }
    }
    noteHeader.textContent = headerText;
}
