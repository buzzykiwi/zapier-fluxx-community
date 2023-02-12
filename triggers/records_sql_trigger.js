'use_strict';

const perform = async (z, bundle) => {

  const FluxxAPI = require('../fluxx_api');

  let p = FluxxAPI.fn.parseSelectStatement(z, bundle.inputData.in);
  // p = {select: cols, from: model_type, where: filter, order_by: order_by, limit: limit};
  
  let options = FluxxAPI.fn.optionsFromParsedSelectStatement(z, bundle, p);
  
  if (options !== null && options !== undefined) {
    const response = await FluxxAPI.fn.paginated_fetch(z, bundle, options, p.model_type, p.limit);
    const ret = response.data.records[FluxxAPI.fn.modelToSnake(options.model_type)];
    
    if (ret.length === 0) return {};
    return ret; // {results:ret}; // try to make it line items?
  }

};

module.exports = {
  key: 'records_sql_trigger',
  noun: 'SQL Records Search Results',
  display: {
    label: 'Trigger on New Records',
    description:
      "Triggers when new records are found via an SQL-like search. e.g. SELECT id, name FROM Organization WHERE city = 'Auckland' ORDER BY name asc LIMIT 400\nResults are de-duped and will not trigger for the same item twice unless the Zap is stopped and re-started.",
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
          "e.g. SELECT id, name FROM Organization WHERE city = 'Auckland' ORDER BY updated_at desc LIMIT 100",
        required: false,
        list: false,
        altersDynamicFields: false,
      },
    ],
    perform: perform,
    canPaginate: false,
    type: 'polling',
    sample: { id: 30444, name: 'default' },
    outputFields: [{ key: 'id', type: 'integer' }, { key: 'name' }],
  },
};
