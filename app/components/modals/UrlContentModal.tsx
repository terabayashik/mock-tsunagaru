import { Button, Group, Modal, Stack, Text, TextInput } from "@mantine/core";
import { IconDeviceFloppy, IconLink, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { isYouTubeUrl } from "~/types/content";

interface UrlContentModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: { url: string; name?: string; title?: string; description?: string }) => Promise<void>;
}

export const UrlContentModal = ({ opened, onClose, onSubmit }: UrlContentModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    url: "",
    name: "",
    title: "",
    description: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof typeof formData, string>> = {};

    // URL検証
    try {
      new URL(formData.url);
    } catch {
      newErrors.url = "有効なURLを入力してください";
    }

    // 名前が空の場合はURLをデフォルトとして使用
    if (!formData.name.trim() && !formData.title.trim()) {
      newErrors.name = "名前またはタイトルを入力してください";
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
        url: formData.url.trim(),
        name: formData.name.trim() || formData.title.trim() || formData.url.trim(),
        title: formData.title.trim() || undefined,
        description: formData.description.trim() || undefined,
      });
      handleClose();
    } catch (error) {
      console.error("URL コンテンツ作成エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      url: "",
      name: "",
      title: "",
      description: "",
    });
    setErrors({});
    onClose();
  };

  const handleUrlChange = (url: string) => {
    setFormData((prev) => ({ ...prev, url }));

    // URLが変更された時に自動でタイトルを設定
    if (url.trim()) {
      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace("www.", "");

        if (isYouTubeUrl(url)) {
          setFormData((prev) => ({
            ...prev,
            url,
            title: prev.title || "YouTube動画",
            name: prev.name || "YouTube動画",
          }));
        } else {
          setFormData((prev) => ({
            ...prev,
            url,
            title: prev.title || domain,
            name: prev.name || domain,
          }));
        }
      } catch {
        // 無効なURLの場合は何もしない
        setFormData((prev) => ({ ...prev, url }));
      }
    }
  };

  const isYouTube = formData.url && isYouTubeUrl(formData.url);

  return (
    <Modal opened={opened} onClose={handleClose} title="URLコンテンツを追加" centered size="md">
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label="URL"
            placeholder="https://example.com"
            required
            value={formData.url}
            onChange={(e) => handleUrlChange(e.target.value)}
            error={errors.url}
            leftSection={<IconLink size={16} />}
          />

          {isYouTube && (
            <Text size="sm" c="blue">
              📺 YouTubeの動画として登録されます
            </Text>
          )}

          <TextInput
            label="表示名"
            placeholder="コンテンツの表示名を入力"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            error={errors.name}
          />

          <TextInput
            label="タイトル（任意）"
            placeholder="コンテンツのタイトル"
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
          />

          <TextInput
            label="説明（任意）"
            placeholder="コンテンツの説明"
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" leftSection={<IconX size={16} />} onClick={handleClose} disabled={loading}>
              キャンセル
            </Button>
            <Button type="submit" leftSection={<IconDeviceFloppy size={16} />} loading={loading}>
              追加
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};
