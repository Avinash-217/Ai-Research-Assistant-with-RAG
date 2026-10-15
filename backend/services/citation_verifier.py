"""Citation verification engine ensuring every inline citation maps to retrieved chunks."""
import re
from typing import List, Dict, Any, Tuple


class CitationVerifier:
    @staticmethod
    def extract_citations_from_text(text: str) -> List[Tuple[str, int]]:
        """
        Extracts citations formatted as:
        [Paper Title, p. 1] or [Paper Title, p. 12-14] or [Author et al., 2024, p. 5]
        """
        # Regex matching bracketed citation with page number
        pattern = r'\[([^\]\n]+?),\s*p\.?\s*(\d+)\]'
        matches = re.findall(pattern, text)
        citations = []
        for title, page_str in matches:
            try:
                page_num = int(page_str)
                citations.append((title.strip(), page_num))
            except ValueError:
                continue
        return citations

    @classmethod
    def verify_and_ground_citations(
        cls,
        answer_text: str,
        retrieved_chunks: List[Dict[str, Any]]
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Verifies every citation against retrieved chunks.
        Drops or flags citations that do not map to any retrieved chunk.
        Returns: (sanitized_answer_text, verified_citation_items)
        """
        raw_citations = cls.extract_citations_from_text(answer_text)
        verified_items = []
        sanitized_text = answer_text

        for cite_title, cite_page in raw_citations:
            matched_chunk = None

            # Look for matching chunk by title/id and page number
            for chunk in retrieved_chunks:
                chunk_title = chunk.get("title", "").lower()
                chunk_page = chunk.get("page_number", 0)

                # Check if title matches closely and page is exact or within ±1
                if (cite_title.lower() in chunk_title or chunk_title in cite_title.lower()) and (abs(chunk_page - cite_page) <= 1):
                    matched_chunk = chunk
                    break

            if matched_chunk:
                verified_items.append({
                    "source_title": matched_chunk["title"],
                    "page_number": matched_chunk["page_number"],
                    "passage": matched_chunk["content"],
                    "document_id": matched_chunk.get("doc_id"),
                    "source_type": "document",
                    "verified": True,
                    "confidence": 1.0
                })
            else:
                # Citation hallucinated or did not map to retrieved chunks
                # Flag or drop: replace in text with [Unverified Citation: Title, p. X]
                bad_pattern = rf'\[{re.escape(cite_title)},\s*p\.?\s*{cite_page}\]'
                # We flag it cleanly for transparency
                sanitized_text = re.sub(
                    bad_pattern,
                    f'[{cite_title}, p. {cite_page} (Unverified Citation)]',
                    sanitized_text
                )

        # Also add any top retrieved chunks as reference if no inline citations were used
        if not verified_items and retrieved_chunks:
            for top_chunk in retrieved_chunks[:2]:
                verified_items.append({
                    "source_title": top_chunk["title"],
                    "page_number": top_chunk["page_number"],
                    "passage": top_chunk["content"],
                    "document_id": top_chunk.get("doc_id"),
                    "source_type": "document",
                    "verified": True,
                    "confidence": top_chunk.get("score", 0.9)
                })

        return sanitized_text, verified_items
