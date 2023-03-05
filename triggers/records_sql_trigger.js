'use_strict';
const FluxxAPI = require('../fluxx_api');

const perform = async (z, bundle) => {

  let p = FluxxAPI.fn.parseSelectStatement(z, bundle.inputData.in);
  // p = {select: cols, from: model_type, where: filter, order_by: order_by, limit: limit};

  if (bundle.inputData.disable_dedupe == 2 && !p.cols.includes('updated_at')) {
    p.cols.push("updated_at");
  }
    
  let options = FluxxAPI.fn.optionsFromParsedSelectStatement(z, bundle, p);
  
  if (options !== null && options !== undefined) {
    options.body.show_mavs = 'true';
    const response = await FluxxAPI.fn.paginated_fetch(z, bundle, options, p.model_type, p.limit);

    let items = FluxxAPI.fn.preProcessFluxxResponse(z, p.cols, response, p.model_type);
    (bundle.inputData.reverse == 1) && (items = items.reverse());
    if (bundle.inputData.disable_dedupe > 0) {
      let dd = bundle.inputData.disable_dedupe;
      items.forEach(item => {
        if (dd == 1) {
          item.id = "" + Date.now() + "-" + item.id;
        } else if (dd == 2) {
          item.id = "" + item.fields.updated_at + "-" + item.id;
        }
      });
    }
    if (bundle.inputData.force_line_items == 1) {
      return [{id: Date.now(), line_items: items}];
    } else {
      return items;
    }
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
      {
        key: 'force_line_items',
        label: 'Force Line Items?',
        choices: {1:"True"},
        type: 'string',
        required: false,
      },
      {
        key: 'reverse',
        label: 'Reverse Results Order?',
        choices: {1:"True"},
        type: 'string',
        required: false,
      },
      {
        key: 'disable_dedupe',
        label: 'De-Duplication',
        choices: {1:"Disable de-duplication completely", 2: "Don't de-duplicate updated fields"},
        type: 'string',
        required: false,
        helpText: "De-duplication helps Zapier to ignore items that it has already processed. If you disable de-duplication, ensure that the processed record will be changed in such a way that it won't re-trigger the Zap.\n\nThe second option allows updated items to still trigger the Zap. If not set, Zapier's de-duplication will think that the updated field has been seen before, and ignore it."
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
    canPaginate: false,
    type: 'polling',
    sample: { id: 30444, name: 'default' },
    outputFields: [{ key: 'id', type: 'integer' },{ key: 'fields.id', type: 'integer' }],
  },
};
