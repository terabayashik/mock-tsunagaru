import { ActionIcon, Alert, Badge, Box, Button, Group, LoadingOverlay, Table, Text } from "@mantine/core";
import type { FileWithPath } from "@mantine/dropzone";
import { modals } from "@mantine/modals";
import {
  IconBrandYoutube,
  IconEdit,
  IconExclamationCircle,
  IconEye,
  IconFile,
  IconFileText,
  IconLayoutGrid,
  IconLink,
  IconList,
  IconPhoto,
  IconPlus,
  IconTrash,
  IconVideo,
} from "@tabler/icons-react";
import { useAtom } from "jotai";
import { useEffect } from "react";
import { ContentFilters } from "~/components/content/ContentFilters";
import { ContentGridView } from "~/components/content/ContentGridView";
import { ContentHoverCard } from "~/components/content/ContentHoverCard";
import { ContentAddModal } from "~/components/modals/ContentAddModal";
import { ContentEditModal } from "~/components/modals/ContentEditModal";
import { ContentPreviewModal } from "~/components/modals/ContentPreviewModal";
import { useContent } from "~/hooks/useContent";
import {
  contentActionsAtom,
  contentAddModalAtom,
  contentEditModalAtom,
  contentModalActionsAtom,
  contentsErrorAtom,
  contentsLoadingAtom,
  contentViewModeAtom,
  filteredContentsAtom,
} from "~/states/content";
import { contentPreviewModalAtom, modalActionsAtom } from "~/states/modal";
import type { ContentType, RichTextContent } from "~/types/content";
import { logger } from "~/utils/logger";

