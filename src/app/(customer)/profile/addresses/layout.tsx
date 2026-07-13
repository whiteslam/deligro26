import { requireUser } from "@/lib/auth";

export default async function AddressesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return children;
}
