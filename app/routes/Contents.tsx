import { ActionIcon, Alert, Badge, Box, Button, Group, LoadingOverlay, Menu, Table, Text } from "@mantine/core";
import type { FileWithPath } from "@mantine/dropzone";
import {
  IconBrandYoutube,
  IconCloudUpload,
  IconExclamationCircle,
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
import { ContentFilters } from "~/components/ContentFilters";
import { ContentGridView } from "~/components/ContentGridView";
import { FileUploadModal } from "~/components/FileUploadModal";
import { UrlContentModal } from "~/components/UrlContentModal";
import { useContent } from "~/hooks/useContent";
import type { ContentType } from "~/schemas/content";
import {
  contentActionsAtom,
  contentModalActionsAtom,
  contentsErrorAtom,
  contentsLoadingAtom,
  contentViewModeAtom,
  fileUploadModalAtom,
  filteredContentsAtom,
  urlContentModalAtom,
} from "~/states/content";

export default function ContentsPage() {
  // コンテンツ関連の状態
  const [contents] = useAtom(filteredContentsAtom);
  const [contentsLoading] = useAtom(contentsLoadingAtom);
  const [contentsError] = useAtom(contentsErrorAtom);
  const [contentViewMode, setContentViewMode] = useAtom(contentViewModeAtom);
  const [fileUploadModalOpened] = useAtom(fileUploadModalAtom);
  const [urlContentModalOpened] = useAtom(urlContentModalAtom);
  const [, contentDispatch] = useAtom(contentActionsAtom);
  const [, contentModalDispatch] = useAtom(contentModalActionsAtom);

  const { getContentsIndex, deleteContent, createFileContent, createUrlContent } = useContent();

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
    if (!confirm("このコンテンツを削除しますか？")) {
      return;
    }

    try {
      await deleteContent(id);
      contentDispatch({ type: "REMOVE_CONTENT", id });
    } catch (error) {
      contentDispatch({ type: "SET_ERROR", error: error instanceof Error ? error.message : "削除に失敗しました" });
    }
  };

  const handleFileUpload = () => {
    contentModalDispatch({ type: "OPEN_FILE_UPLOAD" });
  };

  const handleUrlAdd = () => {
    contentModalDispatch({ type: "OPEN_URL_CONTENT" });
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

  const handleFileUploadModalClose = () => {
    contentModalDispatch({ type: "CLOSE_FILE_UPLOAD" });
  };

  const handleUrlContentModalClose = () => {
    contentModalDispatch({ type: "CLOSE_URL_CONTENT" });
  };

  const getContentTypeIcon = (type: ContentType) => {
    switch (type) {
      case "video":
        return <IconVideo size={16} />;
      case "image":
        return <IconPhoto size={16} />;
      case "text":
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
      youtube: "red",
      url: "purple",
    };

    const labels: Record<ContentType, string> = {
      video: "動画",
      image: "画像",
      text: "テキスト",
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
          <Group gap={0}>
            <ActionIcon
              variant={contentViewMode === "table" ? "filled" : "subtle"}
              color="blue"
              size="lg"
              onClick={() => setContentViewMode("table")}
              aria-label="テーブルビュー"
            >
              <IconList size={18} />
            </ActionIcon>
            <ActionIcon
              variant={contentViewMode === "grid" ? "filled" : "subtle"}
              color="blue"
              size="lg"
              onClick={() => setContentViewMode("grid")}
              aria-label="グリッドビュー"
            >
              <IconLayoutGrid size={18} />
            </ActionIcon>
          </Group>

          {/* コンテンツ追加メニュー */}
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <Button leftSection={<IconPlus size={16} />}>コンテンツを追加</Button>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Item leftSection={<IconCloudUpload size={14} />} onClick={handleFileUpload}>
                ファイルをアップロード
              </Menu.Item>
              <Menu.Item leftSection={<IconLink size={14} />} onClick={handleUrlAdd}>
                URLを追加
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      {/* ビューモードに応じた表示 */}
      {contentViewMode === "table" ? (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>種別</Table.Th>
              <Table.Th>名前</Table.Th>
              <Table.Th>サイズ/URL</Table.Th>
              <Table.Th>作成日時</Table.Th>
              <Table.Th>操作</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {contents.length === 0 && !contentsLoading ? (
              <Table.Tr>
                <Table.Td colSpan={5} ta="center" c="dimmed">
                  コンテンツがありません
                </Table.Td>
              </Table.Tr>
            ) : (
              contents.map((content) => (
                <Table.Tr key={content.id}>
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
                      <Text
                        size="sm"
                        style={{
                          maxWidth: 200,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
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
                      onClick={() => handleContentDelete(content.id)}
                      aria-label="削除"
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      ) : (
        <ContentGridView
          contents={contents}
          loading={contentsLoading}
          onContentClick={(content) => {
            // コンテンツクリック時の処理
            if (content.type === "youtube" || content.type === "url") {
              if (content.url) {
                window.open(content.url, "_blank", "noopener,noreferrer");
              }
            }
            // 他のコンテンツタイプについては後で実装
          }}
        />
      )}

      <FileUploadModal
        opened={fileUploadModalOpened}
        onClose={handleFileUploadModalClose}
        onSubmit={handleFileUploadSubmit}
      />

      <UrlContentModal
        opened={urlContentModalOpened}
        onClose={handleUrlContentModalClose}
        onSubmit={handleUrlContentSubmit}
      />
    </Box>
  );
}
