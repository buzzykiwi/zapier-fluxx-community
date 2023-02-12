'use_strict';

const perform = async (z, bundle) => {
  const FluxxAPI = require('../fluxx_api');
  
  let p = FluxxAPI.fn.parseSelectStatement(z, `SELECT id, full_name FROM user WHERE full_name CONTAINS ${z.JSON.stringify(bundle.inputData.name_segment)} ORDER BY last_name, first_name LIMIT 200`);
  // p = {select: cols, from: model_type, where: filter, order_by: order_by, limit: limit};

  let options = FluxxAPI.fn.optionsFromParsedSelectStatement(z, bundle, p);
  if (options !== null && options !== undefined) {
    const response = await FluxxAPI.fn.paginated_fetch(z, bundle, options, p.model_type, p.limit);
    const ret = response.data.records[FluxxAPI.fn.modelToSnake(options.model_type)];
    
    if (ret.length === 0) return [];
    return ret;
  }
  
};

module.exports = {
  // see here for a full list of available properties:
  // https://github.com/zapier/zapier-platform/blob/master/packages/schema/docs/build/schema.md#triggerschema
  key: 'user_list',
  noun: 'Userlist',

  display: {
    label: 'New Userlist',
    description: 'Test returning a trigger list of users',
    // helpText: '... unfortunately this list is likely to be too long to be of use, and would require paging. It does not allow parameters to the search.',
    hidden: true,
  },

  operation: {
    perform,

    // `inputFields` defines the fields a user could provide
    // Zapier will pass them in as `bundle.inputData` later. They're optional.
    inputFields: [
      {
        key: 'name_segment',
        type: 'string',
        label: 'User name to use for searches',
        helpText:
          'Give a name or portion of a name here, to narrow down the list of names in the selector below',
        required: true,
        altersDynamicFields: true,
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
