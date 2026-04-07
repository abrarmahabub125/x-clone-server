import express from "express";
import { verifyAccessToken } from "../middleware/verifyAccessToken.js";
import { followingFeed, forYouFeed } from "../controllers/feedControllers.js";

const router = express.Router();

router.get("/feed/for-you", verifyAccessToken, forYouFeed);
router.get("/feed/following", verifyAccessToken, followingFeed);

export { router };
