'use_strict';
/*jshint esversion: 8 */

const FluxxAPI = require('../fluxx_api');


const perform = async (z, bundle) => {
  // SAVE FLUXX RECORD WITH ARBITRARY FIELDS
  // Input:
  //   bundle.inputData.model_type = in form "GrantRequest" or "grant_request"
  //   bundle.inputData.id = 12345
  //   bundle.inputData.fields = ["amount_recommended","type_1"]
  //   bundle.inputData.values = [9999, "Community Support Grant"]
  //   bundle.inputData.return_fields = ["amount_received","program_organization_id.name"] or null

  const inputData = bundle.inputData;
  /*
    inputData.id = 65; // or null, to force creation of new model
    inputData.fields = ["amount_recommended","project_title","type_1"];
    inputData.values = [12345,"This is a title","Quick Response Grant"];
    inputData.model_type = "GrantRequest";
    inputData.cols = ["id","amount_requested"];
  */

  // Which of the requested fields are MAVs? - also grab the structured tree of MAs and list of all multi-value MAVs
  const [structured_mas, structured_mavs, mv_fields] = await FluxxAPI.mav_tree.which_fields_are_mvs(
    z, 
    bundle, 
    inputData.model_type, 
    null, // indicates that we need to retrieve MAs from Fluxx.
    inputData.fields
  );

  // convert the fields and new values into {"field1":"new val 1", "field2","new_val_2"...}
  const [all_fields_and_update_values, fields_and_update_values_without_mvs] = fields_and_values(
    inputData.fields,
    inputData.values,
    mv_fields
  );
  
  var final_return;
  if (
    inputData.id === undefined ||
    inputData.id === 0 ||
    inputData.id === ''
  ) {
    final_return = await FluxxAPI.fn.create_fluxx_record(
      z,
      bundle,
      inputData.model_type,
      fields_and_update_values_without_mvs,
      inputData.cols
    );
  } else {
    final_return = await update_fluxx_record(
      z,
      inputData.model_type,
      inputData.id,
      fields_and_update_values_without_mvs,
      inputData.cols
    );
  }
  
  // handle Model Attribute Values (multi-value controls) separately.
  if (Array.isArray(mv_fields) && mv_fields.length > 0) {
    
    // grab current MACs for record, restricted to only those relating to the mv_fields.
    // this is an array of object returns from a Fluxx query, with keys:
    // 'id', 'amount_value', 'model_id', 'model_attribute_id', 'model_attribute_value_id'
    let existing_macs = await existing_macs_for_record(z, bundle, inputData.id, structured_mas, mv_fields);
    
    for (var mv_field of mv_fields) {
      await processMAVOperationsForRecordField({
        z: z, 
        bundle: bundle, 
        model_type: inputData.model_type, 
        model_id: inputData.id, 
        field_name: mv_field,
        operations: all_fields_and_update_values[mv_field], // the "operations" text box
        structured_mas: structured_mas,
        existing_macs: existing_macs,
      });
    }
/*    await Promise.allSettled(mv_fields.map(async (mv_field) => {
      processMAVOperationsForRecordField(
        z, 
        bundle, 
        inputData.model_type, 
        inputData.id, 
        mv_field,
        all_fields_and_update_values[mv_field], // the "operations" text box
        structured_mas,
        existing_macs
      );
    }));
*/
  }
  
  bundle.inputData.cols.forEach((field) => {
    if (!(field in final_return.fields)) {
      final_return.fields[field] = null;
    }
  });

  return final_return;


  /**
   * give it a list of field names and a model_type, and this
   * function returns a list of those items that are multi_value type.
   * Each list item is an object with keys id, name, description and model_type
   * where model_type is in form GrantRequest (CamelCase)
   **/
  /* 
output = 
[
  {
    id: 123,
    name: "type_1",
    description: "Type",
    model_type: "GrantRequest"
  }, ...
]

*/

  /**
   * Combine the fields and values into one object with
   * the fields as keys and the values as values
   */

  function fields_and_values(fields, values, mv_fields) {
    var i;
    const all_fields = {}, fields_without_mvs = {};
    for (i = 0; i < fields.length; i++) {
      all_fields[fields[i]] = values[i];
      if (!mv_fields.includes(fields[i])) {
        fields_without_mvs[fields[i]] = values[i];
      }
    }
    return [all_fields, fields_without_mvs];
  }

  async function update_fluxx_record(
    z,
    model_type,
    id,
    fields_and_update_values,
    cols
  ) {
    const options = {
      url: `https://${bundle.authData.client_domain}/api/rest/v2/${FluxxAPI.fn.modelToSnake(
        model_type
      )}/${id}`,
      method: 'PUT',
      headers: FluxxAPI.c.STANDARD_HEADERS(bundle),
      params: {},
      form: {
        // CONVERT BACK TO body FIXME! ??
        data: z.JSON.stringify(fields_and_update_values),
        cols: z.JSON.stringify(cols),
      },
    };

    var response = await z.request(options);
    response.throwForStatus();
    FluxxAPI.fn.handleFluxxAPIReturnErrors(z, response);
    response = response.data;
    return {
      model_type: FluxxAPI.fn.modelToSnake(model_type),
      id: response[FluxxAPI.fn.modelToSnake(model_type)].id,
      fields: response[FluxxAPI.fn.modelToSnake(model_type)],
    };
  }

};

