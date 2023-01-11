'use_strict';

const perform = async (z, bundle) => {
  const hydrators = require('../hydrators');
  
  // First, find the MIME type of the original file
  const FluxxAPI = require('../fluxx_api');
  const model_type = 'model_document';
    
  const clause = `SELECT id, document_content_type, document_file_name, created_at, created_by_id.full_name, updated_by_id.full_name, updated_at, doc_label, document_file_size, document_updated_at, original_file_name, model_document_type_id.name, document_type, document_text, documentable_type, documentable_id, model_document_template_id.description FROM ${model_type} WHERE id = ${bundle.inputData.id} LIMIT 1`;
  
  let p = FluxxAPI.fn.optionsForSelectClause(z, clause);  
  // p = {select: cols, from: model_type, where: filter, order_by: order_by, limit: limit};
  
  const options = FluxxAPI.fn.optionsForSingleItemFetch(
    z,
    bundle,
    {
      model_type: p.model_type, 
      cols: p.cols, 
      id: bundle.inputData.model_id
    }
  );

  const initial_response = await z.request(options);
  initial_response.throwForStatus();
  FluxxAPI.fn.handleFluxxAPIReturnErrors(initial_response);
  
  if (initial_response.data[model_type].length === 0) throw `${model_type} ${bundle.inputData.id} not found`;

  const ret = FluxxAPI.fn.processInitialResponse(z, p.cols, initial_response, model_type)
  const file = ret[0];
  const document_content_type = file.fields.document_content_type;
  
  let options2 = {
    url: `https://${bundle.authData.client_domain}/api/rest/v2/model_document_download/${bundle.inputData.id}`,
    raw: true,
    method: 'HEAD', // check to ensure it's valid
    headers: {
      Accept: (document_content_type === null || document_content_type === undefined ) ? 'application/octet-stream' : document_content_type,
      Authorization: `Bearer ${bundle.authData.access_token}`,
    },
  };

  // try loading just the header for the file so we can catch 500 errors for file not existing.
  
  try {
    let buffer = await z.request(options2);
  } catch (e) {
    file.fields.contents_buffer = "";
    if (e.status == 500) {
      return [file]; // non-existent files return 500 from Fluxx.
    }
    return [file]; // no need to dehydrate
  }

  // we know the file is not throwing a 500, so go ahead and dehydrate.
  file.fields.file = z.dehydrateFile(hydrators.stashFileFunction, {
    id: file.id, 
    file_size: file.fields.document_file_size,
    file_name: file.fields.document_file_name,
    document_content_type: file.fields.document_content_type,
  });

  return [file];
};

module.exports = {
  key: 'download_fluxx_file',
  noun: 'File',
  display: {
    label: 'Download File',
    description: 'Downloads a file.',
    directions: 'Should be triggered on a cron (timed) basis',
    hidden: false,
    important: false,
  },
  
  operation: {
    inputFields: [
      {key: 'id', required: true, type: 'integer', label: 'Id', helpText: 'Id of the model_document to download'},
    ],
    perform: perform,
    canPaginate: false,
    type: 'polling',
    sample: {
      id:                                         6833440,
      model_type:                                 'model_document',
      fields: {
        id:                                       6833440,
        created_at:                               '2020-09-28T21:11:18Z',
        updated_at:                               '2020-09-28T21:11:19Z',
        'created_by_id.id':                       1,
        'created_by_id.full_name':                'John Doe',
        'updated_by_id.id':                       1,
        'updated_by_id.full_name':                'John Doe',
        document_file_name:                       'Financials.pdf',
        original_file_name:                       'C:\\financials.pdf',
        document_content_type:                    'application/pdf',
        document_file_size:                       761939,
        document_updated_at:                      '2020-09-28T21:11:18Z',
        'model_document_type_id.id':              8483,
        'model_document_type_id.name':            'Copy of Annual Finance Accounts',
        doc_label:                                'default',
        document_type:                            'file',
        document_text:                            'Liquid code example',
        documentable_type:                        'GrantRequest',
        documentable_id:                          '1',
        'model_document_template_id.id':          '2',
        'model_document_template_id.description': 'Description for Liquid Code or name for letter template',
        file:                                     "sample contents (binary if PDF etc)", 
      }
    },
    outputFields: [
      { key: 'id',                                  type: 'integer',  label: 'Id:' },
      { key: 'model_type',                          type: 'string',   label: 'Model type:' },
      { key: 'fields__file',                        type: 'file',     label: 'File contents:' },
      { key: 'fields__id',                          type: 'integer',  label: 'Id:' },
      { key: 'fields__created_at',                  type: 'datetime', label: 'Created at:' },
      { key: 'fields__updated_at',                  type: 'datetime', label: 'Updated at:' },
      { key: 'fields__created_by_id.id',            type: 'integer',  label: 'Created by Id:' },
      { key: 'fields__created_by_id.full_name',     type: 'string',   label: 'Created by full name:' },
      { key: 'fields__updated_by_id.id',            type: 'integer',  label: 'Updated by id:' },
      { key: 'fields__updated_by_id.full_name',     type: 'string',   label: 'Updated by full name:' },
      { key: 'fields__document_file_name',          type: 'string',   label: 'Doc file name:' },
      { key: 'fields__original_file_name',          type: 'string',   label: 'Original file name:' },
      { key: 'fields__document_content_type',       type: 'string',   label: 'Doc content (MIME) type:' },
      { key: 'fields__document_file_size',          type: 'number',   label: 'File size:' },
      { key: 'fields__document_updated_at',         type: 'datetime', label: 'Doc updated at:' },
      { key: 'fields__model_document_type_id.id',   type: 'integer',  label: 'Doc type id:' },
      { key: 'fields__model_document_type_id.name', type: 'string',   label: 'Doc type name:' },
      { key: 'fields__doc_label',                   type: 'string',   label: 'Doc label:' },
      { key: 'fields__document_type',               type: 'string',   label: 'Doc type (file/text):' },
      { key: 'fields__document_text',               type: 'string',   label: 'Doc text (Liquid):' },
      { key: 'fields__documentable_type',           type: 'string',   label: 'Linked model type:' },
      { key: 'fields__documentable_id',             type: 'integer',  label: 'Linked model id:' },
      { key: 'fields__model_document_template_id.id',type: 'integer', label: 'Template id:' },
      { key: 'fields__model_document_template_id.description', type: 'string', label: 'Template description:' },
    ],
  }
};
