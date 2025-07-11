import { Container, Paper, Stack, Text, Title } from "@mantine/core";
import { AuthGuard } from "~/components";
import type { Route } from "./+types/settings";

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: "設定 - Tsunagaru" }, { name: "description", content: "設定ページ" }];
};

const Settings = () => {
  return (
    <AuthGuard>
      <Container size="lg">
        <Stack gap="lg">
          <Title order={1}>設定</Title>
          <Paper p="md" withBorder>
            <Text>設定ページのコンテンツはここに実装されます。</Text>
          </Paper>
        </Stack>
      </Container>
    </AuthGuard>
  );
};

export default Settings;
