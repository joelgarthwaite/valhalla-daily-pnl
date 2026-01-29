# SKU Naming Conventions & Business Logic

**Purpose:** Document all SKU naming rules for inventory management, BOM tracking, and mapping suggestions.

**Last Updated:** January 2026

---

## SKU Structure Overview

A typical Display Champ SKU follows this pattern:

```
[CATEGORY PREFIX][PRODUCT NAME][MATERIAL?][UV?][BACKGROUND CODE?][VARIANT SUFFIX]
```

Example: `GBCPRESTIGEMAHUVHIOP`
- `GBC` = Golf Ball Case (category)
- `PRESTIGE` = Product line
- `MAH` = Mahogany wood (legacy, now AHW)
- `UV` = UV printed case
- `HIO` = Hole in One background
- `P` = Personalized variant

---

## 1. Category Prefixes (Product Type)

Category prefixes indicate what type of product/sport the display case is for.

### Ball Cases (BC suffix)
| Prefix | Meaning | Sport |
|--------|---------|-------|
| `GBC` | Golf Ball Case | Golf |
| `TBC` | Tennis Ball Case | Tennis |
| `CDC` | Cricket Display Case | Cricket |
| `CBC` | Cricket Ball Case | Cricket |
| `BBC` | Baseball Ball Case | Baseball |
| `SBC` | Soccer Ball Case | Soccer |
| `RBC` | Rugby Ball Case | Rugby |
| `HBC` | Hockey Ball Case | Hockey |
| `FBC` | Football Ball Case | Football (Soccer) |
| `FHBC` | Field Hockey Ball Case | Field Hockey |
| `NFL` | American Football | American Football (Etsy) |

### Display Cases (DC suffix)
| Prefix | Meaning | Sport |
|--------|---------|-------|
| `BBDC` | Baseball Ball Display Case | Baseball |

### Display Stands (DS suffix)
| Prefix | Meaning | Sport |
|--------|---------|-------|
| `GBDS` | Golf Ball Display Stand | Golf |

### Coin Products
| Prefix | Meaning | Product |
|--------|---------|---------|
| `CS` | Coin Stand | Stand for displaying coins |

### Pattern Recognition
- Most prefixes end in `BC` (Ball Case)
- Some end in `DC` (Display Case)
- Some end in `DS` (Display Stand)
- Prefixes are typically 3-5 characters

### Business Rule
**SKUs with different category prefixes are ALWAYS different products and should NEVER be mapped together.**

Example: `GBCVANTAGE` and `TBCVANTAGE` are completely different products (Golf vs Tennis), even though they share the "VANTAGE" product line name.

---

## 2. Product Lines

Product lines indicate the style/tier of the display case. The key differentiators are **base material** and **turf/grass insert**.

| Product Line | Base Type | Turf Insert | Description | Legacy Names |
|--------------|-----------|-------------|-------------|--------------|
| `VANTAGE` | Turf base | ✅ Yes | Entry-level with full turf base | `PTB` (Premium Turf Base) |
| `ICON` | High gloss black | ❌ No | Premium black gloss base | `02`, `GBB02` |
| `HERITAGE` | Solid wood | ❌ No | Premium wood base, no turf | `HERI` |
| `PRESTIGE` | Solid wood | ✅ Yes | Heritage + turf insert | |

### Key Distinction: Heritage vs Prestige
- **Heritage** = Solid wood base only (no grass)
- **Prestige** = Solid wood base + turf/grass insert
- Think of it as: **Prestige = Heritage + Turf**

This applies to both cases AND stands.

### Legacy Product Line Mappings
| Legacy Code | Current Product Line |
|-------------|---------------------|
| `PTB` | VANTAGE |
| `02` | ICON |
| `GBB02` | ICON |
| `HERI` | HERITAGE |

### Business Rule
Different product lines within the same category are DIFFERENT products with different BOMs.

---

## 3. Material Codes

Material codes indicate the wood type used in the case.

| Code | Material | Status |
|------|----------|--------|
| `AHW` | African Hardwood | **CURRENT** |
| `MAH` | Mahogany | **LEGACY** - Now AHW |
| `AFZ` | Afzelia | **LEGACY** - Now AHW |
| `OAK` | Solid Oak | Current |
| `OLIVE` | Olivewood | Current |

