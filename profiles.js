import { klient } from "./app.js";
import { getCloudinaryImage } from "./api/cloudinary.js";

// GET PROFILES
export const getProfiles = async (req, res) => {
  const query = klient
    .select(
      "profiles_profile.*",
      "auth_user.username AS profile_owner",
      "user_posts.count AS posts_count",
      "user_followers.count AS followers_count",
      "user_follows.count AS followed_count"
    )
    .from("profiles_profile")
    .innerJoin("auth_user", "profiles_profile.id", "auth_user.id")
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

  const profiles = await query;

  res.send({
    // hard-coded temporarily to match old API format
    count: 3,
    next: null,
    previous: null,
    results: await profilesMapper(profiles, req.query.currentlyLoggedInUser),
  });
};

// PROFILES MAPPER
const profilesMapper = async (profiles, currentlyLoggedInUser) => {
  const profilesArray = [];

  for (const profile of profiles) {
    const profileImage = await getCloudinaryImage(profile.image);

    profilesArray.push({
      id: profile.id,
      owner: profile.profile_owner,
      is_owner: Number(currentlyLoggedInUser) === profile.id,
      name: profile.name,
      content: profile.content,
      image: profileImage,
      following_id: null,
      posts_count: profile.posts_count,
      followers_count: profile.followers_count,
      following_count: profile.following_count,
      created_on: profile.created_on,
      updated_on: profile.updated_on,
    });
  }

  return profilesArray;
};
