---
title: "Anima: two versions of my personal infrastructure, and why I replaced it"
description: "From Redis, Postgres and a supervisor to a small TCP router, SQLite and Lua, and why I finally swapped the whole thing for one agent with scripts."
date: 2026-11-26
tags: ["Go", "Architecture", "SQLite", "Self-hosted"]
draft: true
---

Anima is the private system that ties my personal infrastructure together: collectors that fetch
data, a store that keeps it, automations that react to it, a UI that shows it and an agent that
helps when judgement is needed. It runs on my own machines with no cloud dependency.

Or rather, it was. I have stopped building Anima: the services were more work to run than they
were worth for one person, and what I actually wanted from it now lives in
[Bober](/projects/bober), one agent with custom Lua scripts. Kor, Korpus and Kron came out of it
and live on as open-source projects.

This post is about the second version: what changed from the first, why, and why I still ended up
replacing it.

## Version one

```
service -> Redis pub/sub -> Korpus -> JSON Schema -> Postgres
                 ^
                Sol (extension supervisor + MCP daemon)
```

- **Redis pub/sub** carried every event. It is fire-and-forget: if a consumer was down, its
  messages were gone.
- **Korpus** validated events against JSON Schemas and wrote them to **Postgres**. Child records
  could arrive before their parents, so Korpus needed foreign-key-aware ordering and retries.
- **Sol** discovered extensions on disk, supervised them and proxied their tools over MCP.

Three of these were solving problems I had created myself: lost messages, write ordering and a
custom supervisor.

## Version two

```
 Kron (Lua connectors      Lodge (UI)
 and automations)            |
        \                    |
         v                   v
 agent  <---->  KOR  (handle / request / publish / subscribe)
                 ^
                 |
              KORPUS  (schemas -> validate -> SQLite)
```

### Kor: the only glue

[Kor](https://github.com/knoniewicz/kor) is a small TCP message router written in Go.
Services connect, register the handlers they serve and the subjects they listen to, and then call
each other by name. The wire protocol is a handful of length-prefixed frames: hello, handle,
subscribe, publish, request, response, error, ping. Kor has no business logic.

It replaced Redis, Sol and MCP as the glue. Supervision moved to systemd, so every client
reconnects on its own.

### Korpus: writes are requests, not events

[Korpus](https://github.com/knoniewicz/korpus) is now just a Kor service on SQLite (pure Go, WAL).
The important change is the write contract:

- A write is a **request with an ack**, sent after the SQLite commit. Collectors retry until they
  get it.
- **Ids are deterministic** (for example a hash of the source URL), so a retry is an upsert.
- **Relations are plain ids** inside the JSON, with no enforced foreign keys. The whole ordering
  and retry machinery from version one disappeared.
- Publications (`korpus.<type>.written`) are only notifications, where losing one is acceptable.

Korpus also stopped owning schemas. Each service registers the schema of its own types when it
starts, and registering the same schema again is a no-op.

### Kron: automations as Lua files in git

[Kron](https://github.com/knoniewicz/kron) is one long-lived Go process that runs Lua connectors
and automations. There are only two trigger kinds: time (`every`, `at`) and event (`on`).
A job looks like this:

```lua
automation "morning-brief" {
  at = "06:00",
  catchup = true,
  run = function(ctx)
    local d = ctx.query("ops.failed_unit", { limit = 20 })
    local text = ctx.ask("Summarise; omit anything healthy.", d)
    ctx.write("brief", ctx.today(), { text = text })
  end,
}
```

The Lua sandbox has no filesystem, no `os` and no `require`. Network goes through `ctx.http_*`
only, environment variables need an allow-list, and every run has a timeout. Each run writes an
`automation.run` record to Korpus, so a failed or missed run shows up in the UI and raises an alert.

### The edges

Small bridges live in [kor-ext](https://github.com/knoniewicz/kor-ext): webhooks become Kor
events, events go out as ntfy notifications, Kor handlers are exposed as MCP tools for agents, and
an OpenAPI spec becomes a set of handlers.

## Rules I kept

- **One writer.** Everything durable goes through Korpus.
- **Ack what matters, publish what doesn't.** Writes are acked requests; notifications may be lost.
- **Raw and derived data stay apart.** Anything an LLM produced carries the model and prompt
  version, so it can be recomputed without fetching the source again.
- **Actions that touch the world need a confirmation** in the UI. Notify-only automations don't.
- **Boring parts on purpose.** SQLite, systemd, plain JSON and Lua files are easy to debug at
  2 a.m.

## What I would do differently

**I would start with a monolith.** Splitting Anima into services felt clean, but every service
was one more process to deploy, watch and keep in step with the others, and for one person's
infrastructure that cost never paid for itself. It is the main reason I stopped building Anima.

What I wanted from it all along was small scripts reacting to my data. Today that is
[Bober](/projects/bober), one agent with custom Lua scripts, which does what Anima was meant to do
with far fewer moving parts. Kor, Korpus and Kron still stand on their own as open-source projects
for anyone who does want the pieces separate.
