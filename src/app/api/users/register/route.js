import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDB, dbGet, dbRun } from "@/app/lib/db.js";
import { generateToken } from "@/app/lib/auth.js";

export async function POST(req) {
  try {
    const body = await req.json();
    const { username, email, password } = body;

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const db = getDB();

    // Check if user exists
    const existing = await dbGet(db, "SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (existing) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Insert user
    const result = await dbRun(
      db,
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, hashed]
    );

    // Generate token
    const token = generateToken({ id: result.id, username });

    return NextResponse.json({
      message: "User registered successfully",
      user: { id: result.id, username, email },
      token,
    });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}
