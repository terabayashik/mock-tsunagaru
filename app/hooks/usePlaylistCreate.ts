import { useCallback, useEffect, useState } from "react";
import { useContent } from "~/hooks/useContent";
import { useLayout } from "~/hooks/useLayout";
import type { ContentIndex } from "~/types/content";
import { extractYouTubeVideoId } from "~/types/content";
import type { LayoutIndex, LayoutItem, Orientation, Region } from "~/types/layout";
import type { ContentAssignment } from "~/types/playlist";
import { logger } from "~/utils/logger";
import { getYouTubeVideoDurationCached } from "~/utils/youtubePlayer";

export interface PlaylistFormData {
  name: string;
  device: string;
  layoutId: string;
  contentAssignments: ContentAssignment[];
}

export type Step = "basic" | "layout" | "content";

export interface StepInfo {
  key: Step;
  title: string;
  description: string;
}

export const steps: StepInfo[] = [
  { key: "basic", title: "基本情報", description: "プレイリスト名とデバイスを設定" },
  { key: "layout", title: "レイアウト選択", description: "既存レイアウトを選択または新規作成" },
  { key: "content", title: "コンテンツ割り当て", description: "各リージョンにコンテンツを割り当て" },
];

export const usePlaylistCreate = (opened: boolean) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PlaylistFormData>({
    name: "",
    device: "",
    layoutId: "",
    contentAssignments: [],
  });
  const [initialFormData, setInitialFormData] = useState<PlaylistFormData>({
    name: "",
    device: "",
    layoutId: "",
    contentAssignments: [],
  });
  const [layouts, setLayouts] = useState<LayoutIndex[]>([]);
  const [selectedLayout, setSelectedLayout] = useState<LayoutItem | null>(null);
  const [contents, setContents] = useState<ContentIndex[]>([]);
  const [createNewLayout, setCreateNewLayout] = useState(false);
  const [tempLayoutData, setTempLayoutData] = useState<{
    name: string;
    orientation: Orientation;
    regions: Region[];
  } | null>(null);

  const { getLayoutsIndex, getLayoutById, createLayout } = useLayout();
  const { getContentsIndex, getContentById } = useContent();

  // プレイリスト名の生成
  const generatePlaylistName = useCallback(() => {
    return `プレイリスト ${new Date().toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }, []);

  // データ読み込み
  const loadLayouts = useCallback(async () => {
    try {
      const layoutsData = await getLayoutsIndex();
      setLayouts(layoutsData);
    } catch (error) {
      logger.error("usePlaylistCreate", "Failed to load layouts", error);
    }
  }, [getLayoutsIndex]);

  const loadContents = useCallback(async () => {
    try {
      const contentsData = await getContentsIndex();
      setContents(contentsData);
    } catch (error) {
      logger.error("usePlaylistCreate", "Failed to load contents", error);
    }
  }, [getContentsIndex]);

  // モーダルが開かれたときの初期化
  useEffect(() => {
    if (opened) {
      loadLayouts();
      loadContents();

      const initialData = {
        name: generatePlaylistName(),
        device: "",
        layoutId: "",
        contentAssignments: [],
      };
      setFormData(initialData);
      setInitialFormData(initialData);
      setSelectedLayout(null);
      setCreateNewLayout(false);
      setTempLayoutData(null);
    }
  }, [opened, loadLayouts, loadContents, generatePlaylistName]);

  // 変更検知
  const hasChanges = useCallback(() => {
    return (
      formData.name.trim() !== initialFormData.name.trim() ||
      formData.device.trim() !== initialFormData.device.trim() ||
      formData.layoutId !== initialFormData.layoutId ||
      JSON.stringify(formData.contentAssignments) !== JSON.stringify(initialFormData.contentAssignments) ||
      createNewLayout ||
      tempLayoutData !== null
    );
  }, [formData, initialFormData, createNewLayout, tempLayoutData]);

  // レイアウト選択/作成
  const handleLayoutSelect = useCallback(
    async (layoutId: string) => {
      try {
        const layout = await getLayoutById(layoutId);
        if (layout) {
          setSelectedLayout(layout);
          setFormData((prev) => ({
            ...prev,
            layoutId,
            contentAssignments: layout.regions.map((region) => ({
              regionId: region.id,
              contentIds: [],
              contentDurations: [],
            })),
          }));
        }
      } catch (error) {
        logger.error("usePlaylistCreate", "Failed to load layout", error);
      }
    },
    [getLayoutById],
  );

  const handleTempLayoutCreate = useCallback((data: { name: string; orientation: Orientation; regions: Region[] }) => {
    setTempLayoutData(data);
    const tempLayout: LayoutItem = {
      id: "temp-layout",
      name: data.name,
      orientation: data.orientation,
      regions: data.regions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSelectedLayout(tempLayout);
    setFormData((prev) => ({
      ...prev,
      layoutId: "",
      contentAssignments: data.regions.map((region) => ({
        regionId: region.id,
        contentIds: [],
        contentDurations: [],
      })),
    }));
  }, []);

  // コンテンツ割り当て
  const handleContentAssignmentChange = useCallback(
    async (regionId: string, contentIds: string[]) => {
      const assignment = formData.contentAssignments.find((a) => a.regionId === regionId);
      const currentContentIds = assignment?.contentIds || [];
      let newDurations = assignment?.contentDurations || [];

      // 新規追加されたコンテンツを特定
      const addedContentIds = contentIds.filter((id) => !currentContentIds.includes(id));
      if (addedContentIds.length > 0) {
        // 最後に追加されたコンテンツ（通常1つ）
        const newContentId = addedContentIds[addedContentIds.length - 1];
        const newContent = await getContentById(newContentId);

        if (newContent) {
          // YouTube動画の場合は自動的に再生時間を取得
          if (newContent.type === "youtube" && newContent.urlInfo?.url) {
            const videoId = extractYouTubeVideoId(newContent.urlInfo.url);
            if (videoId) {
              try {
                const duration = await getYouTubeVideoDurationCached(videoId);
                if (duration && duration > 0) {
                  newDurations.push({
                    contentId: newContent.id,
                    duration,
                  });
                } else {
                  // 再生時間取得失敗時は手動設定が必要
                  return {
                    contentId: newContent.id,
                    contentName: newContent.name,
                    contentType: newContent.type,
                  };
                }
              } catch (_error) {
                // エラー時は手動設定
                return {
                  contentId: newContent.id,
                  contentName: newContent.name,
                  contentType: newContent.type,
                };
              }
            }
          }
          // その他のコンテンツは再生時間設定が必要
          else {
            return {
              contentId: newContent.id,
              contentName: newContent.name,
              contentType: newContent.type,
            };
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
    [formData.contentAssignments, getContentById],
  );

  // 実際のレイアウト作成
  const createActualLayout = useCallback(async () => {
    if (!tempLayoutData) return null;

    try {
      const newLayout = await createLayout({
        name: tempLayoutData.name,
        orientation: tempLayoutData.orientation,
        regions: tempLayoutData.regions,
      });
      return newLayout.id;
    } catch (error) {
      logger.error("usePlaylistCreate", "Failed to create layout", error);
      throw error;
    }
  }, [tempLayoutData, createLayout]);

  return {
    loading,
    setLoading,
    formData,
    setFormData,
    layouts,
    selectedLayout,
    setSelectedLayout,
    contents,
    createNewLayout,
    setCreateNewLayout,
    tempLayoutData,
    hasChanges,
    handleLayoutSelect,
    handleTempLayoutCreate,
    handleContentAssignmentChange,
    createActualLayout,
  };
};
