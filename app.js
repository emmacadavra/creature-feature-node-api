import express from "express";
import cors from "cors";
import { types } from "pg";
import knex from "knex";
import { createPost, editPost, getPosts } from "./posts.js";
import { getComments } from "./comments.js";
import { getProfiles } from "./profiles.js";
import { uploadFile, uploadImage } from "./image-upload.js";

// Sets BigInt type correctly to Number
types.setTypeParser(20, (val) => {
  return parseInt(val, 10);
});

// Express Connection
const app = express();

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// Knex Connection
export const klient = knex({
  client: "pg",
  connection: {
    user: "admin",
    password: "admin",
    host: "localhost",
    port: 5432,
    database: "creature_feature",
  },
  searchPath: ["creature_feature", "public"],
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// POSTS (GET)
app.get("/posts", getPosts);

// POSTS (POST)
app.post("/posts", createPost);

// POSTS - UPLOAD IMAGE (POST)
app.post("/image-upload", uploadFile, uploadImage);

// POSTS (PATCH)
app.patch("/posts/:id", editPost);

// COMMENTS (GET)
app.get("/comments", getComments);

// PROFILES (GET)
app.get("/profiles", getProfiles);

app.listen(4000);
