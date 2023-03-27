
const FluxxAPI = require('../fluxx_api');

const perform = async (z, bundle) => {
  const inputData = bundle.inputData;
  let include_retired = inputData.include_retired;
  let separator = inputData.separator;
  if (separator === undefined || separator === null || separator === "") {
    separator = '§';
  }


  let ma_id = inputData.field_id;
  if (typeof ma_id != "number" || ma_id <= 0){
    throw new z.errors.Error('Field id (model_attribute_id) is missing/invalid.', 'InvalidData');
  }
  
  let filter = { // this type of filter required for non-elastic searches
    model_attribute_value: {
      model_attribute_id: inputData.field_id,
    },
  };
  if (include_retired != 'yes') {
    filter.model_attribute_value.retired = 0;
  }
    
  // Now fetch all MAVs that relate to that MA
  let mav_options = {
    url: `https://${bundle.authData.client_domain}/api/rest/v2/model_attribute_value/list`,
    method: 'POST',
    headers: FluxxAPI.c.STANDARD_HEADERS(bundle),
    body: {
      filter: z.JSON.stringify(filter),
      cols: z.JSON.stringify(["id", "retired", "dependent_model_attribute_value_id", "description", "value", "display_order"]),
    },

  };
  let mavs = await FluxxAPI.fn.paginated_fetch(z, bundle, mav_options, "model_attribute_value", 0); // 0 = no limit.
  let mav;
  if (mavs.data === undefined || mavs.data.records == undefined || mavs.data.records.model_attribute_value === undefined) {
    throw (`Error retrieving Multi Attribute information from Fluxx: attribute ${inputData.field} not found`);
  }
  // Simplify mavs to be the array of responses itself
  mavs = mavs.data.records.model_attribute_value;
  
  // trim whitespace if requested
  if (inputData.trim == 'yes') {
    mavs.forEach(mav => {
      if (typeof mav.value === "string") {
        mav.value = mav.value.trim();
      }
      if (typeof mav.description === "string") {
        mav.description = mav.description.trim();
      }
    });
  }
  // Now put them into a tree. To do this, I first add a Children node to each,
  // then we loop again and if an item has a dependent_model_attribute_value_id then we add it to
  // the children of that node.
  
  let mavs_by_id = {}; // for easy lookup later, keyed by id
  mavs.forEach(mav => {
    mav.children = {}; // children will be keyed by name
    mavs_by_id[mav.id] = mav;
  });
  // put any mav with a parent into its parent's "children" list. - easy hierarchy!
  mavs.forEach(mav => {
    if (mav.dependent_model_attribute_value_id != undefined && mav.dependent_model_attribute_value_id != null) {
      mavs_by_id[mav.dependent_model_attribute_value_id].children[mav.value] = mav;
    }
  });
  
  /* EXAMPLE of the tree of items already attached:
  mavs_by_id = {
    9972972: {
      "id": 9972972,
      "description": "",
      "value": "aaa",
      "retired": 1,
      "children": {
        "a1": {
          "id": 10083629,
          "description": "a1",
          "value": "a1",
          "dependent_model_attribute_value_id": 9972972,
          "retired": 1,
          "children": {
            "a1-1": {
              "id": 10262319,
              "description": "a1-1 desc",
              "value": "a1-1",
              "dependent_model_attribute_value_id": 10083629,
              "retired": 0,
              "children": {}
            }
          }
        },
        "a2": {
          "id": 10083630,
          "description": "a2",
          "value": "a2",
          "dependent_model_attribute_value_id": 9972972,
          "retired": 1,
          "children": {}
        }
      }
    },
    {...}
  }
  */
  
  
  // now step through all items in the flat list of all MAVs for the MA, and construct the path of each, traversing backwards
  // over their dependent_model_attribute_value_ids (parents).
  
  mavs.forEach(mav => {
    let mav_parent = mav.dependent_model_attribute_value_id;
    mav.path = '';
    while (mav_parent !== undefined && mav_parent !== null && mav_parent > 0) {
      mav.path = `${separator}${mavs_by_id[mav_parent].value}${mav.path}`;
      // now go up a level and try the parent.
      mav_parent = mavs_by_id[mav_parent].dependent_model_attribute_value_id;
    }
    mav.parent_path = mav.path;
    mav.path = mav.path + separator + mav.value;
  });
  
  // Now we have:
  // mavs_by_id: object of all mavs. Each has a "path":"§bbb§b2"

  let mav_id;
  let line_items = [];
  
  for (mav_id in mavs_by_id) { // mav_id is the key (id), not the entire mav
    line_items.push({
      li_action: 'add',
      li_path: mavs_by_id[mav_id].path,
      li_retired: mavs_by_id[mav_id].retired,
      li_value: mavs_by_id[mav_id].value,
      li_description: mavs_by_id[mav_id].description,
      li_display_order: mavs_by_id[mav_id].display_order,
    });
  }
  
  line_items.sort((a, b) => {
    if (a.li_path < b.li_path) return -1;
    else if (a.li_path > b.li_path) return 1;
    else return 0;
  });

  return {
    model_type: inputData.model_type,
    field_id: inputData.field_id,
    line_items: line_items,
//    mavs_by_id: z.JSON.stringify(mavs_by_id),
//    mavs: z.JSON.stringify(mavs),
  }
}


