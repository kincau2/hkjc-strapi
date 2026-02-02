'use strict';

/**
 * pick service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::pick.pick');

