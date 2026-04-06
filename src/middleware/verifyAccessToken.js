import jwt from "jsonwebtoken";

import { createAppError } from "../utils/apiError.js";

function getBearerToken(req) {
  return req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : null;
}

export const verifyAccessToken = (req, res, next) => {
  try {
    const token = req.cookies?.token || getBearerToken(req);

    if (!token) {
      throw createAppError({
        statusCode: 401,
        code: "AUTH_TOKEN_MISSING",
        message: "Access token is missing. Please sign in and try again.",
      });
    }

    req.user = jwt.verify(token, process.env.JWT_SECRET);

    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(
        createAppError({
          statusCode: 401,
          code: "AUTH_TOKEN_EXPIRED",
          message: "Your session has expired. Please sign in again.",
        }),
      );
    }

    if (error.name === "JsonWebTokenError") {
      return next(
        createAppError({
          statusCode: 401,
          code: "AUTH_TOKEN_INVALID",
          message: "The provided access token is invalid.",
        }),
      );
    }

    return next(error);
  }
};
