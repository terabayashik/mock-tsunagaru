import { Box, Button, Divider, Group, Modal, Paper, Progress, Stack, Text, TextInput } from "@mantine/core";
import type { FileWithPath } from "@mantine/dropzone";
import { modals } from "@mantine/modals";
import { IconArrowLeft, IconArrowRight, IconDeviceFloppy, IconPlus, IconX } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { ContentSelectionGrid } from "~/components/content/ContentSelectionGrid";
import { SelectedContentList } from "~/components/content/SelectedContentList";
import { InteractiveLayoutPreview } from "~/components/layout/InteractiveLayoutPreview";
import { useContent } from "~/hooks/useContent";
import { useLayout } from "~/hooks/useLayout";
import type { ContentIndex, RichTextContent } from "~/types/content";
import type { LayoutItem } from "~/types/layout";
import type { ContentAssignment, PlaylistItem } from "~/types/playlist";
import { ContentAddModal } from "./ContentAddModal";

export interface PlaylistEditFormData {
  name: string;
  device: string;
  contentAssignments: ContentAssignment[];
}

interface PlaylistEditModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: PlaylistEditFormData) => Promise<void>;
  playlist: PlaylistItem | null; // 編集対象のプレイリスト
}

type Step = "basic" | "content";

interface StepInfo {
  key: Step;
  title: string;
  description: string;
}

export const PlaylistEditModal = ({ opened, onClose, onSubmit, playlist }: PlaylistEditModalProps) => {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>("basic");
  const [formData, setFormData] = useState<PlaylistEditFormData>({
    name: "",
    device: "",
    contentAssignments: [],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof PlaylistEditFormData, string>>>({});
  const [layout, setLayout] = useState<LayoutItem | null>(null);
  const [contents, setContents] = useState<ContentIndex[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState<PlaylistEditFormData | null>(null);
  const [showContentAddModal, setShowContentAddModal] = useState(false);

  const { getLayoutById } = useLayout();
  const { getContentsIndex, createFileContent, createUrlContent, createRichTextContent } = useContent();

  const steps: StepInfo[] = [
    { key: "basic", title: "基本情報", description: "プレイリスト名とデバイスを編集" },
    { key: "content", title: "コンテンツ編集", description: "各リージョンのコンテンツを編集" },
  ];

  const getCurrentStepIndex = () => steps.findIndex((step) => step.key === currentStep);
  const getProgress = () => ((getCurrentStepIndex() + 1) / steps.length) * 100;

  const loadPlaylistLayout = useCallback(async () => {
    if (!playlist?.layoutId) return;

    try {
      const layoutData = await getLayoutById(playlist.layoutId);
      setLayout(layoutData);
    } catch (error) {
      console.error("Failed to load layout:", error);
    }
  }, [playlist?.layoutId, getLayoutById]);

  const loadContents = useCallback(async () => {
    try {
      const contentsData = await getContentsIndex();
      setContents(contentsData);
    } catch (error) {
      console.error("Failed to load contents:", error);
    }
  }, [getContentsIndex]);

  // プレイリストデータが変更されたときにフォームを初期化
  useEffect(() => {
    if (playlist && opened) {
      const initialData = {
        name: playlist.name,
        device: playlist.device,
        contentAssignments: playlist.contentAssignments || [],
      };
      setFormData(initialData);
      setOriginalData(initialData);
      setCurrentStep("basic");
      setSelectedRegionId(null);
      loadPlaylistLayout();
      loadContents();
    }
  }, [playlist, opened, loadPlaylistLayout, loadContents]);

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

  const validateCurrentStep = (): boolean => {
    const newErrors: Partial<Record<keyof PlaylistEditFormData, string>> = {};

    if (currentStep === "basic") {
      if (formData.name.trim().length === 0) {
        newErrors.name = "プレイリスト名は必須です";
      }
      if (formData.device.trim().length === 0) {
        newErrors.device = "デバイス名は必須です";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      return;
    }

    const currentIndex = getCurrentStepIndex();
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].key);
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
      await onSubmit({
        name: formData.name.trim(),
        device: formData.device.trim(),
        contentAssignments: formData.contentAssignments,
      });
      resetForm();
      onClose();
    } catch (error) {
      console.error("プレイリスト更新エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (hasChanges()) {
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
    setFormData({ name: "", device: "", contentAssignments: [] });
    setOriginalData(null);
    setErrors({});
    setLayout(null);
    setSelectedRegionId(null);
  };

  const handleContentAssignmentChange = (regionId: string, contentIds: string[]) => {
    setFormData((prev) => ({
      ...prev,
      contentAssignments: prev.contentAssignments.map((assignment) =>
        assignment.regionId === regionId ? { ...assignment, contentIds } : assignment,
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

            {/* レイアウト情報表示（編集不可） */}
            {layout && (
              <Paper p="md" withBorder style={{ backgroundColor: "var(--mantine-color-gray-0)" }}>
                <Text size="sm" fw={500} mb="xs">
                  使用中のレイアウト
                </Text>
                <Text size="sm" c="dimmed">
                  {layout.name} (
                  {layout.orientation === "landscape"
                    ? "横向き"
                    : layout.orientation === "portrait-right"
                      ? "縦向き(右)"
                      : "縦向き(左)"}{" "}
                  - {layout.regions.length}
                  リージョン)
                </Text>
                <Text size="xs" c="dimmed" mt="xs">
                  ※ レイアウトの変更はできません。新しいプレイリストを作成してください。
                </Text>
              </Paper>
            )}
          </Stack>
        );

      case "content":
        return (
          <Stack gap="md">
            {layout ? (
              layout.regions.length === 0 ? (
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
                      layout={layout}
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
                            リージョン {layout.regions.findIndex((r) => r.id === selectedRegionId) + 1}{" "}
                            のコンテンツを編集
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
                          選択したリージョンのコンテンツを編集できます
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

  // コンテンツステップでは大きなモーダルサイズを使用
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
        title="プレイリストを編集"
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
                  更新
                </Button>
              )}
            </Group>
          </Group>
        </Stack>
      </Modal>

      {/* コンテンツ追加モーダル */}
      <ContentAddModal
        opened={showContentAddModal}
        onClose={() => setShowContentAddModal(false)}
        onFileSubmit={handleFileContentSubmit}
        onUrlSubmit={handleUrlContentSubmit}
        onRichTextSubmit={handleRichTextContentSubmit}
      />
    </>
  );
};
