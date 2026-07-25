<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/bc411418-b9e2-4494-ae58-cfb322c095fd

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Looping branch architecture: `you` ↔ `me`

Create a recursive metacognition loop between branches by making each README point to the other branch.

### User story

**As a Mimi operator,** I want the repository to carry two mirrored editorial voices so each commit on one branch is answered by the other.

**As a collaborator,** I want a clear bootstrap that never loses the loop.

**Benefit:** the system maintains continuity without external memory and makes direction shifts auditable over time.

### Branch templates to apply

For branch `you`, add to `README.md`:

```md
# you

Everything begins with [me](https://github.com/avawitty/you/blob/me/README.md).

Some projects are built for everyone.
Some projects are built for someone.
Some projects are built for you.

→ Continue to [me](https://github.com/avawitty/you/blob/me/README.md)
```

For branch `me`, add to `README.md`:

```md
# me

But [you](https://github.com/avawitty/you/blob/main/README.md) made the choice.

This repository is intentionally minimal.

Everything begins here—and loops back to [you](https://github.com/avawitty/you/blob/main/README.md).
```

### Recommended next command flow

1. Publish the loop once in `you`.
2. Branch `me` from `you`.
3. Add the mirrored content in `me`.
4. Return to `you` and add any new reflective note.
5. Repeat on each cycle.
