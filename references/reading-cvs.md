# Reading CVs

## .docx files

Two reliable approaches:

**Quick text extraction (preferred for analysis):**
```python
import xml.etree.ElementTree as ET
import zipfile

with zipfile.ZipFile("cv.docx") as z:
    with z.open("word/document.xml") as f:
        tree = ET.parse(f)
ns = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
text = " ".join(t.text or "" for t in tree.iter(ns + "t"))
print(text)
```

Or, if `pandoc` is available:
```bash
pandoc -t plain cv.docx
```

## .pdf files

Use the environment's PDF text extraction. If the CV is a scanned image, OCR it first. Prefer text extraction over rasterization for speed.

## .md / .txt / already-in-context

If the content is already visible as text in the conversation, use it directly. Do not re-read from disk.

## What to extract

Pull out a clean, factual structured summary:

- **Years of experience** and **seniority level**
- **Core skills / tech stack** (be specific: name the tools, platforms, languages)
- **Domains / industries** worked in
- **Languages spoken** and proficiency
- **Location** (and whether they want remote)
- **Stated preferences**: salary expectations, industries to avoid, role types wanted

Do not embellish. If the CV doesn't state something (e.g., salary target), leave it blank and ask the user rather than guessing.
