import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "supersecret"; // keep in .env in prod

// Create JWT when user logs in
export function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    SECRET,
    { expiresIn: "1h" }
  );
}

// Middleware-like util for Next.js API routes
export function verifyToken(req) {
  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader) {
      return { valid: false, message: "Missing token" };
    }

    const token = authHeader.split(" ")[1]; // "Bearer <token>"
    if (!token) {
      return { valid: false, message: "Invalid token format" };
    }

    const decoded = jwt.verify(token, SECRET);
    return { valid: true, decoded };
  } catch (err) {
    return { valid: false, message: "Invalid or expired token" };
  }
}
