// ui/globalUI.js

/**
 * Contains global UI functions used across different parts of the WellSpring application,
 * such as theme management, audio button updates, toast notifications, and tab switching.
 */

// --- Imports ---
// Import state access for checking sound enabled status
import { getStateReference } from '../state.js'; // Adjust path as needed
// Import audio functions if UI needs to trigger sounds directly (e.g., theme toggle sound)
import { playSound, handleInteractionForAudio } from '../audio.js'; // Adjust path as needed
// Import utility functions if needed (e.g., escapeHtml for dynamic content)
import { escapeHtml } from '../utils.js'; // Adjust path as needed

// --- Theme Management ---

/**
 * Initializes the application theme based on saved localStorage preference
 * or the user's operating system preference. Sets the 'data-theme' attribute on the body.
 */
export function initTheme() {
    try {
        // Check if the user prefers dark mode at the OS level
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        // Get saved theme from localStorage, or default based on OS preference
        const savedTheme = localStorage.getItem('theme') || (prefersDark ? 'dark' : 'light');
        // Apply the theme to the body element
        document.body.setAttribute('data-theme', savedTheme);
        // Update the theme toggle button's appearance to match the initial theme
        updateThemeToggleButton(savedTheme);
        console.log(`[GlobalUI] Theme initialized to: ${savedTheme}`);
    } catch (e) {
        console.error("[GlobalUI] Error initializing theme:", e);
        // Fallback to light theme in case of errors
        document.body.setAttribute('data-theme', 'light');
        updateThemeToggleButton('light');
    }
}

/**
 * Updates the theme toggle button's icon and aria-label based on the current theme.
 * @param {string} theme - The current theme ('light' or 'dark').
 */
function updateThemeToggleButton(theme) {
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        // Set the button's innerHTML to the appropriate moon or sun icon
        themeBtn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
        // Update the accessible label to indicate the action
        themeBtn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    } else {
        console.warn("[GlobalUI] Theme toggle button not found.");
    }
}

/**
 * Toggles the application theme between light and dark mode.
 * Updates the 'data-theme' attribute, saves the preference to localStorage,
 * updates the toggle button, and plays a sound effect.
 * This function should be called by an event listener in app.js or eventlisteners.js.
 * @param {function} [onThemeChangeCallback] - Optional callback function to execute after theme change (e.g., re-render charts).
 */
export function toggleTheme(onThemeChangeCallback) {
    handleInteractionForAudio(); // Ensure audio context is ready
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    try {
        // Apply the new theme attribute to the body
        document.body.setAttribute('data-theme', newTheme);
        // Save the new theme preference to localStorage
        localStorage.setItem('theme', newTheme);
        // Update the toggle button's appearance
        updateThemeToggleButton(newTheme);
        console.log(`[GlobalUI] Theme toggled to: ${newTheme}`);

        // Execute the callback if provided (e.g., to re-render theme-sensitive elements)
        if (typeof onThemeChangeCallback === 'function') {
            onThemeChangeCallback(newTheme);
        }

        playSound('click', 'E5', '16n'); // Play theme toggle sound

    } catch (e) {
        console.error("[GlobalUI] Error toggling theme:", e);
        showToast("Error changing theme.", 'error');
        // Attempt to revert to light theme on error for safety
        document.body.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
        updateThemeToggleButton('light');
    }
}

// --- Audio Toggle Button UI ---

/**
 * Updates the appearance and aria attributes of the audio toggle button
 * based on the current sound enabled state.
 */
