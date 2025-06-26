import { klient } from "./app.js";
import * as z from "zod/v4";

export const createReaction = async (req, res) => {
  const reactionSchema = z.object({
    owner_id: z.number(),
    post_id: z.number(),
    reaction: z.enum(["CROWN", "GOOD", "LOVE"]),
    created_on: z.date(),
  });

  const reactionData = {
    owner_id: req.body.owner,
    post_id: req.body.post,
    reaction: req.body.reaction,
    created_on: new Date(),
  };

  const validatedData = reactionSchema.parse(reactionData);

  const insertResponse = await klient("reactions_reaction").insert(
    validatedData,
    ["id"]
  );

  const reactionResponse = await klient
    .select("reactions_reaction.*", "auth_user.username AS owner")
    .from("reactions_reaction")
    .innerJoin("auth_user", "reactions_reaction.owner_id", "auth_user.id")
    .where("reactions_reaction.id", insertResponse[0].id);

  res.send(await createUpdateReactionMapper(reactionResponse[0]));
};

const createUpdateReactionMapper = async (reactionResponse) => {
  const reaction = {
    id: reactionResponse.id,
    owner: reactionResponse.owner,
    post: reactionResponse.post_id,
    reaction: reactionResponse.reaction,
    created_on: reactionResponse.created_on,
  };

  return reaction;
};

export const editReaction = async (req, res) => {};
