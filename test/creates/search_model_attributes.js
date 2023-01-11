'use_strict';

require('should');

const zapier = require('zapier-platform-core');

const App = require('../../index');
const appTester = zapier.createAppTester(App);

describe('Create - search_model_attributes', () => {
  zapier.tools.env.inject();

  it('should create an object', async () => {
    const bundle = {
      authData: {
        client_domain: process.env.CLIENT_DOMAIN,
        access_token: process.env.ACCESS_TOKEN,
        refresh_token: process.env.REFRESH_TOKEN,
      },

      inputData: {
        model_type: "grant_request",
        fields: ["id","test_multi_select"],
      },
    };

    const result = await appTester(
      App.creates['search_model_attributes'].operation.perform,
      bundle
    );
    result.should.not.be.an.Array();
  });
});
