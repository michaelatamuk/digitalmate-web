# Upstream Hive payload fixtures

Copied verbatim from `openJiuwen-ai/DigitalMate` at commit
`2b9b721d7439009da7dd93095713a10243fc8b92` (2026-11-16):

| File here | Upstream path | Captured by |
| --- | --- | --- |
| `phase2-payloads.json` | `tests/fixtures/hive-client-phase2/payloads.json` | `tests/scenarios/hive/test_phase3_client_payloads.py` from real Phase 2 server traffic |
| `task-refs-payloads.json` | `tests/fixtures/hive-client-task-refs/payloads.json` | same generator, issue #1563 real server payloads |

Do not edit these by hand. When upstream refreshes them, re-copy and update
`src/transport/hiveUpstream.ts` plus `tests/hiveUpstream.test.ts` if a vocabulary changed.

They exist so the web contract is checked against real server shapes rather than our own guesses:
`tests/hiveUpstream.test.ts` asserts every status in the fixtures maps onto our domain, and that
task rows convert into `HiveTask`.
