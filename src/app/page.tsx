import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function IndexPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/auth/signin");
  }

  const role = session.user.role;

  if (role === "ADMIN") {
    redirect("/admin");
  } else {
    redirect("/seller");
  }
}