export function updateAudioToggleButton() {
    const audioBtn = document.getElementById('audio-toggle');
    if (!audioBtn) {
        // console.warn("[GlobalUI] Audio toggle button not found."); // Keep warning minimal
        return;
    }
    // Get the current sound enabled state directly
    const stateRef = getStateReference();
    const isEnabled = stateRef?.isSoundEnabled ?? true; // Default to true if state is missing

    // Set ARIA attribute indicating if sound is currently on (pressed) or off
    audioBtn.setAttribute('aria-pressed', String(isEnabled));

    // Update the icon inside the button
    const icon = audioBtn.querySelector('i'); // Assumes Font Awesome icon
    if (icon) {
        icon.className = isEnabled ? 'fas fa-volume-up' : 'fas fa-volume-mute'; // Change icon class
        // Update the accessible label
        audioBtn.setAttribute('aria-label', isEnabled ? 'Mute sound' : 'Unmute sound');
    } else {
        // Fallback if the <i> element is missing
        audioBtn.textContent = isEnabled ? '🔊' : '🔇'; // Use emojis as fallback
        console.warn("[GlobalUI] Icon element missing inside audio toggle button.");
    }
}

// --- Toast Notifications ---

/**
 * Displays a temporary notification message (toast) on the screen.
 * @param {string} message - The message to display.
 * @param {'info'|'success'|'error'} [type='info'] - The type of toast (affects styling and sound).
 * @param {number} [duration=3000] - How long the toast should be visible (in milliseconds).
 */
export function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.error("[GlobalUI] Toast container (#toast-container) not found!");
        // Optionally alert the user if toasts are critical and container is missing
        // alert(`Notification Error: ${message}`);
        return;
    }

    // Create the toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`; // Apply base and type-specific classes
    toast.textContent = escapeHtml(message); // Escape message to prevent XSS
    toast.setAttribute('role', 'alert'); // Make it accessible to screen readers
    toast.setAttribute('aria-live', 'assertive'); // Announce immediately

    // Add the toast to the container (prepends to show newest at the top)
    container.prepend(toast);

    // Animate toast in using requestAnimationFrame for smooth transition start
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.add('show'); // Add 'show' class to trigger CSS transition
            // Play sound based on toast type
            const soundType = type === 'error' ? 'error' : 'toast';
            const note = type === 'error' ? 'C3' : (type === 'success' ? 'C6' : 'A5');
            playSound(soundType, note, '16n');
        });
    });

    // Set timeout to remove the toast after the specified duration
    setTimeout(() => {
        toast.classList.remove('show'); // Trigger fade-out animation

        // Add an event listener to remove the element from the DOM *after* the transition ends
        toast.addEventListener('transitionend', () => {
            // Check if the toast element still exists in the container before removing
            if (toast.parentNode === container) {
                try {
                    container.removeChild(toast);
                } catch (e) {
                    // Ignore potential errors if element was already removed somehow
                    // console.warn("Error removing toast element:", e);
                }
            }
        }, { once: true }); // Ensure the listener fires only once

    }, duration);
}

// --- Tab Management ---

/**
 * Shows the specified tab content and updates button states.
 * Hides all other tab contents.
 * @param {string} tabId - The ID of the tab content element to show.
 */
