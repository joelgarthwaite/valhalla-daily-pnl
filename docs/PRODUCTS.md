# Product & Component Structure

This document captures the business knowledge about Display Champ and Bright Ivy products to ensure consistent inventory management and BOM (Bill of Materials) configuration.

---

## Brands Overview

| Brand | Code | Target Market | Products |
|-------|------|---------------|----------|
| **Display Champ** | DC | Sports memorabilia collectors | Display cases for sports items (balls, medals, jerseys, etc.) |
| **Bright Ivy** | BI | Special memories & keepsakes | Display cases for sentimental items (baby items, wedding mementos, etc.) |

**Note:** Both brands share the same physical component parts - they are marketed to different audiences but use common inventory.

---

## Product Categories

### 1. Display Cases (Main Product Line)

Display cases are the biggest product line. Every case consists of **two components**:
- **Case** (acrylic dome/cover) - designated with `C` prefix
- **Base** - designated with `B` prefix

Cases and bases are paired by size number to complete a unit.

### 2. Display Stands

Standalone display stands (no case cover). Used to elevate/display items without encasing them.

---

## Case Sizes

| Code | Size | Dimensions (W × D × H) | Notes |
|------|------|------------------------|-------|
| **C1** | Small | 89mm × 89mm × 64mm | Smallest case |
| **C2** | Medium | 120mm × 118mm × 64mm | Mid-size case |
| **C3** | Large | 130mm × 113mm × 95mm | Largest case |

*More sizes will be added in the future.*

### Case Size by Product Type

| Product | Case/Base Size | Notes |
|---------|----------------|-------|
| **Golf (standard)** | C1/B1 | Most golf ball cases |
| **Golf (custom background)** | C2/B2 | CUSTOMBG products |
| **Golf (course designs)** | C2/B2 | St Andrews, Pebble Beach, etc. |
| **Tennis** | C3/B3 | Largest size |
| **Cricket** | C3/B3 | Largest size |
| **Baseball** | C3/B3 | Largest size |
| **Field Hockey** | C3/B3 | Largest size |
| **Ice Hockey** | C3/B3 | Largest size |

---

## Base Types

Bases are coded with `B` followed by size number (B1, B2, B3) paired with case sizes (C1, C2, C3).

**IMPORTANT:** Case and base sizes MUST match. You cannot mix sizes.
- C1 + B1 = Valid
- C2 + B2 = Valid
- C3 + B3 = Valid
- C1 + B2 = **Invalid**

### Base Dimensions

#### Wood Bases (Heritage, Prestige)

| Code | Dimensions (W × H × L) | Notes |
|------|------------------------|-------|
| **B1** | 71mm × 12mm × 96mm | Small wood base |
| **B2** | 71mm × 12mm × 126mm | Medium wood base (historically called "XL") |
| **B3** | 105mm × 13mm × 140mm | Large wood base |

#### Acrylic Bases (Icon, Vantage)

| Code | Dimensions (W × H × L) | Notes |
|------|------------------------|-------|
| **B1** | 71mm × 10mm × 96mm | 2 × 5mm acrylic layers glued |
| **B2** | 71mm × 10mm × 126mm | 2 × 5mm acrylic layers glued |
| **B3** | 105mm × 10mm × 140mm | 2 × 5mm acrylic layers glued |

**Note:** Acrylic bases are 10mm high (vs 12-13mm for wood) because they're made from two 5mm acrylic layers.

### Historical SKU Note

**B2 was previously called "XL"** - some legacy SKUs still use "XL" in the name. These should be mapped to the current B2 naming convention.

### Base Styles

| Style | Material | Description | Wood Options |
|-------|----------|-------------|--------------|
| **Icon** | Black Acrylic | Sleek modern look | N/A |
| **Vantage** | Black Acrylic | Black acrylic with turf/grass inlay | N/A |
| **Heritage** | Solid Wood | Classic solid wood | Oak, Sapele Mahogany |
| **Prestige** | Solid Wood | Solid wood with grass inlay | Oak, Sapele Mahogany |

### Wood Options (for Heritage & Prestige)

