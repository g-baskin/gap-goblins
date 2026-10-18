# Hermes: one-command, pinned upstream setup

From a fresh Gap Goblins checkout, with **Bun, Git, and Python 3.11+** installed:

```bash
bun run hermes:setup
bun run hermes:preview
```

Setup needs internet access for GitHub, PyPI, and uv's Python downloads. On Linux,
Python's `venv`/`ensurepip` support must also be installed. Where upstream packages
have no compatible wheel (including cryptography on Intel macOS), Rust, compiler
tools, pkg-config, and OpenSSL development libraries are required. Existing Rust
toolchains are reused read-only; Cargo downloads stay in the runtime directory.
The wrapper supports
macOS/Linux; other platforms have not been verified. No API key is needed.

## What setup does

1. Fetches the **official NousResearch/hermes-agent repository at an exact commit**,
   not a moving branch or another local project's installation.
2. Installs an exact uv release into a project-local bootstrap environment.
3. Uses uv to provision the pinned Python release and install Hermes using its
   upstream `uv.lock` with `--frozen --no-dev`. Hermes requires an editable
   source install; this links only to our pinned project-local checkout, never a
   global or sibling installation.
4. Registers our synthetic briefing plugin in a separate private Hermes home.
5. Runs the integration tests against the newly installed upstream Hermes API.

The repository URL, commit, Python release, and uv release are committed in
[`integrations/hermes/upstream.json`](../integrations/hermes/upstream.json).
Hermes source, dependencies, cache, and Python installations live in ignored
`.hermes-runtime/`; configuration/plugin state lives in ignored
`.hermes-gap-goblins/`. Neither directory belongs on GitHub. We do not copy or
maintain upstream implementation code in this repository or modify global Hermes.

Setup is repeatable for an unchanged checkout/profile. It preserves existing
configuration and refuses modified plugin files or a changed upstream checkout
instead of resetting/deleting them. If a download or install fails, it exits
nonzero; no success marker is written until the API tests pass. An interrupted
Git checkout may require manual inspection before retrying. Dependency build
backends execute during installation; a pinned upstream revision is a provenance
control, not a claim that third-party code has been audited.

## Everyday commands

- `bun run hermes:status` — installation readiness, revision, and disabled-model state.
- `bun run hermes:preview` — deterministic synthetic briefing, no model calls.
- `bun run hermes:test` — tests using the project-local Hermes interpreter, never global Hermes.
- `bun run hermes:setup` — install/verify again; `hermes:install` is an alias.

The preview is explicitly invented demo data, **not a running AI conversation or
actual app results**. There is no admin button, public endpoint, scheduler, CRM
write action, or messaging integration yet. Only the local OS account operates
this pilot. The briefing tool accepts an empty object only; tenant IDs, paths,
actions, and other input are rejected. Unknown facts stay `Not checked`.

## Isolation and activation boundaries

Subprocesses receive a restricted environment with an isolated OS home and
`HERMES_HOME`, without inherited app/provider keys, Python paths, global Git config,
or global Hermes state. No setup/test command launches a model session. The
wrapper has no chat/run/enable option. The dormant profile selects only our
briefing toolset and a nonfunctional local model endpoint.

**Configuration and a virtual environment are not a security sandbox.** Do not
launch the unrestricted Hermes CLI against real data yet. The plugin itself has
no filesystem, database, network, model, or write operations. Runtime installation
downloads software only; it does not send business records to a provider.

Live activation still requires owner approval for a provider and data scope, plus
a reviewed tenant-scoped read API. Never give Hermes unrestricted database access
or put multiple tenants' data in shared memory. Deterministic scoring/PDF copy,
adapter verification, and all existing consent/outreach restrictions remain.
