import "@mantine/core/styles.css";

import { ColorSchemeScript, Container, createTheme, MantineProvider, Stack, Text, Title } from "@mantine/core";
import { Provider, useAtomValue } from "jotai";
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { AppLayout } from "~/components";
import { colorSchemeAtom } from "~/states";
import type { Route } from "./+types/root";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

const theme = createTheme({
  // Theme customizations can be added here
});

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const colorScheme = useAtomValue(colorSchemeAtom);

  return (
    <MantineProvider
      theme={theme}
      defaultColorScheme="auto"
      forceColorScheme={typeof window !== "undefined" ? (colorScheme === "auto" ? undefined : colorScheme) : undefined}
    >
      {children}
    </MantineProvider>
  );
};

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en" style={{ height: "100%", margin: 0, padding: 0 }}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <ColorSchemeScript defaultColorScheme="auto" />
        <Meta />
        <Links />
      </head>
      <body style={{ margin: 0, padding: 0, width: "100%", height: "100%" }}>
        <Provider>
          <ThemeProvider>
            <div style={{ width: "100%", minHeight: "100vh" }}>{children}</div>
          </ThemeProvider>
        </Provider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
};

const App = () => {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
};

export default App;

export const ErrorBoundary = ({ error }: Route.ErrorBoundaryProps) => {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details = error.status === 404 ? "The requested page could not be found." : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <Container size="md" pt={64} p="md">
      <Stack gap="md">
        <Title order={1}>{message}</Title>
        <Text>{details}</Text>
        {stack && (
          <pre style={{ width: "100%", padding: 16, overflow: "auto" }}>
            <code>{stack}</code>
          </pre>
        )}
      </Stack>
    </Container>
  );
};
