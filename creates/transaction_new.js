'use_strict';
/*jshint esversion: 8 */

const FluxxAPI = require('../fluxx_api');

const variousInputFieldsFromFluxx = async (z, bundle, sql, perform_check = true) => {
  if (perform_check == true && bundle.inputData.rfs_id !== undefined && bundle.inputData.rfs_id !== null && bundle.inputData.rfs_id !== "") {
    return null;
  }
  const p = FluxxAPI.fn.parseSelectStatement(z, sql);
  const options = FluxxAPI.fn.optionsFromParsedSelectStatement(z, bundle, p);
  
  if (options !== null && options !== undefined) {
    const response = await FluxxAPI.fn.paginated_fetch(z, bundle, options, options.model_type, p.limit);
    return FluxxAPI.fn.preProcessFluxxResponse(z, p.cols, response, options.model_type);
  }
  return null;
};

function form_condition(z, input)
{
  if (input === null || input === undefined) return ' IS NULL ';
  return ' = ' + z.JSON.stringify(input);
}

const perform = async (z, bundle) => {
  // 1 - Identify Request Funding Source id: we are given it as field
  // 2 - do a search on FundingSourceAllocation.where("spending_year = ? AND funding_source_id = ? AND program_id = ? AND sub_program_id = ?", fiscal_year.to_s, funding_source_id, program_id, sub_program_id) to get FSA_id
  // 3 - if we have those, create a RFS with prog id, subprog id, request id, funding_source_allocation
  // 4 - remember the RFS id.
  // 5 - identify model theme for transactions.
  // 6 - create transaction with:
  // due_at, paid_at, model_theme, organization_payee (assume gr.program_organization_id), 
  // amount_due, amount_paid, comment, payment_type, from_bank_account, to_bank_account (assume 1st non-retired from grant org)
  // state.
  // the RTFS will be given the same allocation (amount_allocated) as used to create the RFS. The actual payment may be less.
  // 7 - Create RTFS:
  // amount = amount_allocated
  // request_funding_source = #4
  // request_transaction = #6.
  // DONE.
  
  // 1.
  const inputData = bundle.inputData;
  
  let rfs_id = inputData.rfs_id;
  let fsa_id;
  let new_rfs;
  if (rfs_id === undefined || rfs_id === null || rfs_id == "") {
    // 2. find the FSA from the fields we were given
    let sql = 'SELECT id FROM funding_source_allocation ' +
      'WHERE spending_year ' + form_condition(z, inputData.spending_year) +
      ' AND funding_source_id ' + form_condition(z, inputData.funding_source_id) +
      ' AND program_id ' + form_condition(z, inputData.rfs_program_id) +
      ' AND sub_program_id ' + form_condition(z, inputData.rfs_sub_program_id) +
      ' AND initiative_id ' + form_condition(z, inputData.rfs_initiative_id) +
      ' AND sub_initiative_id ' + form_condition(z, inputData.rfs_sub_initiative_id);
    let results = await variousInputFieldsFromFluxx(z, bundle, sql, false);
    if (Array.isArray(results) && results.length > 0) {
      fsa_id = results[0].id;
    } else {
      throw "No funding source allocation found for given year and fund";
    }
    // We now have all we need for creating the RFS: fsa_id, funding_amount, request, prog, subprog, init, sub_init.
    
    new_rfs = await FluxxAPI.fn.create_fluxx_record(
      z, bundle, "request_funding_source",
      {
        funding_amount: inputData.amount_allocated,
        funding_source_allocation_id: fsa_id,
        request_id: inputData.request_id,
        program_id: inputData.rfs_program_id,
        sub_program_id: inputData.rfs_sub_program_id,
        initiative_id: inputData.rfs_initiative_id,
        sub_initiative_id: inputData.rfs_sub_initiative_id,
      },
      ["id"], // return fields
    );
    rfs_id = new_rfs.id;
  }
  // calculate the "to" bank account
  sql = null;
  let to_bank_account_id = null;
  let processed_request_id = z.JSON.stringify(inputData.request_id);
  switch(inputData.to_bank_account_source) {
    case "bank_account_id":
      to_bank_account_id = inputData.to_bank_account_id;
      break;
    case "request_id":
      // From main GrantRequest above; use first bank account from its Program Organization or Grantee User
      sql = 'SELECT id FROM BankAccount WHERE active = 1 AND (owner_organization_id CROSSCARD(request_ids CROSSCARD(id = ' +
      processed_request_id + ')) OR owner_user_id CROSSCARD(user_request_ids CROSSCARD(id = ' + processed_request_id + ')) )';
      break;      
  }
  if (sql !== null) {
    results = await variousInputFieldsFromFluxx(z, bundle, sql, false);
    if (!(Array.isArray(results)) || (Array.isArray(results) && results.length == 0)) {
      throw(`Error: Unable to locate an active bank account for the grantee user/organisation for GrantRequest ${processed_request_id}`);
    } else {
      to_bank_account_id = results[0].id;
    }
  }
  const standard_rt_fields = ["request_id", "amount_due", "due_at", "amount_paid", "paid_at", "model_theme_id", "comment", "payment_type", "from_bank_account_id", "state", "bank_account_id"];
  
  const [structured_mas, structured_mavs, mv_fields] = await FluxxAPI.mav_tree.which_fields_are_mvs(
    z, bundle, 
    "RequestTransaction", 
    null, // indicates that we need to retrieve MAs from Fluxx.
    Array.from(new Set(standard_rt_fields.concat(inputData.fields))),
  );
  
  // convert the fields and new values into {"field1":"new val 1", "field2","new_val_2"...}
  let [all_fields_and_update_values, fields_and_update_values_without_mvs] = FluxxAPI.mav_tree.fields_and_values(
    inputData.fields,
    inputData.values,
    mv_fields
  );
  
  let standard_rt_data = {
    request_id: inputData.request_id,
    amount_due: inputData.amount_due,
    due_at: inputData.due_at,
    amount_paid: inputData.amount_paid,
    paid_at: inputData.paid_at,
    model_theme_id: inputData.request_transaction_model_theme,
    // we don't need to send the org/user payee ids, as Fluxx derives these from the info in the request.
    //   organization_payee_id: inputData.payee_organization_id,
    //   user_payee_id: inputData.payee_user_id,
    comment: inputData.comment,
    payment_type: inputData.payment_type,
    from_bank_account_id: inputData.from_account_id,
    state: inputData.request_transaction_state,
    bank_account_id: to_bank_account_id,
  };
  
  // the standard RT data does not contain any MVs, so we add those items to both lists.
  
  all_fields_and_update_values = { ...all_fields_and_update_values, ...standard_rt_data};
  fields_and_update_values_without_mvs = { ...fields_and_update_values_without_mvs, ...standard_rt_data};
  
  var new_rt = await FluxxAPI.fn.create_fluxx_record(
    z, bundle,
    "request_transaction",
    fields_and_update_values_without_mvs,
    ["id", "from_bank_account_id", "bank_account_id", "state", "organization_payee_id", "user_payee_id", "due_at", "paid_at"], // return fields
  );
  var rt_id = new_rt.id;
  
  //
  // handle Model Attribute Values (multi-value controls) on the RT separately.
  //
  
  if (Array.isArray(mv_fields) && mv_fields.length > 0) {
    
    // grab current MACs for record, restricted to only those relating to the mv_fields.
    // this is an array of object returns from a Fluxx query, with keys:
    // 'id', 'amount_value', 'model_id', 'model_attribute_id', 'model_attribute_value_id'
    // Since we are creating  anew record, this is always empty.
    let existing_macs = [];
    
    for (var mv_field of mv_fields) {
      await FluxxAPI.mav_tree.processMAVOperationsForRecordField({
        z: z, 
        bundle: bundle, 
        model_type: "RequestTransaction", 
        model_id: rt_id, 
        field_name: mv_field,
        operations: all_fields_and_update_values[mv_field], // the "operations" text box
        structured_mas: structured_mas,
        existing_macs: existing_macs,
      });
    }
  }
  
  var new_rtfs = await FluxxAPI.fn.create_fluxx_record(
    z,
    bundle,
    "request_transaction_funding_source",
    {
      amount: inputData.amount_due,
      request_funding_source_id: rfs_id,
      request_transaction_id: rt_id,
    },
    ["id", "amount", "request_funding_source_id", "request_transaction_id"], // return fields
  );
  
  return { rfs_id: rfs_id, rfs: new_rfs, request_transaction: new_rt, request_transaction_funding_source: new_rtfs };
}

