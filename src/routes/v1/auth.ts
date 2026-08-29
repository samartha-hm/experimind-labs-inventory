import { Router } from "express";
import { AuthService } from "../../services/AuthService.ts";
import { env } from "../../config/env.ts";
import { authenticateJwt } from "../../middleware/auth.ts";
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
        mfaEnabled: false,
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
    const result = await authService.login(email, password);

    if (result.mfaRequired) {
      return res.json({
        mfaRequired: true,
        mfaToken: result.mfaToken,
      });
    }

    if (!result.user || !result.token || !result.refreshToken) {
      throw new Error("Authentication failed.");
    }

    res.cookie("refreshToken", result.refreshToken, getCookieOptions(req));
    res.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        mfaEnabled: result.user.mfa_enabled,
      },
      token: result.token,
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * POST /api/v1/auth/mfa/login
 */
router.post("/mfa/login", async (req, res) => {
  const { mfaToken, totpCode } = req.body;
  if (!mfaToken || !totpCode) {
    return res.status(400).json({ error: "mfaToken and totpCode are required" });
  }
  try {
    const { user, token, refreshToken } = await authService.verifyMfaLogin(mfaToken, totpCode);
    res.cookie("refreshToken", refreshToken, getCookieOptions(req));
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mfaEnabled: user.mfa_enabled,
      },
      token,
    });
  } catch (e: any) {
    res.status(401).json({ error: e.message });
  }
});

/**
 * POST /api/v1/auth/mfa/setup
 */
router.post("/mfa/setup", authenticateJwt, async (req: any, res) => {
  try {
    const result = await authService.setupMfa(req.user.id);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * POST /api/v1/auth/mfa/verify
 */
router.post("/mfa/verify", authenticateJwt, async (req: any, res) => {
  const { totpCode } = req.body;
  if (!totpCode) {
    return res.status(400).json({ error: "totpCode is required" });
  }
  try {
    await authService.verifyAndEnableMfa(req.user.id, totpCode);
    res.json({ success: true, message: "Two-factor authentication enabled successfully." });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * POST /api/v1/auth/mfa/disable
 */
router.post("/mfa/disable", authenticateJwt, async (req: any, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: "Password confirmation is required" });
  }
  try {
    await authService.disableMfa(req.user.id, password);
    res.json({ success: true, message: "Two-factor authentication disabled." });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * POST /api/v1/auth/guest
 * Strictly restricted to viewer role with no client-side privilege escalation.
 */
router.post("/guest", async (req, res) => {
  if (!env.allowGuest) {
    return res.status(403).json({ error: "Guest sign-in is disabled in this environment." });
  }
  
  // Strictly enforce viewer role — never allow client override
  const guestUser = {
    id: "guest-viewer-session",
    email: "guest-viewer@experimindlabs.com",
    name: "Guest Viewer",
    role: "viewer",
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
    { expiresIn: (env.jwtExpiresIn as any) || "15m" }
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
    const rawToken = await authService.generateForgotPasswordToken(email);
    const responseData: any = {
      message: "If your email is registered in our system, password reset instructions have been sent.",
    };
    // In development mode, provide token for easy testing
    if (env.nodeEnv === "development") {
      responseData.devResetToken = rawToken;
    }
    res.json(responseData);
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