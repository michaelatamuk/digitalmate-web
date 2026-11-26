# Running DigitalMate Web against OpenJiuwen

This is the operator guide for the live path: browser or Android app → bridge →
JiuwenSwarm → model provider.

## 1. Local (desktop)

```bash
# runtime (installed checkout)
cd /path/to/jiuwenswarm
AGENT_HTTP_ENABLED=1 AGENT_HTTP_PORT=8770 ./venv/bin/jiuwenswarm-start app

# model settings live in ~/.jiuwenswarm/config/.env
#   API_BASE=https://api.deepseek.com
#   API_KEY=sk-...
#   MODEL_NAME=deepseek-v4-flash
#   MODEL_PROVIDER=OpenAI

# bridge (this repo)
OJ_BASE_URL=http://127.0.0.1:8770 npm run bridge:oj
```

Check both:

```bash
curl -s http://127.0.0.1:8770/api/v1/health          # {"ok": true}
curl -s http://127.0.0.1:8790/api/orbit/health      # configured: true
curl -s http://127.0.0.1:8790/api/hive/snapshot | head
```

Then in the app: **Settings → Live backend** → `http://127.0.0.1:8790` → **Test** → **Save**.
Chat turns and Hive both use the runtime. Clearing the field returns to the local demo.

## 2. Phone on the same network

1. Start the runtime and bridge on a machine that stays on (`OJ_BRIDGE_HOST=0.0.0.0`).
2. Find the LAN address, e.g. `http://192.168.1.20:8790`.
3. Build the APK with that base (`VITE_API_BASE=http://192.168.1.20:8790`) or type it in
   Settings on the phone.
4. Android blocks cleartext HTTP by default: either enable it for the debug build
   (`android:usesCleartextTraffic="true"`) or put TLS in front. Never ship a release
   with cleartext.

## 3. Always-on / cloud

- Put the bridge and runtime on a VM or a home box; the runtime needs outbound access to the
  model provider, not inbound.
- Terminate TLS with Caddy or a tunnel (Cloudflare Tunnel, Tailscale). Example Caddy site:

  ```
  oj.example.com {
      reverse_proxy 127.0.0.1:8790
  }
  ```

- Set `BRIDGE_ALLOWED_ORIGINS=https://localhost` for the Android shell; add the web origin
  if it is hosted elsewhere.
- Set `BRIDGE_TOKEN` and pass `VITE_HIVE_BRIDGE_TOKEN` / the app token so only your clients
  can call it.
- Keep the runtime port private; only the bridge should be reachable.

## 4. Docker Compose

`deploy/oj/docker-compose.yml` runs the runtime and the bridge together. Set `OJ_IMAGE`
to the JiuwenSwarm image your organisation uses, mount its config volume, then:

```bash
OJ_IMAGE=... BRIDGE_TOKEN=... docker compose -f deploy/oj/docker-compose.yml up -d
```

The bridge binds `127.0.0.1:8790` in the compose file on purpose; front it with TLS before
exposing it.

## 5. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `model_not_configured` / “No valid model entries” | runtime `.env` unset, wrong path, or saved with a UTF‑8 BOM | Edit `~/.jiuwenswarm/config/.env` without a BOM; the first key must be readable |
| `401` from the bridge | `BRIDGE_TOKEN` set, no `Authorization` header | Send `Bearer <token>` |
| CORS failure from the Android shell | origin not allowed | Add `https://localhost` to `BRIDGE_ALLOWED_ORIGINS` |
| `413 PAYLOAD_TOO_LARGE` | attachment/base64 above the cap | Raise `BRIDGE_MAX_BODY_BYTES` deliberately |
| “The live backend is unreachable” in chat | bridge or runtime down | `curl /api/orbit/health`, check the runtime log |
| Hive shows “Unavailable” | bridge up, runtime down | Check `/api/v1/health` on the runtime |
| Question answer re-asks | wrong resume payload | The bridge sends `chat.send` + `source` + `request_id` + `interrupt_id` + `answers`; verify the runtime version |

Runtime logs: `~/.jiuwenswarm/agent/.logs/full.log` (the bridge adds no logs of its own
unless started in a terminal).

## Zero-configuration development

With the runtime and bridge running locally, `npm run dev` needs no setting: Vite proxies
`/api/orbit` and `/api/hive` to `http://127.0.0.1:8790` (override with `VITE_DEV_API_TARGET`), and
the app probes `/api/orbit/health` on load. When a bridge answers, chat and Hive use it automatically
and the result is remembered in `digitalmate.liveBackendAuto`. When it does not, the app stays on the
local demo. "Use local demo" in Settings clears the remembered choice.

Tests set `VITE_AUTO_BACKEND=off`, so the in-process Orbit mock and the mock Hive transport remain the
subjects of the existing suites.
