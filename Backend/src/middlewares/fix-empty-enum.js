'use strict';

/**
 * Middleware to fix empty enumeration fields before validation
 * Converts empty strings to undefined for optional enumeration fields
 */
module.exports = () => {
  return async (ctx, next) => {
    // Process requests for racing-academy (both REST API and Content Manager)
    const isRacingAcademyRequest = 
      ctx.request.url.includes('/api/racing-academies') ||
      ctx.request.url.includes('/content-manager/collection-types/api::racing-academy.racing-academy') ||
      ctx.request.url.includes('racing-academy');
    
    if (isRacingAcademyRequest && ['POST', 'PUT', 'PATCH'].includes(ctx.request.method)) {
      // Handle different request body structures
      if (ctx.request.body?.data) {
        // Handle tags field (now supports array)
        if (ctx.request.body.data.tags === '' || ctx.request.body.data.tags === null || ctx.request.body.data.tags === undefined) {
          delete ctx.request.body.data.tags;
        } else if (Array.isArray(ctx.request.body.data.tags) && ctx.request.body.data.tags.length === 0) {
          // Remove empty arrays
          delete ctx.request.body.data.tags;
        }
      }
      
      // Also check nested data structure (Content Manager sometimes uses this)
      if (ctx.request.body?.data?.attributes) {
        if (ctx.request.body.data.attributes.tags === '' || ctx.request.body.data.attributes.tags === null || ctx.request.body.data.attributes.tags === undefined) {
          delete ctx.request.body.data.attributes.tags;
        } else if (Array.isArray(ctx.request.body.data.attributes.tags) && ctx.request.body.data.attributes.tags.length === 0) {
          // Remove empty arrays
          delete ctx.request.body.data.attributes.tags;
        }
      }
      
      // Handle root level body (some API formats)
      if (ctx.request.body?.tags === '' || ctx.request.body?.tags === null) {
        delete ctx.request.body.tags;
      } else if (Array.isArray(ctx.request.body?.tags) && ctx.request.body.tags.length === 0) {
        delete ctx.request.body.tags;
      }
    }
    
    await next();
  };
};

