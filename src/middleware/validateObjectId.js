/**
 * Middleware to validate ObjectIds in request params
 * Prevents invalid MongoDB ObjectId errors
 */

import { ObjectId } from "mongodb";
import { createAppError } from "../utils/apiError.js";

/**
 * Validates if a string is a valid MongoDB ObjectId
 * @param {string} id - The ID to validate
 * @returns {boolean}
 */
export function isValidObjectId(id) {
  return ObjectId.isValid(id);
}

/**
 * Middleware to validate ObjectIds in specific params
 * @param {...string} paramNames - Names of params to validate as ObjectIds
 * @returns {Function} Express middleware
 *
 * Usage:
 * router.get('/users/:id', validateObjectIdParams('id'), getUser);
 * router.post('/tweets/:tweetId/likes/:userId', validateObjectIdParams('tweetId', 'userId'), likeTweet);
 */
export function validateObjectIdParams(...paramNames) {
  return (req, res, next) => {
    for (const paramName of paramNames) {
      const paramValue = req.params[paramName];

      if (paramValue && !isValidObjectId(paramValue)) {
        return next(
          createAppError({
            statusCode: 400,
            code: "INVALID_ID_FORMAT",
            message: `Invalid ${paramName} format.`,
          }),
        );
      }
    }

    next();
  };
}

export default validateObjectIdParams;