### Material Evolution
```
AFZ (Afzelia) → MAH (Mahogany) → AHW (African Hardwood)
```

### Business Rule - Material Equivalence
**For matching and mapping purposes, AFZ, MAH, and AHW should be treated as equivalent.** These represent the same material lineage and can be mapped together.

Examples:
- `GBCPRESTIGEAFZP` → `GBCPRESTIGEMAHP` → `GBCPRESTIGEAHWP` (all equivalent)

---

## 4. UV Printing

| Code | Meaning |
|------|---------|
| `UV` | UV Printed Case |

UV indicates the case has UV printing capability for pre-printed backgrounds. When UV appears in a SKU, it's typically followed by a background code.

Example: `GBCVANTAGEUVHIO` = Vantage case with UV-printed Hole in One design

---

## 5. Background/Print Codes

Background codes indicate pre-printed artwork on the case. **These are critical for BOM** as they represent specific printed case variants that need separate inventory tracking.

### Golf Backgrounds
| Code | Meaning | Design |
|------|---------|--------|
| `HIO` | Hole in One | Hole in One celebration design |
| `CHAMP` | Champion | Champion/Winner design |
| `LEG` | Legendary | Legendary achievement design |
| `GC` | Golf Course | Golf course scenery |
| `EAGLE` | Eagle | Eagle (2 under par) design |
| `BIRDIE` | Birdie | Birdie (1 under par) design |
| `PAR` | Par | Par design |
| `ALBATROSS` | Albatross | Albatross (3 under par) design |

### Baseball Backgrounds
| Code | Meaning | Design |
|------|---------|--------|
| `STADIUM` | Stadium | Pre-printed stadium design |
| `HOMERUN` | Home Run | Home Run design (may not be live yet) |

### Custom Backgrounds
| Code | Meaning |
|------|---------|
| `CUSTOMBG` | Custom Background - Customer-provided artwork |

### Business Rule
**Different background codes = Different BOM items.** A `GBCVANTAGEUVHIO` case requires a different pre-printed case component than `GBCVANTAGEUVLEG`.

The P and -BALL suffix logic STILL APPLIES to background variants:
- `GBCVANTAGEUVHIOP` → Same BOM as `GBCVANTAGEUVHIO` (P = personalization only)
- `GBCVANTAGEUVHIO-BALL` → Different BOM (includes golf ball)

---

## 6. Case & Base Sizing System

### Case Sizes (C-Series)
| Code | Size | Legacy Name |
|------|------|-------------|
| `C1` | Small | Standard |
| `C2` | Medium | `XL` |
| `C3` | Large | |

### Base Sizes (B-Series)
| Code | Size | Notes |
|------|------|-------|
| `B1` | Small | Pairs with C1 |
| `B2` | Medium | Pairs with C2 |
| `B3` | Large | Pairs with C3 |

*Note: More sizes are being added to this system.*

### XL Prefix
`XL` is the **legacy name for C2** (medium) case size.

Example: `XLGBCVANTAGECUSTOMBG` = C2 sized Golf Ball Case Vantage with custom background

### Business Rule
**Different sizes = Different products.** A C1 case and C2 case are different BOMs and should not be mapped together.

---

## 7. Variant Suffixes

### P Suffix (Personalized)
| Rule | Description |
|------|-------------|
| **Meaning** | Personalized/Engraved version |
| **BOM Impact** | **SAME** as base SKU |
| **Example** | `VANTAGEP` uses same stock as `VANTAGE` |
| **Auto-handling** | System auto-maps P variants to base via `getBaseSku()` |

**Business Rule:** P suffix variants share the same BOM/stock as the base SKU. When checking inventory for `GBCVANTAGEP`, look up `GBCVANTAGE` stock.

### -BALL Suffix (Includes Golf Ball)
| Rule | Description |
|------|-------------|
| **Meaning** | Case + Golf Ball bundle |
| **BOM Impact** | **DIFFERENT** from base SKU |
| **Example** | `VANTAGE-BALL` has different BOM than `VANTAGE` |
| **Display Grouping** | Grouped with base for sales analysis |

