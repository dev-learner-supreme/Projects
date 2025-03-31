<script>
    import { onDestroy, onMount } from "svelte";
    // Correct imports: store value access ($theme) and the component
    import { theme } from "$lib/theme.js";
    import ThemeToggle from "$lib/ThemeToggle.svelte";

    // --- Constants ---
    const WORK_DURATION_MIN = 25;
    const SHORT_BREAK_DURATION_MIN = 5;
    const LONG_BREAK_DURATION_MIN = 15;
    const POMODOROS_BEFORE_LONG_BREAK = 4;

    // --- State Variables ---
    // Default settings, will be loaded/merged from localStorage
    let settings = {
        workMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        pomodorosBeforeLongBreak: 4,
        autoStartBreaks: false,
        autoStartPomodoros: false,
    };

    let currentMode = "Work"; // 'Work', 'Short Break', 'Long Break'
    let totalDurationSeconds = settings.workMinutes * 60; // Initial duration based on default work time
    let timeLeftSeconds = totalDurationSeconds; // Time left starts at total duration
    let timerInterval = null; // Stores the setInterval ID, null when stopped/paused
    let isPaused = true; // Timer starts paused
    let pomodoroCycleCount = 0; // Tracks completed work sessions
    let currentTask = ""; // Stores the user's current task input

    // --- SVG Circle Calculations ---
    const radius = 100;
    const circumference = 2 * Math.PI * radius;
    // Reactive: Calculate progress ratio (0 to 1) based on time left and total duration
    $: progressRatio =
        totalDurationSeconds > 0 ? timeLeftSeconds / totalDurationSeconds : 0;
    // Reactive: Calculate the SVG stroke offset for the progress circle
    $: strokeDashoffset = circumference * (1 - progressRatio);

    // --- Formatted Time Display ---
    $: minutes = Math.floor(timeLeftSeconds / 60);
    $: seconds = timeLeftSeconds % 60;
    // Reactive: Format time as MM:SS, adding leading zero for seconds if needed
    $: timeDisplay = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    // Reactive: Update the browser tab title
    $: documentTitle = `${timeDisplay} - ${currentTask || currentMode} | Pomodoro`;

    // --- Timer Logic ---
    function tick() {
        if (timeLeftSeconds > 0) {
            timeLeftSeconds--; // Decrement time left
        } else {
            // Timer reached zero
            clearInterval(timerInterval); // Stop the interval
            timerInterval = null;
            isPaused = true; // Set state to paused/stopped

            // --- *** Sound Notification *** ---
            try {
                // Assumes sound file is at /static/sounds/timer_done.mp3
                // Ensure the 'sounds' folder exists in your 'static' directory
                const audio = new Audio("/sounds/timer_done.mp3");
                audio
                    .play()
                    .catch((e) => console.error("Audio play failed:", e)); // Play sound, catch errors
                console.log("Played finish sound.");
            } catch (err) {
                console.error("Failed to create or play sound object:", err);
            }
            // --- *** End Sound Notification *** ---

            console.log(`${currentMode} finished!`); // Log event

            // --- Switch Mode Logic ---
            if (currentMode === "Work") {
                pomodoroCycleCount++; // Increment completed work cycles
                // Decide next mode based on cycle count
                if (
                    pomodoroCycleCount % settings.pomodorosBeforeLongBreak ===
                    0
                ) {
                    switchMode("Long Break");
                } else {
                    switchMode("Short Break");
                }
                // Auto start next break if setting is enabled
                if (settings.autoStartBreaks) {
                    // Use setTimeout for a small delay, allowing sound to play
                    setTimeout(toggleTimer, 500);
                }
            } else {
                // If a break finished
                switchMode("Work"); // Always switch back to work after a break
                // Auto start next work session if setting is enabled
                if (settings.autoStartPomodoros) {
                    // Use setTimeout for delay
                    setTimeout(toggleTimer, 500);
                }
            }
            // Note: switchMode now handles resetting timeLeftSeconds
        }
    }

    // Internal function to handle state changes when switching modes
    function switchMode(newMode, manualSwitch = false) {
        currentMode = newMode; // Update the mode state
        console.log(`Switching to ${currentMode} mode.`);
        // Update total duration based on the new mode and settings
        switch (newMode) {
            case "Short Break":
                totalDurationSeconds = settings.shortBreakMinutes * 60;
                break;
            case "Long Break":
                totalDurationSeconds = settings.longBreakMinutes * 60;
                break;
            case "Work":
            default:
                totalDurationSeconds = settings.workMinutes * 60;
                break;
        }

        // Always pause when switching modes automatically or manually reset time
        isPaused = true;
        if (timerInterval) {
            // Stop existing timer if any
            clearInterval(timerInterval);
            timerInterval = null;
        }
        timeLeftSeconds = totalDurationSeconds; // Reset time for the new mode
    }

    // Function called by mode selector buttons
    function setMode(newMode) {
        // Optional: Add confirmation if switching away from running work timer
        // if (!isPaused && currentMode === 'Work') { ... }

        if (timerInterval) {
            // Stop timer if running
            clearInterval(timerInterval);
            timerInterval = null;
        }
        isPaused = true; // Ensure paused state
        switchMode(newMode, true); // Call internal switcher, flag as manual
    }

    // Function called by the main Start/Pause/Resume button
    function toggleTimer() {
        if (isPaused) {
            // --- Start or Resume ---
            isPaused = false; // Set state to running
            if (!timerInterval) {
                // Only create a new interval if one isn't already paused
                console.log(`Starting/Resuming ${currentMode} timer.`);
                // Ensure totalDuration matches current settings before starting
                if (currentMode === "Work")
                    totalDurationSeconds = settings.workMinutes * 60;
                else if (currentMode === "Short Break")
                    totalDurationSeconds = settings.shortBreakMinutes * 60;
                else if (currentMode === "Long Break")
                    totalDurationSeconds = settings.longBreakMinutes * 60;
                // Safety check: If settings changed while paused making timeLeft invalid
                if (timeLeftSeconds > totalDurationSeconds)
                    timeLeftSeconds = totalDurationSeconds;

                timerInterval = setInterval(tick, 1000); // Start the 1-second interval
            }
        } else {
            // --- Pause ---
            isPaused = true; // Set state to paused
            if (timerInterval) {
                clearInterval(timerInterval); // Stop the interval
                timerInterval = null; // Clear the interval ID
                console.log(`Paused ${currentMode} timer.`);
            }
        }
    }

    // Function called by the Reset button
    function resetTimer() {
        console.log(`Resetting timer.`);
        if (timerInterval) {
            clearInterval(timerInterval); // Stop any running interval
            timerInterval = null;
        }
        // Always reset fully back to the start of a Work session
        currentMode = "Work"; // Reset mode state
        totalDurationSeconds = settings.workMinutes * 60; // Reset duration from settings
        timeLeftSeconds = totalDurationSeconds; // Reset time left
        isPaused = true; // Ensure it's paused
        pomodoroCycleCount = 0; // Reset cycle count
    }

    // --- Settings Handling ---
    function saveSettings() {
        if (typeof localStorage !== "undefined") {
            // Check if localStorage is available
            try {
                localStorage.setItem(
                    "pomodoroSettings",
                    JSON.stringify(settings),
                );
                resetTimerBasedOnSettings(); // Apply changes immediately to current timer state
                console.log("Settings saved to localStorage");
            } catch (e) {
                console.error("Failed to save settings to localStorage:", e);
            }
        }
    }

    function loadSettings() {
        if (typeof localStorage !== "undefined") {
            const saved = localStorage.getItem("pomodoroSettings");
            if (saved) {
                try {
                    const parsedSettings = JSON.parse(saved);
                    // Merge saved settings over defaults to handle potentially missing keys in old saves
                    settings = { ...settings, ...parsedSettings };
                    console.log("Settings loaded from localStorage");
                } catch (e) {
                    console.error("Failed to parse saved settings:", e);
                    // Keep default settings if parsing fails
                }
            } else {
                console.log(
                    "No settings found in localStorage, using defaults.",
                );
            }
            // Apply loaded/default settings to the timer state
            resetTimerBasedOnSettings();
        }
    }

    // Reset timer state based on current settings (use after loading/changing settings)
    function resetTimerBasedOnSettings() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        isPaused = true; // Ensure paused state
        // Update total duration based on the *current* mode and *new* settings
        switch (currentMode) {
            case "Work":
                totalDurationSeconds = settings.workMinutes * 60;
                break;
            case "Short Break":
                totalDurationSeconds = settings.shortBreakMinutes * 60;
                break;
            case "Long Break":
                totalDurationSeconds = settings.longBreakMinutes * 60;
                break;
        }
        // Reset timeLeft to the new total duration when settings change
        timeLeftSeconds = totalDurationSeconds;
        console.log(
            `Timer state reset based on settings. Mode: ${currentMode}, Duration: ${totalDurationSeconds / 60} min`,
        );
    }

    // --- Lifecycle & Reactive Save ---
    onMount(() => {
        loadSettings(); // Load settings when component mounts on the client
    });

    // Reactive: Update document title whenever relevant variables change
    $: if (typeof document !== "undefined") document.title = documentTitle;

    // Reactive: Save settings to localStorage whenever the settings object changes
    // Use JSON.stringify for comparison to avoid saving too frequently
    let settingsJson = "{}"; // Initialize comparison string
    $: {
        const newSettingsJson = JSON.stringify(settings);
        // Only save on the client and if the settings actually changed
        if (
            typeof document !== "undefined" &&
            newSettingsJson !== settingsJson
        ) {
            settingsJson = newSettingsJson; // Update internal tracking string
            saveSettings(); // Call the save function
        }
    }

    // Cleanup: Clear interval when the component is destroyed (e.g., navigating away)
    onDestroy(() => {
        if (timerInterval) clearInterval(timerInterval);
    });
