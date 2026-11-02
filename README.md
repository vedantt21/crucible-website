# Crucible Ventures website

This is our editable copy of the Crucible Ventures site previously hosted at
[crucible-ventures-draft.netlify.app](https://crucible-ventures-draft.netlify.app/).
The HTML, CSS, JavaScript and images are in this repository. The `consultancy-site`
branch is for review; the existing Vercel Production deployment still uses `main`.

## Run locally

You need Python 3:

```bash
git clone --branch consultancy-site https://github.com/vedantt21/crucible-website.git
cd crucible-website
python3 tools/serve.py
```

Open [http://localhost:8000/](http://localhost:8000/). The local server supports
the site's page URLs, such as `/what-we-do`, and disables browser caching.
Fonts and animation libraries load from public CDNs, so use an internet
connection for the complete design.

## Edit the site

- Edit `index.html`, `what-we-do.html`, `projects.html`, `community.html`,
  `team.html` or `contact.html` for page content.
- Edit `styles.css` for design and the root `.js` files for interactions.
- Add or replace images in `assets/img/`, then update their paths in the HTML.

There is no build step. Save a file and refresh the local page. When changing
CSS or JavaScript, update its `?v=` number in the HTML pages that load it so
visitors get the new version after deployment.

To share a change for review:

```bash
git switch -c your-change-name
git add -A
git commit -m "Describe your change"
git push -u origin your-change-name
```

Open a pull request into `consultancy-site`. Pushing a branch gives it a Vercel
preview; it does not replace Production. Once this site is approved and moved
to `main`, future changes to `main` will update the Vercel Production site.
Netlify access is not needed to edit or deploy this copy.

## Before replacing Production

The contact form currently shows a success message but has no delivery backend.
Connect it to a form service before relying on submissions.
