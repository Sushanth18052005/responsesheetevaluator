"""Parser for CDN3 response sheet HTML.

CDN response sheets from digialm.com use div.question-pnl blocks:
- Each question wrapped in <div class="question-pnl">
- Correct answer: <td class="rightAns"> containing tick.png + "N."
- Wrong options: <td class="wrngAns"> containing cross.png + "N."
- Candidate answer: "Chosen Option :" in a <td>, value in the next <td>
- Question numbering: "Q.N" in a <td> with class "bold"
- Sections: "Section : <name>" text in section header areas
- Question IDs: "Question ID : XXXXXXXXXX"
"""

import re
from copy import deepcopy
from typing import Optional
from bs4 import BeautifulSoup, Tag
from ..models.schemas import CDNResponse, QuestionResponse

_CDN_ID_PATTERN = re.compile(r'\bCDN3[A-Z0-9]{4,}\b', re.IGNORECASE)


def parse_cdn_response(html: str, page_url: str = "") -> CDNResponse:
    soup = BeautifulSoup(html, "html.parser")
    warnings: list[str] = []

    # Derive base URL for resolving relative image paths
    base_url = ""
    if page_url:
        last_slash = page_url.rfind("/")
        if last_slash > 8:  # after https://
            base_url = page_url[:last_slash + 1]

    cdn_id = _extract_cdn_id(soup, html)
    candidate_info = _extract_candidate_info(soup)
    questions, sections, q_warnings = _extract_questions(soup, html, base_url)
    warnings.extend(q_warnings)

    answered = [q for q in questions if q.chosen_option is not None]
    has_key = [q for q in questions if q.correct_answer is not None]

    if not has_key:
        warnings.append("Could not detect answer key (tick.png markers) in this response sheet.")

    return CDNResponse(
        cdn_id=cdn_id or "Unknown",
        candidate_name=candidate_info.get("name"),
        candidate_id=candidate_info.get("id"),
        exam_name=candidate_info.get("exam"),
        exam_date=candidate_info.get("date"),
        subject=candidate_info.get("subject"),
        base_url=base_url or None,
        sections=sections,
        questions=questions,
        parser_warnings=warnings,
        parsed_questions=len(questions),
        detected_answers=len(answered),
        unanswered=len(questions) - len(answered),
    )


def _extract_cdn_id(soup: BeautifulSoup, raw_html: str) -> Optional[str]:
    title = soup.find("title")
    if title:
        m = _CDN_ID_PATTERN.search(title.get_text())
        if m:
            return m.group(0).upper()
    for tag in soup.find_all(["h1", "h2", "h3", "h4", "th", "td", "span", "div", "p"]):
        text = tag.get_text(separator=" ", strip=True)
        m = _CDN_ID_PATTERN.search(text)
        if m:
            return m.group(0).upper()
    m = _CDN_ID_PATTERN.search(raw_html)
    if m:
        return m.group(0).upper()
    return None


def _extract_candidate_info(soup: BeautifulSoup) -> dict:
    info: dict = {}
    label_patterns = {
        "name": re.compile(r'candidate\s*name|applicant\s*name|student\s*name', re.I),
        "id": re.compile(r'application\s*no|roll\s*no|candidate\s*id|registration\s*no', re.I),
        "exam": re.compile(r'exam\s*name|examination|test\s*name', re.I),
        "date": re.compile(r'exam\s*date|test\s*date|date\s*of\s*exam', re.I),
        "subject": re.compile(r'subject|paper|section', re.I),
    }
    for row in soup.find_all("tr"):
        cells = row.find_all(["td", "th"])
        if len(cells) >= 2:
            for i in range(len(cells) - 1):
                label_text = cells[i].get_text(separator=" ", strip=True)
                value_text = cells[i + 1].get_text(separator=" ", strip=True)
                if not value_text:
                    continue
                for key, pattern in label_patterns.items():
                    if key not in info and pattern.search(label_text):
                        cleaned = re.sub(r'\s+', ' ', value_text).strip().lstrip(": ")
                        if cleaned:
                            info[key] = cleaned
    for tag in soup.find_all(["p", "div", "span"]):
        text = tag.get_text(separator=" ", strip=True)
        if ":" in text:
            parts = text.split(":", 1)
            if len(parts) == 2:
                label_text, value_text = parts[0].strip(), parts[1].strip()
                for key, pattern in label_patterns.items():
                    if key not in info and pattern.search(label_text):
                        cleaned = re.sub(r'\s+', ' ', value_text).strip()
                        if cleaned:
                            info[key] = cleaned
    return info


