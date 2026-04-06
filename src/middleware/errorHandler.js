import { sendError } from "../utils/apiResponse.js";

function parseSerializedDetails(message) {
  if (typeof message !== "string") {
    return undefined;
  }

  try {
    const parsed = JSON.parse(message);

    if (Array.isArray(parsed) || (parsed && typeof parsed === "object")) {
      return parsed;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function getStatusCode(error) {
  if (Number.isInteger(error?.statusCode)) {
    return error.statusCode;
  }

  if (error?.type === "entity.parse.failed") {
    return 400;
  }

  if (error?.code === 11000) {
    return 409;
  }

  return 500;
}

function getErrorCode(error, statusCode) {
  if (typeof error?.code === "string") {
    return error.code;
  }

  if (error?.type === "entity.parse.failed") {
    return "INVALID_JSON";
  }

  if (error?.code === 11000) {
    return "DUPLICATE_RESOURCE";
  }

  if (statusCode === 400) {
    return "BAD_REQUEST";
  }

  if (statusCode === 401) {
    return "UNAUTHORIZED";
  }

  if (statusCode === 403) {
    return "FORBIDDEN";
  }

  if (statusCode === 404) {
    return "NOT_FOUND";
  }

  if (statusCode === 409) {
    return "CONFLICT";
  }

  return "INTERNAL_SERVER_ERROR";
}

function getMessage(error, statusCode) {
  if (error?.type === "entity.parse.failed") {
    return "Request body contains invalid JSON.";
  }

  if (error?.code === 11000) {
    return "A resource with the same value already exists.";
  }

  if (typeof error?.message === "string" && error.message.trim()) {
    if (statusCode >= 500 && !Number.isInteger(error?.statusCode)) {
      return "Something went wrong on the server.";
    }

    return error.message;
  }

  if (statusCode === 400) {
    return "The request could not be processed.";
  }

  if (statusCode === 401) {
    return "Authentication is required to access this resource.";
  }

  if (statusCode === 403) {
    return "You do not have permission to access this resource.";
  }

  if (statusCode === 404) {
    return "The requested resource was not found.";
  }

  if (statusCode === 409) {
    return "The request conflicts with the current state of the resource.";
  }

  return "Something went wrong on the server.";
}

function getDetails(error) {
  if (error?.details !== undefined) {
    return error.details;
  }

  if (error?.code === 11000 && error?.keyValue) {
    return error.keyValue;
  }

  return parseSerializedDetails(error?.message);
}

const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = getStatusCode(error);
  const normalizedError = {
    statusCode,
    code: getErrorCode(error, statusCode),
    message: getMessage(error, statusCode),
    details: getDetails(error),
  };

  console.error(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`,
    error,
  );

  return sendError(res, normalizedError);
};

export default errorHandler;
