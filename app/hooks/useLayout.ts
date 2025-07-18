import { useCallback } from "react";
import { usePlaylist } from "~/hooks/usePlaylist";
import type { LayoutIndex, LayoutItem } from "~/types/layout";
import { LayoutItemSchema, LayoutsIndexSchema } from "~/types/layout";
import { checkLayoutUsage, type LayoutUsageInfo } from "~/utils/layoutUsage";
import { OPFSError, OPFSManager } from "~/utils/storage/opfs";
import { OPFSLock } from "~/utils/storage/opfsLock";

export const useLayout = () => {
  const opfs = OPFSManager.getInstance();
  const lock = OPFSLock.getInstance();
  const { getPlaylistsIndex, getPlaylistById } = usePlaylist();

  /**
   * レイアウト一覧を取得
   */
  const getLayoutsIndex = useCallback(async (): Promise<LayoutIndex[]> => {
    return await lock.withLock("layouts-index", async () => {
      try {
        const indexData = await opfs.readJSON<LayoutIndex[]>("layouts/index.json");
        if (!indexData) {
          // 初回の場合は空配列を返し、インデックスファイルを作成
          await opfs.writeJSON("layouts/index.json", []);
          return [];
        }

        // Zodでバリデーション
        const validated = LayoutsIndexSchema.parse(indexData);
        lock.recordReadTimestamp("layouts/index.json");
        return validated;
      } catch (error) {
        if (error instanceof OPFSError) {
          // ファイルが存在しない場合は空配列で初期化
          if (error.message.includes("NotFoundError") || error.message.includes("Failed to read JSON")) {
            await opfs.writeJSON("layouts/index.json", []);
            return [];
          }
          throw error;
        }
        throw new Error(`レイアウト一覧の取得に失敗しました: ${error}`);
      }
    });
  }, [lock.recordReadTimestamp, lock.withLock, opfs.readJSON, opfs.writeJSON]);

  /**
   * 個別のレイアウト詳細を取得
   */
  const getLayoutById = useCallback(
    async (id: string): Promise<LayoutItem | null> => {
      return await lock.withLock(`layout-${id}`, async () => {
        try {
          const layoutData = await opfs.readJSON<LayoutItem>(`layouts/layout-${id}.json`);
          if (!layoutData) {
            return null;
          }

          // 後方互換性のためzIndexを追加
          const layoutWithZIndex = {
            ...layoutData,
            regions:
              layoutData.regions?.map((region, index) => ({
                ...region,
                zIndex: region.zIndex ?? index, // zIndexがない場合はindex順にする
              })) || [],
          };

          // Zodでバリデーション
          const validated = LayoutItemSchema.parse(layoutWithZIndex);
          lock.recordReadTimestamp(`layouts/layout-${id}.json`);
          return validated;
        } catch (error) {
          if (error instanceof OPFSError) {
            throw error;
          }
          throw new Error(`レイアウト詳細の取得に失敗しました: ${error}`);
        }
      });
    },
    [lock.recordReadTimestamp, lock.withLock, opfs.readJSON],
  );

  /**
   * レイアウトを作成
   */
  const createLayout = useCallback(
    async (layoutData: Omit<LayoutItem, "id" | "createdAt" | "updatedAt">): Promise<LayoutItem> => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const newLayout: LayoutItem = {
        id,
        ...layoutData,
        createdAt: now,
        updatedAt: now,
      };

      // Zodでバリデーション
      const validated = LayoutItemSchema.parse(newLayout);

      return await lock.withLock("layouts-create", async () => {
        try {
          // 個別ファイルに保存
          await opfs.writeJSON(`layouts/layout-${id}.json`, validated);

          // インデックスを更新
          const currentIndex = await getLayoutsIndex();
          const newIndex: LayoutIndex = {
            id: validated.id,
            name: validated.name,
            orientation: validated.orientation,
            regionCount: validated.regions.length,
            createdAt: validated.createdAt,
            updatedAt: validated.updatedAt,
          };

          const updatedIndex = [...currentIndex, newIndex];
          await opfs.writeJSON("layouts/index.json", updatedIndex);

          return validated;
        } catch (error) {
          throw new Error(`レイアウトの作成に失敗しました: ${error}`);
        }
      });
    },
    [getLayoutsIndex, lock.withLock, opfs.writeJSON],
  );

  /**
   * レイアウトを更新
   */
  const updateLayout = useCallback(
    async (id: string, updateData: Partial<Omit<LayoutItem, "id" | "createdAt">>): Promise<LayoutItem> => {
      return await lock.withLock(`layout-${id}`, async () => {
        try {
          // 既存データを取得（ロック内で直接読み込み）
          const existingLayoutData = await opfs.readJSON<LayoutItem>(`layouts/layout-${id}.json`);
          if (!existingLayoutData) {
            throw new Error("レイアウトが見つかりません");
          }

          // 後方互換性のためzIndexを追加
          const layoutWithZIndex = {
            ...existingLayoutData,
            regions:
              existingLayoutData.regions?.map((region, index) => ({
                ...region,
                zIndex: region.zIndex ?? index,
              })) || [],
          };

          const existingLayout = LayoutItemSchema.parse(layoutWithZIndex);

          const updatedLayout: LayoutItem = {
            ...existingLayout,
            ...updateData,
            updatedAt: new Date().toISOString(),
          };

          // Zodでバリデーション
          const validated = LayoutItemSchema.parse(updatedLayout);

          // 個別ファイルを更新
          await opfs.writeJSON(`layouts/layout-${id}.json`, validated);

          // インデックスを更新
          const currentIndex = await getLayoutsIndex();
          const updatedIndex = currentIndex.map((item) =>
            item.id === id
              ? {
                  id: validated.id,
                  name: validated.name,
                  orientation: validated.orientation,
                  regionCount: validated.regions.length,
                  createdAt: validated.createdAt,
                  updatedAt: validated.updatedAt,
                }
              : item,
          );

          await opfs.writeJSON("layouts/index.json", updatedIndex);

          return validated;
        } catch (error) {
          throw new Error(`レイアウトの更新に失敗しました: ${error}`);
        }
      });
    },
    [getLayoutsIndex, lock.withLock, opfs.readJSON, opfs.writeJSON],
  );

  /**
   * レイアウトを削除
   */
  const deleteLayout = useCallback(
    async (id: string): Promise<void> => {
      return await lock.withLock(`layout-${id}`, async () => {
        try {
          // 個別ファイルを削除
          await opfs.deleteFile(`layouts/layout-${id}.json`);

          // インデックスから削除
          const currentIndex = await getLayoutsIndex();
          const updatedIndex = currentIndex.filter((item) => item.id !== id);
          await opfs.writeJSON("layouts/index.json", updatedIndex);

          // タイムスタンプをクリア
          lock.clearTimestamp(`layouts/layout-${id}.json`);
        } catch (error) {
          throw new Error(`レイアウトの削除に失敗しました: ${error}`);
        }
      });
    },
    [
      getLayoutsIndex, // タイムスタンプをクリア
      lock.clearTimestamp,
      lock.withLock,
      opfs.deleteFile,
      opfs.writeJSON,
    ],
  );

  /**
   * レイアウトの使用状況をチェック
   */
  const checkLayoutUsageStatus = useCallback(
    async (layoutId: string): Promise<LayoutUsageInfo> => {
      return await checkLayoutUsage(layoutId, getPlaylistsIndex, getPlaylistById);
    },
    [getPlaylistsIndex, getPlaylistById],
  );

  return {
    getLayoutsIndex,
    getLayoutById,
    createLayout,
    updateLayout,
    deleteLayout,
    checkLayoutUsageStatus,
  };
};
