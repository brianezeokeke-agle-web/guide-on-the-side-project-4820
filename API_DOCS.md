# API Reference

This document covers every public-facing API in the Guide on the Side WordPress plugin: REST endpoints, JavaScript service functions, WordPress configuration globals, and shared data structures.

For architecture and extension guidance, see [TECH_MANUAL.md](TECH_MANUAL.md). For setup, see [INSTALLATION.md](INSTALLATION.md).

---

## Table of Contents

1. [Authentication](#authentication)
2. [REST API](#rest-api)
   - [Tutorials](#tutorials)
   - [Certificates](#certificates)
   - [Certificate Templates](#certificate-templates)
   - [Tutorial Themes](#tutorial-themes)
   - [Tutorial Layout](#tutorial-layout)
   - [Analytics](#analytics)
3. [JavaScript Services](#javascript-services)
   - [tutorialApi.js](#tutorialapijs)
   - [certificateApi.js](#certificateapijs)
   - [certificateTemplateApi.js](#certificatetemplateapijs)
   - [analyticsApi.js](#analyticsapijs)
   - [tutorialThemeApi.js](#tutorialthemeapijs)
   - [tutorialLayoutApi.js](#tutoriallayoutapijs)
   - [mediaLibrary.js](#medialibraryjs)
4. [Configuration Globals](#configuration-globals)
   - [Admin Context](#admin-context-windowgotsconfig)
   - [Student Playback Context](#student-playback-context-windowgotsstudentconfig)
5. [Data Structures](#data-structures)
   - [Tutorial](#tutorial)
   - [Slide](#slide)
   - [Certificate](#certificate)
   - [Analytics Event](#analytics-event)

---

## Authentication

All REST endpoints live under `/wp-json/gots/v1/`. Endpoints marked `edit_posts` require:

- The caller to be logged in with `edit_posts` capability.
- A valid WordPress nonce in the `X-WP-Nonce` request header.

The JavaScript service modules inject this header automatically using `window.gotsConfig.nonce`. Public endpoints accept anonymous requests but may return filtered data (e.g. published tutorials only).

---

## REST API

### Tutorials

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/tutorials` | Public | List tutorials. Query: `?status=draft\|published\|archived`. Unauthenticated callers only receive published tutorials. |
| GET | `/tutorials/{id}` | Public | Get a single tutorial by WordPress post ID. |
| GET | `/tutorials/{id}/public` | Public | Get a tutorial for student playback. Always returns the published version only. |
| POST | `/tutorials` | `edit_posts` | Create a tutorial. Starts with 2 empty WYSIWYG slides by default. |
| PUT | `/tutorials/{id}` | `edit_posts` | Update a tutorial. Slides are merged by `slideId` — existing fields are preserved unless explicitly overridden. Pass `null` to remove a field. |
| DELETE | `/tutorials/{id}` | `edit_posts` | Permanently delete a tutorial and its associated data. |
| POST | `/tutorials/{id}/duplicate` | `edit_posts` | Create an exact copy of a tutorial as a new draft. |

---

### Certificates

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/tutorials/{id}/certificate/completion-proof` | Public | Request a signed, short-lived completion proof token. Required before issuing a certificate. |
| POST | `/tutorials/{id}/certificate/issue` | Public | Issue a certificate. Returns the download URL and expiry. See request body below. |
| POST | `/tutorials/{id}/certificate/preview` | `edit_posts` | Preview the tutorial's certificate as an inline PDF. |
| GET | `/certificates/{token}/download` | Public (signed) | Stream the certificate PDF. The token is obtained from the issue response and expires after `GOTS_CERT_DOWNLOAD_TTL` (default 24 hours). |
| GET | `/certificates/verify/{verification_id}` | Public | Look up a certificate by its verification ID. Returns validity status and tutorial title. |
| GET | `/tutorials/{id}/certificate-settings` | `edit_posts` | Get the certificate settings for a tutorial. |
| PUT | `/tutorials/{id}/certificate-settings` | `edit_posts` | Save the certificate settings for a tutorial. |
| GET | `/tutorials/{id}/certificates` | `edit_posts` | List all certificates issued for a tutorial. Query: `?limit=&offset=`. |

**POST `/tutorials/{id}/certificate/issue` — request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `recipientName` | string | Yes | Name printed on the certificate. |
| `completionProof` | string | Yes | Signed token from the completion-proof endpoint. Valid for 15 minutes. |
| `idempotencyKey` | string | No | If provided, re-issuing with the same key returns the existing certificate instead of creating a new one. |

**Response**

```json
{
  "certificateId": 42,
  "downloadUrl": "/wp-json/gots/v1/certificates/<token>/download",
  "expiresAt": "2025-01-01T12:00:00Z"
}
```

---

### Certificate Templates

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/certificate-templates` | `edit_posts` | List all active (non-deleted) templates. |
| POST | `/certificate-templates` | `edit_posts` | Create a new template. |
| PUT | `/certificate-templates/{id}` | `edit_posts` | Update an existing template. |
| DELETE | `/certificate-templates/{id}` | `edit_posts` | Soft-delete a template. Templates in use by tutorials cannot be deleted without confirmation. |
| POST | `/certificate-templates/{id}/preview` | `edit_posts` | Render and return a preview PDF inline. |

---

### Tutorial Themes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/tutorial-themes` | `edit_posts` | List all active themes. |
| POST | `/tutorial-themes` | `edit_posts` | Create a new theme. |
| PUT | `/tutorial-themes/{id}` | `edit_posts` | Update an existing theme. |
| DELETE | `/tutorial-themes/{id}` | `edit_posts` | Soft-delete a theme. |
| GET | `/tutorials/{id}/theme-settings` | `edit_posts` | Get the theme currently applied to a tutorial. |
| PUT | `/tutorials/{id}/theme-settings` | `edit_posts` | Apply a theme to a tutorial. Body: `{ "themeId": number }`. |

---

### Tutorial Layout

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/tutorials/{id}/layout-settings` | `edit_posts` | Get the pane ratio setting for a tutorial. Returns `{ "leftPaneRatio": number }`. |
| PUT | `/tutorials/{id}/layout-settings` | `edit_posts` | Save the pane ratio. Body: `{ "leftPaneRatio": number }`. |

---

### Analytics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/analytics/event` | Public (HMAC token) | Record an anonymous analytics event. The `token` field must be a valid HMAC generated server-side and injected into `window.gotsStudentConfig.analyticsToken`. |
| GET | `/tutorials/{id}/analytics/summary` | `edit_posts` | Aggregated stats (total views, completions, completion rate). Query: `?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`. |
| GET | `/tutorials/{id}/analytics/trend` | `edit_posts` | Daily view and completion counts over a date range. Query: `?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`. |
| GET | `/tutorials/{id}/analytics/slides` | `edit_posts` | Per-slide view counts and drop-off rates. Query: `?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`. |

**POST `/analytics/event` — request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tutorialId` | string | Yes | Tutorial ID. |
| `eventType` | string | Yes | `slide_view` or `completion`. |
| `slideId` | string | No | UUID of the slide (required for `slide_view`). |
| `token` | string | Yes | HMAC token from `window.gotsStudentConfig.analyticsToken`. |

---

## JavaScript Services

All service modules live under `src/services/`. They read API base URL and nonce from the configuration globals described in the [Configuration Globals](#configuration-globals) section. Do not hardcode URLs or nonces.

---

### tutorialApi.js

Admin-context service for tutorial CRUD. Reads from `window.gotsConfig`.

| Function | Returns | Description |
|----------|---------|-------------|
| `listTutorials()` | `Promise<Array>` | List all tutorials accessible to the current user. |
| `getTutorial(id)` | `Promise<Object>` | Get a single tutorial by ID. |
| `createTutorial(data)` | `Promise<Object>` | Create a tutorial. `data`: `{ title?, description? }`. |
| `updateTutorial(id, data)` | `Promise<Object>` | Update tutorial fields. |
| `archiveTutorial(id)` | `Promise<Object>` | Set tutorial status to `archived`. |
| `unarchiveTutorial(id)` | `Promise<Object>` | Restore an archived tutorial to `draft`. |
| `publishTutorial(id)` | `Promise<Object>` | Set tutorial status to `published`. |
| `unpublishTutorial(id)` | `Promise<Object>` | Set tutorial status to `draft`. |
| `updateTutorialSlides(id, slides)` | `Promise<Object>` | Replace the slides array on a tutorial. |
| `duplicateTutorial(id)` | `Promise<Object>` | Create an exact copy as a new draft. |

---

### certificateApi.js

Student-context service for certificate issuance and verification. Reads from `window.gotsStudentConfig`.

| Function | Returns | Description |
|----------|---------|-------------|
| `requestCompletionProof(tutorialId)` | `Promise<string>` | Request a signed completion proof token. Valid for 15 minutes. |
| `issueCertificate(tutorialId, payload)` | `Promise<{ certificateId, downloadUrl, expiresAt }>` | Issue a certificate. `payload`: `{ recipientName, completionProof, idempotencyKey? }`. |
| `downloadCertificate(downloadUrl, filename?)` | `Promise<void>` | Trigger a browser file download for the certificate PDF. |
| `verifyCertificate(verificationId)` | `Promise<{ valid, issued_at?, tutorial_title?, status? }>` | Public certificate lookup by verification ID. |

---

### certificateTemplateApi.js

Admin-context service for managing certificate templates. Reads from `window.gotsConfig`.

| Function | Returns | Description |
|----------|---------|-------------|
| `listTemplates()` | `Promise<Array>` | List all active templates. |
| `createTemplate(data)` | `Promise<Object>` | Create a new template. |
| `updateTemplate(id, data)` | `Promise<Object>` | Update an existing template. |
| `deleteTemplate(id, { confirmed? })` | `Promise<Object>` | Soft-delete a template. If the template is in use, the first call returns a confirmation prompt; pass `{ confirmed: true }` to proceed. |
| `previewTemplate(templateId, configOverrides?, extras?)` | `Promise<void>` | Open a preview PDF in a new browser tab. `extras`: `{ layout_type?, logo_media_id? }`. |
| `getTutorialCertSettings(tutorialId)` | `Promise<Object>` | Get the certificate settings for a tutorial. |
| `saveTutorialCertSettings(tutorialId, settings)` | `Promise<Object>` | Save the certificate settings for a tutorial. |
| `listTutorialCertificates(tutorialId, limit?, offset?)` | `Promise<Object>` | List certificates issued for a tutorial, with pagination. |
| `verifyCertificateById(verificationId)` | `Promise<Object>` | Admin certificate lookup. Returns `recipient_name` if the caller is authorized. |

---

### analyticsApi.js

Dual-context service used by both admin and student SPAs. Reads from `window.gotsStudentConfig` in the student context and `window.gotsConfig` in the admin context.

| Function | Returns | Description |
|----------|---------|-------------|
| `recordAnalyticsEvent(tutorialId, eventType, slideId?)` | `Promise<void>` | Record an analytics event. Fire-and-forget — errors are silently swallowed. |
| `getAnalyticsSummary(tutorialId, dateFrom?, dateTo?)` | `Promise<Object>` | Get aggregated stats for a tutorial. |
| `getAnalyticsTrend(tutorialId, dateFrom?, dateTo?)` | `Promise<Object>` | Get daily trend data for a tutorial. |
| `getSlidePerformance(tutorialId, dateFrom?, dateTo?)` | `Promise<Object>` | Get per-slide view and drop-off metrics. |

---

### tutorialThemeApi.js

Admin-context service for managing tutorial themes. Reads from `window.gotsConfig`.

| Function | Returns | Description |
|----------|---------|-------------|
| `listTutorialThemes()` | `Promise<Array>` | List all active themes. |
| `createTutorialTheme(data)` | `Promise<Object>` | Create a new theme. |
| `updateTutorialTheme(id, data)` | `Promise<Object>` | Update an existing theme. |
| `deleteTutorialTheme(id, { confirmed? })` | `Promise<Object>` | Soft-delete a theme. Behavior mirrors `deleteTemplate`. |
| `getTutorialThemeSettings(tutorialId)` | `Promise<Object>` | Get the theme currently applied to a tutorial. |
| `saveTutorialThemeSettings(tutorialId, { themeId })` | `Promise<Object>` | Apply a theme to a tutorial. |

---

### tutorialLayoutApi.js

Admin-context service for tutorial pane layout settings. Reads from `window.gotsConfig`.

| Function | Returns | Description |
|----------|---------|-------------|
| `getTutorialLayoutSettings(tutorialId)` | `Promise<{ leftPaneRatio? }>` | Get the pane ratio for a tutorial. |
| `saveTutorialLayoutSettings(tutorialId, { leftPaneRatio })` | `Promise<Object>` | Save the pane ratio for a tutorial. |

---

### mediaLibrary.js

Wrapper around the WordPress Media Library (`wp.media`). Available in the admin context only.

| Function | Returns | Description |
|----------|---------|-------------|
| `openMediaLibrary(options)` | `Promise<Object\|Array\|null>` | Open the WP media picker. Returns the selected item(s), or `null` if the dialog is dismissed. |
| `selectImage()` | `Promise<Object\|null>` | Shorthand to select a single image. |
| `selectVideo()` | `Promise<Object\|null>` | Shorthand to select a single video. |
| `selectMedia()` | `Promise<Object\|null>` | Shorthand to select any media type. |
| `isMediaLibraryAvailable()` | `boolean` | Returns `true` if `wp.media` is present. Use this before calling other functions. |
| `isPdfMediaData(data)` | `boolean` | Returns `true` if the media item is a PDF. |

**`openMediaLibrary` options**

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Dialog title. |
| `buttonText` | string | Label for the select button. |
| `multiple` | boolean | Allow multi-select. |
| `type` | string | Filter by media type: `image`, `video`, `audio`, or `''` for all. |

**Media item shape returned**

```js
{
  mediaType: string,
  url: string,
  attachmentId: number,
  altText: string,
  filename: string,
  originalName: string,
  mimeType: string,
}
```

---

## Configuration Globals

These objects are injected into the page by `includes/enqueue.php` at render time. Service modules read from them — never hardcode their values in application code.

### Admin Context (`window.gotsConfig`)

Present on all admin plugin pages.

| Field | Type | Description |
|-------|------|-------------|
| `apiBase` | string | REST API base path, e.g. `/wp-json/gots/v1`. |
| `restUrl` | string | Full REST URL including origin. |
| `nonce` | string | WordPress REST nonce for `X-WP-Nonce` header. |
| `userId` | number | Current logged-in user ID. |

### Student Playback Context (`window.gotsStudentConfig`)

Present on student playback pages only.

| Field | Type | Description |
|-------|------|-------------|
| `tutorialId` | number | ID of the tutorial being played. |
| `restUrl` | string | Full REST URL. |
| `homeUrl` | string | WordPress home URL. |
| `siteName` | string | WordPress site name. |
| `isPreview` | boolean | `true` when rendered in the editor preview mode. |
| `userName` | string | Display name of the current user, if logged in. |
| `analyticsToken` | string | HMAC token required by `POST /analytics/event`. |
| `certificateEnabled` | boolean | Whether certificates are enabled for this tutorial. |
| `completionNonce` | string | Single-use nonce for requesting a completion proof. |
| `completionProof` | string \| undefined | Pre-issued completion proof, if available. |
| `isLoggedIn` | boolean | Whether the viewing user is authenticated. |
| `nonce` | string \| undefined | WordPress REST nonce, only present for logged-in users. |

---

## Data Structures

### Tutorial

Returned by GET/POST/PUT tutorial endpoints.

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | WordPress post ID. |
| `uuid` | string | Stable UUID used by the student embed shortcode. |
| `title` | string | Tutorial title. |
| `description` | string | Tutorial description. |
| `status` | string | `draft`, `published`, or `archived`. |
| `archived` | boolean | Whether the tutorial is archived. |
| `slides` | Array\<Slide\> | Ordered array of slide objects. |
| `createdAt` | string | ISO 8601 creation timestamp. |
| `updatedAt` | string | ISO 8601 last-modified timestamp. |

### Slide

Slides are stored as a JSON array on the tutorial. Only the fields relevant to each type are present.

| Field | Type | Slide Types | Description |
|-------|------|------------|-------------|
| `slideId` | string | All | UUID. Used as the stable key for slide merges. |
| `type` | string | All | `wysiwyg`, `mcq`, `textQuestion`, or `mediaUpload`. |
| `title` | string | All | Slide title. |
| `order` | number | All | Display order (0-indexed). |
| `content` | string | `wysiwyg` | HTML content. |
| `question` | string | `mcq`, `textQuestion` | Question prompt text. |
| `choices` | Array | `mcq` | Array of answer choice strings. |
| `answer` | string | `mcq`, `textQuestion` | Correct answer index (`mcq`) or expected answer text (`textQuestion`). |
| `mediaUrl` | string | `mediaUpload` | URL of the attached media file. |

### Certificate

Returned by the list certificates endpoint.

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Certificate record ID. |
| `tutorial_id` | number | ID of the parent tutorial. |
| `recipient_name` | string | Name printed on the certificate. |
| `token` | string | Signed download token. |
| `issued_at` | string | ISO 8601 issuance timestamp. |
| `template_id` | number | ID of the certificate template used. |

### Analytics Event

Body sent to `POST /analytics/event`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tutorialId` | string | Yes | Tutorial ID. |
| `eventType` | string | Yes | `slide_view` or `completion`. |
| `slideId` | string | No | Slide UUID. Required when `eventType` is `slide_view`. |
| `token` | string | Yes | HMAC token from `window.gotsStudentConfig.analyticsToken`. |
