import express from "express";
import { findResults } from "../controllers/exploreControllers.js";

const router = express.Router();

router.get("/explore/search", findResults);

export { router };
