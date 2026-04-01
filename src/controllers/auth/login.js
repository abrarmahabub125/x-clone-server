import { getDB } from "../../config/db.js";
import loginSchema from "../../validations/loginSchema.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

async function login(req, res) {
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
    const isPasswordMatch = await bcrypt.compare(password, user.password);

    // send response and return if password is incorrect
    if (!isPasswordMatch) {
      res.status(401).json({
        status: false,
        message: "Invalid credentials",
      });
      return;
    }
    // generate JWT token
    const token = jwt.sign(
      { id: user._id.toString(), email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

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

export default login;