const getInputFieldsForModelTypes = async (z, bundle) => {
  // Generate a list of Model Types
  // based on the "group" e.g. Basic, All.

  const r = await FluxxAPI.fn.fetch_core_and_machine_model_list(z, bundle, bundle.inputData.model_group);
  return {
    key: 'model_type',
    label: 'Model Type',
    choices: r,
    type: 'string',
    required: true,
    placeholder: 'Choose model…',
    altersDynamicFields: true,
  };

};

const getInputFieldsForUpdateCreate = async (z, bundle) => {
  // Fields to Update/Create
  var model_type = bundle.inputData.model_type;
  if (model_type == '') {
    model_type = 'GrantRequest';
  }

  if (model_type === undefined || model_type === '') {
    return;
  }
  const r = await FluxxAPI.fn.fields_for_model(z, bundle, model_type, FluxxAPI.c.CORE_MODELS, true);
  return {
    key: 'fields',
    label: 'Field List for Update/Create',
    choices: r,
    type: 'string',
    required: true,
    list: true,
    placeholder: 'Select a field to assign a value to…',
    helpText:
      'Enter the list of fields you want to update (or create in a new record). Use one per box. The list of field options depends on which Model Type is chosen.',
    altersDynamicFields: true,
  };
};

const getInputFieldsForReturnFields = async (z, bundle) => {
  // Fields to return from new/updated model
  const model_type = bundle.inputData.model_type;

  if (model_type === undefined || model_type === '') {
    return;
  }
  const r = await FluxxAPI.fn.fields_for_model(z, bundle, model_type, FluxxAPI.c.CORE_MODELS);
  return {
    key: 'cols',
    label: 'Fields to Return',
    choices: r,
    type: 'string',
    required: true,
    list: true,
    placeholder: 'Choose return field…',
    helpText:
      'Enter the list of fields you want to return from the updated or created record. Use one per box. The list of fields depends on which Model Type is chosen.',
  };
};

/**
 * processMAVOperationsForRecordField()
 * After a record has been edited/created, we may need to attach some MACs to it (for multi-value
 * select boxes etc). The operations value is a string holding multi-lines, and a basic set of
 * formatted instructions on which multi-value options to remove or add to it. There are options
 * for doing so by name or by value.
 *
 * operations format:
 * All lines start with a delimiter character of your choice. The same delimiter is used for the rest
 * of that line. It can be changed to a different character if the names of the options would clash
 * with a certain character.
 *
 * {delimiter}keyword(/optional percentage){delimiter}{optional data, for all keywords except for delete_all}
 *
 * {data}: integer for any id-related keywords, otherwise the hierarchical levels of the "value" of
 * model_attribute_values. e.g. if you have a two-level hierarchy, state => city, then state#city with no trailing delimiter.
 *
 * operations sample:

#remove_all                   Removes all existing MACs 
#remove#level 1#level 2       Remove existing MAC by path
#remove_id#123                Remove existing MAC by id
#add#level 1#level 2          Adds MAC by name; removes percentage from existing item, or adds without percentage. "" != 0.
#add/50#level 1#level 2       Adds MAC by name with percentage. Any existing percentage in existing MAC is modified.
#add_id/50#123                Adds MAC by id with percentage. Any existing percentage in existing MAC is modified.

 */
