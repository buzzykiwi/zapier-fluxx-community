'use_strict';

const FluxxAPI = require('./fluxx_api');
const HIDDEN_FIELD_NAME = '__zapier_orig';

const ma_for_name = module.exports.ma_for_name = function(mas, field_name) {
  let ma;
  return mas.find(ma => ma[HIDDEN_FIELD_NAME].name == field_name);
}
const ma_for_id = module.exports.ma_for_id = function(mas, id) {
  let ma;
  return mas.find(ma => ma[HIDDEN_FIELD_NAME].id == id);
}
const mav_for_id = module.exports.mav_for_id = function(mavs, id) {
  let mav;
  return mavs.find(mav => mav[HIDDEN_FIELD_NAME].id == id);
}

// Now go through all the mavs and push them onto either a ma, or onto another mav as a parent.
// the mas and mavs arrays are altered in place.
const makeTree = function(mas, mavs) {
  // check that the MAs and MAVs exist
  if (!Array.isArray(mas) || !Array.isArray(mavs) || mas.length == 0 || mavs.length == 0) {
    return;
  }
  // Transform the direct results from z.request into result arrays
  if (mas.records !== undefined && mas.records.model_attribute !== undefined) {
    mas = mas.records.model_attribute;
  }
  if (mavs.records !== undefined && mavsrecords.model_attribute_value !== undefined) {
    mavs = mavs.records.model_attribute_value;
  }

  // Move all the standard fields in the MAs into a hidden field
  // so we can we can use object keys for the names of child MAVs
  if (mas[0][HIDDEN_FIELD_NAME] === undefined) {
    // move all the ma info into hidden sub-arrays
    mas.forEach(ma => {
      ma[HIDDEN_FIELD_NAME] = {
        ...ma
      };
      delete ma.id;
      delete ma.name;
      delete ma.model_type;
      delete ma.attribute_type;
      delete ma.multi_allowed;
    });
  };

  // And the same for MAVs
  if (mavs[0][HIDDEN_FIELD_NAME] === undefined) {
    // move all the mav info into hidden sub-arrays
    mavs.forEach(mav => {
      mav[HIDDEN_FIELD_NAME] = {
        ...mav
      };
      delete mav.id;
      delete mav.description;
      delete mav.value;
      delete mav.model_attribute_id;
      if (mav.dependent_model_attribute_value_id !== undefined) {
        delete mav.dependent_model_attribute_value_id;
      }
    });
  };

  let mav;
  mavs.forEach(mav => {
    if (mav[HIDDEN_FIELD_NAME].dependent_model_attribute_value_id === undefined || mav[HIDDEN_FIELD_NAME].dependent_model_attribute_value_id === null) { // it's a parent
      ma_for_id(mas, mav[HIDDEN_FIELD_NAME].model_attribute_id)[mav[HIDDEN_FIELD_NAME].value] = mav;
    } else {
      mav_for_id(mavs, mav[HIDDEN_FIELD_NAME].dependent_model_attribute_value_id)[mav[HIDDEN_FIELD_NAME].value] = mav;
    }
  });
}

/**
 * mav_and_ma_id_for_field_name_and_path
 * Feed this a list of MAs that have already had make_tree() performed, and
 * this function will return the MAV id of the last segment of the path.
 * Note that if there are sibling path segments that share the same name (value),
 * then this routine may fail, as it may take the wrong path and not find a complete match.
 * It also takes no account of retired fields, treating all fields the same whether
 * retired or not. I believe this is the most accurate way to treat it.
 *
 * Returns: null if there are no defined MAs for the field_name, or if the path cannot be found.
 */
module.exports.mav_and_ma_id_for_field_name_and_path = function(prepared_mas, field_name, path) {
  if (!Array.isArray(prepared_mas) || prepared_mas.length == 0) {
    return [null, null];
  }
  let split_path;
  
  // We assume we're on the correct model.
  let ma = ma_for_name(prepared_mas, field_name);
  if (ma === undefined) return [null, null];
  let cursor = ma; // start at ma level; work our way down

  // split the path into segments based on the first characted being the delimiter.
  // e.g. path could be: #country#province#city  (do not use trailing delimiter)
  if (Array.isArray(path)) {
    split_path = path;
  } else {
    split_path = path.split(path[0]);
    if (split_path.length < 2) return [null, null];
    split_path.shift(); // remove blank first item in array
  }
  let abort = false;
  let i;
  for (i = 0; i < split_path.length; i++) {
    let segment = split_path[i];

    let possible_match = cursor[segment];
    if (possible_match === undefined) {
      abort = true; // for the current segment, we didn't find a match
      break;
    } else {
      cursor = possible_match;
    }
  }
  if (abort == true) {
    return [null, null];
  }
  return [cursor[HIDDEN_FIELD_NAME].id, cursor[HIDDEN_FIELD_NAME].model_attribute_id];
}

/**
 * structured_mas_and_mvs_for_model
 * This gives a tree structure based on ModelAttributes. Each MA has 1-many ModelAttributeValues attached,
 * for any MAs that are *multi-value with multi allowed* (not just any old MAs), AND are in the field_list.
 * Using the field_list means we don't return any more fields (MAs) than we need.
 */
