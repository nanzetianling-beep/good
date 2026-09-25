"""フェーズ2〜4: 生成物の検証(要件定義書 8章)。"""

import json
import re
import sys
from pathlib import Path

import pytest
from openpyxl import Workbook

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import build_form  # noqa: E402
import build_slides  # noqa: E402
import build_templates  # noqa: E402
from validate_items import load_spec  # noqa: E402

UNKNOWN = "未定"
# 「未定」を付けない選択式(領収書のデザインは見本から必ず選ぶ)
NO_UNKNOWN = {"receipt_design"}
# 個人ごとの個人情報・給与・ログイン情報(6章)
SENSITIVE = ["本名", "生年月日", "口座", "緊急連絡先", "身分証", "パスワード", "ログインID"]


@pytest.fixture(scope="module")
def spec():
    return load_spec()


# ── ① 導入アンケート ─────────────────────────────


def test_form_has_10_sections_with_questions(spec):
    fs = build_form.form_spec(spec)
    assert len(fs["sections"]) == 10
    assert all(sec["items"] for sec in fs["sections"])


def test_form_choices_offer_unknown(spec):
    for sec in build_form.form_spec(spec)["sections"]:
        for it in sec["items"]:
            if it["type"] in ("radio", "checkbox", "dropdown") and not it.get("required"):
                assert it.get("unknown_option") or it["id"] in NO_UNKNOWN, it["id"]


def test_form_validation_rules_present(spec):
    rules = {it["id"]: it.get("validation") for s in build_form.form_spec(spec)["sections"] for it in s["items"]}
    assert rules["invoice_number"]["pattern"] == r"^T\d{13}$"
    assert rules["house_charge_amount"]["kind"] == "integer"
    assert rules["card_fee"]["max"] == 100


def test_form_html_embeds_spec(spec):
    html = build_form.build(spec)
    assert "/*__SPEC_JSON__*/" not in html
    data = json.loads(re.search(r"const SPEC = (\{.*?\});\n", html).group(1).replace("<\\/", "</"))
    assert data["form"]["title"] == spec["form"]["title"]


def test_form_has_no_sensitive_questions(spec):
    text = json.dumps(build_form.form_spec(spec), ensure_ascii=False)
    for w in SENSITIVE:
        assert w not in text, w


# ── ② 記入テンプレート ─────────────────────────────


def test_line_has_guide_six_themes_and_closing(spec):
    names = [n for n, _ in build_templates.line_messages(spec)]
    assert names[0] == "00_案内" and names[-1] == "99_最後に"
    assert len(names) == 6


def test_line_lines_fit_phone_width(spec):
    for name, body in build_templates.line_messages(spec):
        for line in body.splitlines():
            assert len(line) <= 35, f"{name}: {line}"


def test_line_roster_warns_against_personal_info(spec):
    body = dict(build_templates.line_messages(spec))["05_キャスト・スタッフ名簿"]
    assert "個人情報は送らないでください" in body


def test_line_asks_no_sensitive_data(spec):
    for name, body in build_templates.line_messages(spec):
        asked = [l for l in body.splitlines() if not l.startswith("※")]
        for w in SENSITIVE + ["時給"]:
            assert not any(w in l and "時給を上げる" not in l for l in asked), (name, w)


def test_line_skip_theme(spec):
    names = [n for n, _ in build_templates.line_messages(spec, skip={5})]
    assert not any(n.startswith("05_") for n in names)


@pytest.fixture(scope="module")
def workbook(spec) -> Workbook:
    return build_templates.build_workbook(spec)


def test_excel_has_six_sheets(workbook, spec):
    assert workbook.sheetnames == [t["sheet"] for t in spec["themes"]]


def test_excel_examples_are_gray(workbook, spec):
    for t in spec["themes"]:
        ws = workbook[t["sheet"]]
        rows = build_templates.sheet_rows(spec, t)
        for n, row in enumerate(rows, start=1):
            if row["kind"] == "example":
                cell = next(ws.cell(row=n, column=c) for c in range(1, 9) if ws.cell(row=n, column=c).value is not None)
                assert cell.font.color.rgb.endswith("9AA0A6")


def test_excel_has_validations(workbook, spec):
    for t in spec["themes"]:
        ws = workbook[t["sheet"]]
        types = {dv.type for dv in ws.data_validations.dataValidation}
        cells = [c for it in build_templates.template_items(spec, t["id"]) for c in it["cells"]]
        if any(isinstance(c, list) for c in cells):
            assert "list" in types, t["sheet"]
        if any(c in ("int", "num") for c in cells):
            assert types & {"whole", "decimal"}, t["sheet"]


