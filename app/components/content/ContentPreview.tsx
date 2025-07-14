import { ActionIcon, Box, Flex, Group, Image, Paper, Text, Tooltip } from "@mantine/core";
import {
  IconBrandYoutube,
  IconEdit,
  IconFile,
  IconFileText,
  IconLink,
  IconPhoto,
  IconPlayerPlay,
  IconTrash,
  IconVideo,
} from "@tabler/icons-react";
import { memo, useCallback, useEffect, useState } from "react";
import { useContent } from "~/hooks/useContent";
import type { ContentIndex, ContentType } from "~/types/content";

// Constants
const PREVIEW_ASPECT_RATIO = 16 / 9;
const INFO_SECTION_HEIGHT = 60;
const BASE_WIDTH = 200;

const extractYouTubeVideoId = (url: string): string | null => {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return "";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
};

interface ContentPreviewProps {
  content: ContentIndex;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  aspectRatio?: number; // 幅対高さの比率 (デフォルト: 3:2)
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

export const ContentPreview = memo(
  ({ content, onClick, onEdit, onDelete, aspectRatio = PREVIEW_ASPECT_RATIO }: ContentPreviewProps) => {
    const [previewState, setPreviewState] = useState<PreviewState>({ loading: false });
    const { getThumbnailUrl } = useContent();

    // Calculate heights based on constants
    const totalHeight = Math.round(BASE_WIDTH / PREVIEW_ASPECT_RATIO) + INFO_SECTION_HEIGHT;
    const imageHeight = totalHeight - INFO_SECTION_HEIGHT;

    const generateFilePreview = useCallback(async () => {
      try {
        // 事前生成されたサムネイルを取得
        const thumbnailUrl = await getThumbnailUrl(content.id);

        if (thumbnailUrl) {
          setPreviewState({
            loading: false,
            previewUrl: thumbnailUrl,
            metadata: {}, // メタデータは必要に応じて別途取得
          });
        } else {
          // サムネイルが存在しない場合はプレースホルダー
          throw new Error("サムネイルが見つかりません");
        }
      } catch (_error) {
        // フォールバック: タイプ別プレースホルダー
        const typeLabels = {
          video: "動画",
          image: "画像",
          text: "テキスト",
        };
        const typeColors = {
          video: "#228be6",
          image: "#40c057",
          text: "#fd7e14",
        };

        const label = typeLabels[content.type as keyof typeof typeLabels] || "ファイル";
        const color = typeColors[content.type as keyof typeof typeColors] || "#6c757d";

        setPreviewState({
          loading: false,
          previewUrl:
            "data:image/svg+xml;base64," +
            btoa(`
            <svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
              <rect width="100%" height="100%" fill="${color}"/>
              <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-size="14">
                ${label}プレビュー
              </text>
            </svg>
          `),
        });
      }
    }, [content.id, content.type, getThumbnailUrl]);

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
          <svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
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
    }, [content.url]);

