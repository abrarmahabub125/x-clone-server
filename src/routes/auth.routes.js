import express from "express";
import { verifyTempCookie } from "../middleware/verifyTempCookie.js";
import { verifyAccessToken } from "../middleware/verifyAccessToken.js";

import {
  register,
  verifyOTP,
  login,
  getMe,
  logout,
} from "../controllers/auth.controllers.js";

const router = express.Router();

/**
 * ------ http://localhost:3000/api/auth/register
 * ------ http://localhost:3000/api/auth/verify-otp
 * ------ http://localhost:3000/api/auth/login
 * ------ http://localhost:3000/api/auth/logout
 * ------ http://localhost:3000/api/auth/get-me
 */

router.post("/auth/login", login);
router.post("/auth/register", register);
router.post("/auth/verify-otp", verifyTempCookie, verifyOTP);
router.get("/auth/get-me", verifyAccessToken, getMe);
router.post("/auth/logout", logout);

//export router
export { router };
