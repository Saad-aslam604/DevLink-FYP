Backup strategy (safe, repeatable)

1) Quick concerns to address before implementing features
- Keep a Git-tracked backup (branch + push) for code history.
- Create an offline ZIP backup (this script) that includes env files and an optional DB dump.
- Back up large user-uploaded assets (uploads/avatars) separately if outside repo.
- Backup DB (mongodump) for a point-in-time snapshot.

What I added
- `backup-project.ps1` — PowerShell script to create a timestamped ZIP in `./backups/`.
  - Excludes `node_modules` and `.git` by default.
  - Copies `.env` files (root and `frontend/.env`) into the archive.
  - If `mongodump` is available, will create a `mongodump_<timestamp>` and include it.

How to run (Windows PowerShell)
1. Open PowerShell and change to repo root:

```powershell
cd "C:\Users\Lenovo\OneDrive\Desktop\devlink by deep"
```

2. Run the script (default behavior):

```powershell
.\backup-project.ps1
```

3. Options:
- Include node_modules (makes ZIP much larger):

```powershell
.\backup-project.ps1 -IncludeNodeModules
```

- Request a DB dump (if mongodump not installed, nothing happens):

```powershell
.\backup-project.ps1 -RunMongoDump
```

What the script produces
- ./backups/devlink_backup_<timestamp>.zip — single file archive of your project
- (optional) includes a small copy of env files and a mongodump folder inside the archive

Recommended additional steps
- Commit all current changes and push to remote (GitHub/GitLab) on a backup branch before big changes:

```powershell
git checkout -b backup/$(Get-Date -Format 'yyyyMMdd_HHmmss')
git add -A
git commit -m "backup: pre-feature work $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
git push origin HEAD
```

- Copy the produced ZIP to a safe location (external drive, cloud storage like Google Drive/OneDrive/Dropbox, or S3).
- For DB backups use a scheduled `mongodump` on the DB server and store in a durable location.

Notes and caveats
- The script uses `Compress-Archive` which is built into modern Windows PowerShell. For very large repos, consider 7-zip for a smaller archive.
- `mongodump` must be installed separately (MongoDB Database Tools). The script attempts a dump only if `mongodump` is available on PATH.
- This backup is a point-in-time snapshot of files. For production DBs, use managed DB snapshots or continuous backups.

If you want, I can:
- Add an npm script wrapper to call the PowerShell script from `package.json`.
- Create a simple Bash script variant for Linux/macOS developers.
- Add a GitHub/GitLab CI job to create and upload a backup artifact automatically.
