# Architecture

## Components

- Fastify server: `src/server/index.ts`
- Twilio webhook handler: `src/server/routes.ts`
- Agent orchestrator + steps: `src/agent/*`
- Weather providers: `src/weather/*`
- Trace store: `src/trace/*`
- Simulator + replay: `cli/*`
- Evals: `evals/*`

## Text Diagram

```
[Twilio SMS]
    |
    v
[POST /webhooks/twilio/sms]
    |
    v
[Orchestrator]
  | parseIntent
  | resolveLocation
  | fetchWeather -> Open-Meteo
  | generateRecommendation
    |
    v
[TwiML Response]
    |
    v
[Trace Store JSONL]
```

## Design Tradeoffs

- TwiML vs outbound SMS: TwiML keeps webhook handling simple and avoids the REST API.
- Record/replay: traces store normalized weather to replay deterministically; `--live` bypasses.
- Provider abstraction: `WeatherProvider` allows swapping or adding providers without touching steps.
