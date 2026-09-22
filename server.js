const express = require("express");

const app = express();
const PORT = 8080;

const PIXELDRAIN_ID = "CEG3sGRE";
const PIXELDRAIN_API = `https://pixeldrain.net/api/filesystem/${PIXELDRAIN_ID}`;

const CACHE_TTL = 10 * 60 * 1000;

let discoveryCache = [];
let discoveryCacheTime = 0;
let discoveryPromise = null;

const showDescription =
  "Naruto Uzumaki is a young ninja with a dream of becoming Hokage. Alongside his teammates Sasuke Uchiha and Sakura Haruno, and their teacher Kakashi Hatake, Naruto begins his journey through the shinobi world. NaruCannon Recut presents the story in a streamlined format, cutting filler, excessive recaps and unnecessary repetition while keeping the main story intact.";

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
  "Start Your Engines",
  "The Tenth Question: All or Nothing!",
  "The Chunin Exam Stage 2: The Forest of Death",
  "Eat or Be Eaten: Panic in the Forest",
  "Introduction of Orochimaru",
  "Bushy Brow's Pledge: Undying Love and Protection!",
  "Sakura Blossoms!",
  "Clone Counter Attack!",
  "Surviving the Cut",
  "Sasuke vs Yoro",
  "Kakashi and Orochimaru: Face to Face",
  "Kunoichi Rumble: The Rivals Get Serious!",
  "Sakura vs Ino",
  "Akamaru Unleashed! Who's Top Dog now?",
  "Byakugan Battle: Hinata Grows Bold!",
  "Gaara vs. Rock Lee: The Power of Youth Explodes!",
  "A Shadow in Darkness: Danger Approaches Sasuke"
];

const season2Dates = [
  "2003-02-27T00:00:00.000Z",
  "2003-03-06T00:00:00.000Z",
  "2003-03-13T00:00:00.000Z",
  "2003-03-20T00:00:00.000Z",
  "2003-04-03T00:00:00.000Z",
  "2003-04-17T00:00:00.000Z",
  "2003-04-24T00:00:00.000Z",
  "2003-05-08T00:00:00.000Z",
  "2003-05-15T00:00:00.000Z",
  "2003-05-22T00:00:00.000Z",
  "2003-06-19T00:00:00.000Z",
  "2003-06-26T00:00:00.000Z",
  "2003-07-10T00:00:00.000Z",
  "2003-07-17T00:00:00.000Z",
  "2003-07-24T00:00:00.000Z",
  "2003-07-31T00:00:00.000Z",
  "2003-08-14T00:00:00.000Z",
  "2003-08-28T00:00:00.000Z",
  "2003-09-11T00:00:00.000Z",
  "2003-10-02T00:00:00.000Z"
];

const knownEpisodes = [];

for (let episode = 1; episode <= 13; episode++) {
  knownEpisodes.push({
    id: `narucannon:1:${episode}`,
    season: 1,
    episode,
    title: season1Titles[episode - 1],
    released: season1Dates[episode - 1]
  });
}

for (let episode = 1; episode <= 38; episode++) {
  knownEpisodes.push({
    id: `narucannon:2:${episode}`,
    season: 2,
    episode,
    title:
      season2Titles[episode - 1] ||
      `Chunin Exams ${String(episode).padStart(2, "0")}`,
    released:
      season2Dates[episode - 1] ||
      "2003-10-02T00:00:00.000Z"
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
    "https://www.animehistory.org/uploads/screencaps/naruto-episode-013-haku_s_secret-jutsu-demonic-mirroring-ice-crystals/cap_14-35_1954.jpg",

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
    "https://animehistory.org/uploads/screencaps/naruto-episode-024-start-your-engines-the-chunin-exam-begins_/cap_13-37_8db4.jpg",

  "narucannon:2:5":
    "https://animehistory.org/uploads/screencaps/naruto-episode-025-the-tenth-question-all-or-nothing_/cap_06-26_f083.jpg",

  "narucannon:2:6":
    "https://animehistory.org/uploads/screencaps/naruto-episode-025-the-tenth-question-all-or-nothing_/cap_18-56_fcd2.jpg",

  "narucannon:2:7":
    "https://animehistory.org/uploads/screencaps/naruto-episode-028-eat-or-be-eaten-panic-in-the-forest/cap_04-23_e4f0.jpg",

  "narucannon:2:8":
    "https://animehistory.org/uploads/screencaps/naruto-episode-030-the-sharingan-revived-dragon-flame-jutsu_/cap_09-20_3aa8.jpg",

  "narucannon:2:9":
    "https://animehistory.org/uploads/screencaps/naruto-episode-031-bushy-brow_s-pledge-undying-love-and-protection_/cap_08-44_fa8b.jpg",

  "narucannon:2:10":
    "https://animehistory.org/uploads/screencaps/naruto-episode-032-sakura-blossoms_/cap_03-12_9d55.jpg",

  "narucannon:2:11":
    "https://animehistory.org/uploads/screencaps/naruto-episode-036-clone-vs-clone-mine-are-better-than-yours_/cap_10-29_b012.jpg",

  "narucannon:2:12":
    "https://animehistory.org/uploads/screencaps/naruto-episode-037-surviving-the-cut_-the-rookie-nine-together-again_/cap_12-48_b35d.jpg",

  "narucannon:2:13":
    "https://animehistory.org/uploads/screencaps/naruto-episode-039-bushy-brow_s-jealousy-lions-barrage-unleashed_/cap_03-44_c1f9.jpg",

  "narucannon:2:14":
    "https://animehistory.org/uploads/screencaps/naruto-episode-040-kakashi-and-orochimaru-face-to-face_/cap_12-57_a867.jpg",

  "narucannon:2:15":
    "https://animehistory.org/uploads/screencaps/naruto-episode-041-kunoichi-rumble-the-rivals-get-serious_/cap_09-22_0fdd.jpg",

  "narucannon:2:16":
    "https://animehistory.org/uploads/screencaps/naruto-episode-042-the-ultimate-battle-cha_/cap_04-50_96d2.jpg",

  "narucannon:2:17":
    "https://animehistory.org/uploads/screencaps/naruto-episode-044-akamaru-unleashed_-who_s-top-dog-now/cap_16-49_3f84.jpg",

  "narucannon:2:18":
    "https://animehistory.org/uploads/screencaps/naruto-episode-046-byakugan-battle-hinata-grows-bold_/cap_17-21_b655.jpg",

  "narucannon:2:19":
    "https://animehistory.org/uploads/screencaps/naruto-episode-048-gaara-vs-rock-lee-the-power-of-youth-explodes_/cap_15-31_8461.jpg",

  "narucannon:2:20":
    "https://animehistory.org/uploads/screencaps/naruto-episode-051-a-shadow-in-darkness-danger-approaches-sasuke/cap_06-47_ea9c.jpg"
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
    (a, b) =>
      a.season - b.season ||
      a.episode - b.episode
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
      console.error(
        "Background discovery failed:",
        error
      );

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
      ? {
          thumbnail: thumbnails[ep.id]
        }
      : {})
  }));
}

