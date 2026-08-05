import { Router } from "express";
import { AuthService } from "../../services/AuthService.ts";
import { env } from "../../config/env.ts";

const router = Router();
const authService = new AuthService();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: "strict" as const,
  path: "/api/v1/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * POST /api/v1/auth/register
 */
router.post("/register", async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  try {
    const { user, token, refreshToken } = await authService.register(
      email,
      password,
      name ?? email.split("@")[0],
      "viewer" // Public registration is strictly forced to viewer role
    );

    res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
      refreshToken,
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * POST /api/v1/auth/login
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  try {
    const { user, token, refreshToken } = await authService.login(email, password);
    res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
      refreshToken,
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * POST /api/v1/auth/forgot-password
 */
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  try {
    const rawResetToken = await authService.generateForgotPasswordToken(email);
    res.json({
      message: "If your email is registered, a password reset token has been generated.",
      resetToken: rawResetToken,
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * POST /api/v1/auth/reset-password
 */
router.post("/reset-password", async (req, res) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) {
    return res.status(400).json({ error: "resetToken and newPassword are required" });
  }
  try {
    await authService.resetPasswordWithToken(resetToken, newPassword);
    res.json({ message: "Password has been successfully reset. You may now login." });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * POST /api/v1/auth/refresh-token
 */
router.post("/refresh-token", async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!refreshToken) {
    return res.status(400).json({ error: "refreshToken cookie or body field is required" });
  }
  try {
    const tokens = await authService.refreshAccessToken(refreshToken);
    res.cookie("refreshToken", tokens.refreshToken, COOKIE_OPTIONS);
    res.json(tokens);
  } catch (e: any) {
    res.status(401).json({ error: e.message });
  }
});

/**
 * POST /api/v1/auth/logout
 */
router.post("/logout", async (req, res) => {
  res.clearCookie("refreshToken", COOKIE_OPTIONS);
  res.json({ message: "Successfully logged out." });
});

export default router;