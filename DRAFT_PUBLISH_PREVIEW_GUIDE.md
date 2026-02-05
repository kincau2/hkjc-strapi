# Strapi 5 Draft & Publish with Preview Feature - Implementation Guide

## Project Context
This guide documents the implementation of Strapi 5's Draft & Publish feature with preview functionality for a racing website project. It covers critical findings, API behaviors, and solutions to common issues.

---

## Table of Contents
1. [Core Concepts](#core-concepts)
2. [Component Architecture](#component-architecture)
3. [Critical Findings](#critical-findings)
4. [API Implementation](#api-implementation)
5. [Frontend Integration](#frontend-integration)
6. [Common Pitfalls](#common-pitfalls)
7. [Testing Checklist](#testing-checklist)

---

## Core Concepts

### Draft & Publish System
- **Schema Setting**: Enable in content type schema with `draftAndPublish: true`
- **Default State**: Content created via Document Service API defaults to **draft** status
- **Entity Service vs Document Service**: 
  - Entity Service (legacy): Auto-publishes content
  - Document Service (Strapi 5): Respects draft/publish states

### Preview Feature
- **Purpose**: View draft content before publishing
- **Configuration**: Located in `config/admin.js`
- **URL Parameters**: `?preview=true&status=draft`
- **Frontend Detection**: Check URL params to toggle draft content fetching

---

## Component Architecture

### Dynamic Component System for Pick Lists

This project uses Strapi's **dynamic zones with repeatable components** to handle flexible pick lists with metadata (BANKER/SEL badges). This replaced the legacy HTML-based approach.

#### Problem Statement
The original implementation stored pick lists as HTML strings:
```javascript
// ❌ Old approach - HTML in database
{
  listEn: "<ul><li>Horse A <span>BANKER</span></li><li>Horse B <span>SEL</span></li></ul>",
  listTc: "<ul><li>馬A <span>BANKER</span></li><li>馬B <span>SEL</span></li></ul>"
}
```

**Issues**:
- No structured data for filtering/sorting
- HTML injection risks
- Difficult to query or analyze
- Frontend must parse HTML tags
- Multiple CSV rows per race required manual HTML concatenation

#### Solution: Repeatable Component System

##### 1. Component Schema Definition
**File**: `Backend/src/components/pick/list-item.json`

```json
{
  "collectionName": "components_pick_list_items",
  "info": {
    "displayName": "List Item",
    "description": "Individual pick item with optional badges"
  },
  "options": {},
  "attributes": {
    "text": {
      "type": "string",
      "required": true
    },
    "banker": {
      "type": "boolean",
      "default": false
    },
    "sel": {
      "type": "boolean",
      "default": false
    }
  }
}
```

##### 2. Pick Schema Integration
**File**: `Backend/src/api/pick/content-types/pick/schema.json`

```json
{
  "attributes": {
    "listEnItems": {
      "type": "component",
      "repeatable": true,
      "component": "pick.list-item"
    },
    "listTcItems": {
      "type": "component",
      "repeatable": true,
      "component": "pick.list-item"
    }
  }
}
```

**Key Changes**:
- `listEn` / `listTc` (text fields) → `listEnItems` / `listTcItems` (component arrays)
- Each item is now structured data: `{ text, banker, sel }`
- Supports unlimited items per pick
- Easy to filter, sort, and query

#### CSV Import Processing

##### CSV Format
```csv
RACEEN,RACETC,TYPEEN,TYPETC,METAEN,METATC,LISEN,BANKER,SEL,LISTC,KOL
Race1,第1場,Type A,類型A,Meta EN,中文描述,Horse 1,1,0,馬1,John
Race1,第1場,Type A,類型A,Meta EN,中文描述,Horse 2,0,1,馬2,John
Race1,第1場,Type A,類型A,Meta EN,中文描述,Horse 3,0,0,馬3,John
```

**Key Points**:
- Multiple rows per race create one pick with multiple list items
- `BANKER` column: `1` = true, `0` = false
- `SEL` column: `1` = true, `0` = false
- Rows with same `RACEEN + KOL` are grouped together

##### Import Logic Flow
**File**: `Backend/src/api/pick/controllers/csv-import.js`

```javascript
// Step 1: Group CSV rows by race + expert
const pickGroupArray = [];
const pickGroupMap = new Map();

for (const row of results.data) {
  const groupKey = `${row.RACEEN}-${row.KOL}`;
  
  if (!pickGroupMap.has(groupKey)) {
    // First row - create new pick group
    pickGroupMap.set(groupKey, {
      raceEn: row.RACEEN,
      raceTc: row.RACETC,
      listEnItems: [],
      listTcItems: [],
      // ... other fields
    });
  }
  
  const pickGroup = pickGroupMap.get(groupKey);
  
  // Step 2: Add list item to arrays
  pickGroup.listEnItems.push({
    text: row.LISEN,
    banker: row.BANKER === '1',
    sel: row.SEL === '1'
  });
  
  pickGroup.listTcItems.push({
    text: row.LISTC,
    banker: row.BANKER === '1',
    sel: row.SEL === '1'
  });
}

// Step 3: Create picks with components
for (const pickData of pickGroupArray) {
  await strapi.documents('api::pick.pick').create({
    data: {
      raceEn: pickData.raceEn,
      raceTc: pickData.raceTc,
      listEnItems: pickData.listEnItems,  // Array of components
      listTcItems: pickData.listTcItems,  // Array of components
      expert: pickData.expertId
    }
  });
}
```

**Processing Steps**:
1. **Group Rows**: Use `RACEEN-KOL` as unique key
2. **Build Arrays**: Each row adds one component to `listEnItems` and `listTcItems`
3. **Create Pick**: One pick entity with multiple list items
4. **Components Auto-Created**: Strapi handles component table inserts

##### Component Creation Example

**Input**: 3 CSV rows for Race1 + John
```csv
Race1,第1場,Type A,類型A,Meta,描述,Horse 1,1,0,馬1,John
Race1,第1場,Type A,類型A,Meta,描述,Horse 2,0,1,馬2,John
Race1,第1場,Type A,類型A,Meta,描述,Horse 3,0,0,馬3,John
```

**Output**: 1 Pick with 2 component arrays
```javascript
{
  raceEn: "Race1",
  raceTc: "第1場",
  listEnItems: [
    { text: "Horse 1", banker: true, sel: false },
    { text: "Horse 2", banker: false, sel: true },
    { text: "Horse 3", banker: false, sel: false }
  ],
  listTcItems: [
    { text: "馬1", banker: true, sel: false },
    { text: "馬2", banker: false, sel: true },
    { text: "馬3", banker: false, sel: false }
  ]
}
```

#### Frontend Rendering

##### Component to HTML Conversion
**File**: `Frontend/assets/js/strapi-api.js`

```javascript
// Helper function: Convert component items to formatted list with badges
const convertComponentsToList = (components, locale) => {
  if (!components || !Array.isArray(components) || components.length === 0) {
    return [];
  }
  
  return components.map(item => {
    let badges = '';
    
    // Add BANKER badge
    if (item.banker) {
      badges += locale === 'tc' 
        ? '<span class="badge badge-banker">BANKER</span>' 
        : '<span class="badge badge-banker">BANKER</span>';
    }
    
    // Add SEL badge
    if (item.sel) {
      badges += locale === 'tc'
        ? '<span class="badge badge-sel">SEL</span>'
        : '<span class="badge badge-sel">SEL</span>';
    }
    
    // Return formatted string
    return `<div class="pick-item">${item.text} ${badges}</div>`;
  }).join('');
};

// Usage in pick rendering
attrs.picks = attrs.picks.map(pick => {
  return {
    ...pick,
    // Convert components to HTML for display
    listEn: convertComponentsToList(pick.listEnItems, 'en'),
    listTc: convertComponentsToList(pick.listTcItems, 'tc')
  };
});
```

##### Rendered HTML Example
```html
<div class="pick-item">Horse 1 <span class="badge badge-banker">BANKER</span></div>
<div class="pick-item">Horse 2 <span class="badge badge-sel">SEL</span></div>
<div class="pick-item">Horse 3 </div>
```

#### Advantages of Component Approach

| Aspect | Old (HTML String) | New (Components) |
|--------|-------------------|------------------|
| **Data Structure** | Unstructured HTML | Structured objects |
| **Querying** | Impossible to filter | Can query by banker/sel |
| **Security** | HTML injection risk | Safe structured data |
| **CSV Import** | Manual HTML concatenation | Automatic array building |
| **Frontend** | Parse HTML tags | Direct property access |
| **Extensibility** | Add new HTML tags | Add new component fields |
| **Database** | Single text column | Normalized component table |
| **Validation** | None | Schema-enforced types |

#### Component Data Flow

```
CSV File (Multiple Rows)
    ↓
CSV Parser (Group by Race + Expert)
    ↓
Component Arrays (listEnItems, listTcItems)
    ↓
Document Service Create (Auto-creates components)
    ↓
Component Table (components_pick_list_items)
    ↓
API Response (Populated components)
    ↓
Frontend Rendering (Convert to HTML badges)
    ↓
User Display (Formatted picks with badges)
```

#### Database Schema

##### Components Table
```sql
-- Auto-generated by Strapi
CREATE TABLE components_pick_list_items (
  id INT PRIMARY KEY,
  text VARCHAR(255) NOT NULL,
  banker BOOLEAN DEFAULT false,
  sel BOOLEAN DEFAULT false
);
```

##### Pick-Component Linking Table
```sql
-- Auto-generated by Strapi
CREATE TABLE picks_listEnItems_links (
  pick_id INT REFERENCES picks(id),
  list_item_id INT REFERENCES components_pick_list_items(id),
  list_item_order INT
);

CREATE TABLE picks_listTcItems_links (
  pick_id INT REFERENCES picks(id),
  list_item_id INT REFERENCES components_pick_list_items(id),
  list_item_order INT
);
```

#### Migration Notes

##### Old Schema (Before)
```json
{
  "listEn": { "type": "text" },
  "listTc": { "type": "text" }
}
```

##### New Schema (After)
```json
{
  "listEnItems": {
    "type": "component",
    "repeatable": true,
    "component": "pick.list-item"
  },
  "listTcItems": {
    "type": "component",
    "repeatable": true,
    "component": "pick.list-item"
  }
}
```

**Migration Steps**:
1. Create new component schema file
2. Update pick schema to use components
3. Restart Strapi (generates component tables)
4. Update CSV import to create component arrays
5. Delete old picks with HTML strings
6. Re-import CSV to create structured picks
7. Update frontend to render components

#### Troubleshooting

##### Issue: Components Not Populating
```javascript
// ❌ Wrong - string populate
populate: 'listEnItems,listTcItems'

// ✅ Correct - array populate
populate: ['listEnItems', 'listTcItems']
```

##### Issue: Component Order Not Preserved
**Solution**: Strapi automatically maintains order via `_order` field in link tables.

##### Issue: Can't Query by Banker/SEL
```javascript
// ❌ Wrong - can't filter on components directly
filters: { listEnItems: { banker: true } }

// ✅ Correct - fetch all picks, filter in application code
const picks = await strapi.documents('api::pick.pick').findMany();
const bankerPicks = picks.filter(p => 
  p.listEnItems.some(item => item.banker)
);
```

---

## Critical Findings

### 1. Nested Relations Don't Inherit publicationState

**Problem**: When fetching experts with nested picks using `populate`, the `publicationState` parameter doesn't automatically apply to nested content.

```javascript
// ❌ This doesn't work for nested picks
GET /api/experts?populate=picks&publicationState=preview
// Response: Experts returned, but picks array only contains PUBLISHED picks
```

**Root Cause**: Strapi 5's REST API applies `publicationState` only to the top-level content type, not to populated relations.

**Solution**: Override the controller to manually fetch nested draft content.

```javascript
// ✅ Custom controller in Backend/src/api/expert/controllers/expert.js
module.exports = createCoreController('api::expert.expert', ({ strapi }) => ({
  async find(ctx) {
    const publicationState = query.publicationState || ctx.query.publicationState;
    const shouldIncludeDrafts = publicationState === 'preview';
    
    if (shouldIncludeDrafts) {
      // PREVIEW MODE: Fetch all picks including drafts
      const picks = await strapi.documents('api::pick.pick').findMany({
        filters: { expert: { documentId: expert.documentId } },
        // No status filter - gets all picks
      });
    } else {
      // LIVE MODE: Fetch only published picks
      const picks = await strapi.documents('api::pick.pick').findMany({
        filters: { expert: { documentId: expert.documentId } },
        status: 'published' // Critical: Filter by published status
      });
    }
  }
}));
```

### 2. Document Service API vs Entity Service API

**Finding**: The creation method affects default publication status.

| Method | API | Default State | Use Case |
|--------|-----|---------------|----------|
| `entityService.create()` | Entity Service | Published | Legacy code, auto-publish |
| `documents().create()` | Document Service | Draft | Strapi 5, respects D&P |

**CSV Import Example**:
```javascript
// ❌ Old code - auto-publishes
await strapi.entityService.create('api::pick.pick', { data: {...} });

// ✅ New code - creates as draft
await strapi.documents('api::pick.pick').create({ data: {...} });
```

### 3. Frontend Parameter Requirements

**Finding**: Strapi 5 uses `publicationState=preview`, NOT `status=draft` for API requests.

```javascript
// ❌ Wrong parameter name
GET /api/experts?status=draft

// ✅ Correct parameter
GET /api/experts?publicationState=preview
```

**URL Parameters**:
- `?preview=true` - Enables preview mode in frontend
- `?status=draft` - Informational only (for UI display)
- `publicationState=preview` - Actual API query parameter

### 4. DOM Timing Issues

**Problem**: Preview banner code ran before `document.body` existed, causing `Cannot read properties of null` error.

**Solution**: Wrap preview banner initialization in DOM ready check:

```javascript
// ✅ Safe implementation
if (isPreviewMode()) {
  function showPreviewBanner() {
    if (document.body) {
      // Create and insert banner
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showPreviewBanner);
  } else {
    showPreviewBanner();
  }
}
```

---

## API Implementation

### Backend Configuration

#### 1. Enable Draft & Publish in Schema
**File**: `Backend/src/api/pick/content-types/pick/schema.json`

```json
{
  "options": {
    "draftAndPublish": true
  }
}
```

#### 2. Configure Preview Handler
**File**: `Backend/config/admin.js`

```javascript
module.exports = ({ env }) => ({
  preview: {
    enabled: true,
    config: {
      allowedOrigins: env('CLIENT_URL', 'http://localhost:5500'),
      async handler(uid, { documentId, locale, status }) {
        const document = await strapi.documents(uid).findOne({ documentId });
        
        // Generate preview URL based on content type
        const clientUrl = env('CLIENT_URL');
        const previewSecret = env('PREVIEW_SECRET');
        
        return `${clientUrl}/path?preview=true&secret=${previewSecret}&status=${status}`;
      }
    }
  }
});
```

#### 3. Environment Variables
**File**: `Backend/.env`

```bash
CLIENT_URL=http://localhost:5500
PREVIEW_SECRET=your-secure-secret-key
```

#### 4. Custom Controller for Nested Relations
**File**: `Backend/src/api/expert/controllers/expert.js`

```javascript
module.exports = createCoreController('api::expert.expert', ({ strapi }) => ({
  async find(ctx) {
    const { query } = ctx;
    const publicationState = query.publicationState || ctx.query.publicationState;
    const shouldIncludeDrafts = publicationState === 'preview';
    
    console.log('[Expert Controller] Mode:', shouldIncludeDrafts ? 'PREVIEW' : 'LIVE');
    
    if (shouldIncludeDrafts) {
      // Preview mode: Include draft picks
      const experts = await strapi.documents('api::expert.expert').findMany({
        status: 'published',
        sort: query.sort || 'rank:asc',
        populate: { avatar: true },
      });
      
      const expertsWithPicks = await Promise.all(
        experts.map(async (expert) => {
          const picks = await strapi.documents('api::pick.pick').findMany({
            filters: { expert: { documentId: expert.documentId } },
            sort: 'sort:asc',
            populate: { listEnItems: true, listTcItems: true },
            // No status filter - gets all picks
          });
          
          return { ...expert, picks: picks || [] };
        })
      );
      
      return expertsWithPicks;
    }
    
    // Live mode: Only published picks
    const experts = await strapi.documents('api::expert.expert').findMany({
      status: 'published',
      sort: query.sort || 'rank:asc',
      populate: { avatar: true },
    });
    
    const expertsWithPicks = await Promise.all(
      experts.map(async (expert) => {
        const picks = await strapi.documents('api::pick.pick').findMany({
          filters: { expert: { documentId: expert.documentId } },
          status: 'published', // Critical: Only published
          sort: 'sort:asc',
          populate: { listEnItems: true, listTcItems: true },
        });
        
        return { ...expert, picks: picks || [] };
      })
    );
    
    return expertsWithPicks;
  },
}));
```

---

## Frontend Integration

### Preview Mode Detection
**File**: `Frontend/assets/js/strapi-api.js`

```javascript
// Check if in preview mode
function isPreviewMode() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('preview') === 'true';
}

function getPreviewStatus() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('status') || 'draft';
}

// Show preview banner (with DOM ready check)
if (isPreviewMode()) {
  function showPreviewBanner() {
    if (document.body) {
      const banner = document.createElement('div');
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#ffc107;color:#000;padding:10px;text-align:center;z-index:9999;';
      banner.innerHTML = `📝 PREVIEW MODE - Viewing ${getPreviewStatus().toUpperCase()} Content`;
      document.body.insertBefore(banner, document.body.firstChild);
      document.body.style.paddingTop = '50px';
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showPreviewBanner);
  } else {
    showPreviewBanner();
  }
}
```

### API Request with publicationState
```javascript
async function apiRequest(endpoint, params = {}) {
  const queryParams = new URLSearchParams();
  
  // Add publicationState for preview mode
  if (isPreviewMode() && getPreviewStatus() === 'draft') {
    queryParams.append('publicationState', 'preview');
    console.log('[DEBUG] Added publicationState=preview');
  }
  
  // Add other params (sort, populate, filters)
  // ...
  
  const url = `${API_BASE}${endpoint}?${queryParams.toString()}`;
  console.log('[DEBUG] API Request URL:', url);
  
  const response = await fetch(url);
  return response.json();
}
```

---

## Common Pitfalls

### ❌ Pitfall 1: Using Wrong Parameter Name
```javascript
// Wrong - doesn't work in Strapi 5
queryParams.append('status', 'draft');

// Correct
queryParams.append('publicationState', 'preview');
```

### ❌ Pitfall 2: Assuming Nested Relations Include Drafts
```javascript
// Wrong - picks will only contain published items
GET /api/experts?populate=picks&publicationState=preview

// Correct - use custom controller to manually fetch draft picks
// See "Custom Controller for Nested Relations" above
```

### ❌ Pitfall 3: Entity Service Auto-Publishes
```javascript
// Wrong - creates published content
await strapi.entityService.create('api::pick.pick', { data: {...} });

// Correct - creates draft content
await strapi.documents('api::pick.pick').create({ data: {...} });
```

### ❌ Pitfall 4: DOM Not Ready for Banner
```javascript
// Wrong - may fail if body doesn't exist
document.body.insertBefore(banner, document.body.firstChild);

// Correct - check readyState first
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', showBanner);
} else {
  showBanner();
}
```

### ❌ Pitfall 5: Forgetting to Filter Published in Live Mode
```javascript
// Wrong - returns all picks in live mode
const picks = await strapi.documents('api::pick.pick').findMany({
  filters: { expert: { documentId: expert.documentId } }
});

// Correct - filter by published status
const picks = await strapi.documents('api::pick.pick').findMany({
  filters: { expert: { documentId: expert.documentId } },
  status: 'published' // Critical for live mode
});
```

---

## Testing Checklist

### Backend Tests

- [ ] Draft & Publish enabled in schema (`draftAndPublish: true`)
- [ ] Preview handler configured in `config/admin.js`
- [ ] Environment variables set (`CLIENT_URL`, `PREVIEW_SECRET`)
- [ ] Custom controller implements both preview and live modes
- [ ] Console logs show correct mode (PREVIEW vs LIVE)
- [ ] Test API directly:
  ```bash
  # Live mode - should return only published picks
  curl "http://localhost:1337/api/experts?sort=rank:asc&populate=avatar"
  
  # Preview mode - should return all picks including drafts
  curl "http://localhost:1337/api/experts?sort=rank:asc&populate=avatar&publicationState=preview"
  ```

### Frontend Tests

- [ ] Preview mode detection works (`isPreviewMode()` returns true)
- [ ] Preview banner appears on page load
- [ ] `publicationState=preview` added to API requests in preview mode
- [ ] Console logs show correct API URL with parameters
- [ ] Live page: `http://localhost:5500/tc/index.html` shows NO draft picks
- [ ] Preview page: `http://localhost:5500/tc/index.html?preview=true&status=draft` shows ALL picks
- [ ] No JavaScript errors in console (check `document.body` timing)

### CSV Import Tests

- [ ] CSV import uses Document Service API (`strapi.documents().create()`)
- [ ] Imported picks default to draft status
- [ ] Re-import after changing code to verify draft creation
- [ ] Check Strapi admin to confirm draft status
- [ ] Publish a few picks and verify they appear on live page
- [ ] Verify unpublished picks only appear in preview mode

### Cross-Browser Tests

- [ ] Preview banner renders correctly
- [ ] API requests include correct parameters
- [ ] Draft content visible in preview mode
- [ ] Published content visible in both modes
- [ ] No console errors across browsers

---

## Debug Commands

### Check Pick Status in Database
```bash
# Count total picks (including drafts)
curl -s "http://localhost:1337/api/picks?publicationState=preview" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f'Total picks: {len(data[\"data\"])}')"

# Check first pick details
curl -s "http://localhost:1337/api/picks?publicationState=preview" | python3 -m json.tool | head -50
```

### Test Expert API with Picks
```bash
# Live mode - published only
curl -s "http://localhost:1337/api/experts?sort=rank:asc&populate=avatar" | python3 -m json.tool

# Preview mode - all picks
curl -s "http://localhost:1337/api/experts?sort=rank:asc&populate=avatar&publicationState=preview" | python3 -m json.tool
```

### Frontend Debug Logs
Add to `strapi-api.js`:
```javascript
console.log('[DEBUG] Preview Mode:', isPreviewMode());
console.log('[DEBUG] Preview Status:', getPreviewStatus());
console.log('[DEBUG] API Request URL:', url);
```

---

## Key Takeaways

1. **Document Service API is mandatory** for Strapi 5 Draft & Publish
2. **publicationState parameter doesn't cascade** to nested relations - requires custom controller
3. **Always check DOM readyState** before manipulating document.body
4. **Two modes require two code paths**: preview mode (all content) vs live mode (published only)
5. **Console logging is essential** for debugging API requests and controller logic
6. **Test both modes separately** to ensure proper filtering

---

## Quick Reference

### URL Formats
- **Live**: `http://localhost:5500/tc/index.html`
- **Preview**: `http://localhost:5500/tc/index.html?preview=true&status=draft`

### API Parameters
- **Live**: No special parameters
- **Preview**: `?publicationState=preview`

### Key Files
- Schema: `Backend/src/api/pick/content-types/pick/schema.json`
- Controller: `Backend/src/api/expert/controllers/expert.js`
- Config: `Backend/config/admin.js`
- Frontend: `Frontend/assets/js/strapi-api.js`

### Console Log Patterns
```
[Expert Controller] Mode: PREVIEW
[Expert Controller] Preview - Expert John: 3 picks (all statuses)
[DEBUG] Preview Mode: true Status: draft
[DEBUG] Added publicationState=preview to query params
```

---

## Version Information
- **Strapi Version**: 5.28.0
- **Node Version**: 20.0.0
- **Date**: 2026-02-04
- **Project**: Racing Website with Expert Picks

---

## Additional Notes

### Performance Considerations
- Custom controller makes multiple database queries (one per expert for picks)
- Consider caching for production environments
- For large datasets, consider pagination and limiting results

### Security
- Validate `PREVIEW_SECRET` parameter if implementing secret-based preview
- Restrict preview access to authenticated users if needed
- Use environment variables for all sensitive configuration

### Future Improvements
- Implement preview token authentication
- Add preview expiration time
- Create admin UI toggle for bulk publish/unpublish
- Add audit logs for draft/publish actions