const structured_mas_and_mvs_for_model = module.exports.structured_mas_and_mvs_for_model = async function(z, bundle, model_type, field_list) {
  let mas_options = {
    url: `https://${bundle.authData.client_domain}/api/rest/v2/model_attribute/list`,
    method: 'POST',
    headers: FluxxAPI.c.STANDARD_HEADERS(bundle),
    body: {
      filter: z.JSON.stringify({ // this type of filter required for non-elastic searches
        model_attribute: {
          attribute_type: "multi_value",
          multi_allowed: 1,
          model_type: FluxxAPI.fn.modelToCamel(model_type),
          name: field_list
        },
      }),
      cols: z.JSON.stringify(["model_type", "id", "name", "attribute_type", "multi_allowed"]),
    },

  };
  let mas = await FluxxAPI.fn.paginated_fetch(z, bundle, mas_options, "model_attribute", 0); // 0 = no limit.
  if (mas.data === undefined || mas.data.records == undefined || mas.data.records.model_attribute === undefined) {
    throw ("Error retrieving Multi Attribute information from Fluxx");
  }
  // Simplify mas to be the array of responses itself
  mas = mas.data.records.model_attribute;

  // If there were no MAs, there's no need to make a tree of options. Just return the empty array.
  if (mas.length == 0) {
    return [[],[]];
  }

  // Otherwise, prepare to grab all the MAVs associated with the list of MAs.
  let ma;
  let model_attribute_ids = [];
  mas.forEach(ma => {
    model_attribute_ids.push(ma.id);
  });


  let mavs_options = {
    url: `https://${bundle.authData.client_domain}/api/rest/v2/model_attribute_value/list`,
    method: 'POST',
    headers: FluxxAPI.c.STANDARD_HEADERS(bundle),
    body: {
      filter: z.JSON.stringify({
        model_attribute_value: {
          model_attribute_id: model_attribute_ids,
        }
      }),
      cols: z.JSON.stringify(["id", "description", "value", "model_attribute_id", "dependent_model_attribute_value_id"]),
    }
  };
  let mavs = await FluxxAPI.fn.paginated_fetch(z, bundle, mavs_options, "model_attribute_value", 0); // 0 = no limit.
  if (mavs.data === undefined || mavs.data.records == undefined || mavs.data.records.model_attribute_value === undefined) {
    throw ("Error retrieving Multi Attribute Value information from Fluxx");
  }
  mavs = mavs.data.records.model_attribute_value;

  // We have the lists: now parse them into a form that we can search using mav_and_ma_id_for_field_name_and_path()
  // This alters mas in place.
  makeTree(mas, mavs);
  return [mas, mavs];
}

module.exports.which_fields_are_mvs = async function(z, bundle, model_type, structured_mas, field_list) {
  // If no MAs given, look for them now and return them later.
  if (structured_mas === null) {
    [structured_mas, structured_mvs] = await structured_mas_and_mvs_for_model(z, bundle, model_type, field_list);
  }
  // Simple case: if there are no MAs for this model, return empty list.
  if (Array.isArray(structured_mas) && structured_mas.length == 0) {
    return [structured_mas, [], []];
  }
  if (!(Array.isArray(field_list))) {
    return [structured_mas, [], []];
  }
  // Otherwise, return a list of anything in the field_list that is also in the structured_mas list.
  var field_name;
  const names_for_return = [];
  field_list.forEach(field_name => {
    if (ma_for_name(structured_mas, field_name) !== undefined) {
      names_for_return.push(field_name);
    }
  });
  return [structured_mas, structured_mvs, names_for_return];
}

// for reference
/*
mas_sample = [
  {
    "id": 12568,
    "name": "tactics_and_methods",
    "model_type": "GrantRequest",
    "attribute_type": "multi_value",
    "multi_allowed": 1
  },
  // etc
]

mavs_sample = [
  {
    "id": 85583,
    "description": "Community Organizing",
    "value": "Community Organizing",
    "model_attribute_id": 12568
  },
  {
    "id": 9285809,
    "description": "02 110: Early childhood education",
    "value": "02 110: Early childhood education",
    "model_attribute_id": 102121,
    "dependent_model_attribute_value_id": 9285798,
    "amount_value": 99,
  },
  // etc
];
*/


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

const processMAVOperationsForRecordField = module.exports.processMAVOperationsForRecordField = async function (opts)
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

const remove_all_macs_for_ma = module.exports.remove_all_macs_for_ma = async function (z, bundle, o, structured_mas, existing_macs, model_type, model_id, ma_id)
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
const remove_mac = module.exports.remove_mac = async function (z, bundle, o, structured_mas, existing_macs, model_type, model_id, field_name, ma_id2)
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

const remove_mac_with_id = module.exports.remove_mac_with_id = async function (z, bundle, mac_id)
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

const add_mac = module.exports.add_mac = async function (z, bundle, o, structured_mas, existing_macs, model_type, model_id, user_id, mv_field_name)
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
      return await update_mac_with_new_percentage(z, bundle, previous_mac_object.id, o.percentage, user_id);
    }
  }
}

const create_mac = module.exports.create_mac = async function (z, bundle, model_id, ma_id, mav_id, percentage, user_id)
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

const update_mac_with_new_percentage = module.exports.update_mac_with_new_percentage = async function (z, bundle, mac_id, percentage, user_id)
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


const existing_macs_for_record = module.exports.existing_macs_for_record = async function (z, bundle, model_id, structured_mas, mv_fields)
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

/**
 * Combine the fields and values into one object with
 * the fields as keys and the values as values
 */

const fields_and_values = module.exports.fields_and_values = function (fields, values, mv_fields) {
  var i;
  const all_fields = {}, fields_without_mvs = {};
  for (i = 0; i < fields.length; i++) {
    let v = Array.isArray(values[i]) ? values[i].join(",") : values[i];
    all_fields[fields[i]] = v;
    if (!mv_fields.includes(fields[i])) {
      fields_without_mvs[fields[i]] = v;
    }
  }
  return [all_fields, fields_without_mvs];
}
