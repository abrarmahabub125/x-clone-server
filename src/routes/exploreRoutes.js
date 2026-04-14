import express from "express";
import { findResults } from "../controllers/exploreControllers.js";
import { verifyAccessToken } from "../middleware/verifyAccessToken.js";

const router = express.Router();

router.get("/explore/search", verifyAccessToken, findResults);

export { router };
