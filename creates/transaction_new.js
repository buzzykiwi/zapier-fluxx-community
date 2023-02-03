'use_strict';
/*jshint esversion: 8 */

const FluxxAPI = require('../fluxx_api');

const variousInputFieldsFromFluxx = async (z, bundle, sql, perform_check = true) => {
  if (perform_check == true && bundle.inputData.rfs_id !== undefined && bundle.inputData.rfs_id !== null && bundle.inputData.rfs_id !== "") {
    return null;
  }
  const p = FluxxAPI.fn.optionsForSelectClause(z, sql);
  const options = FluxxAPI.fn.optionsForSqlSelect(z, bundle, p);
  
  if (options !== null && options !== undefined) {
    const response = await FluxxAPI.fn.paginated_fetch(z, bundle, options, options.model_type, p.limit);
    return FluxxAPI.fn.processInitialResponse(z, p.cols, response, options.model_type);
  }
  return null;
};


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
  let rfs_id = bundle.inputData.rfs_id;
  let fsa_id;
  let new_rfs;
  if (rfs_id === undefined || rfs_id === null || rfs_id == "") {
    // 2. find the FSA from the fields we were given
    let sql = 'SELECT id FROM funding_source_allocation ' +
      'WHERE spending_year = ' + z.JSON.stringify(bundle.inputData.spending_year) +
      ' AND funding_source_id = ' + z.JSON.stringify(bundle.inputData.funding_source_id) +
      ' AND program_id = ' + z.JSON.stringify(bundle.inputData.rfs_program_id) +
      ' AND sub_program_id = ' + z.JSON.stringify(bundle.inputData.rfs_sub_program_id) +
      ' AND initiative_id = ' + z.JSON.stringify(bundle.inputData.rfs_initiative_id) +
      ' AND sub_initiative_id = ' + z.JSON.stringify(bundle.inputData.rfs_sub_initiative_id);
    let results = await variousInputFieldsFromFluxx(z, bundle, sql, false);
    if (Array.isArray(results) && results.length > 0) {
      fsa_id = results[0].id;
    } else {
      throw "No funding source allocation found for given year and fund";
    }
    // We now have all we need for creating the RFS: fsa_id, funding_amount, request, prog, subprog, init, sub_init.
    
    new_rfs = await FluxxAPI.fn.create_fluxx_record(
      z,
      bundle,
      "request_funding_source",
      {
        funding_amount: bundle.inputData.amount_allocated,
        funding_source_allocation_id: fsa_id,
        request_id: bundle.inputData.request_id,
        program_id: bundle.inputData.rfs_program_id,
        sub_program_id: bundle.inputData.rfs_sub_program_id,
        initiative_id: bundle.inputData.rfs_initiative_id,
        sub_initiative_id: bundle.inputData.rfs_sub_initiative_id,
      },
      ["id"], // return fields
    );
    rfs_id = new_rfs.id;
  }
  // calculate the "to" bank account
  sql = null;
  let to_bank_account_id = null;
  switch(bundle.inputData.to_bank_account_source) {
  case "bank_account_id":
    to_bank_account_id = bundle.inputData.to_bank_account_id;
    break;
  case "organization_id": // lookup bank account with org: bundle.inputData.payee_organization_id 
    sql = 'SELECT id FROM BankAccount WHERE active = 1 AND owner_organization_id = ' + z.JSON.stringify(bundle.inputData.payee_organization_id);
    break;
  case "request_id": // lookup request's program_organization_id, lookup bank account with org id "that".
    //'From main GrantRequest above; use first bank account from its Program Organization or Grantee User',
    // BankAccount WHERE owner_organization_id CROSSCARD(grants CROSSCARD(id = 65))
    sql = 'SELECT id FROM BankAccount WHERE active = 1 AND owner_organization_id CROSSCARD(request_ids CROSSCARD(id = ' +
    z.JSON.stringify(bundle.inputData.request_id) + '))';
    break;      
  }
  if (sql !== null) {
    results = await variousInputFieldsFromFluxx(z, bundle, sql, false);
    if (results != null) {
      to_bank_account_id = results[0].id;
    }
  }
  
  var new_rt = await FluxxAPI.fn.create_fluxx_record(
    z,
    bundle,
    "request_transaction",
    {
      request_id: bundle.inputData.request_id,
      amount_due: bundle.inputData.amount_due,
      due_at: bundle.inputData.due_at,
      amount_paid: bundle.inputData.amount_paid,
      paid_at: bundle.inputData.paid_at,
      model_theme_id: bundle.inputData.request_transaction_model_theme,
      organization_payee_id: bundle.inputData.payee_organization_id,
      user_payee_id: bundle.inputData.payee_user_id,
      comment: bundle.inputData.comment,
      payment_type: bundle.inputData.payment_type,
      from_bank_account_id: bundle.inputData.from_account_id,
      state: bundle.inputData.request_transaction_state,
      bank_account_id: to_bank_account_id,
    },
    ["id", "from_bank_account_id", "bank_account_id", "state", "organization_payee_id", "user_payee_id", "due_at", "paid_at"], // return fields
  );
  var rt_id = new_rt.id;
  
  var new_rtfs = await FluxxAPI.fn.create_fluxx_record(
    z,
    bundle,
    "request_transaction_funding_source",
    {
      amount: bundle.inputData.amount_due,
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
      required: false,
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
  key: 'record_update_new',
  noun: 'Fluxx Request Transaction',
  display: {
    label: 'Create Fluxx Request Transaction',
    description:
      'Allows you to create a Fluxx Transaction record along with all its other related entities: a Request Funding Source on its GrantRequest, and Request Transaction Funding Sources on the Transaction.',
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
        key: 'payee_organization_id',
        label: 'Payee Organization ID',
        type: 'integer',
        helpText:
          'ID of the Payee Organization (if any)',
        required: false,
        list: false,
        placeholder: 'Enter ID or insert data…',
        altersDynamicFields: false,
      },
      {
        key: 'payee_user_id',
        label: 'Payee User ID',
        type: 'integer',
        helpText:
          'ID of the Payee User (if any).',
        required: false,
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
          organization_id: 'Specify Organization; use first bank account from the Payee Organization', 
          request_id: 'From main GrantRequest above; use first bank account from its Program Organization or Grantee User',
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
      function (z, bundle) {
        if (bundle.inputData.to_bank_account_source === 'organization_id') {
          return [{
            key: 'to_bank_account_organization_id',
            label: '"To" Bank Account via Organization Id',
            type: 'integer',
            helpText:
              'Use if FCE can identify the "To" bank account as the first valid bank account attached to this organization',
            required: false,
            list: false,
            placeholder: 'Enter id or insert data…',
            altersDynamicFields: false,
          }];
        }
        return [];
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
