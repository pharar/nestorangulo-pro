/*
 * Runs render-blocking in <head>, before first paint.
 *
 * Deliberately a separate file rather than an inline <script>: astro.config.mjs
 * sets security.csp with scriptDirective.resources ['self'], and Astro only
 * hashes scripts it processes itself — `is:inline` blocks are never hashed, so
 * an inline version of this would be blocked by the CSP. Served from the same
 * origin, it is covered by 'self' with no hash to keep in sync.
 *
 * Two jobs, both of which must happen before anything is painted:
 *   1. re-apply a stored theme choice, so it never flashes the wrong palette
 *   2. mark the document as scripted, so the theme toggle can be visible from
 *      the first frame without a layout shift — and stay hidden without JS
 */
(function () {
  var root = document.documentElement;

  root.classList.add('js');

  try {
    var stored = localStorage.getItem('theme');
    // Absence of the attribute is meaningful: it hands control to the
    // prefers-color-scheme media query in tokens.css.
    if (stored === 'dark' || stored === 'light') {
      root.dataset.theme = stored;
    }
  } catch (e) {
    /* storage disabled (private mode, blocked cookies) — fall back to the OS */
  }
})();
