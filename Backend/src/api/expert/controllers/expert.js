'use strict';

/**
 * expert controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::expert.expert', ({ strapi }) => ({
  // Override find to support publicationState for nested picks
  async find(ctx) {
    try {
      const { query } = ctx;
      
      // Check if publicationState is set to preview (for draft content)
      const publicationState = query.publicationState || ctx.query.publicationState;
      const shouldIncludeDrafts = publicationState === 'preview';
      
      console.log('[Expert Controller] Mode:', shouldIncludeDrafts ? 'PREVIEW' : 'LIVE');
      
      // Fetch experts (always published)
      const experts = await strapi.documents('api::expert.expert').findMany({
        status: 'published',
        sort: query.sort || 'rank:asc',
        populate: { avatar: true },
      });
      
      console.log(`[Expert Controller] Found ${experts.length} experts`);
      
      // Helper function to fetch picks with appropriate filters
      const fetchPicksForExpert = async (expert) => {
        try {
          const pickFilters = {
            filters: {
              expert: { documentId: expert.documentId }
            },
            sort: 'sort:asc',
            populate: {
              listEnItems: true,
              listTcItems: true,
            },
          };
          
          // Add status filter only in live mode
          if (!shouldIncludeDrafts) {
            pickFilters.status = 'published';
          }
          
          const picks = await strapi.documents('api::pick.pick').findMany(pickFilters);
          
          console.log(`[Expert Controller] ${expert.nameEn}: ${picks.length} picks`);
          
          return {
            ...expert,
            picks: picks || []
          };
        } catch (error) {
          console.error(`[Expert Controller] Error fetching picks for ${expert.nameEn}:`, error.message);
          return {
            ...expert,
            picks: []
          };
        }
      };
      
      // Fetch picks for all experts
      const expertsWithPicks = await Promise.all(
        experts.map(fetchPicksForExpert)
      );
      
      return expertsWithPicks;
    } catch (error) {
      console.error('[Expert Controller] Error:', error);
      throw error;
    }
  },
}));