async function processMAVOperationsForRecordField(opts)
{
  let structured_mas = opts.structured_mas;
  let z = opts.z;
  let bundle = opts.bundle;
  let model_type = opts.model_type;
  let model_id = opts.model_id;
  let field_name = opts.field_name; // This relates to a particular ma_id
  let ma_id = FluxxAPI.mav_tree.ma_for_name(structured_mas, field_name).__zapier_orig.id;
  let operations = opts.operations;
  let existing_macs = opts.existing_macs;
  
  // parse operations - barf if any are not parseable
  if (operations === undefined || operations === null || operations.trim() == "") {
    return;
  }
  let lines = operations.split("\n").sort().reverse(); // reverse so the removes come before the adds
  let line;
  let processed_lines = [];
  let delimiter;
  let line_segments;
  let keyword_a;
  let o, i;
  lines.forEach(line => {
    if (line.trim() != "") { // skip blank lines
      delimiter = line[0];
      line_segments = line.split(delimiter); // first item always blank (before 1st delimiter)
      o = {};
      keyword_a = line_segments[1].split("/"); // detect optional percentage specification
      o.keyword = keyword_a[0];
      if (keyword_a.length > 0) {
        o.percentage = keyword_a[1]; // the percentage
      } else {
        o.percentage = ""; // not the same as zero. Empty string means remove (no percentage).
      }
      if (o.keyword.slice(-3) == "_id") {
        if (line_segments.length > 2 && line_segments[2].trim() != "") {
          o.id = line_segments[2];
        } else {
          throw(`invalid line, no id specified: "${line}"`);
        }
      } else {
        o.path = [];
        for (i = 2; i < line_segments.length; i++) {
          if (line_segments[i] != "") {
            o.path.push(line_segments[i]);
          }
        }
      }
      processed_lines.push(o);
      // Now we have the following in each o:
      // keyword:     add     or    add_id  etc
      // percentage:  50
      // path         [path1, path2, etc]
      //   or:
      // id           123     add_id or remove_id keywords
    }
  });
  let did_remove_all = false;
  let processed_line;
  // call the operations in order
  for (processed_line of processed_lines) {
    switch(processed_line.keyword) {
    case "remove_all":
      if (!did_remove_all) {
        await remove_all_macs_for_ma(z, bundle, processed_line, structured_mas, existing_macs, model_type, model_id, ma_id);
        existing_macs = [];
        did_remove_all = true;
      }
      break;
    case "remove":
    case "remove_id":
      if (!did_remove_all) {
        await remove_mac(z, bundle, processed_line, structured_mas, existing_macs, model_type, model_id, field_name, ma_id);
      }
      break;
    case "add":
    case "add_id":
      await add_mac(z, bundle, processed_line, structured_mas, existing_macs, model_type, model_id, bundle.inputData.user_id, field_name);
      break;
    }
  }
}

async function remove_all_macs_for_ma(z, bundle, o, structured_mas, existing_macs, model_type, model_id, ma_id)
{
  /*
  await Promise.allSettled(existing_macs.map(async (mac) => {
    remove_mac_with_id(z, mac.id);
  }));
  */
  let mac;
  let i;
  for (i = 0; i < existing_macs.length; i++) { // by i, so we can delete items from array after deleting the mac
    mac = existing_macs[i];
    if (mac.model_attribute_id == ma_id) {
      await remove_mac_with_id(z, bundle, mac.id);
      existing_macs.splice(i, 1);
      i--; // take account of the fact we deleted the current one.
    }
  }
}

