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
      {
        key: 'help',
        type: 'copy',
        helpText: '**Model and Field Explorer**\n\nUse the following controls to explore available models and their fields, for use in the SQL query. The contents of these fields are ignored while the Zap is running.',
      },
      {
        key: 'model_group',
        label: 'Model Group',
        type: 'string',
        choices: ['Basic', 'Intermediate', 'Dynamic Models only', 'All'],
        helpText:
          'Filter the Model Types displayed in the selector below, by choosing a different option here.',
        default: 'Basic',
        required: false,
        list: false,
        altersDynamicFields: true,
      },
      FluxxAPI.fn.getInputFieldsForModelTypesNotRequired,
      {
        key: 'fields',
        label: 'Field List for Update/Create',
        type: 'string',
        required: false,
        list: true,
        // dynamic: first the key of the component to use (usually a trigger)
        // then the field in the returned item representing the ID - this is the value that will be saved.
        // then the field in the returned item representing the NAME (for display purposes)
        dynamic: 'all_fields_for_model.value.label',
        placeholder: 'Select a field',
        helpText:
          'Use the dropdown to identify field names to use in the SQL statement',
        altersDynamicFields: true,
      },
      FluxxAPI.fn.getReturnFieldDescriptions,
    ],
    perform: perform,
    sample: { id: 30444, name: 'default' },
    outputFields: [{ key: 'id', type: 'integer' }, { key: 'name' }],
  },
};
