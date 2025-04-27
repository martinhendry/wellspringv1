// ui/collapsibleUI.js

/**
 * Manages the UI logic for generic collapsible sections.
 */

// --- Imports ---
// Import audio functions if sounds are triggered directly here
// import { playSound, handleInteractionForAudio } from '../audio.js'; // Adjust path if needed

// --- Core Function ---

/**
 * Toggles the visibility of a collapsible content area associated with a trigger button.
 * Updates ARIA attributes and manages the 'hidden' attribute for the content.
 * Plays appropriate sound effects (if audio module is imported and used here).
 *
 * @param {HTMLButtonElement} triggerBtn - The button element that triggers the toggle.
 * @param {string} contentId - The ID of the content element to toggle.
 * @param {function} [onExpandCallback] - Optional callback function to execute *after* the section is expanded.
 * @param {function} [onCollapseCallback] - Optional callback function to execute *after* the section is collapsed.
 */
export function toggleCollapsibleSection(triggerBtn, contentId, onExpandCallback, onCollapseCallback) {
    // Validate the trigger button
    if (!triggerBtn || triggerBtn.tagName !== 'BUTTON') {
        console.error("[CollapsibleUI] Invalid trigger button provided for collapsible section.");
        return;
    }
    // Find the content element by ID
    const contentEl = document.getElementById(contentId);
    if (!contentEl) {
        console.error(`[CollapsibleUI] Collapsible content with ID "${contentId}" not found.`);
        return;
    }

    // Determine the current state (true if currently expanded)
    const isExpanded = triggerBtn.getAttribute('aria-expanded') === 'true';
    const newStateExpanded = !isExpanded; // The state we are toggling to

    // --- Update ARIA and Visibility ---
    triggerBtn.setAttribute('aria-expanded', String(newStateExpanded));

    if (newStateExpanded) {
        // Expanding the section
        contentEl.removeAttribute('hidden'); // Remove hidden attribute to allow CSS transitions/display
        // Use requestAnimationFrame to ensure 'hidden' is removed before adding 'expanded' class (for CSS transitions)
        requestAnimationFrame(() => {
            contentEl.classList.add('expanded'); // Add class for potential CSS styling/transitions
             // Execute expand callback if provided
             if (typeof onExpandCallback === 'function') {
                 onExpandCallback();
             }
        });
        // playSound('click', 'F#4', '16n'); // Sound usually played by app.js handler
    } else {
        // Collapsing the section
        contentEl.classList.remove('expanded'); // Remove expanded class
        // Use transitionend event to set 'hidden' *after* CSS transition completes
        contentEl.addEventListener('transitionend', () => {
            // Double-check it wasn't re-expanded during the transition
            if (triggerBtn.getAttribute('aria-expanded') === 'false') {
                contentEl.setAttribute('hidden', '');
            }
        }, { once: true }); // Listener fires only once

        // Fallback: If no transition defined in CSS, hide immediately (or after a short delay)
        // Check if transition property is set, otherwise hide immediately
         const styles = window.getComputedStyle(contentEl);
         if (!styles.transition || styles.transition === 'all 0s ease 0s' || styles.transitionProperty === 'none') {
              console.warn(`[CollapsibleUI] No CSS transition found on #${contentId}. Hiding immediately.`);
              contentEl.setAttribute('hidden', '');
         }


        // Execute collapse callback if provided
        if (typeof onCollapseCallback === 'function') {
            onCollapseCallback();
        }
        // playSound('click', 'F4', '16n'); // Sound usually played by app.js handler
    }

    // --- Update Arrow Indicator ---
    // Find an arrow element within the button (assuming specific class)
    const arrowSpan = triggerBtn.querySelector('.toggle-arrow');
    if (arrowSpan) {
        arrowSpan.textContent = newStateExpanded ? "▲" : "▼"; // Update arrow direction
    }

    // console.log(`[CollapsibleUI] Toggled section ${contentId} to ${newStateExpanded ? 'expanded' : 'collapsed'}`); // Optional log
}


/**
 * Closes the global guide/help section if it is currently expanded.
 * This is a specific use case of a collapsible section.
 * @returns {boolean} True if the guide was closed, false otherwise.
 */
export function closeGuide() {
    const guideContent = document.getElementById("guide-content-area"); // Use specific ID
    const toggleBtn = document.getElementById("guide-toggle-btn"); // Use specific ID

    // Check if elements exist and the guide is currently expanded
    if (guideContent && toggleBtn && toggleBtn.getAttribute('aria-expanded') === 'true') {
        console.log("[CollapsibleUI] Closing guide via closeGuide().");
        // Call the generic toggle function to handle closing
        toggleCollapsibleSection(toggleBtn, 'guide-content-area');
        // Note: Sound is handled within toggleCollapsibleSection or its caller (app.js)
        return true; // Indicate guide was closed
    }
    return false; // Indicate guide was not open or elements not found
}