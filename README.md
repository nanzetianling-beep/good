# good

## セッション登録 (Session Registration)

すべてのセッションを一元的に登録・管理するためのモジュールです。

- `session_registry.py` — `Session` と `SessionRegistry` を提供
  - `register(session)` — セッションを1件登録
  - `register_all(sessions)` — すべてのセッションをまとめて登録（全件成功か全件失敗）
  - `all_sessions()` — 登録済みのすべてのセッションを取得
  - `get(session_id)` / `unregister(session_id)` — 取得・登録解除

### 使い方

```bash
# デモの実行
python3 session_registry.py

# テストの実行
python3 -m unittest test_session_registry -v
```