import registerSchema from "../../validations/registerSchema.js";
import loginSchema from "../../validations/loginSchema.js";

import { getDB } from "../../config/db.js";
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

// Registration route that handle use registration
export async function register(req, res) {
  try {
    const result = await registerSchema.safeParseAsync(req.body);
    const db = getDB();

    // Check is user data valid or not
    if (!result.success) {
      const formattedErrors = result.error.issues.map((error) => ({
        field: error.path[0],
        message: error.message,
      }));

      // send error message to frontend
      return res.status(400).json({
        status: false,
        message: formattedErrors,
      });
    }

    const { fullName, email, password } = result.data;

    const existingUser = await db.collection("users").findOne({ email });

    // if user exist in database then return error message
    if (existingUser)
      return res.status(409).json({
        status: false,
        message: "User already exist.",
      });

    // ============================================================
    //hash password
    const otp = generateOTP();
    const hashPassword = await generateBcryptHash(password);
    const hashOTP = await generateBcryptHash(otp);
    const OTPExpiry = Date.now() + 10 * 60 * 1000;

    const otpResponse = await sendOTP(email, otp);

    if (!otpResponse) {
      return res.status(500).json({
        status: false,
        message:
          "Failed to send verification OTP. Please try again or request a new OTP.",
      });
    }

    // User object
    const user = {
      fullName: fullName,
      email: email,
      password: hashPassword,
      verificationOTP: hashOTP,
      verificationOTPExpiry: OTPExpiry,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const usersCollection = db.collection("users");
    const dbResponse = await usersCollection.insertOne(user);

    if (dbResponse.insertedId) {
      // temporary token for otp validation
      const temporaryJWTToken = generateTempToken({
        id: dbResponse.insertedId.toString(),
        email: email,
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
    } else {
      res.status(500).json({
        status: false,
        message: "Registration failed",
      });
    }
  } catch (e) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
}

// OTP verification route
export async function verifyOTP(req, res) {
  try {
    const { OTP } = req.body;

    if (!OTP) {
      return res
        .status(400)
        .json({ status: false, message: "OTP is required" });
    }

    const db = getDB();
    const collection = db.collection("users");

    const email = req.user?.email;

    if (!email) {
      return res.status(401).json({
        status: false,
        message: "Token payload is missing email",
      });
    }

    const existingUser = await collection.findOne({ email });

    if (!existingUser) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    if (
      !existingUser.verificationOTP ||
      !existingUser.verificationOTPExpiry ||
      existingUser.isVerified
    ) {
      return res
        .status(400)
        .json({ status: false, message: "User already verified" });
    }

    if (Date.now() > existingUser.verificationOTPExpiry) {
      return res.status(400).json({ message: "OTP expired" });
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
        return res
          .status(500)
          .json({ status: false, message: "Failed to update user" });
      }

      res.clearCookie("tempToken");
      res.clearCookie("token");

      return res
        .status(200)
        .json({ status: true, message: "Verification successful" });
    } else {
      res.status(400).json({
        status: false,
        message: "Your OTP is invalid",
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Internal server error",
    });
  }
}

// Login route
export async function login(req, res) {
  try {
    const result = await loginSchema.safeParseAsync(req.body);

    // Check is user data valid or not
    if (!result.success) {
      const formattedErrors = result.error.issues.map((error) => ({
        field: error.path[0],
        message: error.message,
      }));

      // send error message to frontend
      return res.status(400).json({
        success: false,
        message: formattedErrors,
      });
    }

    const { email, password } = result.data;
    const db = getDB();

    const userCollection = db.collection("users");
    const user = await userCollection.findOne({ email });

    // check user exist or not
    if (!user) {
      res.status(401).json({
        status: false,
        message: "Invalid credentials.",
      });
      return;
    }

    // check user verified or not
    if (!user.isVerified) {
      res.status(403).json({
        status: false,
        message: "User not verified.",
      });
      return;
    }

    // compare password
    const isPasswordMatch = compareWithBcryptHash(password, user.password);

    // send response and return if password is incorrect
    if (!isPasswordMatch) {
      res.status(401).json({
        status: false,
        message: "Invalid credentials",
      });
      return;
    }

    const token = generateAccessToken({
      id: user._id.toString(),
      email: user.email,
    });

    // set token in httpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // return with success response
    return res.status(200).json({
      status: true,
      message: "You successfully logged in.",
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
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