const getInputFieldForFundingSource = async (z, bundle) => {
  const sql = 'SELECT id, name FROM funding_source WHERE id IS NOT NULL ORDER BY name';
  let results = await variousInputFieldsFromFluxx(z, bundle, sql, true);
  if (results != null) {
    let a = [], r;
    results.forEach(r => {
      a.push({ id: r.id, value: r.id, label: r.fields.name});
    });
    return {
      key: 'funding_source_id',
      label: 'Funding Source',
      choices: a,
      type: 'integer',
      required: false,
      list: false,
      placeholder: 'Select Funding Source',
      altersDynamicFields: false,
    }; 
  }
  return [];
};


const getInputFieldForProgram = async (z, bundle) => {
  const sql = 'SELECT id, name, parent_program.name, retired FROM program WHERE id IS NOT NULL ORDER BY name';
  let results = await variousInputFieldsFromFluxx(z, bundle, sql, true);
  if (results != null) {
    let a = [], r;
    results.forEach(r => {
      a.push({ id: r.id, value: r.id, label: (r.fields['parent_program.name'] === null ? '' : `${r.fields['parent_program.name']} => `) + r.fields.name + (r.fields.retired === 0 ? '':' RETIRED')});
    });
    return {
      key: 'rfs_program_id',
      label: 'Program for Request Funding Source',
      choices: a,
      type: 'integer',
      required: false,
      list: false,
      placeholder: 'Select Program',
      altersDynamicFields: false,
    }; 
  }
  return [];
};

