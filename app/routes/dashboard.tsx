import { Container, Paper, Stack, Text, Title } from "@mantine/core";
import { AuthGuard } from "~/components";
import type { Route } from "./+types/Dashboard";

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: "ダッシュボード - Tsunagaru" }, { name: "description", content: "ダッシュボードページ" }];
};

const Dashboard = () => {
  return (
    <AuthGuard>
      <Container size="lg">
        <Stack gap="lg">
          <Title order={1}>ダッシュボード</Title>
          <Paper p="md" withBorder>
            <Text>ダッシュボードへようこそ！ここには今後コンテンツが追加されます。</Text>
          </Paper>
        </Stack>
      </Container>
    </AuthGuard>
  );
};

export default Dashboard;
