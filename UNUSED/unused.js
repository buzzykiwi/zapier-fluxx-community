  // If mav_fields has anything in it, we will need to go through those and make the requested changes. (later)
  
  // returns: [{"id":123, "name":"type_1","description":"Type 1","model_type":"GrantRequest"}, ...]
  const mas = await FluxxAPI.fn.determine_mas(
    inputData.model_type,
    inputData.fields
  );


  // Send the list of fields_and_update_values and the list of mas to
  // find if there are existing ids for the new value for each MA.
  // This returns a new list of fields_and_update_values that swaps the new value
  // in each requested MA to the corresponding id of the requested new value.
  // returns: {"field1":"value1", "type_1": 12345, ...}
  // Initially, any value that is not found as an option will be set to NULL.
  // Eventually, this code will create the new value, and needs to take into account
  // hierarchical values (tricky - at what level do you place the new item?)

  // not actually needed: the API already creates single-value MAVs and
  // you don't need to send the id of the value, just the (existing or new) value.
  
  const fields_and_update_values_with_mav_ids = await fields_and_values_with_mav_ids(
    fields_and_update_values,
    mas
  );

  //  z.console.log(fields_and_update_values_with_mav_ids);


/*
 * Send the list of fields_and_update_values and the list of mas to
 * find if there are existing ids for the new value for each MA.
 * This returns a new list of fields_and_update_values that swaps the new value
 * in each requested MA to the corresponding id of the requested new value.
 * returns: {"field1":"value1", "type_1": 12345, ...}
 * Initially, any value that is not found as an option will be set to NULL.
 * Eventually, this code will create the new value, and needs to take into account
 * hierarchical values (tricky - at what level do you place the new item?)
 */
async function fields_and_values_with_mav_ids(fields_and_update_values, mas) {
  // construct list of MA ids
  // construct list of MAV values
  const ma_ids = mas.map((ma) => ma.id);
  const mav_values = mas.map((ma) => fields_and_update_values[ma.name]);

  const mas_by_name = {};
  const mas_by_id = {};
  mas.forEach(function (ma) {
    mas_by_name[ma.name] = ma.id;
    mas_by_id[ma.id] = ma.name;
  });

  const options = {
    url: `https://${bundle.authData.client_domain}/api/rest/v2/model_attribute_value/list`,
    method: 'POST',
    headers: FluxxAPI.c.STANDARD_HEADERS(bundle),
    params: {},
    body: {
      filter: z.JSON.stringify({
        model_attribute_value: {
          model_attribute_id: ma_ids,
          value: mav_values,
        },
      }),

      cols: z.JSON.stringify([
        'id',
        'model_attribute_id',
        'value',
        'description',
        'retired',
      ]),
    },
  };

  // now get the list of MAVs
  const response = await z.request(options);
  response.throwForStatus();
  FluxxAPI.fn.handleFluxxAPIReturnErrors(response);
  var mav_results = response.data.records.model_attribute_value;

  // Now, it is possible that there may be MORE THAN ONE result for
  // a given value. This can happen if there are 2 ModelAttributes in
  // the same request, each one containing a value with the same name.
  // In that case, we will have {model_attribute_id:122,name:hello},
  // {model_attribute_id:123, name:hello} ...
  // We therefore need to remove any items where the model_attribute_id
  // is the wrong one for the given value.
  //
  // mas has [{id: 123, "field_"name: type_1},{124, type_2}...]
  // fields_and_update_values has {type_1:QR, type_2:CS, ...}
  // mav_results has [{model_attribute_id:123,name:QR}, {124,QR}...]
  // and I want to strip out the 124 entry as it is only there because
  // that value exists for both type_1 and type_2 lists.

  function is_requested_mav(mav_result, fields_and_update_values, mas) {
    var r;
    try {
      mas.forEach(function (ma) {
        if (
          ma.id == mav_result.model_attribute_id &&
          fields_and_update_values[ma.name] == mav_result.value
        ) {
          // found it!
          throw true;
        }
      });
      throw false;
    } catch (e) {
      r = e;
    }
    return r;
  }

  const mav_results_filtered = mav_results.filter(function (mav_result) {
    return is_requested_mav(mav_result, fields_and_update_values, mas);
  });
  mav_results_by_ma_id = {};
  mav_results_filtered.forEach(function (mav_result) {
    mav_results_by_ma_id[mav_result.model_attribute_id] = mav_result;
  });

  // Go through all the MAs.
  // For each one, if there is a new mav_result, then sub that into the fields_and_update_values.
  // Otherwise, set the value to null.
  // now, re-integrate these into fields_and_update_values
  mas.forEach(function (ma) {
    // ma.id may be one of the keys in mav_results_by_ma_id
    const stored_value = mav_results_by_ma_id[ma.id];
    if (stored_value === undefined) {
      fields_and_update_values[ma.name] = null;
    } else {
      fields_and_update_values[ma.name] = mav_results_by_ma_id[ma.id].id;
    }
  });
  return fields_and_update_values;
}



