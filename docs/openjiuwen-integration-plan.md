# OpenJiuwen integration plan

Goal: wherever DM-web needs a model or an agent, the answer comes from a **real OpenJiuwen
runtime** — not the local mock. The mock stays only as an explicit offline demo.

This plan is grounded in the runtime installed at `C:\Workspace\openjiuwen\jiuwenswarm`
(pre-installed, not vendored here) and in the bridge that already ships with this repo.

## Target shape

```text
browser (DM-web)
   │  HTTP + SSE (same-origin)
   ▼
services/oj-bridge (Node, no browser secrets)
   │  POST /api/v1/chat            (is_stream: true)   → SSE
   │  POST /api/v1/agents/list
   │  GET  /api/v1/events/stream
   │  GET  /api/v1/sessions/{id}/history/stream
   ▼
JiuwenSwarm gateway  →  agents, tools, models, A2UI
```

Two rules, borrowed from `openjiuwen-works`:

- **No fake fallback.** If the runtime is unreachable, the UI says so; it never quietly serves mock
  data.
- **Explicit contract.** The bridge translates between OJ's wire format and DM-web's transport
  events; both sides are tested against recorded fixtures.

## Mapping

| DM-web | JiuwenSwarm |
| --- | --- |
| Chat turn | `POST /api/v1/chat` with `is_stream` |
| Bee lane (Scout/Forge/Ledger) | an agent from `/agents/list` (or a team) |
| Hive task | an OJ session + run (`request_id`) |
| Activity feed | OJ event stream |
| Question card | OJ ask / permission approval event |
| Answer | `chat.answer` on the same session |
| Steer | `chat.resume` |
| Stop | `chat.cancel` |
| Reload | `/sessions/{id}/history/stream` |
| A2UI surface | OJ A2UI output on the `web` channel (already implemented in OJ) |

## Phase 0 — stand up the runtime (½ day)

- Start it: `jiuwenswarm-start app` (gateway + agent server; HTTP agent API default port `8766`).
- Confirm `GET /api/v1/health`, `POST /api/v1/agents/list`.
- Capture **one streaming transcript** as a fixture (`fixtures/oj-chat-stream.jsonl`).
- Done when: health is green and a non-streaming chat returns a real model answer.

## Phase 1 — real chat (2–3 days)

- New `services/oj-bridge/` (copy the skeleton of `services/hive-bridge`):
  `POST /api/turn` → OJ `/api/v1/chat`; relays OJ `data: {…}` frames as DM-web SSE events.
- Frame mapper (`src/transport/oj.ts` server-side or shared): OJ events → `text`, `thinking`,
  `surface`, `done`, `error`. Unknown event types are logged, not guessed.
- Session handling: one OJ `session_id` per browser session, stored in the same way the Orbit bridge
  does today.
- Config: `OJ_BASE_URL`, optional `OJ_API_KEY`, `VITE_API_MODE=mock|oj`.
- Tests: mapper unit tests against the recorded fixture; E2E with a **fake OJ** that replays the
  fixture; one manual smoke against the live runtime.
- Done when: a prompt in DM-web produces a real OJ answer, streamed, and an A2UI surface renders.

## Phase 2 — Bees and Hive (4–6 days)

- `/agents/list` → lanes; the lane stores its agent id.
- Sending in a lane opens/uses an OJ session with that agent; DM task id maps to the OJ `request_id`.
- OJ progress events → activity entries; files/A2UI artifacts → the existing artifacts panel.
- Reload: `history/stream` repopulates tasks and messages; interrupted runs surface as stopped.
- Done when: each lane runs a real OJ agent, and a page reload restores the conversation from OJ.

## Phase 3 — control surfaces (3–4 days)

- Approvals/questions: render OJ ask events as DM's question card; answers go back with `chat.answer`.
- Stop: `chat.cancel`; the existing confirmation dialog stays.
- Steer: `chat.resume` with the steer text; queueing is client-side ordering.
- Errors: map OJ error codes onto the existing conflict/retry/unavailable UI.
- Done when: a real approval can be answered, a run can be stopped and steered, and failures show
  truthfully.

## Phase 4 — hardening and packaging (3–5 days)

- `GET /health` on the bridge that probes OJ (`{"oj":"up|down","version":…}`); UI shows
  “OpenJiuwen unavailable” instead of mock data.
- Compose: OJ + bridge together; document ports, keys, and the fact that model credentials live in
  OJ's own configuration.
- Security: bind the bridge to localhost, keep OJ keys server-side, cap request size, no CORS
  widening.
- CI: deterministic E2E with the recorded OJ fixture; nightly/manual smoke against a live runtime.
- Done when: CI is green without OJ installed, and the documented compose stack gives a real chat
  and real Hive tasks.

## Effort

| Phase | Size |
| --- | --- |
| 0 runtime + fixture | ½ day |
| 1 real chat | 2–3 days |
| 2 Bees/Hive | 4–6 days |
| 3 control | 3–4 days |
| 4 hardening | 3–5 days |
| **Total** | **~3 weeks for one engineer** |

## Non-goals (this plan)

- Huawei AGC account login; the runtime runs locally with its own model configuration.
- Porting OJ's Router/Host/Harness/Store into the browser app.
- Multi-tenant auth or cloud hosting of OJ.
- Replacing DM's Hive contract: the bridge adapts it onto OJ sessions.

