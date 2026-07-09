# Card(サービス / 料金プラン / お客様の声)

## 目的(Why)
情報を等価な単位でグルーピングし、比較・一覧を容易にする。枠線と余白で境界を示し、影は最小限に留めて上品さを保つ。

## 種類
- **service**: ローマ数字の番号 + 見出し + 説明 + ghostリンク。ホバーで -4px リフト+border.accent+shadow.md。
- **plan(料金)**: 通常はヘアライン枠。`.featured` は background.inverse(深緑)+text.on-inverse で1枚だけ強調。
- **voice(声)**: 引用符(セリフ大)+ serif 引用文 + 属性。background.subtle。

## 使用トークン
- 背景: background.default / background.subtle / background.inverse(featured)
- 枠: border.default → border.accent(hover/featured)
- 角丸: radius.lg / 余白: space.8 / 影: shadow.sm→md(hover)

## 禁止事項
- featured(深緑)を複数枚にする(「一番選ばれる」1枚の誘導が薄れる)
- カード内で3階層を超える情報密度(一覧性が崩れる)
