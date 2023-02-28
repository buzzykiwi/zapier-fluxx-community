'use_strict';
/*jshint esversion: 8 */

const FluxxAPI = require('../fluxx_api');

async function save_update_record(inputData, mv_fields, z, bundle, update_fluxx_record, structured_mas, index) {
  
  // convert the fields and new values into {"field1":"new val 1", "field2","new_val_2"...}
  let all_fields = [];
  let all_values = [];
  
  let in_d = inputData.line_items[index];
  
  // first, get the indexed value of each Line Item field (if it was an array),
  // or the constant value if it was a scalar, ready for the create/update.
  let i;
  for (i = 1; i <= 10; i++) {
    if (inputData[`field${i}`] !== undefined) {
      all_fields.push(inputData[`field${i}`]);
      all_values.push(in_d[`value${i}`].replace("||COMMA||", ","));
    }
  }
  // add in the standard ones, if they exist
  if (inputData.fields !== undefined) {
    all_fields = all_fields.concat(inputData.fields);
    all_values = all_values.concat(inputData.values_clean);
  }
    
  // this function gets all the field=>value pairs, but EXCLUDES any MV fields as these have to be processed separately.
  const [all_fields_and_update_values, fields_and_update_values_without_mvs] = FluxxAPI.mav_tree.fields_and_values(
    all_fields,
    all_values,
    mv_fields
  );

  let final_return;
  let record_id = in_d.id;
  let new_record = false;
  if (record_id === undefined ||
    record_id === 0 ||
    record_id === '') {
    final_return = await FluxxAPI.fn.create_fluxx_record(
      z,
      bundle,
      inputData.model_type,
      fields_and_update_values_without_mvs,
      inputData.cols
    );
    record_id = final_return.id;
    new_record = true;
  } else {
    final_return = await update_fluxx_record(
      z,
      inputData.model_type,
      record_id,
      fields_and_update_values_without_mvs,
      inputData.cols
    );
  }

  // handle Model Attribute Values (multi-value controls) separately.
  if (Array.isArray(mv_fields) && mv_fields.length > 0) {

    // grab current MACs for record, restricted to only those relating to the mv_fields.
    // this is an array of object returns from a Fluxx query, with keys:
    // 'id', 'amount_value', 'model_id', 'model_attribute_id', 'model_attribute_value_id'
    let existing_macs = new_record ? [] : (await FluxxAPI.mav_tree.existing_macs_for_record(z, bundle, record_id, structured_mas, mv_fields));

    for (var mv_field of mv_fields) {
      await FluxxAPI.mav_tree.processMAVOperationsForRecordField({
        z: z,
        bundle: bundle,
        model_type: inputData.model_type,
        model_id: record_id,
        field_name: mv_field,
        operations: all_fields_and_update_values[mv_field],
        structured_mas: structured_mas,
        existing_macs: existing_macs,
      });
    }
    /*    await Promise.allSettled(mv_fields.map(async (mv_field) => {
          FluxxAPI.mav_tree.processMAVOperationsForRecordField(
            z,
            bundle,
            inputData.model_type,
            record_id,
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
}


const perform = async (z, bundle) => {
  // SAVE FLUXX RECORD WITH ARBITRARY FIELDS
  // Input:
  //   bundle.inputData.model_type = in form "GrantRequest" or "grant_request"
  //   bundle.inputData.id = 12345
  //   bundle.inputData.fields = ["amount_recommended","type_1"]
  //   bundle.inputData.values = [9999, "Community Support Grant"]
  //   bundle.inputData.return_fields = ["amount_received","program_organization_id.name"] or null

  const inputData = bundle.inputData;
  inputData.values_clean = JSON.parse(JSON.stringify(inputData.values).replace("||COMMA||", ","));

  /*
    inputData.id = [65, ...]; // or null, to force creation of new model
    inputData.fields = ["amount_recommended","project_title","type_1"]; // the static (non line item) fields
    inputData.values = [12345,"This is a title","Quick Response Grant"]; // the static (non line item) values
    inputData.model_type = "GrantRequest"; // always static
    inputData.cols = ["id","amount_requested"]; // the return columns - need to work out how to structure these
  */

  let all_input_fields = [];
  if (inputData.fields !== null && inputData.fields !== undefined) {
    if (Array.isArray(inputData.fields)) {
      all_input_fields = all_input_fields.concat(inputData.fields);
    } else { // scalar?
      all_input_fields.push(inputData.fields);
    }
  }
  // if there are commas in these, then the field must be a set of field names... but we expect just a single one.
  if (inputData.field1 !== undefined) all_input_fields.push(inputData.field1);
  if (inputData.field2 !== undefined) all_input_fields.push(inputData.field2);
  if (inputData.field3 !== undefined) all_input_fields.push(inputData.field3);
  if (inputData.field4 !== undefined) all_input_fields.push(inputData.field4);
  if (inputData.field5 !== undefined) all_input_fields.push(inputData.field5);
  if (inputData.field6 !== undefined) all_input_fields.push(inputData.field6);

  // find max depth of line items
  // the field names are not supposed to be line items - the values are.
  let max_depth = inputData.line_items.length;
  
  // Which of the requested fields are MAVs? - also grab the structured tree of MAs and list of all multi-value MAVs
  const [structured_mas, structured_mavs, mv_fields] = await FluxxAPI.mav_tree.which_fields_are_mvs(
    z,
    bundle,
    inputData.model_type,
    null, // indicates that we need to retrieve MAs from Fluxx.
    all_input_fields
  );

  let return_o = {};
  for (let i = 0; i < max_depth; i++) {
    return_o[i] = await save_update_record(inputData, mv_fields, z, bundle, update_fluxx_record, structured_mas, i);
  }

  return return_o;
  
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
  let r = await FluxxAPI.fn.fetch_core_and_machine_model_list(z, bundle, bundle.inputData.model_group);
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
  let r = await FluxxAPI.fn.fields_for_model(z, bundle, bundle.inputData.model_type, FluxxAPI.c.CORE_MODELS, true);
  
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

  let r = await FluxxAPI.fn.fields_for_model(z, bundle, model_type, FluxxAPI.c.CORE_MODELS);
  
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

async function show_field(z, bundle, n)
{
  let f = bundle.inputData[`field${n}`];
  let r;
  if (f !== undefined && f !== null && f !== "") {
    r = await FluxxAPI.fn.fields_for_model(z, bundle, bundle.inputData.model_type, FluxxAPI.c.CORE_MODELS, true);
    return {
      key: `field${n}`,
      label: `Input Field ${n}`,
      type: "string",
      altersDynamicFields: true,
      choices: r,
    };
  }
  let i;
  for (i = 1; i < n; i++) {
    // hide it if any of these are blank
    f = bundle.inputData[`field${i}`];
    if (f === undefined || f === null || f === "") {
      return [];
    }
  }
  // if none of the preceding fields are blank, show this one
  r = await FluxxAPI.fn.fields_for_model(z, bundle, bundle.inputData.model_type, FluxxAPI.c.CORE_MODELS, true);
  return {
    key: `field${i}`,
    label: `Input Field ${i}`,
    type: "string",
    altersDynamicFields: true,
    choices: r,
  };
}

async function show_field_1(z, bundle) {
  let r = await FluxxAPI.fn.fields_for_model(z, bundle, bundle.inputData.model_type, FluxxAPI.c.CORE_MODELS, true);
  return {
    key: `field1`,
    label: `Input Field 1`,
    type: "string",
    altersDynamicFields: true,
    choices: r,
    helpText: "Using the Field controls below, select all the fields on the record that you want to fill with Line Item data. You then must fill in the value to be used for each Field, using the Value controls in the Line Item section.",
  };
}
async function show_field_2(z, bundle) { return await show_field(z, bundle, 2); }
async function show_field_3(z, bundle) { return await show_field(z, bundle, 3); }
async function show_field_4(z, bundle) { return await show_field(z, bundle, 4); }
async function show_field_5(z, bundle) { return await show_field(z, bundle, 5); }
async function show_field_6(z, bundle) { return await show_field(z, bundle, 6); }
async function show_field_7(z, bundle) { return await show_field(z, bundle, 7); }
async function show_field_8(z, bundle) { return await show_field(z, bundle, 8); }
async function show_field_9(z, bundle) { return await show_field(z, bundle, 9); }
async function show_field_10(z, bundle) { return await show_field(z, bundle, 10); }


module.exports = {
  key: 'create_update_record_line_item',
  noun: 'Fluxx Record',
  display: {
    label: 'Create/Update Fluxx Records (Line Item Support)',
    description:
      'Create or update a Fluxx record of any model type. Provide the name of the model, a list of fields and a list of their corresponding values and this action will create a new record. If you include an existing id, the action updates an existing record. The first six pairs of field and value are Line Item enabled; further static values can be add later.',
    hidden: false,
    important: true,
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
      getInputFieldsForModelTypes,

      show_field_1,
      show_field_2,
      show_field_3,
      show_field_4,
      show_field_5,
      show_field_6,
      show_field_7,
      show_field_8,
      show_field_9,
      show_field_10,
      {
        key: 'line_items',
        label: 'Line Items',
        children: [
          {
            key: 'id',
            label: 'Record ID',
            type: 'integer',
            helpText:
              'Enter the id of the record to update, or leave blank to create a new record.',
            required: false,
          },
          {
            key: 'value1',
            label: 'Input Value 1',
            type: 'text',
          },
          /* sadly, child items can't use functions like we did for the field names above */
          {
            key: 'value2',
            label: 'Input Value 2',
            type: 'text',
          },
          {
            key: 'value3',
            label: 'Input Value 3',
            type: 'text',
          },
          {
            key: 'value4',
            label: 'Input Value 4',
            type: 'text',
          },
          {
            key: 'value5',
            label: 'Input Value 5',
            type: 'text',
          },
          {
            key: 'value6',
            label: 'Input Value 6',
            type: 'text',
          },
          {
            key: 'value7',
            label: 'Input Value 7',
            type: 'text',
          },
          {
            key: 'value8',
            label: 'Input Value 8',
            type: 'text',
          },
          {
            key: 'value9',
            label: 'Input Value 9',
            type: 'text',
          },
          {
            key: 'value10',
            label: 'Input Value 10',
            type: 'text',
          },
        ],
      },
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
