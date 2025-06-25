import { klient } from "./app.js";
import { getCloudinaryImage } from "./api/cloudinary.js";
import * as z from "zod/v4";

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
    );

  if (req.params.id) {
    const profileId = Number(req.params.id);
    query.where("profiles_profile.id", profileId);
  }

  query.orderBy("followers_count", "desc");

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

// UPDATE PROFILE
export const editProfile = async (req, res) => {
  const profileSchema = z.object({
    id: z.number(),
    name: z.string().trim().min(1).max(255),
    content: z.string().trim(),
    image: z.optional(z.string().trim()),
    updated_on: z.date(),
  });

  const profileData = {
    id: Number(req.params.id),
    name: req.body.name,
    content: req.body.content,
    updated_on: new Date(),
  };

  if (req.body.image) {
    profileData.image = req.body.image;
  }

  const validatedData = profileSchema.parse(profileData);

  const updateProfile = await klient("profiles_profile")
    .where({ id: validatedData.id })
    .update(validatedData, ["id"]);

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
    .where("profiles_profile.id", updateProfile[0].id);

  const profileResponse = await query;

  res.send(await updateProfileMapper(profileResponse[0]));
};

// UPDATE PROFILE MAPPER
const updateProfileMapper = async (profileResponse) => {
  const profileImage = await getCloudinaryImage(profileResponse.image);

  const profile = {
    id: profileResponse.id,
    owner: profileResponse.profile_owner,
    is_owner: true, // TEMP HARD-CODED
    name: profileResponse.name,
    content: profileResponse.content,
    image: profileImage,
    following_id: null,
    posts_count: profileResponse.posts_count,
    followers_count: profileResponse.followers_count,
    following_count: profileResponse.following_count,
    created_on: profileResponse.created_on,
    updated_on: profileResponse.updated_on,
  };

  return profile;
};
