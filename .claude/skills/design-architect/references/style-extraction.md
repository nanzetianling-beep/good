# スタイル抽出手順 (Analyze フェーズ)

外部Webサイトやデザインガイドラインからスタイルを解析・継承する際の標準手順。

## 1. 取得

- WebFetch で対象URLのHTMLを取得し、リンクされたCSS(`<link rel="stylesheet">`)も取得する。
- CSSが取得できない場合は、HTML内のインラインスタイル・`<style>` ブロック・クラス命名から推定し、**推定であることを明記**する。
- JSレンダリング必須のサイトは Playwright(Chromium同梱: `/opt/pw-browsers/chromium`)で `getComputedStyle` を取得する。

## 2. 抽出対象(優先順)

| カテゴリ | 抽出項目 | マッピング先 |
|---|---|---|
| 色 | brand / accent / 背景 / テキスト / ボーダー / 状態色(success, warning, danger) | `tokens/colors.json` |
| タイポグラフィ | font-family, 型スケール(サイズ比率), weight, line-height, letter-spacing | `tokens/typography.json` |
| 余白 | 基準単位(4px/8px系か), スケール, コンテナ幅, ブレークポイント | `tokens/spacing.json` |
| 効果 | border-radius, box-shadow の階層, transition の duration/easing | `tokens/effects.json` |
| 構造 | グリッド構成, ヘッダー/ナビのパターン, カード/ボタンの形状言語 | `components/` |

## 3. 正規化のルール

- 生値をそのまま登録せず、**スケールに正規化**する(例: 実測 14.5px → 型スケール上の `sm: 0.875rem` に丸める)。丸めた場合は changelog に記録する。
- 色は近似色をマージする(ΔE < 5 程度の色は同一トークンに統合)。
- 命名はセマンティック層(`color.text.primary`)とプリミティブ層(`color.gray.900`)の2層構造を守る。コンポーネントからはセマンティック層のみ参照する。

## 4. Sync 時の矛盾解決

- 既存トークンと新規抽出値が矛盾した場合: **既存を勝手に上書きしない**。差分表を提示し、ユーザーに「置換 / 併存(テーマ化) / 破棄」を確認する。
- 併存させる場合はテーマ(例: `themes/brand-b.json`)として分離する。
