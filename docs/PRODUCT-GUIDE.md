# Display Champ & Bright Ivy Product Guide

A comprehensive guide to our products, SKU logic, and how everything is constructed.

---

## Our Brands

| Brand | Target Market | What We Sell |
|-------|---------------|--------------|
| **Display Champ (DC)** | Sports memorabilia collectors | Display cases for sports items - golf balls, baseballs, cricket balls, etc. |
| **Bright Ivy (BI)** | Keepsake & memory preservation | Display cases for special memories - rings, coins, tokens, etc. |

**Key Point:** Both brands share the same physical components (cases, bases, accessories). The difference is marketing and which accessories are included.

---

## Product Structure

Every display case product is built from these core components:

```
┌─────────────────────────────────┐
│           CASE (Dome)           │  ← Acrylic dome/cover
├─────────────────────────────────┤
│     INTERNAL ACCESSORY          │  ← Tee, Ring Stand, Coin Stand, etc.
├─────────────────────────────────┤
│            BASE                 │  ← Wood or Acrylic base
│      (+ Sticky Bottoms)         │  ← Silicone feet (acrylic bases only)
└─────────────────────────────────┘
```

---

## Case Sizes

We have three case sizes that pair with matching base sizes:

| Size | Case Code | Base Code | Dimensions (W × D × H) | Used For |
|------|-----------|-----------|------------------------|----------|
| **Small** | C1 | B1 | 89mm × 89mm × 64mm | Golf balls (standard) |
| **Medium** | C2 | B2 | 120mm × 118mm × 64mm | Golf (custom/course designs) |
| **Large** | C3 | B3 | 130mm × 113mm × 95mm | Tennis, Cricket, Baseball, Hockey |

**Important:** Case and base sizes MUST match. C1 goes with B1, C2 with B2, C3 with B3.

---

## Base Styles

### Acrylic Bases (10mm high)

Made from two layers of 5mm black acrylic glued together.

| Style | Description | Grass Inlay? |
|-------|-------------|--------------|
| **Icon** | High-gloss black acrylic | No |
| **Vantage** | Black acrylic with turf/grass | Yes |

### Wood Bases (12-13mm high)

Made from solid hardwood by our local carpenter.

| Style | Description | Grass Inlay? | Wood Options |
|-------|-------------|--------------|--------------|
| **Heritage** | Classic solid wood | No | Oak, Sapele Mahogany |
| **Prestige** | Solid wood with grass | Yes | Oak, Sapele Mahogany |

### Wood Types

| Wood | SKU Code | Appearance |
|------|----------|------------|
| Oak | `OAK` | Light wood |
| Sapele Mahogany | `MAH` or `AHW` | Dark wood |
| Black Walnut | `WALNUT` | Dark (future option) |

---

## Internal Accessories

What goes inside the case depends on what's being displayed:

### Golf Ball Cases (Display Champ)

| Accessory | Description |
|-----------|-------------|
| **Black Tee** | Golf tee that ball sits on. Requires hole drilled in base. Secured with glue dot when we supply the ball. |

### Ring & Coin Cases (Bright Ivy)

| Accessory | Description |
|-----------|-------------|
| **Ring Stand** | Cylindrical tube with clip. Bought-in. |
| **Coin Stand Small** | Small display stand for coins |
| **Coin Stand Large** | Large display stand for coins/pucks |
| **Circular Acrylic Ring** | Acrylic ring for MSP products |

### Ball Cases (Other Sports)

| Sport | Accessory |
|-------|-----------|
| Tennis, Cricket, Baseball, Field Hockey | **Stem** - Made in-house from 3mm acrylic sheet + 6mm acrylic rod |
| Ice Hockey | **Large Coin Stand** - Holds the puck |

---

## SKU Logic

### Display Champ SKU Pattern

```
[XL?][SPORT][STYLE][WOOD?][UV?][DESIGN?][P?][-BALL?]
```

**Examples:**
| SKU | Breakdown |
|-----|-----------|
| `GBCICON` | Golf Ball Case + Icon style |
| `GBCVANTAGE` | Golf Ball Case + Vantage style |
| `GBCPRESTIGEOAK` | Golf Ball Case + Prestige + Oak |
| `GBCHERITAGEMAH` | Golf Ball Case + Heritage + Mahogany |
| `GBCVANTAGEUVPAR` | Golf Ball Case + Vantage + UV Par print |
| `GBCVANTAGEUVPARP` | ...+ Engraved |
| `GBCVANTAGEUVPARP-BALL` | ...+ Golf ball included |
| `XLGBCVANTAGE-STANDREWSOLD` | XL (B2 size) + St Andrews design |

**Prefixes (XL):**
- `XL` = B2/C2 size (legacy naming, still used for course designs)

