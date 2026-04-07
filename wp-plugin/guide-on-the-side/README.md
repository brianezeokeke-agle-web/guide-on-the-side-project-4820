# Guide on the Side – WordPress Plugin

A WordPress plugin that provides an interactive tutorial creation and management system. This plugin was migrated from a standalone React + Express + JSON-file app.

## Features

- Create and manage interactive tutorials
- Multiple slide types:
  - **WYSIWYG**: Rich text content slides
  - **MCQ**: Multiple choice question slides
  - **Text Question**: Free-text question slides
  - **Media Upload**: Image/media slides using WordPress Media Library
- Tutorial states: Draft, Published, Archived
- Drag-and-drop slide reordering
- Auto-save on field blur
- **PDF Certificate Generation** — students can download a certificate on tutorial completion (see below)

## Requirements

- WordPress 5.8+
- PHP 7.4+
- Node.js 16+ (for building)
- npm 8+ (for building)
- Composer (for PDF certificate feature — installs dompdf)

## Installation

### 1. Build the Plugin

Navigate to the plugin directory and install dependencies:

```bash
cd wp-plugin/guide-on-the-side
npm install
npm run build
```

This will create a `dist/` folder with the compiled React application.

### 2. Install in WordPress

Copy the entire `guide-on-the-side` folder to your WordPress plugins directory:

```bash
cp -r wp-plugin/guide-on-the-side /path/to/wordpress/wp-content/plugins/
```

Or create a symbolic link for development:

```bash
ln -s /path/to/wp-plugin/guide-on-the-side /path/to/wordpress/wp-content/plugins/guide-on-the-side
```

### 2b. Install PHP Dependencies (PDF certificates)

The PDF certificate feature requires dompdf. Run Composer in the plugin directory:

```bash
cd wp-plugin/guide-on-the-side
composer install --no-dev --optimize-autoloader
```

If Composer is not installed, download it from https://getcomposer.org. The plugin boots safely without the `vendor/` directory — certificate issuance will return an error until dompdf is installed.

### 3. Activate the Plugin

1. Go to **WordPress Admin → Plugins**
2. Find **Guide on the Side**
3. Click **Activate**

### 4. Access the Plugin

After activation, you'll see **Guide on the Side** in the WordPress admin menu. Click it to access the tutorial management interface.

## Development

### Development Server

For development with hot reloading:

```bash
cd wp-plugin/guide-on-the-side
npm run dev
```

Note: The development server is mainly for testing React components. For full WordPress integration testing, use `npm run build` and test within WordPress.

### Production Build

```bash
npm run build
```

### Project Structure

```
guide-on-the-side/
├── guide-on-the-side.php    # Main plugin file
├── includes/
│   ├── util.php             # Utility functions (UUID generation)
│   ├── post-types.php       # Custom Post Type registration
│   ├── rest-routes.php      # REST API endpoints
│   └── enqueue.php          # Script/style enqueuing
├── admin/
│   └── page.php             # Admin page template
├── src/
│   ├── main.jsx             # React entry point
│   ├── services/
│   │   ├── tutorialApi.js   # API abstraction layer
│   │   └── mediaLibrary.js  # WP Media Library integration
│   ├── components/
│   │   └── Sidebar.jsx      # Navigation sidebar
│   └── pages/
│       ├── LandingDashboard.jsx
│       ├── CreateTutorialPage.jsx
│       ├── TutorialListPage.jsx
│       ├── TutorialEditorPage.jsx
│       ├── ArchivedListPage.jsx
│       └── PublishedListPage.jsx
├── dist/                    # Built assets (after npm run build)
├── package.json
└── vite.config.js
```

## REST API Endpoints

All endpoints are under the `gots/v1` namespace.

### List Tutorials

```
GET /wp-json/gots/v1/tutorials
```

Query parameters:
- `status` - Filter by status: `draft`, `published`, `archived`

### Get Tutorial

```
GET /wp-json/gots/v1/tutorials/{id}
```

### Create Tutorial

```
POST /wp-json/gots/v1/tutorials
Content-Type: application/json

{
  "title": "My Tutorial",
  "description": "Tutorial description"
}
```

Creates a tutorial with 2 empty WYSIWYG slides.

### Update Tutorial

```
PUT /wp-json/gots/v1/tutorials/{id}
Content-Type: application/json

{
  "title": "Updated Title",
  "description": "Updated description",
  "status": "published",
  "archived": false,
  "slides": [...]
}
```

Slides are merged by `slideId` - existing fields are preserved unless explicitly overwritten.

## Data Model

### Tutorial

| Field       | Type    | Description                              |
|-------------|---------|------------------------------------------|
| id          | integer | WordPress post ID                        |
| uuid        | string  | Unique identifier (post meta)            |
| title       | string  | Tutorial title                           |
| description | string  | Tutorial description                     |
| status      | string  | `draft`, `published`, or `archived`      |
| archived    | boolean | Whether tutorial is archived             |
| slides      | array   | Array of slide objects                   |
| createdAt   | string  | ISO 8601 creation date                   |
| updatedAt   | string  | ISO 8601 last modified date              |

### Slide

| Field    | Type    | Description                                          |
|----------|---------|------------------------------------------------------|
| slideId  | string  | UUID for the slide                                   |
| type     | string  | `wysiwyg`, `mcq`, `textQuestion`, or `mediaUpload`   |
| title    | string  | Slide title                                          |
| order    | integer | Display order (0-indexed)                            |
| content  | string  | HTML content (wysiwyg)                               |
| question | string  | Question text (mcq, textQuestion)                    |
| choices  | array   | Answer choices (mcq only)                            |
| answer   | string  | Correct answer index (mcq) or expected answer (text) |
| mediaUrl | string  | Media URL (mediaUpload only)                         |

