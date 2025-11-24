// sw.js - WellSpring Service Worker

// Define a unique cache name, including a version number.
// Increment the version number when you update the cached files.
const CACHE_NAME = 'wellspring-cache-v3'; // Updated to v3 to fix pillar color stale cache issue

// List of essential files to cache for the application shell.
const urlsToCache = [
    '/',
    'index.html',
    'style.css',
    'app.js',
    'state.js',
    'utils.js',
    'constants.js',
    'achievements.js',
    'achievementlogic.js',
    'audio.js',
    'datamanagement.js',
    'manifest.json',
    // UI Modules
    'ui/globalUI.js',
    'ui/dailyLogUI.js',
    'ui/calendarUI.js',
    'ui/analyticsUI.js',
    'ui/timelineUI.js',
    'ui/achievementsUI.js',
    'ui/plannerUI.js',
    'ui/modalsUI.js',
    'ui/onboardingUI.js',
    'ui/collapsibleUI.js',
    'ui/datePickerUI.js',
    'ui/settingsUI.js',
    // Assets
    'assets/wellspringlogo.png',
    'assets/favicon.PNG', // Ensure this matches your actual file casing
    // External Libraries
    'https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
];

// --- Event Listener: Install ---
self.addEventListener('install', event => {
    console.log('[Service Worker] Install event triggered');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Opened cache:', CACHE_NAME);
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('[Service Worker] All essential files cached successfully.');
                return self.skipWaiting(); // Activate new SW immediately
            })
            .catch(error => {
                console.error('[Service Worker] Caching failed during install:', error);
            })
    );
});

// --- Event Listener: Activate ---
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activate event triggered');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(cacheName => {
                    return cacheName !== CACHE_NAME; // Delete old caches
                }).map(cacheName => {
                    console.log('[Service Worker] Deleting old cache:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        }).then(() => {
            console.log('[Service Worker] Old caches cleaned up.');
            return self.clients.claim(); // Take control of open clients
        })
    );
});

// --- Event Listener: Fetch (Cache-First Strategy) ---
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response; // Serve from cache
                }
                return fetch(event.request) // Fetch from network if not in cache
                    .then(networkResponse => {
                        return networkResponse;
                    })
                    .catch(error => {
                        console.warn(`[Service Worker] Network fetch failed for ${event.request.url}:`, error);
                    });
            })
    );
});

// --- START: Notification Event Listeners ---

/**
 * Handles incoming push messages.
 * This is where server-sent push messages would be processed.
 * For client-side triggered notifications, this event might not be directly used
 * unless you specifically send a "push" to the service worker from the client.
 */
self.addEventListener('push', event => {
    console.log('[Service Worker] Push event received.');

    // Default notification options if no data is in the push event
    let title = 'WellSpring Reminder';
    let options = {
        body: 'You have a new message from WellSpring!',
        icon: 'assets/favicon.PNG', // Fixed icon path case
        badge: 'assets/favicon.PNG', // Fixed badge path case
        vibrate: [100, 50, 100], // Vibration pattern
        data: { // Custom data to pass to notificationclick handler
            url: '/', // URL to open on click
        },
        tag: 'wellspring-general-push' // Tag to group notifications or replace existing ones
    };

    // Attempt to parse data from the push event, if any
    if (event.data) {
        try {
            const pushData = event.data.json();
            console.log('[Service Worker] Push data received:', pushData);
            title = pushData.title || title;
            options.body = pushData.body || options.body;
            options.icon = pushData.icon || options.icon;
            options.badge = pushData.badge || options.badge;
            if (pushData.data && pushData.data.url) {
                options.data.url = pushData.data.url;
            }
            if (pushData.tag) {
                options.tag = pushData.tag;
            }
        } catch (e) {
            console.error('[Service Worker] Error parsing push data JSON:', e);
            // Fallback to default options if JSON parsing fails
        }
    } else {
        console.log('[Service Worker] Push event received with no data. Using default notification.');
    }

    // Ensure the service worker stays alive until the notification is shown
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

/**
 * Handles notification click events.
 * This is triggered when a user clicks on any notification shown by this service worker.
 */
self.addEventListener('notificationclick', event => {
    console.log('[Service Worker] Notification click received.', event.notification);
    event.notification.close(); // Close the notification

    // Get the URL to open from the notification's data (if provided)
    const urlToOpen = event.notification.data && event.notification.data.url ?
                      event.notification.data.url : '/'; // Default to opening the app's root

    // Focus an existing window or open a new one
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true // Important to find clients not yet controlled by this SW version
        }).then(windowClients => {
            // Check if there is already a window/tab open with the target URL
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                // If a window is already open, focus it
                if (client.url === urlToOpen && 'focus' in client) {
                    console.log('[Service Worker] Focusing existing client window.');
                    return client.focus();
                }
            }
            // If no window is open, open a new one
            if (clients.openWindow) {
                console.log('[Service Worker] Opening new window to:', urlToOpen);
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
