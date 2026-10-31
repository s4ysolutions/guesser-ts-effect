---
name: hexagonal-layering
description: Use when deciding which layer or domain group a rule, type, value, state or I/O call belongs in, in any language or framework; when choosing between value object and entity, or operation and workflow; when writing a workflow and choosing between ports as function arguments and ports in a constructor; when a domain package holds only ports and errors; when a use case contains if/else, calculations or several port calls; or when reviewing code for layer violations.
---

# Hexagonal layering

Dependencies point inward: outer layers know inner layers, never the reverse. The domain decides. Everything else carries out the decision.

## Layout

```
core                 only what two or more features share
feature/
  logic/
    domain/
      vo/            value objects and domain errors
      entities/      only when a type has identity
      operations/    pure functions
      workflows/     effectful functions
      ports/         repositories and gateways
    application      use cases, live state
    adapters         one per technology
  presentation/
    ui state         UI-only logic, shared by all UI toolkits
    <toolkit>        rendering for one toolkit
product              picks adapters, wires everything, no logic
```

Allowed: application -> domain, adapters -> domain ports and types, ui state -> application, toolkit -> ui state and application, product -> everything.

Inside domain: workflows -> operations, ports, vo, entities. Operations -> vo, entities. Ports -> vo, entities.

One exception needs a written reason: application may create one default adapter when the feature is meant to work with no wiring.

## Domain groups

| Group | What it is | Rules | Test |
|---|---|---|---|
| Value object | Immutable data with no identity; equal by content. Includes enums, fixed constants, domain errors and the types that hide data from a UI | Validates itself on construction. No framework or serialization types | Literal inputs |
| Entity | Has an identity that stays while its properties change | Domain may carry an ID. An adapter creates it. Only a workflow looks one up, through a port | Literal inputs |
| Operation | Pure function | Values in; value or domain error out. No effect type. A value that differs by context is a parameter | Literal inputs, no mocks |
| Workflow | Effectful function or method | Combines operations with ports. Never knows an adapter | Fake ports |
| Port | Interface: repository (persists) or gateway (external request) | Declared even with one adapter. Uses only domain types and domain errors | Through its adapter |

Domain errors say what they mean (`QuotaExceeded`). Domain raises them in the language's normal way. Adapters map technical errors to them. Application decides how the caller receives them. "Domain service" is not a group: classify it as an operation or a workflow.

## Layers

| Layer | Owns | Example |
|---|---|---|
| Domain | Every decision and calculation, its types, its ports | limits, defaults, clamping, allowed status moves, "is it correct?", score, what a player may see |
| Application | Use cases; live state and locks; turning failures into results | keep the current value, hold the lock, cancel a stale task |
| Adapters | All I/O; mapping technical errors to domain errors | file, database, HTTP, browser storage, clock, random |
| UI state | Behaviour of the screen, and nothing else | menu open, field draft, how many rows to show, labels, which key does what |
| Toolkit | Drawing and input events | components, bridges |

## Decision tests

Where does it go? Answer in this order. Stop at the first yes.

1. **Does it touch anything outside the process?** Adapter, behind a port. A calculation that will always be local is not a port.
2. **Would the rule stay true with no UI at all?** Domain. A rule about what a user may see is domain too: a new UI must not be able to break it.
3. **Is it about how one screen behaves?** UI state, if two toolkits exist or are planned; otherwise the toolkit. A limit that only changes what is displayed is screen behaviour. A limit that changes what the system keeps or counts is a domain rule.
4. **Is it a value kept between calls, a lock, or a running task?** Application.

Which domain group?

- A type: is it found or referred to by an ID, and does it stay the same thing after its data changes? Entity. Otherwise value object. Saved data is not an entity by that fact alone.
- A function: does testing it need a fake? Workflow. Otherwise operation.
- A workflow keeps only what cannot be pure. An operation computes every outcome. A workflow may then branch on that outcome to choose which port to call.
- A workflow takes what the caller already has as a parameter. It does not fetch it again.

## Workflow shape

A workflow gets its ports in one of two shapes:

1. **Function:** ports are function arguments.
2. **Object:** the workflow is a method; ports are constructor arguments.

Neither is better. A project uses one. Before writing a workflow:

1. Read the project's agent instructions file (`CLAUDE.md` or `AGENTS.md`). If it names the shape, use it.
2. Otherwise look at the existing workflows. If they all use one shape, use it and record it in that file.
3. If there are no workflows, or they use both shapes, ask the developer. Record the answer in that file.

Create the file if it does not exist.

## Use case shape

A use case holds the machinery around one domain call:

1. Take the lock, read the live state.
2. Call one operation or one workflow.
3. Write the result to the live state.

A use case may stop on what that call returned. Any other `if` on business meaning moves to domain.

A use case may call a port directly only for one call with no rule around it. A second port call, an operation on the result, or a domain error means a workflow.

```
# Application decides: wrong
if not session.has_more(): status = FINISHED

# Application carries out: right
result = answer(quiz, choice)      # operation returns the new quiz and outcome
state.set(result.quiz)
```

## Red flags

- Domain holds only ports and errors.
- A folder of workflows that is empty while use cases call ports and operations together.
- An effect type in a value object or an operation.
- A constant such as a limit or default outside domain.
- A file named `state` that also holds rules or storage calls.
- A type or function in application that hides data. Both go in domain.
- A storage or clock call outside an adapter.
- UI state that holds a value the game needs to keep working.
- Two toolkits with the same logic written twice.
