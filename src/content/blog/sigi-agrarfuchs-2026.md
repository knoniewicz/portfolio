---
title: "SIGI: an AI service assistant that won Gold at Agrarfuchs 2026"
description: "How I built a self-hosted assistant that reads live machine data to find faults in barn equipment, connected to our devices through MCP."
date: 2026-11-25
tags: ["AI", "MCP", "RAG", "Self-hosted", "Industrial software"]
draft: true
---

> **TODO before publishing:** fill in the `TODO(you)` gaps, check with Schauer that the level of
> detail is fine, then delete this box.

At Agraria Wels 2026, SIGI won **Gold** in the *work efficiency and workplace quality* category of
the Agrarfuchs innovation award, presented by Agraria together with the Österreichische
BauernZeitung ([winners](https://agraria.at/neuheiten/agrarfuchs-2026-das-sind-die-preistr-ger)).
SIGI is Schauer Agrotronic's AI service assistant: it analyses faults using live data from the
machines themselves.

I built most of SIGI. This post covers the problem, how it is put together and what I would keep.

## The problem

TODO(you): what a service call looked like before SIGI. Who calls whom when a feeding system or
stall machine stops, what information the technician has, what takes the time.

## How it is built

### A model that runs on our own hardware

The language model is self-hosted and runs locally. No machine data and no customer data leave
our infrastructure, and there is no per-request bill for a cloud API.

TODO(you): the model and serving stack you are allowed to name, and the hardware it runs on.

### Grounded in our documentation

Answers come from retrieval, not from what the model happens to remember. I indexed our
documentation (TODO(you): manuals, fault code tables, service notes?) and SIGI pulls the relevant
passages in before it answers, so an answer points at the real procedure for that machine.

### Live machine data through MCP

The model talks to the machines through MCP (Model Context Protocol). I wrote the MCP server for
SDU-X, so the assistant can read live state and fault data from it instead of guessing from a
description.

TODO(you): one sentence on what SDU-X is, for readers outside Schauer.

### One aggregator for every device

One MCP server per device type does not scale when an agent needs to see a whole barn. I built an
MCP aggregator: every device's MCP server registers with it, and the agent connects to a single
endpoint that exposes all of them. Adding a new device type means adding one more server behind the
aggregator. The agent's setup doesn't change.

I also mentored an intern on the team and helped him build on the aggregator.

## What SIGI does

- Reads the machine's live state and fault data at the moment someone asks for help.
- Explains the likely cause and the next check, grounded in our documentation.
- TODO(you): how farmers or technicians talk to it, and when it hands over to a human.

## What I learned

TODO(you): two or three lessons. Good candidates: why live machine state beats a general chatbot;
what self-hosting cost and what it bought; why one aggregation point made the agent simpler;
what mentoring taught you about your own design.

## Results

TODO(you): anything measurable you are allowed to share (time to diagnosis, calls resolved without
a visit, pilot farms). If there are no numbers yet, say what you are measuring.
