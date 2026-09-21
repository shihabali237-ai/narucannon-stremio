const express = require("express");

const app = express();
const PORT = 8080;

const PIXELDRAIN_ID = "CEG3sGRE";
const PIXELDRAIN_API = `https://pixeldrain.net/api/filesystem/${PIXELDRAIN_ID}`;

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

// Find all episodes inside a season
async function getEpisodes() {
  const seasons = await getSeasons();
  const episodes = [];

  for (const season of seasons) {
    const folder = await getFolder(
      season.path.replace(`/CEG3sGRE/`, "")
    );

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

      const url = `${PIXELDRAIN_API.replace(
        `/CEG3sGRE`,
        `/CEG3sGRE`
      )}/${relativePath}`;

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

  return episodes.sort(
    (a, b) => a.season - b.season || a.episode - b.episode
  );
}


// Manifest
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


// Catalog
app.get("/catalog/series/narucannon.json", (req, res) => {
  res.json({
    metas: [
      {
        id: "narucannon",
        type: "series",
        name: "NaruCannon"
      }
    ]
  });
});


// Series metadata
app.get("/meta/series/narucannon.json", async (req, res) => {
  try {
    const episodes = await getEpisodes();

    res.json({
      meta: {
  id: "narucannon",
  type: "series",
  name: "NaruCannon",
  description: "NaruCannon custom series",
  poster: "https://raw.githubusercontent.com/shihabali237-ai/narucannon-stremio/refs/heads/main/narucannon-poster.jpg",
posterShape: "poster",
        videos: episodes.map(ep => ({
          id: ep.id,
          title: ep.title,
          released: "2002-01-01T00:00:00.000Z",
          season: ep.season,
          episode: ep.episode
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
