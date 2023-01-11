require('should');

const zapier = require('zapier-platform-core');

const App = require('../../index');
const appTester = zapier.createAppTester(App);

describe('Create - record_sql_search', () => {
  zapier.tools.env.inject();

  it('should create an object', async () => {
    const bundle = {
      authData: {
        client_domain: process.env.CLIENT_DOMAIN,
        access_token: process.env.ACCESS_TOKEN,
        refresh_token: process.env.REFRESH_TOKEN,
      },

      inputData: {
        in: "SELECT id, amount_requested, amount_recommended, program_organization_id.name FROM GrantRequest WHERE id = 11111111 OR program_organization_id CROSSCARD(name = 'Wanganui Toy Library Incorporated')",
      },
    };

    const result = await appTester(
      App.creates['record_sql_search'].operation.perform,
      bundle
    );
    console.log(result);
    result.should.not.be.an.Array();
  });
});