| Wood | Code | Notes |
|------|------|-------|
| Oak | OAK | Light wood - always has OAK in SKU |
| Sapele Mahogany | MAH, SAPELE, or AHW | Dark wood - always has MAH in SKU |
| Black Walnut | WALNUT | **Future option** - not currently stocked |

**Historic SKUs:** If a Heritage/Prestige SKU has NO wood code (e.g., `GBCHERITAGE` instead of `GBCHERITAGEMAH`), it's a legacy SKU that used Mahogany (AHW) by default.

---

## Internal Accessories

Items placed inside cases depending on what's being displayed:

### Golf Ball Cases

| Accessory | Description |
|-----------|-------------|
| **Tee** | Black golf tee for ball to sit on; **requires hole drilled in base** |

**Note:** Golf is the ONLY sport that uses a tee. All tees are black and identical.

### Bright Ivy / Keepsake Cases

| Code | Accessory | Description |
|------|-----------|-------------|
| **RS** | Ring Stand | Cylindrical tube with clip (bought-in) |
| **CS-S** | Coin Stand Small | Small coin holder |
| **CS-L** | Coin Stand Large | Large coin holder (also used for Ice Hockey pucks) |
| **Circular Acrylic Ring** | Display ring | Bought-in acrylic ring for MSP products (NOT a ring stand) |

### Ball Stems (Cricket, Tennis, Baseball, Field Hockey)

These sports use **stems** instead of tees. Stems are made in-house.

| Sport | Uses Stem |
|-------|-----------|
| Cricket | Yes |
| Tennis | Yes |
| Baseball | Yes |
| Field Hockey | Yes |

**Stem Construction:**
- Made from 3mm clear acrylic sheet + 6mm cylindrical acrylic rods
- **All stems are the same size** regardless of sport
- **1 stem per case**
- **For BOM tracking:** 1× 6mm Acrylic Rod per stem
- 3mm acrylic sheets are always kept in stock (not tracked per-unit)

### Ice Hockey

Ice hockey puck cases use the **Large Coin Stand** (CS-L) to hold the puck.

---

## UV Printing Options

Cases can have UV printing applied. Two types:

### In-House Designs (Pre-designed)

| Category | Designs |
|----------|---------|
| **Golf Scores** | Par, Eagle, Birdie, Albatross, Hole in One |
| **General** | Champion, Legendary, Golf Course |
| **Golf Courses** | St Andrews, Troon, Pebble Beach, etc. |

### Custom Prints

| Code | Description |
|------|-------------|
| **CUS** | Customer uploads image, we print it on case |

---

## Sport Codes (SKU Prefixes)

### Golf Products

| Code | Product Type | Internal Holder | Notes |
|------|--------------|-----------------|-------|
| **GBC** | Golf Ball Case | Tee (black) | Main product (C1/B1) |
| **GBDS** | Golf Ball Display Stand | Tee | Stand only, no case |
| **GBDSx5** | 5× Golf Ball Display Stand | 5× Tee | Vantage style with grass inlay |
| **GBDC** | Clear Golf Ball Display Case | - | **Legacy SKU** - C1 size, superseded by C1/C2/C3 naming |
| **GBDCB** | Golf Ball Display Case Base | - | Component SKU (internal) |
| **GBMS** | Golf Ball Marker Stand | - | 4×4 magnetic display |
| **GBPS** | Golf Pencil Stand | - | Pencil display |
| **LEGBDC** | Limited Edition Golf Ball Display Case | Tee | Special editions (e.g., TP5/TP5X Pirate - uses B2-PIRTP5/B2-PIRTP5X base) |

### Golf Accessory Product Components

| Product | Components |
|---------|------------|
| **GBMS** (Marker Stand) | 5mm acrylic + 16 round magnets + 2 black metal standoffs |
| **GBPS** (Pencil Stand) | Acrylic + 2 square magnets |
| **GBDSVANTAGEx5** | Acrylic base + grass inlay + 5× black tees |

### Other Sports

