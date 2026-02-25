# Runbook

## Debug a Failed Request

1. Find the `trace_id` in logs (or enable `FEATURE_INCLUDE_REF_ID=true` to include it in SMS).
2. Look up the trace in `TRACE_STORE_PATH` (JSONL lines).
3. Inspect step events for `step_failed` and error details.

## Replay a Trace

```bash
pnpm replay <trace_id>
```

To fetch live weather again:

```bash
pnpm replay <trace_id> --live
```

## Common Failure Modes

- Geocoding failure: location text is ambiguous or invalid.
- Provider timeout: Open-Meteo unreachable; retry is limited to 1.
- Twilio retry: webhook processed more than once; idempotency uses MessageSid.

## Trace ID in Logs

The server logs include `trace_id`. You can also enable `FEATURE_INCLUDE_REF_ID=true` to add `(ref: trace_...)` to SMS responses.
