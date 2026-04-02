import express from "express";
import resetPassword from "../controllers/auth/reset-password.js";
import { verifyTempCookie } from "../middleware/verifyTempCookie.js";
import { verifyAccessToken } from "../middleware/verifyAccessToken.js";

import {
  register,
  verifyOTP,
  login,
  getMe,
} from "../controllers/auth/auth.controllers.js";

const router = express.Router();

// /api/auth/register
// /api/auth/verify-otp
// /api/auth/login
// /api/auth/reset-password

router.post("/auth/login", login);
router.post("/auth/register", register);
router.post("/auth/verify-otp", verifyTempCookie, verifyOTP);
router.post("/auth/reset-password", resetPassword);
router.get("/auth/get-me", verifyAccessToken, getMe);

//export router
export { router };
