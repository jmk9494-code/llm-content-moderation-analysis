
import os
import unittest
from unittest.mock import patch, MagicMock
from src.loaders.standard_benchmarks import download_xstest, load_xstest, CACHE_FILE

class TestStandardBenchmarks(unittest.TestCase):
    
    @patch('src.loaders.standard_benchmarks.requests.get')
    def test_download_xstest(self, mock_get):
        # Mock response
        mock_response = MagicMock()
        mock_response.content = b"type,focus,prompt\nxstest,test_focus,test_prompt"
        mock_response.status_code = 200
        mock_get.return_value = mock_response
        
        # Ensure cache file is removed before test
        if os.path.exists(CACHE_FILE):
            os.remove(CACHE_FILE)
            
        path = download_xstest()
        self.assertTrue(os.path.exists(path))
        self.assertEqual(path, CACHE_FILE)
        
        # Test loading
        prompts = load_xstest()
        self.assertGreater(len(prompts), 0)
        self.assertEqual(prompts[0]['prompt'], 'test_prompt')
        self.assertEqual(prompts[0]['category'], 'test_focus')
        
    def tearDown(self):
        # clean up if needed, but keeping cache is fine for dev
        pass

if __name__ == '__main__':
    unittest.main()
