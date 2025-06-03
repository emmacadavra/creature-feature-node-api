import express from "express";
import cors from "cors";
import { Client, types } from "pg";
import knex from "knex";
import { getCloudinaryImage } from "./api/cloudinary.js";

// Sets BigInt type correctly to Number
types.setTypeParser(20, (val) => {
  return parseInt(val, 10);
});

// Express Connection
const app = express();
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

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

// POSTS (GET)
app.get("/posts", async (req, res) => {
  const query = klient
    .select(
      "posts_post.*",
      "auth_user.username AS post_owner",
      "profiles_profile.id AS profile_id",
      "profiles_profile.image AS profile_image",
      "post_comments.count AS comments_count",
      "good_reactions.count AS good_count",
      "love_reactions.count AS love_count",
      "crown_reactions.count AS crown_count",
      klient.raw(
        "COALESCE(love_reactions.count, 0) + COALESCE(good_reactions.count, 0) + COALESCE(crown_reactions.count, 0) AS reactions_count"
      )
    )

    .from("posts_post")
    .innerJoin("auth_user", "posts_post.owner_id", "auth_user.id")
    .innerJoin("profiles_profile", "posts_post.owner_id", "profiles_profile.id")
    .leftOuterJoin(
      function () {
        this.select("comments_comment.post_id")
          .count("comments_comment.id")
          .from("comments_comment")
          .groupBy("comments_comment.post_id")
          .as("post_comments");
      },
      "post_comments.post_id",
      "posts_post.id"
    )
    .leftOuterJoin(
      function () {
        this.select("reactions_reaction.post_id")
          .count("reactions_reaction.id")
          .from("reactions_reaction")
          .where("reactions_reaction.reaction", "GOOD")
          .groupBy("reactions_reaction.post_id")
          .as("good_reactions");
      },
      "good_reactions.post_id",
      "posts_post.id"
    )
    .leftOuterJoin(
      function () {
        this.select("reactions_reaction.post_id")
          .count("reactions_reaction.id")
          .from("reactions_reaction")
          .where("reactions_reaction.reaction", "LOVE")
          .groupBy("reactions_reaction.post_id")
          .as("love_reactions");
      },
      "love_reactions.post_id",
      "posts_post.id"
    )
    .leftOuterJoin(
      function () {
        this.select("reactions_reaction.post_id")
          .count("reactions_reaction.id")
          .from("reactions_reaction")
          .where("reactions_reaction.reaction", "CROWN")
          .groupBy("reactions_reaction.post_id")
          .as("crown_reactions");
      },
      "crown_reactions.post_id",
      "posts_post.id"
    );

  if (req.query.owner__followed__owner__profile) {
    query
      .innerJoin(
        "followers_follower",
        "posts_post.owner_id",
        "followers_follower.followed_id"
      )
      .where(
        "followers_follower.owner_id",
        req.query.owner__followed__owner__profile
      );
  }

  if (req.query.reactions__owner__profile) {
    query
      .innerJoin(
        "reactions_reaction",
        "posts_post.id",
        "reactions_reaction.post_id"
      )
      .where(
        "reactions_reaction.owner_id",
        req.query.reactions__owner__profile
      );
  }

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

  if (req.query.ordering) {
    query.orderBy("reactions_reaction.created_on", "desc");
    // hard-coded temporarily as only reactions have a different ordering rule
  } else {
    query.orderBy("posts_post.created_on", "desc");
  }

  query.limit(pageSize).offset((page - 1) * pageSize);

  // Debug: .toSQL().toNative()
  const posts = await query;

  res.send({
    // hard-coded temporarily to match old API format
    count: 3,
    next: null,
    previous: null,
    results: await postsMapper(posts, req.query.currentlyLoggedInUser),
  });
});

const postsMapper = async (posts, currentlyLoggedInUser) => {
  const postsArray = [];

  for (const post of posts) {
    const [postImage, profileImage] = await Promise.all([
      getCloudinaryImage(post.image),
      getCloudinaryImage(post.profile_image),
    ]);

    postsArray.push({
      id: post.id,
      owner: post.post_owner,
      is_owner: Number(currentlyLoggedInUser) === post.profile_id,
      profile_id: post.profile_id,
      profile_image: profileImage,
      title: post.title,
      excerpt: null, // REDUDANT
      content: post.content,
      image: postImage,
      image_filter: "normal", // REDUDANT
      category: post.category,
      status: "published", // REDUDANT
      // current_user_reaction: - AUTH - OBJECT LOOKS LIKE:
      //{
      //     "reaction_id": reaction.id,
      //     "reaction_type": reaction.reaction
      // }
      reactions_count: post.reactions_count,
      comments_count: post.comments_count,
      crown_count: post.crown_count,
      good_count: post.good_count,
      love_count: post.love_count,
      created_on: post.created_on,
      updated_on: post.updated_on,
    });
  }

  return postsArray;
};

// COMMENTS (GET)

app.listen(4000);