**Business Rule:** `-BALL` variants have different BOM (include a golf ball component) but should be grouped together with the base SKU for sales reporting and display purposes.

---

## 8. Numeric Modifiers

### Quantity Suffixes
| Pattern | Meaning | Example |
|---------|---------|---------|
| `X5` | 5-ball display | `GBDSVANTAGEX5` |

### Business Rule
**Numeric quantity differences indicate DIFFERENT products** with different BOMs (different case sizes or ball counts).

---

## 9. B-Series SKU Format (New System)

The B-series format is a newer, more structured SKU system:

```
B[base]-[product]-[material?]-C[case]-[options]
```

| Component | Meaning | Values |
|-----------|---------|--------|
| `B1`, `B2`, `B3` | Base size | Small, Medium, Large |
| Product code | Product line | `ICON`, `HERI` (Heritage), `AHW` (African Hardwood base) |
| Material | Wood type | `OAK`, `AHW` |
| `C1`, `C2`, `C3` | Case size | Small, Medium, Large |
| `CUS` | Custom | Customer customization |
| `CS` | Coin Stand | Stand product (not case) |
| `RS`, `RS2` | Ring Stand | Single or Double ring stand component |

Examples:
- `B1-ICON-C1` = Small base, Icon, Small case
- `B2-HERI-OAK-C2-CUS` = Medium base, Heritage, Oak, Medium case, Custom
- `B1-ICON-RS2-C1` = Small base, Icon with Double Ring Stand, Small case
- `B1-AHW-CS-C1` = Small base, African Hardwood, Coin Stand, Small case

---

## 10. Known Legacy SKU Mappings

These old SKUs have been identified and should map to current SKUs:

### Icon Product Line
| Legacy SKU | Current SKU | Notes |
|------------|-------------|-------|
| `GBC02P` | `GBCICONP` | Old Icon format |
| `GBCGBB02P` | `GBCICONP` | Old Icon format |
| `VGBCGBB02P` | `GBCICONP` | V prefix was meaningless |

### Vantage Product Line
| Legacy SKU | Current SKU | Notes |
|------------|-------------|-------|
| `GBCPTBP` | `GBCVANTAGEP` | PTB = Premium Turf Base = Vantage |
| `GBCPTB` | `GBCVANTAGE` | Non-personalized version |

### Material Mappings
| Legacy Material | Current Material | Action |
|-----------------|------------------|--------|
| `AFZ` (Afzelia) | `AHW` (African Hardwood) | Can map |
| `MAH` (Mahogany) | `AHW` (African Hardwood) | Can map |

### Business Rule
Legacy SKU mappings should be stored in the `sku_mapping` table to ensure historical order data is correctly attributed to current products for forecasting.

---

## 11. Excluded Product Categories

The following product types are **excluded from SKU mapping suggestions**:

| Category | Examples | Reason |
|----------|----------|--------|
| Jewellery | 14K Gold-Filled chains, necklaces, studs, earrings | Bright Ivy jewellery products |

**Keywords that trigger exclusion:** jewel, jewelry, necklace, bracelet, earring, studs, pendant, gold-filled, hypoallergenic, sterling silver, paperclip chain, xoxo

**NOT excluded:**
- Coin products (COINSLAB, CS) - These are Display Champ products

---

## 12. Current Algorithm Logic

### Suggestion Generation Rules

The SKU mapping suggestion engine applies these filters:

| Rule | Action | Reason |
|------|--------|--------|
| Same SKU | SKIP | Can't map to self |
| P-suffix pair | SKIP | Auto-handled by `getBaseSku()` |
| -BALL suffix pair | SKIP | Different BOM, grouped for display |
| Same display group base | SKIP | Variants of same product |
| Different category prefix | REJECT | Different product categories (GBC ≠ TBC) |
| Numeric segment difference | REJECT | Different products |
| Low similarity score | REJECT | Not related products |