</script>

<svelte:head>
    <title>{documentTitle}</title>
    <link rel="manifest" href="/manifest.json" />
    <!-- Update meta theme color reactively -->
    <meta
        name="theme-color"
        content={$theme === "dark" ? "#1a1b26" : "#dcdcdc"}
    />
</svelte:head>

<div class="page-container">
    <!-- Theme Toggle Component positioned absolutely -->
    <div class="toggle-container">
        <ThemeToggle />
    </div>

    <!-- Main Content Area -->
    <div class="main-content">
        <!-- Mode Selector Buttons -->
        <header class="mode-selector">
            <button
                class:active={currentMode === "Work"}
                data-mode="Work"
                on:click={() => setMode("Work")}
            >
                Pomodoro
            </button>
            <button
                class:active={currentMode === "Short Break"}
                data-mode="Short Break"
                on:click={() => setMode("Short Break")}
            >
                Short Break
            </button>
            <button
                class:active={currentMode === "Long Break"}
                data-mode="Long Break"
                on:click={() => setMode("Long Break")}
            >
                Long Break
            </button>
        </header>

        <!-- Timer Display and Progress -->
        <div class="timer-area">
            <div class="progress-indicator">
                <svg class="progress-ring" viewBox="0 0 220 220">
                    <circle
                        class="progress-ring-bg"
                        r={radius}
                        cx="110"
                        cy="110"
                    />
                    <circle
                        class="progress-ring-fg"
                        stroke-linecap="round"
                        r={radius}
                        cx="110"
                        cy="110"
                        stroke-dasharray={circumference}
                        stroke-dashoffset={strokeDashoffset}
                        class:work={currentMode === "Work"}
                        class:short={currentMode === "Short Break"}
                        class:long={currentMode === "Long Break"}
                    />
                </svg>
                <div class="timer-display">
                    {timeDisplay}
                </div>
            </div>

            <!-- Main Start/Pause/Resume Button -->
            <button
                class="start-button"
                on:click={toggleTimer}
                class:running={!isPaused}
                aria-live="polite"
            >
                {isPaused
                    ? timeLeftSeconds === totalDurationSeconds
                        ? "START"
                        : "RESUME"
                    : "PAUSE"}
            </button>
        </div>

        <!-- Task Area -->
        <div class="task-area">
            <p class="cycle-info">#{pomodoroCycleCount}</p>
            <input
                type="text"
                class="task-input"
                placeholder="What are you working on?"
                bind:value={currentTask}
            />
        </div>

        <!-- Settings Section -->
        <div class="settings-area">
            <h2>Settings</h2>
            <div class="setting-row">
                <label for="work">Work</label>
                <input
                    type="number"
                    id="work"
                    min="1"
                    max="90"
                    bind:value={settings.workMinutes}
                />
            </div>
            <div class="setting-row">
                <label for="short">Short Break</label>
                <input
                    type="number"
                    id="short"
                    min="1"
                    max="30"
                    bind:value={settings.shortBreakMinutes}
                />
            </div>
            <div class="setting-row">
                <label for="long">Long Break</label>
                <input
                    type="number"
                    id="long"
                    min="1"
                    max="60"
                    bind:value={settings.longBreakMinutes}
                />
            </div>
            <div class="setting-row">
                <label for="cycles">Long Break Interval</label>
                <input
                    type="number"
                    id="cycles"
                    min="1"
                    max="12"
                    bind:value={settings.pomodorosBeforeLongBreak}
                />
            </div>
            <div class="setting-row checkbox">
                <input
                    type="checkbox"
                    id="auto-breaks"
                    bind:checked={settings.autoStartBreaks}
                />
                <label for="auto-breaks">Auto Start Breaks</label>
            </div>
            <div class="setting-row checkbox">
                <input
                    type="checkbox"
                    id="auto-pomos"
                    bind:checked={settings.autoStartPomodoros}
                />
                <label for="auto-pomos">Auto Start Pomodoros</label>
            </div>
        </div>
    </div>
