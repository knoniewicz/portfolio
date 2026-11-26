---
title: "Simmer: replacing the software on a kitchen robot"
description: "A faster app for the Monsieur Cuisine Connect, with motor safety I can test, a phone companion and an API agents can use."
date: 2026-11-26
tags: ["Android", "Kotlin", "Embedded", "Safety"]
draft: true
---

> **TODO before publishing:** check the scope, the upstream credit and the disclaimer, then delete
> this box.

My kitchen robot is a Lidl Monsieur Cuisine Connect (SKMC 1100 A1): a heated blender with a
motor, a scale and an Android 6 tablet bolted on top. The hardware is fine. The stock app is slow.

Simmer is my replacement for that app. It is a fork of
[MrCuisineVibeConnect](https://github.com/Wuki60/MrCuisineVibeConnect) (MIT), and it has grown into
three parts:

- **The robot app**, on the robot's own tablet: guided cooking, manual mode, programs, the scale and
  the motor link.
- **A companion web app** (Preact), served by the robot itself: meal plan, recipes, shopping list
  and prep, from a phone or a desktop.
- **A recipe library** service with English search, "what can I cook with what I have" and dislikes.

> Simmer is an independent project, not affiliated with Lidl, SilverCrest or Hoyer.

## Safety first, because there is a blade

The app talks to the motor controller over a serial link, based on a public analysis of the
protocol. That makes the software responsible for things the stock app used to guarantee, so the
safety rules live in a pure-Kotlin core with unit tests, apart from the Android UI:

- The motor won't run with the lid open.
- Stopping asks for confirmation.
- Hot contents ramp the speed up instead of jumping.
- Faults latch: the robot stays stopped until someone acknowledges the fault.

Every preset (chop, knead, ferment, cleaning) compiles to the same manual job and passes the same
rules. Heated cleaning, for example, never goes above speed 3.

## Cooking that gets out of the way

- One tap per step. The next step waits for your press, and a cook resumes after a power cut.
- Weigh steps move on by themselves once the scale has held the target for 1.5 seconds, with undo.
- A **Prepare** screen before a guided cook lists what to peel, wash, chop or bring to room temperature.
- Servings scale from 1 to 12. Amounts change, times and speeds don't.

## An API for the robot

The robot serves a REST API (38 operations) and an MCP server (17 tools), both covered by golden
tests. My agents can read the meal plan, push a recipe to the robot for review or check what is
cooking. A pushed recipe always lands in a "Needs review" state first; nothing an agent sends starts
the motor.

## What I learned

**Smart devices are more open than they look.** The robot is an ordinary Android 6 tablet on top
of a motor controller, and rooting it was surprisingly easy. Once I had root, it stopped being a
closed appliance and became something I could make fit how I actually cook.

**The win is the whole loop, not the app.** Before, cooking meant researching recipes, planning the
meals, checking what was already at home and then shopping for the rest. Now I pick what I want in
Simmer, add it to the meal plan, and the grocery list shows up in Home Assistant seconds later as a
to-do list that syncs both ways. On a day
with no ideas, I ask an agent to find something in the recipe library.

**Agents can carry a multi-part project.** Most of the code was written with coding agents. My job
was the architecture, the safety rules and keeping three parts (robot app, companion app, recipe
library) consistent with each other. Splitting the work into clear pieces with tests at the
boundaries is what made that work.
