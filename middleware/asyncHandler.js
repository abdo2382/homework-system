// Wraps an async route handler so any thrown error / rejected promise
// is passed to Express's error handler instead of crashing the whole server.
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
