import { ActionIcon, Tooltip, useMantineColorScheme } from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";
import { useAtom } from "jotai";
import { useEffect } from "react";
import { colorSchemeAtom } from "~/states";

export const ThemeToggle = () => {
  const [colorScheme, setColorScheme] = useAtom(colorSchemeAtom);
  const { setColorScheme: setMantineColorScheme } = useMantineColorScheme();

  useEffect(() => {
    setMantineColorScheme(colorScheme);
  }, [colorScheme, setMantineColorScheme]);

  const toggleColorScheme = () => {
    const newScheme = colorScheme === "dark" ? "light" : "dark";
    setColorScheme(newScheme);
  };

  return (
    <Tooltip label={`${colorScheme === "dark" ? "ライト" : "ダーク"}テーマに切り替え`}>
      <ActionIcon onClick={toggleColorScheme} variant="subtle" size="lg" aria-label="テーマ切り替え">
        {colorScheme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
      </ActionIcon>
    </Tooltip>
  );
};