async function getAllEpisodes() {
  const known = getKnownEpisodes();

  if (
    discoveryCache.length > 0 &&
    Date.now() - discoveryCacheTime < CACHE_TTL
  ) {
    return [
      ...known,
      ...discoveryCache
    ];
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

    const match = item.name.match(
      /^(\d+(?:\.\d+)?)\s*-\s*(.+)$/
    );

    return (
      match &&
      Number(match[1]) === seasonNumber
    );
  });

  if (!seasonFolder) {
    return null;
  }

  const folder = await getFolder(
    seasonFolder.path.replace(
      `/CEG3sGRE/`,
      ""
    )
  );

  for (const file of folder.children) {
    if (file.type !== "file") continue;

    if (
      !file.name
        .toLowerCase()
        .endsWith(".mp4")
    ) {
      continue;
    }

    const match = file.name.match(
      /\s(\d+)\s+\(Sub\)\.mp4$/i
    );

    if (!match) continue;

    if (
      Number(match[1]) !== episodeNumber
    ) {
      continue;
    }

    return {
      id,

      title: file.name
        .replace(
          /^\[NaruCannon Recut\]\s*/i,
          ""
        )
        .replace(
          /\s*\(Sub\)\.mp4$/i,
          ""
        ),

      season: seasonNumber,

      episode: episodeNumber,

      url: getPixeldrainFileUrl(
        file.path
      )
    };
  }

  return null;
}

app.use((req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  next();
});

app.get("/manifest.json", (req, res) => {
  res.setHeader(
    "Cache-Control",
    "no-store"
  );

  refreshDiscoveryInBackground();

  res.json({
    id: "com.narucannon.custom",

    version: "2.0.2",

    name: "NaruCannon",

    description: showDescription,

    resources: [
      "catalog",
      "meta",
      "stream"
    ],

    types: [
      "series"
    ],

    catalogs: [
      {
        type: "series",
        id: "narucannon",
        name: "NaruCannon"
      }
    ]
  });
});

app.get(
  "/catalog/series/narucannon.json",
  (req, res) => {
    res.setHeader(
      "Cache-Control",
      "no-store"
    );

    refreshDiscoveryInBackground();

    res.json({
      metas: [
        {
          id: "narucannon",

          type: "series",

          name: "NaruCannon",

          description: showDescription,

          poster:
            "https://raw.githubusercontent.com/shihabali237-ai/narucannon-stremio/refs/heads/main/narucannon-poster.jpg",

          posterShape:
            "poster"
        }
      ]
    });
  }
);

app.get(
  "/meta/series/narucannon.json",
  async (req, res) => {
    try {
      res.setHeader(
        "Cache-Control",
        "no-store"
      );

      const episodes =
        await getAllEpisodes();

      res.json({
        meta: {
          id: "narucannon",

          type: "series",

          name: "NaruCannon",

          description: showDescription,

          poster:
            "https://raw.githubusercontent.com/shihabali237-ai/narucannon-stremio/refs/heads/main/narucannon-poster.jpg",

          posterShape:
            "poster",

          videos: episodes.map(ep => ({
            id: ep.id,

            title: ep.title,

            released:
              ep.released ||
              "2002-01-01T00:00:00.000Z",

            season: ep.season,

            episode: ep.episode,

            ...(ep.thumbnail
              ? {
                  thumbnail:
                    ep.thumbnail
                }
              : {})
          }))
        }
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Could not load NaruCannon from Pixeldrain"
      });
    }
  }
);

app.get(
  /^\/stream\/series\/(.+)\.json$/,
  async (req, res) => {
    try {
      const id =
        decodeURIComponent(
          req.params[0]
        );

      const episode =
        await findPixeldrainEpisode(
          id
        );

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
  }
);

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `NaruCannon Pixeldrain server running on port ${PORT}`
    );
  }
);