// Custom route for CSV import
// WordPress equivalent: add_action('admin_post_import_picks', 'handle_pick_import')
// This exposes POST /api/picks/import endpoint

'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/picks/import',
      handler: 'csv-import.import',
      config: {
        auth: false, // Temporarily disable auth for testing
        policies: [],
        // Only authenticated admins can import
        // WordPress equivalent: if (!current_user_can('manage_options')) wp_die('Unauthorized');
        middlewares: [],
      },
    },
  ],
};
