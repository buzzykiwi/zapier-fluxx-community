'use_strict';

const perform = async (z, bundle) => {

  const FluxxAPI = require('../fluxx_api');
  let p = FluxxAPI.fn.optionsForSelectClause(z, bundle.inputData.in);
  // p = {select: cols, from: model_type, where: filter, order_by: order_by, limit: limit};
  
  let options = FluxxAPI.fn.optionsForSqlSelect(z, bundle, p);
  
  if (options !== null && options !== undefined) {
    const response = await FluxxAPI.fn.paginated_fetch(z, bundle, options, model_type, p.limit);
    const ret = response.data.records[FluxxAPI.fn.modelToSnake(options.model_type)];
    
    if (ret.length === 0) return {};
    return {results:ret}; // try to make it line items
  }
};

module.exports = {
  key: 'records_sql_search',
  noun: 'SQL Records Search',
  display: {
    label: 'Search for a List of Fluxx Records',
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
        altersDynamicFields: false,
      },
    ],
    perform: perform,
    sample: { id: 30444, name: 'default' },
    outputFields: [{ key: 'id', type: 'integer' }, { key: 'name' }],
  },
};
