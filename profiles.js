import { klient } from "./app.js";
import { getCloudinaryImage } from "./api/cloudinary.js";
import * as z from "zod/v4";

// GET PROFILES
export const getProfiles = async (req, res) => {
  const currentlyLoggedInUser = req.user?.id;

  const profiles = await buildQuery("profilesQuery", {
    currentlyLoggedInUser: currentlyLoggedInUser,
    profilePageId: req.params.id,
  });

  const profilesCount = await buildQuery("countQuery", {
    currentlyLoggedInUser: currentlyLoggedInUser,
    profilePageId: req.params.id,
  });

  res.send({
    totalItems: Number(profilesCount[0].count),
    next: null, // HARD-CODED, NEEDS REWORKING?
    previous: null, // HARD-CODED, NEEDS REWORKING?
    results: await profilesMapper(profiles, currentlyLoggedInUser),
  });
};

// PROFILES QUERY BUILDER
const buildQuery = (queryType, { currentlyLoggedInUser, profilePageId }) => {
  let query;

  if (queryType === "profilesQuery") {
    query = klient.select(
      "profiles_profile.*",
      "auth_user.username AS profile_owner",
      "user_posts.count AS posts_count",
      "user_followers.count AS followers_count",
      "user_follows.count AS following_count"
    );
  }

  if (queryType === "profilesQuery" && currentlyLoggedInUser) {
    query.select("followers_follower.id AS following_id");
  }

  if (queryType === "countQuery") {
    query = klient.count("*");
  }

  query
    .from("profiles_profile")
    .innerJoin("auth_user", "profiles_profile.owner_id", "auth_user.id")
    .leftOuterJoin(
      function () {
        this.select("posts_post.owner_id")
          .count("posts_post.id")
          .from("posts_post")
          .groupBy("posts_post.owner_id")
          .as("user_posts");
      },
      "user_posts.owner_id",
      "profiles_profile.id"
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
      "profiles_profile.id"
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
      "profiles_profile.id"
    );

  if (currentlyLoggedInUser) {
    query.leftOuterJoin("followers_follower", function () {
      this.on(function () {
        this.on("followers_follower.followed_id", "=", "profiles_profile.id");
        this.andOn(
          klient.raw(
            "followers_follower.owner_id = ?",
            `${currentlyLoggedInUser}`
          )
        );
      });
    });
  }

  if (profilePageId) {
    const profileId = Number(profilePageId);
    query.where("profiles_profile.id", profileId);
  }

  if (queryType === "profilesQuery") {
    query.orderBy("followers_count", "desc");
  }

  return query;
};

// PROFILES MAPPER
const profilesMapper = async (profiles, currentlyLoggedInUser) => {
  const profilesArray = [];

  for (const profile of profiles) {
    const profileImage = await getCloudinaryImage(profile.image);

    let postsCount = profile.posts_count;
    let followersCount = profile.followers_count;
    let followingCount = profile.following_count;

    if (!profile.posts_count) {
      postsCount = 0;
    }

    if (!profile.followers_count) {
      followersCount = 0;
    }

    if (!profile.following_count) {
      followingCount = 0;
    }

    profilesArray.push({
      id: profile.id,
      owner: profile.profile_owner,
      is_owner: currentlyLoggedInUser === profile.id,
      name: profile.name,
      content: profile.content,
      image: profileImage,
      following_id: profile.following_id,
      posts_count: postsCount,
      followers_count: followersCount,
      following_count: followingCount,
      created_on: profile.created_on,
      updated_on: profile.updated_on,
    });
  }

  return profilesArray;
};

// UPDATE PROFILE
export const updateProfile = async (req, res) => {
  if (!req.user) {
    return res.sendStatus(401);
  }
  const currentlyLoggedInUser = req.user.id;

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

  const updatedProfile = await klient("profiles_profile")
    .where({ id: validatedData.id })
    .update(validatedData, ["id"]);

  const query = klient
    .select(
      "profiles_profile.*",
      "auth_user.username AS profile_owner",
      "user_posts.count AS posts_count",
      "user_followers.count AS followers_count",
      "user_follows.count AS following_count"
    )
    .from("profiles_profile")
    .innerJoin("auth_user", "profiles_profile.owner_id", "auth_user.id")
    .leftOuterJoin(
      function () {
        this.select("posts_post.owner_id")
          .count("posts_post.id")
          .from("posts_post")
          .groupBy("posts_post.owner_id")
          .as("user_posts");
      },
      "user_posts.owner_id",
      "profiles_profile.id"
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
      "profiles_profile.id"
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
      "profiles_profile.id"
    )
    .where("profiles_profile.id", updatedProfile[0].id);

  const profileResponse = await query;

  res.send(
    await updateProfileMapper(profileResponse[0], currentlyLoggedInUser)
  );
};

// UPDATE PROFILE MAPPER
const updateProfileMapper = async (profileResponse, currentlyLoggedInUser) => {
  const profileImage = await getCloudinaryImage(profileResponse.image);

  const profile = {
    id: profileResponse.id,
    owner: profileResponse.profile_owner,
    is_owner: currentlyLoggedInUser === profile.id,
    name: profileResponse.name,
    content: profileResponse.content,
    image: profileImage,
    following_id: profile.following_id,
    posts_count: profileResponse.posts_count,
    followers_count: profileResponse.followers_count,
    following_count: profileResponse.following_count,
    created_on: profileResponse.created_on,
    updated_on: profileResponse.updated_on,
  };

  return profile;
};
