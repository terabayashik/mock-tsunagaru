import { Button, Divider, Group, Modal, Stack, Text } from "@mantine/core";
import type { FileWithPath } from "@mantine/dropzone";
import { modals } from "@mantine/modals";
import { IconArrowLeft, IconArrowRight, IconDeviceFloppy, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useContent } from "~/hooks/useContent";
import { type PlaylistFormData, type Step, steps, usePlaylistCreate } from "~/hooks/usePlaylistCreate";
import type { RichTextContent } from "~/types/content";
import type { Orientation, Region } from "~/types/layout";
import { logger } from "~/utils/logger";
import { BasicInfoStep } from "../playlist/create/BasicInfoStep";
import { ContentAssignmentStep } from "../playlist/create/ContentAssignmentStep";
import { LayoutSelectionStep } from "../playlist/create/LayoutSelectionStep";
import { StepNavigation } from "../playlist/StepNavigation";
import { ContentAddModal } from "./ContentAddModal";
import { ContentDurationModal } from "./ContentDurationModal";
import { LayoutFormModal } from "./LayoutFormModal";

interface PlaylistCreateModalRefactoredProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: PlaylistFormData) => Promise<void>;
}

export const PlaylistCreateModalRefactored = ({ opened, onClose, onSubmit }: PlaylistCreateModalRefactoredProps) => {
  const [currentStep, setCurrentStep] = useState<Step>("basic");
  const [errors, setErrors] = useState<Partial<Record<keyof PlaylistFormData, string>>>({});
  const [showLayoutForm, setShowLayoutForm] = useState(false);
  const [showContentAddModal, setShowContentAddModal] = useState(false);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [durationModalContent, setDurationModalContent] = useState<{
    contentId: string;
    contentName: string;
    contentType: string;
  } | null>(null);

  const { createFileContent, createUrlContent, createRichTextContent } = useContent();
  const {
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
  } = usePlaylistCreate(opened);

  const getCurrentStepIndex = () => steps.findIndex((step) => step.key === currentStep);

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
        if (createNewLayout && tempLayoutData) {
          // 一時的なレイアウトデータは既にselectedLayoutに設定されている
          setCurrentStep(nextStep as Step);
        } else if (!createNewLayout && formData.layoutId) {
          await handleLayoutSelect(formData.layoutId);
          setCurrentStep(nextStep as Step);
        }
      } else {
        setCurrentStep(nextStep as Step);
      }
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
      let finalLayoutId = formData.layoutId;

      // 新規レイアウトの場合は実際に作成
      if (createNewLayout && tempLayoutData) {
        const newLayoutId = await createActualLayout();
        if (!newLayoutId) {
          throw new Error("レイアウトの作成に失敗しました");
        }
        finalLayoutId = newLayoutId;
      }

      await onSubmit({
        name: formData.name.trim(),
        device: formData.device.trim(),
        layoutId: finalLayoutId || "",
        contentAssignments: formData.contentAssignments,
      });

      resetForm();
      onClose();
    } catch (error) {
      logger.error("PlaylistCreateModal", "プレイリスト作成エラー", error);
      modals.openConfirmModal({
        title: "作成エラー",
        children: <Text size="sm">プレイリストの作成中にエラーが発生しました。もう一度お試しください。</Text>,
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
    setFormData({ name: "", device: "", layoutId: "", contentAssignments: [] });
    setErrors({});
    setSelectedLayout(null);
    setCreateNewLayout(false);
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

  const handleLayoutFormClose = () => {
    setShowLayoutForm(false);
  };

  const handleLayoutCreate = async (data: { name: string; orientation: Orientation; regions: Region[] }) => {
    handleTempLayoutCreate(data);
    setShowLayoutForm(false);
  };

  const handleFileContentSubmit = async (files: FileWithPath[], names?: string[]) => {
    for (let i = 0; i < files.length; i++) {
      await createFileContent(files[i], names?.[i]);
    }
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
        return <BasicInfoStep formData={formData} setFormData={setFormData} errors={errors} />;

      case "layout":
        return (
          <LayoutSelectionStep
            createNewLayout={createNewLayout}
            setCreateNewLayout={setCreateNewLayout}
            layouts={layouts}
            selectedLayoutId={formData.layoutId}
            selectedLayout={selectedLayout}
            tempLayoutData={tempLayoutData}
            onLayoutSelect={handleLayoutSelect}
            onCreateLayoutClick={() => setShowLayoutForm(true)}
            errors={errors}
          />
        );

      case "content":
        return selectedLayout ? (
          <ContentAssignmentStep
            layout={selectedLayout}
            contents={contents}
            contentAssignments={formData.contentAssignments}
            onContentAssignmentChange={handleContentAssignmentWrapper}
            onContentReorder={handleContentReorder}
            onContentAddClick={() => setShowContentAddModal(true)}
            getContentDuration={getContentDuration}
          />
        ) : null;

      default:
        return null;
    }
  };

  const canGoNext = () => getCurrentStepIndex() < steps.length - 1;
  const canGoPrev = () => getCurrentStepIndex() > 0;

  const getModalSize = () => (currentStep === "content" ? "90%" : "lg");

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
          <StepNavigation steps={steps} currentStep={currentStep} />

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
