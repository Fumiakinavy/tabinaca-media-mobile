# Bedrock実装方針（Claude, ツール無効・ストリーミング対応）

## ゴール
- `pages/api/chat/send-message.ts` を AWS Bedrock (Claude) 専用に再構築し、最終応答のみをSSEで返す。
- OpenAI/Groqのfunction callingループを完全に外し、単純な入出力経路にする。

## 前提設定
- `.env.local`  
  - `AWS_BEDROCK_ACCESS_KEY_ID` / `AWS_BEDROCK_SECRET_ACCESS_KEY` / `AWS_BEDROCK_SESSION_TOKEN`(任意)  
  - `AWS_BEDROCK_REGION`（例: `ap-northeast-1`）  
  - `AWS_BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307` （軽量・低レイテンシ）
- 依存: `@aws-sdk/client-bedrock-runtime`

## 実装ステップ
1) **クライアント統一**  
   - Groq/OpenAIクライアントを削除し、BedrockRuntimeClientのみを残す。  
   - 認証エラー時の500ハンドリングをBedrock前提に変更。
2) **メッセージ変換**  
   - 既存 `promptMessages` を `system` と `messages`(user/assistant) に分ける `toClaudePayload` を保持・整理。  
   - tools配列は空で固定（ツール無効）。
3) **メインループ刷新**  
   - ループ/リトライは不要。`claudePayload` を一発 `InvokeModelWithResponseStream` に投げるだけにする。  
   - `streamClaudeResponse` で `content_block_delta` の `text` をSSE `data: {type:"content"}` で逐次送信し、最後に `done` を送る。  
   - `finalResponse` に蓄積テキストを格納し、キャッシュ・ログ更新の既存処理を再利用。
4) **周辺ロジックの簡素化**  
   - `places`, `functionResults`, `updatedCards`, アフィリエイト統合などツール依存の処理を全てスキップまたは空配列で扱う。  
   - キャッシュキー生成やセッションログはそのまま（応答テキストのみ保存）。
5) **不要コード削除**  
   - `FUNCTION_DEFINITIONS`, `FunctionExecutor` 参照を除去。  
   - GroqモデルID/環境変数の残骸を除去。

## テスト
- `npm run lint`  
- 手動: チャット送信 → SSEで部分文字列が逐次届き、完了イベント後にレスポンステキストがログ・キャッシュに格納されることを確認。

## 将来拡張（必要になったら）
- Claudeの tool_use 対応（Anthropic schema）を追加し、search/get_place_details を再マッピングする。
- モデルを `claude-3-5-sonnet` 系へ切替える場合、`max_tokens`/料金・レイテンシ確認。
