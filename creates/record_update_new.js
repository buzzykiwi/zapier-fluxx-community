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
  inputData.values_clean = JSON.parse(JSON.stringify(inputData.values).replace("||COMMA||", ","));
  
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
  const [all_fields_and_update_values, fields_and_update_values_without_mvs] = FluxxAPI.mav_tree.fields_and_values(
    inputData.fields,
    inputData.values_clean,
    mv_fields
  );
  
  let final_return;
  let record_id = inputData.id;
  let new_record = false;
  if (
    record_id === undefined ||
    record_id === 0 ||
    record_id === ''
  ) {
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
        operations: all_fields_and_update_values[mv_field], // the "operations" text box
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

module.exports = {
  key: 'create_update_record',
  noun: 'Fluxx Record',
  display: {
    label: 'Create/Update Fluxx Record',
    description:
      'Create or update a Fluxx record of any model type. Provide the name of the model, a list of fields and a list of their corresponding values and this action will create a new record. If you include an existing id, the action updates an existing record.',
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
          'Filter the Model Types displayed in the selector below, by choosing a different option here.',
        default: 'Basic',
        required: true,
        list: false,
        altersDynamicFields: true,
      },
      FluxxAPI.fn.getInputFieldsForModelTypes,
      {
        key: 'fields',
        label: 'Field List for Update/Create',
        type: 'string',
        required: true,
        list: true,
        // dynamic: first the key of the component to use (usually a trigger)
        // then the field in the returned item representing the ID - this is the value that will be saved.
        // then the field in the returned item representing the NAME (for display purposes)
        dynamic: 'writeable_fields_for_model.value.label',
        placeholder: 'Select a field to assign a value to…',
        helpText:
          'Enter the list of fields you want to update (or create in a new record). Use one per box. The list of field options depends on which Model Type is chosen.',
        altersDynamicFields: true,
      },
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
      {
        key: 'cols',
        required: true,
        label: 'Fields to Return',
        list: true,
        type: 'string',
        // dynamic: first the key of the component to use (usually a trigger)
        // then the field in the returned item representing the ID - this is the value that will be saved.
        // then the field in the returned item representing the NAME (for display purposes)
        dynamic: 'all_fields_for_model.value.label',
      //  search: 'search_for_user.id',
        placeholder: 'Choose return field…',
        helpText:
          'Enter the list of fields you want to return from the updated or created record. Use one per box. The list of fields depends on which Model Type is chosen.',
      },
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
