'use_strict';

const FluxxAPI = require('../fluxx_api');

const perform = async (z, bundle) => {

  const model_type = bundle.inputData.model_type;
  const fields = bundle.inputData.fields;

  // This forms a GET request to return a single item
  const options = FluxxAPI.fn.optionsForSingleItemFetch(
    z,
    bundle,
    {
      model_type: model_type, 
      cols: fields, 
      id: bundle.inputData.model_id
    }
  );

  if (bundle.inputData.show_mavs == 'true') {
    options.params.show_mavs = 'true';
  }

  response = await z.request(options);
  response.throwForStatus();
  FluxxAPI.fn.handleFluxxAPIReturnErrors(z, response);
  
  // our API call returns a single object - Zapier expects an array of which it will use the first entry.
  return [FluxxAPI.fn.preProcessFluxxResponse(z, fields, response, model_type)];
};

module.exports = {
  key: 'record',
  noun: 'Search Request',
  display: {
    label: 'Search for Record',
    description:
      'Given an id, a model type and a list of fields to return, this action fetches the specified Fluxx Record and its fields.',
    hidden: false,
    important: true,
  },
  operation: {
    inputFields: [
      {
        key: 'model_id',
        label: 'Record Id',
        type: 'integer',
        required: true,
        list: false,
        altersDynamicFields: false,
      },
      {
        key: 'model_group',
        label: 'Model Group',
        type: 'string',
        default: 'Basic',
        choices: ['Basic', 'Intermediate', 'Dynamic Models only', 'All'],
        helpText:
          'You can trim down the number of Model Types displayed in the selector below, by choosing a different option here.',
        required: true,
        list: false,
        altersDynamicFields: true,
      },
      FluxxAPI.fn.getModelTypeDropdown,
      FluxxAPI.fn.getModelTypeDescription,
      FluxxAPI.fn.getReturnFieldsDropdown,
      FluxxAPI.fn.getReturnFieldDescriptions,
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
    sample: {
      id: 65,
      model_type: 'grant_request',
      fields: {
        updated_at: '2022-11-14T10:21:43Z',
        'program_organization_id.id': 261,
        'program_organization_id.name': 'Wanganui Toy Library Incorporated',
        'program_organization_id.nz_charities_number': 'CC26289',
        amount_requested: 4000,
        amount_recommended: 1000,
        funding_sector: [
          { value: '10: Religion', list: ['10: Religion'], percent: 51 },
          {
            value: '04: Social services / 04 100: Social services',
            list: ['04: Social services', '04 100: Social services'],
            percent: 12,
          },
          {
            value: '04: Social services / 04 200: Emergency and relief',
            list: ['04: Social services', '04 200: Emergency and relief'],
            percent: 5,
          },
          {
            value:
              '07: Law, advocacy and politics / 07 100: Civic and advocacy organisations',
            list: [
              '07: Law, advocacy and politics',
              '07 100: Civic and advocacy organisations',
            ],
            percent: 32,
          },
        ],
        'updated_by.id': 51,
        'updated_by.full_name': 'John Doe',
      },
    },
    outputFields: [
      { key: 'id', type: 'integer' },
      { key: 'model_type' },
      { key: 'fields__updated_at', type: 'datetime' },
      { key: 'fields__program_organization_id.id' },
      { key: 'fields__program_organization_id.name' },
      { key: 'fields__program_organization_id.nz_charities_number' },
      { key: 'fields__amount_requested', type: 'number' },
      { key: 'fields__amount_recommended', type: 'number' },
      { key: 'fields__funding_sector[]value' },
      { key: 'fields__updated_by.id', type: 'integer' },
      { key: 'fields__updated_by.full_name' },
    ],
    perform: perform,
  },
};
