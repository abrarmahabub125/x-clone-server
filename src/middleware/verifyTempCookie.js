import jwt from "jsonwebtoken";

import { createAppError } from "../utils/apiError.js";

function getBearerToken(req) {
  return req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : null;
}

export const verifyTempCookie = (req, res, next) => {
  try {
    const token = req.cookies?.tempToken || req.cookies?.token || getBearerToken(req);

    if (!token) {
      throw createAppError({
        statusCode: 401,
        code: "VERIFICATION_TOKEN_MISSING",
        message: "Verification token is missing. Please request a new OTP.",
      });
    }

    req.user = jwt.verify(token, process.env.JWT_SECRET);

    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(
        createAppError({
          statusCode: 401,
          code: "VERIFICATION_TOKEN_EXPIRED",
          message: "Your verification session has expired. Please request a new OTP.",
        }),
      );
    }

    if (error.name === "JsonWebTokenError") {
      return next(
        createAppError({
          statusCode: 401,
          code: "VERIFICATION_TOKEN_INVALID",
          message: "The provided verification token is invalid.",
        }),
      );
    }

    return next(error);
  }
};
