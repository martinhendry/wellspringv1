// ui/timelineUI.js

/**
 * Manages the UI elements and rendering for the Journey Timeline tab.
 * *** MODIFIED: Added more robust checks for element existence. ***
 */

// --- Imports ---
import { getState, getStateReference } from '../state.js';
import { formatDate, escapeHtml, getWeekNumber } from '../utils.js';

// --- Core Rendering Function ---
export function renderTimeline() {
    const container = document.getElementById("timeline-entries");
    if (!container) {
        console.error("[TimelineUI] CRITICAL: Timeline entries container (#timeline-entries) not found. Cannot render timeline.");
        return;
    }

    const stateRef = getStateReference();
    const state = getState();

    if (!stateRef || !Array.isArray(stateRef.timeline) || !stateRef.achievements) {
        console.error("[TimelineUI] State, timeline, or achievements data missing.");
        container.innerHTML = '<div class="timeline-entry error-message"><p>Error loading timeline data.</p></div>';
        return;
    }

    const filterType = stateRef.timelineFilter || 'all';
    const sortOrder = stateRef.timelineSortOrder || 'newest';
    const userName = state?.userName || 'You';

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
        const noteId = entry.noteId || '';

        switch (entry.type) {
            case 'note':
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
            case 'achievement':
                const achievementData = stateRef.achievements?.[entry.achievementId];
                if (achievementData) {
                    const rawFlavorText = (achievementData.flavor || '');
                    const personalizedFlavor = rawFlavorText.replace(/\[Name\]/g, escapeHtml(userName));
                    const flavorParts = personalizedFlavor.split('\n');
                    let formattedFlavorHTML = '';
                    if (flavorParts.length > 0) formattedFlavorHTML += `<p class="flavor-quote">${escapeHtml(flavorParts[0].trim())}</p>`;
                    if (flavorParts.length > 2) formattedFlavorHTML += `<p class="flavor-encouragement">${escapeHtml(flavorParts[2].trim())}</p>`;
                    if (flavorParts.length > 1) formattedFlavorHTML += `<p class="flavor-tip">${escapeHtml(flavorParts[1].trim())}</p>`;
                    return `
                        <div class="timeline-entry achievement-entry">
                            <div class="timeline-date"><span class="icon" aria-hidden="true"><i class="fas fa-trophy"></i></span> Achievement Unlocked: ${entryDate}</div>
                            <h4><i class="${escapeHtml(achievementData.icon || 'fa-solid fa-question-circle')}" aria-hidden="true"></i> ${escapeHtml(achievementData.name || 'Unnamed Achievement')}</h4>
                            <div class="flavor-text-container">${formattedFlavorHTML}</div>
                            <p class="description">${escapeHtml(achievementData.description || 'No description.')}</p>
                        </div>`;
                } else {
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

export function updateTimelineControls() {
    const state = getState();
    if (!state) { console.error("[TimelineUI] State undefined in updateTimelineControls"); return; }

    const filterSelect = document.getElementById('timeline-filter');
    const sortSelect = document.getElementById('timeline-sort');

    if (!filterSelect) {
        console.warn("[TimelineUI] Timeline filter select (#timeline-filter) not found in updateTimelineControls.");
    } else {
        filterSelect.value = state.timelineFilter || 'all';
    }

    if (!sortSelect) {
        console.warn("[TimelineUI] Timeline sort select (#timeline-sort) not found in updateTimelineControls.");
    } else {
        sortSelect.value = state.timelineSortOrder || 'newest';
    }
}

export function setupAutoResizeTextarea() {
    const textarea = document.getElementById('new-note-textarea');
    if (!textarea) {
        console.warn("[TimelineUI] Note textarea (#new-note-textarea) not found for auto-resize.");
        return;
    }
    const adjustHeight = () => { textarea.style.height = 'auto'; textarea.style.height = `${textarea.scrollHeight}px`; };
    textarea.addEventListener('input', adjustHeight);
    adjustHeight();
}

export function updateNoteHeaderPrompt() {
    const noteHeader = document.querySelector('#add-note-form h3');
    if (!noteHeader) {
        // console.warn("[TimelineUI] Note header for prompt (#add-note-form h3) not found.");
        return;
    }
    const state = getState();
    if (!state || !state.currentDate) { noteHeader.textContent = "Add a Timeline Note"; return; }
    const currentDate = state.currentDate;
    let dateObj;
    try { dateObj = new Date(currentDate + 'T00:00:00Z'); if (isNaN(dateObj.getTime())) throw new Error("Invalid date"); }
    catch (e) { noteHeader.textContent = "Add a Timeline Note"; return; }
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
