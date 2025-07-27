import { useCallback } from "react";
import type { ScheduleIndex, ScheduleItem } from "~/types/schedule";
import { ScheduleItemSchema, SchedulesIndexSchema } from "~/types/schedule";
import { OPFSError, OPFSManager } from "~/utils/storage/opfs";
import { OPFSLock } from "~/utils/storage/opfsLock";

export const useSchedule = () => {
  const opfs = OPFSManager.getInstance();
  const lock = OPFSLock.getInstance();

  /**
   * スケジュール一覧を取得
   */
  const getSchedulesIndex = useCallback(async (): Promise<ScheduleIndex[]> => {
    return await lock.withLock("schedules-index", async () => {
      try {
        const indexData = await opfs.readJSON<ScheduleIndex[]>("schedules/index.json");
        if (!indexData) {
          // 初回の場合は空配列を返し、インデックスファイルを作成
          await opfs.writeJSON("schedules/index.json", []);
          return [];
        }

        // 古い形式のデータの移行処理
        interface MigrationItem {
          weekdays?: string[];
          [key: string]: unknown;
        }

        const migrated = (indexData as unknown[]).map((item) => {
          const migrationItem = item as MigrationItem;
          if (!migrationItem.weekdays) {
            // 古い形式の場合、全曜日に設定
            return {
              ...migrationItem,
              weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
            };
          }
          return migrationItem;
        });

        // Zodでバリデーション
        const validated = SchedulesIndexSchema.parse(migrated);
        lock.recordReadTimestamp("schedules/index.json");
        return validated;
      } catch (error) {
        if (error instanceof OPFSError) {
          // ファイルが存在しない場合は空配列で初期化
          if (error.message.includes("NotFoundError") || error.message.includes("Failed to read JSON")) {
            await opfs.writeJSON("schedules/index.json", []);
            return [];
          }
          throw error;
        }
        throw new Error(`スケジュール一覧の取得に失敗しました: ${error}`);
      }
    });
  }, [lock.recordReadTimestamp, lock.withLock, opfs.readJSON, opfs.writeJSON]);

  /**
   * 個別のスケジュール詳細を取得
   */
  const getScheduleById = useCallback(
    async (id: string): Promise<ScheduleItem | null> => {
      return await lock.withLock(`schedule-${id}`, async () => {
        try {
          const scheduleData = await opfs.readJSON<ScheduleItem>(`schedules/schedule-${id}.json`);
          if (!scheduleData) {
            return null;
          }

          // Zodでバリデーション
          const validated = ScheduleItemSchema.parse(scheduleData);
          lock.recordReadTimestamp(`schedules/schedule-${id}.json`);
          return validated;
        } catch (error) {
          if (error instanceof OPFSError) {
            throw error;
          }
          throw new Error(`スケジュール詳細の取得に失敗しました: ${error}`);
        }
      });
    },
    [lock.recordReadTimestamp, lock.withLock, opfs.readJSON],
  );

  /**
   * スケジュールを作成
   */
  const createSchedule = useCallback(
    async (scheduleData: Omit<ScheduleItem, "id" | "createdAt" | "updatedAt">): Promise<ScheduleItem> => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const newSchedule: ScheduleItem = {
        id,
        ...scheduleData,
        createdAt: now,
        updatedAt: now,
      };

      // Zodでバリデーション
      const validated = ScheduleItemSchema.parse(newSchedule);

      return await lock.withLock("schedules-create", async () => {
        try {
          // 個別ファイルに保存
          await opfs.writeJSON(`schedules/schedule-${id}.json`, validated);

          // インデックスを更新
          const currentIndex = await getSchedulesIndex();

          const newIndex: ScheduleIndex = {
            id: validated.id,
            name: validated.name,
            time: validated.time,
            weekdays: validated.weekdays,
            eventType: validated.event.type,
            playlistId: validated.event.type === "playlist" ? validated.event.playlistId : undefined,
            enabled: validated.enabled,
            createdAt: validated.createdAt,
            updatedAt: validated.updatedAt,
          };

          const updatedIndex = [...currentIndex, newIndex];
          // 時刻順にソート
          updatedIndex.sort((a, b) => a.time.localeCompare(b.time));

          await opfs.writeJSON("schedules/index.json", updatedIndex);

          return validated;
        } catch (error) {
          throw new Error(`スケジュールの作成に失敗しました: ${error}`);
        }
      });
    },
    [getSchedulesIndex, lock.withLock, opfs.writeJSON],
  );

  /**
   * スケジュールを更新
   */
  const updateSchedule = useCallback(
    async (id: string, updateData: Partial<Omit<ScheduleItem, "id" | "createdAt">>): Promise<ScheduleItem> => {
      return await lock.withLock(`schedule-${id}`, async () => {
        try {
          // 既存データを取得（ロックを再取得しないように直接読み込む）
          const scheduleData = await opfs.readJSON<ScheduleItem>(`schedules/schedule-${id}.json`);
          if (!scheduleData) {
            throw new Error("スケジュールが見つかりません");
          }

          // Zodでバリデーション
          const existingSchedule = ScheduleItemSchema.parse(scheduleData);

          const updatedSchedule: ScheduleItem = {
            ...existingSchedule,
            ...updateData,
            updatedAt: new Date().toISOString(),
          };

          // Zodでバリデーション
          const validated = ScheduleItemSchema.parse(updatedSchedule);

          // 個別ファイルを更新
          await opfs.writeJSON(`schedules/schedule-${id}.json`, validated);

          // インデックスを更新（同様にロックを再取得しないように修正）
          const indexData = await opfs.readJSON<ScheduleIndex[]>("schedules/index.json");
          const currentIndex = indexData ? SchedulesIndexSchema.parse(indexData) : [];

          const updatedIndex = currentIndex.map((item) =>
            item.id === id
              ? {
                  id: validated.id,
                  name: validated.name,
                  time: validated.time,
                  weekdays: validated.weekdays,
                  eventType: validated.event.type,
                  playlistId: validated.event.type === "playlist" ? validated.event.playlistId : undefined,
                  enabled: validated.enabled,
                  createdAt: validated.createdAt,
                  updatedAt: validated.updatedAt,
                }
              : item,
          );

          // 時刻順にソート
          updatedIndex.sort((a, b) => a.time.localeCompare(b.time));

          await opfs.writeJSON("schedules/index.json", updatedIndex);

          return validated;
        } catch (error) {
          throw new Error(`スケジュールの更新に失敗しました: ${error}`);
        }
      });
    },
    [lock.withLock, opfs.readJSON, opfs.writeJSON],
  );

  /**
   * スケジュールを削除
   */
  const deleteSchedule = useCallback(
    async (id: string): Promise<void> => {
      return await lock.withLock(`schedule-${id}`, async () => {
        try {
          // 個別ファイルを削除
          await opfs.deleteFile(`schedules/schedule-${id}.json`);

          // インデックスから削除
          const currentIndex = await getSchedulesIndex();
          const updatedIndex = currentIndex.filter((item) => item.id !== id);
          await opfs.writeJSON("schedules/index.json", updatedIndex);

          // タイムスタンプをクリア
          lock.clearTimestamp(`schedules/schedule-${id}.json`);
        } catch (error) {
          throw new Error(`スケジュールの削除に失敗しました: ${error}`);
        }
      });
    },
    [getSchedulesIndex, lock.clearTimestamp, lock.withLock, opfs.deleteFile, opfs.writeJSON],
  );

  /**
   * スケジュールの有効/無効を切り替え
   */
  const toggleScheduleEnabled = useCallback(
    async (id: string): Promise<ScheduleItem> => {
      const schedule = await getScheduleById(id);
      if (!schedule) {
        throw new Error("スケジュールが見つかりません");
      }

      return await updateSchedule(id, { enabled: !schedule.enabled });
    },
    [getScheduleById, updateSchedule],
  );

  return {
    getSchedulesIndex,
    getScheduleById,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    toggleScheduleEnabled,
  };
};
