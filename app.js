import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { router as authRouter } from "./src/routes/auth.routes.js";
import { router as profileRouter } from "./src/routes/profile.routes.js";
import { router as followRouter } from "./src/routes/follow.routes.js";

import errorHandler from "./src/middleware/errorHandler.js";

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
  res.json({ message: "Server is running..." });
});

//APIs
app.use("/api", authRouter);
app.use("/api", followRouter);
app.use("/api", profileRouter);

// Centralize error handler
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
    },
  });
});

export default app;
