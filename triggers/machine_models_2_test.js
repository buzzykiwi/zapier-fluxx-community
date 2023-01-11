'use_strict';

const FluxxAPI = require('../fluxx_api');

const perform = async (z, bundle) => {
  // Fields to Update/Create
  var model_type = 'GrantRequest'; //bundle.inputData.model_type;
  if (model_type == '') {
    model_type = 'GrantRequest';
  }


  async function main_function() {
    if (model_type === undefined || model_type === '') {
      return;
    }
    const r = await FluxxAPI.fn.fields_for_model(z, bundle, model_type, FluxxAPI.c.CORE_MODELS);
    return r;
    return {
      key: 'fields',
      label: 'Fields to Update/Create',
      choices: r,
      type: 'string',
      required: true,
      list: true,
      helpText:
        'Enter the list of fields you want to update (or create in a new record). The list of field options depends on which Model Type is chosen.',
    };
  }

  return main_function();
};

module.exports = {
  operation: { perform: perform },
  key: 'machine_models_2_test',
  noun: 'model',
  display: {
    label: 'machine models 2 test',
    description: 'testing to see if the code is ok',
    hidden: true,
    important: false,
  },
};
