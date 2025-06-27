import express from "express";
import cors from "cors";
import { types } from "pg";
import knex from "knex";
import { uploadFile, uploadImage } from "./image-upload.js";
import { createPost, deletePost, updatePost, getPosts } from "./posts.js";
import { createReaction, deleteReaction, updateReaction } from "./reactions.js";
import {
  createComment,
  deleteComment,
  getComments,
  updateComment,
} from "./comments.js";
import { createLike, deleteLike } from "./like-comments.js";
import { updateProfile, getProfiles } from "./profiles.js";

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

// POSTS (PATCH)
app.patch("/posts/:id", updatePost);

// POSTS (DELETE)
app.delete("/posts/:id", deletePost);

// REACTIONS (POST)
app.post("/reactions", createReaction);

// REACTIONS (PATCH)
app.patch("/reactions/:id", updateReaction);

// REACTIONS (DELETE)
app.delete("/reactions/:id", deleteReaction);

// COMMENTS (GET)
app.get("/comments", getComments);

// COMMENTS (POST)
app.post("/comments", createComment);

// COMMENTS (PATCH)
app.patch("/comments/:id", updateComment);

// COMMENTS (DELETE)
app.delete("/comments/:id", deleteComment);

// LIKE COMMENTS (POST)
app.post("/like-comments", createLike);

// LIKE COMMENTS (DELETE)
app.delete("/like-comments/:id", deleteLike);

// PROFILES (GET)
app.get("/profiles{/:id}", getProfiles);

// PROFILES (PATCH / UPDATE)
app.patch("/profiles/:id", updateProfile);

app.listen(4000);
