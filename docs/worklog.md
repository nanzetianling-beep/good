# 作業ログ (Work Log)

このファイルは、リポジトリに対して行った作業の記録です。
（ルール: ①わからなかったら聞く ②やったことは記録する ③変更は過去と比較して報告する）

## 2026-07-09 — 初回作成
- レポート記載の11スキルを新規作成（frontend-design, playwright, claude-code-setup,
  skill-creator, plugin-dev, claude-md-management, superpowers, natural-japanese,
  security-guidance, atomic-agents, discord-plugin）。
- 各スキルは実在する約3サイトを調査し、良い部分を統合して `SKILL.md` を作成。出典は
  各 `SKILL.md` 末尾の `## Sources` に明記。
- プラグイン化: `.claude-plugin/plugin.json` と `.claude-plugin/marketplace.json`、
  トップレベル `README.md`、`.gitignore` を追加。
- ベースラインコミット: `91dbf55`。

## 2026-07-09 — 「10個を作り直す」対応
ユーザー指示: 「discord-plugin以外のスキルを制作して（＝作り直す）」。確認の結果
「10個を作り直す」を選択。ルール①②③を適用。

### ステップ1: discord-plugin 削除（このコミット）
- `skills/discord-plugin/` を削除。
- `README.md`（11→10、表・ツリーから discord 行を除去）、
  `.claude-plugin/plugin.json`・`marketplace.json` の記述を10スキルに更新。
- 作業ログ `docs/worklog.md` を新設。

### ステップ2: 10スキルの再生成（以降のコミット）
- 対象: frontend-design, playwright, claude-code-setup, skill-creator, plugin-dev,
  claude-md-management, superpowers, natural-japanese, security-guidance, atomic-agents。
- 各スキルを改めて調査し直し、内容を再生成して上書き。
- 各スキルごとに `git diff`（対 `43b89fb`＝10スキルの内容は `91dbf55` と同一）を取得。
- 10スキルを個別コミット。全エージェントが「UNCERTAINTIES: なし（事実として確定できないCVEやarXiv等はあえて省いた）」と報告。共通の制約として、多くの一次情報ページ（Anthropicブログ／playwright.dev／各社サイト）が
  プロキシ経由のWebFetchに対しHTTP 403を返したため、内容はWebSearchのスニペットで裏取りし、
  各 `## Sources` にその旨を明記。捏造した引用・API・数値は含めていない。

#### 各スキルの主な変更点（対 旧版）
- **frontend-design**: Anthropicスキルの引用先URLを正しい `anthropics/skills` に修正。未検証ソースを
  W3C Design Tokens／Refactoring UI要約に差し替え。「グレースケール優先」「先に設計体系を決める」原則と
  CSSトークン実例を追加。WCAG大文字閾値を精緻化。
- **playwright**: 環境ノートを実在の `/opt/pw-browsers/chromium` シンボリックリンクに修正（Nodeバインディング有・
  Pythonバインディング無を明記）。`monitor.py`（定期価格監視）・`screenshot.js`・`references/patterns.md` を新規追加。
  タスク→レシピ対応表を追加。
- **claude-code-setup**: 「コマンドはスキルに統合」を反映。「誰が起動するか」で選ぶ判断ショートカットを追加。
  Hookハンドラ種別（mcp_tool、agentは実験的）・permissionDecision値、MCPスコープ改称（local/user）、
  サブエージェント優先順位、description 1536字上限を修正・追記。
- **skill-creator**: 「nameがフォルダ名と一致しないとロードされない」という誤記を修正（実際はディレクトリ名が正）。
  Agent Skills標準・任意フロントマター項目を追加。ワークフローをeval駆動（ベースライン先行＋トリガー評価）に。
  フロントマターを壊しうるYAMLコロンを修正。
- **plugin-dev**: `skills`は既定に追加／`commands`等は置換、という挙動を修正。monitors/bin/settings.jsonの構成、
  `CLAUDE_PLUGIN_DATA`、Hook用スコープ付きMCPツール名規則、バージョン解決順、`--strict`検証を追記。
- **claude-md-management**: CLAUDE.mdと自動メモリ（MEMORY.md）を区別。enterprise `claudeMd` キー、
  `.claude/rules/` の起動時ロード vs パス限定、`InstructionsLoaded` フック、`/compact` 再注入挙動を追記。
  Sourcesを検証済み公式3ページに整理。
- **superpowers**: 重要度に応じた「深さダイヤル」を追加。verify-first（arXiv 2511.21734）と
  rotate-perspectives の思考ムーブを追加。ループを名前付きパイプライン＋register テンプレに整理。
- **natural-japanese**: AIっぽさ症状チェックを9→11項目に拡張（長い前置き・言い換え水増し・記号/絵文字乱用）。
  音読チェックと代名詞省略を手順に昇格。トーンオブボイス4要素、敬体/常体の例外規則、before/after例を追加。
- **security-guidance**: 脅威チェックをOWASP LLM Top 10(2025)に対応付け。サプライチェーン・コンテキスト漏洩・
  永続化(persistence)カテゴリを追加。検証済みSnyk ToxicSkills数値を引用。防御をAnthropicの多層モデルで再構成。
  「防御的な体裁＝許可ではない」認可ルールを明確化。
- **atomic-agents**: atomic原則を実APIで裏付け（`AtomicAgent[Input,Output]`、`BaseIOSchema`、4特性）。
  サブエージェント節をClaude Agent SDKの実 `AgentDefinition` フィールドで書き換え。パターン選択表と
  ワークフロー例のスキーマ境界チェックを強化。

#### 検証
- 全 `SKILL.md` の `name` がフォルダ名と一致、`description` は上限内（276〜503字）。
- JSONテンプレート・シェルスクリプト・Python/Nodeサンプルは構文チェック済み。
