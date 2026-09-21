const express = require("express");

const app = express();
const PORT = 8080;

const PIXELDRAIN_ID = "CEG3sGRE";
const PIXELDRAIN_API = `https://pixeldrain.net/api/filesystem/${PIXELDRAIN_ID}`;

const CACHE_TTL = 10 * 60 * 1000;

let discoveryCache = [];
let discoveryCacheTime = 0;
let discoveryPromise = null;

/*
 * ============================================================
 * SEASON 1 + SEASON 2
 * ============================================================
 *
 * These are kept locally so Stremio does not have to wait for
 * Pixeldrain just to display the seasons you are currently using.
 */

const knownEpisodes = [];

// Season 1 — Land of Waves
for (let episode = 1; episode <= 13; episode++) {
  knownEpisodes.push({
    id: `narucannon:1:${episode}`,
    season: 1,
    episode,
    title: `Land of Waves ${String(episode).padStart(2, "0")}`
  });
}

// Season 2 — Chūnin Exams
for (let episode = 1; episode <= 38; episode++) {
  knownEpisodes.push({
    id: `narucannon:2:${episode}`,
    season: 2,
    episode,
    title: `Chunin Exams ${String(episode).padStart(2, "0")}`
  });
}

/*
 * AnimeHistory thumbnails
 *
 * Season 1 has been mapped from the episodes you have watched.
 * Season 2 will be added as you watch it.
 */

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

/*
 * ============================================================
 * PIXELDRAIN DISCOVERY
 * ============================================================
 *
 * Seasons 1 and 2 are already known above.
 *
 * We only need Pixeldrain discovery for Season 3+.
 * That means opening NaruCannon does not need to wait for the
 * entire library before showing Seasons 1 and 2.
 */

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
  console.log("Checking Pixeldrain for additional seasons...");

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

  const folders = await Promise.all(
    seasons.map(async season => ({
      season,
      folder: await getFolder(
        season.path.replace(`/CEG3sGRE/`, "")
      )
    }))
  );

  const discovered = [];

  for (const { season, folder } of folders) {
    for (const file of folder.children) {
      if (file.type !== "file") continue;
      if (!file.name.toLowerCase().endsWith(".mp4")) continue;

      const match = file.name.match(/\s(\d+)\s+\(Sub\)\.mp4$/i);

      if (!match) continue;

      const episode = Number(match[1]);

      discovered.push({
        id: `narucannon:${season.season}:${episode}`,
        title: file.name
          .replace(/^\[NaruCannon Recut\]\s*/i, "")
          .replace(/\s*\(Sub\)\.mp4$/i, ""),
        season: season.season,
        episode,
        url: getPixeldrainFileUrl(file.path)
      });
    }
  }

  discovered.sort(
    (a, b) => a.season - b.season || a.episode - b.episode
  );

  discoveryCache = discovered;
  discoveryCacheTime = Date.now();

  console.log(
    `Discovered ${discovered.length} additional episodes.`
  );

  return discovered;
}

