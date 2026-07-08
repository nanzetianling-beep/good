import unittest

from session_registry import DuplicateSessionError, Session, SessionRegistry


class SessionRegistryTest(unittest.TestCase):
    def setUp(self) -> None:
        self.registry = SessionRegistry()

    def test_register_single_session(self) -> None:
        session = Session.new("alice")
        self.registry.register(session)
        self.assertEqual(len(self.registry), 1)
        self.assertIn(session.session_id, self.registry)
        self.assertEqual(self.registry.get(session.session_id), session)

    def test_register_all_sessions(self) -> None:
        sessions = [Session.new("alice"), Session.new("bob"), Session.new("carol")]
        registered = self.registry.register_all(sessions)
        self.assertEqual(registered, sessions)
        self.assertEqual(len(self.registry), 3)
        self.assertEqual(self.registry.all_sessions(), sessions)

    def test_register_duplicate_raises(self) -> None:
        session = Session.new("alice")
        self.registry.register(session)
        with self.assertRaises(DuplicateSessionError):
            self.registry.register(session)

    def test_register_all_is_atomic_on_duplicate(self) -> None:
        existing = Session.new("alice")
        self.registry.register(existing)
        batch = [Session.new("bob"), existing, Session.new("carol")]
        with self.assertRaises(DuplicateSessionError):
            self.registry.register_all(batch)
        # 重複があった場合はバッチ内の1件も登録されない
        self.assertEqual(len(self.registry), 1)

    def test_register_all_rejects_duplicates_within_batch(self) -> None:
        session = Session.new("alice")
        with self.assertRaises(DuplicateSessionError):
            self.registry.register_all([session, session])
        self.assertEqual(len(self.registry), 0)

    def test_unregister(self) -> None:
        session = Session.new("alice")
        self.registry.register(session)
        self.assertTrue(self.registry.unregister(session.session_id))
        self.assertFalse(self.registry.unregister(session.session_id))
        self.assertEqual(len(self.registry), 0)

    def test_get_missing_returns_none(self) -> None:
        self.assertIsNone(self.registry.get("missing"))


if __name__ == "__main__":
    unittest.main()
