const REVIEW_PAGES = {
  chrome: "https://chromewebstore.google.com/detail/khmlkbonkmhahppkbpcgamcbjdjhlpmk/reviews",
  edge: "https://microsoftedge.microsoft.com/addons/detail/fnkagnlaabojnkmfnpihcckcejhkaech",
  firefox: "https://addons.mozilla.org/firefox/addon/cadranote-cibler-pour-une-ia/reviews/",
} as const;

/** Review page of the store the extension was installed from, guessed from the browser. */
export function reviewPageUrl(): string {
  if (chrome.runtime.getURL("").startsWith("moz-extension:")) return REVIEW_PAGES.firefox;
  // Edge shares the Chrome package and announces itself in its user agent.
  if (/\bEdg\//.test(navigator.userAgent)) return REVIEW_PAGES.edge;
  return REVIEW_PAGES.chrome;
}
