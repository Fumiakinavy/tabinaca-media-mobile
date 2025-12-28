/**
 * Chat AI model interaction utilities
 * Extracted from send-message.ts for better organization
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { buildPromptContext, PromptMessage } from "@/lib/promptContext";
import {
  FUNCTION_DEFINITIONS,
  FunctionExecutor,
  PlaceSummary,
  type FunctionResult,
} from "@/lib/functionRegistry";
import type { ValidatedChatContext } from "./validation";
import { CHAT_CONFIG, getOptimalIterations, getToolLabel } from "./constants";
import {
  getAnalysisMessage,
  getModelCallMessage,
  getToolExecutionMessage,
  getToolSuccessMessage,
  getToolErrorMessage,
  getThinkingMessage,
  getComposingMessage,
} from "./statusMessages";

// Types
export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface TextBlock {
  type: "text";
  text: string;
}

export interface ToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
}

export type ContentBlock = ToolUseBlock | TextBlock | ToolResultBlock;

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

// Constants
const BEDROCK_MODEL =
  process.env.AWS_BEDROCK_MODEL_ID || CHAT_CONFIG.DEFAULT_MODEL;
const BEDROCK_REGION = process.env.AWS_BEDROCK_REGION || "us-east-1";

// Bedrock client
const bedrock = new BedrockRuntimeClient({
  region: BEDROCK_REGION,
  credentials:
    process.env.AWS_BEDROCK_ACCESS_KEY_ID &&
    process.env.AWS_BEDROCK_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_BEDROCK_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_BEDROCK_SECRET_ACCESS_KEY,
          sessionToken: process.env.AWS_BEDROCK_SESSION_TOKEN,
        }
      : undefined,
});

// Convert FUNCTION_DEFINITIONS to Claude tool format
const CLAUDE_TOOLS = FUNCTION_DEFINITIONS.map((func) => ({
  name: func.name,
  description: func.description,
  input_schema: {
    type: "object",
    properties: func.parameters.properties,
    required: func.parameters.required || [],
  },
}));

/**
 * Convert PromptMessage[] to Claude message format
 */
