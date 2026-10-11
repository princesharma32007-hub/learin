# Learnix — Student Success Platform

**Tagline:** Learn Smarter. Grow Further.

## Files

- `index.html` — page structure and the Learnix brand.
- `style.css` — responsive visual design and light/dark themes.
- `script.js` — dashboard navigation, profile editor, quizzes, exam roadmaps, deadlines, study assistant, marks calculator, smart gap planner, opportunity matching, and consistency score.
- `vendor/` — bundled Chart.js, Font Awesome icons, and the Bricolage Grotesque and Instrument Sans fonts, so the site works fully offline.
- `learnix-mark.png` — transparent logo mark used in the website and favicon.
- `learnix-full-logo.png` — the full original logo artwork, included for optional use in presentations.

## Run locally

1. Extract this folder.
2. Open the folder in Visual Studio Code.
3. Install/use the **Live Server** extension if needed.
4. Right-click `index.html` and choose **Open with Live Server**.

Keep `index.html`, `style.css`, `script.js`, `learnix-mark.png`, and the `vendor/` folder together. All fonts, icons, and chart code are bundled locally, so no internet connection is needed.

## Profile and data

Open the profile from the avatar in the top-right corner or the ellipsis beside the sidebar profile. Choose **Edit profile** to change the display name and role/course; initials and the welcome greeting update automatically. Profile details and dashboard data are saved in the current browser's local storage.

## Important limitations

This is a frontend prototype and has no authentication or cloud database. The study assistant and early-warning tools use local rules and sample data; a live AI model is not connected. Do not enter sensitive real student data or expose the app publicly without adding appropriate authentication, authorization, backend validation, and privacy protections.
