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
