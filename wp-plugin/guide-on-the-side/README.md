# Guide on the Side — WordPress Plugin

A WordPress plugin that provides an interactive tutorial creation and management system. Migrated from a standalone React + Express + JSON-file application.

For full documentation see the repository root:
- [INSTALLATION.md](../../INSTALLATION.md) — local setup and environment
- [TECH_MANUAL.md](../../TECH_MANUAL.md) — architecture, API reference, and extension guide

## Features

- Create and manage interactive tutorials
- Slide types: WYSIWYG, MCQ, Text Question, Media Upload
- Tutorial states: Draft, Published, Archived
- Drag-and-drop slide reordering
- Auto-save on field blur
- PDF certificate generation on tutorial completion
- Analytics tracking (slide views, completions)
- Student-facing public playback via shortcode

## Requirements

- WordPress 5.8+
- PHP 7.4+
- Node.js 16+ (for building)
- npm 8+ (for building)
- Composer (for PDF certificate feature — installs dompdf)

## Quick Build Reference

```bash
# Install JS dependencies and build admin SPA
npm install
npm run build

# Build student playback SPA
npm run build:student

# Install PHP dependencies (PDF certificates)
composer install --no-dev --optimize-autoloader

# Run tests
npm test

# Dev server (React only, no WP integration)
npm run dev
```

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

### Certificate Acceptance Tests

- [ ] Completing a published tutorial shows the certificate section
- [ ] Logged-in users see their WP display name prefilled; they can edit it
- [ ] Anonymous users can enter any name
- [ ] Clicking Generate issues the certificate and shows the Download button
- [ ] Download button triggers a PDF file download
- [ ] PDF contains correct recipient name, tutorial title, date, and issuer name
- [ ] Completing the same tutorial again returns the previously issued certificate (idempotent)
- [ ] Requests exceeding 5/hour from the same IP are rate-limited (429)
- [ ] Expired or tampered download tokens return 403
- [ ] Certificates are disabled when the setting is not enabled
- [ ] Admin can create/edit/delete templates in the Certificates admin page
- [ ] Preview button opens a sample PDF in a new browser tab
- [ ] Tutorial cert settings (enable, template, issuer) persist after page refresh
- [ ] Admin can view issued certificates via `/tutorials/{id}/certificates` endpoint

## License

See LICENSE file in the repository root.
