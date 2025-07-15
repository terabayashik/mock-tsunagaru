import { useCallback } from "react";
import type { ContentIndex, ContentItem, ContentType, RichTextContent } from "~/types/content";
import { ContentItemSchema, ContentsIndexSchema, getContentTypeFromMimeType, isYouTubeUrl } from "~/types/content";
import { type ContentUsageInfo, checkContentUsage } from "~/utils/contentUsage";
import { logger } from "~/utils/logger";
import { thumbnailGenerator } from "~/utils/media/thumbnailGenerator";
import { OPFSError, OPFSManager } from "~/utils/storage/opfs";
import { OPFSLock } from "~/utils/storage/opfsLock";
import { usePlaylist } from "./usePlaylist";

// テキストファイルかどうかを判定する関数
const isTextFile = (file: File): boolean => {
  // MIMEタイプでの判定
  if (file.type.startsWith("text/")) {
    return true;
  }

  // 拡張子での判定
  const textExtensions = [
    ".txt",
    ".md",
    ".markdown",
    ".json",
    ".xml",
    ".csv",
    ".log",
    ".ini",
    ".cfg",
    ".conf",
    ".yml",
    ".yaml",
    ".toml",
  ];

  const fileName = file.name.toLowerCase();
  return textExtensions.some((ext) => fileName.endsWith(ext));
};

// テキストファイルからテキストコンテンツを読み取る関数
const readTextFromFile = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("Failed to read text from file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file, "utf-8");
  });
};