| Code | Sport | Product Type | Internal Holder |
|------|-------|--------------|-----------------|
| **TBDC** | Tennis | Tennis Ball Display Case | Stem (acrylic) |
| **CBDC** | Cricket | Cricket Ball Display Case | Stem (acrylic) |
| **BBDC** | Baseball | Baseball Display Case | Stem (acrylic) |
| **FHBC** | Field Hockey | Field Hockey Ball Case | Stem (acrylic) |
| **IH** | Ice Hockey | Ice Hockey Puck Case | Large Coin Stand |
| **NFL** | American Football | American Football Case | - |
| **FDS** | Football (Soccer) | Football Display Stand | - |

**Sports NOT offered:** Rugby, Basketball, Medals

### Special Products

| Product | Brand | SKU Example | Notes |
|---------|-------|-------------|-------|
| **Tennis Ball Case with Ball** | DC | TBDC...-BALL | Ball optional on request, custom printed |
| **Bitcoin Case** | BI | B2-ICON-CS-BTC-C2-BTC | Etsy only, includes bitcoin token (shipped in envelope) |

### Limited Edition Products

LE products have custom-printed bases that are unique to each edition and ball type. The ball type (TP5/TP5X) is part of the base code because they have different colored prints.

| Edition | Ball Type | Base Code | Full SKU | Notes |
|---------|-----------|-----------|----------|-------|
| Pirate | TP5 | `B2-PIRTP5` | `B2-PIRTP5-GT-C2` | Pirate-themed base, TP5 colorway |
| Pirate | TP5X | `B2-PIRTP5X` | `B2-PIRTP5X-GT-C2` | Pirate-themed base, TP5X colorway |

**With suffixes:**
| Variant | TP5 SKU | TP5X SKU |
|---------|---------|----------|
| Base | `B2-PIRTP5-GT-C2` | `B2-PIRTP5X-GT-C2` |
| Personalized | `B2-PIRTP5-GT-C2-P` | `B2-PIRTP5X-GT-C2-P` |
| With Ball | `B2-PIRTP5-GT-C2-BALL` | `B2-PIRTP5X-GT-C2-BALL` |
| Personalized + Ball | `B2-PIRTP5-GT-C2-P-BALL` | `B2-PIRTP5X-GT-C2-P-BALL` |

**Future LE products** follow the same pattern: `B2-[EDITION][BALL]-GT-C2`

---

## SKU Structure

### Standardized Format (Current)

Both DC and BI now use the same structured format:

```
[BASE]-[STYLE]-[WOOD?]-[ACCESSORY]-[CASE]-[DESIGN?][-P][-BALL]
```

### Display Champ Standardized Examples

| Standardized SKU | Meaning |
|------------------|---------|
| `B1-VANT-GT-C1` | Small Vantage + Golf Tee + Small Case |
| `B1-ICON-GT-C1-HIO` | Small Icon + Golf Tee + HIO print |
| `B1-PRES-OAK-GT-C1-HIO-P` | Small Prestige Oak + Golf Tee + HIO + Personalized |
| `B2-VANT-GT-C2-TURNBAILSA` | Medium Vantage + Turnberry Ailsa course |
| `B2-VANT-GT-C2-CUS` | Medium Vantage + Custom print |
| `B3-VANT-BS-C3` | Large Vantage + Ball Stem (Baseball/Tennis/Cricket) |
| `B1-VANT-GT-DS` | Vantage Display Stand |
| `B1-VANT-GT5-DS` | Vantage 5-ball Display Stand |

### Display Champ Legacy Pattern (Being Phased Out)

```
[XL?][SPORT][STYLE][WOOD?][UV?][DESIGN?][P?][-BALL?]

Examples:
GBCPRESTIGEOAK              = Golf Ball Case + Prestige + Oak
GBCVANTAGE                  = Golf Ball Case + Vantage (acrylic)
GBCVANTAGEUVPAR             = Golf Ball Case + Vantage + UV Par print
GBCVANTAGEUVPARP            = Golf Ball Case + Vantage + UV Par + Engraved
GBCVANTAGEUVPARP-BALL       = Golf Ball Case + Vantage + UV Par + Engraved + Golf Ball
XLGBCVANTAGE-STANDREWSOLD   = XL (B2) Golf Ball Case + Vantage + St Andrews print
XLGBCVANTAGECUSTOMBG        = XL Golf Ball Case + Vantage + Custom Background
```

