"""Parse answer key from various text formats."""

import re


class AnswerKeyParseError(Exception):
    pass


def parse_answer_key(raw: str) -> dict[str, str]:
    text = raw.strip()
    if not text:
        raise AnswerKeyParseError("Answer key is empty.")

    numbered = _try_numbered(text)
    if numbered:
        return numbered

    comma = _try_comma(text)
    if comma:
        return comma

    space = _try_space(text)
    if space:
        return space

    raise AnswerKeyParseError(
        "Could not parse answer key. Use one of: "
        "'B D C A' (space-separated), "
        "'B,D,C,A' (comma-separated), or "
        "'1-B 2-D 3-C' (numbered)."
    )


def _try_numbered(text: str) -> dict[str, str] | None:
    pattern = re.compile(
        r'(?:Q\.?\s*)?'
        r'(\d+)'
        r'\s*[-.:)\]\s]\s*'
        r'([A-Ea-e])',
        re.IGNORECASE,
    )
    matches = pattern.findall(text)
    if len(matches) >= 2:
        return {str(int(q)): a.upper() for q, a in matches}
    return None


def _try_comma(text: str) -> dict[str, str] | None:
    if "," not in text:
        return None
    parts = [p.strip().upper() for p in text.split(",") if p.strip()]
    if all(len(p) == 1 and p in "ABCDE" for p in parts) and len(parts) >= 2:
        return {str(i + 1): p for i, p in enumerate(parts)}
    return None


def _try_space(text: str) -> dict[str, str] | None:
    tokens = text.upper().split()
    if all(len(t) == 1 and t in "ABCDE" for t in tokens) and len(tokens) >= 2:
        return {str(i + 1): t for i, t in enumerate(tokens)}
    return None
