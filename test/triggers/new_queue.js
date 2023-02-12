require('should');

const zapier = require('zapier-platform-core');

const App = require('../../index');
const appTester = zapier.createAppTester(App);

describe('Trigger - new_queue', () => {
  zapier.tools.env.inject();

  // for doing the tests, specify a queue id on the test server.
  should(process.env).have.property("_TEST_QUEUE_ID");


  it('should get an array', async () => {
    const bundle = {
      authData: {
        client_domain: process.env.CLIENT_DOMAIN,
        access_token: process.env.ACCESS_TOKEN,
        refresh_token: process.env.REFRESH_TOKEN,
      },

      inputData: {
        api_queue: process.env._TEST_QUEUE_ID,
      },
    };

    const results = await appTester(
      App.triggers['new_queue'].operation.perform,
      bundle
    );
    results.should.be.an.Array();
  });
});