def _extract_questions(
    soup: BeautifulSoup, raw_html: str, base_url: str = ""
) -> tuple[list[QuestionResponse], list[str], list[str]]:
    warnings: list[str] = []
    sections: list[str] = []
    questions: list[QuestionResponse] = []

    # Primary strategy: parse div.question-pnl blocks (digialm standard format)
    questions, sections, q_warnings = _strategy_question_pnl(soup, base_url)
    warnings.extend(q_warnings)

    if not questions:
        # Fallback: text-based block parser for SubQuestion No format
        questions, sections, q_warnings = _strategy_block_parser(soup)
        warnings.extend(q_warnings)

    if not questions:
        # Fallback: regex on raw HTML
        questions, sections, q_warnings = _strategy_regex_fallback(raw_html)
        warnings.extend(q_warnings)
        if questions:
            warnings.append("Used fallback regex parser — results may be less accurate.")

    if not questions:
        # Last resort: table-based green-background format
        questions, q_warnings = _strategy_table_rows(soup)
        warnings.extend(q_warnings)
        if questions:
            warnings.append("Detected table-based format.")

    questions.sort(key=lambda q: q.question_number)

    if questions:
        expected = set(range(1, questions[-1].question_number + 1))
        found = {q.question_number for q in questions}
        missing = expected - found
        if missing and len(missing) <= 10:
            warnings.append(f"Questions {sorted(missing)} were not found.")
        elif missing:
            warnings.append(f"{len(missing)} questions appear to be missing.")

    return questions, sections, warnings


def _resolve_images(tag: Tag, base_url: str) -> str:
    """Get inner HTML of a tag, resolving relative img src to absolute URLs."""
    if not tag:
        return ""
    clone = deepcopy(tag)
    if base_url:
        for img in clone.find_all("img"):
            src = img.get("src", "")
            if src and not src.startswith(("http://", "https://", "data:")):
                img["src"] = base_url + src
    return clone.decode_contents()


