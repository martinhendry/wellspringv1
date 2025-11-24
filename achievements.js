// achievements.js

/**
 * Defines all achievements available in the WellSpring application.
 * Flavor text now uses newline characters (\n) to separate quote, tip, and encouragement.
 * *** MODIFIED: Swapped several icons with alternatives for troubleshooting. ***
 */
export const ALL_ACHIEVEMENTS = {

    // ========================================
    // Streaks (Overall Daily Logging)
    // ========================================
    'streak_3': {
        id: 'streak_3', name: "Getting Started", description: "Log habits for 3 consecutive days.",
        flavor: "'The secret of getting ahead is getting started.' - Mark Twain.\nTip: Focus on showing up, not perfection.\nThree days straight, [Name]! You’ve ignited the spark.",
        icon: 'fa-solid fa-shoe-prints', criteria: { type: 'streak', value: 3 }, unlocked: false, date: null
    },
    'streak_7': {
        id: 'streak_7', name: "Momentum Builder", description: "Logged habits 7 days in a row!",
        flavor: "'Success is the sum of small efforts, repeated day in and day out.' - Robert Collier.\nTip: Link a new small habit to one you already do.\nA full week, [Name]! You’re building momentum.",
        icon: 'fa-solid fa-fire', criteria: { type: 'streak', value: 7 }, unlocked: false, date: null
    },
    'streak_14': {
        id: 'streak_14', name: "Two Week Habit", description: "Log habits for 14 consecutive days.",
        flavor: "'We are what we repeatedly do. Excellence, then, is not an act, but a habit.' - Aristotle.\nTip: If you miss a day, aim to get right back on track the next.\nTwo solid weeks, [Name]! This consistency is forging new pathways.",
        icon: 'fa-solid fa-calendar-week', criteria: { type: 'streak', value: 14 }, unlocked: false, date: null
    },
    'streak_30': {
        id: 'streak_30', name: "Monthly Milestone", description: "Log habits for 30 consecutive days.",
        flavor: "'Motivation is what gets you started. Habit is what keeps you going.' - Jim Ryun.\nTip: Review your progress this month – what’s working well?\nAn entire month, [Name]! Your dedication is paying off.",
        icon: 'fa-solid fa-calendar-check', criteria: { type: 'streak', value: 30 }, unlocked: false, date: null
    },
    'streak_60': {
        id: 'streak_60', name: "Two Month Tenure", description: "Log habits for 60 consecutive days.",
        flavor: "'The chains of habit are too weak to be felt until they are too strong to be broken.' - Samuel Johnson.\nTip: Consider slightly increasing the challenge in one area.\nSixty days straight, [Name]! These positive habits are truly becoming part of you.",
        icon: 'fa-solid fa-hourglass-half', criteria: { type: 'streak', value: 60 }, unlocked: false, date: null
    },
    'streak_100': {
        id: 'streak_100', name: "Century Streak", description: "Log habits for 100 consecutive days.",
        flavor: "'Perseverance is not a long race; it is many short races one after the other.' - Walter Elliot.\nTip: Celebrate this huge milestone!\nWow, [Name]! 100 days is monumental. Your dedication is remarkable.",
        icon: 'fa-solid fa-medal', criteria: { type: 'streak', value: 100 }, unlocked: false, date: null
    },
    'streak_180': {
        id: 'streak_180', name: "Half Year Hero", description: "Log habits for 180 consecutive days.",
        flavor: "'It does not matter how slowly you go as long as you do not stop.' - Confucius.\nTip: Reflect on the biggest changes you’ve noticed in yourself.\nSix months of unwavering commitment, [Name]! You’ve built an incredible foundation.",
        // *** Alternative Icon ***
        icon: 'fa-solid fa-circle-half-stroke', criteria: { type: 'streak', value: 180 }, unlocked: false, date: null
    },
    'streak_365': {
        id: 'streak_365', name: "Full Year Fanatic", description: "Log habits for 365 consecutive days.",
        flavor: "'Continuous effort – not strength or intelligence – is the key to unlocking our potential.' - Winston Churchill.\nTip: Share your journey (if comfortable) – you might inspire others!\nIncredible, [Name]! An entire year of daily dedication. This is true mastery.",
        icon: 'fa-solid fa-crown', criteria: { type: 'streak', value: 365 }, unlocked: false, date: null
    },

    // ========================================
    // Total XP Earned (Values updated x10)
    // ========================================
    'xp_100': {
        id: 'xp_100', name: "XP Explorer", description: "Earn 1,000 total XP.",
        flavor: "'The journey of a thousand miles begins with a single step.' - Lao Tzu.\nTip: Notice which pillars give you the most energy.\nYour journey has begun, [Name]! The first 1000 XP is a great start.",
        icon: 'fa-solid fa-seedling', criteria: { type: 'totalXP', value: 1000 }, unlocked: false, date: null
    },
    'xp_500': {
        id: 'xp_500', name: "XP Adept", description: "Earn 5,000 total XP.",
        flavor: "'Experience is the teacher of all things.' - Julius Caesar.\nTip: Are there any pillars you tend to neglect? Try focusing there.\n5000 XP! You’re gaining valuable experience and insight, [Name]. Keep growing.",
        icon: 'fa-solid fa-book-open', criteria: { type: 'totalXP', value: 5000 }, unlocked: false, date: null
    },
    'xp_1000': {
        id: 'xp_1000', name: "XP Veteran", description: "Earn 10,000 total XP.",
        flavor: "'Knowing yourself is the beginning of all wisdom.' - Aristotle.\nTip: Consider setting a new, small goal based on your insights.\nTen thousand points of progress! You’re becoming a veteran of wellbeing, [Name].",
        icon: 'fa-solid fa-graduation-cap', criteria: { type: 'totalXP', value: 10000 }, unlocked: false, date: null
    },
    'xp_5000': {
        id: 'xp_5000', name: "XP Master", description: "Earn 50,000 total XP.",
        flavor: "'Mastery demands all of a person.' - Albert Camus.\nTip: How can you integrate these pillars even more deeply?\nIncredible, [Name]! 50,000 XP signifies true mastery and commitment.",
        icon: 'fa-solid fa-scroll', criteria: { type: 'totalXP', value: 50000 }, unlocked: false, date: null
    },
    'xp_10000': {
        id: 'xp_10000', name: "XP Grandmaster", description: "Earn 100,000 total XP.",
        flavor: "'An investment in knowledge pays the best interest.' - Benjamin Franklin.\nTip: Mentor someone else or share what you’ve learned.\nLegendary status, [Name]! 100,000 XP is a testament to sustained growth. Inspiring!",
        icon: 'fa-solid fa-gem', criteria: { type: 'totalXP', value: 100000 }, unlocked: false, date: null
    },

    // ========================================
    // Total Days Logged (Overall Engagement)
    // ========================================
    'total_days_1': {
        id: 'total_days_1', name: "First Step", description: "Log your first day.",
        flavor: "'Do the best you can until you know better. Then when you know better, do better.' - Maya Angelou.\nTip: Remember why you started this.\nWell done on taking your first step, [Name]!",
        // *** Alternative Icon ***
        icon: 'fa-solid fa-location-dot', criteria: { type: 'daysLogged', value: 1 }, unlocked: false, date: null
    },
    'total_days_7': {
        id: 'total_days_7', name: "Week One Complete", description: "Log habits on 7 different days.",
        flavor: "'It’s not what we do once in a while that shapes our lives. It’s what we do consistently.' - Tony Robbins.\nTip: Try planning your pillar activities slightly ahead.\nYou've tracked for a whole week, [Name]! Consistency is building.",
        icon: 'fa-solid fa-calendar-day', criteria: { type: 'daysLogged', value: 7 }, unlocked: false, date: null
    },
    'total_days_30': {
        id: 'total_days_30', name: "Dedicated Month", description: "Log habits on 30 different days.",
        flavor: "'Success is the natural consequence of consistently applying the basic fundamentals.' - Jim Rohn.\nTip: Notice the changes in your mood or energy.\nA full month of prioritizing yourself, [Name]! Great practice.",
        // *** Alternative Icon ***
        icon: 'fa-solid fa-calendar', criteria: { type: 'daysLogged', value: 30 }, unlocked: false, date: null
    },
    'total_days_100': {
        id: 'total_days_100', name: "Century Club", description: "Log habits on 100 different days.",
        flavor: "'The key is not the will to win… It is the will to prepare to win that is important.' - Bobby Knight.\nTip: Keep showing up, even when it feels tough.\nWelcome to the Century Club, [Name]! 100 days invested is fantastic.",
        icon: 'fa-solid fa-award', criteria: { type: 'daysLogged', value: 100 }, unlocked: false, date: null
    },
    'total_days_200': {
        id: 'total_days_200', name: "Double Century", description: "Log habits on 200 different days.",
        flavor: "'Perseverance, secret of all triumphs.' - Victor Hugo.\nTip: Look back at your timeline – what patterns emerge?\n200 days logged! Your perseverance is commendable, [Name].",
        icon: 'fa-solid fa-certificate', criteria: { type: 'daysLogged', value: 200 }, unlocked: false, date: null
    },
    'total_days_365': {
        id: 'total_days_365', name: "Year of Growth", description: "Log habits on 365 different days.",
        flavor: "'Growth is never by mere chance; it is the result of forces working together.' - James Cash Penney.\nTip: Set an intention for your next year of growth.\nAn entire year of tracking, [Name]! Happy WellSpring Anniversary!",
        icon: 'fa-solid fa-cake-candles', // Corrected from fa-birthday-cake
        criteria: { type: 'daysLogged', value: 365 }, unlocked: false, date: null
    },
    'total_days_500': {
        id: 'total_days_500', name: "500 Day Milestone", description: "Log habits on 500 different days.",
        flavor: "'The greatest discovery of all time is that a person can change his future by merely changing his attitude.' - Oprah Winfrey.\nTip: What’s one pillar you could explore more deeply?\nHalf a thousand days, [Name]! Your commitment is inspiring.",
        icon: 'fa-solid fa-monument', criteria: { type: 'daysLogged', value: 500 }, unlocked: false, date: null
    },

    // ========================================
    // Pillar Specific - Total Logs (All Pillars, 4 Tiers Each)
    // ========================================
    // --- Stillness ---
    'pillar_total_stillness_10': {
        id: 'pillar_total_stillness_10', name: "Mindful Moment x10", description: "Log 'Stillness' 10 times.",
        flavor: "'Within you, there is a stillness and a sanctuary...' - Hermann Hesse.\nTip: Even 1 minute counts!\nTen moments of peace cultivated, [Name].",
        icon: 'fa-solid fa-om', criteria: { type: 'specificPillarCount', pillarId: 'stillness', value: 10 }, unlocked: false, date: null
    },
    'pillar_total_stillness_25': {
        id: 'pillar_total_stillness_25', name: "Mindful Moment x25", description: "Log 'Stillness' 25 times.",
        flavor: "'Quiet the mind, and the soul will speak.' - Ma Jaya Sati Bhagavati.\nTip: Try focusing on your breath during these moments.\nTwenty-five times you’ve chosen stillness, [Name]. Inner peace deepens.",
        icon: 'fa-solid fa-dove', criteria: { type: 'specificPillarCount', pillarId: 'stillness', value: 25 }, unlocked: false, date: null
    },
    'pillar_total_stillness_50': {
        id: 'pillar_total_stillness_50', name: "Mindful Moment x50", description: "Log 'Stillness' 50 times.",
        flavor: "'The quieter you become, the more you are able to hear.' - Rumi.\nTip: Experiment with different types of meditation or quiet reflection.\nFifty moments of mindful presence! Calm is becoming second nature, [Name].",
        icon: 'fa-solid fa-spa', criteria: { type: 'specificPillarCount', pillarId: 'stillness', value: 50 }, unlocked: false, date: null
    },
    'pillar_total_stillness_100': {
        id: 'pillar_total_stillness_100', name: "Mindful Moment x100", description: "Log 'Stillness' 100 times.",
        flavor: "'Stillness is the altar of spirit.' - Paramahansa Yogananda.\nTip: Notice how stillness impacts your other pillars.\nA century of stillness! A significant commitment to inner calm, [Name].",
        icon: 'fa-solid fa-peace', criteria: { type: 'specificPillarCount', pillarId: 'stillness', value: 100 }, unlocked: false, date: null
    },
    // --- Tidy ---
    'pillar_total_tidy_10': {
        id: 'pillar_total_tidy_10', name: "Orderly Habit x10", description: "Log 'Tidy' 10 times.",
        flavor: "'Outer order contributes to inner calm.' - Gretchen Rubin.\nTip: Start small – tidy one drawer or your desktop.\nTen steps towards a clearer space and mind, [Name].",
        icon: 'fa-solid fa-broom', criteria: { type: 'specificPillarCount', pillarId: 'tidy', value: 10 }, unlocked: false, date: null
    },
    'pillar_total_tidy_25': {
        id: 'pillar_total_tidy_25', name: "Orderly Habit x25", description: "Log 'Tidy' 25 times.",
        flavor: "'Clutter is nothing more than postponed decisions.' - Barbara Hemphill.\nTip: Try the 'one-minute rule' – if it takes less than a minute, do it now.\nTwenty-five times you've brought order, [Name]. Enjoy the peace!",
        icon: 'fa-solid fa-box-archive', criteria: { type: 'specificPillarCount', pillarId: 'tidy', value: 25 }, unlocked: false, date: null
    },
    'pillar_total_tidy_50': {
        id: 'pillar_total_tidy_50', name: "Orderly Habit x50", description: "Log 'Tidy' 50 times.",
        flavor: "'Have nothing in your house that you do not know to be useful, or believe to be beautiful.' - William Morris.\nTip: Schedule a recurring time for tidying.\nFifty acts of tidiness! Your environment reflects your inner calm, [Name].",
        icon: 'fa-solid fa-house-chimney-window', criteria: { type: 'specificPillarCount', pillarId: 'tidy', value: 50 }, unlocked: false, date: null
    },
    'pillar_total_tidy_100': {
        id: 'pillar_total_tidy_100', name: "Orderly Habit x100", description: "Log 'Tidy' 100 times.",
        flavor: "'The objective of cleaning is... to feel happiness living within that environment.' - Marie Kondō.\nTip: Help someone else organize!\nA hundred times you've chosen order! Master of maintaining a clear space, [Name].",
        // *** Alternative Icon ***
        icon: 'fa-solid fa-wand-magic-sparkles', criteria: { type: 'specificPillarCount', pillarId: 'tidy', value: 100 }, unlocked: false, date: null
    },
    // --- Connect ---
    'pillar_total_connect_10': {
        id: 'pillar_total_connect_10', name: "Friendly Face x10", description: "Log 'Connect' 10 times.",
        flavor: "'The only way to have a friend is to be one.' - Ralph Waldo Emerson.\nTip: Send a quick 'thinking of you' message.\nTen times you've reached out, [Name]. Nurturing connections strengthens you.",
        icon: 'fa-solid fa-users', criteria: { type: 'specificPillarCount', pillarId: 'connect', value: 10 }, unlocked: false, date: null
    },
    'pillar_total_connect_25': {
        id: 'pillar_total_connect_25', name: "Friendly Face x25", description: "Log 'Connect' 25 times.",
        flavor: "'Shared joy is a double joy; shared sorrow is half a sorrow.' - Swedish Proverb.\nTip: Schedule a regular call or meetup.\nTwenty-five meaningful connections logged, [Name]. You're weaving a strong social web!",
        icon: 'fa-solid fa-user-group', criteria: { type: 'specificPillarCount', pillarId: 'connect', value: 25 }, unlocked: false, date: null
    },
    'pillar_total_connect_50': {
        id: 'pillar_total_connect_50', name: "Friendly Face x50", description: "Log 'Connect' 50 times.",
        flavor: "'Connection is why we're here...' - Brené Brown.\nTip: Practice active listening in your next conversation.\nFifty connections nurtured! Your investment in relationships is valuable, [Name].",
        icon: 'fa-solid fa-comments', criteria: { type: 'specificPillarCount', pillarId: 'connect', value: 50 }, unlocked: false, date: null
    },
    'pillar_total_connect_100': {
        id: 'pillar_total_connect_100', name: "Friendly Face x100", description: "Log 'Connect' 100 times.",
        flavor: "'Alone, we can do so little; together, we can do so much.' - Helen Keller.\nTip: Organize a small gathering or activity.\nA hundred acts of connection! A true pillar of your community, [Name].",
        icon: 'fa-solid fa-handshake-angle', criteria: { type: 'specificPillarCount', pillarId: 'connect', value: 100 }, unlocked: false, date: null
    },
    // --- Progress ---
    'pillar_total_progress_10': {
        id: 'pillar_total_progress_10', name: "Goal Getter x10", description: "Log 'Progress' 10 times.",
        flavor: "'The secret to getting ahead is getting started.' - Mark Twain.\nTip: Break down a larger goal into smaller, manageable steps.\nTen steps taken towards your goals, [Name]! Consistent effort is key.",
        icon: 'fa-solid fa-bullseye', criteria: { type: 'specificPillarCount', pillarId: 'progress', value: 10 }, unlocked: false, date: null
    },
    'pillar_total_progress_25': {
        id: 'pillar_total_progress_25', name: "Goal Getter x25", description: "Log 'Progress' 25 times.",
        flavor: "'Progress is impossible without change...' - George Bernard Shaw.\nTip: Reward yourself for reaching mini-milestones.\nTwenty-five times you've pushed forward, [Name]. Making tangible strides!",
        icon: 'fa-solid fa-road', criteria: { type: 'specificPillarCount', pillarId: 'progress', value: 25 }, unlocked: false, date: null
    },
    'pillar_total_progress_50': {
        id: 'pillar_total_progress_50', name: "Goal Getter x50", description: "Log 'Progress' 50 times.",
        flavor: "'Setting goals is the first step in turning the invisible into the visible.' - Tony Robbins.\nTip: Review your goal – is it still relevant? Adjust if needed.\nFifty times focused on progress! Your dedication shines, [Name].",
        icon: 'fa-solid fa-flag', criteria: { type: 'specificPillarCount', pillarId: 'progress', value: 50 }, unlocked: false, date: null
    },
    'pillar_total_progress_100': {
        id: 'pillar_total_progress_100', name: "Goal Getter x100", description: "Log 'Progress' 100 times.",
        flavor: "'Our goals can only be reached through a vehicle of a plan...' - Pablo Picasso.\nTip: What will you achieve next? Set a new inspiring goal!\nA hundred steps forward! Master of consistent progress, [Name].",
        icon: 'fa-solid fa-rocket', criteria: { type: 'specificPillarCount', pillarId: 'progress', value: 100 }, unlocked: false, date: null
    },
    // --- Nourish ---
    'pillar_total_nourish_10': {
        id: 'pillar_total_nourish_10', name: "Curious Mind x10", description: "Log 'Nourish' 10 times.",
        flavor: "'The mind is not a vessel to be filled, but a fire to be kindled.' - Plutarch.\nTip: Read an article or watch a short documentary on a new topic.\nTen times you've fed your intellect, [Name]. Keep exploring!",
        icon: 'fa-solid fa-lightbulb', criteria: { type: 'specificPillarCount', pillarId: 'nourish', value: 10 }, unlocked: false, date: null
    },
    'pillar_total_nourish_25': {
        id: 'pillar_total_nourish_25', name: "Curious Mind x25", description: "Log 'Nourish' 25 times.",
        flavor: "'Live as if you were to die tomorrow. Learn as if you were to live forever.' - Mahatma Gandhi.\nTip: Try learning a new word or fact each day.\nTwenty-five nourishing moments logged, [Name]. Leading to wonderful discoveries.",
        icon: 'fa-solid fa-book-reader', criteria: { type: 'specificPillarCount', pillarId: 'nourish', value: 25 }, unlocked: false, date: null
    },
    'pillar_total_nourish_50': {
        id: 'pillar_total_nourish_50', name: "Curious Mind x50", description: "Log 'Nourish' 50 times.",
        flavor: "'The beautiful thing about learning is that no one can take it away from you.' - B.B. King.\nTip: Share something interesting you learned with someone.\nFifty times you've nourished your mind! A lifelong learner, [Name]!",
        icon: 'fa-solid fa-brain', criteria: { type: 'specificPillarCount', pillarId: 'nourish', value: 50 }, unlocked: false, date: null
    },
    'pillar_total_nourish_100': {
        id: 'pillar_total_nourish_100', name: "Curious Mind x100", description: "Log 'Nourish' 100 times.",
        flavor: "'Intellectual growth should commence at birth and cease only at death.' - Albert Einstein.\nTip: Start a longer course or read a challenging book.\nA hundred nourishing experiences! Exploring a wealth of knowledge, [Name].",
        icon: 'fa-solid fa-atom', criteria: { type: 'specificPillarCount', pillarId: 'nourish', value: 100 }, unlocked: false, date: null
    },
    // --- Move ---
    'pillar_total_move_10': {
        id: 'pillar_total_move_10', name: "Active Mover x10", description: "Log 'Move' 10 times.",
        flavor: "'Take care of your body. It’s the only place you have to live.' - Jim Rohn.\nTip: Try incorporating short bursts of movement throughout your day.\nTen times you've chosen to move, [Name]! Getting into the rhythm.",
        icon: 'fa-solid fa-person-running', criteria: { type: 'specificPillarCount', pillarId: 'move', value: 10 }, unlocked: false, date: null
    },
    'pillar_total_move_25': {
        id: 'pillar_total_move_25', name: "Active Mover x25", description: "Log 'Move' 25 times.",
        flavor: "'Movement is a medicine...' - Carol Welch.\nTip: Explore a new type of exercise.\nTwenty-five active sessions logged, [Name]! Consistently prioritizing physical wellbeing.",
        icon: 'fa-solid fa-dumbbell', criteria: { type: 'specificPillarCount', pillarId: 'move', value: 25 }, unlocked: false, date: null
    },
    'pillar_total_move_50': {
        id: 'pillar_total_move_50', name: "Active Mover x50", description: "Log 'Move' 50 times.",
        flavor: "'The greatest wealth is health.' - Virgil.\nTip: Find a workout buddy or join a class for motivation.\nFifty times you've moved your body! Your energy levels thank you, [Name].",
        icon: 'fa-solid fa-heart-pulse', criteria: { type: 'specificPillarCount', pillarId: 'move', value: 50 }, unlocked: false, date: null
    },
    'pillar_total_move_100': {
        id: 'pillar_total_move_100', name: "Active Mover x100", description: "Log 'Move' 100 times.",
        flavor: "'An early-morning walk is a blessing for the whole day.' - Henry David Thoreau.\nTip: Set a new fitness goal, like a distance or strength target.\nA hundred active days! Embracing a healthy lifestyle, [Name].",
        icon: 'fa-solid fa-person-hiking', criteria: { type: 'specificPillarCount', pillarId: 'move', value: 100 }, unlocked: false, date: null
    },
    // --- Create ---
    'pillar_total_create_10': {
        id: 'pillar_total_create_10', name: "Creative Spark x10", description: "Log 'Create' 10 times.",
        flavor: "'Creativity takes courage.' - Henri Matisse.\nTip: Don't judge your creations, just enjoy the process.\nTen sparks of creativity ignited, [Name]! Keep letting that imagination flow.",
        icon: 'fa-solid fa-palette', criteria: { type: 'specificPillarCount', pillarId: 'create', value: 10 }, unlocked: false, date: null
    },
    'pillar_total_create_25': {
        id: 'pillar_total_create_25', name: "Creative Spark x25", description: "Log 'Create' 25 times.",
        flavor: "'You can’t use up creativity. The more you use, the more you have.' - Maya Angelou.\nTip: Try a different creative medium.\nTwenty-five creative sessions logged, [Name]. Regularly making space for expression.",
        icon: 'fa-solid fa-pencil-ruler', // Corrected from fa-pencil-ruler
        criteria: { type: 'specificPillarCount', pillarId: 'create', value: 25 }, unlocked: false, date: null
    },
    'pillar_total_create_50': {
        id: 'pillar_total_create_50', name: "Creative Spark x50", description: "Log 'Create' 50 times.",
        flavor: "'Every artist was first an amateur.' - Ralph Waldo Emerson.\nTip: Dedicate a specific time or space for creativity.\nFifty times you've created something! Your creative muscle is getting stronger, [Name].",
        icon: 'fa-solid fa-music', criteria: { type: 'specificPillarCount', pillarId: 'create', value: 50 }, unlocked: false, date: null
    },
    'pillar_total_create_100': {
        id: 'pillar_total_create_100', name: "Creative Spark x100", description: "Log 'Create' 100 times.",
        flavor: "'The desire to create is one of the deepest yearnings of the human soul.' - Dieter F. Uchtdorf.\nTip: Share your creations with others!\nA hundred creative endeavors! A true creator at heart, [Name].",
        icon: 'fa-solid fa-paintbrush', // Corrected from fa-paint-brush
        criteria: { type: 'specificPillarCount', pillarId: 'create', value: 100 }, unlocked: false, date: null
    },
    // --- Unplug ---
    'pillar_total_unplug_10': {
        id: 'pillar_total_unplug_10', name: "Digital Detox x10", description: "Log 'Unplug' 10 times.",
        flavor: "'Almost everything will work again if you unplug it for a few minutes, including you.' - Anne Lamott.\nTip: Try leaving your phone in another room for an hour.\nTen times you've stepped away, [Name]. Finding balance is vital.",
        icon: 'fa-solid fa-power-off', criteria: { type: 'specificPillarCount', pillarId: 'unplug', value: 10 }, unlocked: false, date: null
    },
    'pillar_total_unplug_25': {
        id: 'pillar_total_unplug_25', name: "Digital Detox x25", description: "Log 'Unplug' 25 times.",
        flavor: "'The more relaxed you are, the better you are at everything.' - Bill Murray.\nTip: Designate 'screen-free' times or zones.\nTwenty-five moments of digital peace, [Name]. Making space for offline presence.",
        icon: 'fa-solid fa-plane', criteria: { type: 'specificPillarCount', pillarId: 'unplug', value: 25 }, unlocked: false, date: null
    },
    'pillar_total_unplug_50': {
        id: 'pillar_total_unplug_50', name: "Digital Detox x50", description: "Log 'Unplug' 50 times.",
        flavor: "'In an age of constant movement, nothing is more urgent than sitting still.' - Pico Iyer.\nTip: Plan an activity that doesn’t involve screens.\nFifty times you've unplugged! Mastering mindful disconnection, [Name].",
        icon: 'fa-solid fa-mobile-screen-button', criteria: { type: 'specificPillarCount', pillarId: 'unplug', value: 50 }, unlocked: false, date: null
    },
    'pillar_total_unplug_100': {
        id: 'pillar_total_unplug_100', name: "Digital Detox x100", description: "Log 'Unplug' 100 times.",
        flavor: "'Technology can be our best friend, and... the biggest party pooper.' - Jennifer Aniston.\nTip: How does unplugging affect your mood and focus?\nA hundred times you chose presence over pixels, [Name]!",
        icon: 'fa-solid fa-leaf', criteria: { type: 'specificPillarCount', pillarId: 'unplug', value: 100 }, unlocked: false, date: null
    },
    // --- Reflect ---
    'pillar_total_reflect_10': {
        id: 'pillar_total_reflect_10', name: "Inner Look x10", description: "Log 'Reflect' 10 times.",
        flavor: "'The unexamined life is not worth living.' - Socrates.\nTip: Try asking yourself one specific question each time you reflect.\nTen moments of introspection, [Name]. Building self-awareness.",
        icon: 'fa-solid fa-book-journal-whills', criteria: { type: 'specificPillarCount', pillarId: 'reflect', value: 10 }, unlocked: false, date: null
    },
    'pillar_total_reflect_25': {
        id: 'pillar_total_reflect_25', name: "Inner Look x25", description: "Log 'Reflect' 25 times.",
        flavor: "'Journaling is like whispering to one’s self and listening at the same time.' - Mina Murray.\nTip: Focus on gratitude during one reflection this week.\nTwenty-five reflections logged, [Name]. Gaining valuable perspective.",
        icon: 'fa-solid fa-magnifying-glass', criteria: { type: 'specificPillarCount', pillarId: 'reflect', value: 25 }, unlocked: false, date: null
    },
    'pillar_total_reflect_50': {
        id: 'pillar_total_reflect_50', name: "Inner Look x50", description: "Log 'Reflect' 50 times.",
        flavor: "'Self-reflection is the school of wisdom.' - Baltasar Gracián.\nTip: Re-read an older entry – what’s changed?\nFifty times you've looked within! Your reflective practice is a powerful tool, [Name].",
        icon: 'fa-solid fa-user-pen', criteria: { type: 'specificPillarCount', pillarId: 'reflect', value: 50 }, unlocked: false, date: null
    },
    'pillar_total_reflect_100': {
        id: 'pillar_total_reflect_100', name: "Inner Look x100", description: "Log 'Reflect' 100 times.",
        flavor: "'Without reflection, we go blindly on our way...' - Margaret J. Wheatley.\nTip: What wisdom have you uncovered about your patterns?\nA hundred reflections! Master of introspection, [Name].",
        icon: 'fa-solid fa-lightbulb', criteria: { type: 'specificPillarCount', pillarId: 'reflect', value: 100 }, unlocked: false, date: null
    },
    // --- Enjoy ---
    'pillar_total_enjoy_10': {
        id: 'pillar_total_enjoy_10', name: "Savor the Moment x10", description: "Log 'Enjoy' 10 times.",
        flavor: "'Enjoy the little things, for one day you may look back and realize they were the big things.' - Robert Brault.\nTip: Name three small things you enjoyed today.\nTen moments savored, [Name]! Cultivating appreciation.",
        icon: 'fa-solid fa-face-grin-stars', criteria: { type: 'specificPillarCount', pillarId: 'enjoy', value: 10 }, unlocked: false, date: null
    },
    'pillar_total_enjoy_25': {
        id: 'pillar_total_enjoy_25', name: "Savor the Moment x25", description: "Log 'Enjoy' 25 times.",
        flavor: "'The present moment is filled with joy and happiness. If you are attentive, you will see it.' - Thich Nhat Hanh.\nTip: Fully engage your senses during an enjoyable activity.\nTwenty-five times you've paused to enjoy, [Name].",
        icon: 'fa-solid fa-camera-retro', criteria: { type: 'specificPillarCount', pillarId: 'enjoy', value: 25 }, unlocked: false, date: null
    },
    'pillar_total_enjoy_50': {
        id: 'pillar_total_enjoy_50', name: "Savor the Moment x50", description: "Log 'Enjoy' 50 times.",
        flavor: "'Gratitude turns what we have into enough.' - Anonymous.\nTip: Start a gratitude jar or list.\nFifty moments of mindful enjoyment! Making appreciation a habit enhances wellbeing, [Name].",
        icon: 'fa-solid fa-gift', criteria: { type: 'specificPillarCount', pillarId: 'enjoy', value: 50 }, unlocked: false, date: null
    },
    'pillar_total_enjoy_100': {
        id: 'pillar_total_enjoy_100', name: "Savor the Moment x100", description: "Log 'Enjoy' 100 times.",
        flavor: "'Piglet noticed that even though he had a Very Small Heart, it could hold a rather large amount of Gratitude.' - A.A. Milne.\nTip: How can you bring enjoyment into challenging tasks?\nA hundred moments savored! Expert in appreciating life's joys, [Name].",
        icon: 'fa-solid fa-champagne-glasses', criteria: { type: 'specificPillarCount', pillarId: 'enjoy', value: 100 }, unlocked: false, date: null
    },

    // ========================================
    // Perfect Days (All Pillars Logged)
    // ========================================
    'perfect_day_1': {
        id: 'perfect_day_1', name: "Holistic Harmony", description: "Log all 10 pillars on a single day.",
        flavor: "'Happiness is not a matter of intensity but of balance, order, rhythm and harmony.' - Thomas Merton.\nTip: Aim for balance over perfection most days!\nIncredible balance, [Name]! Logging all ten pillars shows amazing commitment.",
        icon: 'fa-solid fa-circle-check', criteria: { type: 'allPillarsOneDay', value: 1 }, unlocked: false, date: null
    },

    // ========================================
    // Notes / Reflection
    // ========================================
    'notes_1': {
        id: 'notes_1', name: "First Reflection", description: "Add your first note to the Journey timeline.",
        flavor: "'The journey of self-discovery begins with the first word.' - Anonymous.\nTip: Don't overthink it; just write what comes to mind.\nGlad to have you documenting your path, [Name].",
        // *** Alternative Icon ***
        icon: 'fa-solid fa-pen', criteria: { type: 'notesAdded', value: 1 }, unlocked: false, date: null
    },
    'notes_10': {
        id: 'notes_10', name: "Journaler", description: "Add 10 notes to the Journey timeline.",
        flavor: "'I write to understand what I’m thinking.' - Joan Didion.\nTip: Try using prompts if you get stuck (e.g., 'Today I felt...', 'I learned...').\nTen reflections captured! Your timeline is becoming a rich story, [Name].",
        icon: 'fa-solid fa-book', criteria: { type: 'notesAdded', value: 10 }, unlocked: false, date: null
    },
    'notes_25': {
        id: 'notes_25', name: "Reflective Writer", description: "Add 25 notes to the Journey timeline.",
        flavor: "'We do not learn from experience… we learn from reflecting on experience.' - John Dewey.\nTip: Reflect on a challenge and how you handled it.\nTwenty-five entries penned, [Name]. Consistently making time for introspection.",
        icon: 'fa-solid fa-feather-pointed', criteria: { type: 'notesAdded', value: 25 }, unlocked: false, date: null
    },
    'notes_50': {
        id: 'notes_50', name: "Storyteller", description: "Add 50 notes to the Journey timeline.",
        flavor: "'There is no greater agony than bearing an untold story inside you.' - Maya Angelou.\nTip: Look for recurring themes in your notes.\nFifty stories and reflections shared, [Name]! Skillfully documenting your growth.",
        icon: 'fa-solid fa-scroll', criteria: { type: 'notesAdded', value: 50 }, unlocked: false, date: null
    },
    'notes_100': {
        id: 'notes_100', name: "Timeline Historian", description: "Add 100 notes to the Journey timeline.",
        flavor: "'History is the version of past events that people have decided to agree upon.' - Napoleon Bonaparte.\nTip: How has your perspective changed over time?\nA century of notes! Creating a valuable personal history, [Name].",
        icon: 'fa-solid fa-landmark', criteria: { type: 'notesAdded', value: 100 }, unlocked: false, date: null
    },

    // ========================================
    // Prestige
    // ========================================
    'prestige_1': {
        id: 'prestige_1', name: "Prestigious", description: "Reach Prestige Level 1.",
        flavor: "'The only true wisdom is in knowing you know nothing.' - Socrates.\nTip: Revisit the basics with fresh eyes.\nCycle 1 complete! You've mastered the first stage, [Name]. The journey continues!",
        icon: 'fa-solid fa-recycle', criteria: { type: 'prestigeLevel', value: 1 }, unlocked: false, date: null
    },
    'prestige_3': {
        id: 'prestige_3', name: "Highly Regarded", description: "Reach Prestige Level 3.",
        flavor: "'Excellence is an art won by training and habituation.' - Aristotle.\nTip: Focus on integrating pillars more seamlessly.\nCycle 3 achieved! Your understanding deepens, [Name]. Impressive dedication.",
        // *** Alternative Icon ***
        icon: 'fa-solid fa-arrows-rotate', criteria: { type: 'prestigeLevel', value: 3 }, unlocked: false, date: null
    },
    'prestige_5': {
        id: 'prestige_5', name: "Esteemed", description: "Reach Prestige Level 5.",
        flavor: "'What we learn with pleasure we never forget.' - Alfred Mercier.\nTip: Can you teach or share one principle you've learned?\nFive cycles of growth! Esteemed knowledge of your wellbeing patterns, [Name].",
        icon: 'fa-solid fa-infinity', criteria: { type: 'prestigeLevel', value: 5 }, unlocked: false, date: null
    },
    'prestige_10': {
        id: 'prestige_10', name: "Illustrious", description: "Reach Prestige Level 10.",
        flavor: "'The master has failed more times than the beginner has even tried.' - Stephen McCranie.\nTip: What legacy of wellbeing do you want to build?\nCycle 10! An illustrious milestone, [Name], representing profound dedication.",
        icon: 'fa-solid fa-atom', criteria: { type: 'prestigeLevel', value: 10 }, unlocked: false, date: null
    },

    // ========================================
    // Mood Related Achievements
    // ========================================
    'mood_positive_10': {
        id: 'mood_positive_10', name: "Positive Outlook", description: "Log a positive mood (🙂 or 😁) 10 times.",
        flavor: "'Keep your face always toward the sunshine, and shadows will fall behind you.' - Walt Whitman.\nTip: What specifically contributed to these good moods?\nTen positive days recorded, [Name]! Cultivating positivity.",
        icon: 'fa-solid fa-face-smile', criteria: { type: 'mood', levels: [4, 5], value: 10 }, unlocked: false, date: null
    },
    'mood_positive_25': {
        id: 'mood_positive_25', name: "Glass Half Full", description: "Log a positive mood (🙂 or 😁) 25 times.",
        flavor: "'Optimism is the faith that leads to achievement.' - Helen Keller.\nTip: Practice gratitude journaling.\nTwenty-five times you've focused on the bright side, [Name]. Your positive outlook shines!",
        icon: 'fa-solid fa-face-laugh-beam', criteria: { type: 'mood', levels: [4, 5], value: 25 }, unlocked: false, date: null
    },
    'mood_tracker_30': {
        id: 'mood_tracker_30', name: "Mood Monitor", description: "Log your mood (any level) on 30 different days.",
        flavor: "'Feelings are just visitors, let them come and go.' - Mooji.\nTip: Notice any links between pillars and mood.\nThirty days of mood tracking! Building self-awareness is key, [Name].",
        icon: 'fa-solid fa-heart-pulse', criteria: { type: 'mood', levels: [1, 2, 3, 4, 5], value: 30 }, unlocked: false, date: null
    },

    // ========================================
    // Meta Achievements
    // ========================================
    'meta_unlock_5': {
        id: 'meta_unlock_5', name: "Trophy Hunter", description: "Unlock 5 different achievements.",
        flavor: "'The reward of a thing well done is to have done it.' - Ralph Waldo Emerson.\nTip: Check the board for your next target!\nYour first few trophies! Exploring the possibilities, [Name].",
        icon: 'fa-solid fa-magnifying-glass', // Corrected from fa-search
        criteria: { type: 'meta', value: 5 }, unlocked: false, date: null
    },
    'meta_unlock_15': {
        id: 'meta_unlock_15', name: "Achievement Ace", description: "Unlock 15 different achievements.",
        flavor: "'Aim for the moon. If you miss, you may hit a star.' - W. Clement Stone.\nTip: Which achievement felt the most rewarding?\nFifteen achievements unlocked! Becoming an ace, [Name].",
        icon: 'fa-solid fa-star', criteria: { type: 'meta', value: 15 }, unlocked: false, date: null
    },
    'meta_unlock_30': {
        id: 'meta_unlock_30', name: "Decorated Dedication", description: "Unlock 30 different achievements.",
        flavor: "'It always seems impossible until it’s done.' - Nelson Mandela.\nTip: You're building a strong portfolio of wellbeing!\nThirty achievements earned! Your dedication is well-decorated, [Name].",
        // *** Alternative Icon ***
        icon: 'fa-solid fa-shield', criteria: { type: 'meta', value: 30 }, unlocked: false, date: null
    },
    'meta_unlock_50': {
        id: 'meta_unlock_50', name: "Milestone Master", description: "Unlock 50 different achievements.",
        flavor: "'Only those who dare to fail greatly can ever achieve greatly.' - Robert F. Kennedy.\nTip: What's the next big challenge?\nFifty milestones achieved! A true master of tracking and growth, [Name].",
        icon: 'fa-solid fa-trophy', criteria: { type: 'meta', value: 50 }, unlocked: false, date: null
    },
    'meta_well_rounded': {
        id: 'meta_well_rounded', name: "Well Rounded", description: "Log each of the 10 pillars at least once.",
        flavor: "'The whole is greater than the sum of its parts.' - Aristotle.\nTip: Notice how the pillars influence each other.\nYou've explored all ten facets of wellbeing, [Name]! A truly well-rounded approach.",
        icon: 'fa-solid fa-check-double', criteria: { type: 'meta_all_pillars', value: null }, unlocked: false, date: null // Value not needed
    },

}; // End ALL_ACHIEVEMENTS


