import { ObjectId } from "mongodb";

import { getDB, client } from "../config/db.js";
import {
  compareWithBcryptHash,
  generateBcryptHash,
} from "../utils/bcryptHashAndCompare.js";
import { createAppError, createValidationError } from "../utils/apiError.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { generateOTP } from "../utils/generateOTP.js";
import {
  generateAccessToken,
  generateTempToken,
} from "../utils/jwtSignAndCompare.js";
import sendOTP from "../utils/otpMailer.js";
import {
  deleteAccountSchema,
  updateEmailSchema,
  updatePasswordSchema,
} from "../validations/accountSettingsSchema.js";
import loginSchema from "../validations/loginSchema.js";
import registerSchema from "../validations/registerSchema.js";
import updateProfileSchema from "../validations/updateProfileSchema.js";

const USERS_COLLECTION = "users";
const PROFILES_COLLECTION = "profiles";
const TWEETS_COLLECTION = "tweets";
const LIKES_COLLECTION = "likes";
const BOOKMARKS_COLLECTION = "bookmarks";
const RETWEETS_COLLECTION = "retweets";
const TWEET_VIEWS_COLLECTION = "tweetViews";
const FOLLOW_RELATIONS_COLLECTION = "relations";
const TEMP_TOKEN_MAX_AGE = 10 * 60 * 1000;
const ACCESS_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function isSecureRequest(req) {
  return req.secure || req.get("x-forwarded-proto") === "https";
}

function buildCookieOptions(req, maxAge) {
  const secure = isSecureRequest(req);

  return {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    path: "/",
    ...(typeof maxAge === "number" ? { maxAge } : {}),
  };
}

function getTempCookieOptions(req) {
  return buildCookieOptions(req, TEMP_TOKEN_MAX_AGE);
}

function getTempCookieClearOptions(req) {
  return buildCookieOptions(req);
}

function getAccessCookieOptions(req) {
  return buildCookieOptions(req, ACCESS_TOKEN_MAX_AGE);
}

function getAccessCookieClearOptions(req) {
  return buildCookieOptions(req);
}

function createUserProfile(userId, fullName) {
  return {
    userId,
    bio: "",
    fullName,
    username: "",
    profilePic: "",
    coverPhoto: "",
    location: "",
    totalPost: 0,
    joinedAt: new Date(),
    followers: [],
    following: [],
  };
}

function getAuthenticatedUserId(req) {
  const authenticatedUserId = req.user?.id;

  return ObjectId.isValid(authenticatedUserId)
    ? new ObjectId(authenticatedUserId)
    : null;
}

async function getAuthenticatedUserDocument(db, req) {
  const authenticatedUserId = getAuthenticatedUserId(req);

  if (!authenticatedUserId) {
    throw createAppError({
      statusCode: 401,
      code: "INVALID_TOKEN_PAYLOAD",
      message: "The authenticated user id is invalid.",
    });
  }

  const userDocument = await db
    .collection(USERS_COLLECTION)
    .findOne({ _id: authenticatedUserId });

  if (!userDocument) {
    throw createAppError({
      statusCode: 404,
      code: "USER_NOT_FOUND",
      message: "The authenticated user account could not be found.",
    });
  }

  return {
    authenticatedUserId,
    userDocument,
  };
}

