import { Box, Text } from "@mantine/core";
import type { CSSProperties } from "react";
import { memo, useEffect, useRef, useState } from "react";
import type { ContentItem, RichTextContent } from "~/types/content";
import { extractYouTubeVideoId } from "~/types/content";
import { logger } from "~/utils/logger";
import { OPFSManager } from "~/utils/storage/opfs";

interface ContentRendererProps {
  content: ContentItem;
  duration: number; // 秒単位
  onComplete?: () => void; // 再生完了時のコールバック
  onProgress?: (progress: number) => void; // 進捗更新時のコールバック（0-100）
  width: number;
  height: number;
}

export const ContentRenderer = memo(function ContentRenderer({
  content,
  duration,
  onComplete,
  onProgress,
  width,
  height,
}: ContentRendererProps) {
  const [, setProgress] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // プログレス更新とタイマー管理
  useEffect(() => {
    setProgress(0);

    if (content.type === "video" && videoRef.current) {
      // 動画の場合は動画の再生状況でプログレスを管理
      const video = videoRef.current;

      const handleTimeUpdate = () => {
        if (video.duration) {
          const progress = (video.currentTime / video.duration) * 100;
          setProgress(progress);
          onProgress?.(progress);
        }
      };

      const handleEnded = () => {
        setProgress(100);
        onProgress?.(100);
        onComplete?.();
      };

      video.addEventListener("timeupdate", handleTimeUpdate);
      video.addEventListener("ended", handleEnded);

      return () => {
        video.removeEventListener("timeupdate", handleTimeUpdate);
        video.removeEventListener("ended", handleEnded);
      };
    }
    // その他のコンテンツは設定時間でタイマー管理
    const startTime = Date.now();
    const updateProgress = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);
      onProgress?.(newProgress);

      if (newProgress >= 100) {
        onComplete?.();
      }
    };

    intervalRef.current = window.setInterval(updateProgress, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [content, duration, onComplete, onProgress]);

  // ファイルコンテンツのURL生成（無限ループを防ぐため、videoUrl/imageUrlを依存配列から除外）
  useEffect(() => {
    const loadFileUrl = async () => {
      if ((content.type === "video" || content.type === "image") && content.fileInfo) {
        try {
          const opfs = OPFSManager.getInstance();
          const fileData = await opfs.readFile(content.fileInfo.storagePath);
          const blob = new Blob([fileData], { type: content.fileInfo.mimeType });
          const url = URL.createObjectURL(blob);

          if (content.type === "video") {
            setVideoUrl(url);
          } else {
            setImageUrl(url);
          }
        } catch (error) {
          logger.error("ContentRenderer", `Failed to load file: ${content.fileInfo.storagePath}`, error);
        }
      }
    };

    // 状態をリセットしてから新しいファイルを読み込み
    setVideoUrl(null);
    setImageUrl(null);
    loadFileUrl();
  }, [content.type, content.fileInfo]);

  // URLのクリーンアップを別のuseEffectで管理
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [videoUrl, imageUrl]);

  const renderContent = () => {
    const commonStyle = {
      width: "100%",
      height: "100%",
      objectFit: "contain" as const,
    };

    switch (content.type) {
      case "video":
        return <video ref={videoRef} src={videoUrl || undefined} style={commonStyle} autoPlay muted playsInline loop />;

      case "image":
        return <img src={imageUrl || undefined} alt={content.name} style={commonStyle} />;

      case "rich-text":
        if (!content.richTextInfo) return null;
        return <RichTextRenderer richText={content.richTextInfo} width={width} height={height} />;

      case "youtube": {
        if (!content.urlInfo?.url) return null;
        const videoId = extractYouTubeVideoId(content.urlInfo.url);
        if (!videoId) return null;
        return (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&loop=1&playlist=${videoId}`}
            style={{ width: "100%", height: "100%", border: "none" }}
            allow="autoplay; encrypted-media"
            title={content.name}
          />
        );
      }

      case "url":
        if (!content.urlInfo?.url) return null;
        return (
          <iframe
            src={content.urlInfo.url}
            style={{ width: "100%", height: "100%", border: "none" }}
            title={content.name}
          />
        );

      default:
        return <Text>サポートされていないコンテンツタイプです</Text>;
    }
  };

  return <Box style={{ width, height, position: "relative", overflow: "hidden" }}>{renderContent()}</Box>;
});

// リッチテキスト表示コンポーネント
interface RichTextRendererProps {
  richText: RichTextContent;
  width: number;
  height: number;
}

function RichTextRenderer({ richText, width, height }: RichTextRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || richText.scrollType === "none") return;

    const scrollDistance =
      richText.scrollType === "horizontal" ? container.scrollWidth - width : container.scrollHeight - height;
    const scrollDuration = (scrollDistance / richText.scrollSpeed) * 1000; // スクロール速度に基づく

    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / scrollDuration, 1);

      if (richText.scrollType === "horizontal") {
        container.scrollLeft = progress * scrollDistance;
      } else {
        container.scrollTop = progress * scrollDistance;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [richText, width, height]);

  const textStyle: CSSProperties = {
    fontFamily: richText.fontFamily,
    fontSize: `${richText.fontSize}px`,
    color: richText.color,
    backgroundColor: richText.backgroundColor,
    textAlign: richText.textAlign,
    writingMode: richText.writingMode === "vertical" ? "vertical-rl" : ("horizontal-tb" as const),
    whiteSpace: richText.scrollType !== "none" ? "nowrap" : "pre-wrap",
    padding: "16px",
    width: richText.scrollType === "horizontal" ? "max-content" : "100%",
    height: richText.scrollType === "vertical" ? "max-content" : "100%",
    minHeight: "100%",
    display: "flex",
    alignItems: richText.scrollType === "none" ? "center" : "flex-start",
    justifyContent:
      richText.textAlign === "center" ? "center" : richText.textAlign === "end" ? "flex-end" : "flex-start",
  };

  return (
    <Box
      ref={containerRef}
      style={{
        width,
        height,
        overflow: richText.scrollType !== "none" ? "hidden" : "auto",
        backgroundColor: richText.backgroundColor,
      }}
    >
      <Box style={textStyle}>{richText.content}</Box>
    </Box>
  );
}
