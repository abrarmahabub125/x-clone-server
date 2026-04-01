import registerSchema from "../../validations/registerSchema.js";
import { getDB } from "../../config/db.js";
import { generateOTP } from "../../utils/generateOTP.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sendOTP from "../../utils/otpMailer.js";

async function register(req, res) {
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
    const hashPassword = await bcrypt.hash(password, 10);
    const hashOTP = await bcrypt.hash(otp, 10);
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
      const temporaryJWTToken = jwt.sign(
        { id: dbResponse.insertedId.toString(), email: email },
        process.env.JWT_SECRET,
        { expiresIn: "10m" },
      );

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

export default register;