**Sport Codes:**
| Code | Product |
|------|---------|
| `GBC` | Golf Ball Case |
| `GBDS` | Golf Ball Display Stand |
| `GBMS` | Golf Ball Marker Stand |
| `GBPS` | Golf Pencil Stand |
| `TBDC` | Tennis Ball Display Case |
| `CBDC` | Cricket Ball Display Case |
| `BBDC` | Baseball Display Case |
| `FHBC` | Field Hockey Ball Case |
| `IH` | Ice Hockey Puck Case |
| `NFL` | American Football Case |
| `FDS` | Football (Soccer) Display Stand |

**Modifiers:**
| Suffix | Meaning | BOM Impact |
|--------|---------|------------|
| `P` | Engraved | Same components (service) |
| `-BALL` | Includes Titleist TruFeel golf ball | +1 golf ball, +1 glue dot |
| `CUSTOMBG` | Custom UV background | Same components (service) |

**UV Print Designs:**
- Score designs: `PAR`, `BIRDIE`, `EAGLE`, `ALBATROSS`, `HIO` (Hole in One)
- Other: `LEG` (Legendary), `CHAMP` (Champion), `GC` (Golf Course)
- Course names: `STANDREWSOLD`, `PEBBLEBEACHLINKS`, `AUGUSTA`, `PORTRUSH`, etc.

---

### Bright Ivy SKU Pattern

```
[BASE]-[STYLE]-[WOOD?]-[ACCESSORY?]-[CASE]-[CUS?]
```

**Examples:**
| SKU | Breakdown |
|-----|-----------|
| `B1-ICON-C1` | B1 Icon base + C1 case (empty) |
| `B1-HERI-OAK-C1` | B1 Heritage Oak + C1 case (empty) |
| `B1-HERI-OAK-RS-C1` | ...+ 1 Ring Stand |
| `B2-HERI-AHW-RS2-C2` | B2 Heritage Mahogany + 2 Ring Stands + C2 case |
| `B3-ICON-RS3-C3-CUS` | B3 Icon + 3 Ring Stands + C3 case + Custom print |
| `B2-ICON-CS-C2` | B2 Icon + Coin Stand set + C2 case |
| `B2-ICON-MSP-C2` | B2 Icon + Multi Stand Pack + C2 case |
| `B2-ICON-CS-BTC-C2-BTC` | Bitcoin case (Etsy only) |

**Style Codes:**
| Code | Style |
|------|-------|
| `ICON` | Icon (black acrylic) |
| `HERI` | Heritage (solid wood) |

**Wood Codes:**
| Code | Wood |
|------|------|
| `OAK` | Oak |
| `AHW` | African Hardwood (Sapele Mahogany) |

**Accessory Codes:**
| Code | What's Included | Components |
|------|-----------------|------------|
| (none) | Empty case | - |
| `RS` | Ring Stand | 1× Ring Stand |
| `RS2` | 2 Ring Stands | 2× Ring Stand |
| `RS3` | 3 Ring Stands | 3× Ring Stand |
| `CS` | Coin Stand Set | 1× Small + 1× Large coin stand |
| `MSP` | Multi Stand Pack | 1× Small + 1× Large coin stand + 1× Acrylic Ring |
| `CS-BTC` | Bitcoin Stand | Coin stand + Bitcoin token |

**Ring Stand Capacity:**
- B1/C1 = 1 ring stand max
- B2/C2 = 2 ring stands max
- B3/C3 = 3 ring stands max

**Note:** Bright Ivy does NOT currently offer Vantage or Prestige (grass inlay) styles.

---

## Product Size by Sport

| Product Type | Case/Base Size |
|--------------|----------------|
| Golf (standard Icon, Vantage, Heritage, Prestige) | C1/B1 |
| Golf (custom background - CUSTOMBG) | C2/B2 |
| Golf (course designs - St Andrews, etc.) | C2/B2 |
| Tennis | C3/B3 |
| Cricket | C3/B3 |
| Baseball | C3/B3 |
| Field Hockey | C3/B3 |
| Ice Hockey | C3/B3 |
| Bright Ivy (all) | As per SKU (B1/B2/B3) |

---

## Special Products

### Golf Ball Marker Stand (GBMS)
- 5mm acrylic base
- 16 round magnets
- 2 black metal standoffs
- Packaged in large A4 white envelope

### Golf Pencil Stand (GBPS)
- Entirely acrylic
- 2 square magnets

### 5× Golf Ball Display Stand (GBDSVANTAGEx5)
- Acrylic base
- Grass inlay
- 5× black tees

### Bitcoin Case (BI - Etsy only)
- B2-ICON-CS-BTC-C2-BTC
- Includes bitcoin token (shipped in small envelope)

