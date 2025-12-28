# CursorでAWS Bedrockを使用してClaudeを使う設定ガイド

## 概要

このガイドでは、Cursor IDE上でAWS Bedrock経由でClaudeモデルを使用する方法を説明します。Cursorでは、Claude Code拡張機能を使用する方法と、Cursorの設定で直接環境変数を設定する方法があります。

## 前提条件

- Cursor IDEがインストールされていること
- AWS Bedrockへのアクセス権限があること
- AWS認証情報（アクセスキーID、シークレットアクセスキー）を取得していること
- AWS BedrockでAnthropic Claudeモデルへのアクセスが有効になっていること

## 手順

### 1. AWS認証情報の設定

まず、プロジェクトの `.env.local` ファイルに以下の環境変数を設定します：

```env
AWS_BEDROCK_ACCESS_KEY_ID=your-access-key-id
AWS_BEDROCK_SECRET_ACCESS_KEY=your-secret-access-key
AWS_BEDROCK_REGION=us-east-1
AWS_BEDROCK_MODEL_ID=us.anthropic.claude-haiku-4-5-20251001-v1:0
```

**注意**: `.env.local` ファイルは既に `.gitignore` に含まれているため、Gitにコミットされません。

または、AWS CLIを使用して認証情報を設定することもできます：

```bash
aws configure
```

### 2. 環境変数の設定方法

#### 方法1: システム環境変数として設定（推奨）

macOS/Linuxの場合、`~/.zshrc` または `~/.bashrc` に以下を追加：

```bash
export AWS_BEDROCK_ACCESS_KEY_ID=your-access-key-id
export AWS_BEDROCK_SECRET_ACCESS_KEY=your-secret-access-key
export AWS_BEDROCK_REGION=us-east-1
export AWS_BEDROCK_MODEL_ID=us.anthropic.claude-haiku-4-5-20251001-v1:0
```

設定を反映：

```bash
source ~/.zshrc  # または source ~/.bashrc
```

Windowsの場合、システムの環境変数設定から追加するか、PowerShellで：

```powershell
$env:AWS_BEDROCK_ACCESS_KEY_ID="your-access-key-id"
$env:AWS_BEDROCK_SECRET_ACCESS_KEY="your-secret-access-key"
$env:AWS_BEDROCK_REGION="us-east-1"
$env:AWS_BEDROCK_MODEL_ID="us.anthropic.claude-haiku-4-5-20251001-v1:0"
```

#### 方法2: ワークスペース設定ファイルを使用

プロジェクトルートの `.vscode/settings.json` ファイル（既に作成済み）に以下の設定が含まれています：

```json
{
  "claudeCode.environmentVariables": [
    { "name": "CLAUDE_CODE_USE_BEDROCK", "value": "1" },
    { "name": "AWS_REGION", "value": "ap-northeast-1" },
    { "name": "AWS_PROFILE", "value": "default" }
  ],
  "claudeCode.useBedrock": true,
  "terminal.integrated.env.osx": {
    "CLAUDE_CODE_USE_BEDROCK": "1",
    "AWS_REGION": "ap-northeast-1",
    "AWS_PROFILE": "default"
  }
}
```

この設定により、ターミナルで環境変数が利用可能になります。AWSプロファイルを使用した認証を採用しています。

### 3. Claude Code拡張機能のインストール（オプション）

Claude Code拡張機能を使用する場合：

1. Cursor IDEを開く
2. 拡張機能パネルを開く（`Cmd+Shift+X` または `Ctrl+Shift+X`）
3. 「Claude Code」で検索
4. Anthropicの「Claude Code」拡張機能をインストール
5. 拡張機能の設定で `claudeCode.useBedrock` を `true` に設定

### 4. Cursor IDEの再起動

環境変数を設定した後、Cursor IDEを完全に再起動して設定を反映させます。

### 5. Claude Code拡張機能の使用方法

#### 5.1 基本的な使い方

**パネルを開く方法：**

1. **サイドバーから開く**
   - 左サイドバーのSparkアイコン（⚡）をクリック
   - または、コマンドパレット（`Cmd+Shift+P` / `Ctrl+Shift+P`）から「Claude Code: Open Chat」を選択

2. **ショートカットキーで開く**
   - `Cmd+Alt+K`（macOS）または `Ctrl+Alt+K`（Windows/Linux）でチャットを開く
   - このショートカットは設定で変更可能

