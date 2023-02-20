'use_strict';
const FluxxAPI = require('../fluxx_api');

const perform = async (z, bundle) => {

  const FluxxAPI = require('../fluxx_api');

  let p = FluxxAPI.fn.parseSelectStatement(z, bundle.inputData.in);
  // p = {select: cols, from: model_type, where: filter, order_by: order_by, limit: limit};
  
  let options = FluxxAPI.fn.optionsFromParsedSelectStatement(z, bundle, p);
  
  if (options !== null && options !== undefined) {
    options.body.show_mavs = 'true';
    const response = await FluxxAPI.fn.paginated_fetch(z, bundle, options, p.model_type, p.limit);
    return FluxxAPI.fn.preProcessFluxxResponse(z, p.cols, response, p.model_type);
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
        altersDynamicFields: true,
      },
      FluxxAPI.fn.sql_descriptions,
    ],
    perform: perform,
    canPaginate: false,
    type: 'polling',
    sample: { id: 30444, name: 'default' },
    outputFields: [{ key: 'id', type: 'integer' }, { key: 'name' }],
  },
};
