// audio.js

/**
 * Manages audio playback using Tone.js for the WellSpring application.
 * Handles audio context initialization, synth creation, and playing sound effects.
 */

// --- Imports ---
// Import state access function to check if sound is enabled
import { getStateReference } from './state.js'; // Assuming state.js is in the same directory or configured path

// --- Module-level Variables ---

// Stores the created Tone.js synth instances (e.g., synths.click, synths.save)
let synths = {};
// Flag indicating if the Tone.js AudioContext has been successfully started and synths are ready
let isAudioReady = false;
// Flag for basic sound cooldown to prevent rapid, overlapping sounds
let isSoundPlaying = false;
// Cooldown duration in milliseconds
const soundCooldownMs = 75;

// --- Private Functions ---

/**
 * Creates or re-creates Tone.js synth objects.
 * Disposes existing synths before creating new ones.
 * Called internally after the audio context is confirmed to be running.
 */
function setupAudio() {
    // Check if Tone.js library is loaded globally
    if (typeof Tone === 'undefined') {
        console.error("[Audio] Tone.js library not found. Audio will not play.");
        isAudioReady = false; // Ensure audio is marked as not ready
        return;
    }
    try {
        console.log("[Audio] Setting up Tone.js synths...");
        // Dispose existing synths cleanly before creating new ones
        Object.values(synths).forEach(synth => {
            // Check if synth exists and has a dispose method
            if (synth && typeof synth.dispose === 'function') {
                synth.dispose();
            }
        });
        synths = {}; // Reset the synths object

        // --- Define and Create Synths ---
        // Simple click sound
        synths.click = new Tone.Synth({
            oscillator: { type: 'sine' }, // Soft sound
            volume: -12, // Lower volume
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.05, release: 0.1 }
        }).toDestination();

        // Save/Confirm sound
        synths.save = new Tone.Synth({
            oscillator: { type: 'triangle' }, // Slightly richer sound
            volume: -10,
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2 }
        }).toDestination();

        // Achievement unlock sound (more distinct)
        synths.achievement = new Tone.Synth({
            oscillator: { type: 'triangle' }, // Brighter than sine
            volume: -8,
            envelope: { attack: 0.02, decay: 0.3, sustain: 0.2, release: 0.4 } // Longer release
        }).toDestination();

        // Error sound (low and short)
        synths.error = new Tone.Synth({
            oscillator: { type: 'square', frequency: 'A2' }, // Low square wave
            volume: -10,
            envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.1 }
        }).toDestination();

        // Note added sound (percussive)
        // Use MembraneSynth if available, otherwise fallback to a simple pluck
        if (Tone.MembraneSynth) {
            synths.note = new Tone.MembraneSynth({
                pitchDecay: 0.02, // Slightly longer decay
                octaves: 3, // More harmonic content
                volume: -10
            }).toDestination();
        } else {
            console.warn("[Audio] Tone.MembraneSynth not available, using basic synth for 'note'.");
            // Fallback: simple pluck sound
            synths.note = new Tone.Synth({
                oscillator: { type: 'triangle' },
                volume: -10,
                envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
            }).toDestination();
        }

        // Toast notification sound (high, short ping)
        synths.toast = new Tone.Synth({
            oscillator: { type: 'sine', frequency: 'C6' }, // High pitch
            volume: -14, // Quieter
            envelope: { attack: 0.001, decay: 0.1, sustain: 0.01, release: 0.1 }
        }).toDestination();

        // Navigation/Toggle sound (neutral click)
        synths.navigate = new Tone.Synth({
            oscillator: { type: 'sine' },
            volume: -14,
            envelope: { attack: 0.002, decay: 0.08, sustain: 0.02, release: 0.1 }
        }).toDestination();

        // Unlock sound (slightly lower than save)
        synths.unlock = new Tone.Synth({
            oscillator: { type: 'triangle' },
            volume: -12,
            envelope: { attack: 0.01, decay: 0.15, sustain: 0.05, release: 0.2 }
        }).toDestination();

        // Delete sound (low, short click)
        synths.delete = new Tone.Synth({
            oscillator: { type: 'square', frequency: 'G2' },
            volume: -15,
            envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 }
        }).toDestination();


        console.log("[Audio] Tone.js synths created successfully.");
        isAudioReady = true; // Mark audio system as ready

    } catch (error) {
        console.error("[Audio] Error setting up Tone.js synths:", error);
        isAudioReady = false; // Mark as not ready on error
    }
}

/**
 * Attempts to start the Tone.js audio context if it's not already running.
 * This is necessary due to browser autoplay policies requiring user interaction.
 * Called internally by `handleInteractionForAudio`.
 */
