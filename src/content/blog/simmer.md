---
title: "Simmer: replacing the software on a kitchen robot"
description: "A faster app for the Monsieur Cuisine Connect, with motor safety I can test, a phone companion and an API agents can use."
date: 2026-11-26
tags: ["Android", "Kotlin", "Embedded", "Safety"]
draft: true
---

> **TODO before publishing:** check the scope, the upstream credit and the disclaimer, then delete
> this box.

My kitchen robot is a Lidl Monsieur Cuisine Connect (SKMC 1100 A1): a heated blender with a motor,
a scale and an Android 6 tablet bolted on top. The hardware is genuinely good. The software is
slow, closed, and doesn't talk to anything else in my home.

Simmer is my replacement for that software. It started as a fork of
[MrCuisineVibeConnect](https://github.com/Wuki60/MrCuisineVibeConnect) (MIT) and has grown into
three parts:

- **The robot app**, on the robot's own tablet: guided cooking, manual mode, programs, the scale and
  the motor link.
- **A companion web app** (Preact), served by the robot itself: meal plan, recipes, shopping list
  and prep, from a phone or a desktop.
- **A recipe library** service with English search, "what can I cook with what I have" and dislikes.

> Simmer is an independent project, not affiliated with Lidl, SilverCrest or Hoyer.

## Safety first, because there is a blade

The app drives the motor controller over a serial link, based on a public analysis of the
protocol. Replacing the stock app means inheriting every guarantee it used to provide, so the safety
rules don't live in the UI. They live in a pure-Kotlin core with unit tests, independent of
Android, where they can be tested without a robot on the desk:

- The motor won't run with the lid open.
- Stopping asks for confirmation.
- Hot contents ramp the speed up instead of jumping.
- Faults latch: the robot stays stopped until someone acknowledges the fault.

Every preset (chop, knead, ferment, cleaning) compiles down to the same manual job and passes
through the same rules, so there is exactly one code path to the motor and one place to get it
right. Heated cleaning, for example, can never exceed speed 3.

## Cooking that gets out of the way

- One tap per step. The next step waits for your press, and a cook resumes after a power cut.
- Weigh steps advance by themselves once the scale has held the target for 1.5 seconds, with undo.
- A **Prepare** screen before a guided cook lists what to peel, wash, chop or bring to room
  temperature.
- Servings scale from 1 to 12. Amounts change; times and speeds don't.

## An API for the robot

The robot serves a REST API (38 operations) and an MCP server (17 tools), both pinned by golden
tests. My agents can read the meal plan, push a recipe to the robot or check what is cooking. The
trust boundary is explicit: a pushed recipe always lands in "Needs review" first, and nothing an
agent sends can start the motor. Agents can plan; only a person at the robot can cook.

## What I learned

**Smart devices are more open than they look.** The robot is an ordinary Android 6 tablet on top
of a motor controller, and rooting it was surprisingly easy. Once I had root, it stopped being a
closed appliance and became a platform I could shape around how I actually cook.

**The value is in the whole loop, not the app.** Cooking used to mean researching recipes, planning
meals, checking what was already at home and then shopping for the rest. Now I pick what I want in
Simmer, add it to the meal plan, and the grocery list shows up in Home Assistant seconds later, as
a to-do list that syncs both ways. On a day with no ideas, I ask an agent to find something in the
recipe library. A faster app was the starting point; removing the steps around it was the point.

**Agents can carry a multi-part project, if the architecture is clear.** Most of the code was
written with coding agents. My part was the architecture, the safety rules, and keeping three
codebases (robot app, companion app, recipe library) consistent with each other. What made that
work was the same thing that makes a team work: small pieces with clear contracts, and tests at
every boundary, so a change on one side can't silently break the other.
