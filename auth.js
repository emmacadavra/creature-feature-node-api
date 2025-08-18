import { klient } from "./app.js";
import * as z from "zod/v4";
import { createHash } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { getCloudinaryImage } from "./api/cloudinary.js";

export const sessions = {};

const passwordSalt = process.env.PASSWORD_SALT;

// HASH PASSWORD FUNCTION
const hashPassword = (password) => {
  const saltedPassword = passwordSalt.replace("{PASSWORD}", password);
  const hashedPassword = createHash("md5").update(saltedPassword).digest("hex");

  return hashedPassword;
};

// PROCESS LOGIN
export const login = async (req, res) => {
  const postSchema = z.object({
    username: z.string(),
    password: z.string(),
  });

  const validatedData = postSchema.parse(req.body);

  const hashedPassword = hashPassword(validatedData.password);
  // console.log(hashedPassword);

  const results = await klient
    .select(
      "auth_user.id",
      "auth_user.username",
      "profiles_profile.id AS profile_id",
      "profiles_profile.image AS profile_image"
    )
    .from("auth_user")
    .innerJoin("profiles_profile", "auth_user.id", "profiles_profile.id")
    .where("auth_user.username", validatedData.username)
    .andWhere("auth_user.password", hashedPassword);

  if (results.length !== 1) {
    return res.status(401).send({
      non_field_errors: ["Unable to log in with provided credentials."],
    });
  }

  const userData = results[0];
  const authToken = uuidv4(); // creates a random string that will always be unique
  sessions[authToken] = userData;

  res.setHeader("Set-Cookie", `auth_token=${authToken}; Max-Age=3600; Path=/`);

  res.send({
    user: await userDataMapper(userData),
  });
};

// GET CURRENTLY LOGGED IN USER
export const user = async (req, res) => {
  if (!req.user) {
    return res.sendStatus(401);
  }

  res.send({
    user: await userDataMapper(req.user),
  });
};

// USER DATA MAPPER
const userDataMapper = async (userData) => {
  const profileImage = await getCloudinaryImage(userData.profile_image);

  return {
    id: userData.id,
    username: userData.username,
    profile_id: userData.profile_id,
    profile_image: profileImage,
  };
};
