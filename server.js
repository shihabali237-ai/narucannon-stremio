const express = require("express");

const app = express();
const PORT = 8080;

const PIXELDRAIN_ID = "CEG3sGRE";
const PIXELDRAIN_API = `https://pixeldrain.net/api/filesystem/${PIXELDRAIN_ID}`;

const CACHE_TTL = 10 * 60 * 1000;

let episodesCache = null;
let episodesCacheTime = 0;
let episodesPromise = null;

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// Get the contents of a Pixeldrain folder
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

// Find all season folders
async function getSeasons() {
  const root = await getFolder();

  return root.children
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
    .sort((a, b) => a.season - b.season);
}

// Build the complete episode list from Pixeldrain
async function loadEpisodes() {
  console.log("Refreshing NaruCannon episode cache...");

  const seasons = await getSeasons();
  const episodes = [];

  // Check all season folders at the same time
  const folders = await Promise.all(
    seasons.map(async season => ({
      season,
      folder: await getFolder(
        season.path.replace(`/CEG3sGRE/`, "")
      )
    }))
  );

  for (const { season, folder } of folders) {
    for (const file of folder.children) {
      if (file.type !== "file") continue;
      if (!file.name.toLowerCase().endsWith(".mp4")) continue;

      const match = file.name.match(/\s(\d+)\s+\(Sub\)\.mp4$/i);

      if (!match) continue;

      const episode = Number(match[1]);

      const relativePath = file.path
        .replace(`/CEG3sGRE/`, "")
        .split("/")
        .map(encodeURIComponent)
        .join("/");

      const url = `${PIXELDRAIN_API}/${relativePath}`;

      episodes.push({
        id: `narucannon:${season.season}:${episode}`,
        title: file.name
          .replace(/^\[NaruCannon Recut\]\s*/i, "")
          .replace(/\s*\(Sub\)\.mp4$/i, ""),
        season: season.season,
        episode,
        url
      });
    }
  }

  episodes.sort(
    (a, b) => a.season - b.season || a.episode - b.episode
  );

  console.log(`Cached ${episodes.length} NaruCannon episodes.`);

  return episodes;
}

// Use cached data instead of scanning Pixeldrain every request
async function getEpisodes() {
  const now = Date.now();

  if (
    episodesCache &&
    now - episodesCacheTime < CACHE_TTL
  ) {
    return episodesCache;
  }

  // Prevent multiple simultaneous Pixeldrain scans
  if (episodesPromise) {
    return episodesPromise;
  }

  episodesPromise = loadEpisodes()
    .then(episodes => {
      episodesCache = episodes;
      episodesCacheTime = Date.now();
      return episodes;
    })
    .finally(() => {
      episodesPromise = null;
    });

  return episodesPromise;
}

// Manifest
app.get("/manifest.json", (req, res) => {
  res.json({
    id: "com.narucannon.custom",
    version: "2.1.0",
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

// Catalog
app.get("/catalog/series/narucannon.json", (req, res) => {
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

// Series metadata
app.get("/meta/series/narucannon.json", async (req, res) => {
  try {
    const episodes = await getEpisodes();

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
      error: "Could not load NaruCannon from Pixeldrain"
    });
  }
});

// Streams
app.get(/^\/stream\/series\/(.+)\.json$/, async (req, res) => {
  try {
    const id = decodeURIComponent(req.params[0]);
    const episodes = await getEpisodes();

    const episode = episodes.find(ep => ep.id === id);

    if (!episode) {
      return res.json({ streams: [] });
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`NaruCannon Pixeldrain server running on port ${PORT}`);
});