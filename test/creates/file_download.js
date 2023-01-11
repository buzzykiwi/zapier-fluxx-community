'use_strict';

require('should');

const zapier = require('zapier-platform-core');

const App = require('../../index');
const appTester = zapier.createAppTester(App);

describe('Create - file_download', () => {
  zapier.tools.env.inject();
  
  // the file will be attached to a GrantRequest, with doc_label "default".
  // Specify the id of the grant request to have the file attached.
  should(process.env).have.property("_TEST_DOWNLOAD_FILE_ID");
  

  it('should create an object', async () => {
    const bundle = {
      authData: {
        client_domain: process.env.CLIENT_DOMAIN,
        access_token: process.env.ACCESS_TOKEN,
        refresh_token: process.env.REFRESH_TOKEN,
      },

      inputData: {
        id: process.env._TEST_DOWNLOAD_FILE_ID,
      },
    };

    const result = await appTester(
      App.creates['file_download'].operation.perform,
      bundle
    );
    result.should.not.be.an.Array();
    result.should.be.an.Object();
    result.fields.should.be.an.Object();
    result.id.should.equal(process.env._TEST_DOWNLOAD_FILE_ID-0); // -0 converts string to num
    result.model_type.should.equal("model_document");
    result.fields.document_file_size.should.be.greaterThan(0);
    result.fields.contents.should.startWith("hydrate|||");
    console.log(result);
  });
});
