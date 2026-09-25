.PHONY: all validate form templates slides test

all: validate form templates slides

validate:
	python3 scripts/validate_items.py

form:
	python3 scripts/build_form.py

templates:
	python3 scripts/build_templates.py

slides:
	python3 scripts/build_slides.py

test:
	python3 -m pytest -q
