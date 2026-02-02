'use strict';

/**
 * expert controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
module.exports = createCoreController('api::expert.expert');


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

