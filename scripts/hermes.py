"""Pinned upstream Hermes setup and offline demo. No model-session command."""

import argparse
from dataclasses import dataclass
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "integrations" / "hermes"))
from gap_goblins import briefing  # noqa: E402


@dataclass(frozen=True)
class Upstream:
    repository: str
    revision: str
    python: str
    uv: str

    @classmethod
    def load(cls, path: Path) -> "Upstream":
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict) or set(data) != {
            "repository",
            "revision",
            "python",
            "uv",
        }:
            raise ValueError("Invalid Hermes upstream manifest")
        if data["repository"] != "https://github.com/NousResearch/hermes-agent.git":
            raise ValueError("Only the official Hermes repository is supported")
        if not isinstance(data["revision"], str) or not re.fullmatch(
            r"[0-9a-f]{40}", data["revision"]
        ):
            raise ValueError("Hermes revision must be a full commit SHA")
        for key in ("python", "uv"):
            if not isinstance(data[key], str) or not re.fullmatch(
                r"\d+\.\d+\.\d+", data[key]
            ):
                raise ValueError(f"{key} must be an exact release")
        return cls(**data)


def executable(environment: Path, name: str) -> Path:
    return (
        environment
        / ("Scripts" if os.name == "nt" else "bin")
        / (name + (".exe" if os.name == "nt" else ""))
    )


def environment(runtime: Path, home: Path) -> dict[str, str]:
    """Do not inherit provider keys, app secrets, Python paths, or global profiles."""
    result = {
        key: os.environ[key]
        for key in ("PATH", "SYSTEMROOT", "WINDIR")
        if key in os.environ
    }
    result.update(
        {
            "HOME": str(runtime / "user-home"),
            "USERPROFILE": str(runtime / "user-home"),
            "HERMES_HOME": str(home),
            "HERMES_ENABLE_PROJECT_PLUGINS": "false",
            "UV_CACHE_DIR": str(runtime / "cache"),
            "UV_PYTHON_INSTALL_DIR": str(runtime / "python"),
            "UV_PROJECT_ENVIRONMENT": str(runtime / "venv"),
            "UV_NO_CONFIG": "1",
            "CARGO_HOME": str(runtime / "cargo"),
            "RUSTUP_HOME": str(Path.home() / ".rustup"),
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_CONFIG_GLOBAL": os.devnull,
            "GIT_TERMINAL_PROMPT": "0",
            "PIP_CONFIG_FILE": os.devnull,
            "PIP_DISABLE_PIP_VERSION_CHECK": "1",
            "PYTHONNOUSERSITE": "1",
        }
    )
    return result


def run(
    args: list[str], cwd: Path, env: dict[str, str], *, capture: bool = False
) -> str:
    result = subprocess.run(
        args, cwd=cwd, env=env, check=True, text=True, capture_output=capture
    )
    return result.stdout.strip() if capture else ""


def install_profile(home: Path) -> None:
    """Preserve existing configuration; refresh only our unchanged/generated plugin."""
    if home.is_symlink():
        raise ValueError("Refusing a symlinked Hermes home")
    home.mkdir(mode=0o700, parents=True, exist_ok=True)
    plugin = home / "plugins" / "gap-goblins"
    for path in (home / "plugins", plugin):
        if path.is_symlink():
            raise ValueError("Refusing a symlinked plugin directory")
        path.mkdir(mode=0o700, exist_ok=True)
    for filename in ("__init__.py", "plugin.yaml"):
        destination = plugin / filename
        source = ROOT / "integrations" / "hermes" / "gap_goblins" / filename
        if destination.is_symlink():
            raise ValueError("Refusing a symlinked plugin file")
        if destination.exists():
            if destination.read_bytes() != source.read_bytes():
                raise ValueError(
                    f"Existing plugin differs: {destination}. Preserve it before reinstalling."
                )
        else:
            with destination.open("xb") as output:
                output.write(source.read_bytes())
            destination.chmod(0o600)
    config = home / "config.yaml"
    if config.is_symlink():
        raise ValueError("Refusing a symlinked config")
    if not config.exists():
        with config.open("x", encoding="utf-8") as output:
            output.write(
                "toolsets: [gap_goblins]\nplugins:\n  enabled: [gap-goblins]\n"
                "model:\n  provider: custom\n  model: disabled-synthetic-only\n"
                "  base_url: http://127.0.0.1:1/v1\n"
            )
        config.chmod(0o600)


