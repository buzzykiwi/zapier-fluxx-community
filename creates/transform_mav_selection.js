'use_strict';
const FluxxAPI = require('../fluxx_api');

const perform = async (z, bundle) => {

  return { dict: z.JSON.stringify(bundle.inputData.dict),
    in: z.JSON.stringify(bundle.inputData.line_items)};

};

module.exports = {
  key: 'transform_mav_selection',
  noun: 'Transformation',
  display: {
    label: 'Transform a Multi-Item Selection (With Line Item Support)',
    description:
      "Transform the list of selections for a multi-item field, by path or id. __not yet implemented__",
    hidden: false,
    important: true,
  },
  operation: {
    inputFields: [
      {
        key: 'line_items',
        label: 'Line Items',
        children: [
          {
            key: 'mav_creation_line_item',
            label: '"Add List" Or "Add List By Id" Line Item',
            type: 'string',
            helpText: "Choose the input line item that contains the MAV creation string",
            required: false,
          },
          {
            key: 'id',
            label: 'Record Id',
            type: 'integer',
            helpText: "Select the field containing the line item for the ids of the records.",
            required: true,
          }
        ],
      },
      {
        key: 'dict',
        label: 'Transformation Dictionary',
        type: 'string',
        dict: true,
        helpText:
          "Specify the id *or* full path including delimiters on the left, and the new id or new full path on the right.",
        required: true,
        list: false,
        altersDynamicFields: false,
      },
      
    ],
    perform: perform,
    sample: { id: 30444, name: 'default' },
    outputFields: [{ key: 'id', type: 'integer' }, { key: 'name' }],
  },
};
