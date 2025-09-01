import { klient } from "./app.js";
import * as z from "zod/v4";
import { createHash } from "crypto";
import { v4 as uuidv4, validate } from "uuid";
import { getCloudinaryImage } from "./api/cloudinary.js";

export const sessions = {};

const passwordSalt = process.env.PASSWORD_SALT;

// HASH PASSWORD FUNCTION
const hashPassword = (password) => {
  const saltedPassword = passwordSalt.replace("{PASSWORD}", password);
  const hashedPassword = createHash("md5").update(saltedPassword).digest("hex");
  console.log(hashedPassword);
  return hashedPassword;
};

// PROCESS LOGIN
export const login = async (req, res) => {
  const loginSchema = z.object({
    username: z.string(),
    password: z.string(),
  });

  const validatedData = loginSchema.parse(req.body);

  const hashedPassword = hashPassword(validatedData.password);

  const results = await klient
    .select(
      "auth_user.username",
      "profiles_profile.id AS id",
      "profiles_profile.image AS profile_image"
    )
    .from("auth_user")
    .innerJoin("profiles_profile", "auth_user.id", "profiles_profile.owner_id")
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
    profile_image: profileImage,
  };
};

// PROCESS REGISTRATION
export const register = async (req, res) => {
  let validatedData;

  try {
    const registrationSchema = z
      .object({
        username: z.string(),
        password1: z
          .string()
          .min(
            8,
            "This password is too short. It must contain at least 8 characters."
          ),
        password2: z
          .string()
          .min(
            8,
            "This password is too short. It must contain at least 8 characters."
          ),
      })
      .check(async (ctx) => {
        if (ctx.value.password1 !== ctx.value.password2) {
          ctx.issues.push({
            code: "custom",
            path: "non_field_errors",
            message: "The two password fields didn't match.",
            input: ctx.value,
            continue: true,
          });
        }

        const checkUsername = await klient
          .select("auth_user.*")
          .from("auth_user")
          .where("auth_user.username", ctx.value.username);

        if (checkUsername.length) {
          ctx.issues.push({
            code: "custom",
            path: "username",
            message: "A user with that username already exists.",
            input: ctx.value,
            continue: true,
          });
        }
      });

    validatedData = await registrationSchema.parseAsync(req.body);

    const hashedPassword = hashPassword(validatedData.password1);
    console.log(hashedPassword);

    const insertUser = await klient("auth_user").insert(
      {
        username: validatedData.username,
        password: hashedPassword,
        date_joined: new Date(),
        is_superuser: false,
        first_name: "",
        last_name: "",
        email: "",
        is_staff: false,
        is_active: true,
      },
      ["id"]
    );

    const insertProfile = await klient("profiles_profile").insert(
      {
        name: "",
        content: "",
        image: "../default_profile_kkmzvb",
        created_on: new Date(),
        updated_on: new Date(),
        owner_id: insertUser[0].id,
      },
      ["id"]
    );

    const getNewUser = await klient
      .select(
        "auth_user.id",
        "auth_user.username",
        "profiles_profile.id AS profile_id",
        "profiles_profile.image AS profile_image"
      )
      .from("auth_user")
      .innerJoin(
        "profiles_profile",
        "auth_user.id",
        "profiles_profile.owner_id"
      )
      .where("auth_user.id", insertUser[0].id)
      .andWhere("profiles_profile.id", insertProfile[0].id);

    console.log(getNewUser[0]);
  } catch (err) {
    console.log(err);
    const transformedErrors = {};

    for (const error of err.issues) {
      transformedErrors[error.path] = [error.message];
    }

    return res.status(400).send(transformedErrors);
  }

  res.send(validatedData);
};