def verify_source(runtime: Path, upstream: Upstream, env: dict[str, str]) -> None:
    source = runtime / "upstream"
    actual = run(["git", "rev-parse", "HEAD"], source, env, capture=True)
    if actual != upstream.revision:
        raise ValueError(
            "Hermes checkout does not match the pinned revision; no automatic reset"
        )
    run(["git", "diff", "--exit-code", "HEAD", "--"], source, env)


def setup(runtime: Path, home: Path, upstream: Upstream) -> None:
    if shutil.which("git") is None:
        raise RuntimeError("Install Git first, then rerun bun run hermes:setup")
    if runtime.is_symlink():
        raise ValueError("Refusing a symlinked runtime directory")
    runtime.mkdir(mode=0o700, exist_ok=True)
    for name in ("user-home", "work"):
        (runtime / name).mkdir(mode=0o700, exist_ok=True)
    env = environment(runtime, home)
    source = runtime / "upstream"
    if not source.exists():
        run(["git", "init", str(source)], runtime, env)
        run(
            ["git", "fetch", "--depth=1", upstream.repository, upstream.revision],
            source,
            env,
        )
        run(["git", "checkout", "--detach", "FETCH_HEAD"], source, env)
    verify_source(runtime, upstream, env)
    tools = runtime / "tools"
    if not executable(tools, "python").exists():
        run([sys.executable, "-I", "-m", "venv", str(tools)], runtime, env)
    uv = executable(tools, "uv")
    if not uv.exists():
        run(
            [
                str(executable(tools, "python")),
                "-I",
                "-m",
                "pip",
                "install",
                "--index-url",
                "https://pypi.org/simple",
                f"uv=={upstream.uv}",
            ],
            runtime,
            env,
        )
    if (
        run([str(uv), "--version"], runtime, env, capture=True).split()[1]
        != upstream.uv
    ):
        raise ValueError("Unexpected bootstrap uv version")
    run(
        [
            str(uv),
            "sync",
            "--project",
            str(source),
            "--python",
            upstream.python,
            "--frozen",
            "--no-dev",
        ],
        runtime,
        env,
    )
    verify_source(runtime, upstream, env)
    install_profile(home)
    # Publish readiness only after the real upstream API registration test passes.
    test(runtime, home)
    (runtime / "ready.json").write_text(
        json.dumps(upstream.__dict__, sort_keys=True) + "\n", encoding="utf-8"
    )
    print(
        "Hermes installed from the pinned official repository. No model calls enabled."
    )
    print("Next: bun run hermes:preview")


def test(runtime: Path, home: Path) -> None:
    python = executable(runtime / "venv", "python")
    if not python.is_file():
        raise RuntimeError(
            "Run bun run hermes:setup first; no global Hermes fallback is allowed"
        )
    run(
        [
            str(python),
            "-I",
            "-m",
            "unittest",
            "discover",
            "-s",
            str(ROOT / "integrations" / "hermes"),
            "-p",
            "test_*.py",
            "-v",
        ],
        runtime / "work",
        environment(runtime, home),
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "command", choices=["preview", "setup", "install", "status", "test"]
    )
    args = parser.parse_args()
    runtime = ROOT / ".hermes-runtime"
    home = ROOT / ".hermes-gap-goblins"
    upstream = Upstream.load(ROOT / "integrations" / "hermes" / "upstream.json")
    if args.command == "preview":
        print(json.dumps(json.loads(briefing({})), indent=2))
    elif args.command == "status":
        ready = runtime / "ready.json"
        installed = (
            ready.is_file()
            and json.loads(ready.read_text()) == upstream.__dict__
            and executable(runtime / "venv", "python").is_file()
        )
        if installed:
            verify_source(runtime, upstream, environment(runtime, home))
        print(
            json.dumps(
                {
                    "installed": installed,
                    "revision": upstream.revision,
                    "repository": upstream.repository,
                    "mode": "synthetic-only",
                    "model_execution_available": False,
                },
                indent=2,
            )
        )
    elif args.command == "test":
        verify_source(runtime, upstream, environment(runtime, home))
        test(runtime, home)
    else:
        setup(runtime, home, upstream)


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError) as exc:
        print(f"Hermes setup stopped: {exc}", file=sys.stderr)
        sys.exit(1)
