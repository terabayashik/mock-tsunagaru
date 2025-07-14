import {
  Box,
  Button,
  Checkbox,
  Divider,
  Group,
  Modal,
  Paper,
  Progress,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import type { FileWithPath } from "@mantine/dropzone";
import { modals } from "@mantine/modals";
import { IconArrowLeft, IconArrowRight, IconDeviceFloppy, IconLayoutGrid, IconPlus, IconX } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { ContentSelectionGrid } from "~/components/content/ContentSelectionGrid";
import { SelectedContentList } from "~/components/content/SelectedContentList";
import { InteractiveLayoutPreview } from "~/components/layout/InteractiveLayoutPreview";
import { useContent } from "~/hooks/useContent";
import { useLayout } from "~/hooks/useLayout";
import type { ContentIndex, RichTextContent } from "~/types/content";
import { extractYouTubeVideoId } from "~/types/content";
import type { LayoutIndex, LayoutItem, Orientation, Region } from "~/types/layout";
import type { ContentAssignment, ContentDuration } from "~/types/playlist";
import { logger } from "~/utils/logger";
import { getYouTubeVideoDurationCached } from "~/utils/youtubePlayer";
import { ContentAddModal } from "./ContentAddModal";
import { ContentDurationModal } from "./ContentDurationModal";
import { LayoutFormModal } from "./LayoutFormModal";

export interface PlaylistFormData {
  name: string;
  device: string;
  layoutId: string;
  contentAssignments: ContentAssignment[];
}

interface PlaylistCreateModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: PlaylistFormData) => Promise<void>;
}

type Step = "basic" | "layout" | "content";

interface StepInfo {
  key: Step;
  title: string;
  description: string;
}