**XL Prefix:** Legacy naming for B2 size. Some SKUs still use XL prefix instead of the newer naming convention.

### Display Champ Accessory Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `GT` | Golf Tee | Single black golf tee (requires drilled hole) |
| `GT5` | 5× Golf Tees | Five tees for multi-ball display stands |
| `BS` | Ball Stem | Acrylic stem for non-golf sports |

### UV Print Design Codes (Display Champ)

| Code | Design | Notes |
|------|--------|-------|
| `PAR` | Par | In-house design |
| `BIRDIE` | Birdie | In-house design |
| `EAGLE` | Eagle | In-house design |
| `ALBATROSS` | Albatross | In-house design |
| `HIO` | Hole in One | In-house design |
| `LEG` | Legendary | In-house design |
| `CHAMP` | Champion | In-house design |
| `GC` | Golf Course | In-house design |
| `CUSTOMBG` | Custom Background | Customer uploads image |
| `STADIUM` | Stadium | Baseball stadium design |
| `HOMERUN` | Home Run | Baseball design |

### Golf Course Prints (DC Only)

**Legacy codes** (in existing SKUs):
| Code | Course |
|------|--------|
| `STANDREWSOLD` | St Andrews Old Course |
| `PEBBLEBEACHLINKS` | Pebble Beach Golf Links |
| `ROYALTROONOLD` | Royal Troon Old Course |
| `TURNBERRYAILSA` | Turnberry Ailsa |
| `WHISTLINGSTRAITS` | Whistling Straits |
| `WENTWORTH` | Wentworth West |
| `AUGUSTA` | Augusta |
| `PORTRUSH` | Royal Portrush |
| `PINEHURSTNO2` | Pinehurst No.2 |
| `BETHPAGE` | Bethpage Black |
| `BALLYBUNIONOLD` | Ballybunion Old |
| `USARYDER25` | Team USA Ryder Cup 2025 |
| `EURYDER25` | Team Europe Ryder Cup 2025 |
| `USAEURYDER25` | USA vs Europe Ryder Cup 2025 |

**Standardized codes** (shortened for new SKUs):
| Code | Course |
|------|--------|
| `STANDREWS` | St Andrews Old Course |
| `PEBBLE` | Pebble Beach Golf Links |
| `RTROON` | Royal Troon Old Course |
| `TURNBAILSA` | Turnberry Ailsa |
| `WENTWORTH` | Wentworth West |
| `AUGUSTA` | Augusta |
| `PORTRUSH` | Royal Portrush |
| `PINEHURST2` | Pinehurst No.2 |
| `BETHPAGE` | Bethpage Black |
| `BALLYB` | Ballybunion Old |
| `USARYDER25` | Team USA Ryder Cup 2025 |
| `EURYDER25` | Team Europe Ryder Cup 2025 |
| `USAEURYDER25` | USA vs Europe Ryder Cup 2025 |

### Bright Ivy Pattern

```
[BASE]-[STYLE]-[WOOD?]-[ACCESSORY?]-[CASE]-[CUS?]

Examples:
B1-ICON-C1              = B1 Icon Base + C1 Case (empty)
B1-HERI-OAK-C1          = B1 Heritage Oak + C1 Case (empty)
B1-HERI-OAK-RS-C1       = B1 Heritage Oak + 1 Ring Stand + C1 Case
B2-HERI-AHW-RS2-C2      = B2 Heritage AHW + 2 Ring Stands + C2 Case
B3-ICON-RS3-C3-CUS      = B3 Icon + 3 Ring Stands + C3 Case + Custom Print
B2-ICON-MSP-C2          = B2 Icon + MSP(?) + C2 Case
B1-ICON-CS-C1           = B1 Icon + Coin Stand + C1 Case
```

### Bright Ivy Style Codes

