// datamanagement.js

/**
 * Handles data export and import functionality for the WellSpring application.
 * *** MODIFIED: Added call to setLastDataExportTime on successful export. ***
 */

// --- Imports ---
import { getState, setLastDataExportTime } from './state.js'; // Import getState and setLastDataExportTime
import { showToast } from './ui/globalUI.js';
import { playSound, handleInteractionForAudio } from './audio.js';

// --- Constants ---
const LOCAL_STORAGE_KEY = 'wellspringAppState_v2'; // Ensure this matches state.js if it was changed there

// --- Export Function ---

/**
 * Exports the current application state to a JSON backup file.
 * Creates a JSON string from the state, creates a Blob, and triggers a download.
 * Updates the last data export time in the state.
 */
export function exportData() {
    handleInteractionForAudio();
    try {
        console.log("[DataMgmt] Starting data export...");
        const stateToExport = getState();
        const dataString = JSON.stringify(stateToExport, null, 2);
        const blob = new Blob([dataString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `wellspring-backup-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // --- START MODIFICATION: Record successful export time ---
        setLastDataExportTime(); // Update the state with the export timestamp
        // --- END MODIFICATION ---

        console.log("[DataMgmt] Data exported successfully and export time recorded.");
        showToast('Data exported successfully!', 'success');
        playSound('save', 'G5', '8n');

    } catch (error) {
        console.error("[DataMgmt] Error exporting data:", error);
        showToast('Failed to export data. See console for details.', 'error');
        playSound('error');
    }
}

// --- Import Functionality ---
// ... (handleFileImport and setupImportListener remain the same as your existing file) ...
function handleFileImport(event) {
    handleInteractionForAudio();
    const fileInput = event.target;
    const file = fileInput.files[0];
    if (!file) {
        return;
    }
    const reader = new FileReader();
    reader.onload = function (readerEvent) {
        try {
            const fileContent = readerEvent.target.result;
            const importedData = JSON.parse(fileContent);
            const requiredKeys = ['currentDate', 'totalXP', 'streak', 'pillars', 'savedDays', 'mood', 'timeline', 'achievements', 'habitPlans', 'userMode'];
            const missingKeys = requiredKeys.filter(key => !(key in importedData));
            if (missingKeys.length > 0) {
                throw new Error(`Invalid backup file structure. Missing keys: ${missingKeys.join(', ')}`);
            }
            if (!Array.isArray(importedData.timeline)) {
                throw new Error("Invalid backup file structure: 'timeline' is not an array.");
            }
            if (confirm("Restore backup? This will overwrite your current WellSpring data and reload the application.")) {
                try {
                    // Use the same key as defined in state.js for consistency
                    localStorage.setItem(LOCAL_STORAGE_KEY, fileContent);
                    showToast('Data restored successfully! Reloading...', 'success');
                    playSound('save', 'A5', '8n');
                    setTimeout(() => {
                        location.reload();
                    }, 1500);
                } catch (storageError) {
                    console.error("[DataMgmt] Error saving imported state to localStorage:", storageError);
                    showToast('Restore failed: Could not save imported data. Storage might be full.', 'error');
                    playSound('error');
                }
            } else {
                showToast('Restore cancelled.', 'info');
            }
        } catch (error) {
            console.error("[DataMgmt] Error processing import file:", error);
            showToast(`Restore failed: ${error.message || 'Could not parse file.'}`, 'error');
            playSound('error');
        } finally {
            if (fileInput) {
                fileInput.value = '';
            }
        }
    };
    reader.onerror = function() {
        console.error("[DataMgmt] Failed to read the selected file.");
        showToast("Failed to read file.", 'error');
        playSound('error');
        if (fileInput) {
            fileInput.value = '';
        }
    };
    reader.readAsText(file);
}

export function setupImportListener() {
    const fileInput = document.getElementById("file-input");
    const triggerBtn = document.getElementById('import-data-trigger-btn');
    if (fileInput && triggerBtn) {
        fileInput.value = "";
        fileInput.addEventListener("change", handleFileImport);
        triggerBtn.addEventListener('click', () => {
            handleInteractionForAudio();
            fileInput.click();
        });
        console.log("[DataMgmt] File import listener and trigger button set up.");
    } else {
        if (!fileInput) console.warn("[DataMgmt] File input element (#file-input) not found for import listener setup.");
        if (!triggerBtn) console.warn("[DataMgmt] Import trigger button (#import-data-trigger-btn) not found for setup.");
    }
}
