<script>
    import { theme, toggleTheme } from "$lib/theme.js"; // Import store and toggle function

    // Icons (simple text for now, replace with SVGs later if desired)
    const sunIcon = "☀️";
    const moonIcon = "🌙";
</script>

<button
    class="theme-toggle-button"
    on:click={toggleTheme}
    aria-label="Toggle theme"
    title="Toggle theme"
    class:dark={$theme === "dark"}
>
    <span class="icon sun">{sunIcon}</span>
    <span class="toggle-track">
        <span class="toggle-thumb"></span>
    </span>
    <span class="icon moon">{moonIcon}</span>
</button>

<style>
    .theme-toggle-button {
        background-color: rgba(120, 120, 120, 0.1); /* Translucent background */
        border: 1px solid rgba(120, 120, 120, 0.2);
        padding: 4px;
        border-radius: 20px; /* Pill shape */
        cursor: pointer;
        display: inline-flex; /* Align items inline */
        align-items: center;
        gap: 5px; /* Space between icons and track */
        position: relative;
        transition: background-color 0.3s ease;
        overflow: hidden;
        /* Ensure button doesn't affect layout much */
        vertical-align: middle;
    }
    .theme-toggle-button:hover {
        background-color: rgba(120, 120, 120, 0.2);
    }

    .icon {
        font-size: 0.7rem; /* Smaller icons */
        line-height: 1;
        transition: opacity 0.3s ease;
        z-index: 1;
        user-select: none;
        width: 14px; /* Fixed width */
        text-align: center;
        opacity: 0.6; /* Default muted state */
        color: var(--text-color); /* Use theme text color */
    }

    .toggle-track {
        width: 30px; /* Slightly smaller track */
        height: 18px;
        background-color: var(
            --muted-text,
            rgba(0, 0, 0, 0.1)
        ); /* Use theme color */
        border-radius: 9px;
        position: relative;
        display: block;
        transition: background-color 0.3s ease;
    }

    .toggle-thumb {
        width: 14px; /* Smaller thumb */
        height: 14px;
        background-color: white; /* Thumb color */
        border-radius: 50%;
        position: absolute;
        top: 2px;
        left: 2px; /* Light mode start */
        transition: transform 0.3s ease-in-out;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }

    /* Dark mode state adjustments */
    .theme-toggle-button.dark .toggle-thumb {
        transform: translateX(12px); /* Move thumb right */
    }

    .theme-toggle-button.dark .toggle-track {
        background-color: var(--accent-color, #7aa2f7); /* Use theme accent */
    }

    /* Active Icon visibility */
    .theme-toggle-button .sun {
        opacity: 1;
    } /* Sun active in light */
    .theme-toggle-button.dark .moon {
        opacity: 1;
    } /* Moon active in dark */
    .theme-toggle-button.dark .sun {
        opacity: 0.5;
    } /* Sun muted in dark */
    .theme-toggle-button .moon {
        opacity: 0.5;
    } /* Moon muted in light */
</style>