export default function ContentsPage() {
  // コンテンツ関連の状態
  const [contents] = useAtom(filteredContentsAtom);
  const [contentsLoading] = useAtom(contentsLoadingAtom);
  const [contentsError] = useAtom(contentsErrorAtom);
  const [contentViewMode, setContentViewMode] = useAtom(contentViewModeAtom);
  const [contentAddModalOpened] = useAtom(contentAddModalAtom);
  const [contentEditModal] = useAtom(contentEditModalAtom);
  const [, contentDispatch] = useAtom(contentActionsAtom);
  const [, contentModalDispatch] = useAtom(contentModalActionsAtom);
  const [contentPreviewModal] = useAtom(contentPreviewModalAtom);
  const [, modalDispatch] = useAtom(modalActionsAtom);

  const {
    getContentsIndex,
    deleteContent,
    createFileContent,
    createUrlContent,
    createRichTextContent,
    updateContent,
    getContentById,
  } = useContent();

  // コンテンツ一覧を読み込み
  useEffect(() => {
    const loadContents = async () => {
      contentDispatch({ type: "SET_LOADING", loading: true });
      contentDispatch({ type: "SET_ERROR", error: null });

      try {
        const contentsData = await getContentsIndex();
        contentDispatch({ type: "SET_CONTENTS", contents: contentsData });
      } catch (error) {
        contentDispatch({
          type: "SET_ERROR",
          error: error instanceof Error ? error.message : "不明なエラーが発生しました",
        });
      } finally {
        contentDispatch({ type: "SET_LOADING", loading: false });
      }
    };

    loadContents();
  }, [getContentsIndex, contentDispatch]);

  // コンテンツ関連のハンドラー
  const handleContentDelete = async (id: string) => {
    modals.openConfirmModal({
      title: "コンテンツを削除",
      children: <Text size="sm">このコンテンツを削除しますか？この操作は元に戻せません。</Text>,
      labels: { confirm: "削除", cancel: "キャンセル" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteContent(id);
          contentDispatch({ type: "REMOVE_CONTENT", id });
        } catch (error) {
          contentDispatch({ type: "SET_ERROR", error: error instanceof Error ? error.message : "削除に失敗しました" });
        }
      },
    });
  };

  const handleContentAdd = () => {
    contentModalDispatch({ type: "OPEN_CONTENT_ADD" });
  };

  const handleContentClick = (contentId: string, contentType: ContentType) => {
    // 動画と画像のみプレビューモーダルを開く
    if (contentType === "video" || contentType === "image" || contentType === "youtube") {
      modalDispatch({ type: "OPEN_CONTENT_PREVIEW", contentId });
    }
  };

  const handleFileUploadSubmit = async (files: FileWithPath[], names?: string[]) => {
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const name = names?.[i];
        const newContent = await createFileContent(file, name);

        // インデックス用のデータに変換
        const contentIndex = {
          id: newContent.id,
          name: newContent.name,
          type: newContent.type,
          size: newContent.fileInfo?.size,
          tags: newContent.tags,
          createdAt: newContent.createdAt,
          updatedAt: newContent.updatedAt,
        };

        contentDispatch({ type: "ADD_CONTENT", content: contentIndex });
      }
    } catch (error) {
      contentDispatch({
        type: "SET_ERROR",
        error: error instanceof Error ? error.message : "ファイルのアップロードに失敗しました",
      });
      throw error;
    }
  };

  const handleUrlContentSubmit = async (data: { url: string; name?: string; title?: string; description?: string }) => {
    try {
      const newContent = await createUrlContent(data.url, data.name, data.title, data.description);

      // インデックス用のデータに変換
      const contentIndex = {
        id: newContent.id,
        name: newContent.name,
        type: newContent.type,
        url: newContent.urlInfo?.url,
        tags: newContent.tags,
        createdAt: newContent.createdAt,
        updatedAt: newContent.updatedAt,
      };

      contentDispatch({ type: "ADD_CONTENT", content: contentIndex });
    } catch (error) {
      contentDispatch({
        type: "SET_ERROR",
        error: error instanceof Error ? error.message : "URLコンテンツの作成に失敗しました",
      });
      throw error;
    }
  };

  const handleRichTextContentSubmit = async (data: { name: string; richTextInfo: RichTextContent }) => {
    try {
      const newContent = await createRichTextContent(data.name, data.richTextInfo);

      // インデックス形式に変換
      const contentIndex = {
        id: newContent.id,
        name: newContent.name,
        type: newContent.type,
        tags: newContent.tags,
        createdAt: newContent.createdAt,
        updatedAt: newContent.updatedAt,
      };

      contentDispatch({ type: "ADD_CONTENT", content: contentIndex });
    } catch (error) {
      contentDispatch({
        type: "SET_ERROR",
        error: error instanceof Error ? error.message : "リッチテキストコンテンツの作成に失敗しました",
      });
      throw error;
    }
  };

  const handleContentAddModalClose = () => {
    contentModalDispatch({ type: "CLOSE_CONTENT_ADD" });
  };

  const handleContentEditSubmit = async (data: {
    id: string;
    name: string;
    tags: string[];
    richTextInfo?: RichTextContent;
    urlInfo?: { title?: string; description?: string };
  }) => {
    try {
      // 更新データを構築
      const updateData: Parameters<typeof updateContent>[1] = {
        name: data.name,
        tags: data.tags,
        updatedAt: new Date().toISOString(),
      };

      // コンテンツタイプに応じて追加情報を設定
      if (data.richTextInfo) {
        updateData.richTextInfo = data.richTextInfo;
      }
      if (data.urlInfo) {
        // 既存のurlInfo取得のためコンテンツを再取得
        const existingContent = await getContentById(data.id);
        if (existingContent?.urlInfo) {
          updateData.urlInfo = {
            ...existingContent.urlInfo,
            ...data.urlInfo,
          };
        }
      }

      const updatedContent = await updateContent(data.id, updateData);

      // インデックス形式に変換して状態を更新
      const contentIndex = {
        id: updatedContent.id,
        name: updatedContent.name,
        type: updatedContent.type,
        size: updatedContent.fileInfo?.size,
        url: updatedContent.urlInfo?.url,
        tags: updatedContent.tags,
        createdAt: updatedContent.createdAt,
        updatedAt: updatedContent.updatedAt,
      };

      contentDispatch({ type: "UPDATE_CONTENT", id: data.id, content: contentIndex });
    } catch (error) {
      logger.error("Contents", "Content edit failed", error);
      contentDispatch({ type: "SET_ERROR", error: `コンテンツの編集に失敗しました: ${error}` });
    }
  };

  const handleContentEditModalClose = () => {
    contentModalDispatch({ type: "CLOSE_CONTENT_EDIT" });
  };

  const getContentTypeIcon = (type: ContentType) => {
    switch (type) {
      case "video":
        return <IconVideo size={16} />;
      case "image":
        return <IconPhoto size={16} />;
      case "text":
        return <IconFileText size={16} />;
      case "rich-text":
        return <IconFileText size={16} />;
      case "youtube":
        return <IconBrandYoutube size={16} />;
      case "url":
        return <IconLink size={16} />;
      default:
        return <IconFile size={16} />;
    }
  };

  const getContentTypeBadge = (type: ContentType) => {
    const colors: Record<ContentType, string> = {
      video: "blue",
      image: "green",
      text: "orange",
      "rich-text": "teal",
      youtube: "red",
      url: "purple",
    };

    const labels: Record<ContentType, string> = {
      video: "動画",
      image: "画像",
      text: "テキスト",
      "rich-text": "リッチテキスト",
      youtube: "YouTube",
      url: "URL",
    };

    return (
      <Badge color={colors[type]} variant="light" leftSection={getContentTypeIcon(type)}>
        {labels[type]}
      </Badge>
    );
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "";
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <Box pos="relative">
      <LoadingOverlay visible={contentsLoading} />

      {contentsError && !contentsError.includes("Failed to read JSON") && (
        <Alert icon={<IconExclamationCircle size={16} />} color="red" mb="md">
          {contentsError}
        </Alert>
      )}

      <Group justify="space-between" mb="md">
        <ContentFilters />
        <Group gap="sm">
          {/* ビュー切り替えボタン */}
          <Button.Group>
            <Button
              variant={contentViewMode === "table" ? "filled" : "default"}
              color="blue"
              onClick={() => setContentViewMode("table")}
              aria-label="テーブルビュー"
            >
              <IconList size={18} />
            </Button>
            <Button
              variant={contentViewMode === "grid" ? "filled" : "default"}
              color="blue"
              onClick={() => setContentViewMode("grid")}
              aria-label="グリッドビュー"
            >
              <IconLayoutGrid size={18} />
            </Button>
          </Button.Group>

          {/* コンテンツ追加ボタン */}
          <Button leftSection={<IconPlus size={16} />} onClick={handleContentAdd}>
            コンテンツを追加
          </Button>
        </Group>
      </Group>

      {/* ビューモードに応じた表示 */}
      {contentViewMode === "table" ? (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: "60px" }}>編集</Table.Th>
              <Table.Th style={{ width: "40px" }} />
              <Table.Th>種別</Table.Th>
              <Table.Th>名前</Table.Th>
              <Table.Th>サイズ/URL</Table.Th>
              <Table.Th>作成日時</Table.Th>
              <Table.Th style={{ width: "60px" }}>操作</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {contents.length === 0 && !contentsLoading ? (
              <Table.Tr>
                <Table.Td colSpan={7} ta="center" c="dimmed">
                  コンテンツがありません
                </Table.Td>
              </Table.Tr>
            ) : (
              contents.map((content) => {
                const isPreviewable =
                  content.type === "video" || content.type === "image" || content.type === "youtube";
                return (
                  <Table.Tr
                    key={content.id}
                    style={{
                      cursor: isPreviewable ? "pointer" : "default",
                    }}
                    onClick={() => handleContentClick(content.id, content.type)}
                  >
                    <Table.Td>
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          contentModalDispatch({ type: "OPEN_CONTENT_EDIT", content });
                        }}
                        aria-label="編集"
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                    </Table.Td>
                    <Table.Td>
                      {isPreviewable && (
                        <ContentHoverCard content={content}>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                            aria-label="プレビュー"
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                        </ContentHoverCard>
                      )}
                    </Table.Td>
                    <Table.Td>{getContentTypeBadge(content.type)}</Table.Td>
                    <Table.Td>
                      <Text fw={500}>{content.name}</Text>
                      {content.tags.length > 0 && (
                        <Group gap={4} mt={2}>
                          {content.tags.map((tag) => (
                            <Badge key={tag} size="xs" variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </Group>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {content.size ? (
                        <Text size="sm">{formatFileSize(content.size)}</Text>
                      ) : content.url ? (
                        <Text size="sm" maw={200} truncate>
                          {content.url}
                        </Text>
                      ) : (
                        <Text size="sm" c="dimmed">
                          -
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{new Date(content.createdAt).toLocaleString("ja-JP")}</Text>
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContentDelete(content.id);
                        }}
                        aria-label="削除"
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                );
              })
            )}
          </Table.Tbody>
        </Table>
      ) : (
        <ContentGridView
          contents={contents}
          loading={contentsLoading}
          onContentClick={(content) => {
            handleContentClick(content.id, content.type);
          }}
          onContentEdit={(content) => {
            contentModalDispatch({ type: "OPEN_CONTENT_EDIT", content });
          }}
          onContentDelete={(content) => {
            handleContentDelete(content.id);
          }}
        />
      )}

      <ContentAddModal
        opened={contentAddModalOpened}
        onClose={handleContentAddModalClose}
        onFileSubmit={handleFileUploadSubmit}
        onUrlSubmit={handleUrlContentSubmit}
        onRichTextSubmit={handleRichTextContentSubmit}
      />

      <ContentPreviewModal
        opened={contentPreviewModal.opened}
        onClose={() => modalDispatch({ type: "CLOSE_CONTENT_PREVIEW" })}
        contentId={contentPreviewModal.contentId}
        allContents={contents}
        onContentDeleted={() => {
          // コンテンツ一覧を再読み込み
          const loadContents = async () => {
            try {
              const contentsData = await getContentsIndex();
              contentDispatch({ type: "SET_CONTENTS", contents: contentsData });
            } catch (error) {
              contentDispatch({
                type: "SET_ERROR",
                error: error instanceof Error ? error.message : "不明なエラーが発生しました",
              });
            }
          };
          loadContents();
        }}
        onContentUpdated={() => {
          // コンテンツ一覧を再読み込み
          const loadContents = async () => {
            try {
              const contentsData = await getContentsIndex();
              contentDispatch({ type: "SET_CONTENTS", contents: contentsData });
            } catch (error) {
              contentDispatch({
                type: "SET_ERROR",
                error: error instanceof Error ? error.message : "不明なエラーが発生しました",
              });
            }
          };
          loadContents();
        }}
        onContentChange={(newContentId) => {
          modalDispatch({ type: "OPEN_CONTENT_PREVIEW", contentId: newContentId });
        }}
      />

      {contentEditModal.content && (
        <ContentEditModal
          opened={contentEditModal.opened}
          onClose={handleContentEditModalClose}
          content={contentEditModal.content}
          onSubmit={handleContentEditSubmit}
        />
      )}
    </Box>
  );
}
