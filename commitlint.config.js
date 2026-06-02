module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "refactor",
        "test",
        "docs",
        "chore",
        "ci",
        "build",
        "perf",
        "security",
        "revert"
      ]
    ],
    "scope-enum": [
      1,
      "always",
      [
        "auth",
        "rbac",
        "webhook",
        "scans",
        "findings",
        "reports",
        "proxy",
        "kku",
        "i18n",
        "ui",
        "db",
        "prisma",
        "github",
        "ai",
        "deps",
        "commitlint",
        "lint"
      ]
    ],
    "subject-case": [0],
    "header-max-length": [2, "always", 72]
  }
};