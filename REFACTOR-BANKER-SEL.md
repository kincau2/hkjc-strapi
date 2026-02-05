# Major Refactor: BANKER/SEL Component Implementation

## Overview
Refactored the Pick system to use structured component fields instead of HTML tags in database. This allows non-technical admins to easily mark picks as BANKER (膽) or SEL (腳) using checkboxes instead of manually typing HTML tags.

## Changes Made

### 1. Component Schema (✅ Completed by User)
**File**: `Backend/src/components/pick/list-item.json`

Added two boolean fields to the list-item component:
- `banker`: Boolean field (default: false) - marks pick as BANKER/膽
- `sel`: Boolean field (default: false) - marks pick as SEL/腳

```json
{
  "attributes": {
    "text": { "type": "string", "required": true },
    "banker": { "type": "boolean", "default": false },
    "sel": { "type": "boolean", "default": false }
  }
}
```

### 2. Backend CSV Import (✅ Completed)
**File**: `Backend/src/api/pick/controllers/csv-import.js`

#### Old CSV Format (Single Row Per Race):
```csv
raceEn,listEn
"Race1","11. MACANESE MASTER|1. EXCEED THE WISH|4. GENERAL SMART"
```

#### New CSV Format (Multiple Rows Per Race):
```csv
raceEn,listEn,banker,sel
"Race1","11. MACANESE MASTER",true,false
"Race1","1. EXCEED THE WISH",false,true
"Race1","4. GENERAL SMART",false,false
```

#### Key Changes:
- **Row Grouping**: Multiple CSV rows now represent one pick (grouped by race + expert)
- **New Columns**: Added `banker` and `sel` columns (accepts `true`/`1` as true)
- **Component Population**: Creates `listEnItems` and `listTcItems` arrays with banker/sel flags
- **Legacy Fields Removed**: `listEn` and `listTc` text fields have been deleted from schema

#### Import Logic Flow:
1. **Validation Phase**: Validates all expert names before deleting data
2. **Grouping Phase**: Groups CSV rows by race/expert combination
3. **Import Phase**: Deletes existing picks and creates new ones with component data

```javascript
// Example of grouped data structure
{
  raceEn: "Race1",
  expertId: 123,
  listEnItems: [
    { text: "11. MACANESE MASTER", banker: true, sel: false },
    { text: "1. EXCEED THE WISH", banker: false, sel: true },
    { text: "4. GENERAL SMART", banker: false, sel: false }
  ]
}
```

### 3. Frontend Rendering (✅ Completed)
**File**: `Frontend/assets/js/strapi-api.js`

#### New Helper Function:
```javascript
const convertComponentsToList = (components, locale) => {
  return components.map(item => {
    const bankerLabel = locale === 'tc' ? '膽' : 'BANKER';
    const selLabel = locale === 'tc' ? '腳' : 'SEL';
    let displayText = item.text || '';
    
    // Add badge HTML if banker or sel is true
    if (item.banker) {
      displayText = `<span class="badge text-bg-primary me-1">${bankerLabel}</span>${displayText}`;
    }
    if (item.sel) {
      displayText = `<span class="badge text-bg-primary me-1">${selLabel}</span>${displayText}`;
    }
    
    return { text: displayText, banker: item.banker, sel: item.sel };
  });
};
```

#### Rendering Logic:
- Reads from `listEnItems`/`listTcItems` component fields
- Falls back to legacy `listEn`/`listTc` text fields if components empty
- Adds Bootstrap badge for BANKER: `<span class="badge text-bg-primary me-1">膽</span>`
- Adds Bootstrap badge for SEL: `<span class="badge text-bg-primary me-1">腳</span>`
- Translations: BANKER = "膽" (tc) / "BANKER" (en), SEL = "腳" (tc) / "SEL" (en)

**File**: `Frontend/assets/js/strapi-data-loader.js`

