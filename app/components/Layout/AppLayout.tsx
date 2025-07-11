import { AppShell, Avatar, Burger, Group, Menu, NavLink, Text, Title, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChartBar, IconDoorExit, IconHome, IconSettings, IconUser } from "@tabler/icons-react";
import { useAtom } from "jotai";
import { Link, useLocation } from "react-router";
import { logoutAtom, userAtom } from "~/states";
import { ThemeToggle } from "../ThemeToggle";
import { LoginLayout } from "./LoginLayout";

interface AppLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  { label: "ホーム", href: "/", icon: <IconHome size={16} /> },
  { label: "ダッシュボード", href: "/dashboard", icon: <IconChartBar size={16} /> },
  { label: "設定", href: "/settings", icon: <IconSettings size={16} /> },
];

export const AppLayout = ({ children }: AppLayoutProps) => {
  const [opened, { toggle }] = useDisclosure();
  const [user] = useAtom(userAtom);
  const [, logout] = useAtom(logoutAtom);
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  if (!user) {
    return <LoginLayout>{children}</LoginLayout>;
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Link to="/" style={{ textDecoration: "none" }}>
              <Title order={3} c="blue" style={{ cursor: "pointer" }}>
                Tsunagaru
              </Title>
            </Link>
          </Group>

          <Group gap="sm">
            <ThemeToggle />
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="xs">
                    <Avatar size="sm" color="blue">
                      {user.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Text size="sm" fw={500}>
                      {user.name}
                    </Text>
                  </Group>
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>アカウント</Menu.Label>
                <Menu.Item leftSection={<IconUser size={16} />}>プロフィール</Menu.Item>
                <Menu.Item leftSection={<IconSettings size={16} />}>設定</Menu.Item>
                <Menu.Divider />
                <Menu.Item leftSection={<IconDoorExit size={16} />} color="red" onClick={handleLogout}>
                  ログアウト
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Text size="sm" fw={500} mb="md" c="dimmed">
          ナビゲーション
        </Text>
        {navigationItems.map((item) => (
          <NavLink
            key={item.href}
            component={Link}
            to={item.href}
            label={item.label}
            leftSection={item.icon}
            active={location.pathname === item.href}
            mb="xs"
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
};
