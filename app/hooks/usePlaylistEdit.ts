import { useCallback, useEffect, useState } from "react";
import type { PlaylistEditFormData } from "~/components/playlist/PlaylistEditFormData";
import { useContent } from "~/hooks/useContent";
import { useLayout } from "~/hooks/useLayout";
import type { ContentIndex } from "~/types/content";
import { extractYouTubeVideoId } from "~/types/content";
import type { LayoutItem } from "~/types/layout";
import type { ContentAssignment, ContentDuration, PlaylistItem } from "~/types/playlist";
import { logger } from "~/utils/logger";
import { getYouTubeVideoDurationCached } from "~/utils/youtubePlayer";

export const usePlaylistEdit = (playlist: PlaylistItem | null, opened: boolean) => {
  const [loading, setLoading] = useState(false);
  const [layout, setLayout] = useState<LayoutItem | null>(null);
  const [contents, setContents] = useState<ContentIndex[]>([]);
  const [originalData, setOriginalData] = useState<PlaylistEditFormData | null>(null);
  const [formData, setFormData] = useState<PlaylistEditFormData>({
    name: "",
    device: "",
    contentAssignments: [],
  });

  const { getLayoutById } = useLayout();
  const { getContentsIndex, getContentById } = useContent();

  // プレイリストのレイアウトを読み込み
  const loadPlaylistLayout = useCallback(async () => {
    if (!playlist?.layoutId) return;

    try {
      const layoutData = await getLayoutById(playlist.layoutId);
      setLayout(layoutData);
    } catch (error) {
      logger.error("usePlaylistEdit", "Failed to load layout", error);
    }
  }, [playlist?.layoutId, getLayoutById]);

  // コンテンツ一覧を読み込み
  const loadContents = useCallback(async () => {
    try {
      const contentsData = await getContentsIndex();
      setContents(contentsData);
    } catch (error) {
      logger.error("usePlaylistEdit", "Failed to load contents", error);
    }
  }, [getContentsIndex]);

  // プレイリストデータが変更されたときにフォームを初期化
  useEffect(() => {
    if (playlist && opened) {
      loadPlaylistLayout();
      loadContents();
    }
  }, [playlist, opened, loadPlaylistLayout, loadContents]);

  // レイアウトが読み込まれたらcontentAssignmentsを初期化
  useEffect(() => {
    if (playlist && layout && opened) {
      // レイアウトの全リージョンに対してcontentAssignmentsを作成
      const mergedAssignments: ContentAssignment[] = layout.regions.map((region) => {
        const existingAssignment = playlist.contentAssignments?.find((assignment) => assignment.regionId === region.id);
        return existingAssignment || { regionId: region.id, contentIds: [], contentDurations: [] };
      });

      const initialData = {
        name: playlist.name,
        device: playlist.device,
        contentAssignments: mergedAssignments,
      };
      setFormData(initialData);
      setOriginalData(initialData);
    }
  }, [playlist, layout, opened]);

  // 変更があるかチェック
  const hasChanges = useCallback(() => {
    if (!originalData) return false;

    // 基本情報の変更チェック
    if (formData.name !== originalData.name || formData.device !== originalData.device) {
      return true;
    }

    // コンテンツ割り当ての変更チェック
    const currentAssignments = JSON.stringify(formData.contentAssignments);
    const originalAssignments = JSON.stringify(originalData.contentAssignments);

    return currentAssignments !== originalAssignments;
  }, [formData, originalData]);

  // コンテンツ割り当ての更新（再生時間を含む）
  const handleContentAssignmentChange = useCallback(
    async (regionId: string, contentIds: string[]) => {
      // 新しく追加されたコンテンツをチェック
      const currentAssignment = formData.contentAssignments.find((a) => a.regionId === regionId);
      const currentContentIds = currentAssignment?.contentIds || [];
      const newContentIds = contentIds.filter((id) => !currentContentIds.includes(id));

      let newDurations: ContentDuration[] = currentAssignment?.contentDurations || [];

      if (newContentIds.length > 0) {
        // 新しいコンテンツの情報を取得
        const newContent = contents.find((c) => c.id === newContentIds[0]);
        if (newContent) {
          // 動画の場合は詳細情報から再生時間を取得
          if (newContent.type === "video") {
            try {
              const contentDetail = await getContentById(newContent.id);
              if (contentDetail?.fileInfo?.metadata?.duration) {
                newDurations = [
                  ...newDurations,
                  {
                    contentId: newContent.id,
                    duration: Math.ceil(contentDetail.fileInfo.metadata.duration),
                  },
                ];
              }
            } catch (error) {
              logger.error("usePlaylistEdit", "Failed to get video duration", error);
            }
          }
          // YouTubeコンテンツの場合はiframe APIで再生時間を取得
          else if (newContent.type === "youtube") {
            try {
              const contentDetail = await getContentById(newContent.id);
              if (contentDetail?.urlInfo?.url) {
                const videoId = extractYouTubeVideoId(contentDetail.urlInfo.url);
                if (videoId) {
                  const duration = await getYouTubeVideoDurationCached(videoId);
                  if (duration !== null) {
                    newDurations = [
                      ...newDurations,
                      {
                        contentId: newContent.id,
                        duration,
                      },
                    ];
                  } else {
                    // API取得失敗時は後でモーダルで設定
                    return { contentId: newContent.id, contentName: newContent.name, contentType: newContent.type };
                  }
                }
              }
            } catch (error) {
              logger.error("usePlaylistEdit", "Failed to get YouTube video info", error);
              // エラー時は後でモーダルで設定
              return { contentId: newContent.id, contentName: newContent.name, contentType: newContent.type };
            }
          }
          // その他のコンテンツは再生時間設定が必要
          else {
            return { contentId: newContent.id, contentName: newContent.name, contentType: newContent.type };
          }
        }
      }

      // 削除されたコンテンツの再生時間情報も削除
      const removedContentIds = currentContentIds.filter((id) => !contentIds.includes(id));
      if (removedContentIds.length > 0) {
        newDurations = newDurations.filter((d) => !removedContentIds.includes(d.contentId));
      }

      setFormData((prev) => ({
        ...prev,
        contentAssignments: prev.contentAssignments.map((assignment) =>
          assignment.regionId === regionId ? { ...assignment, contentIds, contentDurations: newDurations } : assignment,
        ),
      }));

      return null;
    },
    [formData.contentAssignments, contents, getContentById],
  );

  return {
    loading,
    setLoading,
    layout,
    contents,
    formData,
    setFormData,
    hasChanges,
    handleContentAssignmentChange,
  };
};
