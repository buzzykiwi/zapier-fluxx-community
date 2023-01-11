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
 * structured_mas_and_mavs_for_model
 * This gives a tree structure based on ModelAttributes. Each MA has 1-many ModelAttributeValues attached,
 * for any MAs that are *multi-value with multi allowed* (not just any old MAs), AND are in the field_list.
 * Using the field_list means we don't return any more fields (MAs) than we need.
 */
const structured_mas_and_mavs_for_model = module.exports.structured_mas_and_mavs_for_model = async function(z, bundle, model_type, field_list) {
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

module.exports.which_fields_are_mavs = async function(z, bundle, model_type, structured_mas, field_list) {
  // If no MAs give, look for them now and return them later.
  if (structured_mas === null) {
    [structured_mas, structured_mavs] = await structured_mas_and_mavs_for_model(z, bundle, model_type, field_list);
  }
  // Simple case: if there are no MAs for this model, return empty list.
  if (Array.isArray(structured_mas) && structured_mas.length == 0) {
    return [structured_mas, []];
  }
  if (!(Array.isArray(field_list))) {
    return [structured_mas, []];
  }
  // Otherwise, return a list of anything in the field_list that is also in the structured_mas list.
  var field_name;
  const names_for_return = [];
  field_list.forEach(field_name => {
    if (ma_for_name(structured_mas, field_name) !== undefined) {
      names_for_return.push(field_name);
    }
  });
  return [structured_mas, structured_mavs, names_for_return];
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
