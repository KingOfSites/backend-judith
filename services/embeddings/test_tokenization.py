"""Regression: match the publisher's complete-input tokenization, preserve the tail."""
import unittest
import server

class TokenizationTest(unittest.TestCase):
    def test_matches_official_input(self):
        for kind in ['query', 'passage']:
            for text in ['Como devolver o bem?', '  Ação e coração 🦉\n', '\nContrato civil.', 'Dados pessoais: exclusão!']:
                prefix, ids = server.input_tokens(text, kind)
                actual = [server.cls, *prefix, *ids, server.sep]
                expected = server.tokenizer.encode(kind + ': ' + text).ids
                self.assertEqual(actual, expected)

    def test_no_window_truncation(self):
        text = 'Proteção, obrigação e devolução. 🦉 ' * 3000
        prefix, ids = server.input_tokens(text, 'passage')
        windows = [ids[i:i + server.WINDOW] for i in range(0, len(ids), server.WINDOW)]
        self.assertGreater(len(windows), 1)
        self.assertEqual([x for part in windows for x in part], ids)
        self.assertTrue(all(len(part) + len(prefix) + 2 <= 512 for part in windows))
        self.assertEqual(prefix + ids, server.tokenizer.encode('passage: ' + text, add_special_tokens=False).ids)

if __name__ == '__main__':
    unittest.main()
