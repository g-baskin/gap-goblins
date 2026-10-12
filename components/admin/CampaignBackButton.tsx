"use client";

import { IconArrowLeft } from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/shadcn/ui/button";

/**
 * Client component that renders a back button on campaign detail/new pages.
 * Returns null on all other admin pages so the SiteHeader stays clean.
 * Used as the SiteHeader title in the admin layout.
 */
export function AdminHeaderTitle() {
  const pathname = usePathname();
  const router = useRouter();
  const isCampaignDetail = pathname?.match(/\/admin\/outreach\/campaigns\/[^/]+$/);
  const isNewCampaign = pathname === "/admin/outreach/campaigns/new";
  const isConversations = pathname === "/admin/conversations";

  if (isConversations) {
    const sections = [
      "Conversations",
      "Manual Actions",
      "Snippets",
      "Trigger Links",
      "Analytics",
      "Settings",
    ];

    return (
      <div className="flex min-w-0 flex-1 items-stretch self-stretch">
        <h1 className="hidden shrink-0 items-center pr-3 text-sm font-semibold lg:flex">
          Conversations
        </h1>
        <nav
          aria-label="Conversation sections"
          className="flex min-w-0 items-stretch gap-1 overflow-x-auto self-stretch"
        >
          {sections.map((section, index) => (
            <button
              key={section}
              type="button"
              disabled={index !== 0}
              aria-current={index === 0 ? "page" : undefined}
              title={index === 0 ? undefined : `${section} is not available in this demo`}
              className="relative shrink-0 px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70 aria-[current=page]:text-foreground aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-2 aria-[current=page]:after:bottom-0 aria-[current=page]:after:h-0.5 aria-[current=page]:after:bg-primary"
            >
              {section}
            </button>
          ))}
        </nav>
      </div>
    );
  }
  if (isCampaignDetail || isNewCampaign) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/admin/outreach/campaigns")}
        className="-ml-2"
      >
        <IconArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
    );
  }

  return null;
}
