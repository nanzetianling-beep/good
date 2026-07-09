# Form Field(予約フォーム)

## 目的(Why)
入力の負担と不安を最小化する。カウンセリング予約は心理的ハードルが高いため、必須項目を絞り、任意項目を明示し、守秘の一文を添えて安心感を担保する。

## 構成
- `.field`(label + input/select/textarea)。必須は `<span class="req">*</span>` を label 内に、視覚は真鍮(accent.text)。
- ラジオは `<fieldset><legend>` でグループ化し、`.radio` は選択時に `:has(input:checked)` で枠を accent 化。
- 同意は `.consent`(checkbox + ラベル)。プライバシーポリシーへのリンクを含む。

## 状態・トークン
- 背景: background.subtle / 枠: border.default → hover で border.accent / focus-visible で accent アウトライン
- 角丸: radius.md / 最小高さ 52px / accent-color: action.primary(ネイティブ選択色)

## アクセシビリティ
- すべての入力に `<label for>` を関連付け。必須は `required` 属性で機械可読に。
- 送信結果は `role="status"` の領域に出し、`focus()` で読み上げへ誘導。
- `novalidate` + JS で `checkValidity()`/`reportValidity()` を使い、色のみに依存しないエラー提示。

## 禁止事項
- placeholder をラベル代わりに使う(入力後に文脈が消える)
- 必須を色(*)だけで表現し、属性・テキストを欠く
