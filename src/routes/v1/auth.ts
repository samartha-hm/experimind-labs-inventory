import { Router } from "express";
import jwt from "jsonwebtoken";
import { AuthService } from "../../services/AuthService";

const router = Router();

/**
 * POST /api/v1/auth/register
 * Body: { email: string, password: string, name?: string, role?: string }
 * Returns: { user: {id, email, name, role}, token: string }
 */
router.post("/register", async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  try {
    const authService = new AuthService();
    const { user, token } = await authService.register(
      email,
      password,
      name ?? email.split("@")[0],
      role ?? "viewer"
    );
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * POST /api/v1/auth/login
 * Body: { email: string, password: string }
 * Returns: { user: {id, email, name, role}, token: string }
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  try {
    const authService = new AuthService();
    const { user, token } = await authService.login(email, password);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    });
  } catch (e: any) {
    if (e.message === "Invalid email or password") {
      return res.status(401).json({ error: e.message });
    }
    if (
      e.message ===
      "This account does not have a password set. Use Firebase login instead."
    ) {
      return res.status(400).json({ error: e.message });
    }
    console.error("Login error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;