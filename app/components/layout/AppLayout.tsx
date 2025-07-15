import { Anchor, AppShell, Avatar, Button, Group, Menu, Text, Title, UnstyledButton } from "@mantine/core";
import { IconChartBar, IconDoorExit, IconHome, IconMenu2, IconSettings, IconUser } from "@tabler/icons-react";
import { useAtom } from "jotai";
import { Link, useLocation } from "react-router";
import { headerColorAtom, logoutAtom, userAtom } from "~/states";
import { ThemeToggle } from "../common/ThemeToggle";
import { MigrationRunner } from "../MigrationRunner";
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
  const [user] = useAtom(userAtom);
  const [, logout] = useAtom(logoutAtom);
  const [headerColor] = useAtom(headerColorAtom);
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  if (!user) {
    return <LoginLayout>{children}</LoginLayout>;
  }

  return (
    <>
      <MigrationRunner />
      <AppShell header={{ height: 60 }} padding="md">
        <AppShell.Header bg={headerColor}>
          <Group h="100%" px="md" justify="space-between">
            <Group>
              <Anchor component={Link} to="/" td="none">
                <Title order={3} c="white">
                  もっく！つながる
                </Title>
              </Anchor>
            </Group>

            <Group gap="sm">
              {/* Desktop Navigation */}
              <Group gap="xs" visibleFrom="sm">
                {navigationItems.map((item) => (
                  <Button
                    key={item.href}
                    component={Link}
                    to={item.href}
                    color="white"
                    bg={location.pathname === item.href ? "#ffffff20" : "#ffffff00"}
                    variant={location.pathname === item.href ? "outline" : "subtle"}
                    leftSection={item.icon}
                    size="sm"
                  >
                    {item.label}
                  </Button>
                ))}
              </Group>

              {/* Mobile Navigation Menu */}
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <Button variant="subtle" size="sm" hiddenFrom="sm" leftSection={<IconMenu2 size={16} />}>
                    メニュー
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>ナビゲーション</Menu.Label>
                  {navigationItems.map((item) => (
                    <Menu.Item key={item.href} component={Link} to={item.href} leftSection={item.icon}>
                      {item.label}
                    </Menu.Item>
                  ))}
                  <Menu.Divider />
                  <Menu.Label>アカウント</Menu.Label>
                  <Menu.Item leftSection={<IconUser size={16} />}>プロフィール</Menu.Item>
                  <Menu.Item leftSection={<IconSettings size={16} />}>設定</Menu.Item>
                  <Menu.Item leftSection={<IconDoorExit size={16} />} color="red" onClick={handleLogout}>
                    ログアウト
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>

              <ThemeToggle />

              {/* Desktop User Menu */}
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <UnstyledButton visibleFrom="sm">
                    <Group gap="xs">
                      <Avatar size="sm" color="white">
                        {user.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Text size="sm" fw={500} c="white">
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

        <AppShell.Main>{children}</AppShell.Main>
      </AppShell>
    </>
  );
};
