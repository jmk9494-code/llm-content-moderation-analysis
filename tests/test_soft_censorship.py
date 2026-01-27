
import unittest
from src.analysis.soft_censorship import SoftCensorshipAnalyzer

class TestSoftCensorship(unittest.TestCase):
    def setUp(self):
        # We rely on spacy being installed. 
        # If not, this test might fail or skip.
        try:
            import spacy
            self.analyzer = SoftCensorshipAnalyzer(method="spacy", model_name="en_core_web_sm")
        except ImportError:
            self.analyzer = None

    def test_extract_entities(self):
        if not self.analyzer or not self.analyzer.nlp:
            self.skipTest("Spacy not installed or model failed to load")
            
        text = "Barack Obama visited the White House in Washington D.C."
        entities = self.analyzer.extract_entities(text)
        
        # Expect: barack obama, white house bounds
        self.assertIn("barack obama", entities)
        # Check for 'white house' OR 'the white house' to be robust
        self.assertTrue(any("white house" in e for e in entities))
        self.assertIn("washington d.c.", entities)

    def test_calculate_omission_bias(self):
        if not self.analyzer or not self.analyzer.nlp:
            self.skipTest("Spacy not installed or model failed to load")
            
        # Use a sentence where entities are clearly distinct to avoid grouping
        ground_truth = "Alice visited Paris. Bob stayed home."
        response = "Alice visited Paris." # Omitted Bob
        
        result = self.analyzer.calculate_omission_bias(response, ground_truth)
        
        self.assertIn("bob", result["missing"])
        self.assertIn("alice", result["found"])
        self.assertGreater(result["score"], 0.0)

if __name__ == '__main__':
    unittest.main()
