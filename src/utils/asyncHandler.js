/**
 * Async Error Handler Wrapper
 * Wraps controller functions to catch async errors
 * and pass them to the error handler middleware
 *
 * Usage:
 * router.post('/users', asyncHandler(createUser));
 * or
 * export const createUser = asyncHandler(async (req, res, next) => { ... });
 */

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default asyncHandler;
