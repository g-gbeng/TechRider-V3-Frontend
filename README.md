# TechRider V3 Frontend

The web pages for TechRider: customer, technician, rider and admin.

## Folder structure

```
*.html            one file per page (kept at the top level so every link keeps working)
css/
  base.css        styles shared by every page (reset, default font, fade-in animation)
  pages/          one stylesheet per page, e.g. dashboard-customer.css
                  (forgot-password.css, reset-password.css and legal.css are shared
                  by the customer, technician and rider versions of those pages)
js/
  api.js          the helper every page will use to talk to the backend
  ui.js           shared look and feel: toasts, confirm/prompt boxes, loading
                  placeholders, empty states, star ratings, profile photos
  chat.js         job messages (any button with data-chat="<repair id>")
  location.js     the customer's current location (dashboard + repair form)
  pages/          one script per page, e.g. dashboard-customer.js
```

Never use the browser's `alert()`, `confirm()` or `prompt()`. Use
`TR.toast()`, `await TR.confirm()` and `await TR.prompt()` from js/ui.js.
Colours live as variables at the top of css/base.css (`--tr-primary-700` etc.).
Use `--tr-surface`, `--tr-text`, `--tr-heading` and `--tr-link` rather than fixed
colours so pages work in dark mode: js/theme.js (loaded first in every page's
<head>) sets `<html data-theme="light|dark">` from the saved choice (Light, Dark
or Device), and css/base.css swaps the variables.

The login and notifications pages share one stylesheet and script for all three
roles (css/pages/login.css + js/pages/login.js, css/pages/notifications.css +
js/pages/notifications.js); each role's HTML file only sets `data-role`.

Forgot password, reset password, privacy and terms are one page each, with the
role in the address (`forgot-password.html?role=rider`). The old per-role
addresses still work: they forward to the shared pages.

Each page loads its files in this order:

```html
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/pages/<page>.css">
...
<script src="js/pages/<page>.js"></script>
```

## Running locally

Open the folder in VS Code and start the **Live Server** extension, which serves the site on `http://127.0.0.1:5500`. Don't open pages by double-clicking the files: pages opened from `file://` can't talk to the backend.

