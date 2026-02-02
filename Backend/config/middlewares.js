module.exports = ({ env }) => [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            'dl.airtable.com',
            'res.cloudinary.com',
          ],
          'media-src': [
            "'self'",
            'data:',
            'blob:',
            'dl.airtable.com',
            'res.cloudinary.com',
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    // config: {
    //   enabled: true,
    //   origin: env.array('CORS_ORIGIN', ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:5500', 'file://']),
    //   headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
    // },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  {
    name: 'global::fix-empty-enum',
    config: {},
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
  // {
  //   name: 'global::redirect-after-login',
  // },
];

