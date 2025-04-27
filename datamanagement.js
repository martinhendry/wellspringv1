// datamanagement.js

/**
 * Handles data export and import functionality for the WellSpring application.
 */

// --- Imports ---
import { getState } from './state.js'; // Import getState for exporting current data
import { showToast } from './ui/globalUI.js'; // Assuming toast is in globalUI now
import { playSound, handleInteractionForAudio } from './audio.js';

// --- Constants ---
const LOCAL_STORAGE_KEY = 'wellspringAppState'; // Centralize the key name

// --- Export Function ---

/**
 * Exports the current application state to a JSON backup file.
 * Creates a JSON string from the state, creates a Blob, and triggers a download.
 */
export function exportData() {
    // Ensure audio context is ready if playing sounds
    handleInteractionForAudio();
    try {
        console.log("[DataMgmt] Starting data export...");
        // Get a deep copy of the current state to ensure no modifications during export
        const stateToExport = getState();

        // Convert state object to a nicely formatted JSON string
        const dataString = JSON.stringify(stateToExport, null, 2); // Use null, 2 for pretty printing

        // Create a Blob object from the JSON string
        const blob = new Blob([dataString], { type: "application/json" });

        // Create a temporary URL for the Blob
        const url = URL.createObjectURL(blob);

        // Create a temporary anchor element to trigger the download
        const a = document.createElement("a");
        a.href = url;
        // Generate a filename including the current date
        a.download = `wellspring-backup-${new Date().toISOString().split("T")[0]}.json`;

        // Append the anchor to the body, click it, and then remove it
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Revoke the temporary URL to free up resources
        URL.revokeObjectURL(url);

        console.log("[DataMgmt] Data exported successfully.");
        showToast('Data exported successfully!', 'success');
        playSound('save', 'G5', '8n'); // Play success sound

    } catch (error) {
        console.error("[DataMgmt] Error exporting data:", error);
        showToast('Failed to export data. See console for details.', 'error');
        playSound('error'); // Play error sound
    }
}

// --- Import Functionality ---

/**
 * Handles the file selection event when a backup file is chosen via the file input.
 * Reads the file content, parses it as JSON, performs basic validation,
 * confirms with the user, saves the raw JSON string to localStorage,
 * and triggers a page reload to apply the imported state.
 * @param {Event} event - The file input change event object.
 */
function handleFileImport(event) {
    // Ensure audio context is ready if playing sounds
    handleInteractionForAudio();
    const fileInput = event.target;
    const file = fileInput.files[0]; // Get the selected file

    // Exit if no file is selected
    if (!file) {
        console.log("[DataMgmt] No file selected for import.");
        return;
    }

    console.log(`[DataMgmt] File selected for import: ${file.name}`);
    const reader = new FileReader(); // Create a FileReader to read the file content

    // Define what happens when the file is successfully read
    reader.onload = function (readerEvent) {
        try {
            const fileContent = readerEvent.target.result;
            // Attempt to parse the file content as JSON
            const importedData = JSON.parse(fileContent);
            console.log("[DataMgmt] Successfully parsed imported file.");

            // --- Basic Validation ---
            // Check for essential top-level keys expected in the state object
            const requiredKeys = ['currentDate', 'totalXP', 'streak', 'pillars', 'savedDays', 'mood', 'timeline', 'achievements', 'habitPlans', 'userMode']; // Add other essential keys
            const missingKeys = requiredKeys.filter(key => !(key in importedData));

            if (missingKeys.length > 0) {
                // Throw an error if the structure seems invalid
                throw new Error(`Invalid backup file structure. Missing keys: ${missingKeys.join(', ')}`);
            }
            // Add more specific type checks if necessary (e.g., is timeline an array?)
            if (!Array.isArray(importedData.timeline)) {
                throw new Error("Invalid backup file structure: 'timeline' is not an array.");
            }
            console.log("[DataMgmt] Imported data passed basic validation.");
            // --- End Validation ---

            // Confirm with the user before overwriting existing data
            if (confirm("Restore backup? This will overwrite your current WellSpring data and reload the application.")) {
                try {
                    // Save the raw JSON string directly to localStorage.
                    // The application's loadState function (in state.js) will handle
                    // parsing and merging this data correctly on the next page load.
                    localStorage.setItem(LOCAL_STORAGE_KEY, fileContent);
                    console.log("[DataMgmt] Imported data saved to localStorage.");

                    showToast('Data restored successfully! Reloading...', 'success');
                    playSound('save', 'A5', '8n'); // Play success sound

                    // Reload the page after a short delay to allow the toast to be seen
                    setTimeout(() => {
                        console.log("[DataMgmt] Reloading page to apply imported state...");
                        location.reload();
                    }, 1500); // 1.5 second delay

                } catch (storageError) {
                    // Handle potential errors during localStorage saving (e.g., quota exceeded)
                    console.error("[DataMgmt] Error saving imported state to localStorage:", storageError);
                    showToast('Restore failed: Could not save imported data. Storage might be full.', 'error');
                    playSound('error');
                }
            } else {
                // User cancelled the confirmation dialog
                console.log("[DataMgmt] Restore cancelled by user.");
                showToast('Restore cancelled.', 'info');
            }
        } catch (error) {
            // Handle errors during file parsing or validation
            console.error("[DataMgmt] Error processing import file:", error);
            showToast(`Restore failed: ${error.message || 'Could not parse file.'}`, 'error');
            playSound('error');
        } finally {
            // Reset the file input value regardless of success or failure
            // This allows the user to select the same file again if needed
            if (fileInput) {
                fileInput.value = '';
            }
        }
    };

    // Define what happens if there's an error reading the file
    reader.onerror = function() {
        console.error("[DataMgmt] Failed to read the selected file.");
        showToast("Failed to read file.", 'error');
        playSound('error');
        // Reset the file input value on read error as well
        if (fileInput) {
            fileInput.value = '';
        }
    };

    // Start reading the selected file as text
    reader.readAsText(file);
}

/**
 * Sets up the event listener for the file input element used for importing data.
 * Should be called once during application initialization (e.g., in app.js init).
 */
export function setupImportListener() {
    // Get the hidden file input element
    const fileInput = document.getElementById("file-input");
    // Get the button that triggers the file input
    const triggerBtn = document.getElementById('import-data-trigger-btn'); // Use the correct ID from index.html

    if (fileInput && triggerBtn) {
        // Ensure the file input value is initially cleared (useful for re-selecting the same file)
        fileInput.value = "";
        // Add the event listener to the file input to handle file selection
        fileInput.addEventListener("change", handleFileImport);
        // Add event listener to the trigger button to open the file dialog
        triggerBtn.addEventListener('click', () => {
            handleInteractionForAudio(); // Ensure audio is ready
            fileInput.click(); // Programmatically click the hidden file input
        });
        console.log("[DataMgmt] File import listener and trigger button set up.");
    } else {
        // Log warnings if elements are not found
        if (!fileInput) {
            console.warn("[DataMgmt] File input element (#file-input) not found for import listener setup.");
        }
        if (!triggerBtn) {
            console.warn("[DataMgmt] Import trigger button (#import-data-trigger-btn) not found for setup.");
        }
    }
}