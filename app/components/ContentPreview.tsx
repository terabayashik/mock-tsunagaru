import { Box, Group, Image, Paper, Text, Tooltip } from "@mantine/core";
import {
  IconBrandYoutube,
  IconFile,
  IconFileText,
  IconLink,
  IconPhoto,
  IconPlayerPlay,
  IconVideo,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { useContent } from "~/hooks/useContent";
import type { ContentIndex, ContentType } from "~/schemas/content";
import { VideoThumbnailGenerator } from "~/utils/video-thumbnail";

const extractYouTubeVideoId = (url: string): string | null => {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

interface ContentPreviewProps {
  content: ContentIndex;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}

interface PreviewState {
  loading: boolean;
  previewUrl?: string;
  error?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
  };
}

export const ContentPreview = ({ content, onClick, size = "md" }: ContentPreviewProps) => {
  const [previewState, setPreviewState] = useState<PreviewState>({ loading: false });
  const { getContentById, getFileContent } = useContent();

  const sizeConfig = {
    sm: { width: 150, height: 100 },
    md: { width: 200, height: 133 },
    lg: { width: 300, height: 200 },
  };

  const { width, height } = sizeConfig[size];

  const generateVideoPreview = useCallback(async () => {
    try {
      // OPFSから動画ファイルを取得
      const contentDetail = await getContentById(content.id);
      if (!contentDetail?.fileInfo?.storagePath) {
        throw new Error("動画ファイルが見つかりません");
      }

      // OPFSからファイルデータを取得
      const fileBuffer = await getFileContent(contentDetail.fileInfo.storagePath);

      try {
        // WebCodecs APIを使用してサムネイル生成
        const generator = VideoThumbnailGenerator.getInstance();
        const blob = new Blob([fileBuffer], { type: contentDetail.fileInfo.mimeType });

        // Blobから一時的なFileオブジェクトを作成
        const file = new File([blob], contentDetail.name || "video", { type: contentDetail.fileInfo.mimeType });
        const { thumbnail, metadata } = await generator.generateThumbnail(file, {
          timestamp: 0.1, // 10%地点
          width,
          height: height - 60,
        });

        setPreviewState({
          loading: false,
          previewUrl: thumbnail,
          metadata: { duration: metadata.duration },
        });
      } catch (codecError) {
        // WebCodecs API失敗時はプレースホルダーを表示
        console.warn("WebCodecs API failed, using placeholder:", codecError);
        setPreviewState({
          loading: false,
          previewUrl:
            "data:image/svg+xml;base64," +
            btoa(`
            <svg width="${width}" height="${height - 60}" xmlns="http://www.w3.org/2000/svg">
              <rect width="100%" height="100%" fill="#228be6"/>
              <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-size="14">
                動画プレビュー
              </text>
            </svg>
          `),
          metadata: {
            duration: contentDetail.fileInfo?.size ? Math.floor(contentDetail.fileInfo.size / 1000000) * 10 : 120,
          },
        });
      }
    } catch (error) {
      setPreviewState({
        loading: false,
        error: error instanceof Error ? error.message : "動画プレビュー生成に失敗",
      });
    }
  }, [content.id, width, height, getContentById, getFileContent]);

  const generateImagePreview = useCallback(async () => {
    try {
      // OPFSから画像ファイルを取得
      const contentDetail = await getContentById(content.id);
      if (!contentDetail?.fileInfo?.storagePath) {
        throw new Error("画像ファイルが見つかりません");
      }

      // OPFSからファイルデータを取得してBlob URLを生成
      const fileBuffer = await getFileContent(contentDetail.fileInfo.storagePath);
      const blob = new Blob([fileBuffer], { type: contentDetail.fileInfo.mimeType });
      const blobUrl = URL.createObjectURL(blob);

      setPreviewState({
        loading: false,
        previewUrl: blobUrl,
      });
    } catch (error) {
      setPreviewState({
        loading: false,
        error: error instanceof Error ? error.message : "画像プレビュー生成に失敗",
      });
    }
  }, [content.id, getContentById, getFileContent]);

  const generateTextPreview = useCallback(async () => {
    try {
      // OPFSからテキストファイルを取得
      const contentDetail = await getContentById(content.id);
      if (!contentDetail?.fileInfo?.storagePath) {
        throw new Error("テキストファイルが見つかりません");
      }

      // OPFSからファイルデータを取得してテキストを読み込み
      const fileBuffer = await getFileContent(contentDetail.fileInfo.storagePath);
      const textContent = new TextDecoder("utf-8").decode(fileBuffer);
      const preview = textContent.slice(0, 100); // 最初の100文字

      setPreviewState({
        loading: false,
        previewUrl:
          "data:image/svg+xml;base64," +
          btoa(`
          <svg width="${width}" height="${height - 60}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#fd7e14"/>
            <text x="50%" y="20%" text-anchor="middle" dy=".3em" fill="white" font-size="12">
              テキストファイル
            </text>
            <text x="50%" y="40%" text-anchor="middle" dy=".3em" fill="white" font-size="8">
              ${content.name}
            </text>
            <foreignObject x="10" y="50%" width="${width - 20}" height="40%">
              <div xmlns="http://www.w3.org/1999/xhtml" style="color: white; font-size: 8px; padding: 4px; word-wrap: break-word; overflow: hidden;">
                ${preview.replace(/[<>&"']/g, (m) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[m] || m)}${textContent.length > 100 ? "..." : ""}
              </div>
            </foreignObject>
          </svg>
        `),
      });
    } catch (error) {
      setPreviewState({
        loading: false,
        error: error instanceof Error ? error.message : "テキストプレビュー生成に失敗",
      });
    }
  }, [content.id, content.name, width, height, getContentById, getFileContent]);

  const generateYouTubePreview = useCallback(async () => {
    try {
      if (!content.url) {
        throw new Error("YouTube URL が見つかりません");
      }

      // YouTube動画IDを抽出
      const videoId = extractYouTubeVideoId(content.url);
      if (videoId) {
        // YouTubeサムネイルを使用
        setPreviewState({
          loading: false,
          previewUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        });
      } else {
        throw new Error("YouTube動画IDの抽出に失敗");
      }
    } catch (_error) {
      setPreviewState({
        loading: false,
        error: "YouTubeプレビュー生成に失敗",
      });
    }
  }, [content.url]);

  const generateUrlPreview = useCallback(async () => {
    try {
      // URL用のプレースホルダープレビュー
      setPreviewState({
        loading: false,
        previewUrl:
          "data:image/svg+xml;base64," +
          btoa(`
          <svg width="${width}" height="${height - 60}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#7950f2"/>
            <text x="50%" y="30%" text-anchor="middle" dy=".3em" fill="white" font-size="12">
              Webページ
            </text>
            <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-size="10">
              ${new URL(content.url || "").hostname}
            </text>
            <text x="50%" y="70%" text-anchor="middle" dy=".3em" fill="white" font-size="8">
              クリックしてアクセス
            </text>
          </svg>
        `),
      });
    } catch (_error) {
      setPreviewState({
        loading: false,
        error: "URLプレビュー生成に失敗",
      });
    }
  }, [content.url, width, height]);

  const generatePreview = useCallback(async () => {
    setPreviewState({ loading: true });

    try {
      switch (content.type) {
        case "video":
          await generateVideoPreview();
          break;
        case "image":
          await generateImagePreview();
          break;
        case "text":
          await generateTextPreview();
          break;
        case "youtube":
          await generateYouTubePreview();
          break;
        case "url":
          await generateUrlPreview();
          break;
        default:
          setPreviewState({ loading: false, error: "Unknown content type" });
      }
    } catch (error) {
      console.error("Preview generation failed:", error);
      setPreviewState({
        loading: false,
        error: error instanceof Error ? error.message : "プレビュー生成に失敗しました",
      });
    }
  }, [
    content.type,
    generateVideoPreview,
    generateImagePreview,
    generateTextPreview,
    generateYouTubePreview,
    generateUrlPreview,
  ]);

  useEffect(() => {
    generatePreview();
  }, [generatePreview]);

  const getTypeIcon = (type: ContentType) => {
    const iconProps = { size: 16 };
    switch (type) {
      case "video":
        return <IconVideo {...iconProps} />;
      case "image":
        return <IconPhoto {...iconProps} />;
      case "text":
        return <IconFileText {...iconProps} />;
      case "youtube":
        return <IconBrandYoutube {...iconProps} />;
      case "url":
        return <IconLink {...iconProps} />;
      default:
        return <IconFile {...iconProps} />;
    }
  };

  const getTypeColor = (type: ContentType) => {
    switch (type) {
      case "video":
        return "blue";
      case "image":
        return "green";
      case "text":
        return "orange";
      case "youtube":
        return "red";
      case "url":
        return "purple";
      default:
        return "gray";
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "";
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
  };

  if (previewState.loading) {
    return (
      <Paper withBorder p="xs" style={{ width, height, cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
        <Box
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "var(--mantine-color-gray-1)",
          }}
        >
          <Text size="sm" c="dimmed">
            読み込み中...
          </Text>
        </Box>
      </Paper>
    );
  }

  if (previewState.error) {
    return (
      <Paper withBorder p="xs" style={{ width, height, cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
        <Box
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "var(--mantine-color-gray-1)",
          }}
        >
          {getTypeIcon(content.type)}
          <Text size="xs" c="dimmed" mt="xs" ta="center">
            プレビュー未対応
          </Text>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper withBorder p={0} style={{ width, cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      <Box style={{ position: "relative" }}>
        {/* プレビュー画像 */}
        <Image
          src={previewState.previewUrl}
          alt={content.name}
          width={width}
          height={height - 60} // タイトル分の高さを確保
          fit="cover"
          fallbackSrc="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEzMyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjFmM2Y0Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOWNhM2FmIiBmb250LXNpemU9IjE0Ij5ObyBQcmV2aWV3PC90ZXh0Pjwvc3ZnPg=="
        />

        {/* オーバーレイアイコン */}
        {(content.type === "video" || content.type === "youtube") && (
          <Box
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              borderRadius: "50%",
              padding: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconPlayerPlay size={24} color="white" />
          </Box>
        )}

        {/* 時間表示（動画の場合） */}
        {(content.type === "video" || content.type === "youtube") && previewState.metadata?.duration && (
          <Box
            style={{
              position: "absolute",
              bottom: "4px",
              right: "4px",
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              color: "white",
              padding: "2px 6px",
              borderRadius: "4px",
              fontSize: "11px",
            }}
          >
            {formatDuration(previewState.metadata.duration)}
          </Box>
        )}

        {/* タイプバッジ */}
        <Box
          style={{
            position: "absolute",
            top: "4px",
            left: "4px",
            backgroundColor: `var(--mantine-color-${getTypeColor(content.type)}-6)`,
            color: "white",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "10px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          {getTypeIcon(content.type)}
        </Box>
      </Box>

      {/* コンテンツ情報 */}
      <Box p="xs">
        <Tooltip label={content.name} disabled={content.name.length <= 20}>
          <Text size="sm" fw={500} lineClamp={1}>
            {content.name}
          </Text>
        </Tooltip>

        <Group justify="space-between" mt={4}>
          {content.size && (
            <Text size="xs" c="dimmed">
              {formatFileSize(content.size)}
            </Text>
          )}
          {content.url && !content.size && (
            <Text size="xs" c="dimmed" lineClamp={1} style={{ maxWidth: "120px" }}>
              {new URL(content.url).hostname}
            </Text>
          )}
          <Text size="xs" c="dimmed">
            {new Date(content.createdAt).toLocaleDateString("ja-JP")}
          </Text>
        </Group>

        {/* タグ表示 */}
        {content.tags.length > 0 && (
          <Group gap={4} mt={4}>
            {content.tags.slice(0, 2).map((tag) => (
              <Text
                key={tag}
                size="xs"
                style={{
                  backgroundColor: "var(--mantine-color-gray-1)",
                  padding: "1px 4px",
                  borderRadius: "2px",
                  color: "var(--mantine-color-gray-7)",
                }}
              >
                {tag}
              </Text>
            ))}
            {content.tags.length > 2 && (
              <Text size="xs" c="dimmed">
                +{content.tags.length - 2}
              </Text>
            )}
          </Group>
        )}
      </Box>
    </Paper>
  );
};
