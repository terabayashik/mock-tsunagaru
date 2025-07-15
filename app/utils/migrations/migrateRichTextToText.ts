import type { ContentIndex, ContentItem } from "~/types/content";
import { ContentItemSchema, ContentsIndexSchema } from "~/types/content";
import { logger } from "~/utils/logger";
import { OPFSManager } from "~/utils/storage/opfs";
import { OPFSLock } from "~/utils/storage/opfsLock";

/**
 * rich-textタイプのコンテンツをtextタイプに移行する
 */
export const migrateRichTextToText = async (): Promise<{
  migrated: number;
  errors: string[];
}> => {
  const opfs = OPFSManager.getInstance();
  const lock = OPFSLock.getInstance();
  const results = {
    migrated: 0,
    errors: [] as string[],
  };

  return await lock.withLock("contents-migration", async () => {
    try {
      // コンテンツ一覧を取得
      const indexData = await opfs.readJSON<ContentIndex[]>("contents/index.json");
      if (!indexData || indexData.length === 0) {
        return results;
      }

      // インデックスの更新
      const updatedIndex = indexData.map((item) => {
        if ((item as any).type === "rich-text") {
          return { ...item, type: "text" as const };
        }
        return item;
      });

      // 各コンテンツファイルを更新
      for (const contentIndex of indexData) {
        if ((contentIndex as any).type !== "rich-text") {
          continue;
        }

        try {
          // コンテンツ詳細を読み込み
          const contentData = await opfs.readJSON<ContentItem>(`contents/content-${contentIndex.id}.json`);
          if (!contentData) {
            results.errors.push(`Content ${contentIndex.id} not found`);
            continue;
          }

          // タイプを変更し、richTextInfoをtextInfoに変更
          const migratedContent: ContentItem = {
            ...contentData,
            type: "text",
            textInfo: (contentData as any).richTextInfo,
            richTextInfo: undefined,
          } as ContentItem;

          // バリデーション
          const validated = ContentItemSchema.parse(migratedContent);

          // 保存
          await opfs.writeJSON(`contents/content-${contentIndex.id}.json`, validated);
          results.migrated++;

          logger.info("Migration", `Migrated content ${contentIndex.id} from rich-text to text`);
        } catch (error) {
          const errorMsg = `Failed to migrate content ${contentIndex.id}: ${error}`;
          logger.error("Migration", errorMsg);
          results.errors.push(errorMsg);
        }
      }

      // インデックスを保存
      const validatedIndex = ContentsIndexSchema.parse(updatedIndex);
      await opfs.writeJSON("contents/index.json", validatedIndex);

      logger.info("Migration", `Migration completed: ${results.migrated} contents migrated`);
      return results;
    } catch (error) {
      const errorMsg = `Migration failed: ${error}`;
      logger.error("Migration", errorMsg);
      results.errors.push(errorMsg);
      return results;
    }
  });
};

/**
 * マイグレーションが必要かチェック
 */
export const needsRichTextMigration = async (): Promise<boolean> => {
  const opfs = OPFSManager.getInstance();
  const lock = OPFSLock.getInstance();

  return await lock.withLock("contents-index", async () => {
    try {
      const indexData = await opfs.readJSON<ContentIndex[]>("contents/index.json");
      if (!indexData) {
        return false;
      }

      // rich-textタイプが存在するかチェック
      return indexData.some((item) => (item as any).type === "rich-text");
    } catch (error) {
      logger.error("Migration", `Failed to check migration status: ${error}`);
      return false;
    }
  });
};
