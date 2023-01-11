require('should');

const zapier = require('zapier-platform-core');

const App = require('../../index');
const appTester = zapier.createAppTester(App);

describe('Trigger - machine_models_2_test', () => {
  zapier.tools.env.inject();

  it('should get an array', async () => {
    const bundle = {
      authData: {
        client_domain: process.env.CLIENT_DOMAIN,
        access_token: process.env.ACCESS_TOKEN,
        refresh_token: process.env.REFRESH_TOKEN,
      },

      inputData: {},
    };

    const results = await appTester(
      App.triggers['machine_models_2_test'].operation.perform,
      bundle
    );
    results.should.be.an.Array();
  });
});
