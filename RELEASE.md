# Release Process

This project uses tag-based releases with automated npm publishing via OIDC.

> [!WARN]
> Before doing anything, ensure that you've setup [Trusted Publishing](#npm-trusted-publishing).

## Quick Start

### Release a Dev Version

```bash
mise run bump patch --dev
# Example: 0.0.2-dev -> 0.0.3-dev
# Publishes to npm with tag: next
```

### Release a Stable Version

```bash
mise run bump patch
# Example: 0.0.2-dev -> 0.0.3
# Publishes to npm with tag: latest
```

## Bump Command

The `mise run bump` command handles version bumping, committing, tagging, and pushing in one step.

### Usage

```bash
mise run bump <level> [--dev]
```

### Arguments

| Argument | Description                         |
| -------- | ----------------------------------- |
| `patch`  | Bump patch version (0.0.2 -> 0.0.3) |
| `minor`  | Bump minor version (0.0.2 -> 0.1.0) |
| `major`  | Bump major version (0.0.2 -> 1.0.0) |
| `--dev`  | Append `-dev` suffix for prerelease |

### Examples

```bash
# Patch release
mise run bump patch           # 0.0.2 -> 0.0.3

# Minor release
mise run bump minor           # 0.0.2 -> 0.1.0

# Major release
mise run bump major           # 0.0.2 -> 1.0.0

# Dev/prerelease versions
mise run bump patch --dev     # 0.0.2 -> 0.0.3-dev
mise run bump minor --dev     # 0.0.2 -> 0.1.0-dev
```

### What the Bump Command Does

1. Validates the version level (patch/minor/major)
2. Calculates the new version using `semver`
3. Updates `package.json` with the new version
4. Commits the change: `chore: bump version to X.Y.Z`
5. Creates a git tag: `vX.Y.Z`
6. Pushes to `main` and pushes the tag
7. CI/CD automatically publishes to npm

## Release Workflow

```
mise run bump patch --dev
        |
        v
+------------------+
| Update version   |
| in package.json  |
+------------------+
        |
        v
+------------------+
| Commit & Tag     |
| git tag vX.Y.Z   |
+------------------+
        |
        v
+------------------+
| Push to GitHub   |
+------------------+
        |
        v
+------------------+
| CI/CD Triggers   |
| publish.yml      |
+------------------+
        |
        v
+------------------+
| npm publish      |
| with OIDC        |
+------------------+
```

## NPM Tags

| Version Pattern                       | npm Tag  | Install Command                          |
| ------------------------------------- | -------- | ---------------------------------------- |
| `1.0.0` (stable)                      | `latest` | `npm install opencode-usage-plugin`      |
| `1.0.0-dev`, `-alpha`, `-beta`, `-rc` | `next`   | `npm install opencode-usage-plugin@next` |

## NPM Trusted Publishing

This project uses [NPM Trusted Publishing](https://docs.npmjs.com/trusted-publishers) with GitHub Actions. No npm tokens are needed - authentication is handled automatically via OIDC (OpenID Connect).

**How it works:**

- Each publish uses short-lived, cryptographically-signed tokens specific to your workflow
- Tokens cannot be extracted or reused
- No need to manage or rotate long-lived credentials
- Automatic provenance attestations prove where and how your package was built

**Setup required:**

1. Go to your npm package settings on [npmjs.com](https://www.npmjs.com)
2. Navigate to **Settings** > **Trusted Publisher**
3. Click **GitHub Actions** and configure:
   - **Organization or user**: `nelsonPires5`
   - **Repository**: `opencode-quota`
   - **Workflow filename**: `publish.yml`
4. Optionally, [restrict token access](https://docs.npmjs.com/trusted-publishers#recommended-restrict-token-access-when-using-trusted-publishers) for maximum security

## Manual Tag Push

You can also manually create and push a tag:

```bash
# Update package.json version manually
npm pkg set version="1.0.0"

# Commit, tag, and push
git add package.json
git commit -m "chore: bump version to 1.0.0"
git tag v1.0.0
git push origin main
git push origin v1.0.0
```

## Troubleshooting

### "Cannot publish over previously published version"

This means the version already exists on npm. Bump to a new version:

```bash
mise run bump patch --dev
```

### OIDC authentication fails

1. Verify trusted publisher is configured on npmjs.com
2. Check workflow filename matches exactly: `publish.yml`
3. Ensure `id-token: write` permission is set in workflow

## Do Not

- Manually edit version numbers without using `mise run bump`
- Push tags without updating `package.json` version first
- Republish the same version (npm will reject it)

**Learn more:** See the [NPM Trusted Publishing documentation](https://docs.npmjs.com/trusted-publishers) for complete setup and best practices.
