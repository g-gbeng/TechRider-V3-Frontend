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
  pages/          one script per page, e.g. dashboard-customer.js
```

Each page loads its files in this order:

```html
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/pages/<page>.css">
...
<script src="js/pages/<page>.js"></script>
```

## Running locally

Open the folder in VS Code and start the **Live Server** extension, which serves the site on `http://127.0.0.1:5500`. Don't open pages by double-clicking the files: pages opened from `file://` can't talk to the backend.

`dev-api-check.html` checks the connection to the backend and can be deleted later.
