---
name: hexagonal-layering
description: Use when deciding which layer a rule, type, value, state or I/O call belongs in, in any language or framework; when a domain package holds only ports and errors; when a use case contains if/else or calculations; or when reviewing code for layer violations.
---

# Hexagonal layering

Dependencies point inward: outer layers know inner layers, never the reverse. The domain decides. Everything else carries out the decision.

## Layout

```
core                 small kernel shared by features
feature/
  logic/
    domain           rules and ports
    application      use cases
    adapters         one per technology
  presentation/
    ui state         UI-only logic, shared by all UI toolkits
    <toolkit>        rendering for one toolkit
product              picks adapters, wires everything, no logic
```

Allowed: application -> domain, adapters -> domain, ui state -> application, toolkit -> ui state and application, product -> everything.

One exception needs a written reason: application may create one default adapter when the feature is meant to work with no wiring.

## What each layer owns

| Layer | Owns | Example |
|---|---|---|
| Domain | Every decision and calculation; the types they use; ports | limits, defaults, clamping, allowed status moves, "is it correct?", "is it finished?", score, what a player may see |
| Application | The order of steps; live state and locks; turning failures into results | load, call the rule, store the result, save |
| Adapters | All I/O; mapping technical errors to domain errors | file, database, HTTP, browser storage, clock, random |
| UI state | Behaviour of the screen, and nothing else | menu open, field draft, how many rows to show, labels, which key does what |
| Toolkit | Drawing and input events | components, bridges |

## Decision tests

Answer in this order. Stop at the first yes.

1. **Does it touch anything outside the process?** Adapter, behind a port declared in domain.
2. **Would the rule stay true with no UI at all?** Domain. A rule about what a user may see is domain too: a new UI must not be able to break it.
3. **Is it about how one screen behaves?** UI state, if at least two toolkits need it; otherwise the toolkit. A limit that only changes what is displayed, while all the data is kept, is screen behaviour. A limit that changes what the system keeps or counts is a domain rule.
4. **Is it the order of steps, or a value kept between calls?** Application.

## Use case shape

A use case body has exactly these parts: read the state, call a domain function, write the state, call ports.

Every `if` that chooses a business outcome moves to a domain function that takes values and returns the outcome:

```
# Application decides: wrong
if not session.has_more(): status = FINISHED

# Application carries out: right
result = answer(quiz, choice)      # domain returns the new quiz and outcome
state.set(result.quiz)
```

Guards about the machinery stay in application: a lock, a cancelled task, skipping a stale result.

## Domain functions

- They take values and return values. No I/O, no live state, no framework services.
- A failed rule is a domain error. Domain reports it; application decides how the caller receives it.
- A type goes in domain when a rule uses it, even if only one use case calls that rule.
- Testing a rule needs no mocks. If it does, the rule is mixed with I/O: split it.

## Red flags

- Domain holds only ports and errors.
- A constant such as a limit or default outside domain.
- A file named `state` that also holds rules or storage calls.
- A view type built in application to hide data. The rule goes in domain; application only calls it.
- An if/else on business meaning in a use case.
- A storage or clock call in a use case, without a port.
- UI state that holds a value the game needs to keep working.
- Two toolkits with the same logic written twice.
