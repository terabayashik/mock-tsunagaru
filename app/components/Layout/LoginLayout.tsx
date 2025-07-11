import { Group, Title } from "@mantine/core";
import { Link } from "react-router";
import { ThemeToggle } from "../ThemeToggle";

interface LoginLayoutProps {
  children: React.ReactNode;
}

export const LoginLayout = ({ children }: LoginLayoutProps) => {
  return (
    <>
      <Group justify="space-between" p="md">
        <Link to="/" style={{ textDecoration: "none" }}>
          <Title order={3} c="blue" style={{ cursor: "pointer" }}>
            Tsunagaru
          </Title>
        </Link>
        <ThemeToggle />
      </Group>
      {children}
    </>
  );
};
