import { Button, Group, SegmentedControl, TextInput } from "@mantine/core";
import {
  IconBrandYoutube,
  IconFile,
  IconFileText,
  IconLink,
  IconPhoto,
  IconSearch,
  IconVideo,
  IconX,
} from "@tabler/icons-react";
import { useAtom } from "jotai";
import type { ContentType } from "~/schemas/content";
import { contentSearchQueryAtom, contentTypeFilterAtom } from "~/states/content";

export const ContentFilters = () => {
  const [typeFilter, setTypeFilter] = useAtom(contentTypeFilterAtom);
  const [searchQuery, setSearchQuery] = useAtom(contentSearchQueryAtom);

  const _getFilterIcon = (type: ContentType | "all") => {
    switch (type) {
      case "all":
        return <IconFile size={16} />;
      case "video":
        return <IconVideo size={16} />;
      case "image":
        return <IconPhoto size={16} />;
      case "text":
        return <IconFileText size={16} />;
      case "youtube":
        return <IconBrandYoutube size={16} />;
      case "url":
        return <IconLink size={16} />;
      default:
        return <IconFile size={16} />;
    }
  };

  const getFilterLabel = (type: ContentType | "all") => {
    switch (type) {
      case "all":
        return "すべて";
      case "video":
        return "動画";
      case "image":
        return "画像";
      case "text":
        return "テキスト";
      case "youtube":
        return "YouTube";
      case "url":
        return "URL";
      default:
        return "すべて";
    }
  };

  const filterOptions = [
    { value: "all", label: getFilterLabel("all") },
    { value: "video", label: getFilterLabel("video") },
    { value: "image", label: getFilterLabel("image") },
    { value: "text", label: getFilterLabel("text") },
    { value: "youtube", label: getFilterLabel("youtube") },
    { value: "url", label: getFilterLabel("url") },
  ];

  return (
    <Group gap="md" mb="md">
      <TextInput
        placeholder="コンテンツを検索..."
        leftSection={<IconSearch size={16} />}
        rightSection={
          searchQuery ? (
            <Button
              variant="subtle"
              size="xs"
              p={0}
              onClick={() => setSearchQuery("")}
              miw="auto" h="auto"
            >
              <IconX size={14} />
            </Button>
          ) : null
        }
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{ flex: 1 }} miw={200}
      />

      <SegmentedControl
        value={typeFilter}
        onChange={(value) => setTypeFilter(value as ContentType | "all")}
        data={filterOptions}
        size="sm"
      />
    </Group>
  );
};