#### 5.2 主な機能

**1. チャット機能**
- サイドバーのチャットパネルでプロンプトを入力
- コードに関する質問、説明の依頼、リファクタリングの提案などが可能
- AWS Bedrock経由でClaudeモデルが応答を生成

**2. インライン編集**
- コードを選択して右クリック → 「Claude Code: Edit」を選択
- または、選択したコードに対してチャットで指示を出す
- コードの改善提案や修正がインラインで表示される

**3. コード補完**
- コードを入力中にClaudeが自動的に補完を提案
- タイプしながら適切なコード提案が表示される

**4. コード説明**
- コードを選択して右クリック → 「Claude Code: Explain」を選択
- 選択したコードの動作を説明

**5. コードレビュー**
- ファイル全体や選択範囲をレビュー依頼
- バグの指摘、改善提案、ベストプラクティスのアドバイス

#### 5.3 使用例

**例1: コードの説明を求める**
```
この関数の動作を説明してください
```

**例2: コードのリファクタリング**
```
このコードをより読みやすくリファクタリングしてください
```

**例3: バグの修正**
```
このエラーを修正してください: [エラーメッセージ]
```

**例4: テストコードの生成**
```
この関数のユニットテストを書いてください
```

**例5: コードレビュー**
```
このコードに問題がないか確認してください
```

#### 5.4 コンテキストの活用

Claude Codeは以下のコンテキストを自動的に認識します：

- **開いているファイル**: 現在開いているファイルの内容
- **選択したコード**: 選択範囲のコード
- **プロジェクト構造**: プロジェクト内のファイル構造
- **エラーメッセージ**: エディタに表示されているエラー

コンテキストを含めた質問をすると、より正確な回答が得られます：

```
このファイルの `sendMessage` 関数を最適化してください
現在のエラーメッセージを修正してください
このコンポーネントをTypeScriptに変換してください
```

#### 5.5 設定のカスタマイズ

Claude Code拡張機能の設定をカスタマイズするには：

1. 設定を開く（`Cmd+,` / `Ctrl+,`）
2. 検索バーで「Claude Code」と検索
3. 以下の設定項目を調整可能：
   - `claudeCode.useBedrock`: AWS Bedrockを使用するかどうか
   - `claudeCode.model`: 使用するモデル（Bedrock使用時）
   - `claudeCode.maxTokens`: 最大トークン数
   - `claudeCode.temperature`: 生成のランダム性

#### 5.6 コマンドパレットから利用できるコマンド

コマンドパレット（`Cmd+Shift+P` / `Ctrl+Shift+P`）から以下にアクセス可能：

- `Claude Code: Open Chat` - チャットパネルを開く
- `Claude Code: Explain Code` - 選択コードを説明
- `Claude Code: Refactor Code` - コードをリファクタリング
- `Claude Code: Generate Test` - テストコードを生成
- `Claude Code: Review Code` - コードレビュー

#### Cursorの組み込みAIアシスタントを使用する場合

Cursorは独自のAIアシスタントシステムを持っています。環境変数が正しく設定されていれば、CursorのAIアシスタントが自動的にAWS Bedrockを使用する場合があります（Cursorのバージョンと設定によります）。

- Cursorの組み込みAIは `Cmd+K` / `Ctrl+K` でアクセス可能
- インライン編集やチャット機能が利用可能

### 5.7 実践的なワークフロー例

**ワークフロー1: コードレビューから修正まで**

1. レビューしたいコードを選択
2. 右クリック → 「Claude Code: Review Code」を選択
3. 指摘された問題について質問：「この問題を修正するにはどうすればいいですか？」
4. 提案された修正を確認して適用

**ワークフロー2: 新機能の実装**

1. チャットパネルを開く（⚡アイコン）
2. 実装したい機能を説明：「ユーザー認証機能を実装してください」
3. Claudeがコードを提案
4. 提案されたコードを確認・修正
5. テストコードの生成も依頼可能

**ワークフロー3: リファクタリング**

1. リファクタリングしたい関数を選択
2. チャットで：「この関数をより保守しやすくリファクタリングしてください」
3. 提案された改善案を確認
4. 段階的に適用して動作確認

### 5.8 ヒントとベストプラクティス

**効果的な質問のコツ：**

