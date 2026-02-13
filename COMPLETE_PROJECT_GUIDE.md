# Strapi 5 Racing Website - Complete Implementation Guide

## Project Overview
This comprehensive guide documents the implementation of a Strapi 5-based racing website with expert picks, draft/publish workflow, and preview functionality. It covers VPS deployment, component architecture, API implementation, and frontend integration.

**Project**: Racing Website with Expert Picks  
**Strapi Version**: 5.28.0  
**Node Version**: 20.0.0  
**Last Updated**: 2026-02-11

---

## Table of Contents
1. [VPS Setup & Environment Configuration](#vps-setup--environment-configuration)
2. [Component Architecture - BANKER/SEL Refactor](#component-architecture---bankersel-refactor)
3. [Draft & Publish with Preview Feature](#draft--publish-with-preview-feature)
4. [API Implementation](#api-implementation)
5. [Frontend Integration](#frontend-integration)
6. [CSV Import System](#csv-import-system)
7. [Testing & Troubleshooting](#testing--troubleshooting)
8. [Quick Reference](#quick-reference)

---

## VPS Setup & Environment Configuration

### Server Specifications
- **OS**: Ubuntu 22.04 LTS
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: Minimum 20GB SSD
- **CPU**: 2 cores minimum

### Initial Server Setup

#### 1. Update System Packages
```bash
# Update package list and upgrade existing packages
sudo apt update && sudo apt upgrade -y

# Install essential build tools
sudo apt install -y build-essential curl git wget
```

#### 2. Install Node.js (v20.x)
```bash
# Install Node.js 20.x using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x or higher
```

#### 3. Install PM2 Process Manager
```bash
# Install PM2 globally
sudo npm install -g pm2

# Configure PM2 to start on system boot
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER
```

#### 4. Install and Configure PostgreSQL
```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql

# Inside PostgreSQL prompt:
CREATE DATABASE strapi_racing;
CREATE USER strapi_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE strapi_racing TO strapi_user;
\q
```

#### 5. Install Nginx as Reverse Proxy
```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Allow firewall rules
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

### Strapi Project Deployment

#### 1. Clone and Setup Backend
```bash
# Navigate to deployment directory
cd /var/www

# Clone your repository (replace with your repo URL)
sudo git clone https://github.com/your-username/your-racing-project.git
sudo chown -R $USER:$USER racing-project
cd racing-project/Backend

# Install dependencies
npm install --production

# Create production environment file
nano .env
```

#### 2. Production Environment Variables
**File**: `Backend/.env`
```bash
# Server Configuration
HOST=0.0.0.0
PORT=1337
NODE_ENV=production

# Database Configuration (PostgreSQL)
DATABASE_CLIENT=postgres
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_NAME=strapi_racing
DATABASE_USERNAME=strapi_user
DATABASE_PASSWORD=your_secure_password
DATABASE_SSL=false

# Admin & API Configuration
ADMIN_JWT_SECRET=your_random_admin_jwt_secret_here
API_TOKEN_SALT=your_random_api_token_salt_here
APP_KEYS=your_random_app_keys_here_comma_separated
JWT_SECRET=your_random_jwt_secret_here
TRANSFER_TOKEN_SALT=your_random_transfer_token_salt_here

# Frontend URLs
CLIENT_URL=https://yourdomain.com
ADMIN_URL=https://admin.yourdomain.com

# Preview Configuration
PREVIEW_SECRET=your_secure_preview_secret_key

# Upload Configuration
UPLOAD_DIR=/var/www/racing-project/Backend/public/uploads
```

**Generate Secrets**:
```bash
# Generate random secrets
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### 3. Build Strapi Admin Panel
```bash
# Build the admin panel for production
cd /var/www/racing-project/Backend
NODE_ENV=production npm run build
```

#### 4. Configure PM2 for Strapi
```bash
# Create PM2 ecosystem file
nano ecosystem.config.js
```

**File**: `Backend/ecosystem.config.js`
```javascript
module.exports = {
  apps: [
    {
      name: 'strapi-racing',
      cwd: '/var/www/racing-project/Backend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 1337
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/pm2/strapi-error.log',
      out_file: '/var/log/pm2/strapi-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
```

```bash
# Start Strapi with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 list  # Verify it's running
```

### Nginx Configuration

#### 1. Configure Backend Reverse Proxy
**File**: `/etc/nginx/sites-available/strapi-backend`
```nginx
upstream strapi_backend {
    server 127.0.0.1:1337;
    keepalive 64;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    # Redirect HTTP to HTTPS (after SSL setup)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://strapi_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for large uploads
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }

    # Handle uploads
    location /uploads/ {
        alias /var/www/racing-project/Backend/public/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    client_max_body_size 100M;
}
```

#### 2. Configure Frontend Static Files
**File**: `/etc/nginx/sites-available/strapi-frontend`
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/racing-project/Frontend;
    index index.html;

    # Default language redirect
    location = / {
        return 302 /en/index.html;
    }

    # Serve static files
    location / {
        try_files $uri $uri/ =404;
        expires 1h;
        add_header Cache-Control "public";
    }

    # API proxy (if needed for CORS)
    location /api/ {
        proxy_pass http://127.0.0.1:1337;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

#### 3. Enable Sites and Test Configuration
```bash
# Create symbolic links to enable sites
sudo ln -s /etc/nginx/sites-available/strapi-backend /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/strapi-frontend /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### SSL/HTTPS Setup with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal is configured by default, test it:
sudo certbot renew --dry-run
```

### Monitoring and Maintenance

#### View Application Logs
```bash
# PM2 logs
pm2 logs strapi-racing
pm2 logs strapi-racing --lines 100

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u nginx -f
```

#### Restart Services
```bash
# Restart Strapi
pm2 restart strapi-racing

# Reload Nginx
sudo systemctl reload nginx

# Restart PostgreSQL
sudo systemctl restart postgresql
```

#### Update Deployment
```bash
# Pull latest changes
cd /var/www/racing-project
git pull origin main

# Update backend
cd Backend
npm install --production
NODE_ENV=production npm run build
pm2 restart strapi-racing

# Frontend files are served directly, no build needed
```

### Backup Strategy

#### Database Backup Script
**File**: `/home/$USER/backup-db.sh`
```bash
#!/bin/bash
BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
sudo -u postgres pg_dump strapi_racing | gzip > $BACKUP_DIR/strapi_racing_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "strapi_racing_*.sql.gz" -mtime +7 -delete

echo "Database backup completed: $BACKUP_DIR/strapi_racing_$DATE.sql.gz"
```

```bash
# Make executable
chmod +x /home/$USER/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add line: 0 2 * * * /home/$USER/backup-db.sh
```

#### Uploads Backup
```bash
# Backup uploads directory weekly
rsync -av --delete /var/www/racing-project/Backend/public/uploads/ /backups/uploads/
```

### Performance Optimization

#### Enable Redis Caching (Optional)
```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: maxmemory 256mb
# Set: maxmemory-policy allkeys-lru

# Restart Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

#### Configure Strapi Cache Plugin
```bash
cd /var/www/racing-project/Backend
npm install @strapi/plugin-redis-cache
```

**Update** `Backend/config/plugins.js`:
```javascript
module.exports = ({ env }) => ({
  'redis-cache': {
    enabled: true,
    config: {
      connection: {
        host: '127.0.0.1',
        port: 6379,
      },
      ttl: 3600, // 1 hour cache
    },
  },
});
```

### Security Checklist

- [x] PostgreSQL configured with strong password
- [x] Firewall enabled (UFW) with only necessary ports open
- [x] SSL/HTTPS configured with Let's Encrypt
- [x] Environment secrets generated with cryptographically secure random values
- [x] PM2 running as non-root user
- [x] Nginx security headers configured
- [x] Regular automated backups configured
- [x] SSH key-based authentication (disable password auth)
- [x] Fail2ban installed to prevent brute-force attacks

#### Additional Security Measures
```bash
# Install Fail2ban
sudo apt install -y fail2ban

# Disable SSH password authentication (after setting up SSH keys)
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart sshd

# Add security headers to Nginx
# Add to server block in Nginx config:
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
```

---

## Component Architecture - BANKER/SEL Refactor

### Overview
This section documents the major refactor from HTML-based pick lists to structured component fields. This allows non-technical admins to mark picks as BANKER (膽) or SEL (腳) using checkboxes instead of manually typing HTML tags.

### Problem Statement

**Old Approach** - HTML in Database:
```javascript
// ❌ Legacy implementation
{
  listEn: "<ul><li>Horse A <span>BANKER</span></li><li>Horse B <span>SEL</span></li></ul>",
  listTc: "<ul><li>馬A <span>BANKER</span></li><li>馬B <span>SEL</span></li></ul>"
}
```

**Issues**:
- No structured data for filtering/sorting
- HTML injection security risks
- Difficult to query or analyze
- Frontend must parse HTML tags
- Multiple CSV rows per race required manual HTML concatenation
- Error-prone for non-technical users

### Solution: Repeatable Component System

#### 1. Component Schema Definition
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

#### 2. Pick Schema Integration
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

### CSV Import Implementation

#### New CSV Format
**Multiple rows per race** (one row per pick item):
```csv
raceEn,raceTc,typeEn,typeTc,metaEn,metaTc,listEn,listTc,banker,sel,betLink,sort,expertName
"Race1","第1場","Win","獨贏","Meta EN","中文描述","11. MACANESE MASTER","11. 旺旺嘉駒",TRUE,FALSE,https://example.com,0,"Joseph"
"Race1","第1場","Win","獨贏","Meta EN","中文描述","1. EXCEED THE WISH","1. 星火燎原",FALSE,TRUE,https://example.com,0,"Joseph"
"Race1","第1場","Win","獨贏","Meta EN","中文描述","4. GENERAL SMART","4. 運來伍寶",FALSE,FALSE,https://example.com,0,"Joseph"
```

**Key Points**:
- Multiple rows per race create one pick with multiple list items
- `banker` column: Accepts `TRUE`, `true`, `1` = true, `FALSE`, `false`, `0` = false (case-insensitive)
- `sel` column: Accepts `TRUE`, `true`, `1` = true, `FALSE`, `false`, `0` = false (case-insensitive)
- Rows with same `raceEn + expertName` are grouped together
- `expertName` must match an existing expert's `nameEn` field exactly

#### Import Logic Flow
**File**: `Backend/src/api/pick/controllers/csv-import.js`

```javascript
// Step 1: Group CSV rows by race + expert
const pickGroupArray = [];
const pickGroupMap = new Map();

for (const row of results.data) {
  const groupKey = `${row.raceEn}-${row.expert}`;
  
  if (!pickGroupMap.has(groupKey)) {
    // First row - create new pick group
    pickGroupMap.set(groupKey, {
      raceEn: row.raceEn,
      raceTc: row.raceTc,
      listEnItems: [],
      listTcItems: [],
      // ... other fields
    });
  }
  
  const pickGroup = pickGroupMap.get(groupKey);
  
  // Step 2: Add list item to arrays
  pickGroup.listEnItems.push({
    text: row.listEn,
    banker: row.banker === '1' || row.banker === true,
    sel: row.sel === '1' || row.sel === true
  });
  
  pickGroup.listTcItems.push({
    text: row.listTc,
    banker: row.banker === '1' || row.banker === true,
    sel: row.sel === '1' || row.sel === true
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
1. **Group Rows**: Use `raceEn-expert` as unique key
2. **Build Arrays**: Each row adds one component to `listEnItems` and `listTcItems`
3. **Create Pick**: One pick entity with multiple list items
4. **Components Auto-Created**: Strapi handles component table inserts

### Frontend Rendering

#### Component to HTML Conversion
**File**: `Frontend/assets/js/strapi-api.js`

```javascript
// Helper function: Convert component items to formatted list with badges
const convertComponentsToList = (components, locale) => {
  if (!components || !Array.isArray(components) || components.length === 0) {
    return [];
  }
  
  return components.map(item => {
    const bannerLabel = locale === 'tc' ? '膽' : 'BANKER';
    const selLabel = locale === 'tc' ? '腳' : 'SEL';
    let displayText = item.text || '';
    
    // Add badge HTML if banker or sel is true
    if (item.banker) {
      displayText = `<span class="badge text-bg-primary me-1">${bannerLabel}</span>${displayText}`;
    }
    if (item.sel) {
      displayText = `<span class="badge text-bg-primary me-1">${selLabel}</span>${displayText}`;
    }
    
    return { text: displayText, banker: item.banker, sel: item.sel };
  });
};

// Usage in pick rendering
const processedPicks = picks.map(pick => {
  return {
    ...pick,
    listEn: convertComponentsToList(pick.listEnItems, 'en'),
    listTc: convertComponentsToList(pick.listTcItems, 'tc')
  };
});
```

#### Rendered HTML Example
```html
<span class="badge text-bg-primary me-1">膽</span>11. 旺旺嘉駒
<span class="badge text-bg-primary me-1">腳</span>1. 星火燎原
4. 運來伍寶
```

### Advantages of Component Approach

| Aspect | Old (HTML String) | New (Components) |
|--------|-------------------|------------------|
| **Data Structure** | Unstructured HTML | Structured objects |
| **Querying** | Impossible to filter | Can query by banker/sel |
| **Security** | HTML injection risk | Safe structured data |
| **CSV Import** | Manual HTML concatenation | Automatic array building |
| **Frontend** | Parse HTML tags | Direct property access |
| **Admin UI** | Manual HTML typing | Simple checkboxes |
| **Extensibility** | Add new HTML tags | Add new component fields |
| **Database** | Single text column | Normalized component table |
| **Validation** | None | Schema-enforced types |

### Database Schema

#### Components Table (Auto-generated)
```sql
CREATE TABLE components_pick_list_items (
  id INT PRIMARY KEY,
  text VARCHAR(255) NOT NULL,
  banker BOOLEAN DEFAULT false,
  sel BOOLEAN DEFAULT false
);
```

#### Pick-Component Linking Tables (Auto-generated)
```sql
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

### Component Data Flow

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

---

## Draft & Publish with Preview Feature

### Core Concepts

#### Draft & Publish System
- **Schema Setting**: Enable in content type schema with `draftAndPublish: true`
- **Default State**: Content created via Document Service API defaults to **draft** status
- **Entity Service vs Document Service**: 
  - Entity Service (legacy): Auto-publishes content
  - Document Service (Strapi 5): Respects draft/publish states

#### Preview Feature
- **Purpose**: View draft content before publishing
- **Configuration**: Located in `config/admin.js`
- **URL Parameters**: `?preview=true&status=draft`
- **Frontend Detection**: Check URL params to toggle draft content fetching

### Critical Findings

#### 1. Nested Relations Don't Inherit publicationState

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
    const publicationState = ctx.query.publicationState;
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

#### 2. Document Service API vs Entity Service API

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

#### 3. Frontend Parameter Requirements

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

#### 4. DOM Timing Issues

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
  "kind": "collectionType",
  "collectionName": "picks",
  "info": {
    "singularName": "pick",
    "pluralName": "picks",
    "displayName": "Pick"
  },
  "options": {
    "draftAndPublish": true
  },
  "attributes": {
    // ... your attributes
  }
}
```

#### 2. Configure Preview Handler
**File**: `Backend/config/admin.js`

```javascript
module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT'),
    },
  },
  url: env('ADMIN_URL', '/admin'),
  preview: {
    enabled: true,
    config: {
      allowedOrigins: env('CLIENT_URL', 'http://localhost:5500'),
      async handler(uid, { documentId, locale, status }) {
        const document = await strapi.documents(uid).findOne({ documentId });
        
        // Generate preview URL based on content type
        const clientUrl = env('CLIENT_URL');
        const previewSecret = env('PREVIEW_SECRET');
        
        let path = '';
        if (uid === 'api::pick.pick') {
          path = `/${locale}/index.html`;
        }
        
        return `${clientUrl}${path}?preview=true&secret=${previewSecret}&status=${status}`;
      }
    }
  }
});
```

#### 3. Custom Controller for Nested Relations
**File**: `Backend/src/api/expert/controllers/expert.js`

```javascript
const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::expert.expert', ({ strapi }) => ({
  async find(ctx) {
    const { query } = ctx;
    const publicationState = query.publicationState || ctx.query.publicationState;
    const shouldIncludeDrafts = publicationState === 'preview';
    
    console.log('[Expert Controller] Mode:', shouldIncludeDrafts ? 'PREVIEW' : 'LIVE');
    
    if (shouldIncludeDrafts) {
      // PREVIEW MODE: Include draft picks
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
            // No status filter - gets all picks including drafts
          });
          
          return { ...expert, picks: picks || [] };
        })
      );
      
      return expertsWithPicks;
    }
    
    // LIVE MODE: Only published picks
    const experts = await strapi.documents('api::expert.expert').findMany({
      status: 'published',
      sort: query.sort || 'rank:asc',
      populate: { avatar: true },
    });
    
    const expertsWithPicks = await Promise.all(
      experts.map(async (expert) => {
        const picks = await strapi.documents('api::pick.pick').findMany({
          filters: { expert: { documentId: expert.documentId } },
          status: 'published', // Critical: Only published picks
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
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#ffc107;color:#000;padding:10px;text-align:center;z-index:9999;font-weight:bold;';
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
  if (params.sort) queryParams.append('sort', params.sort);
  if (params.populate) {
    if (Array.isArray(params.populate)) {
      params.populate.forEach(p => queryParams.append('populate[]', p));
    } else {
      queryParams.append('populate', params.populate);
    }
  }
  
  const url = `${API_BASE}${endpoint}?${queryParams.toString()}`;
  console.log('[DEBUG] API Request URL:', url);
  
  const response = await fetch(url);
  return response.json();
}

// Usage example
async function loadExperts() {
  const data = await apiRequest('/api/experts', {
    sort: 'rank:asc',
    populate: 'avatar'
  });
  
  return data;
}
```

---

## CSV Import System

### CSV Format Specification

#### Current Format (Multiple Rows Per Pick)
```csv
raceEn,raceTc,typeEn,typeTc,metaEn,metaTc,listEn,banker,sel,listTc,expert
"Race 1","第1場","Win","獨贏","Race 1 tips","第1場貼士","11. MACANESE MASTER",1,0,"11. 旺旺嘉駒","Joseph"
"Race 1","第1場","Win","獨贏","Race 1 tips","第1場貼士","1. EXCEED THE WISH",0,1,"1. 星火燎原","Joseph"
"Race 1","第1場","Win","獨贏","Race 1 tips","第1場貼士","4. GENERAL SMART",0,0,"4. 運來伍寶","Joseph"
```

**Column Descriptions**:
- `raceEn/raceTc`: Race name (used for grouping)
- `typeEn/typeTc`: Pick type (e.g., Win, Place, Quinella)
- `metaEn/metaTc`: Additional metadata/description
- `listEn/listTc`: Individual pick text
- `banker`: Boolean flag (1=true, 0=false) - marks as BANKER/膽
- `sel`: Boolean flag (1=true, 0=false) - marks as SEL/腳
- `expert`: Expert name (must match existing expert in database)

### Import Controller
**File**: `Backend/src/api/pick/controllers/csv-import.js`

Key implementation details documented in Component Architecture section.

### Import Workflow

```
1. Upload CSV file via Strapi admin or API endpoint
   ↓
2. Validate expert names exist in database
   ↓
3. Group rows by race + expert combination
   ↓
4. Delete existing picks (if replace mode)
   ↓
5. Create new picks with component arrays
   ↓
6. Log results and return summary
```

---

## Testing & Troubleshooting

### Testing Checklist

#### Backend Tests

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

#### Frontend Tests

- [ ] Preview mode detection works (`isPreviewMode()` returns true)
- [ ] Preview banner appears on page load
- [ ] `publicationState=preview` added to API requests in preview mode
- [ ] Console logs show correct API URL with parameters
- [ ] Live page shows NO draft picks
- [ ] Preview page shows ALL picks including drafts
- [ ] No JavaScript errors in console (check `document.body` timing)

#### CSV Import Tests

- [ ] CSV import uses Document Service API (`strapi.documents().create()`)
- [ ] Imported picks default to draft status
- [ ] Component arrays properly populated (listEnItems, listTcItems)
- [ ] Banker and SEL flags correctly set from CSV
- [ ] Check Strapi admin to confirm draft status and component data
- [ ] Publish a few picks and verify they appear on live page
- [ ] Verify unpublished picks only appear in preview mode

#### Component Rendering Tests

- [ ] BANKER badge displays correctly (膽 in TC, BANKER in EN)
- [ ] SEL badge displays correctly (腳 in TC, SEL in EN)
- [ ] Bootstrap badge styling applied correctly
- [ ] Picks without badges display normally
- [ ] Component order preserved as entered

### Common Pitfalls

#### ❌ Pitfall 1: Using Wrong Parameter Name
```javascript
// Wrong - doesn't work in Strapi 5
queryParams.append('status', 'draft');

// Correct
queryParams.append('publicationState', 'preview');
```

#### ❌ Pitfall 2: Assuming Nested Relations Include Drafts
```javascript
// Wrong - picks will only contain published items
GET /api/experts?populate=picks&publicationState=preview

// Correct - use custom controller to manually fetch draft picks
// See "Custom Controller for Nested Relations" section
```

#### ❌ Pitfall 3: Entity Service Auto-Publishes
```javascript
// Wrong - creates published content
await strapi.entityService.create('api::pick.pick', { data: {...} });

// Correct - creates draft content
await strapi.documents('api::pick.pick').create({ data: {...} });
```

#### ❌ Pitfall 4: DOM Not Ready for Banner
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

#### ❌ Pitfall 5: Forgetting to Filter Published in Live Mode
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

#### ❌ Pitfall 6: Wrong Component Populate Syntax
```javascript
// Wrong - string populate
populate: 'listEnItems,listTcItems'

// Correct - array populate
populate: ['listEnItems', 'listTcItems']

// Or object populate
populate: { listEnItems: true, listTcItems: true }
```

#### ❌ Pitfall 7: Case-Sensitive Boolean Values in CSV
```csv
# Wrong - uppercase TRUE/FALSE won't work with old import code
Race1,第1場,...,TRUE,FALSE,Joseph

# Fixed - the import now handles both uppercase and lowercase
Race1,第1場,...,TRUE,FALSE,Joseph   # Works
Race1,第1場,...,true,false,Joseph   # Works  
Race1,第1場,...,1,0,Joseph          # Works
```

**Issue**: CSV files exported from Excel often have `TRUE`/`FALSE` (uppercase), but older import code only checked for lowercase `'true'`/`'false'`.

**Solution**: The import controller now uses `.toLowerCase()` to convert strings before comparison, accepting `TRUE`, `true`, `1`, or boolean `true`.

### Debug Commands

#### Check Pick Status in Database
```bash
# Count total picks (including drafts)
curl -s "http://localhost:1337/api/picks?publicationState=preview" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f'Total picks: {len(data[\"data\"])}')"

# Check first pick details
curl -s "http://localhost:1337/api/picks?publicationState=preview&populate[listEnItems]=true&populate[listTcItems]=true" | python3 -m json.tool | head -100
```

#### Test Expert API with Picks
```bash
# Live mode - published only
curl -s "http://localhost:1337/api/experts?sort=rank:asc&populate=avatar" | python3 -m json.tool

# Preview mode - all picks
curl -s "http://localhost:1337/api/experts?sort=rank:asc&populate=avatar&publicationState=preview" | python3 -m json.tool
```

#### Frontend Debug Logs
Add to `strapi-api.js`:
```javascript
console.log('[DEBUG] Preview Mode:', isPreviewMode());
console.log('[DEBUG] Preview Status:', getPreviewStatus());
console.log('[DEBUG] API Request URL:', url);
console.log('[DEBUG] Response Data:', data);
```

#### Check PM2 Logs (Production)
```bash
# View real-time logs
pm2 logs strapi-racing

# View last 100 lines
pm2 logs strapi-racing --lines 100

# View only errors
pm2 logs strapi-racing --err
```

---

## Quick Reference

### URL Formats
- **Live**: `http://localhost:5500/tc/index.html`
- **Preview**: `http://localhost:5500/tc/index.html?preview=true&status=draft`
- **Production Live**: `https://yourdomain.com/tc/index.html`
- **Production Preview**: `https://yourdomain.com/tc/index.html?preview=true&status=draft`

### API Parameters
- **Live Mode**: No special parameters, returns only published content
- **Preview Mode**: `?publicationState=preview` returns all content including drafts

### Important Files

#### Backend
- **Pick Schema**: `Backend/src/api/pick/content-types/pick/schema.json`
- **List Item Component**: `Backend/src/components/pick/list-item.json`
- **Expert Controller**: `Backend/src/api/expert/controllers/expert.js`
- **CSV Import**: `Backend/src/api/pick/controllers/csv-import.js`
- **Admin Config**: `Backend/config/admin.js`
- **Environment**: `Backend/.env`
- **PM2 Config**: `Backend/ecosystem.config.js`

#### Frontend
- **API Service**: `Frontend/assets/js/strapi-api.js`
- **Data Loader**: `Frontend/assets/js/strapi-data-loader.js`
- **Index Pages**: `Frontend/en/index.html`, `Frontend/tc/index.html`

#### Server
- **Nginx Backend**: `/etc/nginx/sites-available/strapi-backend`
- **Nginx Frontend**: `/etc/nginx/sites-available/strapi-frontend`
- **Backup Script**: `/home/$USER/backup-db.sh`

### Console Log Patterns

#### Backend (Strapi)
```
[Expert Controller] Mode: PREVIEW
[Expert Controller] Preview - Expert Joseph: 3 picks (all statuses)
[Expert Controller] Mode: LIVE
[Expert Controller] Live - Expert Joseph: 2 picks (published only)
```

#### Frontend (Browser)
```
[DEBUG] Preview Mode: true
[DEBUG] Preview Status: draft
[DEBUG] Added publicationState=preview to query params
[DEBUG] API Request URL: http://localhost:1337/api/experts?sort=rank:asc&populate=avatar&publicationState=preview
```

### Environment Variables Reference

```bash
# Server
HOST=0.0.0.0
PORT=1337
NODE_ENV=production

# Database (PostgreSQL)
DATABASE_CLIENT=postgres
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_NAME=strapi_racing
DATABASE_USERNAME=strapi_user
DATABASE_PASSWORD=your_secure_password

# Strapi Secrets (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
ADMIN_JWT_SECRET=your_random_secret
API_TOKEN_SALT=your_random_salt
APP_KEYS=key1,key2,key3,key4
JWT_SECRET=your_random_jwt_secret
TRANSFER_TOKEN_SALT=your_random_token_salt

# URLs
CLIENT_URL=https://yourdomain.com
ADMIN_URL=https://admin.yourdomain.com

# Preview
PREVIEW_SECRET=your_secure_preview_secret
```

### Migration Checklist (Old Project to New)

- [ ] Backup existing database
- [ ] Update Node.js to v20.x
- [ ] Update Strapi to 5.x
- [ ] Create list-item component schema
- [ ] Update pick schema to use components
- [ ] Restart Strapi to generate component tables
- [ ] Update CSV import controller
- [ ] Test CSV import with new format
- [ ] Update frontend rendering for components
- [ ] Enable draft & publish in schema
- [ ] Configure preview handler
- [ ] Create custom expert controller
- [ ] Update frontend for preview mode
- [ ] Test live mode (published only)
- [ ] Test preview mode (all content)
- [ ] Deploy to VPS with PM2
- [ ] Configure Nginx reverse proxy
- [ ] Setup SSL with Let's Encrypt
- [ ] Configure automated backups
- [ ] Monitor logs for errors

---

## Performance Optimization

### Backend Optimizations

1. **Enable Redis Caching** (see VPS Setup section)
2. **Database Indexing**:
   ```sql
   CREATE INDEX idx_picks_expert ON picks(expert_id);
   CREATE INDEX idx_picks_published_at ON picks(published_at);
   CREATE INDEX idx_picks_status ON picks(status);
   ```
3. **Query Optimization**: Use select fields to limit returned data
   ```javascript
   strapi.documents('api::pick.pick').findMany({
     fields: ['raceEn', 'raceTc'], // Only needed fields
     populate: ['listEnItems', 'listTcItems']
   });
   ```

### Frontend Optimizations

1. **Lazy Load Images**: Use `loading="lazy"` attribute
2. **Minify Assets**: Compress CSS/JS files
3. **Enable Gzip**: Configured in Nginx (see VPS Setup)
4. **Browser Caching**: Set cache headers (configured in Nginx)
5. **CDN**: Consider using CDN for static assets

---

## Security Best Practices

### Backend Security

1. **Environment Secrets**: Never commit `.env` file to git
2. **CORS Configuration**: Restrict allowed origins
   ```javascript
   // Backend/config/middlewares.js
   module.exports = [
     {
       name: 'strapi::cors',
       config: {
         origin: ['https://yourdomain.com', 'https://admin.yourdomain.com'],
         methods: ['GET', 'POST', 'PUT', 'DELETE'],
       },
     },
   ];
   ```
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **Input Validation**: Validate all CSV import data
5. **SQL Injection**: Use parameterized queries (handled by Strapi ORM)

### Frontend Security

1. **XSS Prevention**: Sanitize user-generated content
2. **HTTPS Only**: Always use HTTPS in production
3. **Content Security Policy**: Add CSP headers in Nginx
4. **Secret Validation**: Validate preview secret token
   ```javascript
   function isValidPreview() {
     const urlParams = new URLSearchParams(window.location.search);
     const secret = urlParams.get('secret');
     return secret === EXPECTED_PREVIEW_SECRET; // Load from config
   }
   ```

---

## Maintenance & Monitoring

### Regular Maintenance Tasks

- **Daily**: Check PM2 status and logs
- **Weekly**: Review error logs, backup database
- **Monthly**: Update dependencies, security patches
- **Quarterly**: Performance review, cleanup old data

### Monitoring Setup

```bash
# Install monitoring tools
npm install -g pm2-logrotate
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### Health Check Endpoint
**File**: `Backend/src/api/health/routes/health.js`

```javascript
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/health',
      handler: 'health.check',
      config: {
        auth: false,
      },
    },
  ],
};
```

**File**: `Backend/src/api/health/controllers/health.js`

```javascript
module.exports = {
  async check(ctx) {
    ctx.body = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  },
};
```

---

## Additional Resources

### Documentation Links
- [Strapi 5 Documentation](https://docs.strapi.io/dev-docs/intro)
- [Document Service API](https://docs.strapi.io/dev-docs/api/document-service)
- [Draft & Publish](https://docs.strapi.io/user-docs/content-manager/saving-and-publishing-content)
- [Components](https://docs.strapi.io/dev-docs/backend-customization/models#components)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Documentation](https://nginx.org/en/docs/)

### Support & Community
- Strapi Discord: [https://discord.strapi.io/](https://discord.strapi.io/)
- Strapi Forum: [https://forum.strapi.io/](https://forum.strapi.io/)
- GitHub Issues: [https://github.com/strapi/strapi/issues](https://github.com/strapi/strapi/issues)

---

## Changelog

### 2026-02-11
- Added comprehensive VPS setup and deployment section
- Documented Nginx configuration for reverse proxy
- Added PM2 process management guide
- Included PostgreSQL setup instructions
- Added SSL/HTTPS configuration with Let's Encrypt
- Documented backup strategies
- Added monitoring and maintenance procedures

### 2026-02-04
- Initial documentation of Draft & Publish feature
- Custom controller implementation for nested relations
- Preview mode frontend integration
- Testing and troubleshooting guide

### 2026-01-15
- Major refactor to component-based architecture
- Implemented BANKER/SEL system with checkboxes
- Updated CSV import to support new format
- Frontend rendering with Bootstrap badges

---

## Appendix A: Sample Files

### Sample CSV File
**File**: `picks-new-format-sample.csv`

```csv
raceEn,raceTc,typeEn,typeTc,metaEn,metaTc,listEn,banker,sel,listTc,expert
"Race 1","第1場","Win","獨贏","Race 1 analysis","第1場分析","11. MACANESE MASTER",1,0,"11. 旺旺嘉駒","Joseph"
"Race 1","第1場","Win","獨贏","Race 1 analysis","第1場分析","1. EXCEED THE WISH",0,1,"1. 星火燎原","Joseph"
"Race 1","第1場","Win","獨贏","Race 1 analysis","第1場分析","4. GENERAL SMART",0,0,"4. 運來伍寶","Joseph"
"Race 2","第2場","Place","位置","Race 2 tips","第2場貼士","5. SUPER WIN",1,0,"5. 超級勝利","Joseph"
"Race 2","第2場","Place","位置","Race 2 tips","第2場貼士","8. FAST RUNNER",0,1,"8. 快速奔跑","Joseph"
```

### Sample Nginx Configuration Snippet
```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://127.0.0.1:1337;
        # ... other proxy settings
    }
}
```

---

## Appendix B: Useful Commands

### Development Commands
```bash
# Start Strapi in development mode
cd Backend
npm run develop

# Build admin panel
npm run build

# Start in production mode
NODE_ENV=production npm start
```

### Database Commands
```bash
# Connect to PostgreSQL
sudo -u postgres psql

# List databases
\l

# Connect to strapi database
\c strapi_racing

# List tables
\dt

# Describe picks table
\d picks

# Query picks count
SELECT COUNT(*) FROM picks;

# Query draft picks
SELECT id, race_en, published_at FROM picks WHERE published_at IS NULL;
```

### Server Maintenance Commands
```bash
# Check disk space
df -h

# Check memory usage
free -h

# View running processes
htop

# Check Nginx status
sudo systemctl status nginx

# Check PostgreSQL status
sudo systemctl status postgresql

# View PM2 processes
pm2 list

# Restart all PM2 processes
pm2 restart all

# View system logs
sudo journalctl -xe
```

---

**End of Complete Project Guide**
