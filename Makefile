.PHONY: all validate test

all: validate

validate:
	python3 scripts/validate_items.py

test:
	python3 -m pytest -q
