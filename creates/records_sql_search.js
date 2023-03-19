'use_strict';
const FluxxAPI = require('../fluxx_api');

const perform = async (z, bundle) => {

  const FluxxAPI = require('../fluxx_api');
  let p = FluxxAPI.fn.parseSelectStatement(z, bundle.inputData.in);
  // p = {select: cols, from: model_type, where: filter, order_by: order_by, limit: limit};
  
  let options = FluxxAPI.fn.optionsFromParsedSelectStatement(z, bundle, p);
  
  if (options !== null && options !== undefined) {
    options.params.show_mavs = 'true';
    
    const response = await FluxxAPI.fn.paginated_fetch(z, bundle, options, options.model_type, p.limit);
    
    // return as line items: have to return a single object, but it can return an array via an object key
    let items = FluxxAPI.fn.preProcessFluxxResponse(z, p.cols, response, options.model_type);
    (bundle.inputData.reverse == 1) && (items = items.reverse());
    
    return {
      results: items,
    }; 
  }
};

module.exports = {
  key: 'records_sql_search',
  noun: 'SQL Records Search',
  display: {
    label: 'Search for a List of Fluxx Records (Line Item Support)',
    description:
      "Structure this like a SQL statement e.g. SELECT id, name FROM Organization WHERE city = 'Auckland' ORDER BY name asc LIMIT 10. Output is in the form of Line Items — use Loop by Zapier to convert to individual records if required for subsequent actions.",
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
        key: 'reverse',
        label: 'Reverse Results Order?',
        choices: {1:"True"},
        type: 'string',
        required: false,
      },
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
        label: 'Available Fields',
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
