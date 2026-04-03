import express from "express";

import { getProfile } from "../controllers/profile/profile.controllers.js";

const router = express.Router();

//http://localhost:3000/api/profile/123

router.get("/profile/:id", getProfile);

export { router };
