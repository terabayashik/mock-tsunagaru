import { Box, Paper, SimpleGrid, Text } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { useLayout } from "~/hooks/useLayout";
import type { LayoutIndex, LayoutItem } from "~/types/layout";

interface LayoutSelectionGridProps {
  layouts: LayoutIndex[];
  selectedLayoutId?: string;
  loading?: boolean;
  onLayoutSelect: (layout: LayoutIndex) => void;
}

// レイアウトエディターと同じ色設定
const REGION_COLORS = [
  { bg: "rgba(74, 144, 226, 0.2)", border: "#4a90e2" }, // 青
  { bg: "rgba(82, 196, 26, 0.2)", border: "#52c41a" }, // 緑
  { bg: "rgba(250, 173, 20, 0.2)", border: "#faad14" }, // オレンジ
  { bg: "rgba(245, 34, 45, 0.2)", border: "#f5222d" }, // 赤
];

// レイアウトエディターと同じ座標系定数
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

interface LayoutSelectionCardProps {
  layout: LayoutIndex;
  isSelected: boolean;
  onClick: () => void;
}

const LayoutSelectionCard = ({ layout, isSelected, onClick }: LayoutSelectionCardProps) => {
  const [layoutDetails, setLayoutDetails] = useState<LayoutItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [containerWidth, setContainerWidth] = useState(200);
  const containerRef = useRef<HTMLDivElement>(null);
  const { getLayoutById } = useLayout();

  // コンテナサイズを監視
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerWidth(rect.width);
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);

    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateSize);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const loadLayoutDetails = async () => {
      try {
        setLoading(true);
        const details = await getLayoutById(layout.id);
        setLayoutDetails(details);
      } catch (error) {
        console.error("Failed to load layout details:", error);
      } finally {
        setLoading(false);
      }
    };

    loadLayoutDetails();
  }, [layout.id, getLayoutById]);

  const previewWidth = containerWidth;
  const scale = previewWidth / CANVAS_WIDTH;
  const previewHeight = CANVAS_HEIGHT * scale;
  const totalHeight = Math.round(previewHeight) + 80; // プレビュー + 情報エリア

  const renderRegions = () => {
    if (!layoutDetails || loading) {
      return (
        <Box
          w="100%"
          h="100%"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f8f9fa",
            color: "#868e96",
            fontSize: "11px",
          }}
        >
          {loading ? "読み込み中..." : "プレビュー未対応"}
        </Box>
      );
    }

    return (
      <Box w="100%" h="100%" pos="relative" bg="#f8f9fa">
        {layoutDetails.regions.map((region, index) => {
          const colors = REGION_COLORS[index % REGION_COLORS.length];
          return (
            <Box
              key={region.id}
              pos="absolute"
              style={{
                left: `${region.x * scale}px`,
                top: `${region.y * scale}px`,
                width: `${region.width * scale}px`,
                height: `${region.height * scale}px`,
                backgroundColor: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: "2px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "8px",
                color: "white",
                fontWeight: 700,
                textShadow: "1px 1px 2px rgba(0,0,0,0.6)",
              }}
            >
              リージョン {index + 1}
            </Box>
          );
        })}
      </Box>
    );
  };

  const getOrientationBadgeColor = () => {
    switch (layout.orientation) {
      case "landscape":
        return "#228be6"; // 青
      case "portrait-right":
        return "#fa8c16"; // オレンジ
      case "portrait-left":
        return "#722ed1"; // 紫
      default:
        return "#40c057";
    }
  };

  return (
    <Paper
      ref={containerRef}
      withBorder
      p={0}
      w="100%"
      h={totalHeight}
      style={{
        cursor: "pointer",
        borderColor: isSelected ? "#228be6" : undefined,
        borderWidth: isSelected ? "2px" : "1px",
        backgroundColor: isSelected ? "#f0f8ff" : undefined,
        transition: "all 0.2s ease",
      }}
      onClick={onClick}
    >
      <Box pos="relative">
        {/* 選択インジケーター */}
        {isSelected && (
          <Box
            pos="absolute"
            top={4}
            right={4}
            style={{
              zIndex: 10,
              width: "20px",
              height: "20px",
              backgroundColor: "#228be6",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "10px",
              fontWeight: "bold",
            }}
          >
            ✓
          </Box>
        )}

        {/* レイアウトプレビュー */}
        <Box
          style={{
            height: `${previewHeight}px`,
            width: `${previewWidth}px`,
            overflow: "hidden",
            position: "relative",
          }}
        >
          {renderRegions()}
        </Box>
      </Box>

      {/* レイアウト情報 */}
      <Box p="xs" h="80px" style={{ overflow: "hidden" }}>
        <Text size="sm" fw={500} lineClamp={1} mb="xs">
          {layout.name}
        </Text>

        <Box style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <Text size="xs" c="dimmed">
            {new Date(layout.createdAt).toLocaleDateString("ja-JP")}
          </Text>
          <Text
            size="xs"
            style={{
              color: getOrientationBadgeColor(),
              fontWeight: 500,
            }}
          >
            {layout.orientation === "landscape"
              ? "横向き"
              : layout.orientation === "portrait-right"
                ? "縦向き(右)"
                : "縦向き(左)"}{" "}
            - {layout.regionCount}リージョン
          </Text>
        </Box>
      </Box>
    </Paper>
  );
};

export const LayoutSelectionGrid = ({
  layouts,
  selectedLayoutId,
  loading,
  onLayoutSelect,
}: LayoutSelectionGridProps) => {
  if (loading) {
    return (
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {Array.from({ length: 6 }, () => crypto.randomUUID()).map((id) => (
          <Box key={id} h="180px" bg="#f8f9fa" style={{ borderRadius: "8px" }} />
        ))}
      </SimpleGrid>
    );
  }

  if (layouts.length === 0) {
    return (
      <Paper p="xl" withBorder style={{ textAlign: "center" }}>
        <Text c="dimmed" mb="sm">
          利用可能なレイアウトがありません
        </Text>
        <Text size="sm" c="dimmed">
          新しいレイアウトを作成してください
        </Text>
      </Paper>
    );
  }

  return (
    <>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {layouts.map((layout) => (
          <LayoutSelectionCard
            key={layout.id}
            layout={layout}
            isSelected={selectedLayoutId === layout.id}
            onClick={() => onLayoutSelect(layout)}
          />
        ))}
      </SimpleGrid>
      <Text ta="center" c="dimmed" mt="md" size="sm">
        レイアウトを選択してください ({layouts.length} 件)
      </Text>
    </>
  );
};
