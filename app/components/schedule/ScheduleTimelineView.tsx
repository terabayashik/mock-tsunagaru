import { ActionIcon, Badge, Card, Group, Paper, SegmentedControl, Stack, Switch, Text, Tooltip } from "@mantine/core";
import { IconEdit, IconPlayerPlay, IconPower, IconReload, IconTrash } from "@tabler/icons-react";
import { useMemo } from "react";
import type { PlaylistIndex } from "~/types/playlist";
import type { ScheduleIndex } from "~/types/schedule";
import { EVENT_TYPE_LABELS } from "~/types/schedule";

interface ScheduleTimelineViewProps {
  schedules: ScheduleIndex[];
  playlists: PlaylistIndex[];
  viewMode: "day" | "week";
  onViewModeChange: (mode: "day" | "week") => void;
  onEdit: (schedule: ScheduleIndex) => void;
  onDelete: (schedule: ScheduleIndex) => void;
  onToggleEnabled: (schedule: ScheduleIndex) => void;
}

export function ScheduleTimelineView({
  schedules,
  playlists,
  viewMode,
  onViewModeChange,
  onEdit,
  onDelete,
  onToggleEnabled,
}: ScheduleTimelineViewProps) {
  // 時間帯・曜日別にスケジュールをグループ化
  const groupedSchedules = useMemo(() => {
    const groups: Record<string, ScheduleIndex[]> = {};

    schedules.forEach((schedule) => {
      const hour = Number.parseInt(schedule.time.split(":")[0], 10);
      schedule.weekdays.forEach((weekday) => {
        const key = `${hour}-${weekday}`;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(schedule);
      });
    });

    return groups;
  }, [schedules]);

  // 表示する時間範囲
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // 曜日リスト（週表示用）
  const weekDays = ["月", "火", "水", "木", "金", "土", "日"];
  const weekdayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "playlist":
        return <IconPlayerPlay size={16} />;
      case "power_on":
      case "power_off":
        return <IconPower size={16} />;
      case "reboot":
        return <IconReload size={16} />;
      default:
        return null;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case "playlist":
        return "blue";
      case "power_on":
        return "green";
      case "power_off":
        return "red";
      case "reboot":
        return "orange";
      default:
        return "gray";
    }
  };

  const renderScheduleItem = (schedule: ScheduleIndex) => {
    const playlist =
      schedule.eventType === "playlist" && schedule.playlistId
        ? playlists.find((p) => p.id === schedule.playlistId)
        : null;

    return (
      <Card
        key={schedule.id}
        padding="xs"
        radius="sm"
        withBorder
        opacity={schedule.enabled ? 1 : 0.5}
        className="cursor-pointer hover:shadow-sm transition-shadow"
      >
        <Stack gap="xs">
          <Group justify="space-between" wrap="nowrap">
            <Group gap="xs" wrap="nowrap">
              <Text size="sm" fw={600}>
                {schedule.time}
              </Text>
              <Badge
                size="sm"
                color={getEventColor(schedule.eventType)}
                leftSection={getEventIcon(schedule.eventType)}
                variant="light"
              >
                {EVENT_TYPE_LABELS[schedule.eventType]}
              </Badge>
            </Group>
            <Switch
              size="xs"
              checked={schedule.enabled}
              onChange={() => onToggleEnabled(schedule)}
              onClick={(e) => e.stopPropagation()}
            />
          </Group>

          <Text size="sm" lineClamp={1}>
            {schedule.name}
          </Text>

          {playlist && (
            <Text size="xs" c="dimmed">
              プレイリスト: {playlist.name}
            </Text>
          )}

          <Group gap="xs" justify="flex-end">
            <Tooltip label="編集">
              <ActionIcon
                size="sm"
                variant="subtle"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(schedule);
                }}
              >
                <IconEdit size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="削除">
              <ActionIcon
                size="sm"
                variant="subtle"
                color="red"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(schedule);
                }}
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Stack>
      </Card>
    );
  };

  if (viewMode === "week") {
    return (
      <Stack gap="md">
        <Group justify="space-between">
          <Text size="lg" fw={600}>
            週間タイムライン
          </Text>
          <SegmentedControl
            value={viewMode}
            onChange={(value) => onViewModeChange(value as "day" | "week")}
            data={[
              { label: "1日", value: "day" },
              { label: "1週間", value: "week" },
            ]}
          />
        </Group>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white p-2 text-sm font-semibold text-left border">時刻</th>
                {weekDays.map((day) => (
                  <th key={day} className="p-2 text-sm font-semibold text-center border min-w-[120px]">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hours.map((hour) => (
                <tr key={hour}>
                  <td className="sticky left-0 bg-white p-2 text-sm font-medium border">
                    {hour.toString().padStart(2, "0")}:00
                  </td>
                  {weekdayKeys.map((weekday, index) => {
                    const key = `${hour}-${weekday}`;
                    return (
                      <td key={weekday} className="p-2 border align-top">
                        <Stack gap="xs">{groupedSchedules[key]?.map((schedule) => renderScheduleItem(schedule))}</Stack>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Stack>
    );
  }

  // 1日表示
  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text size="lg" fw={600}>
          本日のタイムライン
        </Text>
        <SegmentedControl
          value={viewMode}
          onChange={(value) => onViewModeChange(value as "day" | "week")}
          data={[
            { label: "1日", value: "day" },
            { label: "1週間", value: "week" },
          ]}
        />
      </Group>

      <Stack gap="sm">
        {hours.map((hour) => {
          // 今日の曜日を取得（デモ用に月曜日として表示）
          const todayWeekday = "monday";
          const key = `${hour}-${todayWeekday}`;
          const hourSchedules = groupedSchedules[key] || [];

          return (
            <Paper key={hour} p="md" radius="sm" withBorder>
              <Group align="flex-start" gap="md">
                <Text size="sm" fw={600} className="min-w-[60px]">
                  {hour.toString().padStart(2, "0")}:00
                </Text>
                <div className="flex-1">
                  {hourSchedules.length > 0 ? (
                    <Stack gap="sm">{hourSchedules.map((schedule) => renderScheduleItem(schedule))}</Stack>
                  ) : (
                    <Text size="sm" c="dimmed">
                      スケジュールなし
                    </Text>
                  )}
                </div>
              </Group>
            </Paper>
          );
        })}
      </Stack>
    </Stack>
  );
}
