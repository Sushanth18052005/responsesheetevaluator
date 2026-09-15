import os
import pytest
from app.scraper.cdn_parser import parse_cdn_response

FIXTURE_DIR = os.path.join(os.path.dirname(__file__), "fixtures")


def load_fixture(name: str) -> str:
    path = os.path.join(FIXTURE_DIR, name)
    if not os.path.exists(path):
        pytest.skip(f"Fixture {name} not available")
    with open(path, encoding="utf-8") as f:
        return f.read()


class TestCDNIdExtraction:
    def test_cdn_id_from_title(self):
        html = """<html><head><title>CDN3ABCD1234 - Response Sheet</title></head>
        <body><table><tr><th>Q.No</th><th>(A)</th><th>(B)</th></tr>
        <tr><td>1</td><td style="background-color:darkgreen">A</td><td>B</td></tr>
        </table></body></html>"""
        result = parse_cdn_response(html)
        assert result.cdn_id == "CDN3ABCD1234"

    def test_cdn_id_from_body(self):
        html = """<html><body>
        <p>Response Sheet ID: CDN3XYZ99887</p>
        <table><tr><th>Q.No</th><th>(A)</th><th>(B)</th></tr>
        <tr><td>1</td><td style="background-color:darkgreen">A</td><td>B</td></tr>
        </table></body></html>"""
        result = parse_cdn_response(html)
        assert result.cdn_id == "CDN3XYZ99887"

    def test_unknown_cdn_id(self):
        html = "<html><body><p>No CDN ID here</p></body></html>"
        result = parse_cdn_response(html)
        assert result.cdn_id == "Unknown"


class TestCandidateInfo:
    def test_name_extraction(self):
        html = """<html><body><table>
          <tr><td>Candidate Name:</td><td>John Doe</td></tr>
          <tr><td>Application No:</td><td>APP12345</td></tr>
        </table></body></html>"""
        result = parse_cdn_response(html)
        assert result.candidate_name == "John Doe"
        assert result.candidate_id == "APP12345"


class TestQuestionExtraction:
    def test_basic_table(self):
        html = """<html><body><table>
          <tr><th>Q.No</th><th>Question</th><th>(A)</th><th>(B)</th><th>(C)</th><th>(D)</th></tr>
          <tr><td>1</td><td>What is 1+1?</td>
            <td>1</td><td style="background-color:darkgreen">2</td><td>3</td><td>4</td></tr>
          <tr><td>2</td><td>Capital?</td>
            <td style="background-color:darkgreen">Paris</td><td>London</td><td>Berlin</td><td>Rome</td></tr>
        </table></body></html>"""
        result = parse_cdn_response(html)
        assert len(result.questions) == 2
        assert result.questions[0].selected_option == "B"
        assert result.questions[1].selected_option == "A"

    def test_unanswered(self):
        html = """<html><body><table>
          <tr><th>Q.No</th><th>(A)</th><th>(B)</th><th>(C)</th><th>(D)</th></tr>
          <tr><td>1</td><td>X</td><td>Y</td><td>Z</td><td>W</td></tr>
        </table></body></html>"""
        result = parse_cdn_response(html)
        assert len(result.questions) == 1
        assert result.questions[0].selected_option is None

    def test_fixture_1(self):
        html = load_fixture("cdn_response_1.html")
        result = parse_cdn_response(html)
        assert result.cdn_id.startswith("CDN3")
        assert len(result.questions) == 5
        assert result.candidate_name == "Rahul Kumar"

    def test_fixture_2(self):
        html = load_fixture("cdn_response_2.html")
        result = parse_cdn_response(html)
        assert result.cdn_id == "CDN3MOCK9999"
        assert len(result.questions) == 10
        # Q4 and Q7 are unanswered
        q4 = next(q for q in result.questions if q.question_number == 4)
        assert q4.selected_option is None


class TestDiagnostics:
    def test_counts(self):
        html = """<html><body><table>
          <tr><th>Q.No</th><th>(A)</th><th>(B)</th><th>(C)</th><th>(D)</th></tr>
          <tr><td>1</td><td style="background-color:darkgreen">A</td><td>B</td><td>C</td><td>D</td></tr>
          <tr><td>2</td><td>A</td><td>B</td><td>C</td><td>D</td></tr>
        </table></body></html>"""
        result = parse_cdn_response(html)
        assert result.parsed_questions == 2
        assert result.detected_answers == 1
        assert result.unanswered == 1
