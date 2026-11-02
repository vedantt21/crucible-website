# Crucible Ventures website

This is our editable copy of the Crucible Ventures site captured from
[crucible-ventures-draft.netlify.app](https://crucible-ventures-draft.netlify.app/)
on 2 November 2026.
The HTML, CSS, JavaScript and images are in this repository. The `consultancy-site`
branch brought this copy into the repository. Once merged, `main` is the source
for the Vercel Production deployment. Feature branches get Vercel previews.

## Run locally

You need Python 3:

```bash
git clone https://github.com/vedantt21/crucible-website.git
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

Open a pull request into `main`. Pushing a feature branch gives it a Vercel
preview, currently viewable by people with access to the Vercel project. Merging
into `main` automatically deploys the update to Vercel Production.
Netlify access is not needed to edit or deploy this copy.

## Contact form

The homepage and Contact page send enquiries to `admin@crucibleventures.vc`
through [FormSubmit](https://formsubmit.co/). There are no API keys or mail
passwords in the website. The visitor's email becomes the reply-to address.

The mailbox owner must click the FormSubmit activation link sent after the
first submission. Check the inbox and spam folder. FormSubmit queues submissions
until activation; after activation, submit another enquiry and confirm receipt
in the inbox before relying on the form. Keep the activation link private.

With JavaScript, submissions stay on the page and only show confirmation after
FormSubmit accepts the request. Failed requests preserve the message for retry.
Without JavaScript, the browser posts directly to FormSubmit and uses its
confirmation page and CAPTCHA. The hidden `_honey` field filters obvious bots.

Code changes must be deployed to Vercel before the live `.vc` forms use this
connection. Local previews also submit real enquiries when sending succeeds.
