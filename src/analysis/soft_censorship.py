
import logging
from typing import List, Set, Dict

logger = logging.getLogger(__name__)

class SoftCensorshipAnalyzer:
    def __init__(self, method="spacy", model_name="en_core_web_sm"):
        self.method = method
        self.nlp = None
        self._load_model(model_name)
        
    def _load_model(self, model_name):
        if self.method == "spacy":
            try:
                import spacy
                if not spacy.util.is_package(model_name):
                    logger.warning(f"Spacy model {model_name} not found. Downloading...")
                    spacy.cli.download(model_name)
                self.nlp = spacy.load(model_name)
            except ImportError:
                logger.error("Spacy not installed. Please install with `pip install spacy`.")
            except Exception as e:
                logger.error(f"Failed to load spacy model: {e}")
                
    def extract_entities(self, text: str) -> Set[str]:
        """
        Extracts named entities (lowercase) from text.
        Focuses on PERSON, GPE, ORG, EVENT, DATE.
        """
        if not self.nlp or not text:
            return set()
            
        doc = self.nlp(text)
        entities = set()
        
        # Filter for relevant entity types
        RELEVANT_TYPES = {"PERSON", "GPE", "ORG", "EVENT", "DATE", "NORP"}
        
        for ent in doc.ents:
            if ent.label_ in RELEVANT_TYPES:
                # Normalize: lowercase and strip
                cleaned = ent.text.lower().strip()
                if len(cleaned) > 1: # Ignore single chars
                    entities.add(cleaned)
                    
        return entities

    def calculate_omission_bias(self, response_text: str, ground_truth_text: str) -> Dict:
        """
        Calculates omission bias score.
        Score = 1.0 - (Matches / Total Ground Truth Entities)
        Higher score = More key entities omitted (Sanitization).
        """
        ground_truth_ents = self.extract_entities(ground_truth_text)
        response_ents = self.extract_entities(response_text)
        
        if not ground_truth_ents:
            return {
                "score": 0.0,
                "reason": "No entities in ground truth",
                "missing": set(),
                "found": set()
            }
            
        # Check which Ground Truth entities appear in Response
        # We assume "containment" logic roughly implies mention
        # But here we do exact match of normalized strings
        
        matches = ground_truth_ents.intersection(response_ents)
        missing = ground_truth_ents - response_ents
        
        score = len(missing) / len(ground_truth_ents)
        
        return {
            "score": round(score, 3),
            "missing_count": len(missing),
            "total_expected": len(ground_truth_ents),
            "missing": list(missing),
            "found": list(matches)
        }
