import { useCallback } from "react";
import type { PlaylistIndex, PlaylistItem } from "~/types/playlist";
import { PlaylistItemSchema, PlaylistsIndexSchema } from "~/types/playlist";
import { OPFSError, OPFSManager } from "~/utils/storage/opfs";
import { OPFSLock } from "~/utils/storage/opfsLock";

export const usePlaylist = () => {
  const opfs = OPFSManager.getInstance();
  const lock = OPFSLock.getInstance();

  /**
   * プレイリスト一覧を取得
   */
  const getPlaylistsIndex = useCallback(async (): Promise<PlaylistIndex[]> => {
    return await lock.withLock("playlists-index", async () => {
      try {
        const indexData = await opfs.readJSON<PlaylistIndex[]>("playlists/index.json");
        if (!indexData) {
          // 初回の場合は空配列を返し、インデックスファイルを作成
          await opfs.writeJSON("playlists/index.json", []);
          return [];
        }

        // Zodでバリデーション
        const validated = PlaylistsIndexSchema.parse(indexData);
        lock.recordReadTimestamp("playlists/index.json");
        return validated;
      } catch (error) {
        if (error instanceof OPFSError) {
          // ファイルが存在しない場合は空配列で初期化
          if (error.message.includes("NotFoundError") || error.message.includes("Failed to read JSON")) {
            await opfs.writeJSON("playlists/index.json", []);
            return [];
          }
          throw error;
        }
        throw new Error(`プレイリスト一覧の取得に失敗しました: ${error}`);
      }
    });
  }, [lock.recordReadTimestamp, lock.withLock, opfs.readJSON, opfs.writeJSON]);

  /**
   * 個別のプレイリスト詳細を取得
   */
  const getPlaylistById = useCallback(
    async (id: string): Promise<PlaylistItem | null> => {
      return await lock.withLock(`playlist-${id}`, async () => {
        try {
          const playlistData = await opfs.readJSON<PlaylistItem>(`playlists/playlist-${id}.json`);
          if (!playlistData) {
            return null;
          }

          // Zodでバリデーション
          const validated = PlaylistItemSchema.parse(playlistData);
          lock.recordReadTimestamp(`playlists/playlist-${id}.json`);
          return validated;
        } catch (error) {
          if (error instanceof OPFSError) {
            throw error;
          }
          throw new Error(`プレイリスト詳細の取得に失敗しました: ${error}`);
        }
      });
    },
    [lock.recordReadTimestamp, lock.withLock, opfs.readJSON],
  );

  /**
   * プレイリストを作成
   */
  const createPlaylist = useCallback(
    async (playlistData: Omit<PlaylistItem, "id" | "createdAt" | "updatedAt">): Promise<PlaylistItem> => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const newPlaylist: PlaylistItem = {
        id,
        ...playlistData,
        createdAt: now,
        updatedAt: now,
      };

      // Zodでバリデーション
      const validated = PlaylistItemSchema.parse(newPlaylist);

      return await lock.withLock("playlists-create", async () => {
        try {
          // 個別ファイルに保存
          await opfs.writeJSON(`playlists/playlist-${id}.json`, validated);

          // インデックスを更新
          const currentIndex = await getPlaylistsIndex();
          const newIndex: PlaylistIndex = {
            id: validated.id,
            name: validated.name,
            materialCount: validated.materialCount,
            device: validated.device,
            createdAt: validated.createdAt,
            updatedAt: validated.updatedAt,
          };

          const updatedIndex = [...currentIndex, newIndex];
          await opfs.writeJSON("playlists/index.json", updatedIndex);

          return validated;
        } catch (error) {
          throw new Error(`プレイリストの作成に失敗しました: ${error}`);
        }
      });
    },
    [getPlaylistsIndex, lock.withLock, opfs.writeJSON],
  );

  /**
   * プレイリストを更新
   */
  const updatePlaylist = useCallback(
    async (id: string, updateData: Partial<Omit<PlaylistItem, "id" | "createdAt">>): Promise<PlaylistItem> => {
      return await lock.withLock(`playlist-${id}`, async () => {
        try {
          // 既存データを取得
          const existingPlaylist = await getPlaylistById(id);
          if (!existingPlaylist) {
            throw new Error("プレイリストが見つかりません");
          }

          const updatedPlaylist: PlaylistItem = {
            ...existingPlaylist,
            ...updateData,
            updatedAt: new Date().toISOString(),
          };

          // Zodでバリデーション
          const validated = PlaylistItemSchema.parse(updatedPlaylist);

          // 個別ファイルを更新
          await opfs.writeJSON(`playlists/playlist-${id}.json`, validated);

          // インデックスを更新
          const currentIndex = await getPlaylistsIndex();
          const updatedIndex = currentIndex.map((item) =>
            item.id === id
              ? {
                  id: validated.id,
                  name: validated.name,
                  materialCount: validated.materialCount,
                  device: validated.device,
                  createdAt: validated.createdAt,
                  updatedAt: validated.updatedAt,
                }
              : item,
          );

          await opfs.writeJSON("playlists/index.json", updatedIndex);

          return validated;
        } catch (error) {
          throw new Error(`プレイリストの更新に失敗しました: ${error}`);
        }
      });
    },
    [getPlaylistById, getPlaylistsIndex, lock.withLock, opfs.writeJSON],
  );

  /**
   * プレイリストを削除
   */
  const deletePlaylist = useCallback(
    async (id: string): Promise<void> => {
      return await lock.withLock(`playlist-${id}`, async () => {
        try {
          // 個別ファイルを削除
          await opfs.deleteFile(`playlists/playlist-${id}.json`);

          // インデックスから削除
          const currentIndex = await getPlaylistsIndex();
          const updatedIndex = currentIndex.filter((item) => item.id !== id);
          await opfs.writeJSON("playlists/index.json", updatedIndex);

          // タイムスタンプをクリア
          lock.clearTimestamp(`playlists/playlist-${id}.json`);
        } catch (error) {
          throw new Error(`プレイリストの削除に失敗しました: ${error}`);
        }
      });
    },
    [
      getPlaylistsIndex, // タイムスタンプをクリア
      lock.clearTimestamp,
      lock.withLock,
      opfs.deleteFile,
      opfs.writeJSON,
    ],
  );

  return {
    getPlaylistsIndex,
    getPlaylistById,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
  };
};
