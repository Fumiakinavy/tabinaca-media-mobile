# Bedrock移行アーカイブ

## 目的
- OpenAI/GroqベースのチャットAPIをAWS Bedrock (Claude) に置き換える試行の記録。

## 実施内容（時系列）
- `@aws-sdk/client-bedrock-runtime` を依存追加し、`pages/api/chat/send-message.ts` に Bedrockクライアントを組み込み開始。
- `.env.local` に Bedrock 用の認証・モデルID項目を追加（軽量デフォルト: `anthropic.claude-3-haiku-20240307`）。
- 既存のGroq向けfunction callingループを無効化する方針を採用（中途段階）。

## 現状
- `send-message.ts` はGroq/Bedrock双方のコードが混在し、中途状態。function callingロジックが未整合で実行不能。
- ツール呼び出し（search_places/get_place_details 等）は一時停止予定だが、完全な削除・置換は未完了。
- ストリーミング応答はBedrockの `InvokeModelWithResponseStream` を使う設計だが、メインループ差し替え前。

## 残課題
- メイン処理ループをBedrock前提のシンプルSSEパイプに全面置換すること。
- Bedrock向けClaudeメッセージペイロード（system + messages）の生成を確定し、既存コンテキストを欠落なく渡すこと。
- 旧GroqモデルID/環境変数の参照を削除または非活性化。
- エラー処理・ログ・キャッシュ更新の経路を新実装に合わせて整理。

## ロールバック手段
- `package-lock.json` のバックアップがない場合、`npm ci` 後に `@aws-sdk/client-bedrock-runtime` を削除し、`send-message.ts` を直前コミットに戻すことでOpenAI/Groq版へ復旧可能。
