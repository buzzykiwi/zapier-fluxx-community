'use_strict';

const FluxxAPI = require('../fluxx_api');

const perform = async (z, bundle) => {
  // Pass this a model_type (e.g. GrantRequest) and a list
  // of fields in field, and this returns an object where
  // o.model_attribute = a list of objects that represent any
  // of the field names that are multi-value. Each object
  // has keys id, name, description and model_type.
  const options = {
    url: `https://${bundle.authData.client_domain}/api/rest/v2/model_attribute/list`,
    method: 'POST',
    headers: {
      //'Content-Type': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: `Bearer ${bundle.authData.access_token}`,
      'X-CLIENT-DOMAIN': bundle.authData.client_domain,
    },
    params: {},
    body: {
      filter: z.JSON.stringify({
        name: bundle.inputData.fields,
        model_type: FluxxAPI.fn.modelToCamel(bundle.inputData.model_type),
        attribute_type: 'multi_value',
      }),
      cols: z.JSON.stringify(['name', 'description', 'model_type']),
    },
  };

  const response = await FluxxAPI.fn.paginated_fetch(z, bundle, options, "model_attribute", 0); // limit 0 means no limit
  return response.data.records;
};

module.exports = {
  key: 'search_model_attributes',
  noun: 'Multi-Value Model Attribute Query',
  display: {
    label: 'Search Model Attributes (Test Utility Only)',
    description:
      'give it a model_type and a list of fields, and it will search for any matching model attributes that are of type "multi_value"',
    hidden: false,
    important: false,
  },
  operation: {
    inputFields: [
      /*
      {
        key: 'model_type',
        label: 'Model Type',
        type: 'string',
        helpText: 'Model Type must be in the form "GrantRequest"',
        required: false,
        list: false,
        altersDynamicFields: true,
      },
      */
      FluxxAPI.fn.getModelTypeDropdown,
      FluxxAPI.fn.getModelTypeDescription,
      /*
      {
        key: 'fields',
        label: 'Fields',
        type: 'string',
        helpText: 'list of fields, 1 per box',
        required: false,
        list: true,
        altersDynamicFields: true,
      },
      */
      FluxxAPI.fn.getReturnFieldsDropdown,
      FluxxAPI.fn.getReturnFieldDescriptions,
    ],
    sample: {
      model_attribute: [
        {
          id: 56180,
          name: 'sector',
          description: 'Sector',
          model_type: 'GrantRequest',
        },
        {
          id: 101905,
          name: 'type_1',
          description: 'Type',
          model_type: 'GrantRequest',
        },
      ],
    },
    outputFields: [
      { key: 'model_attribute[]id' },
      { key: 'model_attribute[]name' },
      { key: 'model_attribute[]description' },
      { key: 'model_attribute[]model_type' },
    ],
    perform: perform,
  },
};
