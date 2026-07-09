# Components

コンポーネント別の設計ルールを 1コンポーネント = 1ファイル で管理する。

## ファイルの書式

```markdown
# Button

## 目的(Why)
ユーザーの主要アクションを1画面に1つだけ強調するため、primaryは1画面1個まで。

## バリアント
- primary / secondary / ghost / danger

## 状態
- default / hover / active / focus-visible / disabled / loading

## 使用トークン
- 背景: color.semantic.action.primary
- 角丸: radius.md
- パディング: space.2 space.4

## 禁止事項
- primaryボタンの複数配置
- aタグへのbutton見た目の適用(遷移はリンク、操作はボタン)
```

コンポーネント追加時は必ずこの書式に従い、changelog に記録すること。
