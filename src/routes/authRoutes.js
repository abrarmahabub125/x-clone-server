import express from "express";

import {
  getMe,
  login,
  logout,
  register,
  verifyOTP,
} from "../controllers/authControllers.js";
import { verifyAccessToken } from "../middleware/verifyAccessToken.js";
import { verifyTempCookie } from "../middleware/verifyTempCookie.js";

const router = express.Router();

// Auth routes cover signup, OTP verification, and session state.
router.post("/auth/register", register);
router.post("/auth/login", login);
router.post("/auth/verify-otp", verifyTempCookie, verifyOTP);
router.get("/auth/get-me", verifyAccessToken, getMe);
router.post("/auth/logout", logout);

export { router };
