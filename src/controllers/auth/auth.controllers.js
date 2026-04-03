import registerSchema from "../../validations/registerSchema.js";
import loginSchema from "../../validations/loginSchema.js";

import { getDB, client } from "../../config/db.js";
import { generateOTP } from "../../utils/generateOTP.js";
import sendOTP from "../../utils/otpMailer.js";
import {
  compareWithBcryptHash,
  generateBcryptHash,
} from "../../utils/bcryptHashAndCompare.js";
import {
  generateAccessToken,
  generateTempToken,
} from "../../utils/jwtSignAndCompare.js";

/**
 *
 *
 *
 *
 *
 *
 *
 */

// Registration route that handles user registration
export async function register(req, res, next) {
  try {
    const result = await registerSchema.safeParseAsync(req.body);
    const db = getDB();
    const session = client.startSession();

    // Check if user data is valid
    if (!result.success) {
      const formattedErrors = result.error.issues.map((error) => ({
        field: error.path[0],
        message: error.message,
      }));

      const err = new Error(JSON.stringify(formattedErrors));
      err.statusCode = 400;
      throw err;
    }

    const { fullName, email, password } = result.data;

    const existingUser = await db.collection("users").findOne({ email });

    // If user exists in database, throw error
    if (existingUser) {
      const err = new Error("User already exists.");
      err.statusCode = 409;
      throw err;
    }

    // Hash password and generate OTP
    const otp = generateOTP();
    const hashPassword = await generateBcryptHash(password);
    const hashOTP = await generateBcryptHash(otp);
    const OTPExpiry = Date.now() + 10 * 60 * 1000;

    const otpResponse = await sendOTP(email, otp);

    if (!otpResponse) {
      const err = new Error(
        "Failed to send verification OTP. Please try again or request a new OTP.",
      );
      err.statusCode = 500;
      throw err;
    }

    // ==========================================================================================

    // User object
    const user = {
      fullName,
      email,
      password: hashPassword,
      verificationOTP: hashOTP,
      verificationOTPExpiry: OTPExpiry,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // const usersCollection = db.collection("users");
    // const dbResponse = await usersCollection.insertOne(user);

    let insertedUserId;
    let insertedProfileId;

    try {
      await session.withTransaction(async () => {
        // create user on users collection
        const userResult = await db
          .collection("users")
          .insertOne(user, { session });
        insertedUserId = userResult.insertedId;

        const userProfile = {
          userId: insertedUserId,
          bio: "",
          username: "",
          profilePic: "",
          location: "",
          totalPost: 0,
          joinedAt: new Date(),
          followers: [],
          following: [],
        };

        const profileResult = await db
          .collection("profiles")
          .insertOne(userProfile, { session });
        insertedProfileId = profileResult.insertedId;
      });
    } catch (err) {
      next(err);
    } finally {
      await session.endSession();
    }

    if (!insertedUserId || !insertedProfileId) {
      const err = new Error("Registration failed");
      err.statusCode = 500;
      throw err;
    }

    // Temporary token for OTP validation
    const temporaryJWTToken = generateTempToken({
      id: insertedUserId.toString(),
      email,
    });

    res.cookie("tempToken", temporaryJWTToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 10 * 60 * 1000,
    });

    res.status(201).json({
      status: true,
      message:
        "Your account has been created successfully. A verification OTP has been sent to your email address.",
    });
  } catch (error) {
    next(error);
  }
}

// OTP verification route
export async function verifyOTP(req, res, next) {
  try {
    const { OTP } = req.body;

    if (!OTP) {
      const err = new Error("OTP is required");
      err.statusCode = 400;
      throw err;
    }

    const db = getDB();
    const collection = db.collection("users");

    const email = req.user?.email;

    if (!email) {
      const err = new Error("Token payload is missing email");
      err.statusCode = 401;
      throw err;
    }

    const existingUser = await collection.findOne({ email });

    if (!existingUser) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }

    if (
      !existingUser.verificationOTP ||
      !existingUser.verificationOTPExpiry ||
      existingUser.isVerified
    ) {
      const err = new Error("User already verified");
      err.statusCode = 400;
      throw err;
    }

    if (Date.now() > existingUser.verificationOTPExpiry) {
      const err = new Error("OTP expired");
      err.statusCode = 400;
      throw err;
    }

    const isMatch = compareWithBcryptHash(OTP, existingUser.verificationOTP);

    if (isMatch) {
      const updateResponse = await collection.updateOne(
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
        const err = new Error("Failed to update user");
        err.statusCode = 500;
        throw err;
      }

      res.clearCookie("tempToken");
      res.clearCookie("token");

      return res
        .status(200)
        .json({ status: true, message: "Verification successful" });
    } else {
      const err = new Error("Your OTP is invalid");
      err.statusCode = 400;
      throw err;
    }
  } catch (error) {
    next(error);
  }
}

// Login route
export async function login(req, res, next) {
  try {
    const result = await loginSchema.safeParseAsync(req.body);

    // Check if user data is valid
    if (!result.success) {
      const formattedErrors = result.error.issues.map((error) => ({
        field: error.path[0],
        message: error.message,
      }));

      const err = new Error(JSON.stringify(formattedErrors));
      err.statusCode = 400;
      throw err;
    }

    const { email, password } = result.data;
    const db = getDB();

    const userCollection = db.collection("users");
    const user = await userCollection.findOne({ email });

    console.log(user);

    // Check if user exists
    if (!user) {
      const err = new Error("Invalid credentials.");
      err.statusCode = 401;
      throw err;
    }

    // Check if user is verified
    if (!user.isVerified) {
      const err = new Error("User not verified.");
      err.statusCode = 403;
      throw err;
    }

    // Compare password
    const isPasswordMatch = compareWithBcryptHash(password, user.password);

    if (!isPasswordMatch) {
      const err = new Error("Invalid credentials");
      err.statusCode = 401;
      throw err;
    }

    const token = generateAccessToken({
      id: user._id.toString(),
      email: user.email,
    });

    // Set token in httpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Return success response
    return res.status(200).json({
      status: true,
      message: "You successfully logged in.",
    });
  } catch (error) {
    next(error);
  }
}

export function logout(res) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });

  res.status(200).json({
    status: true,
    message: "You successfully logged out.",
  });
}

// Get me route
export async function getMe(req, res, next) {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: true,
        isAuthenticated: false,
        user: null,
      });
    }

    return res.status(200).json({
      success: true,
      isAuthenticated: true,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
}

// Reset password
export async function resetPassword(req, res) {
  res.send("hello world");
}
