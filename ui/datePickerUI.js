// ui/datePickerUI.js

/**
 * Handles UI interactions related to the date picker.
 */

// Import interaction handler if sounds are played directly here (optional)
// import { handleInteractionForAudio } from '../audio.js';

/**
 * Attempts to show the native date picker associated with the hidden date input element.
 * Provides feedback if the browser doesn't support the `showPicker()` method.
 */
export function showDatePicker() {
    // handleInteractionForAudio(); // Call if playing sound directly from here

    try {
        // Find the hidden date input element
        const hiddenInput = document.getElementById('hidden-date-input');

        if (hiddenInput && typeof hiddenInput.showPicker === 'function') {
            // Use the modern showPicker() method if available
            hiddenInput.showPicker();
            // console.log("[DatePickerUI] showPicker() called."); // Optional log
        } else if (hiddenInput) {
            // Fallback for browsers that don't support showPicker()
            // Focusing a hidden input might not reliably open the picker.
            console.warn("[DatePickerUI] showPicker() method not supported by this browser. Attempting focus as fallback (may not work).");
            hiddenInput.focus({ preventScroll: true }); // Try focusing, prevent scroll jump
            // Consider showing a message to the user that their browser is limited.
            // showToast("Your browser doesn't fully support the calendar picker.", "info");
        } else {
            // Log an error if the hidden input element isn't found
            console.error("[DatePickerUI] Hidden date input (#hidden-date-input) not found.");
        }
    }
    catch (error) {
        // Catch any unexpected errors during the process
        console.error("[DatePickerUI] Error trying to show date picker:", error);
        // showToast("Could not open date picker.", "error"); // Requires showToast import
    }
}