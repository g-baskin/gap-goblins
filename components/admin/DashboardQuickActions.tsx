"use client";

import { IconMail, IconSend, IconTarget, IconUserPlus } from "@tabler/icons-react";
import Link from "next/link";
import { Button } from "@/components/shadcn/ui/button";

export function DashboardQuickActions() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Button asChild className="h-16 text-base font-semibold">
        <Link href="/admin/crm?new=deal">
          <IconTarget className="mr-2 h-5 w-5" />
          New Deal
        </Link>
      </Button>
      <Button variant="outline" asChild className="h-16 text-base font-semibold">
        <Link href="/admin/crm?new=contact">
          <IconUserPlus className="mr-2 h-5 w-5" />
          Add Contact
        </Link>
      </Button>
      <Button variant="outline" asChild className="h-16 text-base font-semibold">
        <Link href="/admin/newsletter">
          <IconMail className="mr-2 h-5 w-5" />
          Create Newsletter
        </Link>
      </Button>
      <Button variant="outline" asChild className="h-16 text-base font-semibold">
        <Link href="/admin/outreach/campaigns">
          <IconSend className="mr-2 h-5 w-5" />
          Outreach Campaign
        </Link>
      </Button>
    </div>
  );
}
