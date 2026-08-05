import { Router } from "express";
import { UserService } from "../../services/UserService.ts";
import { requireRole } from "../../middleware/requireRole.ts";

const router = Router();
const userService = new UserService();

// GET /api/v1/users (Admin only)
router.get("/", requireRole("admin"), async (req, res) => {
  try {
    const users = await userService.listUsers();
    res.json(users);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/users/invite (Admin only)
router.post("/invite", requireRole("admin"), async (req, res) => {
  const { email, name, role } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: "email and name are required" });
  }
  try {
    const actorId = req.user!.id;
    const user = await userService.inviteUser(email, name, role, actorId);
    res.status(201).json(user);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PATCH /api/v1/users/:id/role (Admin only)
router.patch("/:id/role", requireRole("admin"), async (req, res) => {
  const { role } = req.body;
  if (!role) {
    return res.status(400).json({ error: "role is required" });
  }
  try {
    const actorId = req.user!.id;
    const updated = await userService.updateUserRole(req.params.id, role, actorId);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PATCH /api/v1/users/:id/status (Admin only)
router.patch("/:id/status", requireRole("admin"), async (req, res) => {
  const { is_active } = req.body;
  if (typeof is_active !== "boolean") {
    return res.status(400).json({ error: "is_active boolean is required" });
  }
  try {
    const actorId = req.user!.id;
    const updated = await userService.updateUserStatus(req.params.id, is_active, actorId);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
