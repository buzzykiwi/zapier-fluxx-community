'use_strict';

const FluxxAPI = require('../fluxx_api');

const FormData = require('form-data');
const request = require('request');

//const hydrators = require('../hydrators');

const perform = async (z, bundle) => {
  const formData = new FormData();

  // Fluxx requires:
  /*
  top level:
  "content": the file contents
  "data": {
    "file_name":"<--File Name (w/ extension)-->"
    "document_type":"file"
    "doc_label":"default"
    "owner_model":{"model_type":"<--Class-->","id":<--Record ID-->}
    "storage_type":"file"
    "content_type":"text/plain"
    "created_by_id": user id, recommended
  }
  "cols": [list of columns to return] e.g. ["document_file_name","document_content_type","document_file_size","documentable_type","documentable_id","model_document_type_id","document_type", "created_by"]
  */
  
  // also want to add: model_document_type_id, model_document_sub_type_id
  
  // file will in fact be an url where the file data can be downloaded from
  // which we do via a stream created by NPM's request package
  // (form-data doesn't play nicely with z.request)
  
  //formData.append('file', request(bundle.inputData.file));
  let file_request = request(bundle.inputData.file,function (error, response, body) {
    if (error !== null) {
      throw error;
    }
    if (!(response.statusCode >= 200 && response.statusCode < 300)) {
      throw `HTTP response code ${response.statusCode} (error) while retrieving file`;
    }
    return body;
  });
  formData.append('content', file_request, {filename: bundle.inputData.file_name} );

  let options = {
    url: `https://${bundle.authData.client_domain}/api/rest/v2/model_document`,
    method: 'POST',
    headers: formData.getHeaders({ // merges the arg headers with the multipart/form boundary header
      Accept: 'application/json',
      //Authorization: `Bearer ${bundle.authData.access_token}`,
    }),
    params: {},
    body: formData,
  };
  let data = {
    file_name: bundle.inputData.file_name,
    document_type: "file", /* not sure if we ever need anything different? */
    doc_label: bundle.inputData.doc_label, // needs to be an option, with default "default"
    storage_type: "file", // may need to change for other file types e.g. liquid template?
    content_type: bundle.inputData.content_type, // code in some other common ones like pdf, word, excel, jpg, png, etc?
    model_document_type_id: bundle.inputData.model_document_type_id,
    model_document_sub_type_id: bundle.inputData.model_document_sub_type_id,
    owner_model: {
      model_type: bundle.inputData.model_type,
      id: bundle.inputData.model_id,
    },
    created_by_id: bundle.inputData.created_by_id,
    updated_by_id: bundle.inputData.created_by_id,
  };
  
  if (bundle.inputData.model_document_type_id !== undefined && bundle.inputData.model_document_type_id !== null && bundle.inputData.model_document_type_id !== "") {
    data.model_document_type_id = bundle.inputData.model_document_type_id;
  }
  if (bundle.inputData.model_document_sub_type_id !== undefined && bundle.inputData.model_document_sub_type_id !== null && bundle.inputData.model_document_sub_type_id !== "") {
    data.model_document_sub_type_id = bundle.inputData.model_document_sub_type_id;
  }
  
  formData.append('data', z.JSON.stringify(data));
  let cols = [
    "id", 
    "document_type", 
    "doc_label", 
    "document_content_type",
    "document_file_name",
    "model_document_type_id.id",
    "model_document_type_id.name",
    "model_document_sub_type_id.id",
    "model_document_sub_type_id.name",
    "updated_by.full_name",
    "created_by.full_name",
    "document_file_size"
  ];
  let cols_and_relations = FluxxAPI.fn.splitFieldListIntoColsAndRelations(cols);
  formData.append('cols', z.JSON.stringify(
    cols_and_relations.cols
  ));
  if (Object.keys(cols_and_relations.relation).length > 0) {
    formData.append('relation', z.JSON.stringify(
      cols_and_relations.relation
    ));
  }

  let response = await z.request(options);
  FluxxAPI.fn.handleFluxxAPIReturnErrors(z, response);
  
    /*
    const file = response.data;

    // Make it possible to use the actual uploaded (or online converted)
    // file in a subsequent action. No need to download it now, so again
    // dehydrating like in ../triggers/newFile.js
    file.file = z.dehydrateFile(hydrators.downloadFile, {
      fileId: file.id,
    });

    return file;
    */
  return FluxxAPI.fn.processInitialResponse(z, cols, response, "model_document");

};