    const generatePreview = useCallback(async () => {
      setPreviewState({ loading: true });

      try {
        switch (content.type) {
          case "video":
          case "image":
          case "text":
            await generateFilePreview();
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
    }, [content.type, generateFilePreview, generateYouTubePreview, generateUrlPreview]);

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

    // Shared component for content info section
    const ContentInfo = () => (
      <Box p="xs" style={{ height: `${INFO_SECTION_HEIGHT}px`, overflow: "hidden" }}>
        <Tooltip label={content.name} disabled={content.name.length <= 20}>
          <Text size="sm" fw={500} lineClamp={1}>
            {content.name}
          </Text>
        </Tooltip>

        <Group justify="space-between" align="center" mt={4}>
          <Group gap="xs">
            <Text size="xs" c="dimmed">
              {new Date(content.createdAt).toLocaleDateString("ja-JP")}
            </Text>
            {content.size && (
              <Text size="xs" c="dimmed">
                {formatFileSize(content.size)}
              </Text>
            )}
            {content.url && !content.size && (
              <Text size="xs" c="dimmed" lineClamp={1} maw="80px">
                {new URL(content.url).hostname}
              </Text>
            )}
          </Group>

          <Group gap="xs" className="content-actions" style={{ opacity: 0, transition: 'opacity 0.2s ease' }}>
            {onEdit && (
              <ActionIcon
                size="xs"
                variant="subtle"
                color="blue"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                aria-label="編集"
              >
                <IconEdit size={12} />
              </ActionIcon>
            )}
            {onDelete && (
              <ActionIcon
                size="xs"
                variant="subtle"
                color="red"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                aria-label="削除"
              >
                <IconTrash size={12} />
              </ActionIcon>
            )}
          </Group>
        </Group>

        {/* タグ表示 */}
        {content.tags.length > 0 && (
          <Group gap={4} mt={2}>
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
    );

    if (previewState.loading) {
      return (
        <Paper
          withBorder
          p={0}
          w="100%"
          h={totalHeight}
          style={{
            cursor: onClick ? "pointer" : "default",
          }}
          styles={{
            root: {
              "&:hover .content-actions, &:focus-within .content-actions, &:active .content-actions": {
                opacity: 1,
              },
              "@media (hover: none)": {
                "& .content-actions": {
                  opacity: 1,
                },
              },
            },
          }}
          onClick={onClick}
        >
          <Box pos="relative">
            {/* ローディング表示 */}
            <Box
              style={{
                height: `${imageHeight}px`,
                width: "100%",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#f8f9fa",
              }}
            >
              <Text size="sm" c="dimmed">
                読み込み中...
              </Text>
            </Box>

            {/* タイプバッジ */}
            <Flex
              pos="absolute"
              top="4px"
              left="4px"
              bg={`${getTypeColor(content.type)}.6`}
              c="white"
              p="2px 6px"
              style={{ borderRadius: "4px", fontSize: "10px" }}
              align="center"
              gap="4px"
            >
              {getTypeIcon(content.type)}
            </Flex>
          </Box>

          <ContentInfo />
        </Paper>
      );
    }

    if (previewState.error) {
      return (
        <Paper
          withBorder
          p={0}
          w="100%"
          h={totalHeight}
          style={{
            cursor: onClick ? "pointer" : "default",
          }}
          styles={{
            root: {
              "&:hover .content-actions, &:focus-within .content-actions, &:active .content-actions": {
                opacity: 1,
              },
              "@media (hover: none)": {
                "& .content-actions": {
                  opacity: 1,
                },
              },
            },
          }}
          onClick={onClick}
        >
          <Box pos="relative">
            {/* プレビューエラー表示 */}
            <Box
              style={{
                height: `${imageHeight}px`,
                width: "100%",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#f8f9fa",
              }}
            >
              {getTypeIcon(content.type)}
              <Text size="xs" c="dimmed" mt="xs" ta="center">
                プレビュー未対応
              </Text>
            </Box>

            {/* タイプバッジ */}
            <Flex
              pos="absolute"
              top="4px"
              left="4px"
              bg={`${getTypeColor(content.type)}.6`}
              c="white"
              p="2px 6px"
              style={{ borderRadius: "4px", fontSize: "10px" }}
              align="center"
              gap="4px"
            >
              {getTypeIcon(content.type)}
            </Flex>
          </Box>

          <ContentInfo />
        </Paper>
      );
    }

    return (
      <Paper
        withBorder
        p={0}
        w="100%"
        style={{
          cursor: onClick ? "pointer" : "default",
          aspectRatio: aspectRatio.toString(),
        }}
        styles={{
          root: {
            "&:hover .content-actions, &:focus-within .content-actions, &:active .content-actions": {
              opacity: 1,
            },
            "@media (hover: none)": {
              "& .content-actions": {
                opacity: 1,
              },
            },
          },
        }}
        onClick={onClick}
      >
        <Box pos="relative">
          {/* プレビュー画像 */}
          <Box
            style={{
              height: imageHeight,
              width: "100%",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f8f9fa",
            }}
          >
            <Image
              src={previewState.previewUrl}
              alt={content.name}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
              fallbackSrc="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjFmM2Y0Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOWNhM2FmIiBmb250LXNpemU9IjE0Ij5ObyBQcmV2aWV3PC90ZXh0Pjwvc3ZnPg=="
            />
          </Box>

          {/* オーバーレイアイコン */}
          {(content.type === "video" || content.type === "youtube") && (
            <Flex
              pos="absolute"
              top="50%"
              left="50%"
              style={{ transform: "translate(-50%, -50%)", borderRadius: "50%" }}
              bg="rgba(0, 0, 0, 0.7)"
              p="8px"
              align="center"
              justify="center"
            >
              <IconPlayerPlay size={24} color="white" />
            </Flex>
          )}

          {/* 時間表示（動画の場合） */}
          {(content.type === "video" || content.type === "youtube") && previewState.metadata?.duration && (
            <Box
              pos="absolute"
              bottom="4px"
              right="4px"
              bg="rgba(0, 0, 0, 0.8)"
              c="white"
              p="2px 6px"
              style={{ borderRadius: "4px", fontSize: "11px" }}
            >
              {formatDuration(previewState.metadata.duration)}
            </Box>
          )}

          {/* タイプバッジ */}
          <Flex
            pos="absolute"
            top="4px"
            left="4px"
            bg={`${getTypeColor(content.type)}.6`}
            c="white"
            p="2px 6px"
            style={{ borderRadius: "4px", fontSize: "10px" }}
            align="center"
            gap="4px"
          >
            {getTypeIcon(content.type)}
          </Flex>
        </Box>

        <ContentInfo />
      </Paper>
    );
  },
);

ContentPreview.displayName = "ContentPreview";