// remove a MAC that relates to a particular "option" for the current model_id (aka MAV)
// the "option" is a MAV, by name or id.
// there can only be one MAC for a MAV.
async function remove_mac(z, bundle, o, structured_mas, existing_macs, model_type, model_id, field_name, ma_id2)
{
  let mav_id, ma_id;
  if (o.path !== undefined) {
    // call something to get the id of the path from o.path
    [mav_id, ma_id] = FluxxAPI.mav_tree.mav_and_ma_id_for_field_name_and_path(structured_mas, field_name, o.path);
    
  } else {
    // call something to create the model_attribute_choice that links to model_id,
    //	model_attribute_id, model_attribute_value_id, and	amount_value.
    mav_id = o.id;
  }

  let mav_index = existing_macs.findIndex(mac => mac.model_attribute_value_id == mav_id);
  if (mav_index !== -1) {
    await remove_mac_with_id(z, bundle, existing_macs[mav_index].id);
    // now remove it from the existing_macs list
    existing_macs.splice(mav_index, 1);    
  }
}
async function remove_mac_with_id(z, bundle, mac_id)
{
  const options = {
    url: `https://${bundle.authData.client_domain}/api/rest/v2/model_attribute_choice/${mac_id}`,
    method: 'DELETE',
    headers: FluxxAPI.c.STANDARD_HEADERS(bundle),
    params: {},
    body: {
    },
  };
  var response = await z.request(options);
  response.throwForStatus();
  FluxxAPI.fn.handleFluxxAPIReturnErrors(z, response);
  return response.data;
}

async function add_mac(z, bundle, o, structured_mas, existing_macs, model_type, model_id, user_id, mv_field_name)
{
  // 1 - if there's a path, resolve it to a MAV id
  // 2 - check our list of existing MACs for that MAV (obviously for the current model id). We may already have one.
  // 3 - even if we have one, the percentage may be different.
  // 4 - if we didn't have one, add it.
  // 5 - if we had one, update it with the new percentage, if necessary. Only update if the percentage needs updating.
    
  // 1 - resolve path to MAV id
  var mav_id, ma_id;
  if (o.path !== undefined) {
    // call something to get the id of the path from o.path
    [mav_id, ma_id] = FluxxAPI.mav_tree.mav_and_ma_id_for_field_name_and_path(structured_mas, mv_field_name, o.path);
        
  } else {
    // call something to create the model_attribute_choice that links to model_id,
    //	model_attribute_id, model_attribute_value_id, and	amount_value.
    mav_id = o.id;
  }
  
  // 2 - check to see if we already have a MAC for that MAV.
    let previous_mac_object = existing_macs.find(mac => mac.model_attribute_value_id === mav_id);
  
  // 4 - if we didn't have one, add it.
  if (previous_mac_object === undefined) {
    return create_mac(z, bundle, model_id, ma_id, mav_id, o.percentage, user_id);
  } else {
    // 5 - if we had one, update it with the new percentage, if necessary. Only update if the percentage needs updating.
    let old_percentage = previous_mac_object.amount_value; // may be undefined; that's ok.
    if (old_percentage == o.percentage) {
      return; // nothing to do here
    } else {
      // return an async function; should be fine as the caller "waits".
      return update_mac_with_new_percentage(z, bundle, previous_mac_object.id, o.percentage, user_id);
    }
  }
}

async function create_mac(z, bundle, model_id, ma_id, mav_id, percentage, user_id)
{  
  const options = {
    url: `https://${bundle.authData.client_domain}/api/rest/v2/model_attribute_choice`,
    method: 'POST',
    headers: FluxxAPI.c.STANDARD_HEADERS(bundle),
    params: {},
    body: {
      data: z.JSON.stringify({
        model_id: model_id,
        model_attribute_id: ma_id,
        model_attribute_value_id: mav_id,
        amount_value: percentage,
        created_by: user_id,
        updated_by: user_id,
      }),
      cols: z.JSON.stringify(["id"]),
    },
  };
  var response = await z.request(options);
  response.throwForStatus();
  FluxxAPI.fn.handleFluxxAPIReturnErrors(z, response);
  return response.data;
}

