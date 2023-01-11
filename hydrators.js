'use_strict';

const hydrators = {
  getFileContents: async (z, bundle) => {
    let options = {
      url: `https://${bundle.authData.client_domain}/api/rest/v2/model_document_download/${bundle.inputData.id}`,
      raw: true,
      method: 'GET',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
  //      Accept: document_content_type,
        Authorization: `Bearer ${bundle.authData.access_token}`,
      },
    };

    let response = await z.request(options);
    const buf = await response.buffer();
    return buf;
  },
  
  stashFileFunction: (z, bundle) => {
    // use standard auth to request the file
    let options = {
      url: `https://${bundle.authData.client_domain}/api/rest/v2/model_document_download/${bundle.inputData.id}`,
      raw: true,
      method: 'GET',
      headers: {
        // 'Content-Type': 'application/x-www-form-urlencoded',
        Accept: (bundle.inputData.document_content_type === null || bundle.inputData.document_content_type === undefined ) ? 'application/octet-stream' : bundle.inputData.document_content_type,
        Authorization: `Bearer ${bundle.authData.access_token}`,
      },
    };

    const filePromise = z.request(options);
    // and swap it for a stashed URL
    
    return z.stashFile(
      filePromise, 
      bundle.inputData.file_size, 
      bundle.inputData.file_name, 
      bundle.inputData.document_content_type
    );
  },
  
  stashBufferFunction: (z, bundle) => {

    // and swap buffer for a stashed URL
    
    return z.stashFile(
      bundle.inputData.buffer, 
      bundle.inputData.file_size, 
      bundle.inputData.file_name, 
      bundle.inputData.document_content_type
    );
  },

};

module.exports = hydrators;