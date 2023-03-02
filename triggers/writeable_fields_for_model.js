'use_strict';

const perform = async (z, bundle) => {
  const FluxxAPI = require('../fluxx_api');
  // false, false: means IGNORE read-only attributes, and don't restrict to multi-value attributes.
  return await FluxxAPI.fn.fields_for_model(z, bundle, bundle.inputData.model_type, FluxxAPI.c.CORE_MODELS, false, false);
};

module.exports = {
  // see here for a full list of available properties:
  // https://github.com/zapier/zapier-platform/blob/master/packages/schema/docs/build/schema.md#triggerschema
  key: 'writeable_fields_for_model',
  noun: 'Fields',

  display: {
    label: 'New Field List',
    description: 'Returning a trigger list of fields for a given model type',
    // helpText: '... unfortunately this list is likely to be too long to be of use, and would require paging. It does not allow parameters to the search.',
    hidden: true,
  },

  operation: {
    perform,

    // `inputFields` defines the fields a user could provide
    // Zapier will pass them in as `bundle.inputData` later. They're optional.
    inputFields: [
      {
        key: 'model_type',
        type: 'string',
        label: 'Model Type',
        required: true,
        altersDynamicFields: true,
      },
    ],


    // In cases where Zapier needs to show an example record to the user, but we are unable to get a live example
    // from the API, Zapier will fallback to this hard-coded sample. It should reflect the data structure of
    // returned records, and have obvious placeholder values that we can show to any user.
    sample: {
      id: 1,
      name: 'sample'
    },

    // If fields are custom to each user (like spreadsheet columns), `outputFields` can create human labels
    // For a more complete example of using dynamic fields see
    // https://github.com/zapier/zapier-platform/tree/master/packages/cli#customdynamic-fields
    // Alternatively, a static field definition can be provided, to specify labels for the fields
    outputFields: [
      // these are placeholders to match the example `perform` above
      // {key: 'id', label: 'Person ID'},
      // {key: 'name', label: 'Person Name'}
    ]
  }
};
