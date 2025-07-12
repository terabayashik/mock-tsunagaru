import { Button, Group, Modal, NumberInput, Stack, TextInput } from "@mantine/core";
import { IconDeviceFloppy, IconX } from "@tabler/icons-react";
import { useState } from "react";

interface PlaylistFormData {
  name: string;
  device: string;
  materialCount: number;
}

interface PlaylistCreateModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<PlaylistFormData, "materialCount"> & { materialCount: number }) => Promise<void>;
}

export const PlaylistCreateModal = ({ opened, onClose, onSubmit }: PlaylistCreateModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PlaylistFormData>({
    name: "",
    device: "",
    materialCount: 0,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof PlaylistFormData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof PlaylistFormData, string>> = {};

    if (formData.name.trim().length === 0) {
      newErrors.name = "プレイリスト名は必須です";
    }
    if (formData.device.trim().length === 0) {
      newErrors.device = "デバイス名は必須です";
    }
    if (formData.materialCount < 0) {
      newErrors.materialCount = "素材数は0以上である必要があります";
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
        device: formData.device.trim(),
        materialCount: formData.materialCount,
      });
      setFormData({ name: "", device: "", materialCount: 0 });
      setErrors({});
      onClose();
    } catch (error) {
      console.error("プレイリスト作成エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: "", device: "", materialCount: 0 });
    setErrors({});
    onClose();
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="新しいプレイリストを作成" centered size="md">
      <form onSubmit={handleSubmit}>
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

          <NumberInput
            label="初期素材数"
            placeholder="0"
            min={0}
            value={formData.materialCount}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, materialCount: typeof value === "number" ? value : 0 }))
            }
            error={errors.materialCount}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" leftSection={<IconX size={16} />} onClick={handleClose} disabled={loading}>
              キャンセル
            </Button>
            <Button type="submit" leftSection={<IconDeviceFloppy size={16} />} loading={loading}>
              作成
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};
