require('should');

const zapier = require('zapier-platform-core');

const App = require('../../index');
const appTester = zapier.createAppTester(App);

describe('Create - file_upload', () => {
  zapier.tools.env.inject();

  // for doing the tests, specify a user id as the created_by and updated_by user.
  should(process.env).have.property("_TEST_USER_ID");
  // the file will be attached to a GrantRequest, with doc_label "default".
  // Specify the id of the grant request to have the file attached.
  should(process.env).have.property("_TEST_GRANT_REQUEST_ID");
  
  it('should create an object', async () => {
    
    const bundle = {
      authData: {
        client_domain: process.env.CLIENT_DOMAIN,
        access_token: process.env.ACCESS_TOKEN,
        refresh_token: process.env.REFRESH_TOKEN,
      },

      inputData: {
        file_name: "fluxx_logo_horiz_color_whitetext.png",
        file: "https://www.fluxx.io/hs-fs/hubfs/fluxx_logo_horiz_color_whitetext.png?width=380&name=fluxx_logo_horiz_color_whitetextX.png",
        created_by_id: process.env._TEST_USER_ID,
        model_id: process.env._TEST_GRANT_REQUEST_ID,
        model_type: "GrantRequest",
        doc_label: "default"
      },
    };

    const result = await appTester(
      App.creates['file_upload'].operation.perform,
      bundle
    );
    console.log(result);
    result.should.not.be.an.Array();
    result.fields.should.be.an.Object();
    result.fields.document_file_size.should.equal(10803);
    result.fields["created_by.id"].should.equal(process.env._TEST_USER_ID-0);// the env values are strings; convert to num
    result.fields["updated_by.id"].should.equal(process.env._TEST_USER_ID-0);
    result.fields.document_content_type.should.equal("image/png");
    result.fields.document_file_name.should.equal("fluxx_logo_horiz_color_whitetext.png");
  });
});
