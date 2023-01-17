'use_strict';
const FluxxAPI = require('../fluxx_api');

const perform = async (z, bundle) => {

  const FluxxAPI = require('../fluxx_api');
  let p = FluxxAPI.fn.optionsForSelectClause(z, bundle.inputData.in);
  // p = {select: cols, from: model_type, where: filter, order_by: order_by, limit: limit};
  
  let options = FluxxAPI.fn.optionsForSqlSelect(z, bundle, p);
  
  if (options !== null && options !== undefined) {
    if (bundle.inputData.show_mavs == 'true') {
      options.params.show_mavs = 'true';
    }
    
    const response = await FluxxAPI.fn.paginated_fetch(z, bundle, options, options.model_type, p.limit);
    
    // return as line items: have to return a single object, but it can return an array via an object key
    return {
      results: FluxxAPI.fn.processInitialResponse(z, p.cols, response, options.model_type),
    }; 
  }
};

module.exports = {
  key: 'records_sql_search',
  noun: 'SQL Records Search',
  display: {
    label: 'Search for a List of Fluxx Records With Line Item Support',
    description:
      "Structure this like a SQL statement e.g. SELECT id, name FROM Organization WHERE city = 'Auckland' ORDER BY name asc LIMIT 10",
    hidden: false,
    important: true,
  },
  operation: {
    inputFields: [
      {
        key: 'in',
        label: 'SQL input',
        type: 'text',
        helpText:
          "e.g. SELECT id, name FROM Organization WHERE city = 'Auckland' ORDER BY name asc LIMIT 10",
        required: false,
        list: false,
        altersDynamicFields: true,
      },
      FluxxAPI.fn.sql_descriptions,
      {
        key: 'show_mavs',
        label: 'Show MAVs',
        type: 'string',
        helpText:
          'Do you want to get additional information about Multi Attribute Values in the request? If true, MAVs will return percentage value (if available) and hierarchy.',
        choices: ['true', 'false'],
        required: false,
        list: false,
        altersDynamicFields: false,
      },
    ],
    perform: perform,
    sample: { id: 30444, name: 'default' },
    outputFields: [{ key: 'id', type: 'integer' }, { key: 'name' }],
  },
};
