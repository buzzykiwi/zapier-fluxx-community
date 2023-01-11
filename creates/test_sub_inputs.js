'use_strict';

const FluxxAPI = require('../fluxx_api');

// create a particular testsubinputs by name
const perform = async (z, bundle) => {
  // this should return a single object
  return {
    sub: bundle.inputData.sub,
    sub2: bundle.inputData.sub2,
    sub3: bundle.inputData.sub2.constructor.name,
    fields: JSON.stringify(bundle.inputData.fields),
  }
};

module.exports = {
  // see here for a full list of available properties:
  // https://github.com/zapier/zapier-platform/blob/master/packages/schema/docs/build/schema.md#createschema
  key: 'test_sub_inputs',
  noun: 'Testsubinputs',

  display: {
    label: 'Create Testsubinputs',
    description: 'Creates a new testsubinputs, probably with input from previous steps.'
  },

  operation: {
    perform,

    // `inputFields` defines the fields a user could provide
    // Zapier will pass them in as `bundle.inputData` later. They're optional.
    // End-users will map data into these fields. In general, they should have any fields that the API can accept. Be sure to accurately mark which fields are required!
    inputFields: [
      {key: 'name', required: true},
      {
        key: 'fields', 
        children: [
          {
            key: 'sub', 
            type: 'string', 
            label:'Sub', 
            required: false,
          },
          {
            key: 'sub2', 
            type: 'string', 
            label:'Sub2', 
            required: false,
          },
        ],
      },
    ],

    // In cases where Zapier needs to show an example record to the user, but we are unable to get a live example
    // from the API, Zapier will fallback to this hard-coded sample. It should reflect the data structure of
    // returned records, and have obvious placeholder values that we can show to any user.
    sample: {
      id: 1,
      name: 'Test'
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