## Certificate PDF Feature

### Overview

Students who complete a published tutorial can generate and download a PDF certificate of completion. Librarians (users with `edit_posts`) manage reusable templates and assign one to each tutorial.

### Setup (librarian)

1. Go to **Guide on the Side → Certificates** in the admin sidebar.
2. Create at least one template (preset: `classic`, `minimal`, or `formal`).
3. Open a tutorial in the editor and scroll to **Certificate Settings** at the bottom.
4. Check **Enable completion certificate** and optionally select a template and issuer name override.
5. Click **Save Certificate Settings**.

### Student flow

1. Student completes the tutorial (reaches the completion screen).
2. A certificate section appears with a name input (prefilled for logged-in users).
3. Student clicks **Generate Certificate** — the server validates eligibility and renders the PDF.
4. A **Download Certificate** button appears; clicking it downloads the PDF.

### Certificate REST API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/gots/v1/tutorials/{id}/certificate/issue` | Public | Issue (or retrieve existing) certificate |
| GET  | `/gots/v1/certificates/{token}/download`   | Public (signed token) | Stream PDF |
| GET  | `/gots/v1/certificate-templates`           | `edit_posts` | List templates |
| POST | `/gots/v1/certificate-templates`           | `edit_posts` | Create template |
| PUT  | `/gots/v1/certificate-templates/{id}`      | `edit_posts` | Update template |
| DELETE | `/gots/v1/certificate-templates/{id}`    | `edit_posts` | Soft-delete template |
| POST | `/gots/v1/certificate-templates/{id}/preview` | `edit_posts` | Preview PDF (inline) |
| GET  | `/gots/v1/tutorials/{id}/certificate-settings` | `edit_posts` | Get cert settings |
| PUT  | `/gots/v1/tutorials/{id}/certificate-settings` | `edit_posts` | Save cert settings |
| GET  | `/gots/v1/tutorials/{id}/certificates`     | `edit_posts` | List issued certificates |

### Certificate Acceptance Tests (manual)

- [ ] Completing a published tutorial shows the certificate section
- [ ] Logged-in users see their WP display name prefilled; they can edit it
- [ ] Anonymous users can enter any name
- [ ] Clicking Generate issues the certificate and shows the Download button
- [ ] Download button triggers a PDF file download
- [ ] PDF contains correct recipient name, tutorial title, date, and issuer name
- [ ] Completing the same tutorial again returns the previously issued certificate (idempotent)
- [ ] Requests exceeding 5/hour from the same IP are rate-limited (429)
- [ ] Expired or tampered download tokens return 403
- [ ] Certificates are disabled when setting is not enabled
- [ ] Admin can create/edit/delete templates in the Certificates admin page
- [ ] Preview button opens a sample PDF in a new browser tab
- [ ] Tutorial cert settings (enable, template, issuer) persist after page refresh
- [ ] Admin can view issued certificates via `/tutorials/{id}/certificates` endpoint

### Troubleshooting

**"dompdf is not installed" error**
Run `composer install --no-dev` in the plugin directory. Check that `vendor/autoload.php` exists.

**PDF renders blank or missing styles**
dompdf has limited CSS support. Avoid `flexbox`, `grid`, or advanced CSS. Stick to block-level elements and inline/table-based layouts.

**Large background image causes PHP memory exhaustion**
Increase `memory_limit` in `php.ini` or use a smaller image (< 1 MB recommended). Background images are embedded as base64 data URIs; large images multiply memory usage ~1.37×.

**PDF file write fails**
Ensure WordPress can write to `wp-content/uploads/`. Check directory permissions (typically `755`) and disk space.

**Download link expires too soon**
The default TTL is 24 hours. This is set by `GOTS_CERT_DOWNLOAD_TTL` in `includes/certificates.php`.

**Completion proof expired**
The proof is valid for 15 minutes (`GOTS_CERT_PROOF_TTL`). If a student takes longer than 15 minutes on the last slide, reload the tutorial page and complete again.

## Acceptance Tests

After installation, verify the following:

- [ ] Plugin activates without errors
- [ ] "Guide on the Side" menu appears in WP admin
- [ ] Landing dashboard loads and shows tutorial counts
- [ ] Can create a new tutorial
- [ ] New tutorial has 2 empty slides
- [ ] Can edit tutorial title and description
- [ ] Can add/remove slides
- [ ] Can reorder slides via drag-and-drop
- [ ] WYSIWYG editor saves content
- [ ] MCQ editor saves question, choices, and answer
- [ ] Text Question editor saves question and expected answer
- [ ] Media Upload opens WordPress Media Library
- [ ] Can publish/unpublish tutorials
- [ ] Can archive/unarchive tutorials
- [ ] Tutorial list pages filter correctly
- [ ] All changes persist after page refresh

## Pressbooks Compatibility

This plugin is compatible with WordPress instances that have Pressbooks installed. The plugin uses:

- Standard WordPress Custom Post Types
- WordPress REST API
- WordPress Media Library

No Pressbooks-specific APIs are used, ensuring compatibility without dependencies.

## Migration Notes

This plugin was migrated from a standalone application with the following changes:

- **Backend**: Express.js → WordPress REST API (PHP)
- **Persistence**: JSON file → WordPress posts/post_meta
- **File Uploads**: Multer → WordPress Media Library
- **Routing**: React Router (BrowserRouter) → React Router (HashRouter)
- **Authentication**: None → WordPress capabilities (edit_posts)

## License

See LICENSE file in the repository root.