async function update_mac_with_new_percentage(z, bundle, mac_id, percentage, user_id)
{
  if (percentage === null || percentage === undefined || percentage === "") {
    percentage = ""; // this is how to make something NULL in Fluxx.
  } else {
    percentage = percentage - 0; // convert to number. Can be int or floating point.
  }

  const options = {
    url: `https://${bundle.authData.client_domain}/api/rest/v2/model_attribute_choice/${mac_id}`,
    method: 'PUT',
    headers: FluxxAPI.c.STANDARD_HEADERS(bundle),
    params: {},
    body: {
      data: z.JSON.stringify({amount_value: percentage, updated_by: user_id}),
      cols: z.JSON.stringify(["id", "amount_value"]),
    },
  };

  var response = await z.request(options);
  response.throwForStatus();
  FluxxAPI.fn.handleFluxxAPIReturnErrors(z, response);
  return {
    amount_value: response.data.model_attribute_choice.amount_value,
  };
}


async function existing_macs_for_record(z, bundle, model_id, structured_mas, mv_fields)
{
  
  // The structured MAs are the MAs which are multi-value. So, we want to get a list of all
  // MACs that relate to these MAs.
  
  
  const options = {
    url: `https://${bundle.authData.client_domain}/api/rest/v2/model_attribute_choice/list`,
    method: 'POST',
    headers: FluxxAPI.c.STANDARD_HEADERS(bundle),
    params: {},
    body: {
      cols: z.JSON.stringify(['id', 'amount_value', 'model_id', 'model_attribute_id', 'model_attribute_value_id']),
    },
  };
  
  options.body.filter = JSON.stringify({
    model_attribute_id: structured_mas.filter(ma => mv_fields.includes(ma.__zapier_orig.name)).map(ma => ma.__zapier_orig.id),
    model_id: model_id,
  });
  
  const response = await FluxxAPI.fn.paginated_fetch(z, bundle, options, "model_attribute_choice", 0); // limit 0 means no limit
  
  return response.data.records.model_attribute_choice;
}

module.exports = {
  key: 'record_update_new',
  noun: 'Fluxx Record',
  display: {
    label: 'Create/Update Fluxx Record',
    description:
      'Allows you to create or update a Fluxx record of any model type. Give it the name of the model, a list of fields and a list of their corresponding values and this Action will create a new record. If you include the id, it will use the values to update an existing record.',
    hidden: false,
    important: true,
  },
  operation: {
    inputFields: [
      {
        key: 'id',
        label: 'Record ID',
        type: 'integer',
        helpText:
          'Enter the id of the record to update, or leave blank to create a new record.',
        required: false,
        list: false,
        altersDynamicFields: false,
      },
      {
        key: 'model_group',
        label: 'Model Group',
        type: 'string',
        choices: ['Basic', 'Intermediate', 'Dynamic Models only', 'All'],
        helpText:
          'You can trim down the number of Model Types displayed in the selector below, by choosing a different option here.',
        default: 'Basic',
        required: true,
        list: false,
        altersDynamicFields: true,
      },
      getInputFieldsForModelTypes,
      getInputFieldsForUpdateCreate,
      FluxxAPI.fn.getReturnFieldDescriptions,
      {
        key: 'values',
        label: 'Value List',
        type: 'text',
        helpText:
          'Enter a value corresponding to each Field from the previous form control. Use one per box.\nThe first Field will be set to the first Value, the second Field to the second Value, etc.',
        required: true,
        list: true,
        placeholder: 'Enter value to create/update for its corresponding Field above',
        altersDynamicFields: false,
      },
      getInputFieldsForReturnFields,
    ],
    sample: {
      model_type: 'grant_request',
      id: 65,
      fields: { id: 65, amount_requested: 4000, amount_recommended: 1000 },
    },
    outputFields: [
      { key: 'model_type' },
      { key: 'id', type: 'integer' },
      { key: 'fields__amount_requested', type: 'number' },
      { key: 'fields__amount_recommended', type: 'number' },
    ],
    perform: perform,
  },
};
