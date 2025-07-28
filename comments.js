import { klient } from "./app.js";
import { getCloudinaryImage } from "./api/cloudinary.js";
import * as z from "zod/v4";

// GET COMMENTS
export const getComments = async (req, res) => {
  if (!req.query.post) {
    throw new Error("Post ID must be provided!");
  }

  const pageSize = 10;
  const page = Number(req.query.page) ?? 1; // NOT WORKING

  // Debug: .toSQL().toNative()
  const comments = await buildQuery("commentsQuery", req.query.post, {
    currentlyLoggedInUser: req.query.currentlyLoggedInUser,
    pageSize: pageSize,
    page: page,
  });

  const commentsCount = await buildQuery("countQuery", req.query.post, {
    currentlyLoggedInUser: req.query.currentlyLoggedInUser,
  });

  console.log(page);

  res.send({
    totalItems: Number(commentsCount[0].count),
    totalPages: Math.ceil(commentsCount[0].count / pageSize),
    currentPage: page, // NOT WORKING
    results: await commentsMapper(comments, req.query.currentlyLoggedInUser),
  });
};

// COMMENTS QUERY BUILDER
const buildQuery = (queryType, postId, { currentlyLoggedInUser }) => {
  let query;

  if (queryType === "commentsQuery") {
    query = klient.select(
      "comments_comment.*",
      "auth_user.username AS comment_owner",
      "profiles_profile.owner_id AS profile_id",
      "profiles_profile.image AS profile_image",
      "comment_likes.count AS likes_count"
    );
  }

  if (queryType === "commentsQuery" && currentlyLoggedInUser) {
    query.select("like_comments_likecomment.id AS like_id");
  }

  if (queryType === "countQuery") {
    query = klient.count("*");
  }

  query
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
    .where("comments_comment.post_id", postId);

  if (currentlyLoggedInUser) {
    query.leftOuterJoin("like_comments_likecomment", function () {
      this.on(function () {
        this.on(
          "like_comments_likecomment.comment_id",
          "=",
          "comments_comment.id"
        );
        this.andOn(
          klient.raw(
            "like_comments_likecomment.owner_id = ?",
            `${Number(currentlyLoggedInUser)}`
          )
        );
      });
    });
  }

  if (queryType === "commentsQuery") {
    query.orderBy("comments_comment.created_on", "desc");
    // .limit(pageSize)
    // .offset((page - 1) * pageSize);
  }

  return query;
};

// COMMENTS MAPPER
const commentsMapper = async (comments, currentlyLoggedInUser) => {
  const commentsArray = [];

  for (const comment of comments) {
    const profileImage = await getCloudinaryImage(comment.profile_image);

    let like_id = null;

    if (comment.like_id) {
      like_id = comment.like_id;
    }

    commentsArray.push({
      id: comment.id,
      owner: comment.comment_owner,
      is_owner: Number(currentlyLoggedInUser) === comment.profile_id,
      profile_id: comment.profile_id,
      profile_image: profileImage,
      like_id: like_id,
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

// UPDATE COMMENT
export const updateComment = async (req, res) => {
  const commentSchema = z.object({
    id: z.number(),
    content: z.string(),
    owner_id: z.number(),
    updated_on: z.date(),
  });

  const commentData = {
    id: Number(req.params.id),
    content: req.body.content,
    owner_id: req.body.owner,
    updated_on: new Date(),
  };

  const validatedData = commentSchema.parse(commentData);

  const updatedComment = await klient("comments_comment")
    .where({ id: validatedData.id })
    .update(validatedData, ["id"]);

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
    .where("comments_comment.id", updatedComment[0].id);

  res.send(await createUpdateCommentMapper(commentResponse[0]));
};

// DELETE COMMENT
export const deleteComment = async (req, res) => {
  const commentId = Number(req.params.id);

  await klient("comments_comment")
    .where("comments_comment.id", commentId)
    .del();

  res.sendStatus(200);
};
