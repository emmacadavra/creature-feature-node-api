import { klient } from "./app.js";
import { getCloudinaryImage } from "./api/cloudinary.js";
import * as z from "zod/v4";

// GET COMMENTS
export const getComments = async (req, res) => {
  if (!req.query.post) {
    throw new Error("Post ID must be provided!");
  }

  const query = klient
    .select(
      "comments_comment.*",
      "auth_user.username AS comment_owner",
      "profiles_profile.owner_id AS profile_id",
      "profiles_profile.image AS profile_image",
      "comment_likes.count AS likes_count"
    )
    .from("comments_comment")
    .innerJoin("auth_user", "comments_comment.owner_id", "auth_user.id")
    .innerJoin(
      "profiles_profile",
      "comments_comment.owner_id",
      "profiles_profile.owner_id"
    )
    .leftOuterJoin(
      function () {
        this.select("like_comments_likecomment.comment_id")
          .count("like_comments_likecomment.id")
          .from("like_comments_likecomment")
          .groupBy("like_comments_likecomment.comment_id")
          .as("comment_likes");
      },
      "comment_likes.comment_id",
      "comments_comment.id"
    )
    .where("comments_comment.post_id", req.query.post)
    .orderBy("comments_comment.created_on", "desc");

  // Debug: .toSQL().toNative()
  const comments = await query;

  res.send({
    // hard-coded temporarily to match old API format
    count: 3,
    next: null,
    previous: null,
    results: await commentsMapper(comments, req.query.currentlyLoggedInUser),
  });
};

// COMMENTS MAPPER
const commentsMapper = async (comments, currentlyLoggedInUser) => {
  const commentsArray = [];

  for (const comment of comments) {
    const profileImage = await getCloudinaryImage(comment.profile_image);

    commentsArray.push({
      id: comment.id,
      owner: comment.comment_owner,
      is_owner: true, // TEMP HARD-CODED,
      profile_id: comment.profile_id,
      profile_image: profileImage,
      like_id: null, // REDUNDANT
      likes_count: comment.likes_count,
      created_on: comment.created_on,
      updated_on: comment.updated_on,
      content: comment.content,
      post: comment.post_id,
    });
  }

  return commentsArray;
};

export const createComment = async (req, res) => {
  const commentSchema = z.object({
    content: z.string(),
    post_id: z.number(),
    owner_id: z.number(),
    created_on: z.date(),
    updated_on: z.date(),
  });

  const commentData = {
    content: req.body.content,
    post_id: req.body.post,
    owner_id: req.body.owner,
    created_on: new Date(),
    updated_on: new Date(),
  };

  const validatedData = commentSchema.parse(commentData);

  const insertResponse = await klient("comments_comment").insert(
    validatedData,
    ["id"]
  );

  const commentResponse = await klient
    .select(
      "comments_comment.*",
      "auth_user.username AS comment_owner",
      "profiles_profile.owner_id AS profile_id",
      "profiles_profile.image AS profile_image"
    )
    .from("comments_comment")
    .innerJoin("auth_user", "comments_comment.owner_id", "auth_user.id")
    .innerJoin(
      "profiles_profile",
      "comments_comment.owner_id",
      "profiles_profile.owner_id"
    )
    .where("comments_comment.id", insertResponse[0].id);

  res.send(await createUpdateCommentMapper(commentResponse[0]));
};

// CREATE/UPDATE COMMENTS MAPPER
const createUpdateCommentMapper = async (commentResponse) => {
  const profileImage = await getCloudinaryImage(commentResponse.profile_image);

  const comment = {
    id: commentResponse.id,
    owner: commentResponse.comment_owner,
    is_owner: commentResponse.owner_id === commentResponse.profile_id,
    profile_id: commentResponse.profile_id,
    profile_image: profileImage,
    like_id: null, // TEMP HARD-CODED - CURRENT USER COMMENT LIKE ID
    content: commentResponse.content,
    post: commentResponse.post_id,
    created_on: commentResponse.created_on,
    updated_on: commentResponse.updated_on,
  };

  return comment;
};
