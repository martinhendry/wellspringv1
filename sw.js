// sw.js - WellSpring Service Worker

// Define a unique cache name, including a version number.
// Increment the version number when you update the cached files.
const CACHE_NAME = 'wellspring-cache-v1';

// List of essential files to cache for the application shell.
// Add all critical HTML, CSS, JavaScript, and essential assets (like the logo).
const urlsToCache = [
    '/', // Cache the root URL (often serves index.html)
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
    'assets/favicon.png',
    // External Libraries (if used offline - ensure correct versions)
    'https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    // Add Font Awesome webfonts if needed offline (check network tab for exact URLs)
    // e.g., 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-solid-900.woff2',
];

// --- Event Listener: Install ---
// Fired when the service worker is first installed or updated.
self.addEventListener('install', event => {
    console.log('[Service Worker] Install event triggered');
    // Perform install steps: Caching the application shell.
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Opened cache:', CACHE_NAME);
                // Add all specified URLs to the cache.
                // If any request fails, the installation fails.
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('[Service Worker] All essential files cached successfully.');
                // Force the waiting service worker to become the active service worker.
                // This ensures updates are applied immediately on next load.
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[Service Worker] Caching failed during install:', error);
                // Optional: You might want to prevent activation if caching fails critically.
            })
    );
});

// --- Event Listener: Activate ---
// Fired when the service worker becomes active.
// This is a good place to clean up old caches.
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activate event triggered');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            // Filter out caches that are not the current cache name.
            return Promise.all(
                cacheNames.filter(cacheName => {
                    return cacheName !== CACHE_NAME;
                }).map(cacheName => {
                    // Delete the old caches.
                    console.log('[Service Worker] Deleting old cache:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        }).then(() => {
            console.log('[Service Worker] Old caches cleaned up.');
            // Claim clients immediately so the active service worker controls the page
            // without needing a reload.
            return self.clients.claim();
        })
    );
});

// --- Event Listener: Fetch ---
// Fired for every network request made by the page.
// Implements a Cache-First strategy for cached assets.
self.addEventListener('fetch', event => {
    // console.log('[Service Worker] Fetch event for:', event.request.url); // Log all fetches (can be verbose)

    // Use respondWith to hijack the request and provide a custom response.
    event.respondWith(
        // Try to find the response in the cache first.
        caches.match(event.request)
            .then(response => {
                // If a response is found in the cache, return it.
                if (response) {
                    // console.log('[Service Worker] Serving from cache:', event.request.url);
                    return response;
                }

                // If the request is not in the cache, fetch it from the network.
                // console.log('[Service Worker] Fetching from network:', event.request.url);
                return fetch(event.request)
                    .then(networkResponse => {
                        // Optional: Cache dynamically fetched resources if needed.
                        // Be careful not to cache everything, especially API responses
                        // unless you have a specific strategy for them.
                        // Example: Caching images on the fly
                        // if (networkResponse.ok && networkResponse.type === 'basic' && event.request.url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
                        //     const responseToCache = networkResponse.clone();
                        //     caches.open(CACHE_NAME).then(cache => {
                        //         cache.put(event.request, responseToCache);
                        //     });
                        // }
                        return networkResponse;
                    })
                    .catch(error => {
                        // Handle network errors (e.g., offline)
                        console.warn(`[Service Worker] Network fetch failed for ${event.request.url}:`, error);
                        // Optional: Return a custom offline fallback page or resource here.
                        // For example, for navigation requests:
                        // if (event.request.mode === 'navigate') {
                        //     return caches.match('/offline.html');
                        // }
                        // For other requests, just let the error propagate.
                        // return new Response("Network error occurred", { status: 408, headers: { 'Content-Type': 'text/plain' } });
                    });
            })
    );
});