| Code | Style | Notes |
|------|-------|-------|
| `ICON` | Icon | Black acrylic base |
| `HERI` | Heritage | Solid wood base |

**Note:** Bright Ivy does NOT currently offer Vantage or Prestige (grass inlay) styles - only Icon and Heritage.

### Bright Ivy Wood Codes

| Code | Wood | Notes |
|------|------|-------|
| `OAK` | Oak | Light wood |
| `AHW` | African Hardwood | Sapele Mahogany (same as MAH in DC SKUs) |

### Bright Ivy Accessory Codes

| Code | Accessory | Contents |
|------|-----------|----------|
| (none) | Empty case | Customer puts anything they like inside |
| `RS` | Ring Stand | 1× Ring Stand (only fits B1/C1) |
| `RS2` | 2 Ring Stands | 2× Ring Stand (only fits B2/C2) |
| `RS3` | 3 Ring Stands | 3× Ring Stand (only fits B3/C3) |
| `CS` | Coin Stand | 1× Coin Stand Small + 1× Coin Stand Large |
| `MSP` | Multi Stand Pack | 1× Coin Stand Small + 1× Coin Stand Large + 1× Circular Acrylic Ring |
| `CS-BTC` | Bitcoin Coin Stand | Coin stand sized for bitcoin + Bitcoin Token |

**Ring Stands:** Bought-in cylindrical tubes with a clip on top to hold a ring. Size of case determines how many fit:
- B1/C1 = 1 ring stand max
- B2/C2 = 2 ring stands max
- B3/C3 = 3 ring stands max

**CS vs MSP:**
- `CS` (Coin Stand) = 1× Small + 1× Large coin stand
- `MSP` (Multi Stand Pack) = 1× Small + 1× Large coin stand + 1× Circular Acrylic Ring

The circular acrylic ring in MSP is different from ring stands - it's for displaying items other than rings.

### SKU Modifiers

| Suffix | Meaning | BOM Impact | Notes |
|--------|---------|------------|-------|
| **P** | Engraved | Same components | Engraving done in-house on the case. DC SKUs only (Shopify setup reason). Most customers want engraving. |
| **-BALL** | Includes golf ball | Different BOM | Adds 1× Titleist TruFeel golf ball. DC only. |
| **-CUS** | Custom UV Print | Same components | Customer uploads image, we UV print on case. BI SKUs only. |

### SKU Rules

1. **P Suffix = Same BOM**: Uses identical components, engraving is a service done in-house
2. **-CUS Suffix = Same BOM**: Uses identical components, UV printing is a service
3. **-BALL Suffix = Different BOM**: Includes additional golf ball component
4. **Numeric Differences = Different Products**: RS vs RS2 vs RS3 need different case sizes

---

## Component Categories

For the database (`component_categories` table):

| Category | Description | Examples |
|----------|-------------|----------|
| **cases** | Acrylic cases/domes | C1 Case, C2 Case, C3 Case |
| **bases** | All base types | B1 Icon, B2 Prestige Oak, B3 Heritage Mahogany |
| **accessories** | Internal display accessories | Tee, Ring Stand, Coin Stand Small, Coin Stand Large, 6mm Acrylic Rod |
| **packaging** | Product & shipping packaging | Product boxes, shipping boxes, foam inserts |
| **marketing** | Inserts and printed materials | Postcards, thank you cards |

---

## Packaging Components

### Product Boxes (from China supplier)

Nicely designed presentation boxes that the product ships in.

| Code | Size | Used For |
|------|------|----------|
| **P1** | Small | C1 cases |
| **P2** | Medium | C2 cases |
| **P3** | Large | C3 cases |

### Shipping Boxes (from Kite UK)

Outer shipping boxes for protection during transit.

| Code | Size | Used For |
|------|------|----------|
| **Ship-S** | Small | C1 products |
| **Ship-M** | Medium | C2 products |
| **Ship-L** | Large | C3 products |

### Other Packaging

