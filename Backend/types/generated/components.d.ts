import type { Schema, Struct } from '@strapi/strapi';

export interface PickListItem extends Struct.ComponentSchema {
  collectionName: 'components_pick_list_items';
  info: {
    description: 'A single item in a pick list with checkbox';
    displayName: 'List Item';
  };
  attributes: {
    banker: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    sel: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    text: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'pick.list-item': PickListItem;
    }
  }
}
