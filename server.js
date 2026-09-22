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
    "https://www.animehistory.org/uploads/screencaps/naruto-episode-013-haku_s-secret-jutsu-demonic-mirroring-ice-crystals/cap_14-35_1954.jpg",

  "narucannon:1:11":
    "https://www.animehistory.org/uploads/screencaps/naruto-episode-017-white-past-hidden-ambition/cap_14-25_7bd6.jpg",

  "narucannon:1:12":
    "https://www.animehistory.org/uploads/screencaps/naruto-episode-018-the-weapons-known-as-shinobi/cap_19-03_d46d.jpg",

  "narucannon:1:13":
    "https://www.animehistory.org/uploads/screencaps/naruto-episode-019-the-demon-in-the-snow/cap_15-25_4981.jpg"
};

async function getFolder(path = "") {
  const url = path
    ? `${PIXELDRAIN_API}/${encodeURIComponent(path)}`
    : PIXELDRAIN_API;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Pixeldrain returned ${response.status}`);
  }

  return response.json();
}

async function discoverFutureSeasons() {
  const root = await getFolder();

  const seasons = root.children
    .filter(item => item.type === "dir")
    .map(item => {
      const match = item.name.match(/^(\d+(?:\.\d+)?)\s*-\s*(.+)$/);

      if (!match) return null;

      return {
        season: Number(match[1]),
        name: match[2],
        path: item.path
      };
    })
    .filter(Boolean)
    .filter(season => season.season >= 3)
    .sort((a, b) => a.season - b.season);

  const results = [];

  const folders = await Promise.all(
    seasons.map(async season => {
      try {
        return {
          season,
          folder: await getFolder(
            season.path.replace(`/CEG3sGRE/`, "")
          )
        };
      } catch (error) {
        console.error(
          `Failed to load season ${season.season}:`,
          error
        );
        return null;
      }
    })
  );

  for (const result of folders) {
    if (!result) continue;

    for (const file of result.folder.children) {
      if (file.type !== "file") continue;
      if (!file.name.toLowerCase().endsWith(".mp4")) continue;