module.exports = {
  key: 'file_upload',
  noun: 'File',
  display: {
    label: 'File Upload',
    description: 'Uploads a file to create a new Fluxx ModelDocument'
  },
  operation: {
    inputFields: [
      {key: 'file_name', required: true, type: 'string', label: 'Filename including extension'},
      {key: 'file', required: true, type: 'file', label: 'File'},
      {key: 'doc_label', type: 'string', default: 'default', label: 'Doc Label', helpText: 'Label for document so that different Document components can pick different sets of documents, by label. Default: *default*'},
      // storage_type: always "file"
      {key: 'content_type', type: 'string', required: true, label: "Content (MIME) Type", helpText: 'e.g. text/plain, application/pdf, image/png, image/jpeg, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-powerpoint, application/vnd.openxmlformats-officedocument.presentationml.presentation, application/zip, audio/mpeg, video/mp4, video/mpeg'},
      //{key: 'model_type', type: 'string', required: true, label: 'Related Model'},
      FluxxAPI.fn.getModelTypeDropdown,
      FluxxAPI.fn.getModelTypeDescription,
      
      {key: 'model_id', type: 'integer', required: true, label: 'Related Model Id'},
      // {key: 'model_document_type_id', type: 'integer', required: false, label: 'Document Type Id'},
      {
        key: 'model_document_type_id',
        required: false,
        label: 'Model Document Type',
        dynamic: 'model_document_type.id.name',
        altersDynamicFields: true,
      },
      // {key: 'model_document_sub_type_id', type: 'integer', required: false, label: 'Document Sub Type Id'},
      {
        key: 'model_document_sub_type_id',
        required: false,
        label: 'Model Document Sub Type',
        dynamic: 'model_document_sub_type.id.value',
      },
      //{key: 'created_by_id', type: 'integer', default: "439650", required: true, label: 'Created By Id'},
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
      
    ],
    perform: perform,
    sample: {
      id: 1,
      name: 'Example PDF',
      file: 'SAMPLE FILE',
      file_name: 'example.pdf',
    },
    outputFields: [
      {key: 'id',                                       type: 'integer',  label: 'ID:'},
      {key: 'model_type',                               type: 'string',   label: 'Model Type:'},
      {key: 'fields__id',                               type: 'integer',  label: 'ID(same):'},
      {key: 'fields__document_type',                    type: 'string',   label: 'Document Type:'},
      {key: 'fields__document_content_type',            type: 'string',   label: 'Content (MIME) Type:'},
      {key: 'fields__document_file_name',               type: 'string',   label: 'File Name:'},
      {key: 'fields__document_file_size',               type: 'integer',  label: 'File Size:'},
      {key: 'fields__doc_label',                        type: 'string',   label: 'Doc Label:'},
      {key: 'fields__model_document_type_id.id',        type: 'integer',  label: 'ModelDocument Type Id:'},
      {key: 'fields__model_document_type_id.name',      type: 'string',   label: 'ModelDocument Type Name:'},
      {key: 'fields__model_document_sub_type_id.id',    type: 'integer',  label: 'ModelDocument SubType Id:'},
      {key: 'fields__model_document_sub_type_id.name',  type: 'string',   label: 'ModelDocument SubType Name:'},
      {key: 'fields__updated_by.id',                    type: 'integer',  label: 'Updated By Id:'},
      {key: 'fields__updated_by.full_name',             type: 'string',   label: 'Updated By Name:'},
      {key: 'fields__created_by.id',                    type: 'integer',  label: 'Created By Id:'},
      {key: 'fields__created_by.full_name',             type: 'string',   label: 'Created By Name:'},
    ],
  }
};