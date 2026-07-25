#!/usr/bin/env python3

from __future__ import annotations

import json
import re
import sys
from typing import Any


READ_TOOLS = {
    "view_file",
    "list_dir",
    "find_by_name",
    "grep_search",
}

WEB_READ_TOOLS = {
    "search_web",
    "read_url_content",
}

COLLABORATION_TOOLS = {
    "ask_question",
    "invoke_subagent",
    "send_message",
    "manage_subagents",
}

SENSITIVE_PATTERNS = (
    r"(^|/)\.env($|[./])",
    r"(^|/)\.git($|/)",
    r"(^|/)\.ssh($|/)",
    r"supabase/\.temp",
    r"service[_-]?role",
    r"access[_-]?token",
    r"refresh[_-]?token",
    r"private[_-]?key",
    r"client[_-]?secret",
    r"database[_-]?password",
    r"credentials?",
    r"secrets?",
)

SECRET_VALUE_PATTERNS = (
    r"\beyJ[a-zA-Z0-9_-]{20,}\b",
    r"\bgh[pousr]_[A-Za-z0-9_]{20,}\b",
    r"\bsk-[A-Za-z0-9_-]{20,}\b",
    r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
)


def flatten(value: Any) -> str:
    if isinstance(value, dict):
        return " ".join(
            f"{key} {flatten(item)}"
            for key, item in value.items()
        )

    if isinstance(value, list):
        return " ".join(flatten(item) for item in value)

    return str(value)


def respond(value: str, reason: str) -> None:
    print(
        json.dumps(
            {
                "decision": value,
                "reason": reason,
            },
            ensure_ascii=False,
        )
    )
    raise SystemExit(0)


def contains_sensitive_reference(text: str) -> bool:
    return any(
        re.search(
            pattern,
            text,
            flags=re.IGNORECASE,
        )
        for pattern in SENSITIVE_PATTERNS
    )


def contains_secret_value(text: str) -> bool:
    return any(
        re.search(pattern, text)
        for pattern in SECRET_VALUE_PATTERNS
    )


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        respond(
            "deny",
            "VVIP manager gate: malformed hook input.",
        )

    tool_call = payload.get("toolCall") or {}
    name = str(tool_call.get("name") or "")
    args = tool_call.get("args") or {}
    text = flatten(args)

    if name in READ_TOOLS:
        if contains_sensitive_reference(text):
            respond(
                "deny",
                (
                    "VVIP manager gate: sensitive files and "
                    "credential locations are not readable."
                ),
            )

        respond(
            "allow",
            (
                "VVIP manager gate: repository read-only "
                "inspection allowed."
            ),
        )

    if name in WEB_READ_TOOLS:
        if (
            contains_sensitive_reference(text)
            or contains_secret_value(text)
        ):
            respond(
                "deny",
                (
                    "VVIP manager gate: possible secret or "
                    "sensitive reference cannot leave "
                    "the workspace."
                ),
            )

        respond(
            "force_ask",
            (
                "VVIP manager gate: public read-only research "
                "requires explicit owner approval."
            ),
        )

    if name == "define_subagent":
        lowered = {
            str(key).lower(): value
            for key, value in args.items()
        }

        if (
            bool(lowered.get("enable_write_tools"))
            or bool(lowered.get("enable_mcp_tools"))
        ):
            respond(
                "deny",
                (
                    "VVIP manager gate: planning subagents "
                    "cannot receive write or MCP tools."
                ),
            )

        respond(
            "allow",
            (
                "VVIP manager gate: read-only planning "
                "subagent allowed."
            ),
        )

    if name in COLLABORATION_TOOLS:
        respond(
            "allow",
            (
                "VVIP manager gate: planning collaboration "
                "allowed under inherited read-only policy."
            ),
        )

    respond(
        "deny",
        (
            "VVIP manager gate: only repository reads, "
            "owner-approved public research, questions, "
            "and read-only planning subagents are permitted."
        ),
    )


if __name__ == "__main__":
    main()
