"""Synthetic-only, read-only briefing tool for the owner's local Hermes runtime."""

import json
from collections.abc import Callable
from typing import Protocol


class ToolContext(Protocol):
    def register_tool(
        self,
        *,
        name: str,
        toolset: str,
        schema: dict[str, object],
        handler: Callable[[object], str],
    ) -> None: ...


def briefing(arguments: object, **_kwargs: object) -> str:
    """No caller-supplied data, database, filesystem, network, or model access."""
    if not isinstance(arguments, dict) or arguments:
        return json.dumps({"error": "SYNTHETIC_ONLY: this tool accepts no arguments"})
    return json.dumps(
        {
            "mode": "synthetic",
            "notice": "DEMO ONLY: invented examples, not actual prospects or scan results.",
            "live_model_access": False,
            "workspace": "Synthetic owner demo (not a tenant)",
            "scans": [
                {
                    "id": "demo-complete",
                    "status": "completed",
                    "source": "fixture",
                    "businesses": 2,
                },
                {
                    "id": "demo-disabled",
                    "status": "blocked",
                    "source": "omkar-desktop",
                    "reason": "UNVERIFIED: do not start live scans",
                },
            ],
            "prospects": [
                {
                    "id": "demo-a",
                    "name": "Synthetic Plumbing A",
                    "website": "Missing (synthetic observation)",
                    "rating": "Not checked",
                },
                {
                    "id": "demo-b",
                    "name": "Synthetic Plumbing B",
                    "website": "Not checked",
                    "rating": "Not checked",
                },
            ],
            "next_actions": [
                "Review the synthetic missing-website observation; do not infer unknown facts.",
                "Keep Omkar scans disabled until its adapter contract is verified.",
            ],
            "restrictions": [
                "No real tenant data or credentials",
                "No CRM changes, scan triggers, emails, or SMS",
                "No generated scores or gap-report copy",
            ],
        },
        sort_keys=True,
    )


def register(ctx: ToolContext) -> None:
    ctx.register_tool(
        name="gap_goblins_briefing",
        toolset="gap_goblins",
        schema={
            "name": "gap_goblins_briefing",
            "description": "Return a read-only, clearly labeled SYNTHETIC Gap Goblins briefing. No live data.",
            "parameters": {
                "type": "object",
                "properties": {},
                "additionalProperties": False,
            },
        },
        handler=briefing,
    )