### What Should Be Suggested
The system SHOULD suggest mappings for:
- Legacy SKU → Current SKU (e.g., `GBC02P` → `GBCICONP`, `GBCPTBP` → `GBCVANTAGEP`)
- AFZ/MAH → AHW variants (material evolution)
- Platform-specific SKUs (if Shopify uses different SKU than Etsy)
- Typos or data entry errors

### What Should NOT Be Suggested
- Cross-category matches (GBC vs TBC vs BBC)
- Different sizes (C1 vs C2, B1 vs B2, XL vs standard)
- Different backgrounds (HIO vs LEG vs CHAMP)
- Different materials (OAK vs AHW) - *except AFZ/MAH→AHW*
- Different product lines (VANTAGE vs ICON vs PRESTIGE)

---

## 13. Summary: BOM Impact Matrix

| SKU Change | Same BOM? | Action |
|------------|-----------|--------|
| Add P suffix | ✅ YES | Auto-link |
| Add -BALL suffix | ❌ NO | Group for display only |
| Change category (GBC→TBC) | ❌ NO | Never map |
| Change product line (VANTAGE→ICON) | ❌ NO | Never map |
| Change material (OAK→AHW) | ❌ NO | Never map |
| Change material (AFZ→MAH→AHW) | ✅ YES | Can map (evolution) |
| Change background (HIO→LEG) | ❌ NO | Never map |
| Change size (C1→C2) | ❌ NO | Never map |
| Add UV | ❌ NO | Different product |
| Legacy→Current SKU | ✅ YES | Should map |
| PTB→VANTAGE | ✅ YES | Same product line |
| 02/GBB02→ICON | ✅ YES | Same product line |

---

## 14. Brand Notes

### Display Champ
Primary brand. All conventions above apply.

### Bright Ivy
Secondary brand. **Uses the same SKU methodology** as Display Champ.

---

## 15. Complete Reference Tables

### All Category Prefixes
| Prefix | Full Name | Sport/Product |
|--------|-----------|---------------|
| `GBC` | Golf Ball Case | Golf |
| `GBDS` | Golf Ball Display Stand | Golf |
| `TBC` | Tennis Ball Case | Tennis |
| `BBC` | Baseball Ball Case | Baseball |
| `BBDC` | Baseball Ball Display Case | Baseball |
| `CBC` | Cricket Ball Case | Cricket |
| `CDC` | Cricket Display Case | Cricket |
| `SBC` | Soccer Ball Case | Soccer |
| `RBC` | Rugby Ball Case | Rugby |
| `HBC` | Hockey Ball Case | Hockey |
| `FBC` | Football Ball Case | Football |
| `FHBC` | Field Hockey Ball Case | Field Hockey |
| `NFL` | American Football Case | American Football |
| `CS` | Coin Stand | Coins (exclude from mapping) |

### All Background Codes
| Code | Full Name | Sport |
|------|-----------|-------|
| `HIO` | Hole in One | Golf |
| `CHAMP` | Champion | Golf |
| `LEG` | Legendary | Golf |
| `GC` | Golf Course | Golf |
| `EAGLE` | Eagle | Golf |
| `BIRDIE` | Birdie | Golf |
| `PAR` | Par | Golf |
| `ALBATROSS` | Albatross | Golf |
| `STADIUM` | Stadium | Baseball |
| `HOMERUN` | Home Run | Baseball |
| `CUSTOMBG` | Custom Background | All |

### All Material Codes
| Code | Material | Status |
|------|----------|--------|
| `AHW` | African Hardwood | Current |
| `MAH` | Mahogany | Legacy → AHW |
| `AFZ` | Afzelia | Legacy → AHW |
| `OAK` | Solid Oak | Current |
| `OLIVE` | Olivewood | Current |

### All Size Codes
| Code | Size | Type |
|------|------|------|
| `B1` | Small | Base |
| `B2` | Medium | Base |
| `B3` | Large | Base |
| `C1` | Small | Case |
| `C2` / `XL` | Medium | Case |
| `C3` | Large | Case |

### All Variant Suffixes
| Suffix | Meaning | BOM Impact |
|--------|---------|------------|
| `P` | Personalized | Same BOM |
| `-BALL` | Includes ball | Different BOM |
