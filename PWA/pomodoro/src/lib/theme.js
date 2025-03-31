// $lib/theme.js
import { writable } from "svelte/store";

// Retrieve the stored theme from localStorage or default to "light"
const storedTheme =
  typeof localStorage !== "undefined" ? localStorage.getItem("theme") : "light";

// Create a writable store for the theme
export const theme = writable(storedTheme || "light");

// Subscribe to the store to update localStorage and the `data-theme` attribute
theme.subscribe((value) => {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("theme", value); // Save theme to localStorage
    document.documentElement.setAttribute("data-theme", value); // Update `data-theme` attribute
  }
});

// Function to toggle between light and dark themes
export function toggleTheme() {
  theme.update((current) => (current === "light" ? "dark" : "light"));
}
