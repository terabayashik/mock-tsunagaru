import { z } from "zod";

// コンテンツタイプの定義
export const ContentTypeSchema = z.enum([
  "video", // 動画ファイル
  "image", // 画像ファイル
  "text", // テキストファイル
  "rich-text", // リッチテキスト（ユーザー入力）
  "youtube", // YouTubeのURL
  "url", // その他のURL
]);

// ファイルコンテンツの詳細情報
export const FileContentSchema = z.object({
  originalName: z.string().min(1, "オリジナルファイル名は必須です"),
  size: z.number().min(0, "ファイルサイズは0以上である必要があります"),
  mimeType: z.string().min(1, "MIMEタイプは必須です"),
  storagePath: z.string().min(1, "ストレージパスは必須です"), // OPFSでのパス
  thumbnailPath: z.string().optional(), // サムネイル画像のOPFSパス
  metadata: z
    .object({
      width: z.number().optional(),
      height: z.number().optional(),
      duration: z.number().optional(), // 動画の場合
    })
    .optional(),
});

// URLコンテンツの詳細情報
export const UrlContentSchema = z.object({
  url: z.string().url("有効なURLを入力してください"),
  title: z.string().optional(), // URLから取得したタイトル
  description: z.string().optional(), // URLから取得した説明
  thumbnail: z.string().optional(), // サムネイルURL
});

// リッチテキストコンテンツの詳細情報
export const RichTextContentSchema = z.object({
  content: z.string().min(1, "テキストコンテンツは必須です"),
  writingMode: z.enum(["horizontal", "vertical"], "書字方向を選択してください"),
  fontFamily: z.string().min(1, "フォントファミリーは必須です"),
  textAlign: z.enum(["start", "center", "end"], "テキスト整列を選択してください"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "有効な色コードを入力してください"),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "有効な背景色コードを入力してください"),
  fontSize: z.number().min(8).max(200).default(16), // フォントサイズ
  scrollType: z.enum(["none", "horizontal", "vertical"]).default("none"), // スクロールタイプ
  scrollSpeed: z.number().min(1).max(10).default(3), // スクロール速度（1-10）
});

// コンテンツアイテムのスキーマ
export const ContentItemSchema = z.object({
  id: z.string().min(1, "IDは必須です"),
  name: z.string().min(1, "名前は必須です"),
  type: ContentTypeSchema,
  // ファイルの場合はfileInfo、URLの場合はurlInfo、リッチテキストの場合はrichTextInfo
  fileInfo: FileContentSchema.optional(),
  urlInfo: UrlContentSchema.optional(),
  richTextInfo: RichTextContentSchema.optional(),
  tags: z.array(z.string()).default([]), // タグ
  createdAt: z.string().datetime("無効な作成日時です"),
  updatedAt: z.string().datetime("無効な更新日時です").optional(),
});

// コンテンツインデックス（一覧表示用）
export const ContentIndexSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: ContentTypeSchema,
  size: z.number().optional(), // ファイルの場合のみ
  url: z.string().optional(), // URLの場合のみ
  tags: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

export const ContentsIndexSchema = z.array(ContentIndexSchema);

// 型エクスポート
export type ContentType = z.infer<typeof ContentTypeSchema>;
export type FileContent = z.infer<typeof FileContentSchema>;
export type UrlContent = z.infer<typeof UrlContentSchema>;
export type RichTextContent = z.infer<typeof RichTextContentSchema>;
export type ContentItem = z.infer<typeof ContentItemSchema>;
export type ContentIndex = z.infer<typeof ContentIndexSchema>;

// ファイルタイプからコンテンツタイプを判定するヘルパー
export const getContentTypeFromMimeType = (mimeType: string): ContentType => {
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType.startsWith("text/")) {
    return "text";
  }
  // デフォルトはテキストとして扱う
  return "text";
};

// 一般的なファイル形式の受け入れ可能なMIMEタイプ
export const ACCEPTED_MIME_TYPES = {
  video: ["video/mp4", "video/webm", "video/avi", "video/mov", "video/wmv", "video/flv", "video/mkv"],
  image: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/bmp"],
  text: [
    "text/plain",
    "text/html",
    "text/css",
    "text/javascript",
    "text/json",
    "application/json",
    "text/xml",
    "application/xml",
  ],
} as const;

// YouTubeのURL判定
export const isYouTubeUrl = (url: string): boolean => {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/;
  return youtubeRegex.test(url);
};

export const extractYouTubeVideoId = (url: string): string | null => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  return match ? match[1] : null;
};

// 利用可能なフォントファミリー
export const FONT_FAMILIES = [
  { value: "Inter, sans-serif", label: "Inter（デフォルト）" },
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "Helvetica, Arial, sans-serif", label: "Helvetica" },
  { value: "Times, serif", label: "Times" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "Courier, monospace", label: "Courier" },
  { value: "Monaco, monospace", label: "Monaco" },
  { value: "Hiragino Sans, sans-serif", label: "ヒラギノ角ゴ" },
  { value: "Yu Gothic, sans-serif", label: "游ゴシック" },
  { value: "Meiryo, sans-serif", label: "メイリオ" },
  { value: "MS Gothic, monospace", label: "ＭＳ ゴシック" },
] as const;
