'use_strict';

const FluxxAPI = require('../fluxx_api');

const perform = async (z, bundle) => {
  const limit_num = 1000;
  const options = {
    url: `https://${bundle.authData.client_domain}/poll/client/:client_id/uuid/queue/${bundle.inputData.api_queue}`,
    method: 'GET',
    headers: FluxxAPI.c.STANDARD_HEADERS,
    params: { limit_num: limit_num }, // pagination
  };

  let final_list = [];
  let ret = [];
  let response;
  let errors = 0;
  let results;

  do {
    // we don't do the paginated response, as this is a GET request (params, not body for attributes)
    response = await z.request(options);
    response.throwForStatus();
    FluxxAPI.fn.handleFluxxAPIReturnErrors(z, response);
    results = response.data;

    if (results.data !== undefined) {
      ret = results.data;
      
      ret.forEach(function (item) {
        // make a unique id that will be different every time the
        // item is put into a different queue.
        item.id = `${item.identity}-${results.job_uuid}`;
        item.model_id = item.identity;
        item.ModelType = item.key.table;
        item.fields = {};
        delete item.identity;
        delete item.key;
        const keys = Object.keys(item.recordData);
        keys.forEach((key) => {
          item.fields[key] = item.recordData[key];
        });
        delete item.recordData;
      });
      final_list = final_list.concat(ret);
    } else {
      ret = [];
      errors++;
    }
  } while (ret.length == limit_num && errors < 2); // repeat if number of items equals that requested, OR < 2 errors.

  if (final_list.length > 0) {
    const options_finished = {
      url:
        `https://${bundle.authData.client_domain}/poll/client/:client_id/uuid/queue_finished/${bundle.inputData.api_queue}/${results.job_uuid}`,
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${bundle.authData.access_token}`,
      },
    };
    response = await z.request(options_finished);
    response.throwForStatus();
    FluxxAPI.fn.handleFluxxAPIReturnErrors(z, response);
  }
  (bundle.inputData.reverse == 1) && (final_list = final_list.reverse());
  if (bundle.inputData.force_line_items == 1) {
    return [{id: Date.now(), line_items: final_list}];
  }
  return final_list;
};

module.exports = {
  key: 'new_queue',
  noun: 'Records in Fluxx API Queue',
  display: {
    label: 'Trigger on Queued Records',
    description: 'Triggers when objects appear in a specified Fluxx API queue. The queue is cleared after the records have been sent to Zapier. Optional Line Item Support. No de-duping is performed: If the same Fluxx record appears in the multiple runs of the same queue, it will trigger every time.',
    directions: 'Triggered on a cron (timed) basis',
    hidden: false,
    important: true,
  },
  operation: {
    perform: perform,
    inputFields: [
      {
        key: 'api_queue',
        type: 'string',
        label: 'API Queue UUID',
        helpText:
          'The UUID of the API Queue to retrieve from Fluxx. In Fluxx, go to Admin Panel => Card Documents => (Model Type) => API Alerts to find the Queue UUID, set the queue criteria, and to choose the fields to return to Zapier.',
        required: true,
        list: false,
        altersDynamicFields: false,
      },
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
    ],
    canPaginate: false,
    type: 'polling',
    sample: {
      timestamp: 1668135097,
      id: 815,
      model_id: 815,
      ModelType: 'requests',
      fields: {
        id: 815,
      },
    },
    outputFields: [
      { key: 'timestamp', type: 'integer' },
      { key: 'id', type: 'integer' },
      { key: 'model_id', type: 'integer' },
      { key: 'ModelType', type: 'string' },
      { key: 'fields__id', type: 'integer' },
    ],
  },
};
