import { join } from "node:path";
import { $ } from "bun";

const backend = join(import.meta.dir, "..", "Backend");

const drop = await $`dotnet ef database drop --force --project VenDot.csproj`.cwd(backend);
if (drop.exitCode !== 0) {
  console.error(drop.stderr.toString());
  process.exit(1);
}

const update = await $`dotnet ef database update --project VenDot.csproj`.cwd(backend);
if (update.exitCode !== 0) {
  console.error(update.stderr.toString());
  process.exit(1);
}

console.log("Reset database dropped and migrations applied.");
