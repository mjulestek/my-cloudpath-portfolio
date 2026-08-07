> **Note:** this is the original design/content reference document supplied
> with the site, kept here for content-editing guidance (what to customize,
> where the data lives, design tokens). It is not deployed — it lived in the
> site root before integration and has been moved here so it isn't synced to
> S3 with the rest of `public/`.
>
> Its "Deployment" section below describes generic options (S3 static
> website hosting, GitHub Pages, Netlify) that do **not** reflect how this
> project actually deploys. This repo uses a private S3 bucket behind
> CloudFront with Origin Access Control, provisioned by Terraform and
> deployed by Jenkins — see **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**
> for the real, current procedure.

# CloudPath — DevOps & Cloud Engineer Portfolio

A fully static portfolio site for a DevOps/Cloud engineer. Pure HTML5, CSS3, and
vanilla ES6 — no build step, no framework, no backend, no npm install required.
Open `index.html` in a browser and it works.

## Design direction

The site is styled like a calm, well-run status dashboard rather than a generic
personal site: a dark "control plane" palette (graphite background, signal-teal
accent), a live terminal in the hero that types real infra commands, and a
status strip ("All systems operational") that runs across every page. Numbered
sequences (CI/CD stages, timelines) are used only where the content is
genuinely ordered.

- **Display type:** Space Grotesk
- **Body type:** Inter
- **Data / code type:** JetBrains Mono
- **Accent:** `#4fd1c5` (signal teal), with amber for build/warning states

## Project structure

```
/
├── index.html                 Home
├── about.html                 Bio, values, experience, education, skills
├── projects.html               Filterable project grid
├── project-details.html        Renders a project from ?id=
├── certifications.html         Certificate cards + timeline
├── blog.html                   Filterable, paginated blog grid
├── blog-post.html              Renders an article from ?slug=
├── resume.html                 Printable resume + PDF download
├── contact.html                Contact form, FAQ
├── 404.html                    Custom not-found page
├── privacy.html                Privacy policy
├── robots.txt
├── sitemap.xml
├── README.md
└── assets/
    ├── css/
    │   ├── style.css           Design tokens, layout, all components
    │   ├── animations.css      Keyframes + scroll-reveal utilities
    │   └── responsive.css      Breakpoints (1024 / 860 / 600) + print
    ├── js/
    │   ├── navigation.js       Injects nav/footer, mobile menu, theme toggle
    │   ├── main.js             Tabs, accordion, forms, tech marquee, copy/share
    │   ├── animations.js       Scroll reveal, counters, terminal typing
    │   ├── search.js           Command-palette search (press "/")
    │   ├── projects.js         Project data + grid/detail rendering
    │   └── blog.js              Blog data + grid/post rendering
    ├── images/
    │   ├── favicon.svg
    │   └── og-cover.svg
    └── resume.pdf              Generated resume, linked from resume.html
└── data/
    ├── projects.json           Reference export of the project data
    ├── blog.json                Reference export of the blog data
    └── certificates.json       Reference export of the certification data
```

## Why data lives in JS, not fetched JSON

Browsers block `fetch()` of local files under the `file://` protocol (CORS),
so a portfolio that fetches JSON on load breaks the moment someone double-clicks
`index.html`. To guarantee "works immediately, no server," the actual project
and blog content is embedded directly in `assets/js/projects.js` and
`assets/js/blog.js` as JS arrays (`PROJECTS`, `BLOG_POSTS`). The `data/*.json`
files mirror that same content 1:1 as a portable reference — useful if you later
want to swap in a real fetch() call once the site is hosted over http(s), or
feed the same data into another tool.

## Customizing content

- **Projects:** edit the `PROJECTS` array at the top of `assets/js/projects.js`.
  Each project's card art is generated automatically as an abstract topology
  diagram — no image files to replace.
- **Blog posts:** edit the `BLOG_POSTS` array in `assets/js/blog.js`. Content
  blocks support `{ type: 'p' }`, `{ type: 'h2' }`, and `{ type: 'code' }`.
- **Certifications:** edit the cards directly in `certifications.html` (and
  update `data/certificates.json` to match if you want the export current).
- **Name, bio, resume:** update `index.html`, `about.html`, `resume.html`, and
  regenerate `assets/resume.pdf` if you keep a build script for it.
- **Colors/fonts:** all design tokens are CSS custom properties at the top of
  `assets/css/style.css` under `:root`. Change `--accent`, `--bg`, etc. once
  and the whole site updates.
- **Domain:** replace `https://example.com` in the `<link rel="canonical">`
  and Open Graph tags on every page, plus in `robots.txt` and `sitemap.xml`.

## Known limitations to be aware of

- `project-details.html` and `blog-post.html` render content client-side based
  on a `?id=` / `?slug=` query parameter. This keeps the page count small, but
  search engines that don't execute JavaScript won't see per-project content,
  and each "page" shares one URL pattern rather than a unique static file. If
  SEO for individual projects/posts matters more than build simplicity, the
  next step is to pre-render one static HTML file per project/post from the
  same data.
- `og-cover.svg` is an SVG social preview image. Some platforms (notably
  Twitter/X) render OG images more reliably as PNG/JPG — export a PNG from
  the SVG if you see a blank preview when sharing a link.
- The contact form has no backend: it opens the visitor's email client via a
  `mailto:` link. Swap in a form service (Netlify Forms, Formspree, etc.) if
  you want submissions collected without opening an email client.

## Local development

No build step needed — just open `index.html`. If you prefer a local server
(some browsers are stricter about `file://` than others for things like the
clipboard API used by "Copy" buttons):

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

## Deployment

### Amazon S3 + CloudFront
1. Create an S3 bucket, enable **static website hosting**, set `index.html`
   as the index document and `404.html` as the error document.
2. Upload the entire contents of this folder to the bucket root (keep the
   `assets/` and `data/` folders intact).
3. Create a CloudFront distribution pointing at the bucket (or the bucket's
   website endpoint), with `index.html` as the default root object.
4. Set a CloudFront custom error response: 404 → `/404.html`, HTTP 200.
5. Point your domain's DNS at the CloudFront distribution.

### GitHub Pages
1. Push this folder to a repository.
2. In **Settings → Pages**, set the source to the branch/root containing
   these files.
3. GitHub Pages automatically serves `404.html` for missing routes.

### Netlify
1. Drag-and-drop this folder onto Netlify, or connect the repository.
2. No build command needed — leave it blank; publish directory is `/`.
3. Netlify automatically serves `404.html` for missing routes.

### Any static host
This site has zero server-side dependencies. Any host that can serve static
files over HTTP(S) will work identically.

## Performance & accessibility notes

- No JS framework, no build tooling, no external dependencies beyond Google
  Fonts (optional — remove the `<link>` tags and set `--font-*` to system
  fonts if you want a fully offline-capable, zero-external-request site).
- All interactive elements are keyboard reachable with visible focus states.
- `prefers-reduced-motion` is respected across scroll reveals, the terminal
  typing effect, and smooth scrolling.
- Images are SVG (vector, no large binary assets) so there's nothing to lazy
  load or compress further out of the box.
