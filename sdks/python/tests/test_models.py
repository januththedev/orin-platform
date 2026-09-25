import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from orin_platform_contracts import SearchRequest, ModelAlias

class ContractModelTests(unittest.TestCase):
    def test_search_request(self):
        value = SearchRequest(query="weather", n=5)
        self.assertEqual(value.n, 5)
        self.assertIn("orin-cheap", {"orin-cheap", "orin-balanced", "orin-thinking", "orin-coding"})

if __name__ == "__main__":
    unittest.main()
