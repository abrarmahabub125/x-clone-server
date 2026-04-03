import express from "express";
import { verifyTempCookie } from "../middleware/verifyTempCookie.js";
import { verifyAccessToken } from "../middleware/verifyAccessToken.js";

import {
  register,
  verifyOTP,
  login,
  getMe,
  logout,
} from "../controllers/auth/auth.controllers.js";

const router = express.Router();

// /api/auth/register
// /api/auth/verify-otp
// /api/auth/login
// /api/auth/reset-password

router.post("/auth/login", login);
router.post("/auth/register", register);
router.post("/auth/verify-otp", verifyTempCookie, verifyOTP);
router.get("/auth/get-me", verifyAccessToken, getMe);
router.get("/auth/logout", logout);

//export router
export { router };