</div>

<!-- Styles section remains the same as the previous version -->
<style>
    /* --- Theme Variables (Tokyo Light/Night Inspired) --- */
    :root {
        --font-main:
            -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
            Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
        /* Light */
        --bg-color-light: #dcdcdc;
        --text-color-light: #343b58;
        --card-bg-light: #f8f8f8;
        --muted-text-light: #7a7f95;
        --accent-work-light: #a88070; /* Muted Red/Brown */
        --accent-short-light: #5a8a7c; /* Muted Green */
        --accent-long-light: #5a7ea8; /* Muted Blue */
        --button-text-light: #ffffff;
        --button-start-bg-light: var(--accent-work-light);
        --button-start-shadow-light: #8c6a5c;
        --button-pause-bg-light: var(--accent-work-light);
        --button-pause-shadow-light: #8c6a5c;
        --mode-button-bg-light: transparent;
        --mode-button-active-bg-light: var(--accent-work-light);
        --mode-button-active-text-light: var(--button-text-light);
        --progress-bg-light: #e0e2e8;
        --input-bg-light: #ededf0;
        --input-border-light: #d0d2d8;
        --header-color-light: #4d567f;
        --shadow-color-light: rgba(0, 0, 0, 0.06);
    }

    [data-theme="dark"] {
        /* Dark */
        --bg-color-dark: #1a1b26;
        --text-color-dark: #c0caf5;
        --card-bg-dark: #24283b;
        --muted-text-dark: #565f89;
        --accent-work-dark: #f7768e; /* Red */
        --accent-short-dark: #9ece6a; /* Green */
        --accent-long-dark: #7aa2f7; /* Blue */
        --button-text-dark: #1a1b26; /* Dark text on light buttons */
        --button-start-bg-dark: var(--accent-work-dark);
        --button-start-shadow-dark: #c65f71;
        --button-pause-bg-dark: var(--accent-work-dark);
        --button-pause-shadow-dark: #c65f71;
        --mode-button-bg-dark: transparent;
        --mode-button-active-bg-dark: var(--accent-work-dark);
        --mode-button-active-text-dark: var(--button-text-dark);
        --progress-bg-dark: #3b4261;
        --input-bg-dark: #2f334d;
        --input-border-dark: #565f89;
        --header-color-dark: #8f9abf;
        --shadow-color-dark: rgba(0, 0, 0, 0.2);
    }

    /* --- Apply Theme Variables --- */
    :global(body) {
        font-family: var(--font-main);
        margin: 0;
        background-color: var(--bg-color, var(--bg-color-light)); /* Fallback */
        color: var(--text-color, var(--text-color-light));
        transition:
            background-color 0.3s ease,
            color 0.3s ease;
    }
    [data-theme="dark"] {
        background-color: var(--bg-color-dark);
        color: var(--text-color-dark);
    }
    [data-theme="light"] {
        background-color: var(--bg-color-light);
        color: var(--text-color-light);
    }

    .page-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        position: relative;
        padding: 20px;
        box-sizing: border-box;
    }
    .toggle-container {
        position: absolute;
        top: 15px;
        right: 15px;
        z-index: 10;
    }

    /* --- Main Layout --- */
    .main-content {
        width: clamp(320px, 90vw, 480px); /* Pomofocus is wider */
        padding: 20px 15px;
        background-color: var(--card-bg, var(--card-bg-light));
        [data-theme="dark"] & {
            background-color: var(--card-bg-dark);
        }
        [data-theme="light"] & {
            background-color: var(--card-bg-light);
        }
        border-radius: 8px;
        box-shadow: 0 5px 25px var(--shadow-color, var(--shadow-color-light));
        [data-theme="dark"] & {
            box-shadow: 0 5px 25px var(--shadow-color-dark);
        }
        [data-theme="light"] & {
            box-shadow: 0 5px 25px var(--shadow-color-light);
        }

        transition: background-color 0.3s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    /* --- Mode Selector --- */
    .mode-selector {
        display: flex;
        background-color: var(--progress-bg, var(--progress-bg-light));
        [data-theme="dark"] & {
            background-color: var(--progress-bg-dark);
        }
        [data-theme="light"] & {
            background-color: var(--progress-bg-light);
        }
        border-radius: 25px;
        padding: 5px;
        margin-bottom: 20px;
    }
    .mode-selector button {
        background: none;
        border: none;
        padding: 8px 18px;
        margin: 0 2px;
        border-radius: 20px;
        cursor: pointer;
        font-weight: 500;
        color: var(--muted-text, var(--muted-text-light));
        [data-theme="dark"] & {
            color: var(--muted-text-dark);
        }
        [data-theme="light"] & {
            color: var(--muted-text-light);
        }
        transition: all 0.2s ease-in-out;
        font-size: 0.9em;
    }
    .mode-selector button.active {
        font-weight: bold;
    }

    /* Specific colors for active mode buttons */
    .mode-selector button.active[data-mode="Work"] {
        background-color: var(--accent-work, var(--accent-work-light));
        color: var(--button-text, var(--button-text-light));
        [data-theme="dark"] & {
            background-color: var(--accent-work-dark);
            color: var(--button-text-dark);
        }
        [data-theme="light"] & {
            background-color: var(--accent-work-light);
            color: var(--button-text-light);
        }
    }
    .mode-selector button.active[data-mode="Short Break"] {
        background-color: var(--accent-short, var(--accent-short-light));
        color: var(--button-text, var(--button-text-light));
        [data-theme="dark"] & {
            background-color: var(--accent-short-dark);
            color: var(--button-text-dark);
        }
        [data-theme="light"] & {
            background-color: var(--accent-short-light);
            color: var(--button-text-light);
        }
    }
    .mode-selector button.active[data-mode="Long Break"] {
        background-color: var(--accent-long, var(--accent-long-light));
        color: var(--button-text, var(--button-text-light));
        [data-theme="dark"] & {
            background-color: var(--accent-long-dark);
            color: var(--button-text-dark);
        }
        [data-theme="light"] & {
            background-color: var(--accent-long-light);
            color: var(--button-text-light);
        }
    }

    /* --- Timer Area --- */
    .timer-area {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .progress-indicator {
        height: 220px;
        width: 220px;
        margin-bottom: 15px;
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .progress-ring {
        width: 100%;
        height: 100%;
    }
    .progress-ring-bg,
    .progress-ring-fg {
        fill: transparent;
        stroke-width: 10;
    } /* Thinner */
    .progress-ring-bg {
        stroke: var(--progress-bg, var(--progress-bg-light));
        transform: rotate(-90deg);
        transform-origin: 50% 50%;
    }
    [data-theme="dark"] .progress-ring-bg {
        stroke: var(--progress-bg-dark);
    }
    [data-theme="light"] .progress-ring-bg {
        stroke: var(--progress-bg-light);
    }
    .progress-ring-fg {
        stroke: var(--accent-work, var(--accent-work-light));
        transform: rotate(-90deg);
        transform-origin: 50% 50%;
        transition: stroke-dashoffset 0.35s linear;
    }
    /* Mode specific progress colors */
    .progress-ring-fg.work {
        stroke: var(--accent-work, var(--accent-work-light));
    }
    .progress-ring-fg.short {
        stroke: var(--accent-short, var(--accent-short-light));
    }
    .progress-ring-fg.long {
        stroke: var(--accent-long, var(--accent-long-light));
    }
    [data-theme="dark"] .progress-ring-fg.work {
        stroke: var(--accent-work-dark);
    }
    [data-theme="dark"] .progress-ring-fg.short {
        stroke: var(--accent-short-dark);
    }
    [data-theme="dark"] .progress-ring-fg.long {
        stroke: var(--accent-long-dark);
    }
    [data-theme="light"] .progress-ring-fg.work {
        stroke: var(--accent-work-light);
    }
    [data-theme="light"] .progress-ring-fg.short {
        stroke: var(--accent-short-light);
    }
    [data-theme="light"] .progress-ring-fg.long {
        stroke: var(--accent-long-light);
    }

    .timer-display {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: clamp(4em, 18vw, 6em); /* Larger time */
        font-weight: 700;
        color: var(--text-color, var(--text-color-light));
        [data-theme="dark"] & {
            color: var(--text-color-dark);
        }
        [data-theme="light"] & {
            color: var(--text-color-light);
        }
        z-index: 1;
        width: 100%;
        text-align: center;
        user-select: none;
    }

    /* --- Start Button --- */
    .start-button {
        font-size: 1.4em;
        font-weight: bold;
        padding: 15px 60px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        background-color: white; /* White BG */
        color: var(--accent-work, var(--accent-work-light)); /* Accent Text */
        [data-theme="dark"] & {
            color: var(--accent-work-dark);
        }
        [data-theme="light"] & {
            color: var(--accent-work-light);
        }
        box-shadow: 0 6px 0 var(--button-start-shadow-light); /* Bottom 'shadow' */
        [data-theme="dark"] & {
            box-shadow: 0 6px 0 var(--button-start-shadow-dark);
        }
        [data-theme="light"] & {
            box-shadow: 0 6px 0 var(--button-start-shadow-light);
        }
        transition: all 0.1s ease-in-out;
        margin-top: 10px;
    }
    .start-button:active {
        transform: translateY(3px);
        box-shadow: 0 3px 0 var(--button-start-shadow-light);
        [data-theme="dark"] & {
            box-shadow: 0 3px 0 var(--button-start-shadow-dark);
        }
        [data-theme="light"] & {
            box-shadow: 0 3px 0 var(--button-start-shadow-light);
        }
    }
    /* Change color/shadow when running (PAUSE state) */
    .start-button.running {
        /* Text color might change or stay the same depending on desired PAUSE look */
        color: var(--accent-work, var(--accent-work-light));
        [data-theme="dark"] & {
            color: var(--accent-work-dark);
        }
        [data-theme="light"] & {
            color: var(--accent-work-light);
        }
        /* Shadow might change color to indicate pause state */
        box-shadow: 0 6px 0 var(--button-pause-shadow-light);
        [data-theme="dark"] & {
            box-shadow: 0 6px 0 var(--button-pause-shadow-dark);
        }
        [data-theme="light"] & {
            box-shadow: 0 6px 0 var(--button-pause-shadow-light);
        }
    }

    /* --- Task Area --- */
    .task-area {
        margin-top: 30px;
        width: 100%;
        text-align: center;
        border-bottom: 1px solid var(--progress-bg, var(--progress-bg-light));
        [data-theme="dark"] & {
            border-bottom-color: var(--progress-bg-dark);
        }
        [data-theme="light"] & {
            border-bottom-color: var(--progress-bg-light);
        }
        padding-bottom: 20px;
        margin-bottom: 20px;
    }
    .cycle-info {
        font-size: 1em;
        color: var(--muted-text, var(--muted-text-light));
        [data-theme="dark"] & {
            color: var(--muted-text-dark);
        }
        [data-theme="light"] & {
            color: var(--muted-text-light);
        }
        margin: 0 0 5px 0;
    }
    .task-input {
        background: none;
        border: none;
        font-size: 1.2em;
        font-weight: bold;
        color: var(--text-color, var(--text-color-light));
        [data-theme="dark"] & {
            color: var(--text-color-dark);
        }
        [data-theme="light"] & {
            color: var(--text-color-light);
        }
        text-align: center;
        width: 90%;
        padding: 5px 0;
        outline: none;
    }
    .task-input::placeholder {
        color: var(--muted-text, var(--muted-text-light));
        [data-theme="dark"] & {
            color: var(--muted-text-dark);
        }
        [data-theme="light"] & {
            color: var(--muted-text-light);
        }
        font-weight: normal;
    }

    /* --- Settings Area --- */
    .settings-area {
        width: 100%;
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid var(--progress-bg, var(--progress-bg-light));
        [data-theme="dark"] & {
            border-top-color: var(--progress-bg-dark);
        }
        [data-theme="light"] & {
            border-top-color: var(--progress-bg-light);
        }
    }
    .settings-area h2 {
        font-size: 1rem;
        color: var(--muted-text, var(--muted-text-light));
        [data-theme="dark"] & {
            color: var(--muted-text-dark);
        }
        [data-theme="light"] & {
            color: var(--muted-text-light);
        }
        margin-block: 0 15px;
        text-align: left;
        font-weight: 500;
    }
    .setting-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        font-size: 0.9rem;
        color: var(--text-color, var(--text-color-light));
        [data-theme="dark"] & {
            color: var(--text-color-dark);
        }
        [data-theme="light"] & {
            color: var(--text-color-light);
        }
    }
    .setting-row label {
        margin-right: 10px;
        flex-shrink: 0;
    }
    .setting-row input[type="number"] {
        width: 60px;
        padding: 5px 8px;
        background-color: var(--input-bg, var(--input-bg-light));
        [data-theme="dark"] & {
            background-color: var(--input-bg-dark);
        }
        [data-theme="light"] & {
            background-color: var(--input-bg-light);
        }
        border: 1px solid var(--input-border, var(--input-border-light));
        [data-theme="dark"] & {
            border-color: var(--input-border-dark);
        }
        [data-theme="light"] & {
            border-color: var(--input-border-light);
        }
        border-radius: 4px;
        color: var(--text-color, var(--text-color-light));
        [data-theme="dark"] & {
            color: var(--text-color-dark);
        }
        [data-theme="light"] & {
            color: var(--text-color-light);
        }
        font-size: 0.9rem;
    }
    /* Add max/min visually if desired */
    .setting-row input[type="number"]::-webkit-inner-spin-button,
    .setting-row input[type="number"]::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
    .setting-row input[type="number"] {
        -moz-appearance: textfield;
    } /* Firefox */

    .setting-row.checkbox {
        justify-content: flex-start;
    }
    .setting-row.checkbox label {
        margin-left: 5px;
        cursor: pointer;
    }
    .setting-row input[type="checkbox"] {
        cursor: pointer;
        accent-color: var(
            --accent-work,
            var(--accent-work-light)
        ); /* Color the check */
        [data-theme="dark"] & {
            accent-color: var(--accent-work-dark);
        }
        [data-theme="light"] & {
            accent-color: var(--accent-work-light);
        }
    }
</style>
