import { Router } from "express";
import { requireTenant } from "../../middleware/tenant";
import { requireRole } from "../../middleware/auth";
import { RbacService } from "../../services/RbacService";

const router = Router();
const rbacService = new RbacService();

// GET /api/v1/rbac/roles
router.get("/roles", requireTenant, requireRole("viewer", "staff", "admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const roles = await rbacService.listRoles(orgId);
    res.json(roles);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/rbac/roles
router.post("/roles", requireTenant, requireRole("admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const { name, code, description, color, permissions } = req.body;
    if (!name || !code) {
      return res.status(400).json({ error: "Name and code are required" });
    }
    const role = await rbacService.createRole({
      name,
      code,
      description,
      color,
      permissions: permissions || []
    }, orgId);
    res.status(201).json(role);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/v1/rbac/roles/:id
router.put("/roles/:id", requireTenant, requireRole("admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const updated = await rbacService.updateRole(req.params.id, req.body, orgId);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/v1/rbac/roles/:id
router.delete("/roles/:id", requireTenant, requireRole("admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    await rbacService.deleteRole(req.params.id, orgId);
    res.json({ message: "Role deleted successfully" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v1/rbac/assign
router.post("/assign", requireTenant, requireRole("admin"), async (req, res) => {
  try {
    const orgId = (req as any).orgId;
    const { userId, roleCode } = req.body;
    if (!userId || !roleCode) {
      return res.status(400).json({ error: "userId and roleCode are required" });
    }
    const user = await rbacService.assignUserRole(userId, roleCode, orgId);
    res.json({ message: "Role assigned successfully", user: { id: user.id, email: user.email, role: user.role } });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
