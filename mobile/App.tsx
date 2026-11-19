/**
 * Legacy entry kept only so accidental `import App` fails closed.
 * The app boots via expo-router (`main`: `expo-router/entry` → `app/`).
 * Mentors Portal is a full-screen route at `/portal` — not a modal.
 */
export { default } from './app/index';
