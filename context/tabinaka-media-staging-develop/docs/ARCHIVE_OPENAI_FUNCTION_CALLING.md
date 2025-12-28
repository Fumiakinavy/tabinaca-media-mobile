# OpenAI Function Calling アーカイブ

## 概要
- 本プロジェクト初期のチャットAPIは OpenAI (および互換API) の Chat Completions を用いた function calling ループで実装されていた。
- ツール: `FUNCTION_DEFINITIONS` に基づく `search_places` / `get_place_details` などの関数を自動呼び出しし、最大4回の反復で結果を統合。
- ストリーミング: 最終応答のみをSSEで配信し、ツール呼び出し部分は非ストリーミング。

## 主な構成要素
- `pages/api/chat/send-message.ts`
  - OpenAI互換クライアントで `tools` と `tool_choice:auto` を設定。
  - 反復ループで `tool_calls` を検出→並列実行→`messages` に結果を追加。
  - 最終応答は `stream:true` でSSEに流し、メタデータ（places/functionResultsなど）を別イベントで送信。
- ヘルパー
  - `FUNCTION_DEFINITIONS` (`lib/functionRegistry`)
  - `FunctionExecutor` で search/get_place_details を実行
  - `addAffiliateExperiencesToPlaces` でアフィリエイト統合

## なぜアーカイブしたか
- Bedrock (Claude) へ移行するため、OpenAI形式の function calling ループを一旦無効化・除去する方針になった。
- Claudeの tool_use スキーマと互換がなく、大規模なマッピング作業が必要なため、現時点では「応答のみ」実装に絞る計画。

## 復活させる場合のヒント
- OpenAI/互換エンドポイントに戻すなら、`tools` 配列と `FunctionExecutor` 呼び出しを再接続し、`MAX_TOOL_ITERATIONS` ループを復元する。
- Claudeの tool_use へ対応する場合は、`FUNCTION_DEFINITIONS` をAnthropic schemaに変換し、`tool_use` / `tool_result` メッセージを組み立てる必要がある。
