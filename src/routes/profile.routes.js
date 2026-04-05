import express from "express";

import { getProfile } from "../controllers/profile.controllers.js";
import { verifyAccessToken } from "../middleware/verifyAccessToken.js";

const router = express.Router();

/**
 * ------ http://localhost:3000/api/users/:id
 */

// Get users profile info
router.get("/users/:id", verifyAccessToken, getProfile);

export { router };
