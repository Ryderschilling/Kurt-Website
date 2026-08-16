#!/usr/bin/env python3
"""
Rebuild the Dime Lab product rail on dime-lab.html from the live Shopify catalogue.

No API key, no CMS, no account. It reads the PUBLIC /products.json that every
Shopify storefront serves, downloads each product's first image locally, and
rewrites the markup between the PRODUCTS:START / PRODUCTS:END markers.

Run it whenever Kurt changes the lineup or prices:
    python3 tools/refresh-products.py

Why static and not a live fetch: thedimelab.com/products.json sends no
Access-Control-Allow-Origin header, so the browser blocks a cross-origin fetch.
Baking it in also means the page still works if the store is ever down.
"""
import json, re, sys, urllib.request, pathlib, html, io
from PIL import Image

STORE = "https://thedimelab.com"
ROOT  = pathlib.Path(__file__).resolve().parent.parent
IMGD  = ROOT / "img" / "shop"
PAGE  = ROOT / "dime-lab.html"
IMG_W = 700

# footballs lead, then gear, then print, then hats
ORDER = ["water-football","the-league-ball","official-football","phantom-football",
         "the-cape-ball","the-tangerine-dream","pink-football","junior-football",
         "the-weighted-football","flag-football-league-set","training-bundle",
         "football-towel","football-playbook","think-like-a-quarterback-hardcover",
         "the-football-mba-digital-book","khaki-classic-hat","brown-classic-hat",
         "monochrome-black-hat"]

def get(url, binary=False):
    req = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0 kurtbenkert.com asset build"})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read() if binary else json.loads(r.read())

def money(v):
    f = float(v)
    return f"${f:,.0f}" if f == int(f) else f"${f:,.2f}"

def main():
    data = get(f"{STORE}/products.json?limit=250")
    prods = {p["handle"]: p for p in data["products"]}
    print(f"{len(prods)} products live")

    handles = [h for h in ORDER if h in prods] + [h for h in prods if h not in ORDER]
    IMGD.mkdir(parents=True, exist_ok=True)
    cards = []

    for h in handles:
        p = prods[h]
        if not p.get("images"):
            print("  skip (no image):", h); continue
        variants = p["variants"]
        low   = min(float(v["price"]) for v in variants)
        multi = len({v["price"] for v in variants}) > 1
        sold_out = not any(v["available"] for v in variants)

        # Shopify CDN urls already carry a ?v= cache buster, so append the width
        raw = p["images"][0]["src"]
        src = raw + ("&" if "?" in raw else "?") + f"width={IMG_W}"
        out = IMGD / f"{h}.jpg"
        if not out.exists():
            im = Image.open(io.BytesIO(get(src, binary=True))).convert("RGB")
            im.thumbnail((IMG_W, IMG_W), Image.LANCZOS)
            im.save(out, "JPEG", quality=82, optimize=True, progressive=True)
            print(f"  saved {out.name} {im.size} ({out.stat().st_size//1024}KB)")
        iw, ih = Image.open(out).size

        title = html.escape(p["title"].strip())
        price = ("From " if multi else "") + money(low)
        cards.append(
            f'      <a class="pcard" href="{STORE}/products/{h}" target="_blank" rel="noopener">\n'
            f'        <span class="pcard__ph"><img src="img/shop/{h}.jpg" width="{iw}" height="{ih}" '
            f'alt="{title}, from The Dime Lab." loading="lazy" decoding="async"></span>\n'
            f'        <span class="pcard__t">{title}</span>\n'
            f'        <span class="pcard__p">{"Sold out" if sold_out else price}</span>\n'
            f'      </a>')

    block = "\n".join(cards)
    page = PAGE.read_text()
    new, n = re.subn(r"(<!-- PRODUCTS:START -->)(.*?)([ \t]*<!-- PRODUCTS:END -->)",
                     lambda m: m.group(1) + "\n" + block + "\n" + m.group(3), page, flags=re.S)
    if n != 1:
        sys.exit("markers PRODUCTS:START / PRODUCTS:END not found in dime-lab.html")
    PAGE.write_text(new)
    print(f"wrote {len(cards)} cards into {PAGE.name}")

if __name__ == "__main__":
    main()
