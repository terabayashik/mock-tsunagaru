import { Box, Group, Progress, Stack, Text } from "@mantine/core";
import type { RegionProgressInfo } from "./RegionPlayer";

interface PreviewInfoPanelProps {
  progressInfos: RegionProgressInfo[];
  playlistName: string;
}

export function PreviewInfoPanel({ progressInfos, playlistName }: PreviewInfoPanelProps) {
  // 全体の進行状況を計算
  const overallProgress =
    progressInfos.length > 0
      ? progressInfos.reduce((sum, info) => sum + info.totalProgress, 0) / progressInfos.length
      : 0;

  // 全体の残り時間を計算（最も時間がかかるリージョンの残り時間）
  const overallRemainingTime =
    progressInfos.length > 0 ? Math.max(...progressInfos.map((info) => info.remainingTime)) : 0;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Box w={300} p="md" style={{ borderLeft: "1px solid #e9ecef" }}>
      <Stack gap="lg">
        {/* プレイリスト全体の情報 */}
        <Box>
          <Text size="lg" fw={600} mb="xs">
            {playlistName}
          </Text>
          <Group justify="space-between" mb="xs">
            <Text size="sm" c="dimmed">
              全体の進行状況
            </Text>
            <Text size="sm" c="dimmed">
              残り {formatTime(overallRemainingTime)}
            </Text>
          </Group>
          <Progress value={overallProgress} size="lg" />
        </Box>

        {/* リージョン別の詳細情報 */}
        <Stack gap="md">
          <Text size="md" fw={500}>
            リージョン別進行状況
          </Text>

          {progressInfos.map((info, index) => (
            <Box
              key={info.regionId}
              p="sm"
              style={{
                backgroundColor: "#f8f9fa",
                borderRadius: "6px",
                border: "1px solid #e9ecef",
              }}
            >
              <Group justify="space-between" mb="xs">
                <Text size="sm" fw={500}>
                  リージョン {index + 1}
                </Text>
                <Text size="xs" c="dimmed">
                  {info.currentContentIndex + 1} / {info.regionId ? "複数" : "1"}
                </Text>
              </Group>

              <Text size="sm" mb="xs" truncate>
                {info.currentContentName}
              </Text>

              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed">
                  進行状況
                </Text>
                <Text size="xs" c="dimmed">
                  残り {formatTime(info.remainingTime)}
                </Text>
              </Group>

              <Progress value={info.totalProgress} size="sm" mb="xs" />

              {/* 現在のコンテンツの進行状況 */}
              <Group justify="space-between" mb="4">
                <Text size="xs" c="dimmed">
                  現在のコンテンツ
                </Text>
                <Text size="xs" c="dimmed">
                  {Math.round(info.currentContentProgress)}%
                </Text>
              </Group>
              <Progress value={info.currentContentProgress} size="xs" />
            </Box>
          ))}
        </Stack>

        {/* 統計情報 */}
        <Box
          style={{
            backgroundColor: "#e3f2fd",
            padding: "12px",
            borderRadius: "6px",
            border: "1px solid #bbdefb",
          }}
        >
          <Text size="sm" fw={500} mb="xs">
            統計情報
          </Text>
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              リージョン数
            </Text>
            <Text size="xs">{progressInfos.length}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              総コンテンツ数
            </Text>
            <Text size="xs">{progressInfos.reduce((sum, info) => sum + (info.currentContentIndex + 1), 0)}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              全体の進行率
            </Text>
            <Text size="xs">{Math.round(overallProgress)}%</Text>
          </Group>
        </Box>
      </Stack>
    </Box>
  );
}
