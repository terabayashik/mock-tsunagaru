import type { FileWithPath } from "@mantine/dropzone";
import { useAtom } from "jotai";
import { useCallback, useEffect } from "react";
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
import type { ContentIndex, ContentType, RichTextContent } from "~/types/content";
import { logger } from "~/utils/logger";

export const useContentsPage = () => {
  // 状態管理
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

  // Content API
  const {
    getContentsIndex,
    deleteContentSafely,
    checkContentUsageStatus,
    createFileContent,
    createUrlContent,
    createRichTextContent,
    updateContent,
    getContentById,
  } = useContent();

  // コンテンツ一覧の読み込み
  const loadContents = useCallback(async () => {
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
  }, [getContentsIndex, contentDispatch]);

  // 初期読み込み
  useEffect(() => {
    loadContents();
  }, [loadContents]);

  // ファイルアップロード処理
  const handleFileUploadSubmit = useCallback(
    async (files: FileWithPath[], names?: string[]) => {
      for (let i = 0; i < files.length; i++) {
        try {
          const newContent = await createFileContent(files[i], names?.[i]);

          // インデックス用のデータに変換
          const contentIndex: ContentIndex = {
            id: newContent.id,
            name: newContent.name,
            type: newContent.type,
            size: newContent.fileInfo?.size,
            tags: newContent.tags,
            createdAt: newContent.createdAt,
            updatedAt: newContent.updatedAt,
          };

          contentDispatch({ type: "ADD_CONTENT", content: contentIndex });
        } catch (error) {
          contentDispatch({
            type: "SET_ERROR",
            error: error instanceof Error ? error.message : "ファイルのアップロードに失敗しました",
          });
          throw error;
        }
      }
    },
    [createFileContent, contentDispatch],
  );

  // URLコンテンツ作成処理
  const handleUrlContentSubmit = useCallback(
    async (data: { url: string; name?: string; title?: string; description?: string }) => {
      try {
        const newContent = await createUrlContent(data.url, data.name, data.title, data.description);

        // インデックス用のデータに変換
        const contentIndex: ContentIndex = {
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
    },
    [createUrlContent, contentDispatch],
  );

  // リッチテキストコンテンツ作成処理
  const handleRichTextContentSubmit = useCallback(
    async (data: { name: string; richTextInfo: RichTextContent }) => {
      try {
        const newContent = await createRichTextContent(data.name, data.richTextInfo);

        // インデックス形式に変換
        const contentIndex: ContentIndex = {
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
    },
    [createRichTextContent, contentDispatch],
  );

  // コンテンツ編集処理
  const handleContentEditSubmit = useCallback(
    async (data: {
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
        const contentIndex: ContentIndex = {
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
    },
    [updateContent, getContentById, contentDispatch],
  );

  // コンテンツクリック処理
  const handleContentClick = useCallback(
    (contentId: string, contentType: ContentType) => {
      if (contentType === "url" || contentType === "youtube") {
        // URL系コンテンツはプレビューモーダルで開く
        modalDispatch({ type: "OPEN_CONTENT_PREVIEW", contentId });
      } else {
        // それ以外はプレビューモーダルで開く
        modalDispatch({ type: "OPEN_CONTENT_PREVIEW", contentId });
      }
    },
    [modalDispatch],
  );

  // モーダル操作
  const handleContentAdd = useCallback(() => {
    contentModalDispatch({ type: "OPEN_CONTENT_ADD" });
  }, [contentModalDispatch]);

  const handleContentAddModalClose = useCallback(() => {
    contentModalDispatch({ type: "CLOSE_CONTENT_ADD" });
  }, [contentModalDispatch]);

  const handleContentEditModalClose = useCallback(() => {
    contentModalDispatch({ type: "CLOSE_CONTENT_EDIT" });
  }, [contentModalDispatch]);

  const handleContentPreviewModalClose = useCallback(() => {
    modalDispatch({ type: "CLOSE_CONTENT_PREVIEW" });
  }, [modalDispatch]);

  const handleContentChange = useCallback(
    (newContentId: string) => {
      modalDispatch({ type: "OPEN_CONTENT_PREVIEW", contentId: newContentId });
    },
    [modalDispatch],
  );

  return {
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
  };
};