const getInputFieldForSubProgram = async (z, bundle) => {
  const sql = 'SELECT id, name, program_id.name, retired FROM sub_program WHERE id IS NOT NULL ORDER BY name';
  let results = await variousInputFieldsFromFluxx(z, bundle, sql, true);
  let a = [], r;
  if (results != null) {
    results.forEach(r => {
      a.push({ id: r.id, value: r.id, label: (r.fields['program_id.name'] === null ? '' : (r.fields['program_id.name'] + ' => ')) + r.fields.name + (r.fields.retired === 0 ? '':' RETIRED')});
    });
    return {
      key: 'rfs_sub_program_id',
      label: 'Sub Program for Request Funding Source',
      choices: a,
      type: 'integer',
      required: false,
      list: false,
      placeholder: 'Select Sub Program',
      altersDynamicFields: false,
    };
  }
};

const getInputFieldForInitiative = async (z, bundle) => {
  const sql = 'SELECT id, name, program_id.name, sub_program_id.name, retired FROM initiative WHERE id IS NOT NULL ORDER BY name';
  let results = await variousInputFieldsFromFluxx(z, bundle, sql, true);
  let a = [], r;
  if (results != null) {
    results.forEach(r => {
      a.push({ id: r.id, value: r.id, label: (r.fields['program_id.name'] === null ? '' : `${r.fields['program_id.name']} => `) + (r.fields['sub_program_id.name'] === null ? '' : `${r.fields['sub_program_id.name']} => `) + r.fields.name + (r.fields.retired === 0 ? '':' RETIRED')});
    });
    return {
      key: 'rfs_initiative_id',
      label: 'Initiative for Request Funding Source',
      choices: a,
      type: 'integer',
      required: false,
      list: false,
      placeholder: 'Select Initiative',
      altersDynamicFields: false,
    };
  }
};

const getInputFieldForSubInitiative = async (z, bundle) => {
  const sql = 'SELECT id, name, program_id.name, sub_program_id.name, initiative_id.name, retired FROM sub_initiative WHERE id IS NOT NULL ORDER BY name';
  let results = await variousInputFieldsFromFluxx(z, bundle, sql, true);
  let a = [], r;
  if (results != null) {
    results.forEach(r => {
      a.push({ id: r.id, value: r.id, label: (r.fields['program_id.name'] === null ? '' : `${r.fields['program_id.name']} => `) + (r.fields['sub_program_id.name'] === null ? '' : `${r.fields['sub_program_id.name']} => `) + (r.fields['initiative_id.name'] === null ? '' : (r.fields['initiative_id.name'] + ' => ')) + r.fields.name + (r.fields.retired === 0 ? '':' RETIRED')});
    });
    return {
      key: 'rfs_sub_initiative_id',
      label: 'Sub Initiative for Request Funding Source',
      choices: a,
      type: 'integer',
      required: false,
      list: false,
      placeholder: 'Select Sub Initiative',
      altersDynamicFields: false,
    };
  }
};


