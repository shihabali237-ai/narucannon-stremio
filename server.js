const express = require("express");

const app = express();
const PORT = 8080;

const PIXELDRAIN_ID = "CEG3sGRE";
const PIXELDRAIN_API = `https://pixeldrain.net/api/filesystem/${PIXELDRAIN_ID}`;

const CACHE_TTL = 10 * 60 * 1000;

let discoveryCache = [];
let discoveryCacheTime = 0;
let discoveryPromise = null;

const season1Titles = [
  "Uzumaki Naruto!",
  "Konohamaru!!",
  "Enter Sasuke!",
  "The Bell Test",
  "Team 7's First Mission",
  "Zabuza",
  "Team 7 vs. Zabuza",
  "Tree Climbing",
  "Haku",
  "Demonic Mirroring Ice Crystals",
  "The Nine-Tails",
  "Haku's Sacrifice",
  "The Demon in the Snow"
];

const knownEpisodes = [];

for (let episode = 1; episode <= 13; episode++) {
  knownEpisodes.push({
    id: `narucannon:1:${episode}`,
    season: 1,
    episode,
    title: season1Titles[episode - 1]
  });
}

for (let episode = 1; episode <= 38; episode++) {
  knownEpisodes.push({
    id: `narucannon:2:${episode}`,
    season: 2,
    episode,
    title: `Chunin Exams ${String(episode).padStart(2, "0")}`
  });
}

const thumbnails = {
  "narucannon:1:1":
    "https://www.animehistory.org/uploads/screencaps/naruto-episode-001-enter-naruto-uzumaki_/cap_12-30_e97c.jpg",

  "narucannon:1:2":
    "https://www.animehistory.org/uploads/screencaps/naruto-episode-002-my-name-is-konohamaru_/cap_18-31_c2f5.jpg",

  "narucannon:1:3":
    "https://www.animehistory.org/uploads/screencaps/naruto-episode-003-sasuke-and-sakura-friends-or-foes/cap_02-54_323c.jpg",

  "narucannon:1:4":
    "https://www.animehistory.org/uploads/screencaps/naruto-episode-004-pass-or-fail-survival-test/cap_10-31_dc11.jpg",

  "narucannon:1:5":
    "https://www.animehistory.org/uploads/screencaps/naruto-episode-006-a-dangerous-mission_-journey-to-the-land-of-waves_/cap_09-06_633d.jpg",

  "narucannon:1:6":
    "https://www.animehistory.org/uploads/screencaps/naruto-episode-007-the-assassin-of-the-mist_/cap_11-06_3700.jpg",

  "narucannon:1:7":
    "https://www.animehistory.org/uploads/screencaps/naruto-episode-008-the-oath-of-pain/cap_14-27_cfe2.jpg",

  "narucannon:1:8":
    "https://www.animehistory.org/uploads/screencaps/naruto-episode-010-the-forest-of-chakra/cap_10-38_f303.jpg",

  "narucannon:1:9":
    "https://www.animehistory.org/uploads/screencaps/naruto-episode-012-battle-on-the-bridge_-zabuza-returns_/cap_00-21-19_c690.jpg",

  "narucannon:1:10":
    "https://www.animehistory.org/uploads/screenc