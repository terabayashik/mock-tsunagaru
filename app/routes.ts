import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/Home.tsx"),
  route("/login", "routes/Login.tsx"),
  route("/dashboard", "routes/Dashboard.tsx"),
  route("/settings", "routes/Settings.tsx"),
] satisfies RouteConfig;
