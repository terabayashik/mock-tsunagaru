import { atomWithStorage } from "jotai/utils";

export type ColorScheme = "light" | "dark" | "auto";

export const colorSchemeAtom = atomWithStorage<ColorScheme>("tsunagaru-color-scheme", "auto");
