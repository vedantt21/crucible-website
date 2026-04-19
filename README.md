# Crucible Ventures Sample Website

This is a small static sample repository for a simple "Crucible Ventures" website.

## Files

- `index.html` - homepage with the scroll intro
- `about.html` - about page
- `what-we-do.html` - focus areas page
- `contact.html` - contact page
- `styles.css` - page styling
- `script.js` - intro scroll animation and auto-hiding header behavior

## Run locally

Because this site is fully static, you can open `index.html` directly in a browser.

If you want to serve it locally instead:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Test

Run the static lint checks with:

```bash
npm run lint
```

Run the static site smoke tests with:

```bash
npm test
```

The linter checks text hygiene, basic HTML accessibility conventions, JSON
syntax, CSS brace balance, and JavaScript syntax. The smoke test checks that
pages include their shared assets, local links and images resolve, key scroll
tuning variables are present, and referenced JavaScript has valid syntax. Both
commands run in GitHub Actions via `.github/workflows/ci.yml`.
