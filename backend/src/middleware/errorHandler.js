export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: "Not found", path: req.originalUrl });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const status = err.statusCode || 500;
  const body = {
    error: err.message || "Internal server error",
  };

  if (err.details && status < 500) body.details = err.details;

  if (status >= 500) {
    console.error(err);
    body.error = "Internal server error";
  }

  res.status(status).json(body);
}
