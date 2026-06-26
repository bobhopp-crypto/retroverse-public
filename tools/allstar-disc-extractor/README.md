# Cadaco All-Star Baseball Disc Extractor

Batch-processes disc scans into wedge degree totals and probabilities.

## Requirements

- Python 3.10+
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) installed (`brew install tesseract` on macOS)

## Setup

```bash
cd tools/allstar-disc-extractor
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
python disc_extractor.py \
  --scans "/Users/bobhopp/Documents/All Star Baseball/Scans" \
  --output output
```

## Outputs

- `output/allstar_players.csv` — degrees per result (columns `1`–`14`)
- `output/allstar_players_probabilities.csv` — normalized probabilities (degrees / 360)
- `output/review/*.jpg` — annotated review images (center, dividers, labels, angles)

CSV columns:

`player,position,1,2,3,4,5,6,7,8,9,10,11,12,13,14`

## Notes

- JPG scans are preferred; duplicate PNG copies are skipped automatically.
- Review images are intended for spot-checking OCR/divider accuracy.
- Divider angles are detected in polar space at 0.1° resolution and locally refined.