const getInputFieldForFromBankAccount = async (z, bundle) => {
  const sql = `SELECT id, bank_name, account_name, account_number, retired FROM bank_account WHERE account_name STARTS WITH ${z.JSON.stringify(bundle.inputData.from_bank_account_name)} ORDER BY id`;
  let results = await variousInputFieldsFromFluxx(z, bundle, sql, true);
  if (results != null) {
    let a = [], r;
    results.forEach(r => {
      a.push({
        id: r.id, 
        value: 
        r.id, 
        label: `${r.fields.bank_name} ${r.fields.account_number} ${r.fields.account_name}` +  (r.fields.retired === 1 ? ' RETIRED':'')});
    });
    return {
      key: 'from_account_id',
      label: '"From" bank account id',
      choices: a,
      type: 'integer',
      required: false,
      list: false,
      placeholder: 'Select From bank account',
      altersDynamicFields: false,
    }; 
  }
  return [];
};

const getInputFieldForTransactionMachineStates = async (z, bundle) => {
  const sql = `SELECT id, name, description FROM machine_state WHERE model_type = 'RequestTransaction' ORDER BY description`;
  let results = await variousInputFieldsFromFluxx(z, bundle, sql, false);
  if (results != null) {
    let a = [], r;
    results.forEach(r => {
      a.push({ id: r.id, value: r.fields.name, label: `${r.fields.description} (${r.fields.name})` });
    });
    return {
      key: 'request_transaction_state',
      label: 'Request Transaction State',
      choices: a,
      type: 'string',
      required: true,
      list: false,
      placeholder: 'Select State',
      altersDynamicFields: false,
    }; 
  }
};

const getInputFieldForModelTheme = async (z, bundle) => {

  const sql = `SELECT id, name FROM model_theme WHERE model_type = 'RequestTransaction' ORDER BY name`;
  let results = await variousInputFieldsFromFluxx(z, bundle, sql, false);
  if (results != null) {
    let a = [], r;
    results.forEach(r => {
      a.push({ id: r.id, value: r.id, label: r.fields.name });
    });
    return {
      key: 'request_transaction_model_theme',
      label: 'Request Transaction Model Theme',
      choices: a,
      type: 'integer',
      required: true,
      list: false,
      placeholder: 'Select Model Theme',
      altersDynamicFields: false,
    }; 
  }
};

const getInputFieldForSpendingYear = (z, bundle) => {
  if (bundle.inputData.rfs_id !== undefined && bundle.inputData.rfs_id !== null && bundle.inputData.rfs_id !== "") {
    return;
  }
  return {
    key: 'spending_year',
    label: 'Spending Year',
    type: 'integer',
    helpText:
      'Spending year for the funding allocation.',
    required: false,
    list: false,
    placeholder: 'YYYY',
    altersDynamicFields: false,
  };
};

const getInputFieldForAmountAllocated = (z, bundle) => {
  if (bundle.inputData.rfs_id !== undefined && bundle.inputData.rfs_id !== null && bundle.inputData.rfs_id !== "") {
    return;
  }
  return {
    key: 'amount_allocated',
    label: 'Amount Allocated',
    type: 'number',
    helpText:
      'Amount to allocate to the Request Funding Source. Usually the same as the Payment amount.',
    required: true,
    list: false,
    altersDynamicFields: false,
  };
};





