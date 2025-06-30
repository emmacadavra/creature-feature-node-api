import { klient } from "./app.js";
import * as z from "zod/v4";

// CREATE FOLLOW
export const createFollow = async (req, res) => {
  const followSchema = z.object({
    owner_id: z.number(),
    followed_id: z.number(),
    created_on: z.date(),
  });

  const followData = {
    owner_id: req.body.owner,
    followed_id: req.body.followed,
    created_on: new Date(),
  };

  const validatedData = followSchema.parse(followData);

  const insertResponse = await klient("followers_follower").insert(
    validatedData,
    ["id"]
  );

  const followResponse = await klient
    .select(
      "followers_follower.*",
      "auth_owner.username AS owner_name",
      "auth_followed.username AS followed_name"
    )
    .from("followers_follower")
    .leftOuterJoin(
      "auth_user AS auth_owner",
      "followers_follower.owner_id",
      "auth_owner.id"
    )
    .leftOuterJoin(
      "auth_user AS auth_followed",
      "followers_follower.followed_id",
      "auth_followed.id"
    )
    .where("followers_follower.id", insertResponse[0].id);

  res.send(await createFollowMapper(followResponse[0]));
};

// CREATE FOLLOW MAPPER
const createFollowMapper = async (followResponse) => {
  const follow = {
    id: followResponse.id,
    owner_id: followResponse.owner_id,
    owner_name: followResponse.owner_name,
    followed_id: followResponse.followed_id,
    followed_name: followResponse.followed_name,
    created_on: followResponse.created_on,
  };

  return follow;
};

// DELETE FOLLOW
export const deleteFollow = async (req, res) => {
  const followId = Number(req.params.id);

  await klient("followers_follower")
    .where("followers_follower.id", followId)
    .del();

  res.sendStatus(200);
};
