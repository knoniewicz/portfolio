---
title: "SIGI: an AI service assistant that won Gold at Agrarfuchs 2026"
description: "How I built a self-hosted assistant that reads live machine data to find faults in barn equipment, connected to our devices through MCP."
date: 2026-11-25
tags: ["AI", "MCP", "RAG", "Self-hosted", "Industrial software"]
draft: true
---

> **TODO before publishing:** check with Schauer that the level of detail is fine, then delete
> this box.

At Agraria Wels 2026, SIGI won **Gold** in the *work efficiency and workplace quality* category of
the Agrarfuchs innovation award, presented by Agraria together with the Österreichische
BauernZeitung ([winners](https://agraria.at/neuheiten/agrarfuchs-2026-das-sind-die-preistr-ger)).
SIGI is Schauer Agrotronic's AI service assistant. It diagnoses faults in barn equipment using
live data from the machines themselves.

I built most of SIGI. This post covers the problem it solves, how it is put together, and the one
lesson I would pass on to anyone building something similar.

## The problem: diagnosis by description

When something in a barn stopped, the slow part was finding out why. Someone had to walk to the
device and read it, or our cloud sent a notification, and then came a call to customer service, a
call to a technician, or a search through the documentation.

Every one of those paths has the same weakness: a person reconstructs the machine's state from a
description. "It shows an error and the valve doesn't open" is where a diagnosis starts, and the
questions that follow are mostly the machine's own data, asked for one item at a time over the
phone.

SIGI is built for everyone on those paths: farmers, customer service and technicians all get the
same assistant, looking at the same live data.

## How it is built

### A model on our own hardware

The language model is an open-weights model running on a GPU server in our own building. No
machine data and no customer data leave our infrastructure, there is no per-request bill for a
cloud API, and we control which model version answers.

### Grounded in our documentation

Answers come from retrieval, not from whatever the model happens to remember. I indexed our machine
manuals, and SIGI pulls the relevant passages in before it answers, so an answer points at the
documented procedure for that specific machine instead of a plausible-sounding general one.

The hardest part was the images. Our manuals are full of them: wiring diagrams, exploded views,
photos of the right valve or sensor. Text-only retrieval silently drops half of what a technician
actually needs, so making the images useful is where I spent most of my time, building candidate
approaches and benchmarking them against each other. What we ended up with stays in-house.

Customer service reports close the loop. What SIGI said in a case is compared with what the service
report later recorded as the actual cause, and that feedback goes back into the system. Every
resolved case makes the next answer better grounded.

### Live machine data through MCP

SDU-X is the control hardware inside our products, and every SDU-X device can be queried directly.
SIGI talks to them through MCP (Model Context Protocol): I wrote the MCP server for SDU-X, so the
assistant reads live state and fault data from the machine itself. That turns the first ten
minutes of a support call, "what does the screen say?", into a tool call.

### One aggregator for every device

One MCP server per device type doesn't scale when an agent needs to see a whole barn. The answer
is an MCP aggregator: every device's MCP server registers with it, and the agent connects to a
single endpoint that exposes all of them. Adding a new device type means adding one more server
behind the aggregator, and the agent's configuration doesn't change.

The aggregator also became an internship project. I mentored an intern on the team: I walked him
through the infrastructure, and as his internship work he wrote the first prototype. It was rough,
as first prototypes are, but it proved the idea. The aggregator SIGI runs on today is my heavy
rewrite, built on that prototype.

## What SIGI does

- Reads the machine's live state and fault data at the moment someone asks for help.
- Explains the likely cause and the next check, grounded in our documentation.
- Lives in our internal chatbot, so nobody has to install or learn a new tool.

## What I learned

**Clean data from day one decides how good the AI gets.** The model was never the hard part. What
made SIGI work was data it could actually reach and trust: manuals it could index, controllers it
could query through one interface, service reports it could learn from.

The reverse is just as true. An AI layer doesn't fix data that is messy or hard to access; it
turns that mess into confident wrong answers, faster. If I started again, I would spend even more
of the effort on structure and access first, and treat the model as the last, most replaceable
piece.

## Results

We don't have numbers yet, and I won't invent any. What I can describe is how it feels: support
gets to "this is what's wrong" faster, because the conversation starts from the machine's actual
state instead of a description of it. Time to diagnosis is what SIGI is built to shorten, and it is
the first thing I would measure.
