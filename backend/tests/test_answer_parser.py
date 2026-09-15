import pytest
from app.evaluator.answer_parser import parse_answer_key, AnswerKeyParseError


class TestSpaceSeparated:
    def test_basic(self):
        result = parse_answer_key("B D C C B A D C B A")
        assert result == {
            "1": "B", "2": "D", "3": "C", "4": "C", "5": "B",
            "6": "A", "7": "D", "8": "C", "9": "B", "10": "A",
        }

    def test_lowercase(self):
        result = parse_answer_key("b d c")
        assert result == {"1": "B", "2": "D", "3": "C"}


class TestCommaSeparated:
    def test_basic(self):
        result = parse_answer_key("B,D,C,C,B")
        assert result == {"1": "B", "2": "D", "3": "C", "4": "C", "5": "B"}

    def test_with_spaces(self):
        result = parse_answer_key("B, D, C, A")
        assert result == {"1": "B", "2": "D", "3": "C", "4": "A"}


class TestNumberedFormat:
    def test_dash_format(self):
        result = parse_answer_key("1-B\n2-D\n3-C")
        assert result == {"1": "B", "2": "D", "3": "C"}

    def test_dot_format(self):
        result = parse_answer_key("1. B\n2. D\n3. C")
        assert result == {"1": "B", "2": "D", "3": "C"}

    def test_q_prefix(self):
        result = parse_answer_key("Q1-B\nQ2-D\nQ3-C")
        assert result == {"1": "B", "2": "D", "3": "C"}


class TestEdgeCases:
    def test_empty_raises(self):
        with pytest.raises(AnswerKeyParseError):
            parse_answer_key("")

    def test_whitespace_only_raises(self):
        with pytest.raises(AnswerKeyParseError):
            parse_answer_key("   ")

    def test_extra_whitespace(self):
        result = parse_answer_key("  B   D   C  ")
        assert result["1"] == "B"
        assert result["2"] == "D"
        assert result["3"] == "C"
