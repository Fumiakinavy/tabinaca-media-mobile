# AI Search & Context Optimization

## Overview
This document outlines the optimizations made to the AI chat search behavior and system prompt efficiency.

## Search Behavior Changes
- **Default Search Radius**: **3km (3000m)** when the user does not specify distance/location.
  - Logic: `lib/functionRegistry.ts` -> `DEFAULT_RADIUS_METERS = 3000`
- **User Intent Priority**:
  - Explicit location names (e.g., "Shibuya") override the default radius.
  - Explicit time constraints (e.g., "5 min walk") map to 400m/800m/1200m and override the default radius.

## System Prompt & Context Efficiency
- **Context Reduction**:
  - Reduced `displayedCards` limit from 3 to **2** in the system prompt to save tokens and reduce noise.
  - Logic: `lib/flexibleSystemPrompt.ts` -> `cardLimit = 2`
- **Instruction Optimization**:
  - Simplified the system prompt instructions to be more concise.
  - Structured instructions with clear priority rules (User > Quiz > Default).
  - Explicitly instructed the AI to use the 5km default when no other constraints exist.

## Files Modified
- `lib/functionRegistry.ts`: Updated default radius and function descriptions.
- `lib/flexibleSystemPrompt.ts`: Optimized instructions and reduced context size.
- `lib/travelTypeMapping.ts`: Updated travel type specific prompts to reflect the 5km default.
