MyCuisine — Private Recipe Club

WHAT THIS IS
A polished static website you can upload to GitHub Pages.
It is split like your ROAR build:

1. index.html
   Public/friends recipe library.

2. admin.html
   Admin portal for adding recipes, editing recipes, managing categories, changing settings, and exporting the data file.

3. recipes.js
   The main data file for recipes, categories, dietary restrictions, category rules, and site settings.

4. app.js
   Recipe library logic.

5. admin.js
   Admin portal logic.

6. styles.css
   Million-dollar luxury theme.

7. assets/
   MyCuisine wordmark and emblem SVG files.

DEFAULT ACCESS
Friends access code:
kitchen2026

Admin password:
mycuisine2026

Admin shortcut:
Mac: Command + Option + A
Windows: Ctrl + Alt + A

HOW TO UPLOAD TO GITHUB
1. Create a new GitHub repository.
2. Upload everything in this folder.
3. Go to Settings > Pages.
4. Set Source to Deploy from branch.
5. Choose main branch and root folder.
6. Save.
7. Open the GitHub Pages URL.

HOW TO UPDATE RECIPES
1. Open admin.html.
2. Enter the admin password.
3. Add or edit recipes.
4. Click Export recipes.js.
5. Upload/replace recipes.js in GitHub.
6. Refresh the website.

IMPORTANT SECURITY NOTE
This is a static GitHub Pages build. The access code and admin password are light gates only because the code is visible in the browser. This is good for a friend demo/private-feeling page, but it is not real security.

For real friends-only accounts later, connect the website to Supabase Auth, Firebase Auth, Netlify password protection, or Vercel protection.

DIETARY NOTE
The dietary checker is keyword-based. It can help flag obvious ingredients, but it should not replace reading ingredient labels or checking for cross-contamination.
