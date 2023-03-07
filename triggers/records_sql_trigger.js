'use_strict';
const FluxxAPI = require('../fluxx_api');

const perform = async (z, bundle) => {

  let p = FluxxAPI.fn.parseSelectStatement(z, bundle.inputData.in);
  // p = {select: cols, from: model_type, where: filter, order_by: order_by, limit: limit};

  if (bundle.inputData.disable_dedupe == 2 && !p.cols.includes('updated_at')) {
    p.cols.push("updated_at");
  }
  if (bundle.inputData.disable_dedupe == 3) {
    p.cols = p.cols.concat(bundle.inputData.dedupe_fields); // add the fields we are going to dedupe with.
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
        switch(dd) {
        case 1:
          item.id = "" + Date.now() + "-" + item.id;
          break;
        case 2:
          item.id = "" + item.fields.updated_at + "-" + item.id;
          break;
        case 3:
          let hashString = '';
          let field;
          if (Array.isArray(bundle.inputData.dedupe_fields)) {
            bundle.inputData.dedupe_fields.forEach(field => {
              hashString = hashString + item.fields[field] + "||";
            });
            item.id = z.hash('md5', hashString) + '-' + item.id;
          }
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

const customDedupe = async (z, bundle) => {
  if (bundle.inputData.disable_dedupe != 3) {
    return '[]';
  }
  return {
    key: 'Custom:_Allow_Changes_in_These_Fields',
    children: [
      {
        key: 'dedupe_fields',
        label: 'Field List',
        type: 'string',
        required: false,
        list: true,
        // dynamic: first the key of the component to use (usually a trigger)
        // then the field in the returned item representing the ID - this is the value that will be saved.
        // then the field in the returned item representing the NAME (for display purposes)
        dynamic: 'all_fields_for_sql_model.value.label',
        placeholder: 'Select a field',
        helpText:
          'A record will get through the de-dupe process and be available if it has changes in any of the fields listed here.',
        altersDynamicFields: false,
      },
    ],
  }
}

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
        key: 'dedupe_help',
        type: 'copy',
        helpText: `### De-Duping

**Default:** Zapier will only allow each record to trigger the Zap once, by keeping a record of the ids. Only new records (or records it has never seen before) will trigger the Zap.

**Option 1:** _All_ records selected by the SQL query will trigger the Zap, every time the timed trigger runs. If you choose this option, ensure that the processed record will be saved in such a way that it won't re-trigger the Zap the next time it runs.

**Option 2:** Updated records can trigger the Zap in addition to new records. By default, Zapier's de-duper will think that updated records have been seen before, so this option is useful if you need the Zap to operate on both new _and_ updated records.

**Option 3:** This advanced option allows you to specify which fields Zapier will check for changes. Any record with a change in one of these fields will trigger the Zap. Note, that the SQL query will need to return enough items for this trigger to identify some that have those changes.`,
      },
      {
        key: 'disable_dedupe',
        label: 'De-Duplication',
        choices: {
          1: "1. Disable de-duplication completely", 
          2: "2. Allow updated records in addition to new records",
          3: '3. Custom',
        },
        type: 'string',
        required: false,
        altersDynamicFields: true,
      },
      customDedupe,
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
