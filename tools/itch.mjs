// Zip the built site (dist/) for a manual itch.io upload:
//
//   npm run itch    ->  hairy-popsicles-web.zip  (index.html at the root)
//
// On itch: Edit game -> Uploads -> Upload files -> pick the zip, and tick
// "This file will be played in the browser". (CI can also push straight to
// itch with butler; see .github/workflows/pages.yml.)
import { execFileSync } from "node:child_process";
import { existsSync, rmSync, statSync } from "node:fs";
import { resolve } from "node:path";

const OUT = resolve("hairy-popsicles-web.zip");
if (!existsSync("dist/index.html")) throw new Error("No dist/ yet: run the build first.");
rmSync(OUT, { force: true });
execFileSync("zip", ["-qr", "-9", OUT, "."], { cwd: "dist", stdio: "inherit" });
console.log(`  ${OUT} (${(statSync(OUT).size / 1e6).toFixed(1)} MB)`);