### Tennis Ball Case with Ball
- Ball optional on customer request
- Tennis balls are custom printed

---

## Manufacturing

### Sourcing

We source products two ways:

1. **Bought-in ready-made** - From overseas suppliers (China)
2. **Made in-house** - For custom orders or when overseas stock is low

### In-House Production

**Wood Bases:**
- Buy planed oak or mahogany planks
- Local carpenter manufactures into complete bases

**Acrylic Products:**
- Buy acrylic sheets (3mm clear, 5mm clear, 5mm black)
- Cut and assemble in-house
- Can make: bases, stands, cases - anything for custom sizing

**Stems (for ball cases):**
- Made from 3mm clear acrylic sheet + 6mm acrylic rod
- All stems are the same size regardless of sport
- 1 stem per case

### Grass (Turf Inlay)

| Size | How We Source |
|------|---------------|
| B1 | Pre-cut, bought in bulk |
| B2/B3 | Cut in-house from grass sheets |

---

## Packaging

### Product Boxes (from China)

Presentation boxes the product ships in:

| Code | Size | Used For |
|------|------|----------|
| P1 | Small | C1 cases |
| P2 | Medium | C2 cases |
| P3 | Large | C3 cases |

### Shipping Boxes (from Kite UK)

| Size | Used For |
|------|----------|
| Small | C1 products |
| Medium | C2 products |
| Large | C3 products |

### Other Packaging

| Item | Used For |
|------|----------|
| Large A4 White Envelopes | Marker stands (GBMS) |
| Small Brown Square Boxes | Golf ball display stands, BI stands |
| White Mid-Size Envelopes | Cricket, Football, NFL stands |
| Small Envelopes | Bitcoin tokens, marker stand standoffs |

---

## Postcards

**1 postcard per item** (not per order)

### Display Champ

Choose the design that best fits the order:

| Design | When to Use |
|--------|-------------|
| **Hole in One** | Most common - for hole in one celebrations |
| **Legendary** | For legendary achievements |
| **Champion** | For championship/winner orders |
| **Podium** | For podium/placing achievements |

### Bright Ivy

| Design | Purpose |
|--------|---------|
| **Thank You** | General thank you, review request, includes 20% discount code |

---

## Assembly Notes

### Sticky Bottoms (Silicone Feet)
- Applied to **acrylic bases only** (Icon, Vantage)
- NOT on wood bases (Heritage, Prestige)

### Glue Dots
- Used to secure golf balls to tees
- **Only for -BALL orders** (when we supply the ball)
- Not included in standard orders

### Engraving (P suffix)
- Done in-house on the case
- Most DC customers want engraving
- Same physical components as non-engraved

### Custom Print (CUS / CUSTOMBG)
- Customer uploads image
- We UV print on case
- Same physical components

---

## Quick Reference: What Goes in Each Product

### Standard Golf Ball Case (GBCICON, GBCVANTAGE, etc.)
- 1× C1 Case
- 1× B1 Base (style as per SKU)
- 1× Black Tee
- 1× Sticky Bottom (acrylic bases only)
- 1× P1 Product Box
- 1× DC Postcard

### Golf Ball Case with Ball (GBCICON-BALL, etc.)
- All of above, plus:
- 1× Titleist TruFeel Golf Ball
- 1× Glue Dot

### Golf Course Design (XLGBCVANTAGE-STANDREWSOLD, etc.)
- 1× C2 Case
- 1× B2 Vantage Base
- 1× Black Tee
- 1× Sticky Bottom
- 1× P2 Product Box
- 1× DC Postcard

### Bright Ivy Ring Case (B1-HERI-OAK-RS-C1)
- 1× C1 Case
- 1× B1 Heritage Oak Base
- 1× Ring Stand
- 1× P1 Product Box
- 1× BI Postcard

### Bright Ivy Coin Stand Set (B2-ICON-CS-C2)
- 1× C2 Case
- 1× B2 Icon Base
- 1× Coin Stand Small
- 1× Coin Stand Large
- 1× Sticky Bottom
- 1× P2 Product Box
- 1× BI Postcard

### Cricket/Tennis/Baseball Case (CBDCVANTAGE, TBDCVANTAGE, BBDCVANTAGE)
- 1× C3 Case
- 1× B3 Base (style as per SKU)
- 1× Stem (6mm acrylic rod)
- 1× Sticky Bottom (acrylic bases only)
- 1× P3 Product Box
- 1× DC Postcard

---

## Historic SKU Notes

Some legacy SKUs use old naming conventions:

| Old Convention | Current Standard |
|----------------|------------------|
| `XL` prefix | B2/C2 size |
| `HERITAGE` (no wood) | Heritage Mahogany |
| `GBDC` | C1 Case (superseded by C1/C2/C3) |

---

*Last updated: January 2026*
