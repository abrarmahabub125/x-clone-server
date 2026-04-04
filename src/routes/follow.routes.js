import express from "express";

import { verifyAccessToken } from "../middleware/verifyAccessToken.js";
import { getWhoToFollow } from "../controllers/follow.controllers.js";

const router = express.Router();

// Get who to follow
router.get("/users/who-to-follow", verifyAccessToken, getWhoToFollow);

export { router };
