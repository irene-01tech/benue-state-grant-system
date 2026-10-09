/**
 * catchAsync
 * -----------
 * Wraps async Express route handlers so any thrown error or rejected
 * promise is automatically forwarded to next(), which routes it to
 * the centralized error handler instead of crashing the process.
 */

module.exports = function catchAsync(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