export const useContent = () => {
  const opfs = OPFSManager.getInstance();
  const lock = OPFSLock.getInstance();
  const { getPlaylistsIndex, getPlaylistById } = usePlaylist();

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

      // サムネイル生成
      let thumbnailData: ArrayBuffer | undefined;
      let metadata: { width?: number; height?: number; duration?: number } | undefined;

      try {
        const thumbnailResult = await thumbnailGenerator.generateThumbnail(file, {
          width: 400, // 幅のみ指定してアスペクト比を保持
          quality: 0.8,
        });
        thumbnailData = thumbnailResult.thumbnailData;
        metadata = thumbnailResult.metadata;
      } catch (error) {
        logger.warn("Content", `Failed to generate thumbnail for ${file.name}`, error);
        // サムネイル生成に失敗してもファイル作成は続行
      }

      const thumbnailPath = thumbnailData ? `contents/thumbnails/${id}.jpg` : undefined;

      const newContent: ContentItem = {
        id,
        name: name || file.name,
        type: contentType,
        fileInfo: {
          originalName: file.name,
          size: file.size,
          mimeType: file.type,
          storagePath,
          thumbnailPath,
          metadata,
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

          // サムネイルを保存
          if (thumbnailData && thumbnailPath) {
            await opfs.writeFile(thumbnailPath, thumbnailData);
          }

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
            if (thumbnailPath) {
              await opfs.deleteFile(thumbnailPath);
            }
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
   * リッチテキストコンテンツを作成
   */
  const createRichTextContent = useCallback(
    async (name: string, richTextInfo: RichTextContent): Promise<ContentItem> => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const newContent: ContentItem = {
        id,
        name,
        type: "rich-text",
        richTextInfo,
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
          throw new Error(`リッチテキストコンテンツの作成に失敗しました: ${error}`);
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
          // 既存データを取得（デッドロックを避けるため、getContentByIdを使わずに直接読み込む）
          const existingData = await opfs.readJSON<ContentItem>(`contents/content-${id}.json`);
          if (!existingData) {
            throw new Error("コンテンツが見つかりません");
          }

          // Zodでバリデーション
          const existingContent = ContentItemSchema.parse(existingData);

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
    [getContentsIndex, lock.withLock, opfs.readJSON, opfs.writeJSON],
  );

  /**
   * コンテンツを削除
   */
  const deleteContent = useCallback(
    async (id: string): Promise<void> => {
      return await lock.withLock(`content-${id}`, async () => {
        try {
          // 既存データを取得してファイルパスを確認（デッドロックを避けるため、直接読み込む）
          const existingData = await opfs.readJSON<ContentItem>(`contents/content-${id}.json`);
          const existingContent = existingData ? ContentItemSchema.parse(existingData) : null;

          // ファイルコンテンツの場合は実ファイルも削除
          if (existingContent?.fileInfo?.storagePath) {
            try {
              await opfs.deleteFile(existingContent.fileInfo.storagePath);
            } catch {
              // ファイルが存在しない場合は無視
            }
          }

          // サムネイルファイルも削除
          if (existingContent?.fileInfo?.thumbnailPath) {
            try {
              await opfs.deleteFile(existingContent.fileInfo.thumbnailPath);
            } catch {
              // サムネイルファイルが存在しない場合は無視
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
    [getContentsIndex, lock.clearTimestamp, lock.withLock, opfs.deleteFile, opfs.readJSON, opfs.writeJSON],
  );

  /**
   * コンテンツの使用状況をチェック
   */
  const checkContentUsageStatus = useCallback(
    async (contentId: string): Promise<ContentUsageInfo> => {
      return await checkContentUsage(contentId, getPlaylistsIndex, getPlaylistById);
    },
    [getPlaylistsIndex, getPlaylistById],
  );

  /**
   * 使用状況をチェックしてからコンテンツを削除
   * プレイリストで使用中の場合はエラーを投げる
   */
  const deleteContentSafely = useCallback(
    async (id: string): Promise<void> => {
      // 使用状況をチェック
      const usageInfo = await checkContentUsageStatus(id);

      if (usageInfo.isUsed) {
        const playlistNames = usageInfo.playlists.map((p) => p.name).join("、");
        throw new Error(
          `このコンテンツは以下のプレイリストで使用されているため削除できません：${playlistNames}\n\n` +
            "削除するには、まずプレイリストからコンテンツを削除してください。",
        );
      }

      // 使用されていない場合は通常の削除を実行
      await deleteContent(id);
    },
    [checkContentUsageStatus, deleteContent],
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

  /**
   * サムネイルのBlob URLを取得
   */
  const getThumbnailUrl = useCallback(
    async (contentId: string): Promise<string | null> => {
      try {
        const content = await getContentById(contentId);
        if (!content?.fileInfo?.thumbnailPath) {
          return null;
        }

        const thumbnailData = await opfs.readFile(content.fileInfo.thumbnailPath);
        const blob = new Blob([thumbnailData], { type: "image/jpeg" });
        return URL.createObjectURL(blob);
      } catch (error) {
        logger.warn("Content", `Failed to get thumbnail URL for ${contentId}`, error);
        return null;
      }
    },
    [getContentById, opfs.readFile],
  );

  /**
   * 全コンテンツのサムネイルを一括再生成
   */
  const regenerateAllThumbnails = useCallback(async (): Promise<{
    total: number;
    success: number;
    failed: string[];
  }> => {
    const results = {
      total: 0,
      success: 0,
      failed: [] as string[],
    };

    try {
      // 全コンテンツを取得
      const allContents = await getContentsIndex();
      results.total = allContents.length;

      for (const contentIndex of allContents) {
        try {
          // 詳細情報を取得
          const content = await getContentById(contentIndex.id);
          if (!content?.fileInfo?.storagePath) {
            // ファイルコンテンツでない場合はスキップ
            continue;
          }

          // 元のファイルを取得
          const fileData = await opfs.readFile(content.fileInfo.storagePath);
          const file = new File([fileData], content.fileInfo.originalName, {
            type: content.fileInfo.mimeType,
          });

          // サムネイル再生成
          const thumbnailResult = await thumbnailGenerator.generateThumbnail(file, {
            width: 400, // 幅のみ指定してアスペクト比を保持
            quality: 0.8,
          });

          // 既存のサムネイルファイルを削除（存在する場合）
          if (content.fileInfo.thumbnailPath) {
            try {
              await opfs.deleteFile(content.fileInfo.thumbnailPath);
            } catch {
              // 既存ファイルが存在しない場合は無視
            }
          }

          // 新しいサムネイルを保存
          const thumbnailPath = `contents/thumbnails/${content.id}.jpg`;
          await opfs.writeFile(thumbnailPath, thumbnailResult.thumbnailData);

          // メタデータを更新
          const updatedContent = {
            ...content,
            fileInfo: {
              ...content.fileInfo,
              thumbnailPath,
              metadata: thumbnailResult.metadata,
            },
            updatedAt: new Date().toISOString(),
          };

          await opfs.writeJSON(`contents/content-${content.id}.json`, updatedContent);

          results.success++;
        } catch (error) {
          logger.error("Content", `Failed to regenerate thumbnail for ${contentIndex.id}`, error);
          results.failed.push(contentIndex.name);
        }
      }

      return results;
    } catch (error) {
      throw new Error(`サムネイル一括再生成に失敗しました: ${error}`);
    }
  }, [getContentsIndex, getContentById, opfs.readFile, opfs.writeFile, opfs.deleteFile, opfs.writeJSON]);

  /**
   * ファイルをアップロードして適切なコンテンツタイプで作成
   * テキストファイルの場合はテキストコンテンツとして、それ以外はファイルコンテンツとして作成
   */
  const createFileOrTextContent = useCallback(
    async (file: File, name?: string): Promise<ContentItem> => {
      if (isTextFile(file)) {
        // テキストファイルの場合はテキストコンテンツとして作成
        try {
          const textContent = await readTextFromFile(file);
          const richTextInfo: RichTextContent = {
            content: textContent,
            writingMode: "horizontal",
            fontFamily: "Noto Sans JP",
            textAlign: "start",
            color: "#000000",
            backgroundColor: "#ffffff",
            fontSize: 24,
            scrollType: "none",
            scrollSpeed: 3,
          };

          return await createRichTextContent(name || file.name.replace(/\.[^/.]+$/, ""), richTextInfo);
        } catch (error) {
          logger.error("Content", `Failed to read text from file ${file.name}`, error);
          // テキスト読み込みに失敗した場合は通常のファイルコンテンツとして作成
          return await createFileContent(file, name);
        }
      } else {
        // テキストファイル以外は通常のファイルコンテンツとして作成
        return await createFileContent(file, name);
      }
    },
    [createFileContent, createRichTextContent],
  );

  return {
    getContentsIndex,
    getContentById,
    createFileContent,
    createFileOrTextContent,
    createUrlContent,
    createRichTextContent,
    updateContent,
    deleteContent,
    deleteContentSafely,
    checkContentUsageStatus,
    getFileContent,
    getThumbnailUrl,
    regenerateAllThumbnails,
  };
};
