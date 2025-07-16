import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Divider,
  Group,
  List,
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  IconChevronLeft,
  IconChevronRight,
  IconEdit,
  IconExclamationCircle,
  IconFile,
  IconLink,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useContent } from "~/hooks/useContent";
import type { ContentIndex, ContentItem } from "~/types/content";
import { OPFSManager } from "~/utils/storage/opfs";

interface ContentPreviewModalProps {
  opened: boolean;
  onClose: () => void;
  contentId: string | null;
  allContents?: ContentIndex[];
  onContentDeleted?: () => void;
  onContentUpdated?: () => void;
  onContentChange?: (contentId: string) => void;
}

export const ContentPreviewModal = ({
  opened,
  onClose,
  contentId,
  allContents = [],
  onContentDeleted,
  onContentUpdated,
  onContentChange,
}: ContentPreviewModalProps) => {
  const [content, setContent] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    url: "",
    title: "",
    description: "",
    textContent: "",
  });
  const { getContentById, updateContent, deleteContent, deleteContentForced, checkContentUsageStatus } = useContent();

  useEffect(() => {
    if (!opened || !contentId) {
      setContent(null);
      setPreviewUrl(null);
      return;
    }

    const loadContent = async () => {
      setLoading(true);
      try {
        const contentData = await getContentById(contentId);
        setContent(contentData);

        // 編集フォームの初期値設定
        if (contentData) {
          setEditForm({
            name: contentData.name,
            url: contentData.urlInfo?.url || "",
            title: contentData.urlInfo?.title || "",
            description: contentData.urlInfo?.description || "",
            textContent: contentData.textInfo?.content || "",
          });
        }

        // プレビューURL生成
        if (contentData?.type === "image" || contentData?.type === "video") {
          if (contentData.fileInfo?.storagePath) {
            try {
              // OPFSManagerを使用してファイルを読み込み
              const opfs = OPFSManager.getInstance();
              const fileData = await opfs.readFile(contentData.fileInfo.storagePath);
              if (fileData) {
                const blob = new Blob([fileData], { type: contentData.fileInfo.mimeType });
                const url = URL.createObjectURL(blob);
                setPreviewUrl(url);
              }
            } catch (fileError) {
              console.error("Failed to read file from OPFS:", fileError);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load content:", error);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [opened, contentId, getContentById]);

  // プレビューURLのクリーンアップ
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleClose = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    onClose();
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <Box style={{ height: "400px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Text>読み込み中...</Text>
        </Box>
      );
    }

    if (!content) {
      return (
        <Box style={{ height: "400px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Text>コンテンツが見つかりません</Text>
        </Box>
      );
    }

    // 画像プレビュー
    if (content.type === "image" && previewUrl) {
      return (
        <Box style={{ textAlign: "center", maxHeight: "70vh", overflow: "hidden" }}>
          <img
            src={previewUrl}
            alt={content.name}
            style={{
              maxWidth: "100%",
              maxHeight: "70vh",
              objectFit: "contain",
              borderRadius: "8px",
            }}
          />
        </Box>
      );
    }

    // 動画プレビュー
    if (content.type === "video" && previewUrl) {
      return (
        <Box style={{ textAlign: "center", maxHeight: "70vh" }}>
          <video
            src={previewUrl}
            controls
            autoPlay
            style={{
              maxWidth: "100%",
              maxHeight: "70vh",
              borderRadius: "8px",
            }}
          >
            <track kind="captions" />
          </video>
        </Box>
      );
    }

    // YouTubeプレビュー
    if (content.type === "youtube" && content.urlInfo?.url) {
      const videoId = extractYouTubeVideoId(content.urlInfo.url);
      if (videoId) {
        return (
          <Box ta="center">
            <iframe
              width="100%"
              height="400"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
              title={content.name}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ borderRadius: "8px" }}
            />
          </Box>
        );
      }
    }

    // テキストプレビュー
    if (content.type === "text" && content.textInfo) {
      const {
        content: textContent,
        writingMode,
        fontFamily,
        textAlign,
        color,
        backgroundColor,
        fontSize,
        scrollType = "none",
        scrollSpeed = 3,
      } = content.textInfo;

      // テキストの長さに応じて適切な幅を計算
      const singleLineText = textContent.replace(/\n/g, " ");
      const textLength = singleLineText.length;
      const estimatedWidth = Math.max(400, Math.min(textLength * fontSize * 0.6, 1200));

      // スクロールアニメーションのCSS
      const scrollAnimation =
        scrollType !== "none"
          ? `@keyframes textScrollModal {
              0% { transform: translate${scrollType === "horizontal" ? "X" : "Y"}(100%); }
              100% { transform: translate${scrollType === "horizontal" ? "X" : "Y"}(calc(-100% - ${estimatedWidth}px)); }
            }`
          : "";

      return (
        <Box
          style={{
            minHeight: "400px",
            backgroundColor,
            border: "1px solid #e5e5e5",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: textAlign === "center" ? "center" : textAlign === "end" ? "flex-end" : "flex-start",
            overflow: "hidden",
            position: "relative",
            width: "100%",
            maxWidth: "100%",
          }}
        >
          <style>{scrollAnimation}</style>
          <div
            style={{
              fontFamily,
              fontSize: `${fontSize}px`,
              color,
              writingMode: writingMode === "vertical" ? "vertical-rl" : "horizontal-tb",
              whiteSpace: "nowrap",
              padding: "20px",
              minWidth: `${estimatedWidth}px`,
              width: "max-content",
              ...(scrollType !== "none" ? { animation: `textScrollModal ${11 - scrollSpeed}s linear infinite` } : {}),
            }}
          >
            {singleLineText}
          </div>
        </Box>
      );
    }

    // その他のタイプ（テキスト、URL等）
    return (
      <Box style={{ height: "400px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Stack align="center" gap="md">
          {content.type === "url" ? <IconLink size={48} /> : <IconFile size={48} />}
          <Text size="lg" fw={500}>
            {content.name}
          </Text>
          <Text size="sm" c="dimmed">
            このコンテンツタイプはプレビューできません
          </Text>
          {content.urlInfo?.url && (
            <Text size="sm" style={{ wordBreak: "break-all" }}>
              {content.urlInfo.url}
            </Text>
          )}
        </Stack>
      </Box>
    );
  };

  const getModalTitle = () => {
    if (!content) return "コンテンツプレビュー";
    return content.name;
  };

  const getCurrentContentIndex = () => {
    if (!contentId || !allContents.length) return -1;
    return allContents.findIndex((item) => item.id === contentId);
  };

  const canNavigatePrev = () => {
    const currentIndex = getCurrentContentIndex();
    return currentIndex > 0;
  };

  const canNavigateNext = () => {
    const currentIndex = getCurrentContentIndex();
    return currentIndex >= 0 && currentIndex < allContents.length - 1;
  };

  const handleNavigatePrev = () => {
    const currentIndex = getCurrentContentIndex();
    if (currentIndex > 0) {
      const prevContent = allContents[currentIndex - 1];
      onContentChange?.(prevContent.id);
    }
  };

  const handleNavigateNext = () => {
    const currentIndex = getCurrentContentIndex();
    if (currentIndex >= 0 && currentIndex < allContents.length - 1) {
      const nextContent = allContents[currentIndex + 1];
      onContentChange?.(nextContent.id);
    }
  };

  const handleEditStart = () => {
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    if (content) {
      setEditForm({
        name: content.name,
        url: content.urlInfo?.url || "",
        title: content.urlInfo?.title || "",
        description: content.urlInfo?.description || "",
        textContent: content.textInfo?.content || "",
      });
    }
  };

  const handleEditSave = async () => {
    if (!content) return;

    try {
      const updateData: Partial<ContentItem> = {
        name: editForm.name,
      };

      // URL系コンテンツの場合はurlInfoも更新
      if (content.type === "youtube" || content.type === "url") {
        updateData.urlInfo = {
          url: editForm.url,
          title: editForm.title || undefined,
          description: editForm.description || undefined,
        };
      }

      // テキストコンテンツの場合はtextInfoも更新
      if (content.type === "text" && content.textInfo) {
        updateData.textInfo = {
          ...content.textInfo,
          content: editForm.textContent,
        };
      }

      await updateContent(content.id, updateData);
      setIsEditing(false);
      onContentUpdated?.();

      // コンテンツを再読み込み
      const updatedContent = await getContentById(content.id);
      setContent(updatedContent);
    } catch (error) {
      console.error("Failed to update content:", error);
    }
  };

  const handleDelete = async () => {
    if (!content) return;

    try {
      // 使用状況をチェック
      const usageInfo = await checkContentUsageStatus(content.id);

      if (usageInfo.isUsed) {
        // 使用中の場合は強制削除の確認を表示
        modals.openConfirmModal({
          title: "コンテンツを削除",
          children: (
            <Box>
              <Text size="sm" mb="md">
                「{content.name}」を削除しますか？この操作は元に戻せません。
              </Text>
              <Text size="sm" mb="sm">
                このコンテンツは以下のプレイリストで使用されています：
              </Text>
              <List size="sm" mb="md">
                {usageInfo.playlists.map((playlist) => (
                  <List.Item key={playlist.id}>
                    <Text size="sm" style={{ fontWeight: 500 }}>
                      {playlist.name} (デバイス: {playlist.device})
                    </Text>
                  </List.Item>
                ))}
              </List>
              <Alert icon={<IconExclamationCircle size={16} />} color="orange" mb="md">
                削除すると、これらのプレイリストからも自動的に削除されます。
              </Alert>
            </Box>
          ),
          labels: { confirm: "削除", cancel: "キャンセル" },
          confirmProps: { color: "red" },
          onConfirm: async () => {
            try {
              await deleteContentForced(content.id);
              onContentDeleted?.();
              onClose();
            } catch (error) {
              console.error("Failed to delete content:", error);
            }
          },
        });
      } else {
        // 使用されていない場合は通常の削除確認
        modals.openConfirmModal({
          title: "コンテンツを削除",
          children: (
            <Box>
              <Text size="sm" mb="md">
                「{content.name}」を削除しますか？この操作は元に戻せません。
              </Text>
              <Alert icon={<IconExclamationCircle size={16} />} color="gray">
                このコンテンツはどのプレイリストでも使用されていません。
              </Alert>
            </Box>
          ),
          labels: { confirm: "削除", cancel: "キャンセル" },
          confirmProps: { color: "red" },
          onConfirm: async () => {
            try {
              await deleteContent(content.id);
              onContentDeleted?.();
              onClose();
            } catch (error) {
              console.error("Failed to delete content:", error);
            }
          },
        });
      }
    } catch (error) {
      console.error("Failed to check content usage:", error);
    }
  };

  const renderNavigationButtons = () => {
    if (!allContents.length || allContents.length <= 1) return null;

    const currentIndex = getCurrentContentIndex();
    const totalCount = allContents.length;

    return (
      <Group justify="space-between" align="center">
        <ActionIcon
          variant="light"
          disabled={!canNavigatePrev()}
          onClick={handleNavigatePrev}
          aria-label="前のコンテンツ"
        >
          <IconChevronLeft size={18} />
        </ActionIcon>

        <Text size="sm" c="dimmed">
          {currentIndex + 1} / {totalCount}
        </Text>

        <ActionIcon
          variant="light"
          disabled={!canNavigateNext()}
          onClick={handleNavigateNext}
          aria-label="次のコンテンツ"
        >
          <IconChevronRight size={18} />
        </ActionIcon>
      </Group>
    );
  };

  const renderEditForm = () => {
    if (!isEditing || !content) return null;

    return (
      <Stack gap="sm">
        <Text size="sm" fw={600}>
          コンテンツ情報を編集
        </Text>

        <TextInput
          label="名前"
          value={editForm.name}
          onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
          required
        />

        {(content.type === "youtube" || content.type === "url") && (
          <>
            <TextInput
              label="URL"
              value={editForm.url}
              onChange={(e) => setEditForm((prev) => ({ ...prev, url: e.target.value }))}
              required
            />
            <TextInput
              label="タイトル"
              value={editForm.title}
              onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
            />
            <Textarea
              label="説明"
              value={editForm.description}
              onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </>
        )}

        {content.type === "text" && (
          <Textarea
            label="テキストコンテンツ"
            value={editForm.textContent}
            onChange={(e) => setEditForm((prev) => ({ ...prev, textContent: e.target.value }))}
            rows={6}
            placeholder="表示したいテキストを入力してください"
            required
          />
        )}

        <Group gap="sm" mt="sm">
          <Button size="sm" onClick={handleEditSave}>
            保存
          </Button>
          <Button size="sm" variant="light" onClick={handleEditCancel}>
            キャンセル
          </Button>
        </Group>
      </Stack>
    );
  };

  const renderActionButtons = () => {
    if (isEditing) return null;

    return (
      <Group justify="space-between">
        <Button variant="light" leftSection={<IconEdit size={16} />} onClick={handleEditStart}>
          編集
        </Button>

        <Button color="red" variant="light" leftSection={<IconTrash size={16} />} onClick={handleDelete}>
          削除
        </Button>
      </Group>
    );
  };

  const getContentInfo = () => {
    if (!content) return null;

    return (
      <Group gap="xs" mt="sm">
        <Text size="sm" c="dimmed">
          タイプ: {getContentTypeLabel(content.type)}
        </Text>
        {content.fileInfo?.size && (
          <Text size="sm" c="dimmed">
            サイズ: {formatFileSize(content.fileInfo.size)}
          </Text>
        )}
        {content.fileInfo?.metadata?.width && content.fileInfo?.metadata?.height && (
          <Text size="sm" c="dimmed">
            解像度: {content.fileInfo.metadata.width}×{content.fileInfo.metadata.height}
          </Text>
        )}
        {content.fileInfo?.metadata?.duration && (
          <Text size="sm" c="dimmed">
            再生時間: {formatDuration(content.fileInfo.metadata.duration)}
          </Text>
        )}
      </Group>
    );
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={getModalTitle()}
      centered
      size="xl"
      styles={{
        content: {
          maxWidth: "90vw",
        },
      }}
    >
      <Stack gap="md">
        {/* ナビゲーションボタン */}
        {renderNavigationButtons()}

        {renderPreview()}

        <Divider />

        {/* 編集フォーム */}
        {renderEditForm()}

        {/* コンテンツ情報 */}
        {!isEditing && getContentInfo()}

        {/* アクションボタン */}
        {renderActionButtons()}
      </Stack>
    </Modal>
  );
};

// ヘルパー関数
const extractYouTubeVideoId = (url: string): string | null => {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

const getContentTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    video: "動画",
    image: "画像",
    text: "テキスト",
    youtube: "YouTube",
    url: "URL",
  };
  return labels[type] || type;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
};

const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};
