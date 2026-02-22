import IamUser from "../models/IamUser.model.js";
import { hashPassword } from "../utils/password.util.js";
import { writeAudit } from "../utils/audit.util.js";
import {
  addDays,
  isGuardRole,
  nameFromEmail,
  normBool,
  normEmail,
  toStringArray,
} from "../utils/users.helpers.js";

export async function listUsers(req, res, next) {
  try {
    const q = String(req.query.q || "").trim();
    const limit = Math.min(500, Math.max(1, Number(req.query.limit || 100)));
    const skip = Math.max(0, Number(req.query.skip || 0));

    const filter = q
      ? {
          $or: [
            { name: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const items = await IamUser.find(filter, {
      name: 1,
      email: 1,
      roles: 1,
      active: 1,
      perms: 1,
      createdAt: 1,
      updatedAt: 1,
      externalId: 1,
    })
      .sort({ name: 1, email: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({ ok: true, items, count: items.length, limit, skip });
  } catch (err) {
    return next(err);
  }
}

export async function listGuardsPicker(req, res, next) {
  try {
    const q = String(req.query.q || "").trim();
    const onlyActive = normBool(req.query.active, true);

    const textFilter = q
      ? {
          $or: [
            { name: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const filter = onlyActive ? { ...textFilter, active: true } : textFilter;

    const raw = await IamUser.find(filter, {
      name: 1,
      email: 1,
      roles: 1,
      active: 1,
      externalId: 1,
      [process.env.IAM_ROLES_NAMESPACE || "https://senaf.local/roles"]: 1,
    })
      .sort({ name: 1, email: 1 })
      .limit(2000)
      .lean();

    const items = raw
      .filter((u) => isGuardRole(u))
      .map((u) => ({
        _id: u._id,
        name: u.name || nameFromEmail(u.email) || "(Sin nombre)",
        email: u.email || "",
        opId: u.externalId || String(u._id),
        active: !!u.active,
      }));

    return res.json({ ok: true, items, count: items.length });
  } catch (err) {
    return next(err);
  }
}

export async function listGuards(req, res, next) {
  try {
    const q = String(req.query.q || "").trim();
    const onlyActive = normBool(req.query.active, true);

    const textFilter = q
      ? {
          $or: [
            { name: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const filter = onlyActive ? { ...textFilter, active: true } : textFilter;

    const raw = await IamUser.find(filter, {
      name: 1,
      email: 1,
      roles: 1,
      active: 1,
      externalId: 1,
      [process.env.IAM_ROLES_NAMESPACE || "https://senaf.local/roles"]: 1,
    })
      .sort({ name: 1, email: 1 })
      .limit(1000)
      .lean();

    const items = raw
      .map((u) => ({
        _id: u._id,
        name: u.name || nameFromEmail(u.email) || "(Sin nombre)",
        email: u.email || "",
        active: !!u.active,
        roles: u.roles || [],
        opId: u.externalId || String(u._id),
        isGuard: isGuardRole(u),
      }))
      .filter((u) => u.isGuard);

    return res.json({ ok: true, items, count: items.length });
  } catch (err) {
    return next(err);
  }
}

export async function getUserById(req, res, next) {
  try {
    const { id } = req.params;
    const item = await IamUser.findById(id).lean();
    if (!item) return res.status(404).json({ ok: false, error: "No encontrado" });
    return res.json({ ok: true, item });
  } catch (err) {
    return next(err);
  }
}

export async function createUser(req, res, next) {
  try {
    let {
      name,
      email,
      roles = [],
      perms = [],
      active = true,
      password,
      provider,
      externalId,
    } = req.body || {};

    email = normEmail(email);
    if (!email) return res.status(400).json({ ok: false, error: "email requerido" });

    const exists = await IamUser.findOne({ email }).lean();
    if (exists) return res.status(409).json({ ok: false, error: "ya existe", item: exists });

    const doc = {
      email,
      name: String(name || "").trim() || nameFromEmail(email),
      roles: toStringArray(roles),
      perms: toStringArray(perms),
      active: normBool(active, true),
      provider: provider || "local",
      externalId: externalId ? String(externalId).trim() : undefined,
    };

    if (password && String(password).trim()) {
      const now = new Date();
      doc.passwordHash = await hashPassword(String(password));
      doc.provider = "local";
      doc.passwordChangedAt = now;
      doc.passwordExpiresAt = addDays(now, 60);
      doc.mustChangePassword = true;
    }

    const item = await IamUser.create(doc);

    await writeAudit(req, {
      action: "create",
      entity: "user",
      entityId: String(item._id),
      before: null,
      after: {
        email: item.email,
        roles: item.roles,
        perms: item.perms,
        active: item.active,
      },
    });

    return res.status(201).json({
      ok: true,
      item: {
        _id: item._id,
        email: item.email,
        name: item.name,
        roles: item.roles,
        perms: item.perms,
        active: item.active,
        provider: item.provider,
        externalId: item.externalId,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function patchUserById(req, res, next) {
  try {
    const { id } = req.params;
    const patch = { ...(req.body || {}) };

    if (patch.email !== undefined) patch.email = normEmail(patch.email);
    if (patch.name !== undefined) patch.name = String(patch.name || "").trim();
    if (patch.roles !== undefined) patch.roles = toStringArray(patch.roles);
    if (patch.perms !== undefined) patch.perms = toStringArray(patch.perms);
    if (patch.active !== undefined) patch.active = normBool(patch.active);
    if (patch.externalId !== undefined) {
      patch.externalId = patch.externalId ? String(patch.externalId).trim() : null;
    }

    const before = await IamUser.findById(id).lean();
    const item = await IamUser.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();

    if (!item) return res.status(404).json({ ok: false, error: "No encontrado" });

    await writeAudit(req, {
      action: "update",
      entity: "user",
      entityId: id,
      before: before
        ? {
            email: before.email,
            roles: before.roles,
            perms: before.perms,
            active: before.active,
          }
        : null,
      after: {
        email: item.email,
        roles: item.roles,
        perms: item.perms,
        active: item.active,
      },
    });

    return res.json({ ok: true, item });
  } catch (err) {
    return next(err);
  }
}

export async function enableUserById(req, res, next) {
  try {
    const { id } = req.params;
    const before = await IamUser.findById(id).lean();
    const item = await IamUser.findByIdAndUpdate(id, { $set: { active: true } }, { new: true }).lean();

    if (!item) return res.status(404).json({ ok: false, error: "No encontrado" });

    await writeAudit(req, {
      action: "activate",
      entity: "user",
      entityId: id,
      before: before ? { active: before.active } : null,
      after: { active: true },
    });

    return res.json({ ok: true, item });
  } catch (err) {
    return next(err);
  }
}

export async function disableUserById(req, res, next) {
  try {
    const { id } = req.params;
    const before = await IamUser.findById(id).lean();
    const item = await IamUser.findByIdAndUpdate(id, { $set: { active: false } }, { new: true }).lean();

    if (!item) return res.status(404).json({ ok: false, error: "No encontrado" });

    await writeAudit(req, {
      action: "deactivate",
      entity: "user",
      entityId: id,
      before: before ? { active: before.active } : null,
      after: { active: false },
    });

    return res.json({ ok: true, item });
  } catch (err) {
    return next(err);
  }
}

export async function updateUserPassword(req, res, next) {
  try {
    const { id } = req.params;
    const pwd = String(req.body?.password || "").trim();
    if (!pwd) return res.status(400).json({ ok: false, error: "password requerido" });

    const before = await IamUser.findById(id).select("+passwordHash").lean();
    if (!before) return res.status(404).json({ ok: false, error: "No encontrado" });

    const now = new Date();
    const passwordHash = await hashPassword(pwd);
    const item = await IamUser.findByIdAndUpdate(
      id,
      {
        $set: {
          passwordHash,
          provider: "local",
          passwordChangedAt: now,
          passwordExpiresAt: addDays(now, 60),
          mustChangePassword: true,
        },
      },
      { new: true }
    )
      .select("+passwordHash")
      .lean();

    await writeAudit(req, {
      action: "update",
      entity: "user",
      entityId: id,
      before: { hasPassword: !!before?.passwordHash },
      after: { hasPassword: !!item?.passwordHash },
    });

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

export async function deleteUserById(req, res, next) {
  try {
    const { id } = req.params;
    const before = await IamUser.findById(id).lean();
    if (!before) return res.status(404).json({ ok: false, error: "No encontrado" });

    await IamUser.findByIdAndDelete(id);

    await writeAudit(req, {
      action: "delete",
      entity: "user",
      entityId: id,
      before: {
        email: before.email,
        roles: before.roles,
        perms: before.perms,
        active: before.active,
      },
      after: null,
    });

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}
