import { readFileSync } from "node:fs";
import { join } from "node:path";

export function getConnectionString(): string {
  const fromEnv = process.env.VENDOT_SQL_CONNECTION;
  if (fromEnv?.trim()) return fromEnv.trim();
  const devPath = join(import.meta.dir, "..", "Backend", "appsettings.Development.json");
  const raw = readFileSync(devPath, "utf8");
  const j = JSON.parse(raw) as { ConnectionStrings?: { DefaultConnection?: string } };
  const cs = j.ConnectionStrings?.DefaultConnection;
  if (!cs) throw new Error("Missing ConnectionStrings:DefaultConnection in Backend/appsettings.Development.json");
  return cs;
}