export const PlaylistCreateModal = ({ opened, onClose, onSubmit }: PlaylistCreateModalProps) => {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>("basic");
  const [formData, setFormData] = useState<PlaylistFormData>({
    name: "",
    device: "",
    layoutId: "",
    contentAssignments: [],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof PlaylistFormData, string>>>({});
  const [layouts, setLayouts] = useState<LayoutIndex[]>([]);
  const [selectedLayout, setSelectedLayout] = useState<LayoutItem | null>(null);
  const [contents, setContents] = useState<ContentIndex[]>([]);
  const [createNewLayout, setCreateNewLayout] = useState(false);
  const [showLayoutForm, setShowLayoutForm] = useState(false);
  const [tempLayoutData, setTempLayoutData] = useState<{
    name: string;
    orientation: Orientation;
    regions: Region[];
  } | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [showContentAddModal, setShowContentAddModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [durationModalContent, setDurationModalContent] = useState<{
    contentId: string;
    contentName: string;
    contentType: string;
  } | null>(null);

  const { getLayoutsIndex, getLayoutById, createLayout } = useLayout();
  const { getContentsIndex, getContentById, createFileContent, createUrlContent, createRichTextContent } = useContent();

  const steps: StepInfo[] = [
    { key: "basic", title: "基本情報", description: "プレイリスト名とデバイスを設定" },
    { key: "layout", title: "レイアウト選択", description: "既存レイアウトを選択または新規作成" },
    { key: "content", title: "コンテンツ割り当て", description: "各リージョンにコンテンツを割り当て" },
  ];

  const getCurrentStepIndex = () => steps.findIndex((step) => step.key === currentStep);
  const getProgress = () => ((getCurrentStepIndex() + 1) / steps.length) * 100;

  const loadLayouts = useCallback(async () => {
    try {
      const layoutsData = await getLayoutsIndex();
      setLayouts(layoutsData);
    } catch (error) {
      logger.error("PlaylistCreateModal", "Failed to load layouts", error);
    }
  }, [getLayoutsIndex]);

  const loadContents = useCallback(async () => {
    try {
      const contentsData = await getContentsIndex();
      setContents(contentsData);
    } catch (error) {
      logger.error("PlaylistCreateModal", "Failed to load contents", error);
    }
  }, [getContentsIndex]);

  // データ読み込み
  useEffect(() => {
    if (opened) {
      loadLayouts();
      loadContents();
    }
  }, [opened, loadLayouts, loadContents]);

  // 変更を監視
  useEffect(() => {
    const hasAnyChange =
      formData.name.trim() !== "" ||
      formData.device.trim() !== "" ||
      formData.layoutId !== "" ||
      formData.contentAssignments.some((assignment) => assignment.contentIds.length > 0) ||
      createNewLayout ||
      tempLayoutData !== null;

    setHasChanges(hasAnyChange);
  }, [formData, createNewLayout, tempLayoutData]);

  const validateCurrentStep = (): boolean => {
    const newErrors: Partial<Record<keyof PlaylistFormData, string>> = {};

    if (currentStep === "basic") {
      if (formData.name.trim().length === 0) {
        newErrors.name = "プレイリスト名は必須です";
      }
      if (formData.device.trim().length === 0) {
        newErrors.device = "デバイス名は必須です";
      }
    } else if (currentStep === "layout") {
      if (!createNewLayout && formData.layoutId.trim().length === 0) {
        newErrors.layoutId = "レイアウトを選択してください";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    const currentIndex = getCurrentStepIndex();
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1].key;

      // レイアウト選択ステップからコンテンツステップに移る時
      if (currentStep === "layout" && nextStep === "content") {
        if (createNewLayout) {
          // 新規レイアウト作成の場合
          if (tempLayoutData) {
            // 一時的なレイアウトデータからLayoutItemを作成
            const tempLayout: LayoutItem = {
              id: "temp-layout",
              name: tempLayoutData.name,
              orientation: tempLayoutData.orientation,
              regions: tempLayoutData.regions,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            setSelectedLayout(tempLayout);

            // contentAssignmentsを初期化
            const assignments: ContentAssignment[] = tempLayoutData.regions.map((region) => ({
              regionId: region.id,
              contentIds: [],
              contentDurations: [],
            }));
            setFormData((prev) => ({ ...prev, contentAssignments: assignments }));
          } else {
            // レイアウトが作成されていない場合はレイアウト作成モーダルを表示
            setShowLayoutForm(true);
            return;
          }
        } else if (formData.layoutId) {
          // 既存レイアウト選択の場合
          try {
            const layout = await getLayoutById(formData.layoutId);
            setSelectedLayout(layout);

            // レイアウトのリージョンに基づいてcontentAssignmentsを初期化
            if (layout) {
              const assignments: ContentAssignment[] = layout.regions.map((region) => ({
                regionId: region.id,
                contentIds: [],
                contentDurations: [],
              }));
              setFormData((prev) => ({ ...prev, contentAssignments: assignments }));
            }
          } catch (error) {
            logger.error("PlaylistCreateModal", "Failed to load layout", error);
            return;
          }
        }
      }

      setCurrentStep(nextStep);
    }
  };

  const handlePrev = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].key);
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    setLoading(true);
    try {
      let layoutId = formData.layoutId;

      // 新規レイアウトを作成する場合
      if (createNewLayout && tempLayoutData) {
        const newLayout = await createLayout({
          name: tempLayoutData.name,
          orientation: tempLayoutData.orientation,
          regions: tempLayoutData.regions,
        });
        layoutId = newLayout.id;
      }

      await onSubmit({
        name: formData.name.trim(),
        device: formData.device.trim(),
        layoutId,
        contentAssignments: formData.contentAssignments,
      });
      resetForm();
      onClose();
    } catch (error) {
      logger.error("PlaylistCreateModal", "プレイリスト作成エラー", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      modals.openConfirmModal({
        title: "変更を破棄しますか？",
        children: <Text size="sm">保存されていない変更があります。本当に閉じてもよろしいですか？</Text>,
        labels: { confirm: "破棄して閉じる", cancel: "キャンセル" },
        confirmProps: { color: "red" },
        onConfirm: () => {
          resetForm();
          onClose();
        },
      });
    } else {
      resetForm();
      onClose();
    }
  };

  const resetForm = () => {
    setCurrentStep("basic");
    setFormData({ name: "", device: "", layoutId: "", contentAssignments: [] });
    setErrors({});
    setSelectedLayout(null);
    setCreateNewLayout(false);
    setShowLayoutForm(false);
    setTempLayoutData(null);
    setSelectedRegionId(null);
    setHasChanges(false);
  };

  const handleContentAssignmentChange = async (regionId: string, contentIds: string[]) => {
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
            logger.error("PlaylistCreateModal", "Failed to get video duration", error);
          }
        }
        // YouTubeコンテンツの場合はiframe APIで再生時間を取得
        else if (newContent.type === "youtube") {
          try {
            const contentDetail = await getContentById(newContent.id);
            if (contentDetail?.urlInfo?.url) {
              const videoId = extractYouTubeVideoId(contentDetail.urlInfo.url);
              if (videoId) {
                // YouTube iframe APIから実際の動画時間を取得
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
                  // API取得失敗時は手動設定
                  setDurationModalContent({
                    contentId: newContent.id,
                    contentName: newContent.name,
                    contentType: newContent.type,
                  });
                  setShowDurationModal(true);

                  setFormData((prev) => ({
                    ...prev,
                    contentAssignments: prev.contentAssignments.map((assignment) =>
                      assignment.regionId === regionId
                        ? { ...assignment, contentIds, contentDurations: newDurations }
                        : assignment,
                    ),
                  }));
                  return;
                }
              }
            }
          } catch (error) {
            logger.error("PlaylistCreateModal", "Failed to get YouTube video info", error);
            // エラー時は手動設定
            setDurationModalContent({
              contentId: newContent.id,
              contentName: newContent.name,
              contentType: newContent.type,
            });
            setShowDurationModal(true);

            setFormData((prev) => ({
              ...prev,
              contentAssignments: prev.contentAssignments.map((assignment) =>
                assignment.regionId === regionId
                  ? { ...assignment, contentIds, contentDurations: newDurations }
                  : assignment,
              ),
            }));
            return;
          }
        }
        // その他のコンテンツは再生時間設定が必要
        else {
          setDurationModalContent({
            contentId: newContent.id,
            contentName: newContent.name,
            contentType: newContent.type,
          });
          setShowDurationModal(true);

          // 一時的にコンテンツを追加（再生時間はモーダルで設定）
          setFormData((prev) => ({
            ...prev,
            contentAssignments: prev.contentAssignments.map((assignment) =>
              assignment.regionId === regionId
                ? { ...assignment, contentIds, contentDurations: newDurations }
                : assignment,
            ),
          }));
          return;
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
  };

  const handleContentReorder = (regionId: string, reorderedContentIds: string[]) => {
    handleContentAssignmentChange(regionId, reorderedContentIds);
  };

  const handleRegionSelect = (regionId: string) => {
    setSelectedRegionId(regionId);
  };

  const getSelectedRegionAssignment = () => {
    if (!selectedRegionId) return null;
    return formData.contentAssignments.find((assignment) => assignment.regionId === selectedRegionId);
  };

  const getAssignedContentCounts = () => {
    const counts: Record<string, number> = {};
    formData.contentAssignments.forEach((assignment) => {
      counts[assignment.regionId] = assignment.contentIds.length;
    });
    return counts;
  };

  const canGoNext = () => {
    return getCurrentStepIndex() < steps.length - 1;
  };

  const canGoPrev = () => {
    return getCurrentStepIndex() > 0;
  };

  const handleLayoutCreate = async (data: { name: string; orientation: Orientation; regions: Region[] }) => {
    setTempLayoutData(data);
    setShowLayoutForm(false);

    // レイアウトが作成されたので、次のステップに進む
    const tempLayout: LayoutItem = {
      id: "temp-layout",
      name: data.name,
      orientation: data.orientation,
      regions: data.regions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSelectedLayout(tempLayout);

    // contentAssignmentsを初期化
    const assignments: ContentAssignment[] = data.regions.map((region) => ({
      regionId: region.id,
      contentIds: [],
      contentDurations: [],
    }));
    setFormData((prev) => ({ ...prev, contentAssignments: assignments }));

    // リージョン選択をリセット
    setSelectedRegionId(null);

    // コンテンツステップに移動
    setCurrentStep("content");
  };

  const handleLayoutFormClose = () => {
    setShowLayoutForm(false);
  };

  // コンテンツ追加ハンドラー
  const handleFileContentSubmit = async (files: FileWithPath[], names?: string[]) => {
    for (let i = 0; i < files.length; i++) {
      await createFileContent(files[i], names?.[i]);
    }
    await loadContents(); // コンテンツリストを再読み込み
  };

  const handleUrlContentSubmit = async (data: { url: string; name?: string; title?: string; description?: string }) => {
    await createUrlContent(data.url, data.name, data.title, data.description);
    await loadContents(); // コンテンツリストを再読み込み
  };

  const handleRichTextContentSubmit = async (data: { name: string; richTextInfo: RichTextContent }) => {
    await createRichTextContent(data.name, data.richTextInfo);
    await loadContents(); // コンテンツリストを再読み込み
  };

  const handleDurationSubmit = (duration: number) => {
    if (!durationModalContent || !selectedRegionId) return;

    setFormData((prev) => {
      const updatedAssignments = prev.contentAssignments.map((assignment) => {
        if (assignment.regionId === selectedRegionId) {
          // 既存の再生時間情報を更新または追加
          const existingDurations = assignment.contentDurations || [];
          const updatedDurations = existingDurations.filter((d) => d.contentId !== durationModalContent.contentId);
          updatedDurations.push({
            contentId: durationModalContent.contentId,
            duration,
          });
          return {
            ...assignment,
            contentDurations: updatedDurations,
          };
        }
        return assignment;
      });

      return {
        ...prev,
        contentAssignments: updatedAssignments,
      };
    });

    setShowDurationModal(false);
    setDurationModalContent(null);
  };

  const getContentDuration = (regionId: string, contentId: string): number | undefined => {
    const assignment = formData.contentAssignments.find((a) => a.regionId === regionId);
    const duration = assignment?.contentDurations?.find((d) => d.contentId === contentId);
    return duration?.duration;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "basic":
        return (
          <Stack gap="md">
            <TextInput
              label="プレイリスト名"
              placeholder="プレイリスト名を入力してください"
              required
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              error={errors.name}
            />
            <TextInput
              label="デバイス名"
              placeholder="対象デバイス名を入力してください"
              required
              value={formData.device}
              onChange={(e) => setFormData((prev) => ({ ...prev, device: e.target.value }))}
              error={errors.device}
            />
          </Stack>
        );

      case "layout":
        return (
          <Stack gap="md">
            <Checkbox
              label="新しいレイアウトを作成する"
              checked={createNewLayout}
              onChange={(e) => {
                setCreateNewLayout(e.currentTarget.checked);
                if (e.currentTarget.checked) {
                  setFormData((prev) => ({ ...prev, layoutId: "" }));
                }
              }}
            />

            {!createNewLayout && (
              <Select
                label="レイアウトを選択"
                placeholder="レイアウトを選択してください"
                required
                data={layouts.map((layout) => ({
                  value: layout.id,
                  label: `${layout.name} (${
                    layout.orientation === "landscape"
                      ? "横"
                      : layout.orientation === "portrait-right"
                        ? "縦(右)"
                        : "縦(左)"
                  }, ${layout.regionCount}リージョン)`,
                }))}
                value={formData.layoutId}
                onChange={(value) => setFormData((prev) => ({ ...prev, layoutId: value || "" }))}
                error={errors.layoutId}
              />
            )}

            {createNewLayout && (
              <Stack gap="sm">
                <Paper p="md" withBorder>
                  <Text size="sm" c="dimmed">
                    新しいレイアウトを作成します。
                  </Text>
                </Paper>
                {tempLayoutData ? (
                  <Paper p="md" withBorder>
                    <Text size="sm" fw={500}>
                      作成済みレイアウト: {tempLayoutData.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {tempLayoutData.orientation === "landscape"
                        ? "横向き"
                        : tempLayoutData.orientation === "portrait-right"
                          ? "縦向き(右)"
                          : "縦向き(左)"}{" "}
                      - {tempLayoutData.regions.length}リージョン
                    </Text>
                  </Paper>
                ) : (
                  <Button
                    variant="light"
                    onClick={() => setShowLayoutForm(true)}
                    leftSection={<IconLayoutGrid size={16} />}
                  >
                    レイアウトを作成
                  </Button>
                )}
              </Stack>
            )}
          </Stack>
        );

      case "content":
        return (
          <Stack gap="md">
            {selectedLayout ? (
              selectedLayout.regions.length === 0 ? (
                <Paper p="md" withBorder>
                  <Text c="dimmed" ta="center">
                    このレイアウトにはリージョンがありません
                  </Text>
                </Paper>
              ) : (
                <Group align="flex-start" gap="md" style={{ minHeight: "600px" }}>
                  {/* 左側: レイアウトプレビュー */}
                  <Box style={{ flex: "0 0 350px" }}>
                    <InteractiveLayoutPreview
                      layout={selectedLayout}
                      selectedRegionId={selectedRegionId}
                      onRegionClick={handleRegionSelect}
                      assignedContentCounts={getAssignedContentCounts()}
                      canvasWidth={350}
                      canvasHeight={197}
                    />
                  </Box>

                  {/* 中央: コンテンツ選択 */}
                  <Box style={{ flex: "1 1 auto" }}>
                    {selectedRegionId ? (
                      <>
                        <Group justify="space-between" mb="sm">
                          <Text fw={600}>
                            リージョン {selectedLayout.regions.findIndex((r) => r.id === selectedRegionId) + 1}{" "}
                            のコンテンツを選択
                          </Text>
                          <Button
                            variant="light"
                            size="xs"
                            leftSection={<IconPlus size={14} />}
                            onClick={() => setShowContentAddModal(true)}
                          >
                            コンテンツを追加
                          </Button>
                        </Group>
                        {contents.length === 0 ? (
                          <Paper p="xl" withBorder style={{ textAlign: "center" }}>
                            <Text c="dimmed" mb="sm">
                              利用可能なコンテンツがありません
                            </Text>
                            <Text size="sm" c="dimmed" mb="md">
                              先にコンテンツを追加してください
                            </Text>
                            <Button
                              variant="filled"
                              leftSection={<IconPlus size={16} />}
                              onClick={() => setShowContentAddModal(true)}
                            >
                              コンテンツを追加
                            </Button>
                          </Paper>
                        ) : (
                          <ContentSelectionGrid
                            contents={contents}
                            selectedContentIds={getSelectedRegionAssignment()?.contentIds || []}
                            onSelectionChange={(contentIds) => {
                              if (selectedRegionId) {
                                handleContentAssignmentChange(selectedRegionId, contentIds);
                              }
                            }}
                            loading={false}
                            maxItems={20}
                          />
                        )}
                      </>
                    ) : (
                      <Paper p="xl" withBorder style={{ textAlign: "center" }}>
                        <Text c="dimmed" mb="sm">
                          左のレイアウトプレビューからリージョンを選択してください
                        </Text>
                        <Text size="sm" c="dimmed">
                          選択したリージョンにコンテンツを割り当てることができます
                        </Text>
                      </Paper>
                    )}
                  </Box>

                  {/* 右側: 選択済みコンテンツ一覧 */}
                  <Box style={{ flex: "0 0 300px" }}>
                    {selectedRegionId ? (
                      <SelectedContentList
                        selectedContents={
                          (getSelectedRegionAssignment()
                            ?.contentIds.map((contentId) => contents.find((content) => content.id === contentId))
                            .filter(Boolean) as ContentIndex[]) || []
                        }
                        onReorder={(reorderedContentIds) => {
                          if (selectedRegionId) {
                            handleContentReorder(selectedRegionId, reorderedContentIds);
                          }
                        }}
                        contentDurations={getSelectedRegionAssignment()?.contentDurations?.reduce(
                          (acc, duration) => {
                            acc[duration.contentId] = duration.duration;
                            return acc;
                          },
                          {} as Record<string, number>,
                        )}
                      />
                    ) : (
                      <Paper p="md" withBorder style={{ minHeight: "120px" }}>
                        <Text size="sm" c="dimmed" ta="center">
                          リージョンを選択すると、選択済みコンテンツが表示されます
                        </Text>
                      </Paper>
                    )}
                  </Box>
                </Group>
              )
            ) : (
              <Text c="dimmed">レイアウト情報を読み込み中...</Text>
            )}
          </Stack>
        );

      default:
        return null;
    }
  };

  // コンテンツ割り当てステップでは大きなモーダルサイズを使用
  const getModalSize = () => {
    if (currentStep === "content") {
      return "95%";
    }
    return "lg";
  };

  const getModalStyles = () => {
    if (currentStep === "content") {
      return {
        content: {
          maxWidth: "1400px",
        },
      };
    }
    return undefined;
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={handleClose}
        title="新しいプレイリストを作成"
        centered
        size={getModalSize()}
        styles={getModalStyles()}
      >
        <Stack gap="lg">
          {/* プログレスバー */}
          <Box>
            <Group justify="space-between" mb="xs">
              <Text size="sm" fw={500}>
                {steps[getCurrentStepIndex()].title}
              </Text>
              <Text size="xs" c="dimmed">
                {getCurrentStepIndex() + 1} / {steps.length}
              </Text>
            </Group>
            <Progress value={getProgress()} size="sm" />
            <Text size="xs" c="dimmed" mt="xs">
              {steps[getCurrentStepIndex()].description}
            </Text>
          </Box>

          <Divider />

          {/* ステップコンテンツ */}
          {renderStepContent()}

          {/* ナビゲーションボタン */}
          <Group justify="space-between" mt="lg">
            <Group>
              <Button variant="subtle" leftSection={<IconX size={16} />} onClick={handleClose} disabled={loading}>
                キャンセル
              </Button>
              {canGoPrev() && (
                <Button
                  variant="light"
                  leftSection={<IconArrowLeft size={16} />}
                  onClick={handlePrev}
                  disabled={loading}
                >
                  戻る
                </Button>
              )}
            </Group>

            <Group>
              {canGoNext() ? (
                <Button rightSection={<IconArrowRight size={16} />} onClick={handleNext} disabled={loading}>
                  次へ
                </Button>
              ) : (
                <Button leftSection={<IconDeviceFloppy size={16} />} onClick={handleSubmit} loading={loading}>
                  作成
                </Button>
              )}
            </Group>
          </Group>
        </Stack>
      </Modal>

      {/* レイアウト作成モーダル */}
      <LayoutFormModal
        opened={showLayoutForm}
        onClose={handleLayoutFormClose}
        onSubmit={handleLayoutCreate}
        title="新しいレイアウトを作成"
        submitButtonText="作成"
      />

      {/* コンテンツ追加モーダル */}
      <ContentAddModal
        opened={showContentAddModal}
        onClose={() => setShowContentAddModal(false)}
        onFileSubmit={handleFileContentSubmit}
        onUrlSubmit={handleUrlContentSubmit}
        onRichTextSubmit={handleRichTextContentSubmit}
      />

      {/* 再生時間設定モーダル */}
      {durationModalContent && (
        <ContentDurationModal
          opened={showDurationModal}
          onClose={() => {
            setShowDurationModal(false);
            setDurationModalContent(null);
          }}
          contentName={durationModalContent.contentName}
          contentType={durationModalContent.contentType}
          currentDuration={
            selectedRegionId ? getContentDuration(selectedRegionId, durationModalContent.contentId) : undefined
          }
          onSubmit={handleDurationSubmit}
        />
      )}
    </>
  );
};
