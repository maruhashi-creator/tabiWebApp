const { execSync } = require("child_process");

function getCommitSha() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
  try { return execSync("git rev-parse --short HEAD").toString().trim(); } catch { return "local"; }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_COMMIT_SHA: getCommitSha(),
  },
};
module.exports = nextConfig;
