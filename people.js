// ===== Global settings =====

// Default end-of-season for generic pages (Matt/Cam): 10:00 PM CT on Dec 29, 2025
// (CT in late December is CST = UTC-06:00)
const GLOBAL_SEASON_END_ISO = "2025-12-29T22:00:00-06:00";

// Years Dom can pick from:
const DOM_YEARS = Array.from({ length: 11 }, (_, i) => 2025 + i);

// Helper to produce the Central Time ISO for any year (Dec 29 @ 10:00 PM CT)
function domIsoForYear(year) {
  // Adjust if you want daylight-time years; Dec 29 is winter (CST, -06:00).
  return `${year}-12-29T22:00:00-06:00`;
}

// ===== People roster =====
// headerImages accepts up to 4 image paths. If you haven’t uploaded your own yet,
// the runtime will fall back to the default image for any missing slot.

const PEOPLE = [
  {
    slug: "matt",
    name: "Matt",
    headerImages: [
      "assets/headers/matt-1.png",
      "assets/headers/matt-2.png",
      "assets/headers/matt-3.png",
      "assets/headers/matt-4.png",
    ],
    targetIso: GLOBAL_SEASON_END_ISO, // uses global 2025 date by default
  },
  {
    slug: "cam", // Derek → Cam
    name: "Cam",
    headerImages: [
      "assets/headers/cam-1.png",
      "assets/headers/cam-2.png",
      "assets/headers/cam-3.png",
      "assets/headers/cam-4.png",
    ],
    targetIso: GLOBAL_SEASON_END_ISO,
  },
  {
    slug: "dom", // Kelly → Dom
    name: "Dom",
    headerImages: [
      "assets/headers/dom-1.png",
      "assets/headers/dom-2.png",
      "assets/headers/dom-3.png",
      "assets/headers/dom-4.png",
    ],
    multiYear: true,     // special behavior: show year dropdown, no default timer
    years: DOM_YEARS,    // 2025–2035
    // target per year is computed with domIsoForYear(year)
  },
];

// ===== Quips =====
const QUIPS = [
  "It's finally his year!",
  "Experts predict: It's Joever",
  "GG",
  "He's the GOAT",
];
