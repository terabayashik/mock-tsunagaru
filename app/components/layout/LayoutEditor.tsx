import {
  ActionIcon,
  Box,
  Button,
  Group,
  NumberInput,
  Popover,
  Stack,
  Switch,
  Text,
  useMantineColorScheme,
} from "@mantine/core";
import { IconEdit, IconPlus, IconTrash, IconX } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Moveable from "react-moveable";
import type { Region } from "~/types/layout";

interface LayoutEditorProps {
  regions: Region[];
  onRegionsChange: (regions: Region[]) => void;
  canvasWidth?: number;
  canvasHeight?: number;
}

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const GRID_SIZE = 20;
const GRID_LINE_SPACING = 60; // グリッドライン間隔（仮想座標系での60px）

// リージョンの色設定
const REGION_COLORS = [
  { bg: "rgba(74, 144, 226, 0.2)", border: "#4a90e2", bgSelected: "rgba(74, 144, 226, 0.3)" }, // 青
  { bg: "rgba(82, 196, 26, 0.2)", border: "#52c41a", bgSelected: "rgba(82, 196, 26, 0.3)" }, // 緑
  { bg: "rgba(250, 173, 20, 0.2)", border: "#faad14", bgSelected: "rgba(250, 173, 20, 0.3)" }, // オレンジ
  { bg: "rgba(245, 34, 45, 0.2)", border: "#f5222d", bgSelected: "rgba(245, 34, 45, 0.3)" }, // 赤
];

// グリッドにスナップする関数
const snapToGrid = (value: number, gridSize: number = GRID_SIZE): number => {
  return Math.round(value / gridSize) * gridSize;
};

// リージョンの色を取得する関数
const getRegionColor = (regionIndex: number, isSelected = false) => {
  const color = REGION_COLORS[regionIndex % REGION_COLORS.length];
  return {
    backgroundColor: isSelected ? color.bgSelected : color.bg,
    borderColor: color.border,
  };
};

// グリッドラインを生成する関数
const generateGridLines = (canvasWidth: number, canvasHeight: number, scale: number, isDark: boolean) => {
  const lines = [];
  const gridColor = isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.1)";

  // 縦のグリッドライン
  for (let x = 0; x <= CANVAS_WIDTH; x += GRID_LINE_SPACING) {
    lines.push(
      <div
        key={`vertical-${x}`}
        style={{
          position: "absolute",
          left: x * scale,
          top: 0,
          width: "1px",
          height: canvasHeight,
          backgroundColor: gridColor,
          pointerEvents: "none",
        }}
      />,
    );
  }

  // 横のグリッドライン
  for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_LINE_SPACING) {
    lines.push(
      <div
        key={`horizontal-${y}`}
        style={{
          position: "absolute",
          left: 0,
          top: y * scale,
          width: canvasWidth,
          height: "1px",
          backgroundColor: gridColor,
          pointerEvents: "none",
        }}
      />,
    );
  }

  return lines;
};

