import {
  Box,
  Button,
  ColorInput,
  Divider,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { memo, useEffect, useState } from "react";
import { ContentUsageDisplay } from "~/components/content/ContentUsageDisplay";
import { useContent } from "~/hooks/useContent";
import { type ContentIndex, FONT_FAMILIES, type RichTextContent } from "~/types/content";

interface ContentEditModalProps {
  opened: boolean;
  onClose: () => void;
  content: ContentIndex;
  onSubmit: (data: {
    id: string;
    name: string;
    tags: string[];
    richTextInfo?: RichTextContent;
    urlInfo?: { title?: string; description?: string };
  }) => Promise<void>;
}

// 定数
const DEFAULT_FONT_SIZE = 16;
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 200;

export const ContentEditModal = memo(({ opened, onClose, content, onSubmit }: ContentEditModalProps) => {
  const { getContentById } = useContent();
  const [loading, setLoading] = useState(false);

  // 基本情報
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");

  // リッチテキスト関連の状態（type === "rich-text"の場合のみ使用）
  const [richTextContent, setRichTextContent] = useState("");
  const [writingMode, setWritingMode] = useState<"horizontal" | "vertical">("horizontal");
  const [fontFamily, setFontFamily] = useState("Inter, sans-serif");
  const [textAlign, setTextAlign] = useState<"start" | "center" | "end">("start");
  const [color, setColor] = useState("#000000");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [scrollType, setScrollType] = useState<"none" | "horizontal" | "vertical">("none");
  const [scrollSpeed, setScrollSpeed] = useState(3);

  // URL情報（type === "url" or "youtube"の場合のみ使用）
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // モーダルが閉じられたときにローディング状態をリセット
  useEffect(() => {
    if (!opened) {
      setLoading(false);
    }
  }, [opened]);

  // contentが変更されたときに状態を初期化
  useEffect(() => {
    if (!content) return;

    setName(content.name);
    setTags(content.tags.join(", "));

    // 実際のコンテンツ詳細データを取得して初期化
    const loadContentDetails = async () => {
      try {
        const contentDetail = await getContentById(content.id);

        if (content.type === "rich-text" && contentDetail?.richTextInfo) {
          const {
            content: textContent,
            writingMode: mode,
            fontFamily: font,
            textAlign: align,
            color: textColor,
            backgroundColor: bgColor,
            fontSize: size,
            scrollType: scroll,
            scrollSpeed: speed,
          } = contentDetail.richTextInfo;

          setRichTextContent(textContent);
          setWritingMode(mode);
          setFontFamily(font);
          setTextAlign(align);
          setColor(textColor);
          setBackgroundColor(bgColor);
          setFontSize(size);
          setScrollType(scroll || "none");
          setScrollSpeed(speed || 3);
        } else if (content.type === "rich-text") {
          // フォールバック: リッチテキストのデフォルト値
          setRichTextContent("");
          setWritingMode("horizontal");
          setFontFamily("Inter, sans-serif");
          setTextAlign("start");
          setColor("#000000");
          setBackgroundColor("#ffffff");
          setFontSize(DEFAULT_FONT_SIZE);
          setScrollType("none");
          setScrollSpeed(3);
        } else if ((content.type === "url" || content.type === "youtube") && contentDetail?.urlInfo) {
          setTitle(contentDetail.urlInfo.title || "");
          setDescription(contentDetail.urlInfo.description || "");
        } else if (content.type === "url" || content.type === "youtube") {
          setTitle("");
          setDescription("");
        }
      } catch (error) {
        console.error("Failed to load content details:", error);
        // エラー時はデフォルト値を使用
        if (content.type === "rich-text") {
          setRichTextContent("");
          setWritingMode("horizontal");
          setFontFamily("Inter, sans-serif");
          setTextAlign("start");
          setColor("#000000");
          setBackgroundColor("#ffffff");
          setFontSize(DEFAULT_FONT_SIZE);
          setScrollType("none");
          setScrollSpeed(3);
        } else if (content.type === "url" || content.type === "youtube") {
          setTitle("");
          setDescription("");
        }
      }
    };

    loadContentDetails();
  }, [content, getContentById]);

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setLoading(true);
    try {
      const tagArray = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const submitData: Parameters<typeof onSubmit>[0] = {
        id: content.id,
        name: name.trim(),
        tags: tagArray,
      };

      // コンテンツタイプごとの追加データ
      if (content.type === "rich-text") {
        submitData.richTextInfo = {
          content: richTextContent.trim(),
          writingMode,
          fontFamily,
          textAlign,
          color,
          backgroundColor,
          fontSize,
          scrollType,
          scrollSpeed,
        };
      } else if (content.type === "url" || content.type === "youtube") {
        submitData.urlInfo = {
          title: title.trim() || undefined,
          description: description.trim() || undefined,
        };
      }

      await onSubmit(submitData);
      // onSubmitが成功した場合は、親コンポーネントがモーダルを閉じるのを待つ
      // ローディング状態はモーダルが閉じられるまで維持する
    } catch (error) {
      console.error("Content edit failed:", error);
      // エラー時のみローディング状態を解除
      setLoading(false);
    }
  };

  const canSubmit = name.trim().length > 0;

  const isRichText = content.type === "rich-text";
  const isUrl = content.type === "url" || content.type === "youtube";
  const isFileType = content.type === "video" || content.type === "image" || content.type === "text";

  return (
    <Modal opened={opened} onClose={handleClose} title="コンテンツを編集" centered size="lg">
      <Stack gap="md">
        {/* 基本情報 */}
        <TextInput
          label="コンテンツ名 *"
          placeholder="コンテンツの名前を入力してください"
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          required
          aria-required="true"
          aria-label="コンテンツ名入力"
        />

        <TextInput
          label="タグ"
          placeholder="タグをカンマ区切りで入力してください（例: タグ1, タグ2, タグ3）"
          value={tags}
          onChange={(event) => setTags(event.currentTarget.value)}
          aria-label="タグ入力"
        />

        {/* コンテンツタイプ情報 */}
        <Box>
          <Text size="sm" fw={500} mb="xs">
            コンテンツタイプ: {content.type}
          </Text>
        </Box>

        {/* ファイルタイプの場合 */}
        {isFileType && (
          <Box p="md" bg="#f8f9fa" style={{ borderRadius: "4px" }}>
            <Text size="sm" c="dimmed">
              ファイルコンテンツは名前とタグのみ編集可能です。
              {content.size && ` ファイルサイズ: ${formatFileSize(content.size)}`}
            </Text>
          </Box>
        )}

        {/* URLタイプの場合 */}
        {isUrl && (
          <Stack gap="md">
            <Box p="md" bg="#f8f9fa" style={{ borderRadius: "4px" }}>
              <Text size="sm" fw={500} mb="xs">
                URL情報
              </Text>
              {content.url && (
                <Text size="sm" c="dimmed" style={{ wordBreak: "break-all" }}>
                  URL: {content.url}
                </Text>
              )}
            </Box>

            <TextInput
              label="タイトル"
              placeholder="カスタムタイトル（省略可）"
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
            />

            <TextInput
              label="説明"
              placeholder="説明文（省略可）"
              value={description}
              onChange={(event) => setDescription(event.currentTarget.value)}
            />
          </Stack>
        )}

        {/* リッチテキストの場合 */}
        {isRichText && (
          <Stack gap="md">
            <Textarea
              label="テキストコンテンツ"
              placeholder="表示したいテキストを入力してください"
              required
              minRows={4}
              value={richTextContent}
              onChange={(event) => setRichTextContent(event.currentTarget.value)}
              aria-required="true"
              aria-label="テキストコンテンツ入力"
            />

            <Group grow>
              <Select
                label="書字方向"
                value={writingMode}
                onChange={(value) => setWritingMode(value as "horizontal" | "vertical")}
                data={[
                  { value: "horizontal", label: "横書き" },
                  { value: "vertical", label: "縦書き" },
                ]}
                aria-label="書字方向の選択"
              />

              <Select
                label="整列位置"
                value={textAlign}
                onChange={(value) => setTextAlign(value as "start" | "center" | "end")}
                data={
                  writingMode === "horizontal"
                    ? [
                        { value: "start", label: "左揃え" },
                        { value: "center", label: "中央揃え" },
                        { value: "end", label: "右揃え" },
                      ]
                    : [
                        { value: "start", label: "上揃え" },
                        { value: "center", label: "中央揃え" },
                        { value: "end", label: "下揃え" },
                      ]
                }
              />
            </Group>

            <Group grow>
              <Select
                label="フォント"
                value={fontFamily}
                onChange={(value) => setFontFamily(value || "Inter, sans-serif")}
                data={FONT_FAMILIES}
                searchable
              />

              <NumberInput
                label="フォントサイズ"
                value={fontSize}
                onChange={(value) => setFontSize(Number(value) || DEFAULT_FONT_SIZE)}
                min={MIN_FONT_SIZE}
                max={MAX_FONT_SIZE}
                suffix="px"
              />
            </Group>

            <Group grow>
              <ColorInput
                label="文字色"
                value={color}
                onChange={setColor}
                format="hex"
                swatches={["#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff"]}
              />

              <ColorInput
                label="背景色"
                value={backgroundColor}
                onChange={setBackgroundColor}
                format="hex"
                swatches={["#ffffff", "#000000", "#f5f5f5", "#e5e5e5", "#d4d4d4", "#a3a3a3", "#737373", "#525252"]}
              />
            </Group>

            <Group grow>
              <Select
                label="スクロール方向"
                value={scrollType}
                onChange={(value) => setScrollType(value as "none" | "horizontal" | "vertical")}
                data={[
                  { value: "none", label: "スクロールなし" },
                  { value: "horizontal", label: "横スクロール" },
                  { value: "vertical", label: "縦スクロール" },
                ]}
                aria-label="スクロール方向の選択"
              />

              <NumberInput
                label="スクロール速度"
                value={scrollSpeed}
                onChange={(value) => setScrollSpeed(Number(value) || 3)}
                min={1}
                max={10}
                disabled={scrollType === "none"}
                description="1: 遅い - 10: 速い"
              />
            </Group>

            {/* プレビュー */}
            <Box>
              <Text size="sm" fw={500} mb="xs">
                プレビュー
              </Text>
              <Box
                p="md"
                style={{
                  backgroundColor,
                  border: "1px solid #e5e5e5",
                  borderRadius: "4px",
                  minHeight: "100px",
                  writingMode: writingMode === "vertical" ? "vertical-rl" : "horizontal-tb",
                  textAlign,
                  fontFamily,
                  fontSize: `${fontSize}px`,
                  color,
                  display: "flex",
                  alignItems:
                    writingMode === "horizontal"
                      ? textAlign === "start"
                        ? "flex-start"
                        : textAlign === "center"
                          ? "center"
                          : "flex-end"
                      : "stretch",
                  justifyContent:
                    writingMode === "vertical"
                      ? textAlign === "start"
                        ? "flex-start"
                        : textAlign === "center"
                          ? "center"
                          : "flex-end"
                      : "stretch",
                }}
              >
                {richTextContent || "プレビューテキスト"}
              </Box>
            </Box>
          </Stack>
        )}

        {/* 使用状況 */}
        <Divider />
        <ContentUsageDisplay contentId={content.id} />

        {/* アクションボタン */}
        <Group justify="flex-end" mt="lg">
          <Button variant="subtle" onClick={handleClose} disabled={loading}>
            キャンセル
          </Button>
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            onClick={handleSubmit}
            loading={loading}
            disabled={!canSubmit}
          >
            保存
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
});

ContentEditModal.displayName = "ContentEditModal";

// ヘルパー関数
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
};
