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
  "The Beginning",
  "Konohamaru",
  "Start of Team 7",
  "Bell Test",
  "Team 7's First Mission",
  "Zabuza Introduction",
  "Team 7 Fight Zabuza",
  "Tree Climbing",
  "Haku Introduction",
  "Sasuke Fights Haku",
  "The Nine-Tails",
  "Haku's Sacrifice",
  "The Demon in the Snow"
];

const season1Dates = [
  "2002-10-03T00:00:00.000Z",
  "2002-10-10T00:00:00.000Z",
  "2002-10-17T00:00:00.000Z",
  "2002-10-24T00:00:00.000Z",
  "2002-10-31T00:00:00.000Z",
  "2002-11-14T00:00:00.000Z",
  "2002-11-21T00:00:00.000Z",
  "2002-12-05T00:00:00.000Z",
  "2002-12-19T00:00:00.000Z",
  "2002-12-26T00:00:00.000Z",
  "2003-01-30T00:00:00.000Z",
  "2003-02-06T00:00:00.000Z",
  "2003-02-13T00:00:00.000Z"
];

const season2Titles = [
  "The Chunin Exams Begin",
  "Rock Lee vs Sasuke",
  "Genin Takedown",
  "Start Your Engines"
];

const season2Dates = [
  "2003-02-27T00:00:00.000Z",
  "2003-03-06T00:00:00.000Z",
  "2003-03-13T00:00:00.000Z",
  "2003-03-20T00:00:00.000Z"
];

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
    "https://www.animehistory.org/uploads/screencaps/naruto-episode-019-the-demon-in-the-snow/cap_15-25_4981.jpg",

  "narucannon:2:1":
    "https://animehistory.org/uploads/screencaps/naruto-episode-020-a-new-chapter-begins-the-chunin-exam_/cap_21-28_e0f5.jpg",

  "narucannon:2:2":
    "https://animehistory.org/uploads/screencaps/naruto-episode-022-chunin-challenge-rock-lee-vs-sasuke_/cap_09-57_011a.jpg",

  "narucannon:2:3":
    "https://animehistory.org/uploads/screencaps/naruto-episode-023-genin-takedown_-all-nine-rookies-face-off_/cap_02-47_d7d5.jpg",

  "narucannon:2:4":
    "https://animehistory.org/uploads/screencaps/naruto-episode-024-start-your-engines-the-chunin-exam-begins_/cap_13-37_8db4.jpg"
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

      const match = file.name.match(/\s(\d+)\s+\(Sub\)\.mp4$/i);

      if (!match) continue;

      const episode = Number(match[1]);

      const relativePath = file.path
        .replace(`/CEG3sGRE/`, "")
        .split("/")
        .map(encodeURIComponent)
        .join("/");

      const url = `${PIXELDRAIN_API}/${relativePath}`;

      results.push({
        id: `narucannon:${result.season.season}:${episode}`,
        title: file.name
          .replace(/^\[NaruCannon Recut\]\s*/i, "")
          .replace(/\s*\(Sub\)\.mp4$/i, ""),
        season: result.season.season,
        episode,
        url
      });
    }
  }

  return results.sort(
    (a, b) => a.season - b.season || a.episode - b.episode
  );
}

async function refreshDiscoveryInBackground() {
  if (discoveryPromise) {
    return discoveryPromise;
  }

  discoveryPromise = discoverFutureSeasons()
    .then(results => {
      discoveryCache = results;
      discoveryCacheTime = Date.now();
      return results;
    })
    .catch(error => {
      console.error("Background discovery failed:", error);
      return [];
    })
    .finally(() => {
      discoveryPromise = null;
    });

  return discoveryPromise;
}

function getKnownEpisodes() {
  return knownEpisodes.map(ep => ({
    ...ep,
    ...(thumbnails[ep.id]
      ? { thumbnail: thumbnails[ep.id] }
      : {})
  }));
}

async function getAllEpisodes() {
  const known = getKnownEpisodes();

  if (
    discoveryCache.length > 0 &&
    Date.now() - discoveryCacheTime < CACHE_TTL
  ) {
    return [...known, ...discoveryCache];
  }

  refreshDiscoveryInBackground();

  return known;
}

function getPixeldrainFileUrl(filePath) {
  const relativePath = filePath
    .replace(`/CEG3sGRE/`, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  return `${PIXELDRAIN_API}/${relativePath}`;
}

async function findPixeldrainEpisode(id) {
  const parts = id.split(":");

  if (parts.length !== 3) {
    return null;
  }

  const seasonNumber = Number(parts[1]);
  const episodeNumber = Number(parts[2]);

  const root = await getFolder();

  const seasonFolder = root.children.find(item => {
    if (item.type !== "dir") {
      return false;
    }

    const match = item.name.match(/^(\d+(?:\.\d+)?)\s*-\s*(.+)$/);

    return match && Number(match[1]) === seasonNumber;
  });

  if (!seasonFolder) {
    return null;
  }

  const folder = await getFolder(
    seasonFolder.path.replace(`/CEG3sGRE/`, "")
  );

  for (const file of folder.children) {
    if (file.type !== "file") continue;
    if (!file.name.toLowerCase().endsWith(".mp4")) continue;

    const match = file.name.match(/\s(\d+)\s+\(Sub\)\.mp4$/i);

    if (!match) continue;

    if (Number(match[1]) !== episodeNumber) continue;

    return {
      id,
      title: file.name
        .replace(/^\[NaruCannon Recut\]\s*/i, "")
        .replace(/\s*\(Sub\)\.mp4$/i, ""),
      season: seasonNumber,
      episode: episodeNumber,
      url: getPixeldrainFileUrl(file.path)
    };
  }

  return null;
}

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

app.get("/manifest.json", (req, res) => {
  res.json({
    id: "com.narucannon.custom",
    version: "2.0.0",
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

app.get("/catalog/series/narucannon.json", (req, res) => {
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

app.get("/meta/series/narucannon.json", async (req, res) => {
  try {
    const episodes = await getAllEpisodes();

    res.json({
      meta: {
        id: "narucannon",
        type: "series",
        name: "NaruCannon",
        description:
          "Naruto Uzumaki is a young ninja with a dream of becoming Hokage. Alongside his teammates Sasuke Uchiha and Sakura Haruno, and their teacher Kakashi Hatake, Naruto begins his journey through the shinobi world. NaruCannon Recut presents the story in a streamlined format, cutting filler, excessive recaps and unnecessary repetition while keeping the main story intact.",

        poster:
          "https://raw.githubusercontent.com/shihabali237-ai/narucannon-stremio/refs/heads/main/narucannon-poster.jpg",

        posterShape: "poster",

        videos: episodes.map(ep => ({
          id: ep.id,
          title: ep.title,
          released:
            ep.released ||
            "2002-01-01T00:00:00.000Z",
          season: ep.season,
          episode: ep.episode,
          ...(ep.thumbnail
            ? { thumbnail: ep.thumbnail }
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `NaruCannon Pixeldrain server running on port ${PORT}`
  );
});