module.exports = {
  key: 'select_field_options',
  noun: 'SELECT Field Fetch',
  display: {
    label: 'Fetch Options Available on a SELECT Field',
    description:
      'This action fetches the list of options available for a given SELECT field (can be single or multi value), in a form that can be passed to the "Select List Management" action, to recreate the same list of options on another field. This can be useful for copying option lists between PreProd and Live servers.',
    hidden: false,
    important: false,
  },
  operation: {
    inputFields: [
      {
        key: 'model_group',
        label: 'Model Group',
        type: 'string',
        choices: ['Basic', 'Intermediate', 'Dynamic Models only', 'All'],
        helpText:
          'Filter the Model Types displayed in the selector below, by choosing a different option here.',
        default: 'Basic',
        required: true,
        list: false,
        altersDynamicFields: true,
      },
      FluxxAPI.fn.getInputFieldsForModelTypes,
      {
        key: 'field_id',
        required: true,
        label: 'Choose a SELECT field',
        type: 'integer',
        // dynamic: first the key of the component to use (usually a trigger)
        // then the field in the returned item representing the ID - this is the value that will be saved.
        // then the field in the returned item representing the NAME (for display purposes)
        dynamic: 'multi_fields_for_model.id.label',
        placeholder: 'Choose a field…',
        helpText:
          'The output will be a representation of all the options available for this SELECT field',
      },
      {
        key: 'trim',
        label: 'Trim Whitespace?',
        required: true,
        choices: {
          yes: 'Trim',
          no: "Don't Trim", 
        },
        default: 'yes',
        altersDynamicFields: false,
        helpText:
          'If selected, any whitespace will be trimmed from the beginning and end of each Value and Description',
      },
      {
        key: 'separator',
        label: 'Path Separator Character',
        required: true,
        type: 'string',
        default: '§',
        altersDynamicFields: false,
        helpText:
          'The full path for each option will start with this character, and each path segment will be separated by the character. Default: §',
      },
      {
        key: 'include_retired',
        label: 'Include Retired Options?',
        required: true,
        choices: {
          yes: 'Include',
          no: "Don't Include", 
        },
        default: 'yes',
        altersDynamicFields: false,
      }
      
    ],
    sample: {
      model_type: 'GrantRequest',
      "id": 12345,
      "option_string": "§add§California§Los Angeles\n§add§California§San Diego\n§add§Colorado§Boulder"
    },
    outputFields: [
      { key: 'model_type' },
      { key: 'id', type: 'integer' },
      { key: 'option_string', type: 'text' },
    ],
    perform: perform,
  },
};