def test_excel_has_no_sensitive_columns(workbook):
    for ws in workbook:
        for row in ws.iter_rows(values_only=True):
            for v in row:
                if isinstance(v, str) and not v.startswith("※"):
                    assert not any(w in v for w in SENSITIVE + ["時給"]) or "時給を上げる" in v, v


# ── ③ 対面レクチャー資料 ─────────────────────────────


@pytest.fixture(scope="module")
def lecture(spec):
    return build_slides.load_lecture(spec)


def test_slides_cover_13_chapters(lecture):
    assert [c["id"] for c in lecture["chapters"]] == list(range(14))
    covered = {c for part in lecture["parts"] for sl in part["slides"] for c in build_slides.slide_chapters(sl)}
    assert covered == set(range(1, 14))


def test_slides_total_time_within_visit(spec):
    # 5章の章立ての目安を足すと、全章で123分。キッチン伝票(使う店舗のみ)を除いた標準で90〜120分に収める
    standard = build_slides.load_lecture(spec, exclude={9})["chapters"]
    assert 90 <= build_slides.total_minutes(standard) <= 120


def test_deck_is_15_to_20_slides(lecture):
    _, files = build_slides.deck(lecture)
    assert 15 <= len(files) <= 20


def test_each_part_is_two_or_three_slides(lecture):
    for part in lecture["parts"][:-1]:
        assert 2 <= len(part["slides"]) <= 3, part["title"]


def test_operations_have_three_parts(lecture):
    for part in lecture["parts"]:
        for sl in part["slides"]:
            if sl["kind"] == "ops":
                assert 1 <= len(sl["ops"]) <= 2, sl["title"]
                for op in sl["ops"]:
                    assert 3 <= len(op["steps"]) <= 5, op["title"]
                    assert op["screen"].endswith(".png") and op["try"], op["title"]


def test_slides_exclude_chapter(spec):
    lec = build_slides.load_lecture(spec, exclude={9})
    assert "キッチン伝票" not in build_slides.marp(lec)
    assert len(build_slides.deck(lec)[1]) == len(build_slides.deck(build_slides.load_lecture(spec))[1]) - 1


def test_every_chapter_check_is_shown(lecture):
    _, files = build_slides.deck(lecture)
    html = "".join(files.values())
    for items in lecture["checks"].values():
        for c in items:
            assert c in html, c


def test_deck_ids_and_order(lecture):
    index, files = build_slides.deck(lecture)
    assert index["order"] == list(files)
    assert all(re.fullmatch(r"[A-Za-z0-9_-]{1,64}", i) for i in index["order"])
    for sid, html in files.items():
        assert html.startswith(f'<section id="{sid}"') and html.endswith("</section>")
        assert "<span style" not in html


def test_checklist_fits_one_page(lecture):
    text = build_slides.checklist(lecture)
    assert len(text.splitlines()) <= 40
    for c in build_slides.FINAL_CHECKS:
        assert f"□ {c}" in text


def test_form_options_are_not_split_by_commas(spec):
    # YAML のフロー記法でカンマを含む選択肢が分割されないこと
    by_id = {it["id"]: it for it in spec["items"]}
    assert "ホステス源泉(日額5,000円控除)" in by_id["main_withholding_type"]["options"]
    for it in spec["items"]:
        for o in it.get("options", []):
            s = str(o)
            assert s.count("(") == s.count(")"), (it["id"], s)


def test_workbook_has_all_kinds_with_store_name(spec):
    wb = build_templates.build_workbook(spec, standalone=True)
    assert wb.sheetnames == [t["sheet"] for t in spec["themes"]]
    for ws in wb:
        assert ws["A2"].value == "店舗名"
        assert any("LINEで送って" in str(c.value) for row in ws.iter_rows(max_row=8) for c in row if c.value)



def test_tables_and_send_rules_are_in_form(spec):
    by_id = {it["id"]: it for s in build_form.form_spec(spec)["sections"] for it in s["items"]}
    for i in ["tables", "send_areas", "busy_hours"]:
        assert by_id[i]["type"] == "table" and by_id[i]["columns"] and by_id[i]["cells"]
    assert by_id["send_areas"]["show_if"] == {"item": "send_areas_use", "equals": "あり"}
    names = [n for n, _ in build_templates.line_messages(spec)]
    assert not any("卓" in n or "送り" in n for n in names)
