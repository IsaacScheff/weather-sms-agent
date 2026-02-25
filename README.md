# weather-sms-agent

An SMS agent workflow service that answers weather questions and gives short, actionable recommendations.

## Quickstart

```bash
pnpm install
cp .env.example .env
pnpm dev
```

### Run the simulator

```bash
pnpm sim "weather in Brooklyn tomorrow, what should I wear?"
```

### Run tests

```bash
pnpm test
```

### Run evals

```bash
pnpm evals
```

## Environment Variables

- `PORT` - server port (default 3000)
- `TWILIO_AUTH_TOKEN` - optional; enables Twilio signature verification
- `DEFAULT_LOCATION` - fallback location when user does not specify one
- `FEATURE_INCLUDE_REF_ID` - include trace ID in SMS responses
- `TRACE_STORE_PATH` - path to JSONL trace store
- `MAX_INPUT_CHARS` - clamp long inbound messages

## Architecture Overview

Flow:
1. `POST /webhooks/twilio/sms` receives inbound SMS (TwiML response).
2. Orchestrator runs deterministic steps and emits trace events.
3. Trace is persisted for replay and idempotency.

Steps:
- `parseIntent` -> date/activity/location
- `resolveLocation` -> geocode to coordinates
- `fetchWeather` -> provider + normalization
- `generateRecommendation` -> SMS response

See `docs/architecture.md` for details.

## Twilio Integration

This service returns TwiML to respond to inbound SMS. Configure your Twilio webhook URL to:

```
POST /webhooks/twilio/sms
```

## Simulator and Replay

- `pnpm sim "..."` runs the agent without Twilio and prints the trace.
- `pnpm replay <trace_id>` replays a stored trace using recorded weather unless `--live` is provided.
