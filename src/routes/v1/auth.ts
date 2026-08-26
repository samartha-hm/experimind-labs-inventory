import { Router } from "express";
import { AuthService } from "../../services/AuthService.ts";
import { env } from "../../config/env.ts";
import jwt from "jsonwebtoken";

const router = Router();
const authService = new AuthService();

function getCookieOptions(req: any) {
  const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax" as const,
    path: "/api/v1/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

/**
 * POST /api/v1/auth/register
 */
router.post("/register", async (req, res) => {
  const { email, password, name } = req.body;
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

    res.cookie("refreshToken", refreshToken, getCookieOptions(req));
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
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  try {
    const { user, token, refreshToken } = await authService.login(email, password);
    res.cookie("refreshToken", refreshToken, getCookieOptions(req));
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
    res.status(400).json({ error: e.message });
  }
});

/**
 * POST /api/v1/auth/guest
 */
router.post("/guest", async (req, res) => {
  if (!env.allowGuest) {
    return res.status(403).json({ error: "Guest sign-in is disabled in this environment." });
  }
  const requestedRole = (req.body?.role as string) || env.guestRole || "admin";
  const guestUser = {
    id: "guest-admin-session",
    email: `guest-${requestedRole}@experimindlabs.com`,
    name: `Guest ${requestedRole.charAt(0).toUpperCase() + requestedRole.slice(1)}`,
    role: requestedRole,
    organization_id: "00000000-0000-0000-0000-000000000000",
  };
  const token = jwt.sign(
    {
      sub: guestUser.id,
      email: guestUser.email,
      role: guestUser.role,
      orgId: guestUser.organization_id,
    },
    env.jwtSecret,
    { expiresIn: "12h" }
  );
  res.json({ user: guestUser, token });
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
    await authService.generateForgotPasswordToken(email);
    res.json({
      message: "If your email is registered in our system, password reset instructions have been sent.",
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
    return res.status(200).json({ user: null, token: null });
  }
  try {
    const result = await authService.refreshAccessToken(refreshToken);
    res.cookie("refreshToken", result.refreshToken, getCookieOptions(req));
    res.json({
      token: result.token,
      user: result.user,
    });
  } catch (e: any) {
    res.status(200).json({ user: null, token: null, error: e.message });
  }
});

/**
 * POST /api/v1/auth/logout
 */
router.post("/logout", async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  if (refreshToken) {
    try {
      await authService.revokeRefreshToken(refreshToken);
    } catch (_) {}
  }
  res.clearCookie("refreshToken", getCookieOptions(req));
  res.json({ message: "Successfully logged out." });
});

export default router;