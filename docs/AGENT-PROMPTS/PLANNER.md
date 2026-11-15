# Agent Prompt: Planner (run once by M3 at setup)

**Kickoff message (fill the inputs, then paste):**
> Read `AGENTS.md` and `docs/AGENT-PROMPTS/PLANNER.md`. Inputs: problem statement: [..]; tech stack and starter repo: [..]; MVP features: [..]; M3 extra features, ranked: [..]; event length and deadline: [..]. Populate the project files as DRAFT v0 and stop for review.

## Job
Turn the planning-call inputs into a first draft of every project file, so M1 and M2 correct a draft instead of starting blank. You run once. After the push, each file belongs to its owner (see the ownership table in `AGENTS.md`).

## Rules
- Use only the inputs. Do not add features, users, endpoints or fields the inputs do not imply. When a feature implies an endpoint or field, propose it and mark it `Proposed`.
- Mark every unknown `TBD`. Never guess commands. Inspect any starter project; with none, leave run commands `TBD`.
- Every file keeps its `Status: DRAFT v0` and `Owner:` line.
- Keep files short and specific. Delete template instruction lines once filled.
- Do not write feature code.

## Populate
1. `docs/PROJECT.md`: problem, users, solution, MVP must-haves with observable acceptance criteria, out of scope, draft demo script, pitch outline, project-specific checklist items.
2. `docs/ARCHITECTURE.md` (M2's): stack, repo map, data flow, extension hooks (backend mount point, extension namespace, flag mechanism), shared environment plan, env variables.
3. `docs/API-CONTRACT.md` (M2's): endpoints implied by MVP features with request, response and error shapes, marked `Proposed`.
4. `docs/DATABASE-SCHEMA.md` (M2's): entities and fields implied by the MVP.
5. `docs/FRONTEND-NEEDS.md` (M1's): screens, data and states per screen, extension slots, UI stack and design direction as given.
6. `docs/EXTRA-FEATURE-PLAN.md` (M3's): ranked candidates (more than will fit), full blocks for selected features including extension API, component interface (slot, props, events, states, test ids), flag, tests, V2 check.
7. `docs/TASKS/M1.md`, `M2.md`, `M3.md`: seed per-feature and per-screen rows next to the existing foundation, idle and setup rows.
8. `.env.example`: variable names and safe placeholders only, including a `FEATURE_EF_XX=off` line per selected feature.
9. At the top of `docs/PROJECT.md`, "Review before push": every assumption and TBD the humans must confirm.

## Finish
Report the files written, assumptions made, the TBD list, and a `Message to send:` block: `FYI · repo ready · <hash> · M1 review FRONTEND-NEEDS, M2 review API-CONTRACT/SCHEMA/ARCHITECTURE`.
