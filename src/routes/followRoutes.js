import express from "express";

import {
  followUser,
  getCreators,
  getFollowStatus,
  getWhoToConnect,
  getWhoToFollow,
  unfollowUser,
} from "../controllers/followControllers.js";
import { verifyAccessToken } from "../middleware/verifyAccessToken.js";

const router = express.Router();

// Discovery routes power follow and creator suggestion surfaces.
router.get("/users/who-to-follow", verifyAccessToken, getWhoToFollow);
router.get("/users/connect", verifyAccessToken, getWhoToConnect);
router.get("/users/creators", verifyAccessToken, getCreators);

// ------------------------- Follow routes ---------------------------

router.get(
  "/users/:followingId/follow-status",
  verifyAccessToken,
  getFollowStatus,
);

router.post("/users/:followingId/follow", verifyAccessToken, followUser);

router.delete("/users/:followingId/unfollow", verifyAccessToken, unfollowUser);

export { router };
