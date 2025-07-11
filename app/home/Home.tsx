import { ActionIcon, Alert, Badge, Button, Group, LoadingOverlay, Table, Tabs, Text } from "@mantine/core";
import {
  IconCalendar,
  IconEdit,
  IconExclamationCircle,
  IconFolderOpen,
  IconLayout,
  IconPlaylist,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useAtom } from "jotai";
import { useEffect } from "react";
import { LayoutCreateModal } from "~/components/LayoutCreateModal";
import { PlaylistCreateModal } from "~/components/PlaylistCreateModal";
import { useLayout } from "~/hooks/useLayout";
import { usePlaylist } from "~/hooks/usePlaylist";
import type { Region } from "~/schemas/layout";
import { layoutActionsAtom, layoutsAtom, layoutsErrorAtom, layoutsLoadingAtom } from "~/states/layout";
import { layoutCreateModalAtom, modalActionsAtom, playlistCreateModalAtom } from "~/states/modal";
import { playlistActionsAtom, playlistsAtom, playlistsErrorAtom, playlistsLoadingAtom } from "~/states/playlist";

export const Home = () => {
  const [playlists] = useAtom(playlistsAtom);
  const [loading] = useAtom(playlistsLoadingAtom);
  const [error] = useAtom(playlistsErrorAtom);
  const [createModalOpened] = useAtom(playlistCreateModalAtom);
  const [, dispatch] = useAtom(playlistActionsAtom);

  const [layouts] = useAtom(layoutsAtom);
  const [layoutsLoading] = useAtom(layoutsLoadingAtom);
  const [layoutsError] = useAtom(layoutsErrorAtom);
  const [layoutCreateModalOpened] = useAtom(layoutCreateModalAtom);
  const [, layoutDispatch] = useAtom(layoutActionsAtom);

  const [, modalDispatch] = useAtom(modalActionsAtom);
  const { getPlaylistsIndex, deletePlaylist, createPlaylist } = usePlaylist();
  const { getLayoutsIndex, deleteLayout, createLayout } = useLayout();

  // プレイリスト一覧を読み込み
  useEffect(() => {
    const loadPlaylists = async () => {
      dispatch({ type: "SET_LOADING", loading: true });
      dispatch({ type: "SET_ERROR", error: null });

      try {
        const playlistsData = await getPlaylistsIndex();
        dispatch({ type: "SET_PLAYLISTS", playlists: playlistsData });
      } catch (error) {
        dispatch({ type: "SET_ERROR", error: error instanceof Error ? error.message : "不明なエラーが発生しました" });
      } finally {
        dispatch({ type: "SET_LOADING", loading: false });
      }
    };

    loadPlaylists();
  }, [getPlaylistsIndex, dispatch]);

  // レイアウト一覧を読み込み
  useEffect(() => {
    const loadLayouts = async () => {
      layoutDispatch({ type: "SET_LOADING", loading: true });
      layoutDispatch({ type: "SET_ERROR", error: null });

      try {
        const layoutsData = await getLayoutsIndex();
        layoutDispatch({ type: "SET_LAYOUTS", layouts: layoutsData });
      } catch (error) {
        layoutDispatch({
          type: "SET_ERROR",
          error: error instanceof Error ? error.message : "不明なエラーが発生しました",
        });
      } finally {
        layoutDispatch({ type: "SET_LOADING", loading: false });
      }
    };

    loadLayouts();
  }, [getLayoutsIndex, layoutDispatch]);

  const handleEdit = (id: string) => {
    console.log("Edit playlist:", id);
    // TODO: 編集機能を実装
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このプレイリストを削除しますか？")) {
      return;
    }

    try {
      await deletePlaylist(id);
      dispatch({ type: "REMOVE_PLAYLIST", id });
    } catch (error) {
      dispatch({ type: "SET_ERROR", error: error instanceof Error ? error.message : "削除に失敗しました" });
    }
  };

  const handleCreate = () => {
    modalDispatch({ type: "OPEN_PLAYLIST_CREATE" });
  };

  const handleCreateSubmit = async (data: { name: string; device: string; materialCount: number }) => {
    try {
      const newPlaylist = await createPlaylist({
        name: data.name,
        materialCount: data.materialCount,
        device: data.device,
      });
      dispatch({ type: "ADD_PLAYLIST", playlist: newPlaylist });
    } catch (error) {
      dispatch({
        type: "SET_ERROR",
        error: error instanceof Error ? error.message : "プレイリストの作成に失敗しました",
      });
      throw error;
    }
  };

  const handleModalClose = () => {
    modalDispatch({ type: "CLOSE_PLAYLIST_CREATE" });
  };

  // レイアウト関連のハンドラー
  const handleLayoutEdit = (id: string) => {
    console.log("Edit layout:", id);
    // TODO: 編集機能を実装
  };

  const handleLayoutDelete = async (id: string) => {
    if (!confirm("このレイアウトを削除しますか？")) {
      return;
    }

    try {
      await deleteLayout(id);
      layoutDispatch({ type: "REMOVE_LAYOUT", id });
    } catch (error) {
      layoutDispatch({ type: "SET_ERROR", error: error instanceof Error ? error.message : "削除に失敗しました" });
    }
  };

  const handleLayoutCreate = () => {
    modalDispatch({ type: "OPEN_LAYOUT_CREATE" });
  };

  const handleLayoutCreateSubmit = async (data: {
    name: string;
    orientation: "portrait" | "landscape";
    regions: Region[];
  }) => {
    try {
      const newLayout = await createLayout({
        name: data.name,
        orientation: data.orientation,
        regions: data.regions,
      });
      // LayoutIndexの形式に変換して追加
      const layoutIndex = {
        id: newLayout.id,
        name: newLayout.name,
        orientation: newLayout.orientation,
        regionCount: newLayout.regions.length,
        createdAt: newLayout.createdAt,
        updatedAt: newLayout.updatedAt,
      };
      layoutDispatch({ type: "ADD_LAYOUT", layout: layoutIndex });
    } catch (error) {
      layoutDispatch({
        type: "SET_ERROR",
        error: error instanceof Error ? error.message : "レイアウトの作成に失敗しました",
      });
      throw error;
    }
  };

  const handleLayoutModalClose = () => {
    modalDispatch({ type: "CLOSE_LAYOUT_CREATE" });
  };

  return (
    <>
      <Tabs defaultValue="playlist">
        <Tabs.List>
          <Tabs.Tab value="playlist" leftSection={<IconPlaylist size={12} />}>
            プレイリスト
          </Tabs.Tab>
          <Tabs.Tab value="schedule" leftSection={<IconCalendar size={12} />}>
            スケジュール
          </Tabs.Tab>
          <Tabs.Tab value="layout" leftSection={<IconLayout size={12} />}>
            レイアウト
          </Tabs.Tab>
          <Tabs.Tab value="contents" leftSection={<IconFolderOpen size={12} />}>
            コンテンツ管理
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="playlist" pt="md" style={{ position: "relative" }}>
          <LoadingOverlay visible={loading} />

          {error && !error.includes("Failed to read JSON") && (
            <Alert icon={<IconExclamationCircle size={16} />} color="red" mb="md">
              {error}
            </Alert>
          )}

          <Group justify="flex-end" mb="md">
            <Button leftSection={<IconPlus size={16} />} onClick={handleCreate}>
              新しいプレイリストを作成
            </Button>
          </Group>

          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>操作</Table.Th>
                <Table.Th>名前</Table.Th>
                <Table.Th>素材数</Table.Th>
                <Table.Th>デバイス</Table.Th>
                <Table.Th>作成日時</Table.Th>
                <Table.Th>操作</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {playlists.length === 0 && !loading ? (
                <Table.Tr>
                  <Table.Td colSpan={6} style={{ textAlign: "center", color: "var(--mantine-color-dimmed)" }}>
                    プレイリストがありません
                  </Table.Td>
                </Table.Tr>
              ) : (
                playlists.map((playlist) => (
                  <Table.Tr key={playlist.id}>
                    <Table.Td>
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        size="sm"
                        onClick={() => handleEdit(playlist.id)}
                        aria-label="編集"
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500}>{playlist.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text>{playlist.materialCount}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text>{playlist.device}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text>{new Date(playlist.createdAt).toLocaleString("ja-JP")}</Text>
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={() => handleDelete(playlist.id)}
                        aria-label="削除"
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Tabs.Panel>

        <Tabs.Panel value="schedule">Schedule tab content</Tabs.Panel>

        <Tabs.Panel value="layout" pt="md" style={{ position: "relative" }}>
          <LoadingOverlay visible={layoutsLoading} />

          {layoutsError && !layoutsError.includes("Failed to read JSON") && (
            <Alert icon={<IconExclamationCircle size={16} />} color="red" mb="md">
              {layoutsError}
            </Alert>
          )}

          <Group justify="flex-end" mb="md">
            <Button leftSection={<IconPlus size={16} />} onClick={handleLayoutCreate}>
              新しいレイアウトを作成
            </Button>
          </Group>

          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>操作</Table.Th>
                <Table.Th>名前</Table.Th>
                <Table.Th>向き</Table.Th>
                <Table.Th>リージョン数</Table.Th>
                <Table.Th>作成日時</Table.Th>
                <Table.Th>操作</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {layouts.length === 0 && !layoutsLoading ? (
                <Table.Tr>
                  <Table.Td colSpan={6} style={{ textAlign: "center", color: "var(--mantine-color-dimmed)" }}>
                    レイアウトがありません
                  </Table.Td>
                </Table.Tr>
              ) : (
                layouts.map((layout) => (
                  <Table.Tr key={layout.id}>
                    <Table.Td>
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        size="sm"
                        onClick={() => handleLayoutEdit(layout.id)}
                        aria-label="編集"
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500}>{layout.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={layout.orientation === "landscape" ? "blue" : "green"} variant="light">
                        {layout.orientation === "landscape" ? "横向き" : "縦向き"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text>{layout.regionCount}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text>{new Date(layout.createdAt).toLocaleString("ja-JP")}</Text>
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={() => handleLayoutDelete(layout.id)}
                        aria-label="削除"
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Tabs.Panel>

        <Tabs.Panel value="contents">Contents tab content</Tabs.Panel>
      </Tabs>

      <PlaylistCreateModal opened={createModalOpened} onClose={handleModalClose} onSubmit={handleCreateSubmit} />

      <LayoutCreateModal
        opened={layoutCreateModalOpened}
        onClose={handleLayoutModalClose}
        onSubmit={handleLayoutCreateSubmit}
      />
    </>
  );
};
