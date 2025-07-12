import { ActionIcon, Alert, Box, Button, Group, LoadingOverlay, Table, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconEdit, IconExclamationCircle, IconPlus, IconTrash } from "@tabler/icons-react";
import { useAtom } from "jotai";
import { useEffect } from "react";
import { PlaylistCreateModal } from "~/components/modals/PlaylistCreateModal";
import { usePlaylist } from "~/hooks/usePlaylist";
import { modalActionsAtom, playlistCreateModalAtom } from "~/states/modal";
import { playlistActionsAtom, playlistsAtom, playlistsErrorAtom, playlistsLoadingAtom } from "~/states/playlist";

export default function PlaylistPage() {
  const [playlists] = useAtom(playlistsAtom);
  const [loading] = useAtom(playlistsLoadingAtom);
  const [error] = useAtom(playlistsErrorAtom);
  const [createModalOpened] = useAtom(playlistCreateModalAtom);
  const [, dispatch] = useAtom(playlistActionsAtom);
  const [, modalDispatch] = useAtom(modalActionsAtom);
  const { getPlaylistsIndex, deletePlaylist, createPlaylist } = usePlaylist();

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

  const handleEdit = (id: string) => {
    console.log("Edit playlist:", id);
    // TODO: 編集機能を実装
  };

  const handleDelete = async (id: string) => {
    modals.openConfirmModal({
      title: "プレイリストを削除",
      children: <Text size="sm">このプレイリストを削除しますか？この操作は元に戻せません。</Text>,
      labels: { confirm: "削除", cancel: "キャンセル" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deletePlaylist(id);
          dispatch({ type: "REMOVE_PLAYLIST", id });
        } catch (error) {
          dispatch({ type: "SET_ERROR", error: error instanceof Error ? error.message : "削除に失敗しました" });
        }
      },
    });
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

  return (
    <Box pos="relative">
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
              <Table.Td colSpan={6} ta="center" c="dimmed">
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

      <PlaylistCreateModal opened={createModalOpened} onClose={handleModalClose} onSubmit={handleCreateSubmit} />
    </Box>
  );
}
