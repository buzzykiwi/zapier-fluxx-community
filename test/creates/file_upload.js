require('should');

const zapier = require('zapier-platform-core');

const App = require('../../index');
const appTester = zapier.createAppTester(App);

describe('Create - file_upload', () => {
  zapier.tools.env.inject();

  it('should create an object', async () => {
    const bundle = {
      authData: {
        client_domain: process.env.CLIENT_DOMAIN,
        access_token: process.env.ACCESS_TOKEN,
        refresh_token: process.env.REFRESH_TOKEN,
      },

      inputData: {
        file_name: "fluxx_logo_horiz_color_whitetext.png",
        file: "https://www.fluxx.io/hs-fs/hubfs/fluxx_logo_horiz_color_whitetextX.png?width=380&name=fluxx_logo_horiz_color_whitetextX.png",
        created_by_id: 608,
        model_id: 65,
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
  });
});