export async function register(req, res, next) {
  try {
    const result = await registerSchema.safeParseAsync(req.body);

    if (!result.success) {
      throw createValidationError(
        result.error.issues,
        "Registration request validation failed.",
      );
    }

    const { fullName, email, password } = result.data;
    const db = getDB();
    const usersCollection = db.collection(USERS_COLLECTION);
    const profilesCollection = db.collection(PROFILES_COLLECTION);
    const existingUser = await usersCollection.findOne({ email });

    if (existingUser) {
      throw createAppError({
        statusCode: 409,
        code: "USER_ALREADY_EXISTS",
        message: "An account already exists with this email address.",
      });
    }

    const otp = generateOTP();
    const hashedPassword = await generateBcryptHash(password);
    const hashedOTP = await generateBcryptHash(otp);
    const verificationOTPExpiry = Date.now() + TEMP_TOKEN_MAX_AGE;
    const otpResponse = await sendOTP(email, otp);

    if (!otpResponse) {
      throw createAppError({
        statusCode: 500,
        code: "OTP_DELIVERY_FAILED",
        message:
          "We could not send the verification OTP right now. Please try again.",
      });
    }

    const userDocument = {
      fullName,
      email,
      password: hashedPassword,
      verificationOTP: hashedOTP,
      verificationOTPExpiry,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let insertedUserId;
    let insertedProfileId;
    const session = client.startSession();

    try {
      // Keep the user and profile documents in sync across both collections.
      await session.withTransaction(async () => {
        const userResult = await usersCollection.insertOne(userDocument, {
          session,
        });
        insertedUserId = userResult.insertedId;

        const profileResult = await profilesCollection.insertOne(
          createUserProfile(insertedUserId, fullName),
          { session },
        );
        insertedProfileId = profileResult.insertedId;
      });
    } finally {
      await session.endSession();
    }

    if (!insertedUserId || !insertedProfileId) {
      throw createAppError({
        statusCode: 500,
        code: "REGISTRATION_FAILED",
        message: "We could not complete the registration process.",
      });
    }

    const temporaryJWTToken = generateTempToken({
      id: insertedUserId.toString(),
      email,
    });

    res.cookie("tempToken", temporaryJWTToken, getTempCookieOptions(req));

    return sendSuccess(res, {
      statusCode: 201,
      message:
        "Registration successful. Please verify the OTP sent to your email address.",
      data: {
        userId: insertedUserId.toString(),
        email,
        verificationRequired: true,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyOTP(req, res, next) {
  try {
    const { OTP } = req.body;

    if (!OTP) {
      throw createAppError({
        statusCode: 400,
        code: "OTP_REQUIRED",
        message: "OTP is required to verify the account.",
      });
    }

    const email = req.user?.email;

    if (!email) {
      throw createAppError({
        statusCode: 401,
        code: "INVALID_TOKEN_PAYLOAD",
        message: "The verification token payload is invalid.",
      });
    }

    const db = getDB();
    const usersCollection = db.collection(USERS_COLLECTION);
    const existingUser = await usersCollection.findOne({ email });

    if (!existingUser) {
      throw createAppError({
        statusCode: 404,
        code: "USER_NOT_FOUND",
        message:
          "No user account was found for the provided verification token.",
      });
    }

    if (
      !existingUser.verificationOTP ||
      !existingUser.verificationOTPExpiry ||
      existingUser.isVerified
    ) {
      throw createAppError({
        statusCode: 400,
        code: "USER_ALREADY_VERIFIED",
        message: "This account is already verified.",
      });
    }

    if (Date.now() > existingUser.verificationOTPExpiry) {
      throw createAppError({
        statusCode: 400,
        code: "OTP_EXPIRED",
        message: "The OTP has expired. Please request a new one.",
      });
    }

    const isMatch = await compareWithBcryptHash(
      OTP,
      existingUser.verificationOTP,
    );

    if (!isMatch) {
      throw createAppError({
        statusCode: 400,
        code: "OTP_INVALID",
        message: "The provided OTP is invalid.",
      });
    }

    const updateResponse = await usersCollection.updateOne(
      { email },
      {
        $set: {
          isVerified: true,
          updatedAt: new Date(),
        },
        $unset: {
          verificationOTP: "",
          verificationOTPExpiry: "",
        },
      },
    );

    if (updateResponse.modifiedCount === 0) {
      throw createAppError({
        statusCode: 500,
        code: "OTP_VERIFICATION_FAILED",
        message: "We could not verify the account. Please try again.",
      });
    }

    res.clearCookie("tempToken", getTempCookieClearOptions(req));
    res.clearCookie("token", getAccessCookieClearOptions(req));

    return sendSuccess(res, {
      message: "Account verified successfully.",
      data: {
        verified: true,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const result = await loginSchema.safeParseAsync(req.body);

    if (!result.success) {
      throw createValidationError(
        result.error.issues,
        "Login request validation failed.",
      );
    }

    const { email, password } = result.data;
    const db = getDB();
    const usersCollection = db.collection(USERS_COLLECTION);
    const user = await usersCollection.findOne({ email });

    if (!user) {
      throw createAppError({
        statusCode: 401,
        code: "INVALID_CREDENTIALS",
        message: "Email or password is incorrect.",
      });
    }

    if (!user.isVerified) {
      throw createAppError({
        statusCode: 403,
        code: "USER_NOT_VERIFIED",
        message: "Please verify your account before signing in.",
      });
    }

    const isPasswordMatch = await compareWithBcryptHash(
      password,
      user.password,
    );

    if (!isPasswordMatch) {
      throw createAppError({
        statusCode: 401,
        code: "INVALID_CREDENTIALS",
        message: "Email or password is incorrect.",
      });
    }

    const token = generateAccessToken({
      id: user._id.toString(),
      email: user.email,
    });

    res.cookie("token", token, getAccessCookieOptions(req));

    return sendSuccess(res, {
      message: "Login successful.",
      data: {
        authenticated: true,
      },
    });
  } catch (error) {
    next(error);
  }
}

export function logout(req, res) {
  res.clearCookie("token", getAccessCookieClearOptions(req));

  return sendSuccess(res, {
    message: "Logout successful.",
  });
}

export async function getMe(req, res, next) {
  try {
    const user = req.user;

    if (!user) {
      return sendError(res, {
        statusCode: 401,
        code: "UNAUTHENTICATED",
        message: "You need to sign in to access this resource.",
      });
    }

    if (!ObjectId.isValid(user.id)) {
      return sendError(res, {
        statusCode: 401,
        code: "INVALID_TOKEN_PAYLOAD",
        message: "The authenticated user id is invalid.",
      });
    }

    const db = getDB();
    const profileData = await db.collection(PROFILES_COLLECTION).findOne({
      userId: new ObjectId(user.id),
    });

    if (!profileData) {
      return sendError(res, {
        statusCode: 404,
        code: "PROFILE_NOT_FOUND",
        message: "Profile data could not be found for the authenticated user.",
      });
    }

    const {
      username,
      profilePic,
      coverPhoto,
      location,
      bio,
      fullName,
      followers,
      following,
    } = profileData;

    return sendSuccess(res, {
      message: "Authenticated user retrieved successfully.",
      data: {
        isAuthenticated: true,
        user: {
          id: user.id,
          email: user.email,
          fullName,
          username,
          bio,
          profilePic,
          coverPhoto,
          location,
          followers: followers.length,
          following: following.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res) {
  return sendError(res, {
    statusCode: 501,
    code: "NOT_IMPLEMENTED",
    message: "Reset password is not implemented yet.",
  });
}

export async function updateEmail(req, res, next) {
  try {
    const parsedResult = await updateEmailSchema.safeParseAsync(req.body);

    if (!parsedResult.success) {
      throw createValidationError(
        parsedResult.error.issues,
        "Email update validation failed.",
      );
    }

    const { newEmail, currentPassword } = parsedResult.data;
    const db = getDB();
    const { authenticatedUserId, userDocument } = await getAuthenticatedUserDocument(
      db,
      req,
    );

    if (userDocument.email === newEmail) {
      throw createAppError({
        statusCode: 400,
        code: "EMAIL_UNCHANGED",
        message: "Your new email must be different from your current email.",
      });
    }

    const isPasswordMatch = await compareWithBcryptHash(
      currentPassword,
      userDocument.password,
    );

    if (!isPasswordMatch) {
      throw createAppError({
        statusCode: 401,
        code: "INVALID_CURRENT_PASSWORD",
        message: "Your current password is incorrect.",
      });
    }

    const existingUser = await db.collection(USERS_COLLECTION).findOne({
      email: newEmail,
      _id: { $ne: authenticatedUserId },
    });

    if (existingUser) {
      throw createAppError({
        statusCode: 409,
        code: "EMAIL_ALREADY_IN_USE",
        message: "Another account is already using this email address.",
      });
    }

    await db.collection(USERS_COLLECTION).updateOne(
      { _id: authenticatedUserId },
      {
        $set: {
          email: newEmail,
          updatedAt: new Date(),
        },
      },
    );

    const nextToken = generateAccessToken({
      id: authenticatedUserId.toString(),
      email: newEmail,
    });

    res.cookie("token", nextToken, getAccessCookieOptions(req));

    return sendSuccess(res, {
      message: "Email updated successfully.",
      data: {
        email: newEmail,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updatePassword(req, res, next) {
  try {
    const parsedResult = await updatePasswordSchema.safeParseAsync(req.body);

    if (!parsedResult.success) {
      throw createValidationError(
        parsedResult.error.issues,
        "Password update validation failed.",
      );
    }

    const { currentPassword, newPassword } = parsedResult.data;
    const db = getDB();
    const { authenticatedUserId, userDocument } = await getAuthenticatedUserDocument(
      db,
      req,
    );

    const isPasswordMatch = await compareWithBcryptHash(
      currentPassword,
      userDocument.password,
    );

    if (!isPasswordMatch) {
      throw createAppError({
        statusCode: 401,
        code: "INVALID_CURRENT_PASSWORD",
        message: "Your current password is incorrect.",
      });
    }

    const isSamePassword = await compareWithBcryptHash(
      newPassword,
      userDocument.password,
    );

    if (isSamePassword) {
      throw createAppError({
        statusCode: 400,
        code: "PASSWORD_UNCHANGED",
        message: "Your new password must be different from the current one.",
      });
    }

    const hashedPassword = await generateBcryptHash(newPassword);

    await db.collection(USERS_COLLECTION).updateOne(
      { _id: authenticatedUserId },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
      },
    );

    res.clearCookie("token", getAccessCookieClearOptions(req));

    return sendSuccess(res, {
      message: "Password updated successfully. Please sign in again.",
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAccount(req, res, next) {
  try {
    const parsedResult = await deleteAccountSchema.safeParseAsync(req.body);

    if (!parsedResult.success) {
      throw createValidationError(
        parsedResult.error.issues,
        "Account deletion validation failed.",
      );
    }

    const { currentPassword } = parsedResult.data;
    const db = getDB();
    const { authenticatedUserId, userDocument } = await getAuthenticatedUserDocument(
      db,
      req,
    );

    const isPasswordMatch = await compareWithBcryptHash(
      currentPassword,
      userDocument.password,
    );

    if (!isPasswordMatch) {
      throw createAppError({
        statusCode: 401,
        code: "INVALID_CURRENT_PASSWORD",
        message: "Your current password is incorrect.",
      });
    }

    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        const ownedTweets = await db
          .collection(TWEETS_COLLECTION)
          .find(
            { userId: authenticatedUserId },
            { session, projection: { _id: 1 } },
          )
          .toArray();

        const ownedTweetIds = ownedTweets.map((tweet) => tweet._id);

        if (ownedTweetIds.length > 0) {
          await db.collection(LIKES_COLLECTION).deleteMany(
            {
              tweetId: { $in: ownedTweetIds },
            },
            { session },
          );
          await db.collection(BOOKMARKS_COLLECTION).deleteMany(
            {
              tweetId: { $in: ownedTweetIds },
            },
            { session },
          );
          await db.collection(RETWEETS_COLLECTION).deleteMany(
            {
              tweetId: { $in: ownedTweetIds },
            },
            { session },
          );
          await db.collection(TWEET_VIEWS_COLLECTION).deleteMany(
            {
              tweetId: { $in: ownedTweetIds },
            },
            { session },
          );
          await db.collection(TWEETS_COLLECTION).deleteMany(
            {
              _id: { $in: ownedTweetIds },
            },
            { session },
          );
        }

        await db.collection(LIKES_COLLECTION).deleteMany(
          {
            userId: authenticatedUserId,
          },
          { session },
        );
        await db.collection(BOOKMARKS_COLLECTION).deleteMany(
          {
            userId: authenticatedUserId,
          },
          { session },
        );
        await db.collection(RETWEETS_COLLECTION).deleteMany(
          {
            userId: authenticatedUserId,
          },
          { session },
        );
        await db.collection(TWEET_VIEWS_COLLECTION).deleteMany(
          {
            userId: authenticatedUserId,
          },
          { session },
        );
        await db.collection(FOLLOW_RELATIONS_COLLECTION).deleteMany(
          {
            $or: [
              { followerId: authenticatedUserId },
              { followingId: authenticatedUserId },
            ],
          },
          { session },
        );
        await db.collection(PROFILES_COLLECTION).updateMany(
          {},
          {
            $pull: {
              followers: authenticatedUserId,
              following: authenticatedUserId,
            },
          },
          { session },
        );
        await db.collection(PROFILES_COLLECTION).deleteOne(
          {
            userId: authenticatedUserId,
          },
          { session },
        );
        await db.collection(USERS_COLLECTION).deleteOne(
          {
            _id: authenticatedUserId,
          },
          { session },
        );
      });
    } finally {
      await session.endSession();
    }

    res.clearCookie("token", getAccessCookieClearOptions(req));

    return sendSuccess(res, {
      message: "Account deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
}
