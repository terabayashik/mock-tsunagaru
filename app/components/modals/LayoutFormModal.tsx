import { Box, Button, Flex, Group, Modal, Select, Stack, Text, TextInput } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconDeviceFloppy, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { LayoutEditor } from "~/components/layout/LayoutEditor";
import type { Orientation, Region } from "~/types/layout";

interface LayoutFormData {
  name: string;
  orientation: Orientation;
  regions: Region[];
}

interface LayoutFormModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: LayoutFormData) => Promise<void>;
  title: string;
  submitButtonText: string;
  initialData?: Partial<LayoutFormData>;
}

export const LayoutFormModal = ({
  opened,
  onClose,
  onSubmit,
  title,
  submitButtonText,
  initialData,
}: LayoutFormModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<LayoutFormData>({
    name: "",
    orientation: "landscape",
    regions: [],
    ...initialData,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof LayoutFormData, string>>>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const initialFormDataRef = useRef<LayoutFormData | null>(null);

  // 初期データとモーダル状態を監視
  useEffect(() => {
    if (opened) {
      const initialFormData = {
        name: "",
        orientation: "landscape" as Orientation,
        regions: [],
        ...initialData,
      };
      setFormData(initialFormData);
      initialFormDataRef.current = initialFormData;
      setHasChanges(false);
      // 遅延を除去して即座に初期化完了とする
      setIsInitialized(true);
    } else {
      // モーダルが閉じられた時にリセット
      setIsInitialized(false);
      setFormData({
        name: "",
        orientation: "landscape",
        regions: [],
      });
      setHasChanges(false);
      initialFormDataRef.current = null;
    }
  }, [opened, initialData]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof LayoutFormData, string>> = {};

    if (formData.name.trim().length === 0) {
      newErrors.name = "レイアウト名は必須です";
    }
    if (formData.regions.length === 0) {
      newErrors.regions = "少なくとも1つのリージョンが必要です";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name: formData.name.trim(),
        orientation: formData.orientation,
        regions: formData.regions,
      });
      resetForm();
      onClose();
    } catch (error) {
      console.error("レイアウト操作エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", orientation: "landscape", regions: [] });
    setErrors({});
  };

  const handleClose = () => {
    if (hasChanges) {
      modals.openConfirmModal({
        title: "変更を破棄しますか？",
        children: <Text size="sm">保存されていない変更があります。本当に閉じてもよろしいですか？</Text>,
        labels: { confirm: "変更を破棄", cancel: "キャンセル" },
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

  const handleRegionsChange = (regions: Region[]) => {
    setFormData((prev) => ({ ...prev, regions }));
    // リージョンが追加された場合、エラーをクリア
    if (regions.length > 0 && errors.regions) {
      setErrors((prev) => ({ ...prev, regions: undefined }));
    }
    // 変更を検知
    checkForChanges({ ...formData, regions });
  };

  // フォームデータの変更をチェック
  const checkForChanges = (currentData: LayoutFormData) => {
    if (!initialFormDataRef.current) return;

    const hasNameChange = currentData.name !== initialFormDataRef.current.name;
    const hasOrientationChange = currentData.orientation !== initialFormDataRef.current.orientation;
    const hasRegionsChange = JSON.stringify(currentData.regions) !== JSON.stringify(initialFormDataRef.current.regions);

    setHasChanges(hasNameChange || hasOrientationChange || hasRegionsChange);
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={title}
      centered
      size="95%"
      styles={{
        content: {
          maxWidth: "1000px",
        },
      }}
    >
      <Flex gap="md" w="100%">
        {/* 左側: フォーム */}
        <Box component="form" onSubmit={handleSubmit} miw="300px" flex="0 0 auto">
          <Stack gap="md">
            <TextInput
              label="レイアウト名"
              placeholder="レイアウト名を入力してください"
              required
              value={formData.name}
              onChange={(e) => {
                const newData = { ...formData, name: e.target.value };
                setFormData(newData);
                checkForChanges(newData);
              }}
              error={errors.name}
              aria-required="true"
              aria-label="レイアウト名入力"
            />

            <Select
              label="向き"
              placeholder="向きを選択してください"
              required
              value={formData.orientation}
              onChange={(value) => {
                const newData = { ...formData, orientation: value as Orientation };
                setFormData(newData);
                checkForChanges(newData);
              }}
              data={[
                { value: "landscape", label: "横向き (1920x1080)" },
                { value: "portrait-right", label: "縦向き右回転 (1080x1920)" },
                { value: "portrait-left", label: "縦向き左回転 (1080x1920)" },
              ]}
              error={errors.orientation}
              aria-required="true"
              aria-label="画面向きの選択"
            />

            {errors.regions && (
              <Text c="red.6" size="sm">
                {errors.regions}
              </Text>
            )}

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" leftSection={<IconX size={16} />} onClick={handleClose} disabled={loading}>
                キャンセル
              </Button>
              <Button type="submit" leftSection={<IconDeviceFloppy size={16} />} loading={loading}>
                {submitButtonText}
              </Button>
            </Group>
          </Stack>
        </Box>

        {/* 右側: レイアウトエディター */}
        <Flex flex={1} justify="center" align="center">
          {isInitialized && (
            <LayoutEditor
              regions={formData.regions}
              onRegionsChange={handleRegionsChange}
              canvasWidth={600}
              canvasHeight={338}
            />
          )}
        </Flex>
      </Flex>
    </Modal>
  );
};
