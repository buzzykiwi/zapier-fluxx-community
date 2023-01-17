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
  let api_queue = "";
  let results;

  do {
    // we don't do the paginated response, as this is a GET request (params, not body for attributes)
    response = await z.request(options);
    response.throwForStatus();
    results = response.data;

    if (results.data !== undefined) {
      ret = results.data;
      api_queue = results.api_queue;
      
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
        `https://${bundle.authData.client_domain}/poll/client/:client_id/uuid/queue_finished/${api_queue}/${results.job_uuid}`,
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${bundle.authData.access_token}`,
      },
    };
    response = await z.request(options_finished);
    response.throwForStatus();
  }
  return final_list;
};

module.exports = {
  key: 'new_queue',
  noun: 'Model in "Initial Review" state',
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
        label: 'API Queue Id',
        helpText:
          'The id of the queue inside Fluxx to retrieve. This should be the one that detects state change to initial_review, or whatever stage where you want some fields to be changed.',
        required: true,
        list: false,
        altersDynamicFields: false,
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