def _strategy_question_pnl(
    soup: BeautifulSoup, base_url: str = ""
) -> tuple[list[QuestionResponse], list[str], list[str]]:
    """Parse digialm div.question-pnl blocks.

    Structure per block:
      <div class="question-pnl">
        <table class="questionPnlTbl">
          <tr><td class="rw">
            <table class="questionRowTbl">
              <tr><td>Q.N</td><td>[question image]</td></tr>
              <tr><td>Ans</td><td class="rightAns">tick.png N. [option img]</td></tr>
              <tr><td></td><td class="wrngAns">cross.png N. [option img]</td></tr>
              ...
            </table>
            <table class="menu-tbl">
              ... Question ID, Chosen Option, Section ...
            </table>
          </td></tr>
        </table>
      </div>
    """
    questions: list[QuestionResponse] = []
    sections: list[str] = []
    warnings: list[str] = []
    seen_q: set[int] = set()
    current_section: Optional[str] = None

    pnl_divs = soup.find_all("div", class_="question-pnl")
    if not pnl_divs:
        return questions, sections, warnings

    # Build section map: section-cntnr -> section name from section-lbl
    section_map: dict[int, str] = {}  # pnl id(element) -> section name
    for cntnr in soup.find_all("div", class_="section-cntnr"):
        lbl_div = cntnr.find("div", class_="section-lbl")
        sec_name = None
        if lbl_div:
            bold = lbl_div.find("span", class_="bold")
            if bold:
                sec_name = bold.get_text(strip=True)
            if not sec_name:
                raw = lbl_div.get_text(" ", strip=True)
                m = re.search(r'Section\s*:\s*(.+)', raw, re.I)
                if m:
                    sec_name = m.group(1).strip()
            if sec_name:
                sec_name = sec_name.replace('\xa0', ' ').strip()
        if sec_name:
            if sec_name not in sections:
                sections.append(sec_name)
            for child_pnl in cntnr.find_all("div", class_="question-pnl"):
                section_map[id(child_pnl)] = sec_name

    for pnl in pnl_divs:
        q_num = None
        correct_answer = None
        chosen_option = None
        question_id = None
        section = section_map.get(id(pnl))

        # Extract question number from Q.N pattern
        for td in pnl.find_all("td"):
            text = td.get_text(strip=True)
            m = re.match(r'^Q\.\s*(\d+)$', text)
            if m:
                q_num = int(m.group(1))
                break

        if q_num is None:
            # Try SubQuestion No pattern
            block_text = pnl.get_text(" ", strip=True)
            m = re.search(r'SubQuestion\s*No\s*[:.\s]\s*(\d+)', block_text, re.I)
            if m:
                q_num = int(m.group(1))

        if q_num is None or q_num in seen_q:
            continue

        # Find correct answer: <td class="rightAns"> contains tick.png + "N."
        right_td = pnl.find("td", class_="rightAns")
        if right_td:
            td_text = right_td.get_text(" ", strip=True)
            opt_m = re.search(r'(\d)\s*\.', td_text)
            if opt_m and opt_m.group(1) in "12345":
                correct_answer = opt_m.group(1)

        if correct_answer is None:
            # Fallback: look for tick.png img and find nearby option number
            for img in pnl.find_all("img"):
                src = img.get("src", "")
                if "tick.png" in src:
                    parent_td = img.find_parent("td")
                    if parent_td:
                        td_text = parent_td.get_text(" ", strip=True)
                        opt_m = re.search(r'(\d)\s*\.', td_text)
                        if opt_m and opt_m.group(1) in "12345":
                            correct_answer = opt_m.group(1)
                            break

        # Find chosen option and question ID from menu-tbl
        for tbl in pnl.find_all("table", class_="menu-tbl"):
            cells = tbl.find_all("td")
            for i, cell in enumerate(cells):
                text = cell.get_text(strip=True)
                if re.search(r'Chosen\s*Option', text, re.I):
                    if i + 1 < len(cells):
                        val = cells[i + 1].get_text(strip=True)
                        if val and val != "--" and val != "0":
                            chosen_option = val
                elif re.search(r'Question\s*ID', text, re.I):
                    if i + 1 < len(cells):
                        val = cells[i + 1].get_text(strip=True)
                        if val:
                            question_id = val

        # If menu-tbl approach didn't work, try raw text search
        if chosen_option is None:
            block_text = pnl.get_text(" ", strip=True)
            m = re.search(r'Chosen\s*Option\s*[:.\s]\s*(\d+|[A-Ea-e]|--)', block_text, re.I)
            if m:
                val = m.group(1).strip()
                if val != "--" and val != "0":
                    chosen_option = val

        if question_id is None:
            block_text = pnl.get_text(" ", strip=True)
            m = re.search(r'Question\s*ID\s*[:.\s]\s*(\d+)', block_text, re.I)
            if m:
                question_id = m.group(1)

        # Section comes from the section-cntnr parent (resolved in section_map above)
        # Fall back to previous question's section if not in a section-cntnr
        if section is None and current_section:
            section = current_section
        if section:
            current_section = section

        # Extract question text/HTML and answer option HTML
        question_html = None
        options: dict[str, str] = {}
        row_tbl = pnl.find("table", class_="questionRowTbl")
        if row_tbl:
            rows = row_tbl.find_all("tr")
            for row in rows:
                cells = row.find_all("td")
                if len(cells) < 2:
                    continue
                first_text = cells[0].get_text(strip=True)
                # Question row: "Q.N"
                if re.match(r'^Q\.\s*\d+$', first_text) and question_html is None:
                    question_html = _resolve_images(cells[1], base_url)
                # Option rows: rightAns / wrngAns cells, first cell has "N."
                elif cells[1].get("class") and any(
                    c in ("rightAns", "wrngAns") for c in cells[1].get("class", [])
                ):
                    opt_text = cells[1].get_text(" ", strip=True)
                    opt_m = re.match(r'(\d)\s*\.', opt_text)
                    if opt_m:
                        opt_num = opt_m.group(1)
                        options[opt_num] = _resolve_images(cells[1], base_url)

        seen_q.add(q_num)
        questions.append(QuestionResponse(
            question_number=q_num,
            question_id=question_id,
            correct_answer=correct_answer,
            chosen_option=chosen_option,
            section=section,
            question_html=question_html,
            options=options if options else None,
        ))

    return questions, sections, warnings


