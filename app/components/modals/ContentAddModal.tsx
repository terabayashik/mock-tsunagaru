import { Box, Button, Group, Modal, SegmentedControl, Stack, Text, TextInput } from "@mantine/core";
import { Dropzone, type FileWithPath } from "@mantine/dropzone";
import { IconCloudUpload, IconDeviceFloppy, IconFile, IconLink, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { ACCEPTED_MIME_TYPES } from "~/types/content";

interface ContentAddModalProps {
  opened: boolean;
  onClose: () => void;
  onFileSubmit: (files: FileWithPath[], names?: string[]) => Promise<void>;
  onUrlSubmit: (data: { url: string; name?: string; title?: string; description?: string }) => Promise<void>;
}

// 受け入れ可能なMIMEタイプを配列に変換
const getAllAcceptedMimeTypes = () => {
  return [...ACCEPTED_MIME_TYPES.video, ...ACCEPTED_MIME_TYPES.image, ...ACCEPTED_MIME_TYPES.text];
};

export const ContentAddModal = ({ opened, onClose, onFileSubmit, onUrlSubmit }: ContentAddModalProps) => {
  const [mode, setMode] = useState<"file" | "url">("file");
  const [loading, setLoading] = useState(false);

  // ファイルアップロード関連の状態
  const [selectedFiles, setSelectedFiles] = useState<FileWithPath[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);

  // URL追加関連の状態
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleClose = () => {
    if (loading) return;

    // 状態をリセット
    setMode("file");
    setSelectedFiles([]);
    setFileNames([]);
    setUrl("");
    setName("");
    setTitle("");
    setDescription("");

    onClose();
  };

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

  const handleFileSubmit = async () => {
    if (selectedFiles.length === 0) return;

    setLoading(true);
    try {
      await onFileSubmit(selectedFiles, fileNames);
      handleClose();
    } catch (error) {
      console.error("File upload failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!url.trim()) return;

    setLoading(true);
    try {
      await onUrlSubmit({
        url: url.trim(),
        name: name.trim() || undefined,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
      });
      handleClose();
    } catch (error) {
      console.error("URL content creation failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
  };

  const isFileMode = mode === "file";
  const canSubmit = isFileMode ? selectedFiles.length > 0 : url.trim().length > 0;

  return (
    <Modal opened={opened} onClose={handleClose} title="コンテンツを追加" centered size="lg">
      <Stack gap="md">
        {/* モード切り替え */}
        <SegmentedControl
          value={mode}
          onChange={(value) => setMode(value as "file" | "url")}
          data={[
            {
              label: (
                <Group gap="xs" justify="center">
                  <IconCloudUpload size={16} />
                  <Text size="sm">ファイル</Text>
                </Group>
              ),
              value: "file",
            },
            {
              label: (
                <Group gap="xs" justify="center">
                  <IconLink size={16} />
                  <Text size="sm">URL</Text>
                </Group>
              ),
              value: "url",
            },
          ]}
          fullWidth
        />

        {/* ファイルアップロードモード */}
        {isFileMode &&
          (selectedFiles.length === 0 ? (
            <Dropzone
              onDrop={handleFileDrop}
              accept={getAllAcceptedMimeTypes()}
              maxSize={500 * 1024 * 1024} // 500MB
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
                    動画、画像、テキストファイルをアップロードできます（最大500MB）
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
                <Group key={`${file.name}-${index}`} gap="sm" align="flex-start">
                  <IconFile size={20} />
                  <Box style={{ flex: 1 }}>
                    <TextInput
                      label="表示名"
                      value={fileNames[index] || ""}
                      onChange={(event) => handleFileNameChange(index, event.currentTarget.value)}
                      placeholder="ファイルの表示名を入力"
                      size="sm"
                    />
                    <Text size="xs" c="dimmed" mt="xs">
                      {file.name} ({formatFileSize(file.size)})
                    </Text>
                  </Box>
                </Group>
              ))}
              <Button
                variant="subtle"
                size="xs"
                onClick={() => {
                  setSelectedFiles([]);
                  setFileNames([]);
                }}
              >
                ファイル選択をやり直す
              </Button>
            </Stack>
          ))}

        {/* URL追加モード */}
        {!isFileMode && (
          <Stack gap="md">
            <TextInput
              label="URL *"
              placeholder="https://example.com"
              value={url}
              onChange={(event) => setUrl(event.currentTarget.value)}
              required
            />
            <TextInput
              label="表示名"
              placeholder="カスタム表示名（省略可）"
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
            />
            <TextInput
              label="タイトル"
              placeholder="コンテンツのタイトル（省略可）"
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
            />
            <TextInput
              label="説明"
              placeholder="コンテンツの説明（省略可）"
              value={description}
              onChange={(event) => setDescription(event.currentTarget.value)}
            />
          </Stack>
        )}

        {/* アクションボタン */}
        <Group justify="flex-end">
          <Button variant="subtle" onClick={handleClose} disabled={loading}>
            キャンセル
          </Button>
          <Button
            leftSection={isFileMode ? <IconDeviceFloppy size={16} /> : <IconLink size={16} />}
            onClick={isFileMode ? handleFileSubmit : handleUrlSubmit}
            loading={loading}
            disabled={!canSubmit}
          >
            {isFileMode ? "アップロード" : "URLを追加"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
