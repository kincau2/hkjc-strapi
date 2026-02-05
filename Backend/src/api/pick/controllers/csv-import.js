// CSV Import Controller for Pick content type
// WordPress equivalent: add_action('wp_ajax_import_picks_csv', 'handle_pick_import')

'use strict';

module.exports = {
  // Similar to wp_ajax_ handler in WordPress
  async import(ctx) {
    try {
      console.log('=== CSV Import Request ===');
      console.log('ctx.request.body:', ctx.request.body);
      console.log('ctx.request.files:', ctx.request.files);
      console.log('ctx.request.body.data:', ctx.request.body?.data);
      console.log('ctx.request.body.files:', ctx.request.body?.files);
      
      const { files } = ctx.request;
      
      // Check file upload - like if ( empty($_FILES['file']) )
      if (!files || !files.file) {
        console.log('Error: No file uploaded');
        console.log('Available keys in ctx.request:', Object.keys(ctx.request));
        return ctx.badRequest('No file uploaded. Received: ' + JSON.stringify(Object.keys(ctx.request)));
      }
      
      console.log('File received:', files.file);

      const file = files.file;
      const fs = require('fs');
      const csv = require('csv-parser');
      
      // Use filepath property (Strapi v5 uses formidable which provides filepath)
      const filePath = file.filepath || file.path;
      console.log('Reading from path:', filePath);
      
      // Read CSV file
      const results = [];
      
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', resolve)
          .on('error', reject);
      });

      // VALIDATION PHASE: Check all expert names BEFORE deleting anything
      console.log('=== Starting Validation Phase ===');
      const invalidExperts = [];
      const expertCache = {}; // Cache to avoid duplicate queries
      
      for (let i = 0; i < results.length; i++) {
        const row = results[i];
        if (row.expertName) {
          // Check cache first
          if (expertCache[row.expertName] === undefined) {
            const expert = await strapi.db.query('api::expert.expert').findOne({
              where: { nameEn: row.expertName }
            });
            expertCache[row.expertName] = expert;
          }
          
          // If expert not found, record the error
          if (!expertCache[row.expertName]) {
            invalidExperts.push({
              row: i + 2, // +2 because: +1 for header row, +1 for 1-based indexing
              expertName: row.expertName,
              race: row.raceEn || 'Unknown'
            });
          }
        }
      }
      
      // If validation failed, return error WITHOUT deleting anything
      if (invalidExperts.length > 0) {
        const errorDetails = invalidExperts.map(e => 
          `Row ${e.row}: Expert "${e.expertName}" not found (Race: ${e.race})`
        ).join('\n');
        
        console.error('Validation failed:', errorDetails);
        return ctx.badRequest(
          `CSV validation failed. Please fix the following expert names:\n\n${errorDetails}\n\nNo data was imported or deleted.`
        );
      }
      
      console.log('✓ Validation passed - all expert names are valid');

      // GROUP ROWS BY RACE/EXPERT: Multiple rows now represent one pick
      console.log('=== Grouping rows by race and expert ===');
      const pickGroups = {};
      
      for (const row of results) {
        // Create unique key for each race+expert combination
        const expertId = row.expertName && expertCache[row.expertName] 
          ? expertCache[row.expertName].id 
          : 'no-expert';
        const groupKey = `${row.raceEn}|${row.raceTc}|${expertId}`;
        
        if (!pickGroups[groupKey]) {
          // Initialize new pick group with race details
          pickGroups[groupKey] = {
            raceEn: row.raceEn || '',
            raceTc: row.raceTc || '',
            typeEn: row.typeEn || '',
            typeTc: row.typeTc || '',
            metaEn: row.metaEn || '',
            metaTc: row.metaTc || '',
            betLink: row.betLink || '',
            sort: parseInt(row.sort) || 0,
            hasPublished: row.hasPublished === 'true' || row.hasPublished === '1',
            expertId: expertId !== 'no-expert' ? expertId : null,
            listEnItems: [],
            listTcItems: []
          };
        }
        
        // Add pick item to the group
        if (row.listEn) {
          pickGroups[groupKey].listEnItems.push({
            text: row.listEn.trim(),
            banker: row.banker === 'true' || row.banker === '1' || row.banker === true,
            sel: row.sel === 'true' || row.sel === '1' || row.sel === true
          });
        }
        
        if (row.listTc) {
          pickGroups[groupKey].listTcItems.push({
            text: row.listTc.trim(),
            banker: row.banker === 'true' || row.banker === '1' || row.banker === true,
            sel: row.sel === 'true' || row.sel === '1' || row.sel === true
          });
        }
      }

      // IMPORT PHASE: Delete existing picks and import grouped data
      const existingPicks = await strapi.db.query('api::pick.pick').findMany();
      
      console.log(`Deleting ${existingPicks.length} existing picks...`);
      for (const pick of existingPicks) {
        await strapi.db.query('api::pick.pick').delete({ where: { id: pick.id } });
      }

      // Import grouped picks
      const pickGroupArray = Object.values(pickGroups);
      console.log(`Importing ${pickGroupArray.length} picks (from ${results.length} CSV rows)...`);
      
      // Helper function to convert | to actual line breaks for meta fields
      const convertPipeToLineBreak = (text) => {
        if (!text) return '';
        return text.replace(/\|/g, '\n');
      };
      
      for (const pickData of pickGroupArray) {
        // Create Pick record as DRAFT using Document Service API (Strapi 5)
        // Document Service properly handles draft/publish state
        await strapi.documents('api::pick.pick').create({
          data: {
            raceEn: pickData.raceEn,
            raceTc: pickData.raceTc,
            typeEn: pickData.typeEn,
            typeTc: pickData.typeTc,
            metaEn: convertPipeToLineBreak(pickData.metaEn),
            metaTc: convertPipeToLineBreak(pickData.metaTc),
            // Component fields with banker/sel
            listEnItems: pickData.listEnItems,
            listTcItems: pickData.listTcItems,
            betLink: pickData.betLink,
            sort: pickData.sort,
            hasPublished: pickData.hasPublished,
            expert: pickData.expertId
          }
        });
      }

      // WordPress equivalent: wp_send_json_success(['message' => '...', 'count' => ...])
      return ctx.send({
        message: `Successfully imported ${pickGroupArray.length} picks from ${results.length} CSV rows`,
        pickCount: pickGroupArray.length,
        rowCount: results.length
      });
      
    } catch (error) {
      console.error('CSV Import Error:', error);
      // WordPress equivalent: wp_send_json_error($e->getMessage(), 400)
      return ctx.badRequest(`Import failed: ${error.message}`);
    }
  }
};
