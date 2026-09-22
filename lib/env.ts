import { parseEnv } from "@neon/env";
import config from "../neon";

export { getAuthEnv, isAdminEmail } from "@/lib/auth-config";

export function getPostgresEnv() {
  return parseEnv(config, ["DATABASE_URL", "DATABASE_URL_UNPOOLED"]).postgres;
}
