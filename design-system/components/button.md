# Button

## 目的(Why)
ユーザーの行動を促す。1画面で最も重要なアクションを1つだけ強調するため、primaryは原則1画面1個(ヒーロー等の主要導線)に絞る。

## バリアント
- **primary**: 塗り(action.primary)。主要CTA(予約・申し込み)。
- **outline**: 真鍮ヘアライン枠。第2アクション(料金カードの通常プラン等)。
- **ghost**: テキスト+矢印。補助導線(「相談する」「詳しく読む」)。ホバーで矢印が前進。

## 状態
default / hover(-2px リフト) / focus-visible(accent アウトライン) / disabled(opacity 0.5)

## 使用トークン
- 背景: color.semantic.action.primary(primary) / transparent(他)
- ラベル: color.semantic.text.inverse(primary) / text.primary(outline)
- 枠: color.semantic.border.accent(outline)
- 角丸: radius.full / パディング: space.3 space.8 / 最小高さ 52px(タッチターゲット)

## 禁止事項
- primaryボタンの複数並置(視覚的優先順位が崩れる)
- リンク(遷移)にbuttonの見た目、操作にaタグ、の混用
