import { Box, Button, Divider, Group, Modal, Stack, Text } from "@mantine/core";
import type { FileWithPath } from "@mantine/dropzone";
import { modals } from "@mantine/modals";
import { IconArrowLeft, IconArrowRight, IconDeviceFloppy, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useContent } from "~/hooks/useContent";
import { usePlaylistEdit } from "~/hooks/usePlaylistEdit";
import type { RichTextContent } from "~/types/content";
import type { PlaylistItem } from "~/types/playlist";
import { logger } from "~/utils/logger";
import { BasicInfoStep } from "../playlist/edit/BasicInfoStep";
import { ContentEditStep } from "../playlist/edit/ContentEditStep";
import type { PlaylistEditFormData } from "../playlist/PlaylistEditFormData";
import { type StepInfo, StepNavigation } from "../playlist/StepNavigation";
import { ContentAddModal } from "./ContentAddModal";
import { ContentDurationModal } from "./ContentDurationModal";

interface PlaylistEditModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: PlaylistEditFormData) => Promise<void>;
  playlist: PlaylistItem | null;
}

type Step = "basic" | "content";

const steps: StepInfo[] = [
  { key: "basic", title: "基本情報", description: "プレイリスト名とデバイスを編集" },
  { key: "content", title: "コンテンツ編集", description: "各リージョンのコンテンツを編集" },
];

export const PlaylistEditModalRefactored = ({ opened, onClose, onSubmit, playlist }: PlaylistEditModalProps) => {
  const [currentStep, setCurrentStep] = useState<Step>("basic");
  const [errors, setErrors] = useState<Partial<Record<keyof PlaylistEditFormData, string>>>({});
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [showContentAddModal, setShowContentAddModal] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [durationModalContent, setDurationModalContent] = useState<{
    contentId: string;
    contentName: string;
    contentType: string;
  } | null>(null);

  const { createFileContent, createUrlContent, createRichTextContent } = useContent();
  const { loading, setLoading, layout, contents, formData, setFormData, hasChanges, handleContentAssignmentChange } =
    usePlaylistEdit(playlist, opened);

  const getCurrentStepIndex = () => steps.findIndex((step) => step.key === currentStep);

  const validateCurrentStep = (): boolean => {
    const newErrors: Partial<Record<keyof PlaylistEditFormData, string>> = {};

    if (currentStep === "basic" || currentStep === "content") {
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
      setCurrentStep(steps[currentIndex + 1].key as Step);
    }
  };

  const handlePrev = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].key as Step);
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
      logger.error("PlaylistEditModal", "プレイリスト更新エラー", error);
      modals.openConfirmModal({
        title: "更新エラー",
        children: <Text size="sm">プレイリストの更新中にエラーが発生しました。もう一度お試しください。</Text>,
        labels: { confirm: "OK", cancel: "" },
        cancelProps: { display: "none" },
      });
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
    setErrors({});
    setSelectedRegionId(null);
  };

  const handleContentAssignmentWrapper = async (regionId: string, contentIds: string[]) => {
    const durationModalData = await handleContentAssignmentChange(regionId, contentIds);
    if (durationModalData) {
      setSelectedRegionId(regionId);
      setDurationModalContent(durationModalData);
      setShowDurationModal(true);
    }
  };

  const handleContentReorder = async (regionId: string, reorderedContentIds: string[]) => {
    await handleContentAssignmentWrapper(regionId, reorderedContentIds);
  };

  const handleDurationSubmit = (duration: number) => {
    if (!durationModalContent || !selectedRegionId) return;

    setFormData((prev) => {
      const updatedAssignments = prev.contentAssignments.map((assignment) => {
        if (assignment.regionId === selectedRegionId) {
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

  const handleFileContentSubmit = async (files: FileWithPath[], names?: string[]) => {
    for (let i = 0; i < files.length; i++) {
      await createFileContent(files[i], names?.[i]);
    }
    // コンテンツリストを再読み込み
    window.location.reload();
  };

  const handleUrlContentSubmit = async (data: { url: string; name?: string; title?: string; description?: string }) => {
    await createUrlContent(data.url, data.name, data.title, data.description);
    window.location.reload();
  };

  const handleRichTextContentSubmit = async (data: { name: string; richTextInfo: RichTextContent }) => {
    await createRichTextContent(data.name, data.richTextInfo);
    window.location.reload();
  };

  const getContentDuration = (regionId: string, contentId: string): number | undefined => {
    const assignment = formData.contentAssignments.find((a) => a.regionId === regionId);
    const duration = assignment?.contentDurations?.find((d) => d.contentId === contentId);
    return duration?.duration;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "basic":
        return <BasicInfoStep formData={formData} setFormData={setFormData} errors={errors} layout={layout} />;

      case "content":
        return (
          <Box style={{ height: "100%" }}>
            <ContentEditStep
              layout={layout}
              contents={contents}
              formData={formData}
              onContentAssignmentChange={handleContentAssignmentWrapper}
              onContentReorder={handleContentReorder}
              onContentAddClick={() => setShowContentAddModal(true)}
            />
          </Box>
        );

      default:
        return null;
    }
  };

  const canGoNext = () => getCurrentStepIndex() < steps.length - 1;
  const canGoPrev = () => getCurrentStepIndex() > 0;

  const getModalSize = () => (currentStep === "content" ? "95%" : "lg");

  const getModalStyles = () => {
    if (currentStep === "content") {
      return {
        content: {
          maxWidth: "1600px",
          minWidth: "1200px",
          height: "900px",
          maxHeight: "95vh",
        },
        body: {
          height: "calc(900px - 60px)",
          padding: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column" as const,
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
        <Stack gap="lg" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          {/* プログレスバー */}
          <StepNavigation steps={steps} currentStep={currentStep} isContentStep={currentStep === "content"} />

          <Divider mx={currentStep === "content" ? 20 : 0} />

          {/* ステップコンテンツ */}
          <Box style={{ flex: 1, overflow: "hidden", minHeight: 0 }} px={currentStep === "content" ? 20 : 0}>
            {renderStepContent()}
          </Box>

          {/* ナビゲーションボタン */}
          <Group
            justify="space-between"
            mt={currentStep === "content" ? "sm" : "lg"}
            px={currentStep === "content" ? 20 : 0}
            pb={currentStep === "content" ? 16 : 0}
          >
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
