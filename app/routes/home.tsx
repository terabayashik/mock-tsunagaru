import { AuthGuard } from "~/components";
import { Home as HomeElement } from "../home/Home";
import type { Route } from "./+types/Home";

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: "ホーム - Tsunagaru" }, { name: "description", content: "Tsunagaru へようこそ！" }];
};

const Home = () => {
  return (
    <AuthGuard>
      <HomeElement />
    </AuthGuard>
  );
};

export default Home;
