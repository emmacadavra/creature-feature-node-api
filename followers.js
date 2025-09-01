import { klient } from "./app.js";
import * as z from "zod/v4";

// CREATE FOLLOW
export const createFollow = async (req, res) => {
  if (!req.user) {
    return res.sendStatus(401);
  }
  const currentlyLoggedInUser = req.user.id;

  const followSchema = z.object({
    owner_id: z.number(),
    followed_id: z.number(),
    created_on: z.date(),
  });

  const followData = {
    owner_id: currentlyLoggedInUser,
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
      "profiles_profile AS owner_profile",
      "followers_follower.owner_id",
      "owner_profile.id"
    )
    .leftOuterJoin(
      "auth_user AS auth_owner",
      "owner_profile.owner_id",
      "auth_owner.id"
    )
    .leftOuterJoin(
      "profiles_profile AS followed_profile",
      "followers_follower.followed_id",
      "followed_profile.id"
    )
    .leftOuterJoin(
      "auth_user AS auth_followed",
      "followed_profile.owner_id",
      "auth_followed.id"
    )
    .where("followers_follower.id", insertResponse[0].id);

  res.send(await createFollowMapper(followResponse[0], currentlyLoggedInUser));
};

// CREATE FOLLOW MAPPER
const createFollowMapper = async (followResponse, currentlyLoggedInUser) => {
  const follow = {
    id: followResponse.id,
    owner_id: currentlyLoggedInUser,
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