## Risks and open questions

| Risk | Mitigation |
| --- | --- |
| OJ event schema changes | Pin the OJ version, keep fixtures, fail loudly on unknown events |
| Long-running tasks | SSE keepalives, resume via `history/stream` |
| Session ownership | OJ expects a user/scope; map it to DM's single local user id |
| Latency / cost | Streaming UX already exists; model keys and quotas stay in OJ |
| Licensing | OJ and this repo are Apache-2.0; distribution of both must be documented |

## Definition of done

With OJ running, every user-visible model action — a chat reply, a Bee task, a question — is produced
by the real runtime; with OJ stopped, DM-web reports it as unavailable and offers the explicit local
demo instead. No silent mocking anywhere in the real path.

## Status (2026-11-26)

- **Phase 0 — done.** JiuwenSwarm runs locally with the HTTP API enabled (`AGENT_HTTP_ENABLED=1`,
  port `8770`) and a real model (`deepseek-v4-flash`). `/api/v1/health`, `/api/v1/agents/list` and a
  unary chat turn were verified.
- **Phase 1 — done.** `services/oj-bridge` implements the app's chat contract against OJ:
  `/api/orbit/health`, `/api/orbit/turn` (SSE), `/api/orbit/reset`, plus `/api/oj/agents`. A real
  streamed turn through the bridge returned OJ's answer. The app gains a runtime **Settings → Live
  backend** URL (stored in `digitalmate.liveBackend`) that overrides `VITE_API_BASE`; an unreachable
  backend is reported instead of mocked.
- **Verified with OJ running:** health probe, streamed text, one thinking step, `done`; unit tests for
  the frame mapper and the bridge endpoints; Playwright for the live and unreachable paths.
- **Next:** Phase 2 (lanes as OJ agents, Hive tasks as sessions), then Phase 3 (approvals, stop,
  steer, history).

### Phase 2 status (2026-11-26)

Implemented in `services/oj-bridge/hive.mjs`, verified against a live JiuwenSwarm:

- **Lanes from OJ agents** — `/api/v1/agents/list` becomes the Bee list; internal utility agents are
  filtered; Beebou stays the host lane.
- **Tasks are OJ sessions** — `send` starts a real streamed turn; status, step and output come from
  OJ (`chat.delta`, `chat.final`, `chat.reasoning`, `chat.tool_call`, `chat.error`).
- **Queue, stop, preempt, steer** — queued work waits for the lane; stop aborts the stream; a steer is
  recorded on the task and a preempt stops and replaces the run.
- **Artifacts and memory** — a finished task keeps its output as an artifact and a memory entry;
  cut-off/restore work per lane.
- **Attachments** — uploaded bytes are kept by the bridge and served back to the app.

Still open for Phase 3: OJ questions/approvals mapped to the question card, history replay via
`/sessions/{id}/history/stream`, and per-agent (not just per-lane) routing.

### Phase 3 status (2026-11-26)

- **Questions and answers** — `chat.ask_user_question` becomes the task's question card with its options;
  answering sends `chat.answer` (`request_id` + `answers[{question_id, answer}]`) and continues the same
  OJ session. Wrong/duplicate answers surface the runtime's error instead of being ignored.
- **History across restarts** — the bridge stores tasks, messages, activity and memory to
  `OJ_BRIDGE_STATE` (JSON file, optional); tasks that were running when it stopped resume as
  “Interrupted by restart”. `reset` clears the file.
- **Stop/steer/preempt** already exercised; steer is recorded on the task, preempt stops and replaces.

Still open: OJ-native permissions/approvals UI beyond ask_user_question, and replaying a full OJ session
history (`/sessions/{id}/history/stream`) instead of the bridge's own record.

## Live validation notes (2026-11-26)

- A real `chat.ask_user_question` was produced by JiuwenSwarm and matched the bridge's mapping
  (`questions[{question, header, options}]`, `request_id`, `interrupt_id`, `source: ask_user_interrupt`).
- Resuming it works: the bridge sends `chat.send` with `query: ''`, `source: ask_user_interrupt`, the
  question's `request_id`, its `interrupt_id`, and
  `answers: [{question, selected_options: [], custom_input}]`. The runtime accepted the answer and
  finished the turn with a real model reply (verified end to end against the local runtime).
- If the runtime asks the same question again, the bridge fails the task with a clear message rather
  than looping.
### Phase 4 status (2026-11-26)

- **CORS allowlist** — `BRIDGE_ALLOWED_ORIGINS` (default `*` for local dev; set it to the exact
  origins, e.g. `https://localhost` for the Android shell).
- **Body cap** — `BRIDGE_MAX_BODY_BYTES` (default 12 MB); oversized requests get `413 PAYLOAD_TOO_LARGE`.
- **Bridge bind/host** — `OJ_BRIDGE_HOST` (default `127.0.0.1`; compose sets `0.0.0.0`).
- **Packaging** — `services/oj-bridge/Dockerfile` and `deploy/oj/docker-compose.yml` (runtime +
  bridge, state volume, private port binding).
- **Runbook** — `docs/openjiuwen-deployment.md`: local, LAN/phone, TLS, compose, troubleshooting.
- **CI** — the bridge's fake-OJ unit tests run in `npm test`, which the existing CI job executes.
