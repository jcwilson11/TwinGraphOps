#!/usr/bin/env python3
"""Helpers for digest-pinned production release metadata and rollback selection."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REQUIRED_METADATA_FIELDS = (
    "release_tag",
    "release_sha",
    "api_image",
    "frontend_image",
    "deployed_at",
)


def iso_timestamp_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def ensure_non_empty_string(value: Any, field_name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field_name} must be a non-empty string.")
    return value.strip()


def ensure_digest_image(image: Any, field_name: str) -> str:
    value = ensure_non_empty_string(image, field_name)
    if "@sha256:" not in value:
        raise ValueError(f"{field_name} must be a digest-pinned image reference.")
    return value


def build_metadata(
    *,
    release_tag: str,
    release_sha: str,
    api_image: str,
    frontend_image: str,
    deployed_at: str | None = None,
) -> dict[str, str]:
    metadata = {
        "release_tag": ensure_non_empty_string(release_tag, "release_tag"),
        "release_sha": ensure_non_empty_string(release_sha, "release_sha"),
        "api_image": ensure_digest_image(api_image, "api_image"),
        "frontend_image": ensure_digest_image(frontend_image, "frontend_image"),
        "deployed_at": ensure_non_empty_string(deployed_at or iso_timestamp_now(), "deployed_at"),
    }
    return metadata


def validate_metadata(metadata: dict[str, Any]) -> dict[str, str]:
    missing_fields = [field for field in REQUIRED_METADATA_FIELDS if field not in metadata]
    if missing_fields:
        missing = ", ".join(missing_fields)
        raise ValueError(f"Rollback metadata is missing required fields: {missing}.")

    return build_metadata(
        release_tag=metadata["release_tag"],
        release_sha=metadata["release_sha"],
        api_image=metadata["api_image"],
        frontend_image=metadata["frontend_image"],
        deployed_at=metadata["deployed_at"],
    )


def select_previous_release_candidate(
    releases: list[dict[str, Any]],
    *,
    current_tag: str,
    asset_name: str,
) -> dict[str, str] | None:
    for release in releases:
        if release.get("draft"):
            continue
        tag_name = release.get("tag_name")
        if not isinstance(tag_name, str) or not tag_name or tag_name == current_tag:
            continue

        for asset in release.get("assets") or []:
            if asset.get("name") != asset_name:
                continue

            asset_url = asset.get("url")
            if not isinstance(asset_url, str) or not asset_url:
                continue

            return {
                "release_tag": tag_name,
                "asset_name": asset_name,
                "asset_url": asset_url,
                "published_at": str(release.get("published_at") or ""),
            }

    return None


def load_json(path: str) -> Any:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write_github_outputs(path: str | None, outputs: dict[str, str]) -> None:
    if not path:
        return

    with Path(path).open("a", encoding="utf-8") as handle:
        for key, value in outputs.items():
            handle.write(f"{key}={value}\n")


def cmd_write(args: argparse.Namespace) -> int:
    metadata = build_metadata(
        release_tag=args.release_tag,
        release_sha=args.release_sha,
        api_image=args.api_image,
        frontend_image=args.frontend_image,
        deployed_at=args.deployed_at,
    )
    Path(args.output).write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metadata, indent=2))
    return 0


def cmd_validate(args: argparse.Namespace) -> int:
    metadata = validate_metadata(load_json(args.input))
    write_github_outputs(
        args.github_output,
        {
            "release_tag": metadata["release_tag"],
            "release_sha": metadata["release_sha"],
            "api_image": metadata["api_image"],
            "frontend_image": metadata["frontend_image"],
            "deployed_at": metadata["deployed_at"],
        },
    )
    print(json.dumps(metadata, indent=2))
    return 0


def cmd_select(args: argparse.Namespace) -> int:
    releases = load_json(args.releases)
    if not isinstance(releases, list):
        raise ValueError("The releases payload must be a JSON array.")

    candidate = select_previous_release_candidate(
        releases,
        current_tag=args.current_tag,
        asset_name=args.asset_name,
    )
    if candidate is None:
        write_github_outputs(args.github_output, {"has_rollback_candidate": "false"})
        print(json.dumps({"has_rollback_candidate": False}, indent=2))
        return 0

    write_github_outputs(
        args.github_output,
        {
            "has_rollback_candidate": "true",
            "rollback_release_tag": candidate["release_tag"],
            "rollback_asset_url": candidate["asset_url"],
            "rollback_asset_name": candidate["asset_name"],
            "rollback_published_at": candidate["published_at"],
        },
    )
    print(
        json.dumps(
            {
                "has_rollback_candidate": True,
                **candidate,
            },
            indent=2,
        )
    )
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    write_parser = subparsers.add_parser("write", help="Write release rollback metadata.")
    write_parser.add_argument("--release-tag", required=True)
    write_parser.add_argument("--release-sha", required=True)
    write_parser.add_argument("--api-image", required=True)
    write_parser.add_argument("--frontend-image", required=True)
    write_parser.add_argument("--deployed-at")
    write_parser.add_argument("--output", required=True)
    write_parser.set_defaults(func=cmd_write)

    validate_parser = subparsers.add_parser("validate", help="Validate release rollback metadata.")
    validate_parser.add_argument("--input", required=True)
    validate_parser.add_argument("--github-output")
    validate_parser.set_defaults(func=cmd_validate)

    select_parser = subparsers.add_parser("select", help="Select the previous known-good release asset.")
    select_parser.add_argument("--releases", required=True)
    select_parser.add_argument("--current-tag", required=True)
    select_parser.add_argument("--asset-name", required=True)
    select_parser.add_argument("--github-output")
    select_parser.set_defaults(func=cmd_select)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
