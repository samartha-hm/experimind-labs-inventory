import { Router } from "express";
import { UserService } from "../../services/UserService.ts";
import { requireRole } from "../../middleware/requireRole.ts";
import { requireTenant } from "../../middleware/tenant.ts";

const router = Router();
const userService = new UserService();

// GET /api/v1/users (Admin only)
router.get("/", requireTenant, requireRole("admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const users = await userService.listUsers(orgId);
    res.json(users);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/users (Admin only)
router.post("/", requireTenant, requireRole("admin"), async (req, res) => {
  const { email, name, role, password } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: "email and name are required" });
  }
  try {
    const actorId = req.user!.id;
    const orgId = (req as any).orgId;
    const user = await userService.inviteUser(email, name, role || "viewer", actorId, orgId, password);
    res.status(201).json(user);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/users/invite (Admin only)
router.post("/invite", requireTenant, requireRole("admin"), async (req, res) => {
  const { email, name, role, password } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: "email and name are required" });
  }
  try {
    const actorId = req.user!.id;
    const orgId = (req as any).orgId;
    const user = await userService.inviteUser(email, name, role, actorId, orgId, password);
    res.status(201).json(user);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PATCH /api/v1/users/:id/role (Admin only)
router.patch("/:id/role", requireTenant, requireRole("admin"), async (req, res) => {
  const { role } = req.body;
  if (!role) {
    return res.status(400).json({ error: "role is required" });
  }
  try {
    const actorId = req.user!.id;
    const orgId = (req as any).orgId;
    const updated = await userService.updateUserRole(req.params.id, role, actorId, orgId);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PATCH /api/v1/users/:id/status (Admin only)
router.patch("/:id/status", requireTenant, requireRole("admin"), async (req, res) => {
  const { is_active } = req.body;
  if (typeof is_active !== "boolean") {
    return res.status(400).json({ error: "is_active boolean is required" });
  }
  try {
    const actorId = req.user!.id;
    const orgId = (req as any).orgId;
    const updated = await userService.updateUserStatus(req.params.id, is_active, actorId, orgId);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PATCH /api/v1/users/:id (Admin only - Update user properties)
router.patch("/:id", requireTenant, requireRole("admin"), async (req, res) => {
  try {
    const actorId = req.user!.id;
    const orgId = (req as any).orgId;
    const updated = await userService.updateUser(req.params.id, req.body, actorId, orgId);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/v1/users/:id (Admin only - Remove user)
router.delete("/:id", requireTenant, requireRole("admin"), async (req, res) => {
  try {
    const actorId = req.user!.id;
    const orgId = (req as any).orgId;
    const result = await userService.deleteUser(req.params.id, actorId, orgId);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
