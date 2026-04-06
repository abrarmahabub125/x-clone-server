export function createAppError({
  statusCode = 500,
  code = "INTERNAL_SERVER_ERROR",
  message = "Something went wrong on the server.",
  details,
} = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;

  if (details !== undefined) {
    error.details = details;
  }

  return error;
}

export function formatValidationIssues(issues) {
  return issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

export function createValidationError(
  issues,
  message = "Request validation failed.",
) {
  return createAppError({
    statusCode: 400,
    code: "VALIDATION_ERROR",
    message,
    details: formatValidationIssues(issues),
  });
}
