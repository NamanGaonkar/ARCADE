import fs from "node:fs";
import path from "node:path";
import { dialog } from "electron";
import { SystemPath } from "@main/services/system-path";
import { levelDatabasePath, isStaging } from "@main/constants";
import { logger } from "@main/services/logger";

/**
 * Validates whether a given directory looks like a valid LevelDB database.
 */
function isValidLevelDbDirectory(dirPath: string): boolean {
  if (!fs.existsSync(dirPath)) return false;
  try {
    const files = fs.readdirSync(dirPath);
    return files.some(
      (file) => file === "CURRENT" || file.startsWith("MANIFEST")
    );
  } catch {
    return false;
  }
}

/**
 * Checks if target directory is empty or does not exist.
 */
function isDirectoryEmptyOrMissing(dirPath: string): boolean {
  if (!fs.existsSync(dirPath)) return true;
  try {
    const files = fs.readdirSync(dirPath);
    // Ignore empty directories or directories with only lock files
    return files.length === 0 || (files.length === 1 && files[0] === "LOCK");
  } catch {
    return false;
  }
}

/**
 * Resolves potential previous Hydra database locations.
 */
function getHydraDbCandidates(): string[] {
  const dbDirName = isStaging ? "hydra-db-staging" : "hydra-db";
  const candidates: string[] = [];

  const currentUserData = SystemPath.getPath("userData");
  if (currentUserData) {
    candidates.push(path.join(currentUserData, dbDirName));
  }

  const appData = SystemPath.getPath("appData");
  if (appData) {
    candidates.push(path.join(appData, "hydralauncher", dbDirName));
    candidates.push(path.join(appData, "Hydra", dbDirName));
    candidates.push(path.join(appData, "hydra", dbDirName));
  }

  const home = SystemPath.getPath("home");
  if (home) {
    // Linux locations
    candidates.push(path.join(home, ".config", "hydralauncher", dbDirName));
    candidates.push(path.join(home, ".config", "Hydra", dbDirName));
    // macOS locations
    candidates.push(
      path.join(
        home,
        "Library",
        "Application Support",
        "hydralauncher",
        dbDirName
      )
    );
    candidates.push(
      path.join(home, "Library", "Application Support", "Hydra", dbDirName)
    );
  }

  return Array.from(new Set(candidates));
}

/**
 * Safely copies directory files while skipping locks.
 */
function copyLevelDbFiles(srcDir: string, destDir: string): void {
  fs.mkdirSync(destDir, { recursive: true, mode: 0o700 });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === "LOCK") continue;
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    } else if (entry.isDirectory()) {
      copyLevelDbFiles(srcPath, destPath);
    }
  }
}

/**
 * Migrates existing Hydra local database and assets to ArcadeX.
 * Never deletes or modifies original Hydra data.
 */
export async function migrateHydraDataToArcadeX(): Promise<void> {
  const targetDb = levelDatabasePath;

  if (!isDirectoryEmptyOrMissing(targetDb)) {
    logger.info("ArcadeX database already initialized; skipping migration.");
    return;
  }

  const candidates = getHydraDbCandidates();
  let sourceDb: string | null = null;

  for (const candidate of candidates) {
    if (isValidLevelDbDirectory(candidate) && candidate !== targetDb) {
      sourceDb = candidate;
      break;
    }
  }

  if (!sourceDb) {
    logger.info("No existing Hydra database found for migration.");
    return;
  }

  logger.info(`Found existing Hydra database at ${sourceDb}. Migrating to ArcadeX at ${targetDb}...`);

  try {
    copyLevelDbFiles(sourceDb, targetDb);
    logger.info("Database migration from Hydra to ArcadeX completed successfully.");
  } catch (error) {
    logger.error("Failed to migrate Hydra database to ArcadeX:", error);
    try {
      if (fs.existsSync(targetDb)) {
        // Clean up partial target directory so corrupted state is not loaded
        fs.rmSync(targetDb, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      logger.error("Failed to clean up partial migration directory:", cleanupError);
    }

    dialog.showErrorBox(
      "ArcadeX Data Migration Warning",
      `Existing Hydra data was found at:\n${sourceDb}\n\nAutomatic migration to ArcadeX encountered an error:\n${error instanceof Error ? error.message : String(error)}\n\nYour original Hydra data was NOT touched. ArcadeX will start with a fresh local database.`
    );
  }
}
