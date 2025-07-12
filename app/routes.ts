import { index, layout, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  // ルートページ（playlistにリダイレクト）
  index("routes/Index.tsx"),
  // メインタブのレイアウト
  layout("components/layout/TabLayout.tsx", [
    route("/playlist", "routes/Playlist.tsx"),
    route("/schedule", "routes/Schedule.tsx"),
    route("/layout", "routes/Layout.tsx"),
    route("/contents", "routes/Contents.tsx"),
  ]),
  // 独立したページ
  route("/login", "routes/Login.tsx"),
  route("/dashboard", "routes/Dashboard.tsx"),
  route("/settings", "routes/Settings.tsx"),
] satisfies RouteConfig;
