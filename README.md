# TermPlay

## Release

Release tags must match `package.json` version and start with `v`.

Example for version `0.1.0`:

```sh
git tag v0.1.0
git push origin v0.1.0
```

Windows and Linux packages are built and published by GitHub Actions on `v*` tags.

macOS packages are built locally and published with electron-builder:

```sh
GH_TOKEN=... bun run release:mac
```
