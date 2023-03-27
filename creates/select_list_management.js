'use_strict';
/*jshint esversion: 8 */

const FluxxAPI = require('../fluxx_api');

// fix for Promise.allSettled: see https://www.appsloveworld.com/nodejs/100/418/problem-with-promise-allsettled-unexpected-returns
const IS_FULFILLED = 0x2000000
const IS_REJECTED = 0x1000000
const STATUS_MAP = {
  [IS_FULFILLED]: { status: 'fulfilled' },
  [IS_REJECTED]: { status: 'rejected' },
}
const transformAllSettled = (results) =>
 results.map(({ _bitField, _settledValueField, ...rest }) =>
    _bitField ? { ...STATUS_MAP[_bitField], value: _settledValueField } : rest,
  )

const transformPromiseValue = (p) => p.value;

const perform = async (z, bundle) => {
  const inputData = bundle.inputData;
  
  let deletes = [];
  let updates = [];
  let updates_results = [];
  let creates_results = [];
  let deletes_results = [];
  let all_deletes_results = [];

  /*
  1. create a multi-level structure with all the line items we have been given.
  
  This is what we get as input:
  
{
  model_group: 'Basic',
  action: 'add',
  remove_all: 'no',
  model_type: 'GrantRequest',
  li_value_path: '#foo#bar1,#foo#wombat1,#foo1||COMMA|| goo#bar1,#foo2\n goo#bar2',
  li_description: '#FOO#BAR1,#FOO#WOMBAT,#FOO2#BAR2',
  li_retired: 'False,False,False,False',
  li_action: 'add,delete,add,delete',
  field: 'boardmeeting',
  values: '12345',
  line_items: [
    {
      li_value_path: '#foo#bar1',
      li_description: 'BAR1',
      li_retired: false,
      li_order: 1,
      li_action: 'add'
    },
    {
      li_value_path: '#foo#wombat1',
      li_description: 'WOMBAT',
      li_retired: false,
      li_order: 2,
      li_action: 'delete'
    },
    {
      li_value_path: '#foo1||COMMA| goo#bar1',
      li_retired: false,
      li_order: 3,
      li_action: 'add'
    },
    {
      li_value_path: '#foo2\n goo#bar2',
      li_description: 'BAR2',
      li_retired: false,
      li_order: 4,
      li_action: 'delete'
    }
  ]
}
  
  */
  
  // in inputData.line_items, create a new array in each that holds the deconstructed path.
  /*
    {
      li_value_path: '#foo#bar1',
      path: ["foo","bar1"],   // <--- this one
      li_description: 'BAR1',
      li_retired: false,
      li_action: 'add'
    }
  */
  let item;
  
  inputData.line_items.forEach(item => {
    if (typeof item.li_value_path == "string" && item.li_value_path.length > 0) {
      let a = item.li_value_path.split(item.li_value_path[0]);
      a.shift(); // remove blank before first delimiter
      item.path = a;
    } else item.path = [];
  });
  
  // sort the line items - may not be necessary?
  inputData.line_items.sort((a, b) => {
    for (let i = 0; i < a.path.length; i++) {
      if (a.path[i] > b.path[i]) return 1;
      if (a.path[i] < b.path[i]) return -1;
    }
    if (a.path.length > b.path.length) return 1;
    return 0;
  });
  
  // make a hierarchy from the input data; call it line_items_by_path
  let path_element;
  let line_items_by_path = {};
  
  const hierarchy = {children:{}};
  inputData.line_items.forEach(item => {
    let hierarchy_pointer = hierarchy; // the pointer moves through the hierarchy, level by level
    let constructed_path = "";
    let parent_path = "";
    for (let i = 0; i < item.path.length; i++) {
      parent_path = (constructed_path === "") ? undefined : constructed_path;
      constructed_path += `§${item.path[i]}`;
      if (hierarchy_pointer.children[item.path[i]] === undefined) {
        hierarchy_pointer.children[item.path[i]] = {children:{}};
      }
      //hierarchy_pointer.children[item.path[i]].description = item.description_path[i]; // may be valid, "" or undefined
      hierarchy_pointer.children[item.path[i]].constructed_path = constructed_path;
      hierarchy_pointer = hierarchy_pointer.children[item.path[i]];
      if (line_items_by_path[constructed_path] === undefined) {
        line_items_by_path[constructed_path] = {};
      }
      line_items_by_path[constructed_path].value = item.path[i];
      line_items_by_path[constructed_path].parent_path = parent_path;
      //  description: item.description_path[i],
      // later, we will add ids for pre-existing ones
    }
    // add the extra items that only go on the *final* path segment, not its sub-paths.
    line_items_by_path[constructed_path].retired = item.li_retired;
    line_items_by_path[constructed_path].order = item.li_order;
    line_items_by_path[constructed_path].action = item.li_action;
    line_items_by_path[constructed_path].description = item.li_description;
  });
  /*
  // hierarchy does not seem to be used - but it was useful, above, for traversing each branch and creating children, etc.
  
  hierarchy = {
    children: {
      "foo": {
        constructed_path: "§foo",
        children: {
          "bar": {
            constructed_path: "§foo§bar1"
          }
        }
      }
    }
  }
  
  // line_items_by_path, though, is used.
  
  line_items_by_path = {
    "§foo": {
      value: "foo",
      parent_path: undefined,
    },
    "§foo§bar1": {
      value: ,
      parent_path: "§foo",
      retired: ,
      order: ,
      action: ,
      description: ,
    }
  
  }
  */
  
  // get our MA id
  let ma_id = inputData.field_id;
  if (typeof ma_id != "number" || ma_id <= 0){
    throw new z.errors.Error('Field id (model_attribute_id) is missing/invalid.', 'InvalidData');
  }
  // Now fetch all MAVs that relate to that MA
  let mav_options = {
    url: `https://${bundle.authData.client_domain}/api/rest/v2/model_attribute_value/list`,
    method: 'POST',
    headers: FluxxAPI.c.STANDARD_HEADERS(bundle),
    body: {
      filter: z.JSON.stringify({ // this type of filter required for non-elastic searches
        model_attribute_value: {
          model_attribute_id: inputData.field_id,
        },
      }),
      cols: z.JSON.stringify(["id", "retired", "dependent_model_attribute_value_id", "description", "value", "display_order"]),
    },

  };
  let mavs = await FluxxAPI.fn.paginated_fetch(z, bundle, mav_options, "model_attribute_value", 0); // 0 = no limit.
  if (mavs.data === undefined || mavs.data.records == undefined || mavs.data.records.model_attribute_value === undefined) {
    throw (`Error retrieving Multi Attribute information from Fluxx: attribute ${inputData.field} not found`);
  }
  // Simplify mavs to be the array of responses itself
  mavs = mavs.data.records.model_attribute_value;
  
  // First real action: if "remove_all" then do that.
  if (inputData.remove_all == "yes" && mavs.length > 0) {
    let delete_promises = [];
    for (let i = 0; i < mavs.length; i++) {
      delete_promises.push(
        update_fluxx_record(
          z,
          'model_attribute_value',
          mavs[i].id, 
          {
            deleted_at:                       new Date().toJSON(),
            updated_by_id:                    inputData.created_by_id,
          },
          ["id", "value"],
        )
      );
    }
    all_deletes_results = await Promise.allSettled(delete_promises).then(transformAllSettled); // allows concurrent deletion
    mavs = []; // hey none left
  }
  
  // Now put them into a tree. To do this, I first add a Children node to each,
  // then we loop again and if an item has a dependent_model_attribute_value_id then we add it to
  // the children of that node.
  
  let mavs_by_id = {}; // for easy lookup later, keyed by id
  let mav;
  mavs.forEach(mav => {
    mav.children = {}; // children will be keyed by name
    mavs_by_id[mav.id] = mav;
  });
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
      mav.path = `§${mavs_by_id[mav_parent].value}${mav.path}`;
      // now go up a level and try the parent.
      mav_parent = mavs_by_id[mav_parent].dependent_model_attribute_value_id;
    }
    mav.parent_path = mav.path;
    mav.path = mav.path + "§" + mav.value;
    // if any of the new MAVs or parts of their paths already exist, add the MAV id.
    if (line_items_by_path[mav.path] !== undefined) {
      line_items_by_path[mav.path].id = mav.id;
      line_items_by_path[mav.path].parent_path = mav.parent_path;
    }
  });
  
  // Now we have:
  // mavs_by_id: flat list of all mavs. Each has a "path":"§bbb§b2"
  // line_items_by_path:
  //   Flat list of all of the path segments of line items, keyed by path.

  
  let path_keys = Object.keys(line_items_by_path).sort();
  
  for (let i = 0; i < path_keys.length; i++) {
    item = line_items_by_path[path_keys[i]];
    
    // possible options:
    // - action=delete: soft delete the item. WARNING: all child items must also be deleted. Can do this by getting keys that start with the path of the item to be deleted.
    // - action=add:
    //   - has id but description and/or retired are different to the MAV version. EDIT
    //   - has id, description and retired are the same as MAV. CONTINUE to next.
    //   - no id.
    //     - CREATE item. Don't add description if it is not there. Look up parent to
    //       get its id and use that as the dependent_model_attribute_value_id. Add retired if TRUE.
    //     - add the id to the local MAV object, as any children will need it.
    if (item.action == "remove" || item.action == "delete") {
      let id = item.id;
      if (id === undefined) continue; // quick escape if trying to remove something that didn't exist
      deletes.push(id);
      continue;
    }
    if (item.id !== undefined) { // the system already has this item, but there could be changes required (check)
      let associated_mav = mavs_by_id[item.id];
      // as we don't set "retired" on sub-paths, they are undefined, and there's no need to update the retired thing
      // It's ok to set retired to undefined, as this gets ignored (not even sent to Fluxx), so it won't destroy existing value.
      if (
        (item.description == associated_mav.description || item.description === undefined) &&
        (item.order == associated_mav.display_order || item.order === undefined) && 
        (item.retired == associated_mav.retired || item.retired === undefined )) {
        // nothing to do here
        continue;
      } else {
        // either description or retired or order are different. Do an edit.
        updates.push({
          id:                               item.id,
          description:                      item.description.replace("||COMMA||", ","),
          retired:                          item.retired,
          display_order:                    item.order,
          updated_by_id:                    inputData.created_by_id,
        });
        continue;
      }
    } else {
      
      // since there's no id, need to create new item
      let parent_id = (item.parent_path === undefined) ? undefined : line_items_by_path[item.parent_path].id;      
      let rr = await FluxxAPI.fn.create_fluxx_record(
        z,
        bundle,
        'model_attribute_value',
        {
          dependent_model_attribute_value_id: parent_id,
          value:                              item.value.replace("||COMMA||", ","),
          description:                        item.description.replace("||COMMA||", ","),
          retired:                            item.retired,
          display_order:                      item.order,
          model_attribute_id:                 inputData.field_id,
          created_by_id:                      inputData.created_by_id,
          updated_by_id:                      inputData.created_by_id,
        },
        ["id", "value", "description", "retired", "display_order"],
      );
        
      item.id = rr.id;
      mavs_by_id[rr.id] = rr; // possible that the format of the results may be different, using "fields" or not.
      creates_results.push(rr);
    }
  };
  
  // Next, bundle the updates
  if (updates.length > 0) {
    let update_promises = [];
    for (let i = 0; i < updates.length; i++) {
      update_promises.push(
        update_fluxx_record(
          z,
          'model_attribute_value',
          updates[i].id, 
          {
            description:                      updates[i].description,
            retired:                          updates[i].retired,
            display_order:                    updates[i].display_order,
            updated_by_id:                    updates[i].created_by_id,
          },
          ["id", "value", "description", "retired", "display_order"],
        )
      );
    }
    updates_results = await Promise.allSettled(update_promises).then(transformAllSettled); // allows concurrent deletion - not allSettled???
  }
  
  // Finally, remove everything in the delete list.
  if (deletes.length > 0) {
    let delete_promises = [];
    for (let i = 0; i < deletes.length; i++) {
      delete_promises.push(
        update_fluxx_record(
          z, 'model_attribute_value', deletes[i], 
          {
            deleted_at:                       new Date().toJSON(),
            updated_by_id:                    inputData.created_by_id,
          },
          ["id"],
        )
      );
    }
    deletes_results = await Promise.allSettled(delete_promises).then(transformAllSettled); // allows concurrent deletion
  }
  
  return {
    all_deletes_results: all_deletes_results.map(transformPromiseValue), 
    updates_results: updates_results.map(transformPromiseValue), 
    deletes_results: deletes_results.map(transformPromiseValue), 
    creates_results: creates_results, 
  };


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
        data: z.JSON.stringify(fields_and_update_values).replace("||COMMA||", ","),
        cols: z.JSON.stringify(cols),
      },
    };

    var response = await z.request(options);
    response.throwForStatus();
    FluxxAPI.fn.handleFluxxAPIReturnErrors(z, response);
    response = response.data;
    
    let ordered_response = {
      model_type: FluxxAPI.fn.modelToSnake(model_type),
      id: response[FluxxAPI.fn.modelToSnake(model_type)].id,
      fields: response[FluxxAPI.fn.modelToSnake(model_type)],
    };
    
    FluxxAPI.fn.restoreNullFieldsInResponse(cols, ordered_response, "fields");
    return ordered_response;
  }

};

