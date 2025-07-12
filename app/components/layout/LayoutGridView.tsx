import { SimpleGrid, Text } from "@mantine/core";
import { LayoutPreview } from "./LayoutPreview";
import type { LayoutIndex } from "~/types/layout";

interface LayoutGridViewProps {
  layouts: LayoutIndex[];
  loading: boolean;
  onLayoutClick?: (layout: LayoutIndex) => void;
  onLayoutEdit?: (layout: LayoutIndex) => void;
  onLayoutDelete?: (layout: LayoutIndex) => void;
}

export const LayoutGridView = ({ layouts, loading, onLayoutClick, onLayoutEdit, onLayoutDelete }: LayoutGridViewProps) => {
  if (loading) {
    return (
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} style={{ height: "200px", background: "#f8f9fa", borderRadius: "8px" }} />
        ))}
      </SimpleGrid>
    );
  }

  if (layouts.length === 0) {
    return (
      <Text ta="center" c="dimmed" mt="xl">
        レイアウトがありません
      </Text>
    );
  }

  return (
    <>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
        {layouts.map((layout) => (
          <LayoutPreview
            key={layout.id}
            layout={layout}
            onClick={() => onLayoutClick?.(layout)}
            onEdit={onLayoutEdit}
            onDelete={onLayoutDelete}
          />
        ))}
      </SimpleGrid>
      <Text ta="center" c="dimmed" mt="md" size="sm">
        全 {layouts.length} 件のレイアウトを表示しました
      </Text>
    </>
  );
};