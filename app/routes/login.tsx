import { Button, Container, Paper, PasswordInput, TextInput, Title } from "@mantine/core";
import { useAtom } from "jotai";
import { useState } from "react";
import { Navigate } from "react-router";
import { isAuthenticatedAtom, loginAtom } from "~/states";
import type { Route } from "./+types/login";

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: "ログイン - Tsunagaru" }, { name: "description", content: "Tsunagaru にログイン" }];
};

const Login = () => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, login] = useAtom(loginAtom);
  const [isAuthenticated] = useAtom(isAuthenticatedAtom);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId.trim() || !password.trim()) {
      return;
    }

    setIsLoading(true);

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Demo login - accept any non-empty credentials
    const user = {
      id: userId,
      email: `${userId}@example.com`,
      name: userId,
      role: "user" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    login(user);
    setIsLoading(false);
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center" mb="md">
        Tsunagaru へようこそ
      </Title>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit}>
          <TextInput
            label="ユーザーID"
            placeholder="ユーザーIDを入力してください"
            required
            value={userId}
            onChange={(event) => setUserId(event.currentTarget.value)}
            mb="sm"
          />
          <PasswordInput
            label="パスワード"
            placeholder="パスワードを入力してください"
            required
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            mb="lg"
          />
          <Button type="submit" fullWidth loading={isLoading} disabled={!userId.trim() || !password.trim()}>
            ログイン
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default Login;
