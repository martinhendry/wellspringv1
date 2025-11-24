# **WellSpring 🌱**

**Cultivating Daily Wellbeing**

WellSpring is a free, private, browser-based daily habit tracker designed to help users build awareness and consistency in their wellbeing journey. It focuses on 10 core wellness pillars, allowing users to track habits, log moods, monitor progress, and unlock achievements in a gamified environment.

## **🌟 Key Features**

* **10 Wellness Pillars:** Track daily engagement with core habits: Stillness, Tidy, Connect, Progress, Nourish, Move, Create, Unplug, Reflect, and Enjoy.  
* **Daily Log:** Simple interface to check off completed pillars and log daily mood on a 5-point scale.  
* **Gamification:** Earn XP (Experience Points), level up (1-100), and maintain streaks. Reach Level 100 to "Prestige" and start a new cycle with increased difficulty.  
* **Achievements:** Unlock over 50 unique achievements based on streaks, total logs, and specific pillar milestones.  
* **Journey Timeline:** A chronological record of your progress, including unlocked achievements, prestige events, and personal reflection notes.  
* **Habit Planner (Beta):** Create "Implementation Intentions" (If/Then plans) and "Habit Stacking" routines to scaffold your success.  
* **Privacy First:** All data is stored locally in your browser (localStorage). No account required, no external database, no tracking of personal note content.  
* **Offline Capable:** Functions as a Progressive Web App (PWA). Can be installed to the home screen on iOS and Android for a native app-like experience.  
* **Data Management:** Export your entire history to a JSON file for backup or transfer to another device.

## **🛠️ Technical Stack**

* **HTML5 / CSS3:** Modern, responsive layout using CSS Grid and Flexbox. Themeable (Light/Dark mode).  
* **JavaScript (ES6+):** Modular architecture using ES modules (import/export).  
* **Local Storage:** Primary data persistence layer.  
* **Tone.js:** Library for synthesizing pleasant UI sound effects (chimes, clicks, success sounds).  
* **Service Worker:** Enables offline functionality and caching (PWA standard).  
* **Google Analytics 4 (GA4):** Minimal, privacy-centric analytics for usage trends (page views, feature clicks).

## **🚀 Getting Started**

1. Open the application in any modern web browser.  
2. Complete the brief onboarding tour to set your name and choose your mode (Simple vs. Full).  
3. Start logging your day\! Select the pillars you engaged with and save your entry.  
4. **Pro Tip:** Add the app to your mobile home screen for the best experience.

## **📂 Project Structure**

* index.html: Main entry point and layout.  
* app.js: Application bootstrap and event listener setup.  
* state.js: Core state management, data persistence, and logic for XP/Leveling.  
* utils.js: Helper functions for dates, calculations, and formatting.  
* constants.js: Configuration for Pillars and Level names.  
* achievements.js & achievementlogic.js: Definitions and evaluation logic for the gamification system.  
* audio.js: Sound synthesis and playback management.  
* sw.js: Service Worker for caching and offline support.  
* ui/: Directory containing specific UI logic modules (Daily Log, Calendar, Analytics, etc.).  
* assets/: Icons and images.

## **🛡️ Privacy & Security**

WellSpring is designed with a "local-first" philosophy.

* **No Login:** You are identified by your browser session.  
* **No Cloud Sync:** Data does not leave your device unless you manually export it.  
* **Reset Data:** A "danger zone" setting allows you to completely wipe all local data and start fresh.

## **🤝 Contributing & Support**

WellSpring is a passion project by Dr. Martin Douglas Hendry.

* **Support:** If you find the app useful, consider supporting its development via the Ko-fi link in the "Help & Info" section.  
* **Feedback:** Feedback is welcome to improve future versions.

*Version 2.1 \- November 2025*