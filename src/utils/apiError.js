export function createAppError({
  statusCode = 500,
  code = "INTERNAL_SERVER_ERROR",
  message = "Something went wrong. Please try again.",
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
  return issues.reduce((acc, issue) => {
    const field = issue.path.join(".");
    const existingError = acc.find((e) => e.field === field);

    if (!existingError) {
      acc.push({
        field,
        message: issue.message,
      });
    }

    return acc;
  }, []);
}

export function createValidationError(
  issues,
  message = "Please check your input and try again.",
) {
  return createAppError({
    statusCode: 400,
    code: "VALIDATION_ERROR",
    message,
    details: formatValidationIssues(issues),
  });
}
