# Technical Manual

This document is for developers who need to maintain, debug, or extend the Guide on the Side WordPress plugin. It covers architecture, data flow, the REST API, the data model, and step-by-step guidance for common extension tasks.

For setting up a local environment, see [INSTALLATION.md](INSTALLATION.md).

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Data Model](#data-model)
4. [REST API Reference](#rest-api-reference)
5. [Frontend (React)](#frontend-react)
6. [How to Extend the System](#how-to-extend-the-system)
   - [Adding a New Slide Type](#adding-a-new-slide-type)
   - [Adding a New REST Endpoint](#adding-a-new-rest-endpoint)
   - [Adding a New Admin Page](#adding-a-new-admin-page)
7. [Certificate System](#certificate-system)
8. [Analytics](#analytics)
9. [Student Playback](#student-playback)
10. [Testing](#testing)
11. [Pressbooks Compatibility](#pressbooks-compatibility)
12. [Migration Notes](#migration-notes)
13. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

The plugin is a self-contained WordPress plugin with two distinct layers:

**PHP (backend)**
- Registers a Custom Post Type (`gots_tutorial`) to store tutorials and slides in the WordPress database via post meta.
- Exposes a REST API under the `gots/v1` namespace that the React frontend consumes.
- Handles PDF certificate generation via dompdf.
- Handles analytics tracking (slide views, completions).

**React (frontend)**
- A single-page application (SPA) rendered inside the WordPress admin area.
- Uses `HashRouter` (not `BrowserRouter`) so routing works inside the WP admin iframe environment without server-side config.
- Communicates exclusively through the `gots/v1` REST API using the WordPress nonce (`window.gotsConfig.nonce`) for authentication.
- A separate student-facing SPA (`StudentApp.jsx`) is embedded on the public side for tutorial playback.

**Data flow:**

```
Browser (React SPA)
    │  fetch() with WP nonce
    ▼
WordPress REST API  (/wp-json/gots/v1/...)
    │  get_post_meta / update_post_meta
    ▼
WordPress Database  (wp_posts + wp_postmeta)
```

---

## Project Structure

```
guide-on-the-side-project-4820/
├── INSTALLATION.md
├── TECH_MANUAL.md
└── wp-plugin/
    └── guide-on-the-side/
        ├── guide-on-the-side.php    # Plugin entry point: loads includes, registers hooks
        ├── includes/
        │   ├── util.php             # UUID generation helper
        │   ├── post-types.php       # Registers gots_tutorial Custom Post Type
        │   ├── rest-routes.php      # Registers all REST API routes
        │   ├── enqueue.php          # Enqueues JS/CSS assets, injects gotsConfig
        │   ├── certificates.php     # Certificate issuance, token signing, rate limiting
        │   ├── certificate-pdf.php  # PDF rendering via dompdf
        │   ├── certificate-templates.php  # Template CRUD
        │   ├── completion.php       # Completion proof generation and validation
        │   ├── public-playback.php  # Shortcode and public embed for student playback
        │   ├── analytics.php        # REST routes for event tracking
        │   ├── tutorial-themes.php  # Tutorial theme/styling options
        │   └── pdf-renderer.php     # Low-level PDF layout helpers
        ├── admin/
        │   └── page.php             # Admin page HTML shell (mounts the React SPA)
        ├── src/
        │   ├── main.jsx             # Admin SPA entry point
        │   ├── student.jsx          # Student SPA entry point
        │   ├── App.jsx              # Admin router and top-level layout
        │   ├── StudentApp.jsx       # Student playback router
        │   ├── index.css            # Admin styles
        │   ├── student.css          # Student playback styles
        │   ├── services/
        │   │   ├── tutorialApi.js   # All tutorial CRUD — wraps fetch() calls
        │   │   └── mediaLibrary.js  # WordPress Media Library integration
        │   ├── components/
        │   │   ├── Sidebar.jsx
        │   │   ├── ShareModal.jsx
        │   │   ├── PdfPaneEmbed.jsx
        │   │   ├── AnalyticsSummaryCard.jsx
        │   │   ├── AnalyticsTrendChart.jsx
        │   │   ├── DateRangeFilter.jsx
        │   │   └── SlidePerformanceTable.jsx
        │   └── pages/
        │       ├── LandingDashboard.jsx
        │       ├── TutorialListPage.jsx
        │       ├── TutorialEditorPage.jsx
        │       ├── CreateTutorialPage.jsx
        │       ├── TutorialAnalyticsPage.jsx
        │       ├── TutorialThemesPage.jsx
        │       ├── CertificateTemplatesPage.jsx
        │       └── CertificateVerifyPage.jsx
        ├── build/                   # Compiled admin SPA assets
        ├── build-student/           # Compiled student SPA assets
        ├── vendor/                  # Composer dependencies (dompdf)
        ├── package.json
        ├── vite.config.js
        ├── jest.config.cjs
        └── babel.config.cjs
```

---

## Data Model

Tutorials are stored as WordPress posts of the custom type `gots_tutorial`. All structured data (slides, settings, etc.) lives in post meta.

### Tutorial

| Field       | Storage | Description |
|-------------|---------|-------------|
| id          | `WP_Post->ID` | WordPress post ID |
| uuid        | `_gots_uuid` (post meta) | Stable UUID, used by the student embed |
| title       | `WP_Post->post_title` | Tutorial title |
| description | `_gots_description` (post meta) | Tutorial description |
| status      | `_gots_status` (post meta) | `draft`, `published`, or `archived` |
| archived    | `_gots_archived` (post meta) | Boolean |
| slides      | `_gots_slides` (post meta, JSON) | Array of slide objects |
| createdAt   | `WP_Post->post_date` | ISO 8601 |
| updatedAt   | `WP_Post->post_modified` | ISO 8601 |

### Slide

Slides are stored as a JSON array in the `_gots_slides` post meta field.

| Field    | Type    | Description |
|----------|---------|-------------|
| slideId  | string  | UUID |
| type     | string  | `wysiwyg`, `mcq`, `textQuestion`, or `mediaUpload` |
| title    | string  | Slide title |
| order    | integer | Display order (0-indexed) |
| content  | string  | HTML content (`wysiwyg` type only) |
| question | string  | Question text (`mcq`, `textQuestion`) |
| choices  | array   | Answer choices (`mcq` only) |
| answer   | string  | Correct answer index (`mcq`) or expected text (`textQuestion`) |
| mediaUrl | string  | Media URL (`mediaUpload` only) |

### Certificate

Certificates are stored as posts of type `gots_certificate` with the following meta:

| Meta Key | Description |
|----------|-------------|
| `_gots_cert_tutorial_id` | Parent tutorial ID |
| `_gots_cert_recipient` | Recipient name |
| `_gots_cert_token` | Signed download token |
| `_gots_cert_issued_at` | Issuance timestamp |
| `_gots_cert_template_id` | Certificate template used |

---

## REST API Reference

All endpoints are under `/wp-json/gots/v1/`. Endpoints that modify data require the caller to be logged in with `edit_posts` capability and to include a valid WordPress nonce in the `X-WP-Nonce` header (injected automatically by `tutorialApi.js`).

### Tutorials

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/tutorials` | Public | List tutorials. Query: `?status=draft\|published\|archived` |
| GET | `/tutorials/{id}` | Public | Get a single tutorial |
| POST | `/tutorials` | `edit_posts` | Create tutorial (starts with 2 empty WYSIWYG slides) |
| PUT | `/tutorials/{id}` | `edit_posts` | Update tutorial. Slides merged by `slideId` |
| DELETE | `/tutorials/{id}` | `edit_posts` | Delete tutorial |

**PUT slide merge behavior:** existing slide fields are preserved unless explicitly included in the request body. To remove a field, pass it as `null`.

### Certificates

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/tutorials/{id}/certificate/issue` | Public | Issue (or retrieve existing) certificate |
| GET  | `/certificates/{token}/download` | Public (signed token) | Stream PDF download |
| GET  | `/tutorials/{id}/certificate-settings` | `edit_posts` | Get cert settings for tutorial |
| PUT  | `/tutorials/{id}/certificate-settings` | `edit_posts` | Save cert settings |
| GET  | `/tutorials/{id}/certificates` | `edit_posts` | List issued certificates |

### Certificate Templates

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/certificate-templates` | `edit_posts` | List templates |
| POST | `/certificate-templates` | `edit_posts` | Create template |
| PUT | `/certificate-templates/{id}` | `edit_posts` | Update template |
| DELETE | `/certificate-templates/{id}` | `edit_posts` | Soft-delete template |
| POST | `/certificate-templates/{id}/preview` | `edit_posts` | Preview PDF inline |

### Analytics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/tutorials/{id}/analytics/event` | Public | Track a slide view or completion event |
| GET  | `/tutorials/{id}/analytics` | `edit_posts` | Get aggregated analytics for a tutorial |

---

## Frontend (React)

### Configuration

On page load, WordPress injects a global `window.gotsConfig` object via `includes/enqueue.php`:

```js
window.gotsConfig = {
  apiBase: '/wp-json/gots/v1',
  nonce:   '<wp_rest nonce>',
  userId:  123,
  // ...
}
```

All API calls in `src/services/tutorialApi.js` read from this object. Do not hardcode the API base URL.

### Routing

The admin SPA uses `HashRouter`. Routes are defined in `src/App.jsx`. The student SPA uses its own router in `src/StudentApp.jsx`.

### Adding a new page

1. Create a new file under `src/pages/`, e.g. `MyNewPage.jsx`.
2. Add a `<Route>` in `src/App.jsx`.
3. Add a nav link in `src/components/Sidebar.jsx` if it needs to appear in the sidebar.

---

## How to Extend the System

### Adding a New Slide Type

Slides have a `type` field that drives both the editor UI and the student playback renderer. To add a new type (e.g. `video`):

**1. Backend — update the slide schema**

Open `includes/rest-routes.php`. Find the `PUT /tutorials/{id}` handler. The slide merge logic iterates over the slides array — no schema change is required there, but if you want server-side validation of new fields, add them to the per-slide sanitization block.

**2. Frontend editor — add an editor component**

In `src/pages/TutorialEditorPage.jsx`, find the slide type switch (look for `case 'wysiwyg':`, etc.). Add a new `case 'video':` block that renders your editor UI for the new type.

**3. Frontend playback — add a renderer**

In `src/StudentApp.jsx` (or the student page component), find the equivalent slide-type switch and add a renderer for the new type.

**4. Update the "add slide" menu**

In `TutorialEditorPage.jsx`, find where new slide types are listed (the dropdown or button group for adding slides) and add an entry for `video`.

---

### Adding a New REST Endpoint

1. Open `includes/rest-routes.php`.
2. Find the `register_routes()` function (called via the `rest_api_init` hook in `guide-on-the-side.php`).
3. Add a new `register_rest_route()` call:

```php
register_rest_route( 'gots/v1', '/my-resource', [
    'methods'             => 'GET',
    'callback'            => [ $this, 'handle_my_resource' ],
    'permission_callback' => function() {
        return current_user_can( 'edit_posts' );
    },
] );
```

4. Add the handler method to the same class.
5. If the endpoint should be called from the React frontend, add a wrapper function in `src/services/tutorialApi.js`.

---

### Adding a New Admin Page

1. Create a React component under `src/pages/`, e.g. `MySettingsPage.jsx`.
2. Register a route in `src/App.jsx`:

```jsx
<Route path="/my-settings" element={<MySettingsPage />} />
```

3. Add a link in `src/components/Sidebar.jsx`:

```jsx
<NavLink to="/my-settings">My Settings</NavLink>
```

4. If the page needs its own PHP-side data or a separate WordPress admin menu entry, register it in `guide-on-the-side.php` using `add_submenu_page()`.

---

## Certificate System

### Overview

Students who complete a published tutorial can generate a PDF certificate. Librarians manage reusable templates and assign one to each tutorial.

### Librarian setup

1. Go to **Guide on the Side → Certificates** in the admin sidebar.
2. Create at least one template (preset styles: `classic`, `minimal`, `formal`).
3. Open a tutorial in the editor, scroll to **Certificate Settings**.
4. Enable the certificate, optionally select a template and override the issuer name.
5. Save.

### Student flow

1. Student completes the tutorial (reaches the completion screen).
2. A certificate section appears with a name input (prefilled for logged-in users).
3. Student clicks **Generate Certificate** — the server validates the completion proof and renders the PDF.
4. A **Download Certificate** button appears.

### Key constants (in `includes/certificates.php`)

| Constant | Default | Description |
|----------|---------|-------------|
| `GOTS_CERT_DOWNLOAD_TTL` | 86400 (24h) | Download token validity in seconds |
| `GOTS_CERT_PROOF_TTL` | 900 (15min) | Completion proof validity in seconds |
| `GOTS_CERT_RATE_LIMIT` | 5/hour | Max certificate requests per IP |

### Troubleshooting certificates

**"dompdf is not installed"** — Run `composer install --no-dev` in the plugin directory.

**PDF renders blank or missing styles** — dompdf has limited CSS support. Avoid `flexbox`, `grid`, and advanced selectors. Use block-level and table-based layouts.

**Large background image causes PHP memory exhaustion** — Use images under 1 MB. Background images are embedded as base64 data URIs; large images multiply memory usage ~1.37×. Increase `memory_limit` in `php.ini` as a last resort.

**PDF file write fails** — Ensure WordPress can write to `wp-content/uploads/`. Check directory permissions (`755`) and available disk space.

**Completion proof expired** — The proof is valid for 15 minutes. If a student takes longer than 15 minutes on the final slide, they need to reload and complete again.

---

## Analytics

Analytics events are tracked via `POST /gots/v1/tutorials/{id}/analytics/event`. The frontend fires these automatically during student playback (slide views, completions).

Aggregated data is displayed in `src/pages/TutorialAnalyticsPage.jsx` using the `AnalyticsTrendChart`, `AnalyticsSummaryCard`, and `SlidePerformanceTable` components.

The backend aggregation logic lives in `includes/analytics.php`.

---

## Student Playback

The student-facing tutorial player is a separate React SPA compiled into `build-student/`. It is embedded on public WordPress pages via a shortcode registered in `includes/public-playback.php`.

The student app entry point is `src/student.jsx` → `src/StudentApp.jsx`.

To embed a tutorial on a WordPress page or post, use:

```
[guide_on_the_side id="<tutorial-uuid>"]
```

---

## Testing

The test suite covers the two frontend service modules (`tutorialApi.js` and `mediaLibrary.js`).

```bash
cd wp-plugin/guide-on-the-side
npm test
```

- **Framework**: Jest + jsdom
- **Config**: `jest.config.cjs`, `babel.config.cjs`
- **Test files**: `src/services/tutorialApi.test.js`, `src/services/mediaLibrary.test.js`

See [TESTING_LOG.md](wp-plugin/guide-on-the-side/TESTING_LOG.md) for the full test log and scenario descriptions.

When adding new service functions to `tutorialApi.js` or `mediaLibrary.js`, add corresponding test cases in the respective test file following the existing patterns (mock `fetch`, assert request shape, assert return value).

---

## Pressbooks Compatibility

This plugin is compatible with WordPress instances that have Pressbooks installed. It uses only standard WordPress APIs:

- Custom Post Types
- WordPress REST API
- WordPress Media Library

No Pressbooks-specific APIs are used.

---

## Migration Notes

This plugin was migrated from a standalone application. Key architectural changes:

| Concern | Before | After |
|---------|--------|-------|
| Backend | Express.js (Node) | WordPress REST API (PHP) |
| Persistence | JSON files on disk | WordPress posts + post meta |
| File uploads | Multer | WordPress Media Library |
| Client-side routing | React Router `BrowserRouter` | React Router `HashRouter` |
| Authentication | None | WordPress capabilities (`edit_posts`) |
