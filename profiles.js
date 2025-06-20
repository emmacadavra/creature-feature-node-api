import { klient } from "./app.js";

// GET PROFILES - CURRENTLY ONLY GETS ONE PROFILE, NOT ALL
export const getProfiles = async (req, res) => {
  const query = klient
    .select(
      "profiles_profile.*",
      "user_posts.count AS posts_count",
      "user_followers.count AS followers_count",
      "user_follows.count AS followed_count"
    )
    .from("profiles_profile")
    .leftOuterJoin(
      function () {
        this.select("posts_post.owner_id")
          .count("posts_post.id")
          .from("posts_post")
          .groupBy("posts_post.owner_id")
          .as("user_posts");
      },
      "user_posts.owner_id",
      "profiles_profile.owner_id"
    )
    .leftOuterJoin(
      function () {
        this.select("followers_follower.followed_id")
          .count("followers_follower.id")
          .from("followers_follower")
          .groupBy("followers_follower.followed_id")
          .as("user_followers");
      },
      "user_followers.followed_id",
      "profiles_profile.owner_id"
    )
    .leftOuterJoin(
      function () {
        this.select("followers_follower.owner_id")
          .count("followers_follower.id")
          .from("followers_follower")
          .groupBy("followers_follower.owner_id")
          .as("user_follows");
      },
      "user_follows.owner_id",
      "profiles_profile.owner_id"
    )
    .orderBy("followers_count", "desc");

  const profile = await query;

  res.send(profile);
};
