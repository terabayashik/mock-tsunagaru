import { AuthGuard } from "~/components";
import { Welcome } from "../welcome/welcome";
import type { Route } from "./+types/home";

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: "ホーム - Tsunagaru" }, { name: "description", content: "Tsunagaru へようこそ！" }];
};

const Home = () => {
  return (
    <AuthGuard>
      <Welcome />
    </AuthGuard>
  );
};

export default Home;
