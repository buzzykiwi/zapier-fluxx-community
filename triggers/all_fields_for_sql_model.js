'use_strict';

const perform = async (z, bundle) => {
  const FluxxAPI = require('../fluxx_api');
  
  // Here, we will get the model_type from the SQL field.
  if (bundle.inputData.in === undefined || bundle.inputData.in === null || bundle.inputData.in.trim() == "") {
    return [];
  }
  let p = FluxxAPI.fn.parseSelectStatement(z, bundle.inputData.in);
  if (p == false) {
    return [];
  }
  
  // false, false: means don't remove read-only attributes, and don't restrict to multi-value attributes.
  return await FluxxAPI.fn.fields_for_model(z, bundle, p.model_type, FluxxAPI.c.CORE_MODELS, false, false);
};

module.exports = {
  // see here for a full list of available properties:
  // https://github.com/zapier/zapier-platform/blob/master/packages/schema/docs/build/schema.md#triggerschema
  key: 'all_fields_for_sql_model',
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
        key: 'in',
        type: 'string',
        label: 'SQL input',
        required: true,
        altersDynamicFields: true,
      },
    ],
    sample: {
      id: 1,
      name: 'sample'
    },

    outputFields: [
    ]
  }
};
