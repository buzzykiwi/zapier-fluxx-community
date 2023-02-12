'use_strict';

const perform = async (z, bundle) => {
  const FluxxAPI = require('../fluxx_api');
  let snakey = FluxxAPI.fn.modelToSnake(bundle.inputData.model_type);
  let cameley = FluxxAPI.fn.modelToCamel(bundle.inputData.model_type);
  // the JSON.stringify puts quotes around strings, and escapes everything in the string - perfect.
  let p = FluxxAPI.fn.parseSelectStatement(z, `SELECT id, name FROM model_document_type WHERE model_type = ${JSON.stringify(cameley)} ORDER BY name asc`);
  // p = {select: cols, from: model_type, where: filter, order_by: order_by, limit: limit};
  
  let options = FluxxAPI.fn.optionsFromParsedSelectStatement(z, bundle, p);
  
  if (options !== null && options !== undefined) {
    const response = await FluxxAPI.fn.paginated_fetch(z, bundle, options, p.model_type, p.limit);    
    const ret = response.data.records.model_document_type;
    if (ret.length === 0) return [];
    return ret;
  } 
};

module.exports = {
  // see here for a full list of available properties:
  // https://github.com/zapier/zapier-platform/blob/master/packages/schema/docs/build/schema.md#triggerschema
  key: 'model_document_type',
  noun: 'Model Document Type',

  display: {
    label: 'New Modeldocumenttype',
    description: 'Triggers when a new modeldocumenttype is created.',
    hidden: true,
  },

  operation: {
    perform,

    // `inputFields` defines the fields a user could provide
    // Zapier will pass them in as `bundle.inputData` later. They're optional.
    inputFields: [],

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