| Item | Used For |
|------|----------|
| **Large A4 White Envelopes** | Marker stands (GBMS) |
| **Small Brown Square Boxes** | Golf ball display stands, BI stands |
| **White Mid-Size Envelopes** | Cricket, Football, NFL stands |
| **Small Envelopes** | Bitcoin tokens, marker stand standoffs |
| **Gift Ribbon** | Gift wrap orders (optional service) |
| **Bubble Wrap** | Protection |
| **Brown Packing Paper** | Void fill |
| **Clear Plastic Wrap** | Product wrapping |

### Postcards

**1 postcard per item** (not per order)

#### Display Champ Postcards

Choose the design that best fits the order. Hole in One is most used as most DC sales are hole-in-one celebration cases.

| Code | Design | Usage |
|------|--------|-------|
| **PC-DC-HIO** | Hole in One | Most common - for hole in one achievements |
| **PC-DC-LEG** | Legendary | For legendary achievements |
| **PC-DC-CHAMP** | Champion | For championship/winner orders |
| **PC-DC-POD** | Podium | For podium/placing achievements |

#### Bright Ivy Postcards

| Code | Design | Usage |
|------|--------|-------|
| **PC-BI** | Thank You | General thank you, review request, 20% discount code |

---

### Stem Components

For stems (used in Cricket, Tennis, Baseball, Field Hockey cases):
- **Track:** 6mm Acrylic Rod (consumed per stem made)
- **Don't track:** 3mm Acrylic Sheet (always kept in stock, not tracked per-unit)

---

## Manufacturing

### Sourcing Strategy

Products are sourced two ways:
1. **Bought-in ready-made** - From overseas suppliers (China)
2. **Made in-house** - For custom orders or when overseas stock is low

### In-House Manufacturing

#### Wood Bases (Heritage, Prestige)
- **Raw material:** Planed Oak or Planed Mahogany planks
- **Process:** Local carpenter manufactures into complete bases
- **Used for:** Custom orders, stock replenishment

#### Acrylic Products (Icon, Vantage, Cases, Stands)
- **Raw materials:**
  - Clear 3mm Acrylic sheets (1000mm × 600mm)
  - Clear 5mm Acrylic sheets (1000mm × 600mm)
  - Black 5mm Acrylic sheets (1000mm × 600mm)
- **Can make:** Bases, stands, cases - anything for custom sizing
- **Used for:** Custom orders, when overseas stock unavailable

### Grass (Turf Inlay)

| Size | Sourcing |
|------|----------|
| **B1 grass** | Pre-cut, bought in bulk |
| **B2/B3 grass** | Cut in-house from grass sheets |

### Assembly Components

| Component | Usage | Notes |
|-----------|-------|-------|
| **Sticky Bottoms (Silicone Feet)** | Acrylic bases only | Not on wood bases |
| **Glue Dots** | Secure golf balls to tees | Only for -BALL orders |
| **Plastic Weld Glue** | Acrylic assembly | |
| **Double-Sided Tape** | General assembly | |
| **Brown Tape** | Attach case to base | |

### Production Consumables (NOT in BOM)

These are general supplies reordered when low, not tracked per-product:

| Item | Usage |
|------|-------|
| Vuplex | Cleaning/polishing acrylic |
| Blue Roll | Cleaning |
| Buffing/Polishing Compound | Finishing |
| Gloves (S/M/L/XL) | Production |
| Printer Toner | Printing |
| A4 Paper | Printing |
| Shipping Labels (Munbyn) | Labelling |
| Parcel Tape | Sealing boxes |
| Label Printer Labels | Labelling |

---

## Example BOM Configurations

### Golf Ball Case - Icon Style

**Product SKU:** GBCICON
| Component | Qty | Notes |
|-----------|-----|-------|
| C2 Case | 1 | Medium acrylic dome |
| B2 Icon Base | 1 | Black acrylic base |
| Golf Tee | 1 | Requires drilled hole |

### Golf Ball Case - Prestige Oak

**Product SKU:** GBCPRESTIGEOAK
| Component | Qty | Notes |
|-----------|-----|-------|
| C2 Case | 1 | Medium acrylic dome |
| B2 Prestige Oak Base | 1 | Solid oak with grass inlay |
| Golf Tee | 1 | Requires drilled hole |

