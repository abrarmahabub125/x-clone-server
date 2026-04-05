import express from "express";

import { verifyAccessToken } from "../middleware/verifyAccessToken.js";
import {
  getCreators,
  getWhoToConnect,
  getWhoToFollow,
} from "../controllers/follow.controllers.js";

const router = express.Router();

/**
 * ----- http://localhost:3000/api/users/who-to-follow
 * ----- http://localhost:3000/api/users/connect
 * ----- http://localhost:3000/api/users/creators
 */

// Get who to follow
router.get("/users/who-to-follow", verifyAccessToken, getWhoToFollow);

// Get who to connect
router.get("/users/connect", verifyAccessToken, getWhoToConnect);

// Get creators
router.get("/users/creators", verifyAccessToken, getCreators);

export { router };
