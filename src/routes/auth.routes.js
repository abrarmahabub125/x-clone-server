import express from "express";
import register from "../controllers/auth/register.js";
import verifyOTP from "../controllers/auth/verify-otp.js";
import login from "../controllers/auth/login.js";
import getMe from "../controllers/auth/getMe.js";
import resetPassword from "../controllers/auth/reset-password.js";
import { verifyTempCookie } from "../middleware/verifyTempCookie.js";
import { verifyAccessToken } from "../middleware/verifyAccessToken.js";

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
