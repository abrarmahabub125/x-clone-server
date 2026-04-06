function appendOptionalProperty(target, key, value) {
  if (value !== undefined) {
    target[key] = value;
  }
}

export function sendSuccess(
  res,
  { statusCode = 200, message = "Request completed successfully.", data, meta } = {},
) {
  const payload = {
    success: true,
    message,
  };

  appendOptionalProperty(payload, "data", data);
  appendOptionalProperty(payload, "meta", meta);

  return res.status(statusCode).json(payload);
}

export function sendError(
  res,
  {
    statusCode = 500,
    code = "INTERNAL_SERVER_ERROR",
    message = "Something went wrong on the server.",
    details,
  } = {},
) {
  const payload = {
    success: false,
    message,
    error: {
      code,
    },
  };

  appendOptionalProperty(payload.error, "details", details);

  return res.status(statusCode).json(payload);
}