export function showTab(tabId) {
    const tabButtons = document.querySelectorAll('.nav-tabs .tab-button');
    const tabContents = document.querySelectorAll('main .tab-content'); // Select contents within <main>

    if (!tabButtons.length || !tabContents.length) {
        console.error("[GlobalUI] Tab buttons or contents not found in showTab.");
        return;
    }

    let foundTab = false;

    // Hide all tab contents and deactivate all buttons first
    tabContents.forEach(tab => {
        tab.classList.remove('active');
        // Use 'hidden' attribute for better accessibility and simpler CSS
        tab.setAttribute('hidden', '');
    });
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
        // Ensure buttons associated with hidden tabs are also hidden if needed (e.g., Simple Mode)
        const associatedTabId = btn.dataset.tab;
        const associatedTabContent = document.getElementById(associatedTabId);
        if (associatedTabContent && associatedTabContent.style.display === 'none') {
            btn.style.display = 'none';
            btn.setAttribute('aria-hidden', 'true');
        } else if (btn.style.display === 'none') {
            // If the button was previously hidden but its content is now shown, unhide the button
             btn.style.display = '';
             btn.removeAttribute('aria-hidden');
        }
    });

    // Find and show the target tab content and activate its button
    const targetContent = document.getElementById(tabId);
    const targetButton = document.querySelector(`.nav-tabs .tab-button[data-tab="${tabId}"]`);

    if (targetContent) {
        targetContent.classList.add('active');
        targetContent.removeAttribute('hidden');
        foundTab = true;
    } else {
        console.error(`[GlobalUI] Tab content with ID "${tabId}" not found.`);
    }

    if (targetButton) {
        // Ensure the button itself isn't hidden (e.g., by Simple Mode logic)
        if (targetButton.style.display !== 'none') {
            targetButton.classList.add('active');
            targetButton.setAttribute('aria-selected', 'true');
        } else {
            console.warn(`[GlobalUI] Target tab button for "${tabId}" is hidden. Cannot activate.`);
            // If the target button is hidden, potentially default to the 'daily' tab?
            if (tabId !== 'daily') {
                showTab('daily'); // Fallback to daily tab if target is hidden
                return; // Exit early to avoid playing sound twice etc.
            }
        }
    } else {
        console.error(`[GlobalUI] Tab button for tab ID "${tabId}" not found.`);
    }

    if (foundTab) {
        // console.log(`[GlobalUI] Switched to tab: ${tabId}`); // Optional log
        // Play sound effect for tab switch (only if a valid tab was shown)
        playSound('navigate', 'A4', '16n');
    } else {
        // If the target tab wasn't found, default to the 'daily' tab
        console.warn(`[GlobalUI] Tab "${tabId}" not found, defaulting to 'daily' tab.`);
        showTab('daily');
    }
}

// --- General UI Helpers ---

/**
 * Updates the visibility of UI elements based on the current user mode (Simple/Full).
 * Hides/shows elements like the planner, analytics button, achievements tab, etc.
 * @param {string|null} userMode - The current user mode ('simple', 'full', or null).
 */
export function updateUIVisibilityForMode(userMode) {
    const isSimpleMode = userMode === 'simple';
    console.log(`[GlobalUI] Updating UI visibility for mode: ${userMode}`);

    // Define elements to toggle based on mode
    const elementsToHideInSimple = [
        document.querySelector('.habit-planner-section'), // Habit planner section
        document.getElementById('view-analytics-btn'),     // Analytics button on calendar tab
        document.getElementById('analytics-container'),    // Analytics content area
        document.querySelector('.tab-button[data-tab="achievements"]'), // Achievements tab button
        document.getElementById('achievements'),           // Achievements tab content
        document.getElementById('prestige-button')         // Prestige button
        // Add other elements here if needed
    ];

    // Helper function to toggle display and aria-hidden
    const toggleElementVisibility = (element, show) => {
        if (element) {
            const currentlyHidden = element.style.display === 'none';
            if (show && currentlyHidden) {
                element.style.display = ''; // Use default display (block, flex, etc.)
                element.removeAttribute('aria-hidden');
            } else if (!show && !currentlyHidden) {
                element.style.display = 'none';
                element.setAttribute('aria-hidden', 'true');
            }
        } else {
            // console.warn(`[GlobalUI] Element not found for visibility toggle.`); // Keep warnings minimal
        }
    };

    // Toggle visibility for each element
    elementsToHideInSimple.forEach(element => {
        toggleElementVisibility(element, !isSimpleMode); // Show if NOT simple mode
    });

    // If switching TO simple mode, ensure the active tab isn't one that's now hidden
    if (isSimpleMode) {
        const activeTabButton = document.querySelector('.tab-button.active');
        const activeTabId = activeTabButton?.dataset.tab;

        // Check if the currently active tab is one that should be hidden in simple mode
        if (activeTabId === 'achievements' /* || activeTabId === 'planner' // Add if planner becomes a tab */) {
            console.log(`[GlobalUI] Active tab "${activeTabId}" hidden in Simple Mode. Switching to 'daily'.`);
            showTab('daily'); // Switch to the daily log tab as a default
        }
    } else {
        // If switching TO full mode, ensure previously hidden buttons are shown again
        // This is handled within the showTab function now.
    }
}