module.exports = {
  key: 'select_list_management',
  noun: 'Select List Items',
  display: {
    label: 'Manage Items in SELECT Lists (With Line Item Support)',
    description:
      'Add, remove or edit the available options in SELECT lists on your forms.',
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
      //  search: 'search_for_user.id',
        placeholder: 'Choose a field…',
        helpText:
          'The list of options provided to this action will be added to, retired from, or removed from this field.',
      },
      {
        key: 'remove_all',
        label: 'Remove all?',
        required: true,
        choices: {
          yes: 'Yes. Remove ALL existing items before processing the new list.',
          no: 'No.', 
        },
        default: 'no',
        altersDynamicFields: false,
      },
      {
        key: 'name_segment', 
        type: 'string', 
        required: false, 
        altersDynamicFields: true, 
        label: '[name segment for user search below]',
        helpText: 'Fill in this field with the name (or part of the name) of the "created_by" user, before searching with the selector below. This helps to trim down the number of results shown. NOTE: you must select a user below, after filling in this box.'
      },
      {
        key: 'created_by_id',
        required: true,
        label: 'Created By Id',
        type: 'integer',
        // dynamic: first the key of the component to use (usually a trigger)
        // then the field in the returned item representing the ID - this is the value that will be saved.
        // then the field in the returned item representing the NAME (for display purposes)
        dynamic: 'user_list.id.full_name',
        search: 'search_for_user.id',
      }, // calls project.search (requires a trigger in the "dynamic" property)
      {
        key: 'line_items',
        children: [
          {
            key: 'li_action',
            type: 'string',
            label: 'Action',
            required: true,
            helpText:
              'Enter the Line Item containing the action for each new option, here. Valid strings are "remove" and "add". Leave blank to add.',
          },
          {
            key: 'li_value_path',
            type: 'string',
            label: 'Path',
            required: true,
            helpText:
              'Enter the Line Item containing the path for each new option, here. Any non-existent sub-levels will be created for you. The first character must be a delimiter (of your choice), that is then used to separate path segments/levels if it is a multi-level Select control. Do not end with the delimiter e.g. #California#Los Angeles or /Colorado/Boulder or #New Zealand',
          },
          {
            key: 'li_description',
            type: 'string',
            label: 'Description',
            required: false,
            helpText:
              'Enter the Line Item containing the description of the new Select option, here (optional). If not used, the Select option will display the last item in its path name; otherwise, the Description is used for display.',
          },
          {
            key: 'li_retired',
            type: 'boolean',
            label: 'Retired',
            required: false,
            helpText:
              'Should the Select option be marked as "retired"? Retired options are not shown to the user unless they were already selected for a field. (optional)',
          },
          {
            key: 'li_order',
            type: 'number',
            label: 'Order',
            required: false,
            helpText:
              'Enter the order number for the Select option. (optional)',
          }
        ]
      }
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