export function toClaudeMessages(promptMessages: PromptMessage[]): {
  system: string;
  messages: ClaudeMessage[];
} {
  let system = "";
  const messages: ClaudeMessage[] = [];

  for (const msg of promptMessages) {
    if (msg.role === "system") {
      system += (system ? "\n\n" : "") + msg.content;
    } else {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  return { system, messages };
}

/**
 * Check if response contains tool_use blocks
 */
export function extractToolUseBlocks(content: ContentBlock[]): ToolUseBlock[] {
  return content.filter(
    (block): block is ToolUseBlock => block.type === "tool_use",
  );
}

/**
 * Extract text content from response
 */
export function extractTextContent(content: ContentBlock[]): string {
  return content
    .filter((block): block is TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

/**
 * Split system prompt into static (cacheable) and dynamic parts
 */
export function splitSystemPrompt(fullPrompt: string): {
  staticPart: string;
  dynamicPart: string;
} {
  // Split at "CONTEXT_JSON:" or "CONTEXT:"
  const contextMarker = fullPrompt.includes("CONTEXT_JSON:")
    ? "CONTEXT_JSON:"
    : fullPrompt.includes("CONTEXT:")
      ? "CONTEXT:"
      : null;

  if (!contextMarker) {
    // If no marker found, treat entire prompt as dynamic
    return {
      staticPart: "",
      dynamicPart: fullPrompt,
    };
  }

  const parts = fullPrompt.split(contextMarker);

  if (parts.length < 2) {
    return {
      staticPart: "",
      dynamicPart: fullPrompt,
    };
  }

  return {
    staticPart: parts[0].trim(),
    dynamicPart: `${contextMarker}${parts[1]}`,
  };
}

/**
 * Invoke Claude model with tools and Prompt Caching support
 */
export async function invokeClaudeModel(
  system: string,
  messages: ClaudeMessage[]
): Promise<ContentBlock[]> {
  const { staticPart, dynamicPart } = splitSystemPrompt(system);

  // Convert system prompt to array format for Prompt Caching
  const systemBlocks: Array<{
    type: "text";
    text: string;
    cache_control?: { type: "ephemeral" };
  }> = [];

  // Static part (cacheable)
  if (staticPart) {
    systemBlocks.push({
      type: "text",
      text: staticPart,
      cache_control: { type: "ephemeral" }, // Enable caching
    });
  }

  // Dynamic part (not cached)
  if (dynamicPart) {
    systemBlocks.push({
      type: "text",
      text: dynamicPart,
    });
  }

  const requestBody = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    system: systemBlocks.length > 0 ? systemBlocks : system,
    messages,
    max_tokens: CHAT_CONFIG.MAX_TOKENS,
    temperature: CHAT_CONFIG.TEMPERATURE,
    tools: CLAUDE_TOOLS,
    tool_choice: { type: "auto" },
  });

  console.log("[invokeClaudeModel] Request details:", {
    modelId: BEDROCK_MODEL,
    systemBlocksCount: systemBlocks.length,
    staticPartLength: staticPart.length,
    dynamicPartLength: dynamicPart.length,
    messagesCount: messages.length,
  });

  const command = new InvokeModelCommand({
    modelId: BEDROCK_MODEL,
    contentType: "application/json",
    body: requestBody,
  });

  const response = await bedrock.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  // Log cache hit information
  if (responseBody.usage) {
    const cacheReadTokens = responseBody.usage.cache_read_input_tokens || 0;
    const inputTokens = responseBody.usage.input_tokens || 0;
    const cacheHitRate =
      cacheReadTokens > 0
        ? `${Math.round((cacheReadTokens / inputTokens) * 100)}%`
        : "0%";

    console.log("[invokeClaudeModel] Token usage:", {
      inputTokens,
      cacheCreationTokens: responseBody.usage.cache_creation_input_tokens || 0,
      cacheReadTokens,
      outputTokens: responseBody.usage.output_tokens || 0,
      cacheHitRate,
    });
  }

  return responseBody.content || [];
}

/**
 * Execute tool and return result blocks
 */
export async function executeTool(
  toolUse: ToolUseBlock,
  functionExecutor: FunctionExecutor
): Promise<ToolResultBlock> {
  const result = await functionExecutor.executeFunction(
    toolUse.name,
    toolUse.input,
  );

  return {
    type: "tool_result",
    tool_use_id: toolUse.id,
    content: JSON.stringify(result),
  };
}

/**
 * Process tool execution results and collect places
 * @param toolUseBlocks - The tool use blocks from Claude
 * @param executionResults - Raw function execution results (FunctionResult[])
 * @param places - Array to collect place results into
 */
export function processToolResults(
  toolUseBlocks: ToolUseBlock[],
  executionResults: FunctionResult[],
  places: PlaceSummary[]
): Array<{ function: string; input?: unknown; result: FunctionResult }> {
  const functionResults: Array<{ function: string; input?: unknown; result: any }> = [];

  for (let i = 0; i < toolUseBlocks.length; i += 1) {
    const toolUse = toolUseBlocks[i];
    const result = executionResults[i];

    functionResults.push({
      function: toolUse.name,
      input: toolUse.input,
      result,
    });

    // Collect places from search results
    if (
      toolUse.name === "search_places" &&
      result.success &&
      result.data
    ) {
      const searchResult = result.data as { results?: PlaceSummary[] };
      if (Array.isArray(searchResult.results)) {
        for (const place of searchResult.results) {
          if (!places.find((p) => p.place_id === place.place_id)) {
            places.push(place);
          }
        }
      }
    }

    // Collect place details
    if (
      toolUse.name === "get_place_details" &&
      result.success &&
      result.data
    ) {
      const detailsResult = result.data as PlaceSummary;
      const existingIndex = places.findIndex(
        (p) => p.place_id === detailsResult.place_id,
      );
      if (existingIndex >= 0) {
        places[existingIndex] = {
          ...places[existingIndex],
          ...detailsResult,
        };
      } else {
        places.push(detailsResult);
      }
    }
  }

  return functionResults;
}

/**
 * Build Claude messages for tool results
 */
export function buildToolResultMessages(
  toolUseBlocks: ToolUseBlock[],
  toolResults: ToolResultBlock[]
): ClaudeMessage[] {
  return [
    {
      role: "assistant",
      content: toolUseBlocks.map((block) => ({
        type: "tool_use" as const,
        id: block.id,
        name: block.name,
        input: block.input,
      })),
    },
    {
      role: "user",
      content: toolResults,
    },
  ];
}

/**
 * Run complete AI conversation with tool calling
 */
export async function runAIConversation(
  context: ValidatedChatContext,
  functionExecutor: FunctionExecutor,
  sendStatusUpdate: (payload: any) => Promise<void>
): Promise<{
  finalResponse: string;
  places: PlaceSummary[];
  functionResults: Array<{ function: string; input?: unknown; result: any }>;
}> {
  // Build prompt context (now async for AI-powered intent classification)
  const promptContext = await buildPromptContext({
    userMessage: context.message,
    conversationHistory: context.conversationHistory,
    currentLocation: context.currentLocation
      ? {
          ...context.currentLocation,
          permission: context.currentLocation.permission ?? false,
        }
      : undefined,
    displayedCards: context.displayedCards?.map((card) => ({
      ...card,
      displayedAt: card.displayedAt ? new Date(card.displayedAt) : undefined,
    })),
    quizResults: context.quizResults
      ? {
          ...context.quizResults,
          travelType: context.quizResults.travelType
            ? {
                travelTypeCode: context.quizResults.travelType.travelTypeCode,
                travelTypeName: context.quizResults.travelType.travelTypeName ?? "",
                travelTypeEmoji: context.quizResults.travelType.travelTypeEmoji ?? "",
                travelTypeDescription:
                  context.quizResults.travelType.travelTypeDescription ?? "",
                locationLat: context.quizResults.travelType.locationLat,
                locationLng: context.quizResults.travelType.locationLng,
                locationPermission: context.quizResults.travelType.locationPermission,
              }
            : undefined,
        }
      : undefined,
    homeDurationPreference: context.homeDurationPreference,
  });

  // Determine optimal iterations based on intent
  const maxIterations = getOptimalIterations(
    promptContext.userContext.intent?.label
  );

  const userIntent = promptContext.userContext.intent?.label || "clarify";

  console.log("[runAIConversation] Configuration:", {
    intent: userIntent,
    maxIterations,
    model: BEDROCK_MODEL,
  });

  // Convert to Claude format
  const { system, messages: claudeMessages } = toClaudeMessages(
    promptContext.promptMessages,
  );

  // Collect results
  let places: PlaceSummary[] = [];
  const functionResults: Array<{ function: string; input?: unknown; result: any }> = [];
  let finalResponse = "";

  // Tool calling loop
  let currentMessages = [...claudeMessages];
  let iteration = 0;

  // Rich analysis message based on intent
  await sendStatusUpdate({
    id: "analysis",
    state: "success",
    label: getAnalysisMessage(userIntent, context.message),
  });

  while (iteration < maxIterations) {
    iteration++;

    console.log(`[runAIConversation] Iteration ${iteration}/${maxIterations}`);

    // Dynamic model call message
    await sendStatusUpdate({
      id: "model_request",
      state: "pending",
      label: getModelCallMessage(userIntent, iteration),
    });

    try {
      const content = await invokeClaudeModel(system, currentMessages);

      await sendStatusUpdate({
        id: "model_request",
        state: "success",
        label: "AI model responded",
      });

      // Check for tool_use
      const toolUseBlocks = extractToolUseBlocks(content);

      if (toolUseBlocks.length > 0 && content.some((c) => c.type === "tool_use")) {
        // Show thinking text before tool execution (early feedback)
        const thinkingText = extractTextContent(content);
        if (thinkingText && thinkingText.trim().length > 0) {
          await sendStatusUpdate({
            id: "thinking",
            state: "pending",
            label: getThinkingMessage(thinkingText, userIntent),
          });
        }

        // Execute tools with real-time feedback
        // toolResultBlocks: for sending to Claude (ToolResultBlock[])
        // rawResults: for processing places (FunctionResult[])
        const toolResultBlocks: ToolResultBlock[] = [];
        const rawResults: FunctionResult[] = [];

        const executions = await Promise.all(
          toolUseBlocks.map(async (toolUse) => {
            // Rich tool execution start message
            await sendStatusUpdate({
              id: `tool_${toolUse.id}`,
              state: "pending",
              label: getToolExecutionMessage(toolUse.name, toolUse.input, userIntent),
            });

            const startTime = Date.now();

            try {
              // Execute the tool and get ToolResultBlock
              const toolResultBlock = await executeTool(toolUse, functionExecutor);
              const duration = Date.now() - startTime;

              // Parse the raw result from the ToolResultBlock
              const rawResult: FunctionResult = JSON.parse(toolResultBlock.content);

              // Rich success message with result details
              await sendStatusUpdate({
                id: `tool_${toolUse.id}`,
                state: "success",
                label: getToolSuccessMessage(
                  toolUse.name,
                  toolUse.input,
                  duration,
                  rawResult
                ),
              });

              return { toolResultBlock, rawResult };
            } catch (error) {
              const duration = Date.now() - startTime;
              const errorMessage = error instanceof Error ? error.message : "Tool execution failed";

              // Rich error message
              await sendStatusUpdate({
                id: `tool_${toolUse.id}`,
                state: "error",
                label: getToolErrorMessage(toolUse.name, toolUse.input, errorMessage),
              });

              console.error(`[runAIConversation] Tool execution failed:`, error);

              // Create error result
              const errorResult: FunctionResult = {
                success: false,
                error: errorMessage,
              };

              const toolResultBlock: ToolResultBlock = {
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: JSON.stringify(errorResult),
              };

              return { toolResultBlock, rawResult: errorResult };
            }
          })
        );

        // Separate toolResultBlocks and rawResults
        for (const { toolResultBlock, rawResult } of executions) {
          toolResultBlocks.push(toolResultBlock);
          rawResults.push(rawResult);
        }

        // Process raw results to collect places
        const iterationResults = processToolResults(
          toolUseBlocks,
          rawResults,
          places
        );
        functionResults.push(...iterationResults);

        // Add tool messages to conversation (using ToolResultBlocks)
        currentMessages.push(...buildToolResultMessages(toolUseBlocks, toolResultBlocks));

        continue; // Next iteration
      }

      // No more tool calls - show composing message and extract final response
      await sendStatusUpdate({
        id: "composing",
        state: "pending",
        label: getComposingMessage(userIntent, places.length > 0),
      });

      finalResponse = extractTextContent(content);

      await sendStatusUpdate({
        id: "composing",
        state: "success",
        label: "Response ready",
      });

      break;
    } catch (error) {
      console.error("[runAIConversation] Model invocation error:", error);

      await sendStatusUpdate({
        id: "model_request",
        state: "error",
        label: "AI model error",
      });

      // Retry logic for first iteration timeout
      if (
        iteration === 1 &&
        error instanceof Error &&
        error.message.includes("timeout")
      ) {
        console.log("[runAIConversation] Retrying after timeout...");
        continue;
      }

      // Fallback response on error
      await sendStatusUpdate({
        id: "composing",
        state: "pending",
        label: "Preparing error response...",
      });

      finalResponse =
        "申し訳ございません。一時的な問題が発生しました。もう一度お試しください。";
      break;
    }
  }

  return { finalResponse, places, functionResults };
}
