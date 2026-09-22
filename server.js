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

const known