async function startAudioContext() {
    // Check if Tone library exists and context needs starting
    if (typeof Tone !== 'undefined' && Tone.context && Tone.context.state !== 'running') {
        try {
            console.log("[Audio] Attempting to start AudioContext...");
            await Tone.start(); // Start the audio context
            console.log('[Audio] AudioContext started successfully!');
            setupAudio(); // Setup synths now that context is running
        } catch (error) {
            console.error("[Audio] Failed to start AudioContext:", error);
            isAudioReady = false; // Ensure flag is false if starting fails
        }
    } else if (typeof Tone !== 'undefined' && Tone.context && Tone.context.state === 'running' && !isAudioReady) {
        // Context is running, but synths might not be initialized (e.g., after page reload)
        console.log("[Audio] AudioContext already running, ensuring synths are set up...");
        setupAudio();
    } else if (typeof Tone === 'undefined') {
         console.error("[Audio] Cannot start AudioContext: Tone.js not loaded.");
         isAudioReady = false;
    }
}

// --- Exported Functions ---

/**
 * Plays a predefined sound effect based on its type.
 * Checks if sound is enabled in the application state and respects a basic cooldown.
 * @param {string} type - The type of sound (maps to a synth key: 'click', 'save', 'achievement', 'error', 'note', 'toast', 'navigate', 'unlock', 'delete').
 * @param {string} [note='C4'] - The musical note to play (e.g., 'C4', 'A5').
 * @param {string|number} [duration='8n'] - The duration of the note (e.g., '8n', 0.2).
 */
export async function playSound(type, note = 'C4', duration = '8n') {
    // 1. Check if sound is globally enabled in the app state
    const stateRef = getStateReference(); // Get direct state reference
    if (!stateRef?.isSoundEnabled) {
        // console.log("[Audio] Sound muted globally, skipping playSound."); // Optional log
        return; // Exit if sound is disabled in settings
    }

    // 2. Ensure audio context is started (important for the first sound)
    if (!isAudioReady) {
        // This might be the first interaction trying to play sound
        await handleInteractionForAudio(); // Attempt to start context and setup synths
        // Re-check readiness after attempting to start
        if (!isAudioReady) {
            console.warn(`[Audio] Audio context not ready after interaction, cannot play sound type: ${type}`);
            return;
        }
    }

    // 3. Check sound cooldown
    if (isSoundPlaying) {
        // console.log("[Audio] Sound cooldown active, skipping playSound."); // Optional log
        return; // Exit if another sound is currently playing or in cooldown
    }

    // 4. Check if the specific synth type exists
    if (typeof Tone === 'undefined' || !synths[type]) {
        console.warn(`[Audio] Sound type "${type}" not found or synth not initialized.`);
        return; // Exit if synth type is invalid or Tone.js isn't loaded
    }

    // 5. Attempt to play the sound
    try {
        // Check if the synth and its method exist before calling
        if (synths[type] && typeof synths[type].triggerAttackRelease === 'function') {
            isSoundPlaying = true; // Activate cooldown flag

            // Schedule sound slightly in the future for better timing consistency
            const timeToPlay = Tone.now ? Tone.now() + 0.01 : undefined;
            synths[type].triggerAttackRelease(note, duration, timeToPlay);

            // Reset cooldown flag after the specified duration
            setTimeout(() => {
                isSoundPlaying = false;
            }, soundCooldownMs);

        } else {
            console.warn(`[Audio] Synth or triggerAttackRelease method missing for type: ${type}`);
        }
    } catch (error) {
        console.error(`[Audio] Error playing sound type ${type}:`, error);
        isSoundPlaying = false; // Ensure flag is reset on error
    }
}

/**
 * Ensures the audio context is started.
 * This function should be called from event handlers for the *first* user interaction
 * (e.g., button clicks, keydown events) to comply with browser autoplay policies.
 * Subsequent calls are harmless if the context is already running.
 */
export function handleInteractionForAudio() {
    // Only attempt to start if not already ready
    if (!isAudioReady) {
        startAudioContext(); // Attempt to start context and setup synths
    }
}

/**
 * Initializes the audio system by setting up the initial interaction listener.
 * This allows the audio context to be started upon the first user interaction.
 * Should be called once during application startup (e.g., in app.js init).
 */
export function initializeAudio() {
    // Add listeners to the body to capture the first interaction
    // Use { once: true } so the listener removes itself after firing
    // Use { capture: true } to catch the event early in the propagation phase
    document.body.addEventListener('click', handleInteractionForAudio, { once: true, capture: true });
    document.body.addEventListener('keydown', handleInteractionForAudio, { once: true, capture: true });
    document.body.addEventListener('touchstart', handleInteractionForAudio, { once: true, capture: true }); // Added touchstart
    console.log("[Audio] Audio interaction listeners initialized. Waiting for first user interaction...");
    // Note: Actual synth setup happens *after* the first interaction in startAudioContext()
}