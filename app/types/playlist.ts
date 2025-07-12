import { z } from "zod";

// レイアウト内のコンテンツ割り当て情報
export const ContentAssignmentSchema = z.object({
  regionId: z.string().min(1, "リージョンIDは必須です"),
  contentIds: z.array(z.string()).default([]), // 複数のコンテンツを割り当て可能
});

// プレイリストアイテム（詳細情報）
export const PlaylistItemSchema = z.object({
  id: z.string().min(1, "IDは必須です"),
  name: z.string().min(1, "名前は必須です"),
  layoutId: z.string().min(1, "レイアウトIDは必須です"),
  contentAssignments: z.array(ContentAssignmentSchema).default([]), // レイアウトの各リージョンに割り当てられたコンテンツ
  device: z.string().min(1, "デバイスは必須です"),
  createdAt: z.string().datetime("無効な作成日時です"),
  updatedAt: z.string().datetime("無効な更新日時です").optional(),
});

// プレイリストインデックス（一覧表示用）
export const PlaylistIndexSchema = z.object({
  id: z.string(),
  name: z.string(),
  layoutId: z.string(),
  contentCount: z.number().int().min(0), // 割り当てられたコンテンツの総数
  device: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

export const PlaylistsIndexSchema = z.array(PlaylistIndexSchema);

// 型エクスポート
export type ContentAssignment = z.infer<typeof ContentAssignmentSchema>;
export type PlaylistItem = z.infer<typeof PlaylistItemSchema>;
export type PlaylistIndex = z.infer<typeof PlaylistIndexSchema>;