/**
 * Optional: Function to validate the structure of the ALL_ACHIEVEMENTS object during development.
 * Checks for required keys and basic type correctness in criteria.
 * @returns {boolean} True if all definitions seem valid, false otherwise.
 */
export function validateAchievements() {
    let isValid = true;
    const requiredKeys = ['id', 'name', 'description', 'flavor', 'icon', 'criteria'];
    const ids = new Set();
    let count = 0;

    console.log("[Validation] Starting achievement definition validation...");

    for (const id in ALL_ACHIEVEMENTS) {
        count++;
        const achievement = ALL_ACHIEVEMENTS[id];

        // Check for duplicate IDs
        if (ids.has(id)) {
            console.error(`[Validation] Duplicate achievement ID found: ${id}`);
            isValid = false;
        }
        ids.add(id);

        // Check if achievement object exists
        if (!achievement || typeof achievement !== 'object') {
            console.error(`[Validation] Invalid achievement definition for ID: ${id}`);
            isValid = false;
            continue; // Skip further checks for this invalid entry
        }

        // Check for missing required keys
        for (const key of requiredKeys) {
            if (!(key in achievement)) {
                console.error(`[Validation] Achievement ${id} is missing required key: ${key}`);
                isValid = false;
            }
        }

        // Check if 'id' property matches the object key
        if (achievement.id !== id) {
             console.error(`[Validation] Achievement ID mismatch for key '${id}': id property is '${achievement.id}'`);
             isValid = false;
        }

        // Validate the criteria object
        if (typeof achievement.criteria !== 'object' || achievement.criteria === null) {
            console.error(`[Validation] Achievement ${id} has invalid 'criteria' property (must be an object).`);
            isValid = false;
        } else {
            // Validate criteria type
            if (typeof achievement.criteria.type !== 'string' || !achievement.criteria.type) {
                console.error(`[Validation] Achievement ${id} criteria is missing or has invalid 'type'.`);
                isValid = false;
            }

            // Validate criteria value (conditionally)
            const typesNotNeedingValue = ['allPillarsOneDay', 'meta_all_pillars'];
            if (typeof achievement.criteria.value === 'undefined' && !typesNotNeedingValue.includes(achievement.criteria.type)) {
                // Only log warning for potentially missing value, might be intentional for some future types
                // console.warn(`[Validation] Achievement ${id} criteria might be missing 'value' (type: ${achievement.criteria.type}).`);
            } else if (typeof achievement.criteria.value !== 'number' && !typesNotNeedingValue.includes(achievement.criteria.type) && achievement.criteria.value !== null) { // Allow null value
                 // If value exists but isn't a number (and it's needed), it's an error
                 console.error(`[Validation] Achievement ${id} criteria has non-numeric 'value' (and not null) for type ${achievement.criteria.type}. Value: ${achievement.criteria.value}`);
                 isValid = false;
            }


            // Validate specific criteria types
            if (achievement.criteria.type === 'specificPillarCount' && (typeof achievement.criteria.pillarId !== 'string' || !achievement.criteria.pillarId)) {
                console.error(`[Validation] Achievement ${id} criteria (specificPillarCount) is missing or has invalid 'pillarId'.`);
                isValid = false;
            }
            if (achievement.criteria.type === 'mood' && !Array.isArray(achievement.criteria.levels)) {
                console.error(`[Validation] Achievement ${id} criteria (mood) is missing or has invalid 'levels' array.`);
                isValid = false;
            }
        }

        // Validate icon
        if (typeof achievement.icon !== 'string' || !achievement.icon.trim()) {
            console.error(`[Validation] Achievement ${id} has invalid or missing 'icon' property.`);
            isValid = false;
        }

        // Validate flavor text
        if (typeof achievement.flavor !== 'string' || !achievement.flavor.trim()) {
             console.warn(`[Validation] Achievement ${id} has missing or empty 'flavor' text.`);
             // isValid = false; // Decide if empty flavor text is an error or just a warning
        } else if (!achievement.flavor.includes('[Name]')) {
             console.warn(`[Validation] Achievement ${id} flavor text might be missing the [Name] placeholder.`);
        }
    }

    console.log(`[Validation] Validated ${count} achievement definitions. Result: ${isValid ? 'OK' : 'Errors Found'}`);
    return isValid;
}

// Example of calling validation during development (uncomment to run)
// validateAchievements();
