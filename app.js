import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { router as authRouter } from "./src/routes/authRoutes.js";
import { router as profileRouter } from "./src/routes/userRoutes.js";
import { router as followRouter } from "./src/routes/followRoutes.js";
import { router as bookmarkRouter } from "./src/routes/bookmarkRoutes.js";
import { router as tweetRouter } from "./src/routes/tweetRoutes.js";
import { router as feedRouter } from "./src/routes/feedRoutes.js";

import errorHandler from "./src/middleware/errorHandler.js";
import { sendError, sendSuccess } from "./src/utils/apiResponse.js";

const app = express();

// Global Middlewares
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(morgan("combined"));
app.use(express.urlencoded({ extended: true }));

// API endpoints
app.get("/", (req, res) => {
  return sendSuccess(res, {
    message: "Server is running.",
    data: {
      service: "x-server",
    },
  });
});

/**
 * --------------------- Auth ----------------------
 *  GET ---- /api/auth/register
 *  GET ---- /api/auth/login
 *  GET ---- /api/auth/verify-otp
 *  GET ---- /api/auth/get-me
 *  GET ---- /api/auth/logout
 *
 * --------------------Follow ----------------------
 *  GET ---- /api/users/who-to-follow
 *  GET ---- /api/users/connect
 *  GET ---- /api/users/creators
 *
 * -------------------- Profile --------------------
 *  GET ---- /api//users/:id
 *  GET ---- /api//users/:id/posts
 *  GET ---- /api//users/:id/replies
 *  GET ---- /api//users/:id/medias
 *  GET ---- /api//users/:id/likes
 *
 *  PATCH -- /api/users/update-profile
 *
 *  ------------------ Bookmark --------------------
 *  GET ---- /api/bookmarks
 *  POST --- /api/bookmarks
 *  DELETE - /api/bookmarks/:tweetId
 *
 *  ------------------ Tweet -----------------------
 *  GET ---- /api/tweets
 *  GET ---- /api/tweets/:id
 *  GET ---- /api/users/:userId/tweets
 *
 *  POST --- /api/tweets
 *
 *  ------------------ Feed ------------------------
 *  GET ---- /api/feed/for-you
 *  GET ---- /api/feed/following
 *
 */

//APIs
app.use("/api", authRouter);
app.use("/api", followRouter);
app.use("/api", profileRouter);
app.use("/api", bookmarkRouter);
app.use("/api", tweetRouter);
app.use("/api", feedRouter);

// Centralize error handler
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  return sendError(res, {
    statusCode: 404,
    code: "ROUTE_NOT_FOUND",
    message: `Route ${req.method} ${req.originalUrl} was not found.`,
  });
});

export default app;
