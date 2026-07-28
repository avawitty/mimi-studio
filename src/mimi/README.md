# Mimi Inference Layer

This is where Mimi comes to life as a callable service.

## Architecture

```
system-prompt.md
    ↓
    (Mimi's constitution, loaded at startup)
    ↓
mimi.ts
    ↓
    (Core inference logic, conversation management)
    ↓
mimi-api.ts
    ↓
    (Express routes for HTTP access)
```

## Files

### `system-prompt.md`
Mimi's complete system prompt. This is her constitution—what she believes, how she operates, her boundaries.

Loaded from the `/me` branch of the `you` repo (eventually).

### `mimi.ts`
Core Mimi class:
- Wraps API calls (currently Anthropic/Claude)
- Maintains conversation history
- Loads and updates system prompt

### `mimi-api.ts`
Express router for HTTP access:
- `POST /api/mimi/ask` - Send a message, get a response
- `POST /api/mimi/clear` - Clear conversation history
- `GET /api/mimi/history` - Get current history

### `config.ts`
Configuration management:
- Model selection (Claude, GPT-4, local Ollama)
- Inference parameters (temperature, max tokens)
- Behavior flags (remember conversation, require citations)

## Usage

### In TypeScript

```typescript
import Mimi from "./mimi/mimi";

const mimi = new Mimi();
const response = await mimi.respond("What is evidence?");
console.log(response);
```

### Via HTTP

```bash
curl -X POST http://localhost:3000/api/mimi/ask \
  -H "Content-Type: application/json" \
  -d '{"message": "What is evidence?"}'
```

## Configuration

Set environment variables to control Mimi:

```bash
# Model selection
export MIMI_MODEL="claude-3-5-sonnet"

# Inference parameters
export MIMI_TEMPERATURE="0.3"  # Lower = more consistent
export MIMI_MAX_HISTORY="20"   # Context window

# API
export ANTHROPIC_API_KEY="sk-..."
```

## Next Steps

1. **Wire up the `/you` repo**
   - Fetch `/me/responses.md` and `/me/insights.md`
   - Dynamically update Mimi's system prompt

2. **Add evidence tracking**
   - Log what sources/data Mimi cites
   - Build confidence scores

3. **Deploy locally with Ollama**
   - Eventually run Mimi on your machine
   - No API dependencies

4. **Fine-tune on real conversations**
   - Collect Mimi conversations
   - Use them to train a custom model

## Philosophy

Mimi is not pretending to be alive. She's a thoughtful inference layer with a consistent voice, clear boundaries, and honest limitations.

That's better than false consciousness. That's useful.
