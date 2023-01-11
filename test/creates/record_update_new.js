require('should');

const zapier = require('zapier-platform-core');

const App = require('../../index');
const appTester = zapier.createAppTester(App);

describe('Create - record_update_new', () => {
  zapier.tools.env.inject();

  it('should create an object', async () => {
    const bundle = {
      authData: {
        client_domain: process.env.CLIENT_DOMAIN,
        access_token: process.env.ACCESS_TOKEN,
        refresh_token: process.env.REFRESH_TOKEN,
      },

      inputData: {
        id: 65, // or null, to force creation of new model
        fields: ["amount_recommended","project_title","type_1","test_multi_select"],
        // values: [12345,"This is a title","Quick Response Grant","#add/50.6#3 thing#3.2\n#remove_id#10258804\n#add/10#3 thing#3.1"],
        values: [12345,"This is a title","Quick Response Grant","#add/50.6#3 thing#3.2\n#add/10#3 thing#3.1"],
        model_type: "GrantRequest",
        cols: ["id","amount_requested"],
        user_id: 608,
      },
    };

    const result = await appTester(
      App.creates['record_update_new'].operation.perform,
      bundle
    );
    result.should.not.be.an.Array();
  });
});
