import { ActionIcon, Alert, Badge, Box, Button, Group, LoadingOverlay, Table, Text } from "@mantine/core";
import { IconEdit, IconExclamationCircle, IconPlus, IconTrash } from "@tabler/icons-react";
import { useAtom } from "jotai";
import { useEffect } from "react";
import { LayoutCreateModal } from "~/components/modals/LayoutCreateModal";
import { useLayout } from "~/hooks/useLayout";
import type { Region } from "~/types/layout";
import { layoutActionsAtom, layoutsAtom, layoutsErrorAtom, layoutsLoadingAtom } from "~/states/layout";
import { layoutCreateModalAtom, modalActionsAtom } from "~/states/modal";

export default function LayoutPage() {
  const [layouts] = useAtom(layoutsAtom);
  const [layoutsLoading] = useAtom(layoutsLoadingAtom);
  const [layoutsError] = useAtom(layoutsErrorAtom);
  const [layoutCreateModalOpened] = useAtom(layoutCreateModalAtom);
  const [, layoutDispatch] = useAtom(layoutActionsAtom);
  const [, modalDispatch] = useAtom(modalActionsAtom);
  const { getLayoutsIndex, deleteLayout, createLayout } = useLayout();

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
    <Box pos="relative">
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
              <Table.Td colSpan={6} ta="center" c="dimmed">
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

      <LayoutCreateModal
        opened={layoutCreateModalOpened}
        onClose={handleLayoutModalClose}
        onSubmit={handleLayoutCreateSubmit}
      />
    </Box>
  );
}