### Golf Ball Case with Ball

**Product SKU:** GBCPRESTIGEOAK-BALL
| Component | Qty | Notes |
|-----------|-----|-------|
| C2 Case | 1 | Medium acrylic dome |
| B2 Prestige Oak Base | 1 | Solid oak with grass inlay |
| Golf Tee | 1 | Requires drilled hole |
| Golf Ball | 1 | **Additional component** |

### Bright Ivy Ring Case

**Product SKU:** (example)
| Component | Qty | Notes |
|-----------|-----|-------|
| C1 Case | 1 | Small acrylic dome |
| B1 Heritage Oak Base | 1 | Solid oak base |
| Ring Stand (RS) | 1 | Single ring holder |

### Double Ring Case

**Product SKU:** (example with RS2)
| Component | Qty | Notes |
|-----------|-----|-------|
| C1 Case | 1 | Small acrylic dome |
| B1 Heritage Oak Base | 1 | Solid oak base |
| Ring Stand | 2 | **Two ring holders** |

### Cricket Ball Case

**Product SKU:** CBCPRESTIGEOAK
| Component | Qty | Notes |
|-----------|-----|-------|
| C2 Case | 1 | Medium acrylic dome |
| B2 Prestige Oak Base | 1 | Solid oak with grass inlay |
| 6mm Acrylic Rod | 1 | For stem (made in-house) |

### Ice Hockey Puck Case

**Product SKU:** IHICON
| Component | Qty | Notes |
|-----------|-----|-------|
| C2 Case | 1 | Medium acrylic dome |
| B2 Icon Base | 1 | Black acrylic base |
| Coin Stand Large | 1 | Holds the puck |

---

## Known Data Issues

1. ~~**Line 109 in Shopify export**: Cricket Ball Display Case has SKU `TBDCVANTAGE` (should be `CBDCVANTAGE`)~~ - Being corrected

---

## Data Entry Order

When setting up inventory, follow this order:

1. **Components** - Add all raw materials/parts (`/inventory/components`)
   - **Cases (3):** C1, C2, C3
   - **Bases (18):** B1/B2/B3 × Icon/Vantage/Heritage Oak/Heritage Mah/Prestige Oak/Prestige Mah
   - **Accessories (12):**
     - Tee (black)
     - Ring Stand (bought-in)
     - Coin Stand Small
     - Coin Stand Large
     - Circular Acrylic Ring (bought-in)
     - 6mm Acrylic Rod (for stems)
     - Titleist TruFeel Golf Ball
     - Round Magnets (for GBMS - 16 per stand)
     - Square Magnets (for GBPS - 2 per stand)
     - Black Metal Standoffs (for GBMS - 2 per stand)
     - Bitcoin Token (for BI bitcoin case)
     - Tennis Ball (custom printed, optional)
   - **Grass (2):** B1 Grass (pre-cut), Grass Sheets (for B2/B3)
   - **Assembly (4):** Sticky Bottoms (silicone feet), Glue Dots, Double-Sided Tape, Brown Tape
   - **Product Boxes (3):** P1, P2, P3 (from China)
   - **Shipping Boxes (3):** Small, Medium, Large (from Kite UK)
   - **Other Packaging (6):** A4 White Envelopes, Small Brown Boxes, White Mid Envelopes, Small Envelopes, Bubble Wrap, Brown Packing Paper
   - **Postcards (5):** DC HIO, DC Legendary, DC Champion, DC Podium, BI Thank You
   - **Raw Materials (5):** Clear 3mm Acrylic Sheet, Clear 5mm Acrylic Sheet, Black 5mm Acrylic Sheet, Planed Oak, Planed Mahogany

2. **Product SKUs** - Add all product SKUs (`/inventory/product-skus`)

3. **BOM (Bill of Materials)** - Link products to components (`/inventory/bom`)

4. **Stock Levels** - Set initial stock quantities (`/inventory`)

5. **SKU Mapping** - Map legacy SKUs if needed (`/inventory/sku-mapping`)

---

*Last updated: January 2026*
