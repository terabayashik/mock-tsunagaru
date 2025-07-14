import { Card, LoadingOverlay, Paper, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import { IconX } from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { useContent } from "~/hooks/useContent";
import { useContentPreview } from "~/hooks/useContentPreview";
import type { ContentIndex } from "~/types/content";
import { logger } from "~/utils/logger";
import { ContentEditModal } from "../modals/ContentEditModal";
import { ContentInfo } from "./preview/ContentInfo";
import { PreviewImage } from "./preview/PreviewImage";

interface ContentPreviewRefactoredProps {
  content: ContentIndex;
  selected?: boolean;
  onSelect?: (content: ContentIndex) => void;
  imageHeight?: number;
  infoSectionHeight?: number;
}

export const ContentPreviewRefactored = ({
  content,
  selected = false,
  onSelect,
  imageHeight = 180,
  infoSectionHeight = 80,
}: ContentPreviewRefactoredProps) => {
  const navigate = useNavigate();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const { updateContent, deleteContentSafely } = useContent();
  const previewState = useContentPreview(content);

  // コンテンツクリックハンドラー
  const handleContentClick = useCallback(() => {
    if (onSelect) {
      onSelect(content);
    } else if (content.type === "url" && content.url) {
      window.open(content.url, "_blank", "noopener,noreferrer");
    } else if (content.type === "youtube" && content.url) {
      window.open(content.url, "_blank", "noopener,noreferrer");
    } else {
      navigate(`/contents/${content.id}`);
    }
  }, [content, onSelect, navigate]);

  // 編集モーダルの処理
  const handleEdit = useCallback(() => {
    setEditModalOpen(true);
  }, []);

  const handleEditSubmit = useCallback(
    async (updatedContent: Partial<ContentIndex>) => {
      try {
        await updateContent(content.id, updatedContent);
        showNotification({
          title: "更新完了",
          message: "コンテンツが更新されました",
          color: "green",
        });
      } catch (error) {
        logger.error("ContentPreview", "コンテンツ更新エラー", error);
        showNotification({
          title: "更新エラー",
          message: "コンテンツの更新に失敗しました",
          color: "red",
        });
      }
    },
    [content.id, updateContent],
  );

  // 削除処理
  const handleDelete = useCallback(() => {
    modals.openConfirmModal({
      title: "コンテンツの削除",
      children: (
        <Text size="sm">
          「{content.name}」を削除してもよろしいですか？
          <br />
          この操作は元に戻せません。
        </Text>
      ),
      labels: { confirm: "削除", cancel: "キャンセル" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteContentSafely(content.id);
          showNotification({
            title: "削除完了",
            message: "コンテンツが削除されました",
            color: "green",
          });
        } catch (error) {
          logger.error("ContentPreview", "コンテンツ削除エラー", error);
          const errorMessage = error instanceof Error ? error.message : "コンテンツの削除中にエラーが発生しました";
          showNotification({
            title: "削除エラー",
            message: errorMessage,
            color: "red",
            icon: <IconX size={18} />,
            autoClose: false,
          });
        }
      },
    });
  }, [content, deleteContentSafely]);

  return (
    <>
      <Paper
        radius="md"
        shadow="sm"
        style={{
          cursor: onSelect || content.type === "url" || content.type === "youtube" ? "pointer" : "default",
          position: "relative",
          height: `${imageHeight + infoSectionHeight}px`,
          overflow: "hidden",
        }}
        onClick={handleContentClick}
      >
        <Card
          p={0}
          radius="md"
          style={{
            height: "100%",
            border: selected ? "2px solid #228be6" : "1px solid transparent",
            backgroundColor: selected ? "#f0f9ff" : "transparent",
          }}
        >
          <Card.Section style={{ position: "relative" }}>
            {/* ローディングオーバーレイ */}
            <LoadingOverlay visible={previewState.loading} zIndex={1} />

            {/* プレビュー画像 */}
            <PreviewImage
              contentName={content.name}
              contentType={content.type}
              previewState={previewState}
              imageHeight={imageHeight}
            />
          </Card.Section>

          {/* コンテンツ情報 */}
          <ContentInfo
            content={content}
            onEdit={handleEdit}
            onDelete={handleDelete}
            infoSectionHeight={infoSectionHeight}
          />
        </Card>
      </Paper>

      {/* 編集モーダル */}
      <ContentEditModal
        opened={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        content={content}
        onSubmit={handleEditSubmit}
      />
    </>
  );
};