- ✅ **具体的に**: 「この関数を最適化」よりも「この関数のパフォーマンスを改善して、O(n²)からO(n)にしてください」
- ✅ **コンテキストを含める**: ファイル名や関数名を明示的に指定
- ✅ **段階的に**: 大きな変更は小さなステップに分ける
- ✅ **例を示す**: 「このような出力が欲しい」と例を示す

**避けるべき質問：**

- ❌ 曖昧な質問：「これを直して」
- ❌ コンテキストなしの質問：どのファイル、どの関数か不明確
- ❌ 一度に多くの変更を求める：大きな変更は分割して依頼

**パフォーマンスの最適化：**

- 長いコードを一度に処理するより、小さな部分に分けて処理
- 頻繁に使用する場合は、より高速なモデル（Haiku）を使用
- キャッシュ機能を活用して同じ質問の繰り返しを避ける

### 6. 動作確認

ターミナルで環境変数が正しく設定されているか確認：

```bash
echo $CLAUDE_CODE_USE_BEDROCK
echo $AWS_REGION
echo $AWS_PROFILE
```

AWSプロファイルが正しく設定されているか確認：

```bash
aws configure list
aws sts get-caller-identity
```

### 7. トラブルシューティング

#### 7.1 認証エラーが発生する場合

- AWS認証情報が正しく設定されているか確認
- AWS Bedrockへのアクセス権限があるか確認
- AWS BedrockでAnthropic Claudeモデルへのアクセスが有効になっているか確認
- IAMユーザーに `bedrock:InvokeModel` と `bedrock:InvokeModelWithResponseStream` の権限があるか確認

#### 7.2 環境変数が読み込まれない場合

- システム環境変数として設定されているか確認（`echo $CLAUDE_CODE_USE_BEDROCK` で確認）
- Cursor IDEを完全に再起動（すべてのウィンドウを閉じて再起動）
- `.vscode/settings.json` の設定を確認
- AWSプロファイルが正しく設定されているか確認（`aws configure list`）
- ターミナルで環境変数を直接エクスポートしてからCursorを起動：

```bash
export CLAUDE_CODE_USE_BEDROCK=1
export AWS_REGION=ap-northeast-1
export AWS_PROFILE=default
```

#### 7.3 拡張機能が動作しない場合

- Cursor IDEを再起動
- Claude Code拡張機能が最新バージョンか確認
- 拡張機能のログを確認（`Cmd+Shift+P` → "Developer: Show Logs"）
- 拡張機能の設定で `claudeCode.useBedrock` が `true` になっているか確認

#### 7.4 モデルIDが正しくない場合

使用可能なモデルIDを確認：

- `us.anthropic.claude-haiku-4-5-20251001-v1:0` (Haiku - 軽量・高速)
- `us.anthropic.claude-sonnet-4-20250514-v1:0` (Sonnet - バランス型)
- `us.anthropic.claude-opus-4-20250514-v1:0` (Opus - 高精度)

リージョンによってモデルIDのプレフィックスが異なる場合があります（例: `us.` は `us-east-1` リージョン用）

## 注意事項

- Cursorは独自のAIアシスタントシステムを持っているため、Claude Code拡張機能の動作はVSCodeと完全に同じではない可能性があります
- AWS Bedrockの使用には料金がかかります。使用量に注意してください
- AWSプロファイルを使用しているため、AWS CLIで設定した認証情報が使用されます
- `.vscode/settings.json` は環境変数の定義を含みますが、機密情報は含みません
- AWSプロファイルベースの認証を使用することで、より安全な認証方式を採用しています

## 現在のプロジェクト設定

このプロジェクトでは、既に以下の設定が行われています：

- `.vscode/settings.json` にClaude Code拡張機能用の設定が含まれています
- `pages/api/chat/send-message.ts` でAWS Bedrockを使用したチャット機能が実装されています
- AWSプロファイルを使用した認証方式を採用しています
- 環境変数は `.vscode/settings.json` で管理されています

## 参考リンク

- [Claude Code for VS Code 公式ドキュメント](https://docs.claude.com/ja/docs/claude-code/vs-code)
- [Claude Code AWS Bedrock設定](https://docs.claude.com/ja/docs/claude-code/amazon-bedrock)
- [AWS Bedrock ドキュメント](https://docs.aws.amazon.com/bedrock/)
- [AWS Bedrock モデルID一覧](https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids.html)
- [AWS Bedrock 料金](https://aws.amazon.com/bedrock/pricing/)