export const LayoutEditor = ({ regions, onRegionsChange, canvasWidth, canvasHeight }: LayoutEditorProps) => {
  const { colorScheme } = useMantineColorScheme();
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [editingRegion, setEditingRegion] = useState<string | null>(null);
  const [tempValues, setTempValues] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [containerSize, setContainerSize] = useState({ width: 600, height: 338 });
  const [freeTransform, setFreeTransform] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [_dragStartSelection, setDragStartSelection] = useState<string | null>(null);
  const [hasActuallyDragged, setHasActuallyDragged] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const outerContainerRef = useRef<HTMLDivElement>(null);

  // コンテナサイズを監視（固定サイズが指定されていない場合のみ）
  useEffect(() => {
    // 固定サイズが指定されている場合は動的サイズ計算をスキップ
    if (canvasWidth && canvasHeight) {
      return;
    }

    const updateSize = () => {
      if (outerContainerRef.current) {
        const rect = outerContainerRef.current.getBoundingClientRect();
        // Stackコンテナの幅をそのまま使用（パディングは既に計算済み）
        const availableWidth = rect.width;
        const aspectRatio = CANVAS_HEIGHT / CANVAS_WIDTH;
        const calculatedHeight = availableWidth * aspectRatio;

        setContainerSize({
          width: availableWidth,
          height: Math.min(calculatedHeight, 500), // 最大高さ制限
        });
      }
    };

    // ResizeObserverを使用して即座にサイズ検出
    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    if (outerContainerRef.current) {
      resizeObserver.observe(outerContainerRef.current);
      // 初期サイズを即座に設定
      updateSize();
    }

    window.addEventListener("resize", updateSize);
    return () => {
      window.removeEventListener("resize", updateSize);
      resizeObserver.disconnect();
    };
  }, [canvasWidth, canvasHeight]);

  // 提供されたサイズまたは動的サイズを使用
  const actualCanvasWidth = canvasWidth || containerSize.width;
  const actualCanvasHeight = canvasHeight || containerSize.height;

  // スケール計算 - コンテナの幅を最大限活用
  const scaleByWidth = actualCanvasWidth / CANVAS_WIDTH;
  const heightByWidth = CANVAS_HEIGHT * scaleByWidth;

  // 高さ制限がある場合は高さベースでも計算
  const scaleByHeight = actualCanvasHeight / CANVAS_HEIGHT;
  const _widthByHeight = CANVAS_WIDTH * scaleByHeight;

  // 両方の制約内に収まる最大スケールを選択
  const scale = heightByWidth <= actualCanvasHeight ? scaleByWidth : scaleByHeight;

  // 実際の表示サイズ
  const displayWidth = CANVAS_WIDTH * scale;
  const displayHeight = CANVAS_HEIGHT * scale;

  const updateRegion = useCallback(
    (id: string, updates: Partial<Region>) => {
      const updatedRegions = regions.map((region) => (region.id === id ? { ...region, ...updates } : region));
      onRegionsChange(updatedRegions);
    },
    [regions, onRegionsChange],
  );

  const addRegion = useCallback(() => {
    if (regions.length >= 4) return;

    const newRegion: Region = {
      id: crypto.randomUUID(),
      x: 100,
      y: 100,
      width: 960,
      height: 540,
    };

    onRegionsChange([...regions, newRegion]);
  }, [regions, onRegionsChange]);

  const deleteRegion = useCallback(
    (id: string) => {
      onRegionsChange(regions.filter((region) => region.id !== id));
      setSelectedRegion(null);
      setEditingRegion(null);
    },
    [regions, onRegionsChange],
  );

  const handleEditOpen = (region: Region) => {
    setEditingRegion(region.id);
    setTempValues({
      x: region.x,
      y: region.y,
      width: region.width,
      height: region.height,
    });
  };

  const handleEditSave = () => {
    if (!editingRegion) return;

    updateRegion(editingRegion, tempValues);
    setEditingRegion(null);
  };

  const handleEditCancel = () => {
    setEditingRegion(null);
  };

  const selectedRegionData = selectedRegion ? regions.find((r) => r.id === selectedRegion) : null;

  return (
    <Stack gap="md" ref={outerContainerRef}>
      <Group justify="space-between">
        <Text size="sm" fw={500}>
          レイアウトエディター (1920×1080)
        </Text>
        <Group gap="md">
          <Switch
            label="無段階変形"
            size="sm"
            checked={freeTransform}
            onChange={(event) => setFreeTransform(event.currentTarget.checked)}
          />
          <Button leftSection={<IconPlus size={16} />} size="xs" onClick={addRegion} disabled={regions.length >= 4}>
            リージョン矩形を追加 ({regions.length}/4)
          </Button>
        </Group>
      </Group>

      <div
        ref={containerRef}
        role="application"
        style={{
          position: "relative",
          width: displayWidth,
          height: displayHeight,
          border: `2px solid ${colorScheme === "dark" ? "var(--mantine-color-dark-4)" : "var(--mantine-color-gray-4)"}`,
          backgroundColor: colorScheme === "dark" ? "var(--mantine-color-dark-7)" : "var(--mantine-color-gray-0)",
          overflow: "hidden",
        }}
        onClick={() => setSelectedRegion(null)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            setSelectedRegion(null);
          }
        }}
      >
        {/* グリッドライン */}
        {generateGridLines(displayWidth, displayHeight, scale, colorScheme === "dark")}

        {regions.map((region, index) => {
          const isSelected = selectedRegion === region.id;
          const colors = getRegionColor(index, isSelected);

          return (
            <div key={region.id}>
              {/* 矩形 */}
              <button
                type="button"
                id={`region-${region.id}`}
                style={{
                  position: "absolute",
                  left: region.x * scale,
                  top: region.y * scale,
                  width: region.width * scale,
                  height: region.height * scale,
                  backgroundColor: colors.backgroundColor,
                  border: isSelected ? `2px solid ${colors.borderColor}` : `1px solid ${colors.borderColor}`,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  // 実際にドラッグが発生しなかった場合のみ選択/選択解除を処理
                  if (!isDragging && !hasActuallyDragged) {
                    // 既に選択されている場合は選択解除、そうでなければ選択
                    if (selectedRegion === region.id) {
                      setSelectedRegion(null);
                    } else {
                      setSelectedRegion(region.id);
                    }
                  }
                }}
              >
                <Text
                  size="xs"
                  c={colorScheme === "dark" ? "white" : "white"}
                  fw={700}
                  style={{
                    textShadow: colorScheme === "dark" ? "1px 1px 2px rgba(0,0,0,0.8)" : "1px 1px 2px rgba(0,0,0,0.6)",
                  }}
                >
                  リージョン {index + 1}
                </Text>

                {/* 編集ボタン */}
                <Box pos="absolute" top={4} right={4}>
                  <Group gap={2}>
                    <Popover
                      opened={editingRegion === region.id}
                      onClose={handleEditCancel}
                      position="bottom-end"
                      withArrow
                    >
                      <Popover.Target>
                        <ActionIcon
                          size="xs"
                          variant="filled"
                          color="blue"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditOpen(region);
                          }}
                        >
                          <IconEdit size={10} />
                        </ActionIcon>
                      </Popover.Target>
                      <Popover.Dropdown>
                        <Stack gap="xs" miw={200} pos="relative">
                          {/* 閉じるボタン */}
                          <ActionIcon
                            size="xs"
                            variant="subtle"
                            color="gray"
                            onClick={handleEditCancel}
                            style={{
                              position: "absolute",
                              top: "4px",
                              right: "4px",
                              zIndex: 10,
                            }}
                          >
                            <IconX size={12} />
                          </ActionIcon>

                          <Text size="sm" fw={500}>
                            位置とサイズ
                          </Text>
                          <Group gap="xs">
                            <NumberInput
                              label="X"
                              size="xs"
                              min={0}
                              max={CANVAS_WIDTH - tempValues.width}
                              value={tempValues.x}
                              onChange={(value) => setTempValues((prev) => ({ ...prev, x: Number(value) || 0 }))}
                            />
                            <NumberInput
                              label="Y"
                              size="xs"
                              min={0}
                              max={CANVAS_HEIGHT - tempValues.height}
                              value={tempValues.y}
                              onChange={(value) => setTempValues((prev) => ({ ...prev, y: Number(value) || 0 }))}
                            />
                          </Group>
                          <Group gap="xs">
                            <NumberInput
                              label="幅"
                              size="xs"
                              min={1}
                              max={CANVAS_WIDTH - tempValues.x}
                              value={tempValues.width}
                              onChange={(value) => setTempValues((prev) => ({ ...prev, width: Number(value) || 1 }))}
                            />
                            <NumberInput
                              label="高さ"
                              size="xs"
                              min={1}
                              max={CANVAS_HEIGHT - tempValues.y}
                              value={tempValues.height}
                              onChange={(value) => setTempValues((prev) => ({ ...prev, height: Number(value) || 1 }))}
                            />
                          </Group>
                          <Group gap="xs" mt="xs">
                            <Button size="xs" onClick={handleEditSave}>
                              保存
                            </Button>
                            <Button size="xs" variant="light" onClick={handleEditCancel}>
                              キャンセル
                            </Button>
                          </Group>
                        </Stack>
                      </Popover.Dropdown>
                    </Popover>

                    <ActionIcon
                      size="xs"
                      variant="filled"
                      color="red"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRegion(region.id);
                      }}
                    >
                      <IconTrash size={10} />
                    </ActionIcon>
                  </Group>
                </Box>
              </button>

              {/* Moveable - 常に有効、選択時のみリサイズハンドルを表示 */}
              <Moveable
                target={`#region-${region.id}`}
                container={containerRef.current}
                draggable
                resizable={selectedRegion === region.id}
                keepRatio={false}
                throttleDrag={0}
                throttleResize={0}
                onDragStart={() => {
                  // ドラッグ開始時の選択状態を記録するが、まだ選択状態は変更しない
                  setDragStartSelection(selectedRegion);
                  setIsDragging(true);
                  setHasActuallyDragged(false);
                }}
                onDrag={(e) => {
                  // 実際にドラッグが開始された時点で選択状態にする
                  if (!hasActuallyDragged) {
                    setHasActuallyDragged(true);
                    setSelectedRegion(region.id);
                  }

                  const rawX = e.left / scale;
                  const rawY = e.top / scale;
                  const newX = freeTransform
                    ? Math.max(0, Math.min(CANVAS_WIDTH - region.width, Math.round(rawX)))
                    : Math.max(0, Math.min(CANVAS_WIDTH - region.width, snapToGrid(rawX)));
                  const newY = freeTransform
                    ? Math.max(0, Math.min(CANVAS_HEIGHT - region.height, Math.round(rawY)))
                    : Math.max(0, Math.min(CANVAS_HEIGHT - region.height, snapToGrid(rawY)));

                  e.target.style.left = `${newX * scale}px`;
                  e.target.style.top = `${newY * scale}px`;

                  // リアルタイム更新
                  updateRegion(region.id, { x: newX, y: newY });
                }}
                onDragEnd={() => {
                  // ドラッグ終了時にフラグをリセット（選択状態は維持）
                  setIsDragging(false);
                  setDragStartSelection(null);
                  setHasActuallyDragged(false);
                }}
                onResizeStart={() => {
                  // リサイズ開始時に自動選択（既に選択されているはずだが念のため）
                  setSelectedRegion(region.id);
                }}
                onResize={(e) => {
                  const rawWidth = e.width / scale;
                  const rawHeight = e.height / scale;
                  const newWidth = freeTransform
                    ? Math.max(1, Math.min(CANVAS_WIDTH - region.x, Math.round(rawWidth)))
                    : Math.max(GRID_SIZE, Math.min(CANVAS_WIDTH - region.x, snapToGrid(rawWidth)));
                  const newHeight = freeTransform
                    ? Math.max(1, Math.min(CANVAS_HEIGHT - region.y, Math.round(rawHeight)))
                    : Math.max(GRID_SIZE, Math.min(CANVAS_HEIGHT - region.y, snapToGrid(rawHeight)));

                  e.target.style.width = `${newWidth * scale}px`;
                  e.target.style.height = `${newHeight * scale}px`;

                  // リアルタイム更新
                  updateRegion(region.id, { width: newWidth, height: newHeight });
                }}
                onResizeEnd={() => {
                  // リアルタイム更新により不要
                }}
              />
            </div>
          );
        })}
      </div>

      {/* 選択中のリージョン情報 - 固定高さ */}
      <div
        style={{
          height: "40px",
          padding: "8px 12px",
          backgroundColor: selectedRegionData
            ? colorScheme === "dark"
              ? "var(--mantine-color-blue-9)"
              : "var(--mantine-color-blue-0)"
            : colorScheme === "dark"
              ? "var(--mantine-color-dark-6)"
              : "var(--mantine-color-gray-0)",
          borderRadius: "4px",
          fontSize: "12px",
          display: "flex",
          alignItems: "center",
          border: `1px solid ${colorScheme === "dark" ? "var(--mantine-color-dark-4)" : "var(--mantine-color-gray-3)"}`,
        }}
      >
        <Text size="xs" fw={500} c={selectedRegionData ? undefined : "dimmed"}>
          {selectedRegionData
            ? `リージョン ${regions.findIndex((r) => r.id === selectedRegionData.id) + 1}: X:${selectedRegionData.x}, Y:${selectedRegionData.y}, 幅:${selectedRegionData.width}, 高さ:${selectedRegionData.height}`
            : "リージョンを選択してください"}
        </Text>
      </div>
    </Stack>
  );
};
