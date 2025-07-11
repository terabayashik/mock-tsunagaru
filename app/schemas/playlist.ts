import { z } from "zod";

export const PlaylistItemSchema = z.object({
  id: z.string().min(1, "IDは必須です"),
  name: z.string().min(1, "名前は必須です"),
  materialCount: z.number().int().min(0, "素材数は0以上である必要があります"),
  device: z.string().min(1, "デバイスは必須です"),
  createdAt: z.string().datetime("無効な作成日時です"),
  updatedAt: z.string().datetime("無効な更新日時です").optional(),
});

export const PlaylistIndexSchema = z.object({
  id: z.string(),
  name: z.string(),
  materialCount: z.number().int().min(0),
  device: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

export const PlaylistsIndexSchema = z.array(PlaylistIndexSchema);

export type PlaylistItem = z.infer<typeof PlaylistItemSchema>;
export type PlaylistIndex = z.infer<typeof PlaylistIndexSchema>;
