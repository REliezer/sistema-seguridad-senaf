import { buildContextFrom } from "../utils/rbac.util.js";

/**
 * GET /api/iam/v1/me
 *
 * - Si NO hay token válido -> visitor:true
 * - Si hay token válido -> usa req.auth.payload (Auth0)
 */
export const meInfo = async (req, res, next) => {
  try {
    const payload = req.auth?.payload || null;

    // Si no hay JWT => visitante
    if (!payload) {
      return res.json({
        ok: true,
        user: null,
        roles: [],
        permissions: [],
        visitor: true,
        email: null,
        isSuperAdmin: false,
      });
    }

    // Construye contexto desde el JWT
    const ctx = await buildContextFrom({
      auth: { payload },
    });

    return res.json({
      ok: true,
      user: ctx.user || null,
      roles: ctx.roles || [],
      permissions: ctx.permissions || [],
      visitor: false,
      email: ctx.email || null,
      isSuperAdmin: !!ctx.isSuperAdmin,
    });
  } catch (e) {
    next(e);
  }
};