def _strategy_block_parser(
    soup: BeautifulSoup,
) -> tuple[list[QuestionResponse], list[str], list[str]]:
    """Fallback: parse from text using SubQuestion No markers."""
    questions: list[QuestionResponse] = []
    sections: list[str] = []
    warnings: list[str] = []
    seen_q: set[int] = set()

    full_text = soup.get_text("\n", strip=False)
    current_section: Optional[str] = None

    for m in re.finditer(r'Section\s*:\s*(.+)', full_text):
        sec = m.group(1).strip()
        sec = re.sub(r'[\xa0 ]+', '', sec).strip()
        if sec and sec not in sections:
            sections.append(sec)

    lines = full_text.split("\n")
    q_starts: list[tuple[int, int]] = []

    for i, line in enumerate(lines):
        sec_match = re.match(r'\s*Section\s*:\s*(.+)', line, re.I)
        if sec_match:
            val = sec_match.group(1).strip()
            val = re.sub(r'[\xa0 ]+', '', val).strip()
            if val:
                current_section = val

        q_match = re.match(r'\s*(?:Sub)?\s*Question\s*(?:No)?\s*[:.\s]\s*(\d+)', line, re.I)
        if not q_match:
            q_match = re.match(r'\s*Q\.?\s*(\d+)', line, re.I)
        if q_match:
            q_num = int(q_match.group(1))
            if 1 <= q_num <= 500 and q_num not in seen_q:
                q_starts.append((i, q_num))

    for idx, (start_line, q_num) in enumerate(q_starts):
        end_line = q_starts[idx + 1][0] if idx + 1 < len(q_starts) else len(lines)
        block = "\n".join(lines[start_line:end_line])

        correct_answer = None
        chosen_option = None
        question_id = None
        section = None

        for j in range(start_line, -1, -1):
            sec_m = re.match(r'\s*Section\s*:\s*(.+)', lines[j], re.I)
            if sec_m:
                val = sec_m.group(1).strip()
                val = re.sub(r'[\xa0 ]+', '', val).strip()
                if val:
                    section = val
                break

        qid_match = re.search(r'Question\s*ID\s*[:\s]\s*(\d+)', block, re.I)
        if qid_match:
            question_id = qid_match.group(1).strip()

        chosen_match = re.search(r'Chosen\s*Option\s*[:\s]\s*(\d+|[A-Ea-e]|--)', block, re.I)
        if chosen_match:
            val = chosen_match.group(1).strip()
            if val != "--" and val != "0":
                chosen_option = val

        tick_patterns = [
            r'tick[^\n]*?(\d)\s*\.',
            r'right[^\n]*?(\d)\s*\.',
            r'(\d)\s*\.\s*[^\n]*tick',
            r'(\d)\s*\.\s*[^\n]*right',
        ]
        for pat in tick_patterns:
            m = re.search(pat, block, re.I)
            if m:
                opt = m.group(1)
                if opt in "1234":
                    correct_answer = opt
                    break

        if q_num not in seen_q:
            seen_q.add(q_num)
            questions.append(QuestionResponse(
                question_number=q_num,
                question_id=question_id,
                correct_answer=correct_answer,
                chosen_option=chosen_option,
                section=section,
            ))

    return questions, sections, warnings


def _strategy_regex_fallback(
    raw_html: str,
) -> tuple[list[QuestionResponse], list[str], list[str]]:
    """Regex-based fallback: extract from raw HTML looking for tick/cross img tags."""
    questions: list[QuestionResponse] = []
    sections: list[str] = []
    warnings: list[str] = []
    seen_q: set[int] = set()

    for m in re.finditer(r'Section\s*:\s*([^<\n]+)', raw_html, re.I):
        sec = m.group(1).strip()
        sec = re.sub(r'[\xa0 &].*', '', sec).strip()
        if sec and sec not in sections:
            sections.append(sec)

    q_pattern = re.compile(
        r'(?:Sub)?\s*Question\s*(?:No)?\s*[:.\s]\s*(\d+)',
        re.I
    )

    q_positions = [(m.start(), int(m.group(1))) for m in q_pattern.finditer(raw_html)]

    for idx, (pos, q_num) in enumerate(q_positions):
        if q_num in seen_q or q_num < 1 or q_num > 500:
            continue

        end_pos = q_positions[idx + 1][0] if idx + 1 < len(q_positions) else len(raw_html)
        block_html = raw_html[pos:end_pos]

        question_id = None
        chosen_option = None
        correct_answer = None
        section = None

        qid_m = re.search(r'Question\s*ID\s*[:\s]*\s*(\d+)', block_html, re.I)
        if qid_m:
            question_id = qid_m.group(1)

        chosen_m = re.search(r'Chosen\s*Option\s*[:\s]*\s*(\d+|[A-Ea-e]|--)', block_html, re.I)
        if chosen_m:
            val = chosen_m.group(1).strip()
            if val != "--" and val != "0":
                chosen_option = val

        correct_answer = _find_correct_from_html(block_html)

        sec_search = raw_html[:pos]
        sec_matches = list(re.finditer(r'Section\s*:\s*([^<\n]+)', sec_search, re.I))
        if sec_matches:
            sec_val = sec_matches[-1].group(1).strip()
            sec_val = re.sub(r'[\xa0 &].*', '', sec_val).strip()
            if sec_val:
                section = sec_val

        seen_q.add(q_num)
        questions.append(QuestionResponse(
            question_number=q_num,
            question_id=question_id,
            correct_answer=correct_answer,
            chosen_option=chosen_option,
            section=section,
        ))

    return questions, sections, warnings


