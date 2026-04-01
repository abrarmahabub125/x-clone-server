import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { router } from "./src/routes/auth.routes.js";

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
app.use("/api", router);

export default app;
