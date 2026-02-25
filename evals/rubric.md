# Eval Rubric

Each case is scored on:

- Must include temperatures (`High` and `Low`) when available.
- Must include at least two concrete recommendations (delimited by `·`).
- Must not exceed `max_chars`.
- Must include `expected_contains` tokens (case-insensitive).

Any failing `high` severity case fails the eval run.
