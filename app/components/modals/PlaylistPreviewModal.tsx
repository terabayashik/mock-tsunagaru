import { Box, Button, LoadingOverlay, Modal, Stack, Text } from "@mantine/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLayout } from "~/hooks/useLayout";
import { usePlaylist } from "~/hooks/usePlaylist";
import type { LayoutItem } from "~/types/layout";
import type { PlaylistItem } from "~/types/playlist";
import { logger } from "~/utils/logger";
import { PreviewInfoPanel } from "../playlist/PreviewInfoPanel";
import { RegionPlayer, type RegionProgressInfo } from "../playlist/RegionPlayer";

interface PlaylistPreviewModalProps {
  opened: boolean;
  onClose: () => void;
  playlistId: string | null;
}

export function PlaylistPreviewModal({ opened, onClose, playlistId }: PlaylistPreviewModalProps) {
  const { getPlaylistById } = usePlaylist();
  const { getLayoutById } = useLayout();
  const [playlist, setPlaylist] = useState<PlaylistItem | null>(null);
  const [layout, setLayout] = useState<LayoutItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressInfos, setProgressInfos] = useState<RegionProgressInfo[]>([]);

  // プレイリストとレイアウト情報を読み込み
  useEffect(() => {
    const loadData = async () => {
      if (!playlistId) return;

      setLoading(true);
      setError(null);

      try {
        // プレイリスト情報を取得
        const playlistData = await getPlaylistById(playlistId);
        if (!playlistData) {
          throw new Error("プレイリストが見つかりません");
        }
        setPlaylist(playlistData);

        // レイアウト情報を取得
        const layoutData = await getLayoutById(playlistData.layoutId);
        if (!layoutData) {
          throw new Error("レイアウトが見つかりません");
        }
        setLayout(layoutData);

        // プログレス情報を初期化
        setProgressInfos([]);
      } catch (error) {
        logger.error("PlaylistPreviewModal", "Failed to load playlist data", error);
        setError(error instanceof Error ? error.message : "データの読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    };

    if (opened && playlistId) {
      loadData();
    }
  }, [opened, playlistId, getPlaylistById, getLayoutById]);

  // プログレス情報の更新ハンドラー（安定化）
  const handleProgressUpdate = useCallback((info: RegionProgressInfo) => {
    setProgressInfos((prev) => {
      const existingIndex = prev.findIndex((p) => p.regionId === info.regionId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = info;
        return updated;
      }
      return [...prev, info];
    });
  }, []);

  // レイアウトの向きに応じたキャンバスサイズを計算（メモ化）
  const canvasDimensions = useMemo(() => {
    if (!layout) return { width: 800, height: 600, scale: 1 };

    // レイアウトの実際のサイズを取得（ベースサイズ）
    const BASE_CANVAS_WIDTH = 1920;
    const BASE_CANVAS_HEIGHT = 1080;

    let layoutWidth: number;
    let layoutHeight: number;

    if (layout.orientation === "portrait-right" || layout.orientation === "portrait-left") {
      layoutWidth = BASE_CANVAS_HEIGHT; // 縦向きの場合は幅と高さを入れ替え
      layoutHeight = BASE_CANVAS_WIDTH;
    } else {
      layoutWidth = BASE_CANVAS_WIDTH;
      layoutHeight = BASE_CANVAS_HEIGHT;
    }

    // プレビューエリアの最大サイズ
    const maxPreviewWidth = 800;
    const maxPreviewHeight = 600;

    // スケールを計算（縦横比を保持）
    const scaleX = maxPreviewWidth / layoutWidth;
    const scaleY = maxPreviewHeight / layoutHeight;
    const scale = Math.min(scaleX, scaleY);

    return {
      width: layoutWidth * scale,
      height: layoutHeight * scale,
      scale,
    };
  }, [layout]);

  // リージョンプレイヤーのメモ化
  const regionPlayers = useMemo(() => {
    if (!layout || !playlist) return [];

    return layout.regions.map((region, index) => {
      const assignment = playlist.contentAssignments.find((a) => a.regionId === region.id);

      // スケールされたリージョンプロパティ
      const scaledRegion = {
        ...region,
        x: region.x * canvasDimensions.scale,
        y: region.y * canvasDimensions.scale,
        width: region.width * canvasDimensions.scale,
        height: region.height * canvasDimensions.scale,
      };

      if (!assignment) {
        return (
          <Box
            key={region.id}
            style={{
              position: "absolute",
              left: scaledRegion.x,
              top: scaledRegion.y,
              width: scaledRegion.width,
              height: scaledRegion.height,
              zIndex: region.zIndex,
              backgroundColor: "#f8f9fa",
              border: "2px dashed #dee2e6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              color: "#868e96",
            }}
          >
            リージョン {index + 1}
            <br />
            (コンテンツ未設定)
          </Box>
        );
      }

      return (
        <RegionPlayer key={region.id} region={scaledRegion} assignment={assignment} onProgress={handleProgressUpdate} />
      );
    });
  }, [layout, playlist, canvasDimensions.scale, handleProgressUpdate]);

  // モーダルクローズ時のクリーンアップ
  const handleClose = () => {
    setPlaylist(null);
    setLayout(null);
    setProgressInfos([]);
    setError(null);
    onClose();
  };

  if (!opened) return null;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="プレイリストプレビュー"
      size="calc(100vw - 40px)"
      styles={{
        content: { height: "calc(100vh - 80px)" },
        body: { height: "100%", padding: 0 },
      }}
    >
      <LoadingOverlay visible={loading} />

      <Box style={{ height: "100%", display: "flex" }}>
        {/* プレビューエリア */}
        <Box style={{ flex: 1, padding: "20px", overflow: "auto" }}>
          {error ? (
            <Stack align="center" justify="center" style={{ height: "100%" }}>
              <Text c="red">{error}</Text>
              <Button onClick={handleClose}>閉じる</Button>
            </Stack>
          ) : playlist && layout ? (
            <Box style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
              {/* プレビューキャンバス */}
              <Box
                style={{
                  position: "relative",
                  width: canvasDimensions.width,
                  height: canvasDimensions.height,
                  border: "2px solid #dee2e6",
                  borderRadius: "8px",
                  backgroundColor: "#ffffff",
                  overflow: "hidden",
                }}
              >
                {/* 各リージョンのプレイヤー（メモ化） */}
                {regionPlayers}
              </Box>
            </Box>
          ) : (
            <Stack align="center" justify="center" style={{ height: "100%" }}>
              <Text>プレイリストを読み込み中...</Text>
            </Stack>
          )}
        </Box>

        {/* 情報パネル */}
        {playlist && <PreviewInfoPanel progressInfos={progressInfos} playlistName={playlist.name} />}
      </Box>
    </Modal>
  );
}
