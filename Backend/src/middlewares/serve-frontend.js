const path = require('path');
const fs = require('fs');

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    // Only serve frontend files for specific paths
    if (ctx.path.startsWith('/en/') || ctx.path.startsWith('/tc/') || ctx.path.startsWith('/assets/')) {
      const frontendPath = path.join(__dirname, '../../../Frontend');
      // Decode URL-encoded path (e.g., %20 -> space)
      const decodedPath = decodeURIComponent(ctx.path);
      const filePath = path.join(frontendPath, decodedPath);
      
      try {
        // Check if file exists
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          // Set proper content type
          const ext = path.extname(filePath);
          const contentTypes = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.ttf': 'font/ttf',
          };
          
          ctx.type = contentTypes[ext] || 'application/octet-stream';
          ctx.body = fs.createReadStream(filePath);
          return;
        }
      } catch (error) {
        strapi.log.error('Error serving frontend file:', error);
      }
    }
    
    await next();
  };
};
