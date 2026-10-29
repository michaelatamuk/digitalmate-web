# Web bridge (planned)

The browser cannot safely perform the native Huawei/AGC account exchange or keep provider
credentials. This service will be the trusted boundary between the web UI and a
Jiuwen/Orbit gateway.

## Planned responsibilities

- Serve the built web app in production if desired
- Handle the account/Gateway authentication exchange
- Keep Gateway tokens server-side or in an HttpOnly session
- Open the WSS connection to `/orbit/ws`
- Forward JSON protocol frames between the browser and gateway
- Enforce origin checks, rate limits and request size limits
- Redact credentials and sensitive payloads from logs

## Non-goals

- Replacing the Orbit/Jiuwen agent runtime
- Storing long-lived user credentials in the browser
- Implementing business tools or provider adapters

## Status

Not implemented. The current web app runs entirely on local mock data.
