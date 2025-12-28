# Chat Send-Message Pipeline

This document captures the current behavior of `pages/api/chat/send-message.ts` and outlines future improvements for activity-photo integration.

## Current Flow

1. **Request validation**: the handler ensures X-Gappy headers, Supabase token, and quiz completion.
2. **Context construction**: `buildPromptContext` aggregates history, dynamic cards, and quiz data for the OpenAI system prompt.
3. **Caching**: non-recommendation queries hit a memoized cache keyed by message, user, travel type, and location.
4. **OpenAI loop**: the server calls `gpt-4o-mini` with function calling enabled. Up to 4 tool iterations are allowed.
5. **Function execution**:
   - `search_places`: merges new place summaries into `places` state.
   - `get_place_details`: merges ratings, reviews, and now photos into both `places` (UI response) and `updatedCards` (context store).
6. **Streaming vs non-streaming**: final responses stream via SSE when possible. Metadata events carry `places`, `functionResults`, and `updatedCards`.
7. **Fallback**: on errors, `handleChatError` emits a safe fallback message with suggestions.

## Implementation Notes

- `FunctionExecutor` handles actual API calls and caches `get_place_details` results (including photos).
- `updatedCards` use Map-merge logic in `ChatInterface` so cards retain past data while incorporating new reviews/photos.
- Photo data is surfaced to front-end `PlaceCard` which now handles carousels per place.

## Implementation Ideas

1. **Dynamic Field Requests**: adapt `get_place_details` fields to only fetch photos when the UI lacks them, saving quota.
2. **Photo Prefetch**: when a user hovers a card, pre-emptively call `get_place_details` to fetch images before they ask for more info.
3. **Context Pruning**: limit `displayedCards` stored in `generateDynamicContextInfo` to avoid large payloads once photos+reviews accumulate.
4. **Error resilience**: when photo fetching fails, mark cards with a `photo_status` to avoid re-fetching repeatedly in the same session.