function getPixeldrainFileUrl(filePath) {
  const relativePath = filePath
    .replace(`/CEG3sGRE/`, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  return `${PIXELDRAIN_API}/${relativePath}`;
}

async function refreshDiscoveryInBackground() {
  const now = Date.now();

  if (
    discoveryCache.length > 0 &&
    now - discoveryCacheTime < CACHE_TTL
  ) {
    return;
  }

  if (discoveryPromise) {
    return discoveryPromise;
  }

  discoveryPromise = discoverFutureSeasons()
    .catch(error => {
      console.error("Background Pixeldrain discovery failed:", error);
    })
    .finally(() => {
      discoveryPromise = null;
    });

  return discoveryPromise;
}

/*
 * ============================================================
 * EPISODE LIST
 * ============================================================
 */

function getKnownEpisodes() {
  return knownEpisodes.map(ep => ({
    ...ep
  }));
}

async function getAllEpisodes() {
  const base = getKnownEpisodes();

  const additional = discoveryCache.length
    ? discoveryCache
    : [];

  const combined = [...base, ...additional];

  const unique = new Map();

  for (const episode of combined) {
    unique.set(episode.id, episode);
  }

  return [...unique.values()].sort(
    (a, b) => a.season - b.season || a.episode - b.episode
  );
}

/*
 * ============================================================
 * PIXELDRAIN STREAM URL
 * ============================================================
 *
 * For Seasons 1 and 2 we use the cached/discovered URL when
 * available. For anything else, we refresh Pixeldrain only
 * when Stremio actually asks to play the episode.
 */

async function findPixeldrainEpisode(id) {
  const cached = discoveryCache.find(ep => ep.id === id);

  if (cached) {
    return cached;
  }

  /*
   * If it is Season 1 or 2, discover the exact Pixeldrain file
   * only when playback is requested.
   */
  const match = id.match(/^narucannon:(\d+):(\d+)$/);

  if (!match) {
    return null;
  }

  const seasonNumber = Number(match[1]);
  const episodeNumber = Number(match[2]);

  const root = await getFolder();

  const seasonFolder = root.children.find(item => {
    if (item.type !== "dir") return false;

    const match = item.name.match(
      /^(\d+(?:\.\d+)?)\s*-\s*(.+)$/
    );

    return match && Number(match[1]) === seasonNumber;
  });

  if (!seasonFolder) {
    return null;
  }

  const folder = await getFolder(
    seasonFolder.path.replace(`/CEG3sGRE/`, "")
  );

  const file = folder.children.find(item => {
    if (item.type !== "file") return false;
    if (!item.name.toLowerCase().endsWith(".mp4")) return false;

    const match = item.name.match(/\s(\d+)\s+\(Sub\)\.mp4$/i);

    return match && Number(match[1]) === episodeNumber;
  });

  if (!file) {
    return null;
  }

  return {
    id,
    season: seasonNumber,
    episode: episodeNumber,
    title: file.name
      .replace(/^\[NaruCannon Recut\]\s*/i, "")
      .replace(/\s*\(Sub\)\.mp4$/i, ""),
    url: getPixeldrainFileUrl(file.path)
  };
}

/*
 * ============================================================
 * MANIFEST
 * ============================================================
 */

app.get("/manifest.json", (req, res) => {
  res.json({
    id: "com.narucannon.custom",
    version: "3.0.0",
    name: "NaruCannon",
    description: "NaruCannon from Pixeldrain",
    resources: ["catalog", "meta", "stream"],
    types: ["series"],
    catalogs: [
      {
        type: "series",
        id: "narucannon",
        name: "NaruCannon"
      }
    ]
  });
});

/*
 * ============================================================
 * CATALOG
 * ============================================================
 */

app.get("/catalog/series/narucannon.json", (req, res) => {
  /*
   * Start checking for future seasons in the background.
   * We do NOT wait for Pixeldrain here.
   */
  refreshDiscoveryInBackground();

  res.json({
    metas: [
      {
        id: "narucannon",
        type: "series",
        name: "NaruCannon",
        poster:
          "https://raw.githubusercontent.com/shihabali237-ai/narucannon-stremio/refs/heads/main/narucannon-poster.jpg",
        posterShape: "poster"
      }
    ]
  });
});

/*
 * ============================================================
 * SERIES METADATA
 * ============================================================
 */

app.get("/meta/series/narucannon.json", async (req, res) => {
  try {
    /*
     * Do not wait for Pixeldrain discovery.
     *
     * Seasons 1 and 2 are immediately available.
     * Additional seasons are added automatically once the
     * background discovery finishes.
     */
    const episodes = await getAllEpisodes();

    /*
     * Kick off future-season discovery without delaying the
     * response Stremio is currently waiting for.
     */
    refreshDiscoveryInBackground();

    res.json({
      meta: {
        id: "narucannon",
        type: "series",
        name: "NaruCannon",
        description: "NaruCannon custom series",

        poster:
          "https://raw.githubusercontent.com/shihabali237-ai/narucannon-stremio/refs/heads/main/narucannon-poster.jpg",

        posterShape: "poster",

        videos: episodes.map(ep => ({
          id: ep.id,
          title: ep.title,
          released: "2002-01-01T00:00:00.000Z",
          season: ep.season,
          episode: ep.episode,

          ...(thumbnails[ep.id]
            ? { thumbnail: thumbnails[ep.id] }
            : {})
        }))
      }
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Could not load NaruCannon"
    });
  }
});

/*
 * ============================================================
 * STREAMS
 * ============================================================
 */

app.get(/^\/stream\/series\/(.+)\.json$/, async (req, res) => {
  try {
    const id = decodeURIComponent(req.params[0]);

    const episode = await findPixeldrainEpisode(id);

    if (!episode) {
      return res.json({
        streams: []
      });
    }

    res.json({
      streams: [
        {
          name: "NaruCannon",
          title: episode.title,
          url: episode.url
        }
      ]
    });
  } catch (error) {
    console.error(error);

    res.json({
      streams: []
    });
  }
});

/*
 * ============================================================
 * SERVER
 * ============================================================
 */

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `NaruCannon optimized server running on port ${PORT}`
  );
});