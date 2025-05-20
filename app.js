import express from "express";
import { Client } from "pg";
import knex from "knex";

const app = express();

// PG Connection
const client = new Client({
  user: "admin",
  password: "admin",
  host: "localhost",
  port: 5432,
  database: "creature_feature",
});
await client.connect();

// Knex Connection
const klient = knex({
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

app.get("/posts", async (req, res) => {
  const query = klient
    .select("posts_post.*", "auth_user.username")
    .from("posts_post")
    .innerJoin("auth_user", "posts_post.owner_id", "auth_user.id");

  if (req.query.category) {
    query.where("posts_post.category", req.query.category);
  }

  if (req.query.owner__profile) {
    query.where("posts_post.owner_id", req.query.owner__profile);
  }

  if (req.query.search) {
    query.where(function () {
      this.whereILike("posts_post.title", `%${req.query.search}%`);
      this.orWhereILike("posts_post.content", `%${req.query.search}%`);
      this.orWhereILike("auth_user.username", `%${req.query.search}%`);
    });
  }

  const pageSize = 10;
  const page = req.query.page ?? 1;
  // ^ the ?? operator "returns its right-hand side operand when its left-hand side operand is null or undefined, and otherwise returns its left-hand side operand."
  query
    .orderBy("posts_post.created_on", "desc")
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  // Debug: .toSQL().toNative()
  const posts = await query;

  res.send({
    // hard-coded temporarily to match old API format
    count: 3,
    next: null,
    previous: null,
    results: posts,
  });
});

app.listen(4000);
