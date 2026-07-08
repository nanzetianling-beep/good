"""セッション登録モジュール。

すべてのセッションを一元的に登録・管理するためのレジストリを提供する。
"""

from __future__ import annotations

import threading
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Iterable, Optional


@dataclass(frozen=True)
class Session:
    """登録対象のセッションを表す。"""

    session_id: str
    user: str
    created_at: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    metadata: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def new(cls, user: str, **metadata: Any) -> "Session":
        """新しいセッションIDを採番してセッションを生成する。"""
        return cls(session_id=uuid.uuid4().hex, user=user, metadata=metadata)


class DuplicateSessionError(ValueError):
    """同じセッションIDが既に登録されている場合に送出される。"""


class SessionRegistry:
    """すべてのセッションを登録・管理するスレッドセーフなレジストリ。"""

    def __init__(self) -> None:
        self._sessions: dict[str, Session] = {}
        self._lock = threading.Lock()

    def register(self, session: Session) -> Session:
        """セッションを1件登録する。

        同じIDが既に登録されている場合は DuplicateSessionError を送出する。
        """
        with self._lock:
            if session.session_id in self._sessions:
                raise DuplicateSessionError(
                    f"session already registered: {session.session_id}"
                )
            self._sessions[session.session_id] = session
        return session

    def register_all(self, sessions: Iterable[Session]) -> list[Session]:
        """すべてのセッションをまとめて登録する。

        1件でも重複があれば何も登録せずに DuplicateSessionError を送出する
        （全件成功か全件失敗のどちらかになる）。
        """
        sessions = list(sessions)
        with self._lock:
            seen: set[str] = set()
            for session in sessions:
                if (
                    session.session_id in self._sessions
                    or session.session_id in seen
                ):
                    raise DuplicateSessionError(
                        f"session already registered: {session.session_id}"
                    )
                seen.add(session.session_id)
            for session in sessions:
                self._sessions[session.session_id] = session
        return sessions

    def get(self, session_id: str) -> Optional[Session]:
        """IDでセッションを取得する。未登録なら None を返す。"""
        with self._lock:
            return self._sessions.get(session_id)

    def unregister(self, session_id: str) -> bool:
        """セッションの登録を解除する。解除できたら True を返す。"""
        with self._lock:
            return self._sessions.pop(session_id, None) is not None

    def all_sessions(self) -> list[Session]:
        """登録済みのすべてのセッションを登録順に返す。"""
        with self._lock:
            return list(self._sessions.values())

    def __len__(self) -> int:
        with self._lock:
            return len(self._sessions)

    def __contains__(self, session_id: str) -> bool:
        with self._lock:
            return session_id in self._sessions


def main() -> None:
    """デモ: すべてのセッションを登録して一覧表示する。"""
    registry = SessionRegistry()
    sessions = [
        Session.new("alice", device="mobile"),
        Session.new("bob", device="desktop"),
        Session.new("carol", device="tablet"),
    ]
    registry.register_all(sessions)

    print(f"登録済みセッション数: {len(registry)}")
    for session in registry.all_sessions():
        print(
            f"- {session.session_id} "
            f"user={session.user} metadata={session.metadata}"
        )


if __name__ == "__main__":
    main()
