---
title: "SIGI: an AI service assistant that won Gold at Agrarfuchs 2026"
description: "How I built a self-hosted assistant that reads live machine data to find faults in barn equipment, connected to our devices through MCP."
date: 2026-11-25
tags: ["AI", "MCP", "RAG", "Self-hosted", "Industrial software"]
draft: true
---

> **TODO before publishing:** fill in the remaining `TODO(you)` gaps, check with Schauer that the
> level of detail is fine, then delete this box.

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

Answers come from retrieval, not from what the model happens to remember. I indexed our machine
manuals, and SIGI pulls the relevant passages in before it answers, so an answer points at the real
procedure for that machine.

Customer service reports close the loop: what SIGI stated gets compared with what the service
report later recorded, and that feedback goes back into the system.

### Live machine data through MCP

SDU-X is Schauer's barn controller: the touch control unit farmers use to run feeding, littering
and the other systems in a barn. The model talks to it through MCP (Model Context Protocol). I wrote
the MCP server for SDU-X, so the assistant reads live state and fault data from the controller
instead of guessing from a description.

### One aggregator for every device

One MCP server per device type does not scale when an agent needs to see a whole barn. I built an
MCP aggregator: every device's MCP server registers with it, and the agent connects to a single
endpoint that exposes all of them. Adding a new device type means adding one more server behind the
aggregator. The agent's setup doesn't change.

I also mentored an intern on the team and helped him build on the aggregator.

## What SIGI does

- Reads the machine's live state and fault data at the moment someone asks for help.
- Explains the likely cause and the next check, grounded in our documentation.
- Users talk to it through our internal chatbot, so there is nothing new to install or learn.

## What I learned

**Clean data from day one decides how good the AI gets.** The model was never the hard part. What
made SIGI work was data it could actually reach and trust: manuals it could index, controllers it
could query through one interface, service reports it could learn from. Data that is hard to access
or messy doesn't get better because there is an AI in front of it; it just produces confident wrong
answers faster.

If I started again, I would put even more effort into structure and access first, and treat the
model as the last piece.

## Results

TODO(you): anything measurable you are allowed to share (time to diagnosis, calls resolved without
a visit, pilot farms). If there are no numbers yet, say what you are measuring.
