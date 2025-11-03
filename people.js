// ===== Global settings =====

// Default end-of-season for generic pages (Matt): 10:00 PM CT on Dec 29, 2025
// (CT in late December is CST = UTC-06:00)
const GLOBAL_SEASON_END_ISO = "2025-12-29T22:00:00-06:00";

// Years Dom can pick from:
const DOM_YEARS = Array.from({ length: 11 }, (_, i) => 2025 + i);

// Helper to produce the Central Time ISO for any year (Dec 29 @ 10:00 PM CT)
function domIsoForYear(year) {
  // Dec 29 is winter (CST, -06:00). Adjust if you change to a summer date.
  return `${year}-12-29T22:00:00-06:00`;
}

// ===== People roster =====
// headerImages accepts up to 4 image paths; missing ones fall back to default.

const PEOPLE = [
  {
    slug: "matt",
    name: "Matt",
    // Optional custom title (omit to use the generic one)
    // title: "Countdown to Matt’s Whatever",
    headerImages: [
      "assets/headers/matt-1.png",
      "assets/headers/matt-2.png",
      "assets/headers/matt-3.png",
      "assets/headers/matt-4.png",
    ],
    targetIso: GLOBAL_SEASON_END_ISO, // Dec 29, 2025 @ 10:00 PM CT
  },
  {
    slug: "cam",
    name: "Cam",
    title: "Countdown to Cam’s Perfect Season",
    headerImages: [
      "assets/headers/cam-1.png",
      "assets/headers/cam-2.png",
      "assets/headers/cam-3.png",
      "assets/headers/cam-4.png",
    ],
    // December 8, 2025 @ 10:00 PM Central (CST = UTC-06:00)
    targetIso: "2025-12-08T22:00:00-06:00",
  },
  {
    slug: "dom",
    name: "Dom",
    title: "Countdown to the Start of Dom’s Dynasty",
    headerImages: [
      "assets/headers/dom-1.png",
      "assets/headers/dom-2.png",
      "assets/headers/dom-3.png",
      "assets/headers/dom-4.png",
    ],
    multiYear: true,   // special behavior: shows year dropdown
    years: DOM_YEARS,  // 2025–2035
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
