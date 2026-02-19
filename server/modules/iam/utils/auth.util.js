import { requireAuth } from "../../../src/middleware/auth.js";

export function makeAuthMw() {
  return requireAuth;
}