Updated list rendering to handle both string format (legacy) and object format (new):
```javascript
${p.list.map(item => {
  const text = typeof item === 'string' ? item : item.text;
  return `<p>${text}</p>`;
}).join('')}
```

## Sample CSV File

Created `picks-new-format-sample.csv` with example data showing:
- Multiple rows for single race (Race1 has 4 rows for Joseph's picks)
- BANKER marking (11. MACANESE MASTER has banker=true)
- SEL marking (1. EXCEED THE WISH has sel=true)
- Regular picks (no special marking)

## Expected Output

### Old Format (Manual HTML):
```
<span class="badge text-bg-primary me-1">膽</span>1. 旺旺嘉駒
<span class="badge text-bg-primary me-1">腳</span>2. 星火燎原
4. 運來伍寶
```

### New Format (Auto-generated):
Admin UI checkboxes → Database component → Frontend HTML badges

## Testing Checklist

### Backend Testing:
- [ ] Import sample CSV with banker/sel columns
- [ ] Verify rows are grouped by race/expert correctly
- [ ] Check component fields populated in database
- [ ] Verify legacy text fields still populated (backward compatibility)
- [ ] Test expert name validation still works

### Frontend Testing:
- [ ] Verify badges show correctly: 膽 for BANKER in TC, BANKER in EN
- [ ] Verify badges show correctly: 腳 for SEL in TC, SEL in EN
- [ ] Test picks without banker/sel show normally
- [ ] Check Bootstrap badge styling (.badge .text-bg-primary .me-1)
- [ ] Verify fallback to legacy text fields works

### Admin UI Testing:
- [ ] Open Pick in admin panel
- [ ] Check "List En Items" and "List Tc Items" fields appear
- [ ] Add items using + button
- [ ] Test BANKER checkbox
- [ ] Test SEL checkbox
- [ ] Save and verify data persists

## Database Structure

### Component Table: `components_pick_list_items`
| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key |
| text | string | Pick text (e.g., "11. MACANESE MASTER") |
| banker | boolean | BANKER flag (膽) |
| sel | boolean | SEL flag (腳) |

### Link Tables (Auto-created by Strapi):
- `picks_list_en_items_links`: Links picks to EN list items
- `picks_list_tc_items_links`: Links picks to TC list items

## Migration Notes

### For Existing Data:
1. Export current picks to CSV (old format with | separator)
2. Transform CSV:
   - Split rows by | delimiter
   - Create separate row for each pick
   - Add banker/sel columns (default to false)
3. Import transformed CSV

### For New Data Entry:
1. Use admin UI to create picks
2. Add list items using + button
3. Check BANKER or SEL boxes as needed
4. No manual HTML tag entry required!

## Files Modified

1. ✅ `Backend/src/components/pick/list-item.json` - Added banker/sel fields
2. ✅ `Backend/src/api/pick/content-types/pick/schema.json` - Added listEnItems/listTcItems fields
3. ✅ `Backend/src/api/pick/controllers/csv-import.js` - Refactored import logic
4. ✅ `Frontend/assets/js/strapi-api.js` - Updated to render components with badges
5. ✅ `Frontend/assets/js/strapi-data-loader.js` - Updated list rendering

## Benefits

### Before (Old Way):
- ❌ Admins must type HTML: `<span class="badge text-bg-primary me-1">膽</span>1. 旺旺嘉駒`
- ❌ Error-prone (typos in HTML tags)
- ❌ Non-technical admins struggle
- ❌ Database contains HTML (mixing data with presentation)

### After (New Way):
- ✅ Simple checkboxes in admin UI
- ✅ Clean data in database (no HTML)
- ✅ Automatic badge rendering in frontend
- ✅ Easy for non-technical admins
- ✅ Structured data (can filter/query by banker/sel)

## Next Steps

1. Test CSV import with sample file
2. Verify frontend displays badges correctly
3. Create migration script for existing data (if needed)
4. Update admin documentation for new workflow
5. Consider adding filters to show only BANKER or SEL picks