module.exports = {
  key: 'create_request_transaction',
  noun: 'Fluxx RequestTransaction',
  display: {
    label: 'Create Fluxx RequestTransaction',
    description:
      'Creates a Fluxx RequestTransaction record along with its related entities: a Request Funding Source on its GrantRequest, and Request Transaction Funding Sources on the RequestTransaction.',
    hidden: false,
    important: true,
  },
  operation: {
    inputFields: [
      {
        key: 'title_request',
        label: 'Request Info',
        type: 'copy',
        helpText: "**Request and Request Funding Source Info**",
      },
      {
        key: 'request_id',
        label: 'GrantRequest ID',
        type: 'integer',
        helpText:
          'ID of the GrantRequest to which the RequestTransaction will be attached.',
        required: true,
        list: false,
        placeholder: 'Enter ID or insert data…',
        altersDynamicFields: false,
      },
      {
        key: 'rfs_id',
        label: 'Request Funding Source Id',
        type: 'integer',
        helpText:
          'Request Funding Source id (if it already exists). Alternatively, provide the funding source id, program id, sub program id and spending year, below.',
        required: false,
        list: false,
        placeholder: 'Enter ID, insert data, or leave blank to show alternative fields…',
        altersDynamicFields: true,
      },
      getInputFieldForFundingSource,
      getInputFieldForProgram,
      getInputFieldForSubProgram,
      getInputFieldForInitiative,
      getInputFieldForSubInitiative,
      getInputFieldForSpendingYear,
      getInputFieldForAmountAllocated,
      {
        key: 'title_request_transactions',
        label: 'Request Transaction Info',
        type: 'copy',
        helpText: "**Request Transaction Info**",
      },
      {
        key: 'amount_due',
        label: 'Amount Due',
        type: 'number',
        helpText:
          'Amount for the Request Transaction to be "due". This amount is also used for the Request Transaction Funding Source.',
        required: true,
        list: false,
        placeholder: 'Enter amount or insert data…',
        altersDynamicFields: false,
      },
      {
        key: 'due_at',
        label: 'Payment Due At',
        type: 'datetime',
        helpText:
          'Date/time the payment will be due.',
        required: false,
        list: false,
        placeholder: 'Enter date or insert data…',
        altersDynamicFields: false,
      },
      {
        key: 'amount_paid',
        label: 'Amount Paid',
        type: 'number',
        helpText:
          'Amount for the Request Transaction to be "paid".',
        required: false,
        list: false,
        placeholder: 'Enter amount or insert data…',
        altersDynamicFields: false,
      },
      {
        key: 'paid_at',
        label: 'Payment Paid At',
        type: 'datetime',
        helpText:
          'Date/time the payment was paid. This can be set in advance or left blank if necessary.',
        required: false,
        list: false,
        placeholder: 'Enter date or insert data…',
        altersDynamicFields: false,
      },
      {
        key: 'payment_type',
        label: 'Payment Type',
        type: 'string',
        helpText:
          'Payment Type for the transaction: Check/Credit Card/Wire/Buffer.',
        required: false,
        list: false,
        altersDynamicFields: false,
      },
      {
        key: 'comment',
        label: 'Comment',
        type: 'text',
        helpText:
          'Comment for the Request Transaction.',
        required: false,
        list: false,
        placeholder: 'Enter comment or insert data…',
        altersDynamicFields: false,
      },
      getInputFieldForTransactionMachineStates,
      getInputFieldForModelTheme,
      {
        key: 'from_bank_account_name',
        label: 'From Bank Account Name Filter',
        type: 'string',
        helpText:
          'Use this field to filter the "From" bank accounts, below',
        required: false,
        list: false,
        altersDynamicFields: true,
      },
      getInputFieldForFromBankAccount,
      {
        key: 'to_bank_account_source',
        label: 'Source of "To" Bank Account id',
        required: false,
        choices: {
          bank_account_id: 'Bank Account Id', 
          request_id: 'From main GrantRequest above; use first active bank account from its Program Organization or Grantee User',
          none: 'none',
        },
        helpText:
          'Where should FCE look for the "To" bank account?',
        default: 'none',
        altersDynamicFields: true,
      },
      function (z, bundle) {
        if (bundle.inputData.to_bank_account_source === 'bank_account_id') {
          return [{
            key: 'to_bank_account_id',
            label: '"To" Bank Account via Bank Account Id',
            type: 'integer',
            helpText:
              'Use if you have access to the bank_account_id of the "To" Bank Account',
            required: false,
            list: false,
            placeholder: 'Enter id or insert data…',
            altersDynamicFields: false,
          }];
        }
        return [];
      },
      {
        key: 'extra_fields',
        label: 'Extra fields',
        type: 'copy',
        helpText: "**Extra Fields and Values to Populate in the RequestTransaction (optional)**\n\nPlease ensure that you enter an equal number of fields and values in the two controls below.",
      },
      async function (z, bundle) {
        const r = await FluxxAPI.fn.fields_for_model(z, bundle, "request_transaction", FluxxAPI.c.CORE_MODELS, true);
        return {
          key: 'fields',
          label: 'Extra Field List for New RequestTransaction ',
          choices: r,
          type: 'string',
          required: false,
          list: true,
          placeholder: 'Select a field to assign a value to…',
          helpText:
            'Enter the list of fields you want to populate in the new RequestTransaction. Use one per box.',
          altersDynamicFields: false,
        };
      },
      {
        key: 'values',
        label: 'Value List',
        type: 'text',
        helpText:
          'Enter a value corresponding to each Field from the previous form control. Use one per box.\nThe first Field will be set to the first Value, the second Field to the second Value, etc.',
        required: false,
        list: true,
        placeholder: 'Enter value to create/update for its corresponding Field above',
        altersDynamicFields: false,
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
