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
    description: 'Triggers when objects appear in a specified Fluxx API queue.',
    directions: 'Should be triggered on a cron (timed) basis',
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
        a2_stage_grant_type: null,
        amount_approved: '0',
        amount_recommended: null,
        amount_requested: 3255.8,
        base_request_id: '7273',
        board_meeting_link: null,
        boardmeetingdate: '2018-04-26',
        expensetotal: 391447,
        focus_of_grant: null,
        funding_sector: null,
        grant_agreement_at: null,
        grant_approved_at: null,
        grant_begins_at: null,
        grant_closed_at: null,
        granted: false,
        multi_year: null,
        netincome: -93939,
      },
    },
    outputFields: [
      { key: 'timestamp', type: 'integer' },
      { key: 'id', type: 'integer' },
      { key: 'model_id', type: 'integer' },
      { key: 'ModelType' },
      { key: 'fields__id', type: 'integer' },
      { key: 'fields__a2_stage_grant_type' },
      { key: 'fields__amount_approved', type: 'number' },
      { key: 'fields__amount_recommended', type: 'number' },
      { key: 'fields__amount_requested', type: 'number' },
      { key: 'fields__base_request_id' },
      { key: 'fields__board_meeting_link' },
      { key: 'fields__boardmeetingdate', type: 'datetime' },
      { key: 'fields__expensetotal', type: 'number' },
      { key: 'fields__focus_of_grant' },
      { key: 'fields__funding_sector' },
      { key: 'fields__grant_agreement_at', type: 'datetime' },
      { key: 'fields__grant_approved_at', type: 'datetime' },
      { key: 'fields__grant_begins_at', type: 'datetime' },
      { key: 'fields__grant_closed_at', type: 'datetime' },
      { key: 'fields__granted' },
      { key: 'fields__multi_year', type: 'boolean' },
      { key: 'fields__netincome', type: 'number' },
    ],
  },
};
