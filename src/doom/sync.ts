import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

function git(args: string[], cwd?: string): void {
  const result = spawnSync("git", args, { cwd, stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed with status ${result.status}`);
  }
}

function gitCapture(args: string[], cwd: string): string {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", stdio: ["inherit", "pipe", "inherit"] });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed with status ${result.status}`);
  }
  return result.stdout.trim();
}

function getProjectRoot(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  return resolve(__dirname, "..", "..");
}

export function syncDoom(): void {
  const repoUrl = process.env.DOOM_REPO_URL ?? "https://github.com/id-Software/DOOM.git";
  const repoRef = process.env.DOOM_REPO_REF ?? "master";
  // Default ../doom = sibling of legacy-lens (resolved from project root)
  const repoDirRaw = process.env.DOOM_REPO_DIR ?? "../doom";
  const projectRoot = getProjectRoot();
  const repoDir = resolve(projectRoot, repoDirRaw);

  if (!existsSync(repoDir)) {
    console.log(`Cloning ${repoUrl} into ${repoDir}...`);
    git(["clone", repoUrl, repoDir]);
  } else {
    console.log(`Repo exists at ${repoDir}, fetching...`);
    git(["fetch", "origin"], repoDir);
  }

  git(["checkout", repoRef], repoDir);

  const commitHash = gitCapture(["rev-parse", "HEAD"], repoDir);

  console.log("");
  console.log(`Repo URL:    ${repoUrl}`);
  console.log(`Commit hash: ${commitHash}`);
  console.log(`Local path:  ${repoDir}`);
}
