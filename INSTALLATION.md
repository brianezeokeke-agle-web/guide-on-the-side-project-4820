# Installation & Local Setup

This guide walks through getting a fully working local instance of the Guide on the Side plugin running on your machine.

## Prerequisites

| Tool | Minimum Version | Purpose |
|------|----------------|---------|
| [LocalWP](https://localwp.com/) or [DDEV](https://ddev.readthedocs.io/) | latest | Local WordPress environment |
| PHP | 7.4+ | Plugin backend |
| Node.js | 16+ | Building the React frontend |
| npm | 8+ | JavaScript dependency management |
| Composer | latest | PHP dependency management (PDF certificates) |

> **Note:** LocalWP is the easiest option if you have never run WordPress locally before. DDEV gives more control and is closer to a production environment.

---

## Step 1 — Clone the Repository

```bash
git clone <repository-url>
cd guide-on-the-side-project-4820
```

---

## Step 2 — Create a Local WordPress Site

### Option A: LocalWP (recommended for beginners)

1. Download and install [LocalWP](https://localwp.com/).
2. Open LocalWP and click **+ Create a new site**.
3. Choose a site name (e.g. `guide-on-the-side`), accept the defaults for PHP/MySQL/nginx, and finish setup.
4. LocalWP will show you the site's local URL (e.g. `http://guide-on-the-side.local`).

### Option B: DDEV

```bash
mkdir wordpress-site && cd wordpress-site
ddev config --project-type=wordpress
ddev start
ddev wp core download
ddev wp config create --dbname=db --dbuser=db --dbpass=db --dbhost=db
ddev wp core install --url=http://wordpress-site.ddev.site \
  --title="Guide on the Side" \
  --admin_user=admin --admin_password=admin --admin_email=admin@example.com
```

---

## Step 3 — Build the Plugin

Navigate to the plugin source directory and install JavaScript dependencies:

```bash
cd wp-plugin/guide-on-the-side
npm install
npm run build
```

This compiles the React application into `wp-plugin/guide-on-the-side/build/`.

Also build the student-facing playback app:

```bash
npm run build:student
```

---

## Step 4 — Install PHP Dependencies

The PDF certificate feature requires [dompdf](https://github.com/dompdf/dompdf). Install it via Composer:

```bash
cd wp-plugin/guide-on-the-side
composer install --no-dev --optimize-autoloader
```

If Composer is not installed, follow the instructions at [getcomposer.org](https://getcomposer.org).

> The plugin will activate without this step, but certificate generation will return an error until `vendor/autoload.php` exists.

---

## Step 5 — Link the Plugin to WordPress

### LocalWP

Find your site's plugins directory. It will be somewhere like:

```
~/Local Sites/guide-on-the-side/app/public/wp-content/plugins/
```

Create a symbolic link so you can edit the source directly without copying files:

```bash
ln -s /absolute/path/to/wp-plugin/guide-on-the-side \
  ~/Local\ Sites/guide-on-the-side/app/public/wp-content/plugins/guide-on-the-side
```

Or copy the folder if you prefer:

```bash
cp -r wp-plugin/guide-on-the-side \
  ~/Local\ Sites/guide-on-the-side/app/public/wp-content/plugins/
```

### DDEV

```bash
cp -r wp-plugin/guide-on-the-side /path/to/ddev-site/wp-content/plugins/
```

---

## Step 6 — Activate the Plugin

1. Open WordPress Admin (e.g. `http://guide-on-the-side.local/wp-admin`).
2. Go to **Plugins** in the sidebar.
3. Find **Guide on the Side** and click **Activate**.
4. **Guide on the Side** will now appear in the admin sidebar.

---

## Step 7 — Verify the Installation

Run through this checklist after activation:

- [ ] Plugin activates without errors
- [ ] "Guide on the Side" menu appears in WP admin
- [ ] Landing dashboard loads and shows tutorial counts
- [ ] Can create a new tutorial
- [ ] New tutorial has 2 empty slides by default
- [ ] Can edit tutorial title and description
- [ ] Can add, remove, and reorder slides
- [ ] WYSIWYG, MCQ, Text Question, and Media Upload slide types all function
- [ ] Can publish and archive tutorials
- [ ] Tutorial list pages filter correctly
- [ ] All changes persist after page refresh

---

## Development Workflow

### Hot-reload dev server (React only)

For iterating on React components in isolation:

```bash
cd wp-plugin/guide-on-the-side
npm run dev
```

> This runs a Vite dev server but is **not** connected to WordPress. For full integration testing, always use `npm run build` and test within your local WordPress site.

### Rebuilding after changes

Any time you change a file under `src/`, rebuild before testing in WordPress:

```bash
npm run build
```

### Running Tests

```bash
npm test
```

The test suite uses Jest + jsdom. See [TESTING_LOG.md](wp-plugin/guide-on-the-side/TESTING_LOG.md) for details on what is covered.

---

## Troubleshooting

**Plugin does not appear after linking**
Confirm the symlink points to the directory containing `guide-on-the-side.php`, not a parent folder. Check with `ls wp-content/plugins/guide-on-the-side/`.

**"dompdf is not installed" error**
Run `composer install --no-dev` inside `wp-plugin/guide-on-the-side/`. Verify that `vendor/autoload.php` exists.

**White screen / JS error after build**
Make sure `npm run build` completed without errors. Check browser devtools console for the specific error. If assets are 404ing, confirm the symlink is correct.

**Changes to `src/` not reflected**
You must run `npm run build` again. The plugin loads from `build/`, not `src/`.
