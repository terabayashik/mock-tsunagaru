import { Box, Button, Flex, Group, Modal, Select, Stack, Text, TextInput } from "@mantine/core";
import { IconDeviceFloppy, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { LayoutEditor } from "~/components/LayoutEditor";
import type { Orientation, Region } from "~/schemas/layout";

interface LayoutFormData {
  name: string;
  orientation: Orientation;
  regions: Region[];
}

interface LayoutCreateModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: LayoutFormData) => Promise<void>;
}

export const LayoutCreateModal = ({ opened, onClose, onSubmit }: LayoutCreateModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<LayoutFormData>({
    name: "",
    orientation: "landscape",
    regions: [],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof LayoutFormData, string>>>({});

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
      setFormData({ name: "", orientation: "landscape", regions: [] });
      setErrors({});
      onClose();
    } catch (error) {
      console.error("レイアウト作成エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: "", orientation: "landscape", regions: [] });
    setErrors({});
    onClose();
  };

  const handleRegionsChange = (regions: Region[]) => {
    setFormData((prev) => ({ ...prev, regions }));
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="新しいレイアウトを作成"
      centered
      size="95%"
      styles={{
        body: {
          display: "flex",
          flexDirection: "row",
          gap: "1rem",
        },
        content: {
          maxWidth: "1200px",
        },
      }}
    >
      <Flex gap="1rem" w="100%">
        {/* 左側: フォーム */}
        <Box component="form" onSubmit={handleSubmit} miw="300px" style={{ flex: "0 0 auto" }}>
          <Stack gap="md">
            <TextInput
              label="レイアウト名"
              placeholder="レイアウト名を入力してください"
              required
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              error={errors.name}
            />

            <Select
              label="向き"
              placeholder="向きを選択してください"
              required
              value={formData.orientation}
              onChange={(value) => setFormData((prev) => ({ ...prev, orientation: value as Orientation }))}
              data={[
                { value: "landscape", label: "横向き (ランドスケープ)" },
                { value: "portrait", label: "縦向き (ポートレート)" },
              ]}
              error={errors.orientation}
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
                作成
              </Button>
            </Group>
          </Stack>
        </Box>

        {/* 右側: レイアウトエディター */}
        <Box style={{ flex: "1 1 auto" }} miw="600px">
          <LayoutEditor regions={formData.regions} onRegionsChange={handleRegionsChange} />
        </Box>
      </Flex>
    </Modal>
  );
};
