import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from gap_goblins import briefing, register

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location(
    "gap_goblins_setup", ROOT / "scripts" / "hermes.py"
)
assert spec is not None and spec.loader is not None
setup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(setup)


class BriefingTests(unittest.TestCase):
    def test_demo_is_explicitly_synthetic_and_model_disabled(self) -> None:
        result = json.loads(briefing({}))
        self.assertEqual(result["mode"], "synthetic")
        self.assertFalse(result["live_model_access"])
        self.assertIn("DEMO ONLY", result["notice"])
        self.assertEqual(result["scans"][1]["status"], "blocked")
        self.assertEqual(result["prospects"][1]["website"], "Not checked")

    def test_rejects_live_data_actions_paths_and_invalid_arguments(self) -> None:
        invalid: list[object] = [
            None,
            [],
            "",
            {"tenant_id": "real"},
            {"action": "send"},
            {"path": ".env.local"},
        ]
        for arguments in invalid:
            with self.subTest(arguments=arguments):
                self.assertIn(
                    "SYNTHETIC_ONLY", json.loads(briefing(arguments))["error"]
                )

    def test_data_is_fresh_and_deterministic(self) -> None:
        original = briefing({})
        result = json.loads(original)
        result["prospects"].clear()
        self.assertEqual(briefing({}), original)

    def test_secrets_in_environment_do_not_enter_briefing(self) -> None:
        with patch.dict(
            os.environ,
            {"DATABASE_URL": "FAKE_TEST_MARKER", "OPENAI_API_KEY": "FAKE_TEST_MARKER"},
        ):
            self.assertNotIn("FAKE_TEST_MARKER", briefing({}))

    def test_install_is_private_repeatable_and_preserves_configuration(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory) / "home"
            setup.install_profile(home)
            self.assertEqual(home.stat().st_mode & 0o777, 0o700)
            config = home / "config.yaml"
            config.write_text("# owner configuration\n")
            setup.install_profile(home)
            self.assertEqual(config.read_text(), "# owner configuration\n")
            plugin = home / "plugins" / "gap-goblins" / "__init__.py"
            plugin.write_text("# owner edits\n")
            with self.assertRaises(ValueError):
                setup.install_profile(home)
            self.assertEqual(plugin.read_text(), "# owner edits\n")

    def test_missing_runtime_does_not_fall_back_to_global_hermes(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with patch.object(setup, "run") as execute:
                with self.assertRaises(RuntimeError):
                    setup.test(root / "runtime", root / "home")
                execute.assert_not_called()

    def test_subprocess_environment_excludes_app_and_provider_credentials(self) -> None:
        with patch.dict(
            os.environ,
            {
                "DATABASE_URL": "secret",
                "OPENAI_API_KEY": "secret",
                "PYTHONPATH": "foreign",
                "HERMES_HOME": "foreign",
            },
        ):
            env = setup.environment(Path("/isolated"), Path("/profile"))
            for key in ("DATABASE_URL", "OPENAI_API_KEY", "PYTHONPATH"):
                self.assertNotIn(key, env)
            self.assertEqual(env["HERMES_HOME"], "/profile")
            self.assertEqual(env["HOME"], "/isolated/user-home")

    def test_manifest_requires_official_repo_and_immutable_versions(self) -> None:
        manifest = json.loads((ROOT / "integrations/hermes/upstream.json").read_text())
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "upstream.json"
            for key, invalid in [
                ("repository", "https://example.com/fork.git"),
                ("revision", "main"),
                ("python", ">=3.14"),
                ("uv", "latest"),
            ]:
                with self.subTest(key=key):
                    path.write_text(json.dumps({**manifest, key: invalid}))
                    with self.assertRaises(ValueError):
                        setup.Upstream.load(path)
            path.write_text(json.dumps(manifest))
            self.assertEqual(setup.Upstream.load(path).revision, manifest["revision"])

    def test_rejects_symlinked_home(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            original = root / "original"
            original.mkdir()
            linked = root / "linked"
            linked.symlink_to(original, target_is_directory=True)
            with self.assertRaises(ValueError):
                setup.install_profile(linked)
            self.assertEqual(list(original.iterdir()), [])

    def test_registration_with_installed_hermes_api_without_model_calls(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            with patch.dict(
                os.environ, {"HOME": directory, "HERMES_HOME": directory}, clear=True
            ):
                plugins = importlib.import_module("hermes_cli.plugins")
                registry = importlib.import_module("tools.registry").registry
                assert plugins.__file__ is not None
                self.assertTrue(
                    Path(plugins.__file__)
                    .resolve()
                    .is_relative_to(ROOT / ".hermes-runtime" / "upstream")
                )

                manager = plugins.PluginManager(scope_key=directory)
                context = plugins.PluginContext(
                    plugins.PluginManifest(name="gap-goblins"), manager
                )
                try:
                    register(context)
                    self.assertEqual(
                        manager._plugin_tool_names, {"gap_goblins_briefing"}
                    )
                    entry = registry.get_entry(
                        "gap_goblins_briefing", scope=manager.scope_key
                    )
                    self.assertIsNotNone(entry)
                    self.assertEqual(entry.toolset, "gap_goblins")
                    self.assertEqual(json.loads(entry.handler({}))["mode"], "synthetic")
                    self.assertFalse(entry.schema["parameters"]["additionalProperties"])
                finally:
                    registry.deregister("gap_goblins_briefing", scope=manager.scope_key)


if __name__ == "__main__":
    unittest.main()
