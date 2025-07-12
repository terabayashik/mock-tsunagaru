import { Alert, Button, Container, Group, List, Paper, Stack, Text, Title } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconDatabaseOff, IconExclamationCircle, IconTrash } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { AuthGuard } from "~/components";
import { OPFSManager } from "~/utils/opfs";
import type { Route } from "./+types/Settings";

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: "設定 - Tsunagaru" }, { name: "description", content: "設定ページ" }];
};

interface StorageInfo {
  totalEntries: number;
  directories: string[];
  files: string[];
  estimatedSize?: number;
}

const Settings = () => {
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);

  const opfs = OPFSManager.getInstance();

  const loadStorageInfo = useCallback(async () => {
    try {
      setLoading(true);
      const info = await opfs.getStorageInfo();
      setStorageInfo(info);
    } catch (error) {
      console.error("Failed to load storage info:", error);
      notifications.show({
        title: "エラー",
        message: "ストレージ情報の読み込みに失敗しました",
        color: "red",
        icon: <IconExclamationCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  }, [opfs]);

  // ページ読み込み時にストレージ情報を取得
  useEffect(() => {
    loadStorageInfo();
  }, [loadStorageInfo]);

  const formatBytes = (bytes?: number): string => {
    if (!bytes) return "不明";
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  const handleClearOPFS = () => {
    modals.openConfirmModal({
      title: "OPFS データの完全削除",
      children: (
        <Stack gap="md">
          <Alert color="red" icon={<IconExclamationCircle size={16} />}>
            <Text size="sm" fw={500}>
              この操作は元に戻せません！
            </Text>
          </Alert>
          <Text size="sm">以下のデータがすべて削除されます：</Text>
          <List size="sm">
            <List.Item>すべてのプレイリスト</List.Item>
            <List.Item>すべてのレイアウト</List.Item>
            <List.Item>すべてのコンテンツファイル</List.Item>
            <List.Item>アプリケーションの設定</List.Item>
          </List>
          <Text size="sm" c="dimmed">
            現在の使用量: {formatBytes(storageInfo?.estimatedSize)} ({storageInfo?.totalEntries || 0} ファイル)
          </Text>
        </Stack>
      ),
      labels: { confirm: "すべて削除", cancel: "キャンセル" },
      confirmProps: { color: "red", leftSection: <IconTrash size={16} /> },
      onConfirm: performClearOPFS,
    });
  };

  const performClearOPFS = async () => {
    try {
      setClearing(true);

      await opfs.clearAll();

      notifications.show({
        title: "削除完了",
        message: "OPFSデータをすべて削除しました",
        color: "green",
        icon: <IconDatabaseOff size={16} />,
      });

      // ストレージ情報を再読み込み
      await loadStorageInfo();
    } catch (error) {
      console.error("Failed to clear OPFS:", error);
      notifications.show({
        title: "削除失敗",
        message: "データの削除中にエラーが発生しました",
        color: "red",
        icon: <IconExclamationCircle size={16} />,
      });
    } finally {
      setClearing(false);
    }
  };

  return (
    <AuthGuard>
      <Container size="lg">
        <Stack gap="lg">
          <Title order={1}>設定</Title>

          {/* ストレージ管理セクション */}
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Title order={2} size="h3">
                ストレージ管理
              </Title>

              <Alert color="blue" icon={<IconDatabaseOff size={16} />}>
                <Text size="sm">
                  このアプリケーションはブラウザのOPFS (Origin Private File System) を使用してデータを保存しています。
                </Text>
              </Alert>

              {loading ? (
                <Text size="sm" c="dimmed">
                  読み込み中...
                </Text>
              ) : storageInfo ? (
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" fw={500}>
                      使用容量:
                    </Text>
                    <Text size="sm">{formatBytes(storageInfo.estimatedSize)}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" fw={500}>
                      総ファイル数:
                    </Text>
                    <Text size="sm">{storageInfo.totalEntries}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" fw={500}>
                      ディレクトリ数:
                    </Text>
                    <Text size="sm">{storageInfo.directories.length}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" fw={500}>
                      ファイル数:
                    </Text>
                    <Text size="sm">{storageInfo.files.length}</Text>
                  </Group>
                </Stack>
              ) : (
                <Text size="sm" c="red">
                  ストレージ情報の読み込みに失敗しました
                </Text>
              )}

              <Group justify="space-between" mt="md">
                <Button variant="subtle" onClick={loadStorageInfo} loading={loading} size="sm">
                  情報を更新
                </Button>

                <Button
                  color="red"
                  variant="light"
                  leftSection={<IconTrash size={16} />}
                  onClick={handleClearOPFS}
                  loading={clearing}
                  disabled={loading}
                >
                  すべてのデータを削除
                </Button>
              </Group>
            </Stack>
          </Paper>

          {/* その他の設定セクション */}
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Title order={2} size="h3">
                アプリケーション設定
              </Title>
              <Text size="sm" c="dimmed">
                その他の設定項目は今後実装予定です。
              </Text>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </AuthGuard>
  );
};

export default Settings;
