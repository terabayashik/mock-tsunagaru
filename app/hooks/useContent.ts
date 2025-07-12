import { useCallback } from "react";
import type { ContentIndex, ContentItem, ContentType } from "~/schemas/content";
import { ContentItemSchema, ContentsIndexSchema, getContentTypeFromMimeType, isYouTubeUrl } from "~/schemas/content";
import { OPFSError, OPFSManager } from "~/utils/opfs";
import { OPFSLock } from "~/utils/opfs-lock";

export const useContent = () => {
  const opfs = OPFSManager.getInstance();
  const lock = OPFSLock.getInstance();

  /**
   * コンテンツ一覧を取得
   */
  const getContentsIndex = useCallback(async (): Promise<ContentIndex[]> => {
    return await lock.withLock("contents-index", async () => {
      try {
        const indexData = await opfs.readJSON<ContentIndex[]>("contents/index.json");
        if (!indexData) {
          // 初回の場合は空配列を返し、インデックスファイルを作成
          await opfs.writeJSON("contents/index.json", []);
          return [];
        }

        // Zodでバリデーション
        const validated = ContentsIndexSchema.parse(indexData);
        lock.recordReadTimestamp("contents/index.json");
        return validated;
      } catch (error) {
        if (error instanceof OPFSError) {
          // ファイルが存在しない場合は空配列で初期化
          if (error.message.includes("NotFoundError") || error.message.includes("Failed to read JSON")) {
            await opfs.writeJSON("contents/index.json", []);
            return [];
          }
          throw error;
        }
        throw new Error(`コンテンツ一覧の取得に失敗しました: ${error}`);
      }
    });
  }, [lock.recordReadTimestamp, lock.withLock, opfs.readJSON, opfs.writeJSON]);

  /**
   * 個別のコンテンツ詳細を取得
   */
  const getContentById = useCallback(
    async (id: string): Promise<ContentItem | null> => {
      return await lock.withLock(`content-${id}`, async () => {
        try {
          const contentData = await opfs.readJSON<ContentItem>(`contents/content-${id}.json`);
          if (!contentData) {
            return null;
          }

          // Zodでバリデーション
          const validated = ContentItemSchema.parse(contentData);
          lock.recordReadTimestamp(`contents/content-${id}.json`);
          return validated;
        } catch (error) {
          if (error instanceof OPFSError) {
            throw error;
          }
          throw new Error(`コンテンツ詳細の取得に失敗しました: ${error}`);
        }
      });
    },
    [lock.recordReadTimestamp, lock.withLock, opfs.readJSON],
  );

  /**
   * ファイルをアップロードしてコンテンツを作成
   */
  const createFileContent = useCallback(
    async (file: File, name?: string): Promise<ContentItem> => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const contentType = getContentTypeFromMimeType(file.type);

      // ファイルをOPFSに保存
      const storagePath = `contents/files/${id}-${file.name}`;
      const fileArrayBuffer = await file.arrayBuffer();

      const newContent: ContentItem = {
        id,
        name: name || file.name,
        type: contentType,
        fileInfo: {
          originalName: file.name,
          size: file.size,
          mimeType: file.type,
          storagePath,
        },
        tags: [],
        createdAt: now,
        updatedAt: now,
      };

      // Zodでバリデーション
      const validated = ContentItemSchema.parse(newContent);

      return await lock.withLock("contents-create", async () => {
        try {
          // ファイルを保存
          await opfs.writeFile(storagePath, fileArrayBuffer);

          // メタデータを保存
          await opfs.writeJSON(`contents/content-${id}.json`, validated);

          // インデックスを更新
          const currentIndex = await getContentsIndex();
          const newIndex: ContentIndex = {
            id: validated.id,
            name: validated.name,
            type: validated.type,
            size: validated.fileInfo?.size,
            tags: validated.tags,
            createdAt: validated.createdAt,
            updatedAt: validated.updatedAt,
          };

          const updatedIndex = [...currentIndex, newIndex];
          await opfs.writeJSON("contents/index.json", updatedIndex);

          return validated;
        } catch (error) {
          // エラーが発生した場合はクリーンアップ
          try {
            await opfs.deleteFile(storagePath);
            await opfs.deleteFile(`contents/content-${id}.json`);
          } catch {
            // クリーンアップエラーは無視
          }
          throw new Error(`ファイルコンテンツの作成に失敗しました: ${error}`);
        }
      });
    },
    [getContentsIndex, lock.withLock, opfs.writeFile, opfs.writeJSON, opfs.deleteFile],
  );

  /**
   * URLコンテンツを作成
   */
  const createUrlContent = useCallback(
    async (url: string, name?: string, title?: string, description?: string): Promise<ContentItem> => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const contentType: ContentType = isYouTubeUrl(url) ? "youtube" : "url";

      const newContent: ContentItem = {
        id,
        name: name || title || url,
        type: contentType,
        urlInfo: {
          url,
          title,
          description,
        },
        tags: [],
        createdAt: now,
        updatedAt: now,
      };

      // Zodでバリデーション
      const validated = ContentItemSchema.parse(newContent);

      return await lock.withLock("contents-create", async () => {
        try {
          // メタデータを保存
          await opfs.writeJSON(`contents/content-${id}.json`, validated);

          // インデックスを更新
          const currentIndex = await getContentsIndex();
          const newIndex: ContentIndex = {
            id: validated.id,
            name: validated.name,
            type: validated.type,
            url: validated.urlInfo?.url,
            tags: validated.tags,
            createdAt: validated.createdAt,
            updatedAt: validated.updatedAt,
          };

          const updatedIndex = [...currentIndex, newIndex];
          await opfs.writeJSON("contents/index.json", updatedIndex);

          return validated;
        } catch (error) {
          // エラーが発生した場合はクリーンアップ
          try {
            await opfs.deleteFile(`contents/content-${id}.json`);
          } catch {
            // クリーンアップエラーは無視
          }
          throw new Error(`URLコンテンツの作成に失敗しました: ${error}`);
        }
      });
    },
    [getContentsIndex, lock.withLock, opfs.writeJSON, opfs.deleteFile],
  );

  /**
   * コンテンツを更新
   */
  const updateContent = useCallback(
    async (id: string, updateData: Partial<Omit<ContentItem, "id" | "createdAt">>): Promise<ContentItem> => {
      return await lock.withLock(`content-${id}`, async () => {
        try {
          // 既存データを取得
          const existingContent = await getContentById(id);
          if (!existingContent) {
            throw new Error("コンテンツが見つかりません");
          }

          const updatedContent: ContentItem = {
            ...existingContent,
            ...updateData,
            updatedAt: new Date().toISOString(),
          };

          // Zodでバリデーション
          const validated = ContentItemSchema.parse(updatedContent);

          // メタデータを更新
          await opfs.writeJSON(`contents/content-${id}.json`, validated);

          // インデックスを更新
          const currentIndex = await getContentsIndex();
          const updatedIndex = currentIndex.map((item) =>
            item.id === id
              ? {
                  id: validated.id,
                  name: validated.name,
                  type: validated.type,
                  size: validated.fileInfo?.size,
                  url: validated.urlInfo?.url,
                  tags: validated.tags,
                  createdAt: validated.createdAt,
                  updatedAt: validated.updatedAt,
                }
              : item,
          );

          await opfs.writeJSON("contents/index.json", updatedIndex);

          return validated;
        } catch (error) {
          throw new Error(`コンテンツの更新に失敗しました: ${error}`);
        }
      });
    },
    [getContentById, getContentsIndex, lock.withLock, opfs.writeJSON],
  );

  /**
   * コンテンツを削除
   */
  const deleteContent = useCallback(
    async (id: string): Promise<void> => {
      return await lock.withLock(`content-${id}`, async () => {
        try {
          // 既存データを取得してファイルパスを確認
          const existingContent = await getContentById(id);

          // ファイルコンテンツの場合は実ファイルも削除
          if (existingContent?.fileInfo?.storagePath) {
            try {
              await opfs.deleteFile(existingContent.fileInfo.storagePath);
            } catch {
              // ファイルが存在しない場合は無視
            }
          }

          // メタデータファイルを削除
          await opfs.deleteFile(`contents/content-${id}.json`);

          // インデックスから削除
          const currentIndex = await getContentsIndex();
          const updatedIndex = currentIndex.filter((item) => item.id !== id);
          await opfs.writeJSON("contents/index.json", updatedIndex);

          // タイムスタンプをクリア
          lock.clearTimestamp(`contents/content-${id}.json`);
        } catch (error) {
          throw new Error(`コンテンツの削除に失敗しました: ${error}`);
        }
      });
    },
    [getContentById, getContentsIndex, lock.clearTimestamp, lock.withLock, opfs.deleteFile, opfs.writeJSON],
  );

  /**
   * ファイルコンテンツのバイナリデータを取得
   */
  const getFileContent = useCallback(
    async (storagePath: string): Promise<ArrayBuffer> => {
      try {
        const data = await opfs.readFile(storagePath);
        return data;
      } catch (error) {
        throw new Error(`ファイルの読み込みに失敗しました: ${error}`);
      }
    },
    [opfs.readFile],
  );

  return {
    getContentsIndex,
    getContentById,
    createFileContent,
    createUrlContent,
    updateContent,
    deleteContent,
    getFileContent,
  };
};
