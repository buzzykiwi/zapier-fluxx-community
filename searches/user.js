'use_strict';

const FluxxAPI = require('../fluxx_api');

// find a particular user by name
// This has to use a search API since we search by name rather than fetch by id.
const perform = async (z, bundle) => {

  let p = FluxxAPI.fn.optionsForSelectClause(z, `SELECT id, full_name FROM user WHERE full_name = ${z.JSON.stringify(bundle.inputData.name)} ORDER BY last_name, first_name LIMIT 1`);
  // p = {select: cols, from: model_type, where: filter, order_by: order_by, limit: limit};
  
  let options = FluxxAPI.fn.optionsForSqlSelect(z, bundle, p);
    
  if (options !== null && options !== undefined) {
    const response = await FluxxAPI.fn.paginated_fetch(z, bundle, options, p.model_type, p.limit);
    const ret = response.data.records[FluxxAPI.fn.modelToSnake(options.model_type)];
    // this returns an array of objects (but only the first will be used)
    return ret;
  }
  
};
module.exports = {
  // see here for a full list of available properties:
  // https://github.com/zapier/zapier-platform/blob/master/packages/schema/docs/build/schema.md#searchschema
  key: 'search_for_user',
  noun: 'User Search',

  display: {
    label: 'Search for User',
    description: 'Search for a user based on name.'
  },

  operation: {
    perform,

    // `inputFields` defines the fields a user could provide
    // Zapier will pass them in as `bundle.inputData` later. Searches need at least one `inputField`.
    inputFields: [
      {key: 'name', required: true, helpText: 'Find the User with this full name – exact match only.'}
    ],

    // In cases where Zapier needs to show an example record to the user, but we are unable to get a live example
    // from the API, Zapier will fallback to this hard-coded sample. It should reflect the data structure of
    // returned records, and have obvious placeholder values that we can show to any user.
    sample: {
      id: 1,
      full_name: 'John Doe',
    },

    // If fields are custom to each user (like spreadsheet columns), `outputFields` can create human labels
    // For a more complete example of using dynamic fields see
    // https://github.com/zapier/zapier-platform/tree/master/packages/cli#customdynamic-fields
    // Alternatively, a static field definition can be provided, to specify labels for the fields
    outputFields: [
      // these are placeholders to match the example `perform` above
      {key: 'id', label: 'User ID'},
      {key: 'full_name', label: 'User Full Name'}
    ]
  }
};
