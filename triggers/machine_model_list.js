'use_strict';

const FluxxAPI = require('../fluxx_api');

const perform = async (z, bundle) => {
  //DYNAMIC DROPDOWN
    return await FluxxAPI.fn.fetch_core_and_machine_model_list(z, bundle, "ALL");
};

module.exports = {
  operation: {
    perform: perform,
    sample: { id: -1, value: 'AdhocReport', label: 'Adhoc Report' },
    outputFields: [{ key: 'id' }, { key: 'value' }, { key: 'label' }],
  },
  key: 'machine_model_list',
  noun: 'Machine Model',
  display: {
    label: 'List of machine models',
    description:
      'Returns a list of machine models for use in dynamic dropdowns in Zapier',
    hidden: true,
    important: false,
  },
};
