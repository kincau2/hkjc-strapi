'use strict';

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    // Initialize default tags
    const defaultTags = [
      { key: 'racing-kickstarter', value: '投注初體驗' },
      { key: 'basics-to-racing', value: '賽馬基礎' },
      { key: 'bet-type', value: '投注種類大全' },
      { key: 'betting-strategy', value: '投注攻略' },
      { key: 'horse-jockey-trainer', value: '馬匹與騎練指南' },
      { key: 'simulcast-racing', value: '越洋賽事精讀' }
    ];

    try {
      for (const tagData of defaultTags) {
        // Check if tag already exists
        const existingTag = await strapi.db.query('api::tag.tag').findOne({
          where: { key: tagData.key }
        });

        if (!existingTag) {
          await strapi.db.query('api::tag.tag').create({
            data: tagData
          });
          strapi.log.info(`Created default tag: ${tagData.key} - ${tagData.value}`);
        }
      }
    } catch (error) {
      strapi.log.error('Error initializing default tags:', error);
    }
  },
};

