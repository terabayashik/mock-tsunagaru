import { Button, Group, Modal, Stack, Text, TextInput } from "@mantine/core";
import { Dropzone, type FileWithPath } from "@mantine/dropzone";
import { IconCloudUpload, IconDeviceFloppy, IconFile, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { ACCEPTED_MIME_TYPES } from "~/schemas/content";

interface FileUploadModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (files: FileWithPath[], names?: string[]) => Promise<void>;
}

// 受け入れ可能なMIMEタイプを配列に変換
const getAllAcceptedMimeTypes = () => {
  return [...ACCEPTED_MIME_TYPES.video, ...ACCEPTED_MIME_TYPES.image, ...ACCEPTED_MIME_TYPES.text];
};

export const FileUploadModal = ({ opened, onClose, onSubmit }: FileUploadModalProps) => {
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileWithPath[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);

  const handleFileDrop = (files: FileWithPath[]) => {
    setSelectedFiles(files);
    // ファイル名を初期化（オリジナルのファイル名から拡張子を除去）
    const names = files.map((file) => {
      const lastDotIndex = file.name.lastIndexOf(".");
      return lastDotIndex > 0 ? file.name.substring(0, lastDotIndex) : file.name;
    });
    setFileNames(names);
  };

  const handleFileNameChange = (index: number, name: string) => {
    setFileNames((prev) => {
      const newNames = [...prev];
      newNames[index] = name;
      return newNames;
    });
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) return;

    setLoading(true);
    try {
      await onSubmit(selectedFiles, fileNames);
      setSelectedFiles([]);
      setFileNames([]);
      onClose();
    } catch (error) {
      console.error("ファイルアップロードエラー:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedFiles([]);
    setFileNames([]);
    onClose();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="ファイルをアップロード" centered size="lg">
      <Stack gap="md">
        {selectedFiles.length === 0 ? (
          <Dropzone
            onDrop={handleFileDrop}
            accept={getAllAcceptedMimeTypes()}
            maxSize={100 * 1024 * 1024} // 100MB
            multiple
          >
            <Group justify="center" gap="xl" mih={220} style={{ pointerEvents: "none" }}>
              <Dropzone.Accept>
                <IconCloudUpload size={50} stroke={1.5} />
              </Dropzone.Accept>
              <Dropzone.Reject>
                <IconX size={50} stroke={1.5} />
              </Dropzone.Reject>
              <Dropzone.Idle>
                <IconCloudUpload size={50} stroke={1.5} />
              </Dropzone.Idle>

              <div>
                <Text size="xl" inline>
                  ファイルをドラッグ&ドロップするか、クリックして選択
                </Text>
                <Text size="sm" c="dimmed" inline mt={7}>
                  動画、画像、テキストファイルをアップロードできます（最大100MB）
                </Text>
              </div>
            </Group>
          </Dropzone>
        ) : (
          <Stack gap="sm">
            <Text size="sm" fw={500}>
              選択されたファイル ({selectedFiles.length}個)
            </Text>
            {selectedFiles.map((file, index) => (
              <Group key={`${file.name}-${index}`} gap="sm" style={{ alignItems: "flex-start" }}>
                <IconFile size={20} />
                <div style={{ flex: 1 }}>
                  <TextInput
                    label="表示名"
                    placeholder="ファイルの表示名を入力"
                    value={fileNames[index] || ""}
                    onChange={(e) => handleFileNameChange(index, e.target.value)}
                    required
                    size="sm"
                  />
                  <Text size="xs" c="dimmed" mt={2}>
                    {file.name} ({formatFileSize(file.size)})
                  </Text>
                </div>
              </Group>
            ))}
            <Button
              variant="light"
              size="sm"
              onClick={() => {
                setSelectedFiles([]);
                setFileNames([]);
              }}
            >
              ファイル選択をやり直す
            </Button>
          </Stack>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" leftSection={<IconX size={16} />} onClick={handleClose} disabled={loading}>
            キャンセル
          </Button>
          <Button
            type="submit"
            leftSection={<IconDeviceFloppy size={16} />}
            loading={loading}
            disabled={selectedFiles.length === 0 || fileNames.some((name) => !name.trim())}
            onClick={handleSubmit}
          >
            アップロード
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
