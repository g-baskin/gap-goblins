import type { Metadata } from "next";
import { ConversationsWorkspace } from "./conversations-workspace";

export const metadata: Metadata = {
  title: "Conversations | Admin",
};

export default function ConversationsPage() {
  return <ConversationsWorkspace />;
}
