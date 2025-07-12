import { Box, Flex, SimpleGrid, Text } from "@mantine/core";
import { useViewportSize } from "@mantine/hooks";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ContentIndex } from "~/types/content";
import { ContentPreview } from "./ContentPreview";

interface ContentGridViewProps {
  contents: ContentIndex[];
  onContentClick?: (content: ContentIndex) => void;
  loading?: boolean;
}

interface GridConfig {
  cols: number;
  size: "sm" | "md" | "lg";
  spacing: string;
}

export const ContentGridView = ({ contents, onContentClick, loading = false }: ContentGridViewProps) => {
  const { width } = useViewportSize();
  const [visibleContents, setVisibleContents] = useState<ContentIndex[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // レスポンシブグリッド設定
  const getGridConfig = (viewportWidth: number): GridConfig => {
    if (viewportWidth >= 1200) {
      return { cols: 6, size: "sm", spacing: "md" };
    }
    if (viewportWidth >= 992) {
      return { cols: 5, size: "sm", spacing: "md" };
    }
    if (viewportWidth >= 768) {
      return { cols: 4, size: "sm", spacing: "sm" };
    }
    if (viewportWidth >= 576) {
      return { cols: 3, size: "sm", spacing: "sm" };
    }
    return { cols: 2, size: "sm", spacing: "xs" };
  };

  const gridConfig = getGridConfig(width);

  // 仮想スクロール用の初期読み込み数
  const INITIAL_LOAD = 24;
  const LOAD_MORE_COUNT = 12;

  useEffect(() => {
    // コンテンツが変更されたら初期化
    setVisibleContents(contents.slice(0, INITIAL_LOAD));
    setHasMore(contents.length > INITIAL_LOAD);
  }, [contents]);

  const loadMoreContents = useCallback(() => {
    const currentLength = visibleContents.length;
    const nextBatch = contents.slice(currentLength, currentLength + LOAD_MORE_COUNT);

    if (nextBatch.length > 0) {
      setVisibleContents((prev) => [...prev, ...nextBatch]);
    }

    if (currentLength + nextBatch.length >= contents.length) {
      setHasMore(false);
    }
  }, [contents, visibleContents.length]);

  useEffect(() => {
    // Intersection Observer設定
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMoreContents();
        }
      },
      {
        rootMargin: "100px", // 100px手前で読み込み開始
        threshold: 0.1,
      },
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, loadMoreContents]);

  const handleContentClick = (content: ContentIndex) => {
    if (onContentClick) {
      onContentClick(content);
    } else {
      // デフォルトの動作: URLの場合は新しいタブで開く
      if (content.type === "youtube" || content.type === "url") {
        if (content.url) {
          window.open(content.url, "_blank", "noopener,noreferrer");
        }
      }
    }
  };

  if (contents.length === 0 && !loading) {
    return (
      <Flex align="center" justify="center" mih="300px" ta="center">
        <div>
          <Text size="lg" c="dimmed" mb="sm">
            コンテンツがありません
          </Text>
          <Text size="sm" c="dimmed">
            ファイルをアップロードするか、URLを追加してください
          </Text>
        </div>
      </Flex>
    );
  }

  return (
    <Box>
      <SimpleGrid cols={gridConfig.cols} spacing={gridConfig.spacing} verticalSpacing={gridConfig.spacing}>
        {visibleContents.map((content) => (
          <ContentPreview
            key={content.id}
            content={content}
            size={gridConfig.size}
            onClick={() => handleContentClick(content)}
          />
        ))}
      </SimpleGrid>

      {/* 無限スクロール用のトリガー要素 */}
      {hasMore && (
        <Box ref={loadMoreRef} h="20px" mt="20px">
          <Text ta="center" size="sm" c="dimmed">
            {loading ? "読み込み中..." : ""}
          </Text>
        </Box>
      )}

      {/* ローディング中の追加コンテンツ表示 */}
      {loading && hasMore && (
        <SimpleGrid cols={gridConfig.cols} spacing={gridConfig.spacing} verticalSpacing={gridConfig.spacing} mt="md">
          {Array.from({ length: LOAD_MORE_COUNT }, (_, index) => (
            <Flex
              key={`loading-skeleton-${Date.now()}-${index}`}
              w={gridConfig.size === "sm" ? 150 : gridConfig.size === "md" ? 200 : 300}
              h={gridConfig.size === "sm" ? 100 : gridConfig.size === "md" ? 133 : 200}
              bg="gray.1"
              style={{ borderRadius: "4px" }}
              align="center"
              justify="center"
            >
              <Text size="xs" c="dimmed">
                読み込み中...
              </Text>
            </Flex>
          ))}
        </SimpleGrid>
      )}

      {/* 全件表示完了メッセージ */}
      {!hasMore && visibleContents.length > 0 && (
        <Box mt="xl" mb="md">
          <Text ta="center" size="sm" c="dimmed">
            全 {contents.length} 件のコンテンツを表示しました
          </Text>
        </Box>
      )}
    </Box>
  );
};
