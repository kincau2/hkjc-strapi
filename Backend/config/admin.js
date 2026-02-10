module.exports = ({ env }) => ({
  auth: {
    secret: env("ADMIN_JWT_SECRET"),
  },
  apiToken: {
    salt: env("API_TOKEN_SALT"),
  },
  transfer: {
    token: {
      salt: env("TRANSFER_TOKEN_SALT"),
    },
  },
  flags: {
    nps: env.bool("FLAG_NPS", true),
    promoteEE: env.bool("FLAG_PROMOTE_EE", true),
  },
  rateLimit: {
    enabled: false,
  },
  
  // Preview Configuration
  preview: {
    enabled: true,
    config: {
      allowedOrigins: env("CLIENT_URL", "http://localhost:5500"),
      
      async handler(uid, { documentId, locale, status }) {
        // Fetch the document from Strapi
        const document = await strapi.documents(uid).findOne({ documentId });
        
        if (!document) return null;
        
        // Generate preview URL based on content type
        let pathname = null;
        
        switch (uid) {
          case "api::pick.pick": {
            // For picks, redirect to expert profile page with preview parameter
            // Get the expert relation
            const expert = document.expert;
            if (expert && expert.profileLinkEn) {
              // Extract expert slug or ID from profileLink
              pathname = `${expert.profileLinkEn}?preview=true&pickId=${document.id}`;
            } else {
              // Fallback: show picks on homepage with highlight
              pathname = `/index.html?preview=true&pickId=${document.id}`;
            }
            break;
          }
          
          default:
            return null; // Disable preview for other content types
        }
        
        if (!pathname) return null;
        
        // Build complete preview URL
        const clientUrl = env("CLIENT_URL", "http://localhost:1337");
        const previewSecret = env("PREVIEW_SECRET", "preview-secret-key");
        
        // Add status parameter to distinguish draft vs published
        const urlParams = new URLSearchParams({
          preview: "true",
          secret: previewSecret,
          status: status || "draft"
        });
        
        // Use proper separator: & if pathname already has ?, otherwise use ?
        const separator = pathname.includes("?") ? "&" : "?";
        return `${clientUrl}${pathname}${separator}${urlParams.toString()}`;
      }
    }
  }
});
