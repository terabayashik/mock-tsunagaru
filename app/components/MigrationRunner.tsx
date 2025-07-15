import { useEffect } from "react";
import { logger } from "~/utils/logger";
import { migrateRichTextToText, needsRichTextMigration } from "~/utils/migrations/migrateRichTextToText";

/**
 * アプリケーション起動時にマイグレーションを実行するコンポーネント
 */
export const MigrationRunner = () => {
  useEffect(() => {
    const runMigrations = async () => {
      try {
        // rich-text → text マイグレーション
        if (await needsRichTextMigration()) {
          logger.info("Migration", "Starting rich-text to text migration...");
          const result = await migrateRichTextToText();

          if (result.errors.length > 0) {
            logger.error("Migration", "Migration completed with errors", result.errors);
          } else {
            logger.info("Migration", `Migration completed successfully: ${result.migrated} contents migrated`);
          }
        }
      } catch (error) {
        logger.error("Migration", "Failed to run migrations", error);
      }
    };

    runMigrations();
  }, []);

  return null;
};
