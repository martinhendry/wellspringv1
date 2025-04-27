// ui/modalsUI.js

/**
 * Manages the display and interaction logic for general-purpose modals
 * like the Welcome message and Name Prompt.
 */

// --- Imports ---
// Import audio functions if needed (usually handled by app.js calling these functions)
// import { playSound, handleInteractionForAudio } from '../audio.js';
// Import state functions if needed (e.g., to check if name exists before showing prompt)
// import { getState } from '../state.js';

// --- Welcome Modal ---

/**
 * Shows the welcome modal overlay if it hasn't been dismissed previously
 * (checks localStorage flag 'wellnessTrackerVisited').
 * Focuses the dismiss button for accessibility.
 */
export function showWelcomeMessage() {
    const modal = document.getElementById('welcome-modal');
    const dismissBtn = document.getElementById('dismiss-welcome-btn');

    // Validate elements exist
    if (!modal || !dismissBtn) {
        console.error("[ModalsUI] Welcome modal or dismiss button not found.");
        return;
    }

    try {
        // Show modal only if the 'visited' flag is NOT set in localStorage
        if (!localStorage.getItem('wellnessTrackerVisited')) {
            modal.classList.add('visible'); // Make modal visible
            // Focus the dismiss button after a short delay for transition
            setTimeout(() => dismissBtn.focus({ preventScroll: true }), 50);
            console.log("[ModalsUI] Welcome modal shown.");
        } else {
            // console.log("[ModalsUI] Welcome modal already seen, not showing."); // Optional log
            return; // Don't show if already visited
        }
    } catch (e) {
        // If localStorage access fails (e.g., private browsing), show the modal anyway
        console.warn("[ModalsUI] Could not check localStorage for visited flag, showing welcome modal.", e);
        modal.classList.add('visible');
        setTimeout(() => dismissBtn.focus({ preventScroll: true }), 50);
    }
}

/**
 * Hides the welcome modal and sets the 'wellnessTrackerVisited' flag
 * in localStorage to prevent it from showing again.
 * This function should be called by an event listener in app.js.
 */
export function closeWelcomeModal() { // Name is already correct here
    const modal = document.getElementById('welcome-modal');
    if (modal && modal.classList.contains('visible')) {
        modal.classList.remove('visible'); // Hide modal
        try {
            // Set flag in localStorage to prevent showing again
            localStorage.setItem('wellnessTrackerVisited', 'true');
            console.log("[ModalsUI] Welcome modal closed and visited flag set.");
        } catch (e) {
            console.warn("[ModalsUI] Could not set visited flag in localStorage", e);
        }
        // playSound('save', 'E5', '8n'); // Sound usually played by app.js handler
        return true; // Indicate modal was closed
    }
    return false; // Indicate modal was not open or found
}

// --- Name Prompt Modal ---

/**
 * Shows the name prompt modal overlay.
 * Focuses the name input field for better UX.
 */
export function showNamePromptModal() {
    const modal = document.getElementById('name-prompt-modal');
    const input = document.getElementById('name-input');
    if (modal) {
        modal.classList.add('visible'); // Make modal visible
        // Focus the input field when modal opens
        if (input) {
             // Delay focus slightly to ensure modal is fully visible and ready
             setTimeout(() => input.focus({ preventScroll: true }), 100);
        }
        console.log("[ModalsUI] Name prompt modal shown.");
    } else {
        console.error("[ModalsUI] Name prompt modal element (#name-prompt-modal) not found.");
    }
}

/**
 * Hides the name prompt modal.
 * This function should be called by an event listener in app.js.
 */
// *** FIXED: Renamed function from hideNamePromptModal to closeNamePromptModal ***
export function closeNamePromptModal() {
    const modal = document.getElementById('name-prompt-modal');
    if (modal && modal.classList.contains('visible')) {
        modal.classList.remove('visible'); // Hide modal
        // playSound('click', 'D4', '16n'); // Sound usually played by app.js handler
        console.log("[ModalsUI] Name prompt modal hidden.");
        return true; // Indicate modal was closed
    }
    return false; // Indicate modal was not open or found
}

// Note: The logic for *saving* the name entered in the prompt modal
// should reside in app.js, which will call the appropriate state function (e.g., setUserName)
// and then call closeNamePromptModal().