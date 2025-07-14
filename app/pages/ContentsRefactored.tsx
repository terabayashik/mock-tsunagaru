import { Alert, Box, Button, Group, LoadingOverlay } from "@mantine/core";
import { IconExclamationCircle, IconLayoutGrid, IconList, IconPlus } from "@tabler/icons-react";
import { ContentFilters } from "~/components/content/ContentFilters";
import { ContentGridView } from "~/components/content/ContentGridView";
import { ContentTableView } from "~/components/content/ContentTableView";
import { ContentAddModal } from "~/components/modals/ContentAddModal";
import { ContentEditModal } from "~/components/modals/ContentEditModal";
import { ContentPreviewModal } from "~/components/modals/ContentPreviewModal";
import { useContentsPage } from "~/hooks/useContentsPage";

export default function ContentsPageRefactored() {
  const {
    // State
    contents,
    contentsLoading,
    contentsError,
    contentViewMode,
    setContentViewMode,
    contentAddModalOpened,
    contentEditModal,
    contentPreviewModal,
    contentModalDispatch,

    // Actions
    loadContents,
    deleteContentSafely,
    checkContentUsageStatus,
    handleFileUploadSubmit,
    handleUrlContentSubmit,
    handleRichTextContentSubmit,
    handleContentEditSubmit,
    handleContentClick,
    handleContentAdd,
    handleContentAddModalClose,
    handleContentEditModalClose,
    handleContentPreviewModalClose,
    handleContentChange,
  } = useContentsPage();

  const handleContentClickWrapper = (contentId: string) => {
    const content = contents.find((c) => c.id === contentId);
    if (content) {
      handleContentClick(contentId, content.type);
    }
  };

  const handleContentDelete = async (id: string, _contentName: string) => {
    await deleteContentSafely(id);
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
        <ContentTableView
          contents={contents}
          loading={contentsLoading}
          onContentClick={handleContentClickWrapper}
          onContentEdit={(content) => contentModalDispatch({ type: "OPEN_CONTENT_EDIT", content })}
          onContentDelete={handleContentDelete}
          checkContentUsageStatus={checkContentUsageStatus}
        />
      ) : (
        <ContentGridView
          contents={contents}
          loading={contentsLoading}
          onContentClick={(content) => handleContentClickWrapper(content.id)}
          onContentEdit={(content) => contentModalDispatch({ type: "OPEN_CONTENT_EDIT", content })}
          onContentDelete={(content) => handleContentDelete(content.id, content.name)}
        />
      )}

      {/* モーダル */}
      <ContentAddModal
        opened={contentAddModalOpened}
        onClose={handleContentAddModalClose}
        onFileSubmit={handleFileUploadSubmit}
        onUrlSubmit={handleUrlContentSubmit}
        onRichTextSubmit={handleRichTextContentSubmit}
      />

      <ContentPreviewModal
        opened={contentPreviewModal.opened}
        onClose={handleContentPreviewModalClose}
        contentId={contentPreviewModal.contentId}
        allContents={contents}
        onContentDeleted={loadContents}
        onContentUpdated={loadContents}
        onContentChange={handleContentChange}
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
