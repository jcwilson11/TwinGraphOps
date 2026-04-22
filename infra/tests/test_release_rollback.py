import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


def load_release_rollback_module():
    module_path = Path(__file__).resolve().parents[1] / "scripts" / "release_rollback.py"
    spec = importlib.util.spec_from_file_location("release_rollback", module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


release_rollback = load_release_rollback_module()


class ReleaseRollbackTests(unittest.TestCase):
    def test_build_metadata_round_trips_required_fields(self):
        metadata = release_rollback.build_metadata(
            release_tag="v1.2.3",
            release_sha="abc123",
            api_image="123456789012.dkr.ecr.us-east-1.amazonaws.com/twingraphops-api@sha256:api123",
            frontend_image="123456789012.dkr.ecr.us-east-1.amazonaws.com/twingraphops-frontend@sha256:web123",
            deployed_at="2026-04-10T20:00:00Z",
        )

        self.assertEqual(metadata["release_tag"], "v1.2.3")
        self.assertEqual(metadata["release_sha"], "abc123")
        self.assertEqual(metadata["deployed_at"], "2026-04-10T20:00:00Z")

    def test_validate_metadata_rejects_mutable_image_refs(self):
        with self.assertRaisesRegex(ValueError, "digest-pinned image reference"):
            release_rollback.validate_metadata(
                {
                    "release_tag": "v1.2.3",
                    "release_sha": "abc123",
                    "api_image": "repo:latest",
                    "frontend_image": "repo@sha256:frontend123",
                    "deployed_at": "2026-04-10T20:00:00Z",
                }
            )

    def test_select_previous_release_skips_current_tag_and_picks_latest_prior_release_with_asset(self):
        releases = [
            {
                "tag_name": "v1.2.1",
                "draft": False,
                "published_at": "2026-04-10T22:00:00Z",
                "assets": [
                    {
                        "name": "production-release-metadata.json",
                        "url": "https://api.github.com/assets/121",
                    }
                ],
            },
            {
                "tag_name": "v1.2.0",
                "draft": False,
                "published_at": "2026-04-09T22:00:00Z",
                "assets": [
                    {
                        "name": "production-release-metadata.json",
                        "url": "https://api.github.com/assets/120",
                    }
                ],
            },
        ]

        candidate = release_rollback.select_previous_release_candidate(
            releases,
            current_tag="v1.2.1",
            asset_name="production-release-metadata.json",
        )

        self.assertEqual(candidate["release_tag"], "v1.2.0")
        self.assertEqual(candidate["asset_url"], "https://api.github.com/assets/120")

    def test_select_previous_release_returns_none_when_no_prior_metadata_exists(self):
        releases = [
            {
                "tag_name": "v1.2.1",
                "draft": False,
                "published_at": "2026-04-10T22:00:00Z",
                "assets": [
                    {
                        "name": "production-release-metadata.json",
                        "url": "https://api.github.com/assets/121",
                    }
                ],
            },
            {
                "tag_name": "v1.2.0",
                "draft": False,
                "published_at": "2026-04-09T22:00:00Z",
                "assets": [],
            },
        ]

        candidate = release_rollback.select_previous_release_candidate(
            releases,
            current_tag="v1.2.1",
            asset_name="production-release-metadata.json",
        )

        self.assertIsNone(candidate)

    def test_select_release_by_tag_returns_matching_release_asset(self):
        releases = [
            {
                "tag_name": "v1.2.1",
                "draft": False,
                "published_at": "2026-04-10T22:00:00Z",
                "assets": [
                    {
                        "name": "production-release-metadata.json",
                        "url": "https://api.github.com/assets/121",
                    }
                ],
            },
            {
                "tag_name": "v1.2.0",
                "draft": False,
                "published_at": "2026-04-09T22:00:00Z",
                "assets": [
                    {
                        "name": "production-release-metadata.json",
                        "url": "https://api.github.com/assets/120",
                    }
                ],
            },
        ]

        candidate = release_rollback.select_release_by_tag(
            releases,
            release_tag="v1.2.0",
            asset_name="production-release-metadata.json",
        )

        self.assertEqual(candidate["release_tag"], "v1.2.0")
        self.assertEqual(candidate["asset_url"], "https://api.github.com/assets/120")

    def test_select_release_by_tag_returns_none_when_requested_tag_has_no_metadata(self):
        releases = [
            {
                "tag_name": "v1.2.1",
                "draft": False,
                "published_at": "2026-04-10T22:00:00Z",
                "assets": [],
            }
        ]

        candidate = release_rollback.select_release_by_tag(
            releases,
            release_tag="v1.2.1",
            asset_name="production-release-metadata.json",
        )

        self.assertIsNone(candidate)

    def test_validate_command_reads_metadata_file(self):
        payload = {
            "release_tag": "v1.2.3",
            "release_sha": "abc123",
            "api_image": "repo@sha256:api123",
            "frontend_image": "repo@sha256:frontend123",
            "deployed_at": "2026-04-10T20:00:00Z",
        }

        with tempfile.TemporaryDirectory() as temp_dir:
            metadata_path = Path(temp_dir) / "metadata.json"
            metadata_path.write_text(json.dumps(payload), encoding="utf-8")

            validated = release_rollback.validate_metadata(json.loads(metadata_path.read_text(encoding="utf-8")))
            self.assertEqual(validated, payload)

    def test_validate_metadata_rejects_missing_required_fields(self):
        with self.assertRaisesRegex(ValueError, "missing required fields"):
            release_rollback.validate_metadata(
                {
                    "release_tag": "v1.2.3",
                    "release_sha": "abc123",
                    "api_image": "repo@sha256:api123",
                }
            )


if __name__ == "__main__":
    unittest.main()