def _find_correct_from_html(block_html: str) -> Optional[str]:
    """Find correct answer from tick.png/right.png img tags in raw HTML."""
    # Look for rightAns class containing an option number
    right_m = re.search(
        r'class=["\']rightAns["\'][^>]*>.*?(\d)\s*\.',
        block_html,
        re.I | re.DOTALL
    )
    if right_m and right_m.group(1) in "12345":
        return right_m.group(1)

    # Fallback: tick.png img near option number
    tick_img_pattern = re.compile(
        r'<img[^>]*src=["\'][^"\']*(?:tick|right|correct)[^"\']*["\'][^>]*/?>',
        re.I
    )

    for tick_match in tick_img_pattern.finditer(block_html):
        tick_pos = tick_match.start()
        after = block_html[tick_pos:tick_pos + 300]
        opt_m = re.search(r'(?:^|\W)(\d)\s*\.', after)
        if opt_m and opt_m.group(1) in "12345":
            return opt_m.group(1)

    # Table row containing tick
    rows = re.findall(
        r'<tr[^>]*>(.*?)</tr>',
        block_html,
        re.I | re.DOTALL
    )
    for row in rows:
        if re.search(r'tick|right|correct', row, re.I):
            opt_m = re.search(r'(?:>|\s)(\d)\s*\.\s*<', row)
            if opt_m and opt_m.group(1) in "12345":
                return opt_m.group(1)

    return None


def _strategy_table_rows(
    soup: BeautifulSoup,
) -> tuple[list[QuestionResponse], list[str]]:
    """Legacy: table-based response sheet format with green background."""
    questions: list[QuestionResponse] = []
    warnings: list[str] = []
    seen_q: set[int] = set()

    _SELECTED_COLORS = {
        "darkgreen", "green", "#008000", "#006400",
        "rgb(0,100,0)", "rgb(0, 100, 0)",
        "rgb(0,128,0)", "rgb(0, 128, 0)",
    }

    def _is_selected(tag: Tag) -> bool:
        style = tag.get("style", "")
        if isinstance(style, list):
            style = " ".join(style)
        style_lower = style.lower().replace(" ", "")
        for color in _SELECTED_COLORS:
            if color.replace(" ", "") in style_lower:
                return True
        classes = tag.get("class", [])
        if isinstance(classes, str):
            classes = [classes]
        classes_str = " ".join(classes).lower()
        if any(k in classes_str for k in ("chosen", "selected", "answered", "marked")):
            return True
        for child in tag.find_all(True, recursive=True):
            child_style = child.get("style", "")
            if isinstance(child_style, list):
                child_style = " ".join(child_style)
            child_lower = child_style.lower().replace(" ", "")
            for color in _SELECTED_COLORS:
                if color.replace(" ", "") in child_lower:
                    return True
        return False

    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        if len(rows) < 2:
            continue
        header_text = rows[0].get_text(" ", strip=True).lower()
        if not ("q" in header_text or "question" in header_text):
            continue
        header_cells = rows[0].find_all(["th", "td"])
        option_cols: dict[str, int] = {}
        for i, cell in enumerate(header_cells):
            text = cell.get_text(" ", strip=True).lower().strip()
            if re.match(r'^\(?a\)?$|^option\s*a$', text):
                option_cols["A"] = i
            elif re.match(r'^\(?b\)?$|^option\s*b$', text):
                option_cols["B"] = i
            elif re.match(r'^\(?c\)?$|^option\s*c$', text):
                option_cols["C"] = i
            elif re.match(r'^\(?d\)?$|^option\s*d$', text):
                option_cols["D"] = i

        for row in rows[1:]:
            cells = row.find_all(["td", "th"])
            if not cells:
                continue
            q_num = None
            for cell in cells[:3]:
                text = cell.get_text(strip=True)
                m = re.match(r'^(\d+)\s*$', text)
                if m:
                    n = int(m.group(1))
                    if 1 <= n <= 500:
                        q_num = n
                        break
            if q_num is None or q_num in seen_q:
                continue

            selected = None
            if option_cols:
                sel_letters = []
                for letter, col_idx in option_cols.items():
                    if col_idx < len(cells) and _is_selected(cells[col_idx]):
                        sel_letters.append(letter)
                if len(sel_letters) == 1:
                    selected = sel_letters[0]
                elif len(sel_letters) > 1:
                    warnings.append(f"Q{q_num}: Multiple options selected. Marked unclear.")
                    selected = "UNCLEAR"

            seen_q.add(q_num)
            questions.append(QuestionResponse(
                question_number=q_num,
                chosen_option=selected,
            ))

    return questions, warnings
