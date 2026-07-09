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

## 2026-07-09 — 解像度向上（深化）パス
ユーザー指示: 「まとまったスキルと別々のスキルの解像度を上げてほしい」。
10スキルすべてを深化（手順の実行可能化・worked example追加・トラブルシュート・数値付きチェックリスト）。
SKILL.md は全て500行以内を維持し、詳細は references/ に展開（progressive disclosure）。

#### 各スキルの主な追加点
- **frontend-design**: ワークフローに合否ゲート付きの実行手順、実HTML/CSS例（WCAGコントラスト計算済み）、
  「AIっぽさ」の兆候→修正表を23項目に拡大、`layout-patterns.md`（8パターン）新設。CSSはlightningcssで検証。
- **playwright**: `patterns.md` を478行に拡充（2FA人間介入、ページネーション/無限スクロール、表→CSV、
  DL/UL、iframe、ダイアログ、jitter付きレート制御）。`troubleshooting.md` 新設（プロキシ/TLSは実環境検証済み、
  playwright==1.56.0 のピン留めが必要なことを実測で確認）。全サンプルに retry/構造化ログ/失敗時アーティファクト
  収集キットを追加、`form_fill.py` 新設。
- **claude-code-setup**: インテイクを実行可能な5手順化（検出プローブ、6つの質問、F+S−Eスコアリング）、
  レポートテンプレ、`recipes.md`（公式doc検証済みのコピペ可能レシピ10種）新設、アンチパターン12項目。
- **skill-creator**: 12問のインタビュースクリプト（回答→構造へのマッピング付き）、評価ループを実行可能化
  （トリガー/ニアミスプロンプトの作り方、100%/0%合格基準）、経費精算スキルの完全なworked example新設、
  品質チェックをID付き合否形式に変換（機械チェック用bash付き）。
- **plugin-dev**: incident-toolsプラグインのゼロから配布までの完全実例新設（実際に `claude plugin validate
  --strict` を通し、MCPサーバのJSON-RPCハンドシェイクまで実測）。トラブルシュート10項目。marketplace
  テンプレの pluginRoot 二重前置バグを修正。`argument-hint` の非引用YAMLが全フロントマターを無効化する
  実挙動を発見し文書化。
- **claude-md-management**: 監査を8手順の実行可能プロシージャ化（行数閾値、重大度ルーブリック、レポート
  テンプレ）、機械チェック用grepワンライナー、77行の悪い例→33行の書き直しworked audit新設、配置判断表。
- **superpowers**: 7ステップ各々に出力アーティファクトテンプレ、時間×重要度の深さ表、worked runs 2本
  （build-vs-buy戦略、競合状態デバッグ）新設、全パワームーブに「使うべき兆候」を付与。
- **natural-japanese**: `hyokiyure-list.md`（表記ゆれ85組、JTF/慣行の根拠マーク付き）新設、トンマナ設定
  シート記入例3種、長文リライト実例2本（番号注記付き）、リライト強度3レベル表、文体プロファイル抽出テンプレ。
- **security-guidance**: 監査をrg/grepワンライナー付きの実行可能手順化（各クラスに良性/悪性ヒット例）、
  無害化済みworked audit（3つの埋め込み問題を検出する完全例）新設、良性類似例ノート、インシデント対応
  ミニフロー（永続化確認→ローテの順序含む）。
- **atomic-agents**: 各フェーズに記入式テンプレ（ゴール仕様・分解ワークシート・統合テスト計画）、
  コンパイル検証済みのエンドツーエンド実装スケルトン（pydanticスキーマ+有界リトライ）新設、
  5パターン全てに失敗モード表と擬似コード、パターン誤選択の兆候表。

#### 対応した問題
- GitHub Push Protection が claude-md-management の教材例内の架空Stripeキー（実パターン一致）を検知し
  プッシュをブロック → `sk_live_[REDACTED_EXAMPLE]` に無害化してamend後、プッシュ成功。

## 2026-07-09 — `/skill名` 明示呼び出し化（自動発動オフ）
ユーザー指示: 「/skill名 で呼ぶようにしたい。それ以外は一旦自動化しなくていい。」
- 全10スキルのフロントマターに `disable-model-invocation: true` を追加。
  → モデルによる自動発動が無効化され、`/skill名` の手動スラッシュコマンドとしてのみ起動する。
- 併せて潜在バグを修正: 3スキル（claude-md-management, natural-japanese, superpowers）の
  `description` 内に `: `（コロン+空白）が含まれ、厳密なYAMLパーサでフロントマターが壊れる状態だった。
  該当箇所（`Triggers: ` / `work: `）を ` — ` に置換し、全10スキルが厳密YAMLとしてパースOKであることを検証。
- 挙動として自動化しているのはこの「スキル定義」のみ。フック等の他の自動化は追加していない。

## 2026-07-09 — モデル互換性（Opus 4.8対応）の確認と明記
ユーザー指示: 「これらのスキルはFable5のみではなくOpus4.8でも使えるようにして」。
- 調査: 全スキルを `fable / claude-fable / opus / sonnet / haiku / model:` でグレップ。
  → Fable 5固有のモデルID・前提は**ゼロ**。スキルはモデル非依存のMarkdown指示書であり、
  実行中のモデル（Opus 4.8含む任意のClaudeモデル）がそのまま読んで動作する。追加改修は不要。
- 唯一の `model:` 出現は claude-code-setup の**サブエージェント例**（`model: sonnet`、
  コメントに `inherit, opus, haiku`）で、これは利用者が作るサブエージェント設定の例。スキル本体を
  特定モデルに縛るものではない。
- durableな明記として README に「Invocation & model compatibility」節を追加
  （Opus 4.8 / Sonnet / Haiku / Fable 5 いずれでも動作、`/model` 切替の影響なし）。
- 併せて README の陳腐化を修正: 「11 skills」→「10 skills」、自動発動の記述を `/skill名`
  手動呼び出しの記述に更新（前ステップの `disable-model-invocation` 変更に整合）。

#### エージェント報告のUNCERTAINTIES（誠実性のための記録）
- 判断閾値の一部（CLAUDE.md 350行must-fix、skill-creatorのD1=60字/E3=0件基準）は文書化された規定ではなく
  本スキル独自の基準であり、その旨を各ファイル内に明記済み。
- 一部一次ソース（playwright.dev、Anthropicブログ等）はプロキシ経由で403のため、内容は検索スニペットで
  裏取り。環境固有の事実（ブラウザパス、pipバージョン、プロキシ挙動）は実測で検証済み。
