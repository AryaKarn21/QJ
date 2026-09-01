// Guards against NoSQL operator injection. Several controllers build
// Mongoose queries directly from request input, e.g.
// `User.findOne({ email: req.body.email })` in userController.loginUser.
// Because express.json() parses the body as arbitrary JSON, `email` isn't
// guaranteed to be a string — a request body of
// `{ "email": { "$ne": null }, "password": "..." }` arrives with `email`
// as a plain object, and Mongo/Mongoose will honor `$ne` as a query
// operator rather than an equality match, potentially matching an
// unintended document instead of failing the lookup.
//
// This strips any object key that is itself an operator (starts with "$")
// or a path key (contains ".") from req.body/req.query/req.params, in
// place, before any route handler sees them. It does not touch
// req.file/req.files (multer output), which are never used as query
// filters.
function stripOperators(value, depth = 0) {
  if (depth > 6 || value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      value[i] = stripOperators(value[i], depth + 1);
    }
    return value;
  }

  for (const key of Object.keys(value)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete value[key];
      continue;
    }
    value[key] = stripOperators(value[key], depth + 1);
  }
  return value;
}

const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === "object") stripOperators(req.body);
  if (req.params && typeof req.params === "object") stripOperators(req.params);
  // req.query is a getter-only property on some Express/Node versions;
  // mutate its keys in place rather than reassigning req.query itself.
  if (req.query && typeof req.query === "object") stripOperators(req.query);
  next();
};

module.exports = sanitizeInput;