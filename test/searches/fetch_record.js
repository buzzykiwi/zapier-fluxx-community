require('should');

const zapier = require('zapier-platform-core');

const App = require('../../index');
const appTester = zapier.createAppTester(App);

const FluxxAPI = require('../../fluxx_api');

describe('Search - record', () => {
  zapier.tools.env.inject();

  it('should create an array', async () => {
    const bundle = {
      authData: {
        client_domain: process.env.CLIENT_DOMAIN,
        access_token: process.env.ACCESS_TOKEN,
        refresh_token: process.env.REFRESH_TOKEN,
      },

      inputData: {
        model_type: "GrantRequest",
        model_id: 65,
        fields: ["id", "amount_reqested", "amount_recommended"],
      },
    };

    const result = await appTester(
      App.searches.record.operation.perform,
      bundle
    );
    result.should.be.an.Array();
  });
});
