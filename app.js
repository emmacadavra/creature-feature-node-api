import express from "express";
import cors from "cors";
import { types } from "pg";
import knex from "knex";
import { createPost, deletePost, editPost, getPosts } from "./posts.js";
import { getComments } from "./comments.js";
import { editProfile, getProfiles } from "./profiles.js";
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

// UPLOAD IMAGE - POSTS / PROFILES (POST)
app.post("/image-upload", uploadFile, uploadImage);

// POSTS ROUTES?

// app.route("/posts").get(getPosts).post(createPost);
// app.route("/posts/:id").patch(editPost).delete(deletePost);

// POSTS (GET)
app.get("/posts", getPosts);

// POSTS (POST)
app.post("/posts", createPost);

// POSTS (PATCH / UPDATE)
app.patch("/posts/:id", editPost);

// POSTS (DELETE)
app.delete("/posts/:id", deletePost);

// COMMENTS (GET)
app.get("/comments", getComments);

// PROFILES (GET)
app.get("/profiles{/:id}", getProfiles);

// PROFILES (PATCH / UPDATE)
app.patch("/profiles/:id", editProfile);

app.listen(4000);
