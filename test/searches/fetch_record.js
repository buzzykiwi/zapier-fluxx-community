require('should');

const zapier = require('zapier-platform-core');

const App = require('../../index');
const appTester = zapier.createAppTester(App);

const FluxxAPI = require('../../fluxx_api');

//console.log(JSON.stringify(FluxxAPI.fn.optionsForSelectClause("SELECT id FROM Job2 WHERE NOT (c = 3 OR c<2) AND test_id CROSSCARD ( name='stephen') AND test IS 5 MONTHS AGO")));


describe('Search - fetch_record', () => {
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
      App.searches.fetch_record.operation.perform,
      bundle
    );
    result.should.be.an.Array();
  });
});
