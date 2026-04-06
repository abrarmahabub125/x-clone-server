import express from "express";

import {
  getCreators,
  getWhoToConnect,
  getWhoToFollow,
} from "../controllers/followControllers.js";
import { verifyAccessToken } from "../middleware/verifyAccessToken.js";

const router = express.Router();

// Discovery routes power follow and creator suggestion surfaces.
router.get("/users/who-to-follow", verifyAccessToken, getWhoToFollow);
router.get("/users/connect", verifyAccessToken, getWhoToConnect);
router.get("/users/creators", verifyAccessToken, getCreators);

export { router };
