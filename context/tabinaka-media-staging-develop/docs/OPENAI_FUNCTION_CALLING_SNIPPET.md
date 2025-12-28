# OpenAI Function Calling スニペット（復元用メモ）

> 現在のコードベースでは Bedrock 方向に移行中だが、OpenAI 互換 function calling へ戻す際にすぐ貼り戻せる最小構成を残しておく。

## クライアント初期化
```ts
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
```

## ツール定義
```ts
import { FUNCTION_DEFINITIONS } from "@/lib/functionRegistry";

const tools = FUNCTION_DEFINITIONS.map((func) => ({
  type: "function" as const,
  function: func,
}));
```

## メインループ（簡略版）
```ts
const MAX_TOOL_ITERATIONS = 4;
const temperature = 0.4;
const max_completion_tokens = 800;
let messages = promptMessages.map((m) => ({ role: m.role, content: m.content }));
let finalResponse = "";
let functionResults: Array<{ function: string; result: any }> = [];

for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL_ID ?? "gpt-5-nano",
    messages,
    tools,
    tool_choice: "auto",
    temperature,
    max_completion_tokens,
  });

  const choice = completion.choices[0].message;
  if (choice.tool_calls?.length) {
    messages.push(choice);
    // ここで tool_calls を実行し、結果を tool 役メッセージで messages に push
    // 例:
    // for (const call of choice.tool_calls) {
    //   const params = JSON.parse(call.function.arguments || "{}");
    //   const result = await functionExecutor.executeFunction(call.function.name, params);
    //   functionResults.push({ function: call.function.name, result });
    //   messages.push({
    //     role: "tool",
    //     tool_call_id: call.id,
    //     content: JSON.stringify(result),
    //   });
    // }
    continue;
  }

  // 最終応答が得られたら終了
  finalResponse = choice.content ?? "";
  break;
}

// ストリーミングで出したい場合は、最終ターンで stream:true の再呼び出しを行う。
```

## システムプロンプトのソース
- `lib/promptContext.ts` の `buildPromptContext` が `promptMessages` を組み立てる。  
- OpenAIへ渡す `messages` はこの `promptMessages` をそのまま `role` / `content` でマッピングする。  
- システムメッセージは `promptMessages` 内に含まれているので、復元時はそのまま利用すること。

## 注意点
- SSEストリーミングは `stream: true` で別呼び出しにする（ツール判定は非ストリーミング、最終応答だけストリーミング）。
- 位置情報やアフィリエイト統合などの前後処理は元の `send-message.ts` のロジックを適宜戻すこと。
