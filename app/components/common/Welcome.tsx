import { Container, Image, NavLink, Paper, Stack, Text } from "@mantine/core";
import { IconBrandDiscord, IconFileText } from "@tabler/icons-react";
import { useAtom } from "jotai";
import logoDark from "~/assets/images/logo-dark.svg";
import logoLight from "~/assets/images/logo-light.svg";
import { userAtom } from "~/states";

export const Welcome = () => {
  const [user] = useAtom(userAtom);

  return (
    <Container size="lg">
      <Stack align="center" gap="xl">
        <Container size={400} p="md">
          <Image src={logoLight} alt="React Router" w="100%" style={{ display: "block" }} data-light-only />
          <Image src={logoDark} alt="React Router" w="100%" style={{ display: "none" }} data-dark-only />
        </Container>

        <Container size={300} w="100%">
          <Stack gap="lg">
            {user && (
              <Stack align="center" gap="xs">
                <Text size="xl" fw={600}>
                  おかえりなさい、{user.name}さん！
                </Text>
                <Text size="sm" c="dimmed">
                  {user.email}
                </Text>
              </Stack>
            )}

            <Paper withBorder radius="xl" p="lg">
              <Stack gap="md">
                <Text ta="center" c="dimmed">
                  次に何をしますか？
                </Text>
                <Stack gap={0}>
                  {resources.map(({ href, text, icon }) => (
                    <NavLink
                      key={href}
                      href={href}
                      label={text}
                      leftSection={icon}
                      target="_blank"
                      rel="noreferrer"
                      variant="subtle"
                    />
                  ))}
                </Stack>
              </Stack>
            </Paper>
          </Stack>
        </Container>
      </Stack>
    </Container>
  );
};

const resources = [
  {
    href: "https://reactrouter.com/docs",
    text: "React Router ドキュメント",
    icon: <IconFileText size={16} />,
  },
  {
    href: "https://rmx.as/discord",
    text: "Discord に参加",
    icon: <IconBrandDiscord size={16} />,
  },
];
