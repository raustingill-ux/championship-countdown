// ===== Global settings =====

// Default end-of-season for generic pages (Matt): 10:00 PM CT on Dec 29, 2025
// (CT in late December is CST = UTC-06:00)
const GLOBAL_SEASON_END_ISO = "2025-12-29T22:00:00-06:00";

// Years Dom can pick from:
const DOM_YEARS = Array.from({ length: 11 }, (_, i) => 2025 + i);

// Week 17 MNF Mondays for the next 10 years, all at 10:00 PM Central.
const DOM_MNF_BY_YEAR = {
  2025: "2025-12-29",
  2026: "2026-12-28",
  2027: "2027-12-27",
  2028: "2028-12-25",
  2029: "2029-12-31",
  2030: "2030-12-30",
  2031: "2031-12-29",
  2032: "2032-12-27",
  2033: "2033-12-26",
  2034: "2034-12-25",
  2035: "2035-12-31",
};

// For Dom's page: return the ISO for the selected year's MNF Monday @ 10:00 PM CT.
// Falls back to Dec 29 of that year if outside the map.
function domIsoForYear(year) {
  const ymd = DOM_MNF_BY_YEAR[year] || `${year}-12-29`;
  return `${ymd}T22:00:00-06:00`;
}

// ===== People roster =====
// headerImages accepts up to 4 image paths; missing ones fall back to default.

const PEOPLE = [
  {
    slug: "matt",
    name: "Matt",
    headerImages: [
      "assets/headers/matt-1.jpg",
      "assets/headers/matt-2.jpg",
      "assets/headers/matt-3.jpg",
      "assets/headers/matt-4.jpg",
    ],
    targetIso: GLOBAL_SEASON_END_ISO, // Dec 29, 2025 @ 10:00 PM CT
    quips: ["It's finally his year!"],
  },
  {
    slug: "cam",
    name: "Cam",
    // Combined Cam vs Matt page
    title: "Countdown to Cam vs Matt Championship Rematch",
    headerImages: [
      // Left side: Cam
      "assets/headers/cam-1.jpg",
      "assets/headers/cam-2.jpg",
      // Right side: Matt
      "assets/headers/matt-1.jpg",
      "assets/headers/matt-2.jpg",
    ],
    // Same deadline as Matt
    targetIso: GLOBAL_SEASON_END_ISO,
    quips: ["Experts predict: It's Joever"],
  },
  {
    slug: "dom",
    name: "Dom",
    title: "Countdown to the Start of Dom’s Dynasty",
    headerImages: [
      "assets/headers/dom-1.jpg",
      "assets/headers/dom-2.jpg",
      "assets/headers/dom-3.jpg",
      "assets/headers/dom-4.jpg",
    ],
    multiYear: true,
    years: DOM_YEARS, // 2025–2035
    // targetIso for Dom is computed at runtime from domIsoForYear(year)
    quips: ["Sources say he may never lose another game."],
  },
];

// ===== Global Quips fallback =====
const QUIPS = [
  "It's finally his year!",
  "Experts predict: It's Joever",
  "GG",
  "He's the GOAT",
];
