import { klient } from "./app.js";
import * as z from "zod/v4";

// CREATE LIKE
export const createLike = async (req, res) => {
  if (!req.user) {
    return res.sendStatus(401);
  }
  const currentlyLoggedInUser = req.user.id;

  const likeSchema = z.object({
    comment_id: z.number(),
    owner_id: z.number(),
    created_on: z.date(),
  });

  const likeData = {
    comment_id: req.body.comment,
    owner_id: currentlyLoggedInUser,
    created_on: new Date(),
  };

  const validatedData = likeSchema.parse(likeData);

  const insertResponse = await klient("like_comments_likecomment").insert(
    validatedData,
    ["id"]
  );

  const likeResponse = await klient
    .select("like_comments_likecomment.*")
    .from("like_comments_likecomment")
    .where("like_comments_likecomment.id", insertResponse[0].id);

  res.send(await createLikeMapper(likeResponse[0]));
};

// CREATE LIKE MAPPER
const createLikeMapper = async (likeResponse) => {
  const like = {
    id: likeResponse.id,
    owner_id: likeResponse.owner_id,
    comment_id: likeResponse.comment_id,
    created_on: likeResponse.created_on,
  };

  return like;
};

// DELETE LIKE
export const deleteLike = async (req, res) => {
  const likeId = Number(req.params.id);

  await klient("like_comments_likecomment")
    .where("like_comments_likecomment.id", likeId)
    .del();

  res.sendStatus(200);
};
