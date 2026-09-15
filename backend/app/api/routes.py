"""API routes for the CDN Response Sheet Evaluator."""

import logging
from urllib.parse import urlparse
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
import httpx
from ..models.schemas import (
    ParseRequest, ParseResponse, MarkingScheme,
)
from ..scraper.fetcher import fetch_cdn_page, FetchError
from ..scraper.cdn_parser import parse_cdn_response
from ..evaluator.evaluator import evaluate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

_IMAGE_ALLOWED_HOSTS = {"cdn3.digialm.com", "cdn.digialm.com", "digialm.com"}


@router.post("/parse", response_model=ParseResponse)
async def parse_response_sheet(req: ParseRequest):
    """Fetch, parse, and auto-evaluate a CDN response sheet."""
    try:
        html = await fetch_cdn_page(req.url)
    except FetchError as e:
        return ParseResponse(success=False, error=str(e))
    except Exception as e:
        logger.exception("Unexpected error fetching %s", req.url)
        return ParseResponse(success=False, error=f"Failed to fetch: {e}")

    try:
        sheet = parse_cdn_response(html, req.url)
    except Exception as e:
        logger.exception("Parser error")
        return ParseResponse(success=False, error=f"Failed to parse response sheet: {e}")

    # Auto-evaluate if we have correct answers
    evaluation = None
    has_keys = any(q.correct_answer is not None for q in sheet.questions)
    if sheet.questions and has_keys:
        try:
            marking = MarkingScheme(correct=1, wrong=0, unanswered=0)
            evaluation = evaluate(sheet.questions, marking)
        except Exception as e:
            logger.exception("Auto-evaluation error")

    return ParseResponse(
        success=True,
        response_sheet=sheet,
        evaluation=evaluation,
    )


@router.post("/evaluate")
async def evaluate_with_scheme(body: dict):
    """Re-evaluate with a custom marking scheme."""
    from ..models.schemas import QuestionResponse

    try:
        questions_data = body.get("questions", [])
        scheme_data = body.get("marking_scheme", {})

        questions = [QuestionResponse(**q) for q in questions_data]
        scheme = MarkingScheme(**scheme_data)
        result = evaluate(questions, scheme)

        return {"success": True, "result": result.model_dump()}
    except Exception as e:
        logger.exception("Evaluation error")
        return {"success": False, "error": f"Evaluation failed: {e}"}


@router.get("/cdn-image")
async def proxy_cdn_image(url: str = Query(..., description="Absolute CDN image URL")):
    """Proxy CDN images with correct Referer header so they don't 400."""
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    if not any(host == d or host.endswith(f".{d}") for d in _IMAGE_ALLOWED_HOSTS):
        raise HTTPException(status_code=400, detail="Domain not allowed")
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail="Invalid scheme")

    referer = f"{parsed.scheme}://{parsed.netloc}/"
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(
                url,
                headers={
                    "Referer": referer,
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                                  "Chrome/120.0.0.0 Safari/537.36",
                },
            )
            resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail="CDN returned error")
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to fetch image from CDN")

    ct = resp.headers.get("content-type", "application/octet-stream")
    return Response(
        content=resp.content,
        media_type=ct,
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.post("/fetch-tgtet")
async def fetch_tgtet(body: dict):
    """Proxy endpoint: submit form data to tgtet.aptonline.in and return the CDN URL."""
    import httpx
    import re

    journal = body.get("journal_number", "").strip()
    hallticket = body.get("hallticket_number", "").strip()
    dob = body.get("dob", "").strip()
    paper = body.get("exam_paper", "").strip()

    if not all([journal, hallticket, dob, paper]):
        raise HTTPException(
            status_code=400,
            detail="All fields required: journal_number, hallticket_number, dob, exam_paper",
        )

    tgtet_url = "https://tgtet.aptonline.in/UI/IntermedaiteScreens/ResponseSheet.aspx"

    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            page_resp = await client.get(tgtet_url)
            page_resp.raise_for_status()
            html = page_resp.text

            viewstate = ""
            vs_match = re.search(r'id="__VIEWSTATE"\s+value="([^"]*)"', html)
            if vs_match:
                viewstate = vs_match.group(1)
            vsg_match = re.search(r'id="__VIEWSTATEGENERATOR"\s+value="([^"]*)"', html)
            viewstate_gen = vsg_match.group(1) if vsg_match else ""
            ev_match = re.search(r'id="__EVENTVALIDATION"\s+value="([^"]*)"', html)
            event_validation = ev_match.group(1) if ev_match else ""

            # Map paper display values to form values
            paper_value_map = {"Paper-I": "I", "Paper-II": "II"}
            paper_val = paper_value_map.get(paper, paper)

            form_data = {
                "__VIEWSTATE": viewstate,
                "__VIEWSTATEGENERATOR": viewstate_gen,
                "__EVENTVALIDATION": event_validation,
                "ctl00$ContentPlaceHolder1$txtJournalNumber": journal,
                "ctl00$ContentPlaceHolder1$txtHallTicket": hallticket,
                "ctl00$ContentPlaceHolder1$txtDob": dob,
                "ctl00$ContentPlaceHolder1$ddlExamPaper": paper_val,
                "ctl00$ContentPlaceHolder1$btnSubmit": "Proceed",
            }

            post_resp = await client.post(
                tgtet_url,
                data=form_data,
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Referer": tgtet_url,
                    "User-Agent": "CDN-Response-Evaluator/1.0",
                },
            )
            post_resp.raise_for_status()
            result_html = post_resp.text

            cdn_match = re.search(
                r'(https?://cdn3?\.digialm\.com[^\s"\'<>]+\.html)',
                result_html,
            )
            if cdn_match:
                cdn_url = cdn_match.group(1).rstrip("',;")
                return {"success": True, "cdn_url": cdn_url}

            iframe_match = re.search(r'<iframe[^>]+src=["\']([^"\']+)["\']', result_html)
            if iframe_match:
                iframe_url = iframe_match.group(1)
                return {"success": True, "cdn_url": iframe_url}

            error_match = re.search(
                r'<span[^>]*id="[^"]*lblError[^"]*"[^>]*>([^<]+)</span>',
                result_html,
            )
            if error_match:
                return {
                    "success": False,
                    "error": f"TGTET site error: {error_match.group(1).strip()}",
                }

            return {
                "success": False,
                "error": "Could not find CDN response sheet link in the TGTET response. "
                         "Please verify your details are correct.",
            }
    except httpx.HTTPStatusError as e:
        return {"success": False, "error": f"TGTET site returned error: {e.response.status_code}"}
    except httpx.ConnectError:
        return {"success": False, "error": "Could not connect to tgtet.aptonline.in. Site may be down."}
    except Exception as e:
        logger.exception("TGTET fetch error")
        return {"success": False, "error": f"Error fetching from TGTET: {e}"}
