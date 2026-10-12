---
type: entity
entity_type: endpoint
title: "Outreach Reply Send Admin Reply"
path: "app/api/outreach/replies/[replyId]/send/route.ts"
route_path: /api/outreach/replies/[replyId]/send
http_methods:
  - POST
auth_required: true
language: ts
created: "2026-05-28"
updated: "2026-05-28"
status: developing
last_commit_hash: 91aec3d
sources:
  - path: app/api/outreach/replies/[replyId]/send/route.ts
    lines: "1-220"
depends_on:
  - "[[entities/lib-auth]]"
  - "[[entities/lib-db]]"
  - "[[entities/lib-outreach-sending-sender]]"
  - "[[entities/lib-outreach-ai-reply-analyzer]]"
related:
  - "[[entities/endpoints/api-outreach-replies-id]]"
tags:
  - entity
  - endpoint
  - outreach
---

# Outreach Reply Send Admin Reply

`POST /api/outreach/replies/[replyId]/send` with body `{ body, senderAccountId?, useSignature? }` composes and dispatches an admin reply via Resend, threading the email with the original `messageId` header. The `Reply-To` is set to the sender account's mailbox address, never the reply+ address (`app/api/outreach/replies/[replyId]/send/route.ts:65-180`). On success stores the admin reply text in `outreach_reply_threads` and marks the inbound reply as read. Requires admin session.
