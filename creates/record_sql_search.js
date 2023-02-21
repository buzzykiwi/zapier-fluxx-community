'use_strict';
const FluxxAPI = require('../fluxx_api');

const perform = async (z, bundle) => {

  let p = FluxxAPI.fn.parseSelectStatement(z, bundle.inputData.in);
  // p = {select: cols, from: model_type, where: filter, order_by: order_by, limit: limit};
  
  let options = FluxxAPI.fn.optionsFromParsedSelectStatement(z, bundle, p);
  if (options !== null && options !== undefined) {
    options.params.show_mavs = 'true';
    
    // pagination system
    const response = await FluxxAPI.fn.paginated_fetch(z, bundle, options, p.model_type, 1);
    const ret = FluxxAPI.fn.preProcessFluxxResponse(z, p.cols, response, p.model_type);
    
    if (ret.length === 0) return {};
    return ret[0]; // the first one in the list
  }

};

module.exports = {
  key: 'record_sql_search',
  noun: 'SQL Record Search',
  display: {
    label: 'Search for a Single Fluxx Record',
    description:
      "Structure this like a SQL statement e.g. SELECT id FROM User WHERE full_name = 'John Doe' ORDER BY last_name LIMIT 1. The number of returned items is capped at 1, so use the ORDER BY to ensure the most relevant item is returned first.",
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
          "e.g. SELECT full_name FROM User WHERE full_name = 'John Doe' ORDER BY id desc LIMIT 1",
        required: false,
        list: false,
        altersDynamicFields: true,
      },
      FluxxAPI.fn.sql_descriptions,
    ],
    perform: perform,
    sample: { id: 30444, name: 'default' },
    outputFields: [{ key: 'id', type: 'integer' }, { key: 'name' }],
  },
};
