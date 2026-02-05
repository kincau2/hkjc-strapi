'use strict';

/**
 * expert controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::expert.expert', ({ strapi }) => ({
  // Override find to support publicationState for nested picks
  async find(ctx) {
    const { query } = ctx;
    
    // Check if publicationState is set to preview (for draft content)
    const publicationState = query.publicationState || ctx.query.publicationState;
    const shouldIncludeDrafts = publicationState === 'preview';
    
    console.log('[Expert Controller] publicationState:', publicationState, 'shouldIncludeDrafts:', shouldIncludeDrafts);
    
    // Use Document Service API for draft support
    if (shouldIncludeDrafts) {
      // PREVIEW MODE: Fetch experts with draft picks
      const experts = await strapi.documents('api::expert.expert').findMany({
        status: 'published', // Only get published experts
        sort: query.sort || 'rank:asc',
        populate: {
          avatar: true,
        },
      });
      
      console.log('[Expert Controller] Preview Mode - Found experts:', experts.length);
      
      // Manually fetch picks for each expert (including drafts)
      const expertsWithPicks = await Promise.all(
        experts.map(async (expert) => {
          const picks = await strapi.documents('api::pick.pick').findMany({
            filters: {
              expert: {
                documentId: expert.documentId
              }
            },
            sort: 'sort:asc',
            populate: {
              listEnItems: true,
              listTcItems: true,
            },
            // Don't filter by status - get ALL picks (drafts + published)
          });
          
          console.log(`[Expert Controller] Preview - Expert ${expert.nameEn}: ${picks.length} picks (all statuses)`);
          
          return {
            ...expert,
            picks: picks || []
          };
        })
      );
      
      return expertsWithPicks;
    }
    
    // LIVE MODE: Default behavior for published content ONLY
    console.log('[Expert Controller] Live Mode - Fetching published content only');
    
    const experts = await strapi.documents('api::expert.expert').findMany({
      status: 'published', // Only published experts
      sort: query.sort || 'rank:asc',
      populate: {
        avatar: true,
      },
    });
    
    console.log('[Expert Controller] Live Mode - Found experts:', experts.length);
    
    // Manually fetch ONLY PUBLISHED picks for each expert
    const expertsWithPicks = await Promise.all(
      experts.map(async (expert) => {
        const picks = await strapi.documents('api::pick.pick').findMany({
          filters: {
            expert: {
              documentId: expert.documentId
            }
          },
          status: 'published', // CRITICAL: Only published picks
          sort: 'sort:asc',
          populate: {
            listEnItems: true,
            listTcItems: true,
          },
        });
        
        console.log(`[Expert Controller] Live - Expert ${expert.nameEn}: ${picks.length} picks (published only)`);
        
        return {
          ...expert,
          picks: picks || []
        };
      })
    );
    
    return expertsWithPicks;
  },
}));


// module.exports = createCoreController('api::expert.expert', ({ strapi }) => ({
//   async find(ctx) {
//     const { query } = ctx;

//     const { results, pagination } = await strapi.entityService.findPage('api::expert.expert', {
//       ...query,
//       populate: {
//         picks: {
//           sort: { sort: 'asc' },
//         },
//         ...(query.populate || {}),
//       },
//     });
//     console.log('results',query, results);
//     const sanitizedResults = await this.sanitizeOutput(results, ctx);

//     return this.transformResponse(sanitizedResults, { pagination });
//   },
//   async findOne(ctx) {
//     const { id } = ctx.params;
//     const { query } = ctx;

//     const entity = await strapi.entityService.findOne('api::expert.expert', id, {
//       ...query,
//       populate: {
//         picks: {
//           sort: { sort: 'asc' },
//         },
//         ...(query.populate || {}),
//       },
//     });

//     const sanitizedEntity = await this.sanitizeOutput(entity, ctx);

//     return this.transformResponse(sanitizedEntity);
//   },
// }));

