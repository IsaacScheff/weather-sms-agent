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

Use `EVAL_MODE=fixture pnpm evals` to run without network calls using `evals/fixtures/`.

### Staging deploy

1) Create a Fly deploy token scoped to your staging app, then add it to GitHub Secrets as `FLY_API_TOKEN`:

```bash
flyctl tokens create deploy -a weather-sms-agent-staging
```

2) Run the `deploy-staging` workflow from the Actions tab (manual trigger).

### Postgres (optional)

Local run (Docker):

```bash
docker run --name weather-sms-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=weather_sms -p 5432:5432 -d postgres:16
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/weather_sms
pnpm migrate
```

Enable Postgres storage:

```bash
export TRACE_STORE_MODE=postgres
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/weather_sms
```

Staging on Fly:
1) Provision a Postgres database (Fly Postgres or managed) and obtain the connection string.
2) Set it as a secret: `flyctl secrets set DATABASE_URL=... -a weather-sms-agent-staging`.
3) Set `TRACE_STORE_MODE=postgres` in your staging app env.

## Environment Variables

- `PORT` - server port (default 3000)
- `TWILIO_AUTH_TOKEN` - optional; enables Twilio signature verification
- `DEFAULT_LOCATION` - fallback location when user does not specify one
- `FEATURE_INCLUDE_REF_ID` - include trace ID in SMS responses
- `TRACE_STORE_PATH` - path to JSONL trace store
- `TRACE_STORE_MODE` - trace store backend (`file`, `memory`, or `postgres`, default `file`)
- `DATABASE_URL` - Postgres connection string (required for `TRACE_STORE_MODE=postgres`)
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
