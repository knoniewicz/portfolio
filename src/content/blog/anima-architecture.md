---
title: "Anima: two versions of my personal infrastructure, and why I replaced it"
description: "From Redis, Postgres and a supervisor to a small TCP router, SQLite and Lua, and why I finally swapped the whole thing for one agent with scripts."
date: 2026-11-26
tags: ["Go", "Architecture", "SQLite", "Self-hosted"]
draft: true
---

Anima was the system that tied my personal infrastructure together: connectors that fetch data, a
store that keeps it, automations that react to it, a UI that shows it, and an agent for the steps
that need judgement. All of it ran on my own machines, with no cloud dependency.

I have since retired it. This post is about why its second version was much better than the first,
and why even the better version lost to something simpler. The short answer: I built a distributed
system for an audience of one, and paid the distributed-systems tax without getting any of the
benefits. What replaced it is [Bober](/projects/bober), a single agent with custom Lua scripts.
Three pieces survived and live on as open-source projects: Kor, Korpus and Kron.

## Version one: three problems I created myself

```
service -> Redis pub/sub -> Korpus -> JSON Schema -> Postgres
                 ^
                Sol (extension supervisor + MCP daemon)
```

- **Redis pub/sub** carried every event, including the ones that had to be stored. Pub/sub is
  at-most-once: if a consumer was down, its messages were simply gone.
- **Korpus** validated events against JSON Schemas and wrote them to **Postgres**. Because events
  arrived in any order, a child record could show up before its parent, so Korpus grew
  foreign-key-aware buffering and retries.
- **Sol** discovered extensions on disk, supervised their processes and proxied their tools over
  MCP: a hand-written process manager on a machine that already runs systemd.

Lost messages, write ordering and supervision weren't requirements. They were side effects of the
design, and each one cost code to work around.

## Version two: fewer guarantees, placed where they matter

```
 Kron (Lua connectors          UI
 and automations)               |
        \                       |
         v                      v
 agent  <---->  KOR  (handle / request / publish / subscribe)
                 ^
                 |
              KORPUS  (schemas -> validate -> SQLite)
```

The redesign started from one question: which messages actually need to arrive? Writes do,
notifications don't. Version one gave both the same weak guarantee. Version two gives each the one
it needs.

### Kor: the only glue

[Kor](https://github.com/knoniewicz/kor) is a small TCP message router in Go. Services connect,
register the handlers they serve and the subjects they listen to, and call each other by name. The
wire protocol is a handful of length-prefixed frames (hello, handle, subscribe, publish, request,
response, error, ping), and Kor itself has no business logic.

It replaced Redis, Sol and MCP as the glue. Supervision went back to systemd, and every client
reconnects and re-registers on its own, so a restart anywhere heals without coordination.

### Korpus: writes are requests, not events

[Korpus](https://github.com/knoniewicz/korpus) became a plain Kor service on SQLite (pure Go,
WAL mode). The important change is the write contract:

- A write is a **request with an acknowledgement**, sent only after the SQLite commit. Writers
  retry until they get it, which makes delivery at-least-once.
- **Ids are deterministic** (for example a hash of the source URL), so a retried write is an
  idempotent upsert. At-least-once delivery plus idempotent writes gives effectively-once storage
  without any distributed transaction.
- **Relations are plain ids** inside the JSON, with no enforced foreign keys. Once order no longer
  matters, the whole buffering and retry machinery from version one has nothing left to do.
- Publications (`korpus.<type>.written`) are only notifications. Losing one is acceptable,
  because the data is already safe.

Korpus also stopped owning everyone's schemas. Each service registers the schemas of its own types
at startup, and registering an identical schema again is a no-op, so deploys need no migration
step.

### Kron: automations as Lua files in git

[Kron](https://github.com/knoniewicz/kron) is one long-lived Go process that runs Lua connectors
and automations. It has exactly two trigger kinds, time (`every`, `at`) and event (`on`), and a
job is a short file:

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

The sandbox is deny-by-default: no filesystem, no `os`, no `require`. Network access goes through
`ctx.http_*`, environment variables need an allow-list, and every run has a timeout enforced inside
the VM. Each run also writes an `automation.run` record to Korpus, so a failed job, or one that
silently never ran, is visible and raises an alert instead of disappearing.

### The edges

Small bridges live in [kor-ext](https://github.com/knoniewicz/kor-ext): webhooks become Kor
events, events go out as ntfy notifications, Kor handlers are exposed to agents as MCP tools, and
an OpenAPI spec becomes a set of handlers.

## Rules I kept

- **One writer.** Everything durable goes through Korpus, so there is one place to validate, back
  up and reason about.
- **Ack what matters, publish what doesn't.** Pick the delivery guarantee per message, not per
  system.
- **Raw and derived data stay apart.** Anything an LLM produced carries its model and prompt
  version, so it can be recomputed without fetching the source again.
- **Actions that touch the world need a human confirmation.** Notify-only automations don't.
- **Boring parts on purpose.** SQLite, systemd, plain JSON and Lua files are all easy to debug at
  2 a.m.

## Why I replaced it anyway

**I should have started with a monolith.** Version two fixed the design, but not the shape. Every
service was still one more process to deploy, monitor, version and keep compatible with the
others. In a company, that cost buys independent teams and independent scaling. For one person's
infrastructure it buys nothing, and I paid it on every change.

What I actually wanted from Anima all along was small scripts reacting to my data. Bober does
exactly that inside one process: an agent with custom Lua scripts, with far fewer moving parts and
nothing to keep in sync. The lesson I took away is that a service boundary should follow an
organisational boundary. If there's only one of you, there probably isn't one.

Kor, Korpus and Kron still stand on their own as open-source projects, for anyone who does need the
pieces separate.
