require('should');

const zapier = require('zapier-platform-core');

const App = require('../../index');
const appTester = zapier.createAppTester(App);

const FluxxAPI = require('../../fluxx_api');


const in_bundle = {
  authData: {
    client_domain: process.env.CLIENT_DOMAIN,
    access_token: process.env.ACCESS_TOKEN,
    refresh_token: process.env.REFRESH_TOKEN,
  },

  inputData: {},
};

describe('Trigger - SQL parser', () => {
  zapier.tools.env.inject();

  test('sql_parser', async () => {
    const adHocResult = await appTester(
      // your in-line function takes the same [z, bundle] arguments as normal
      async (z, bundle) => {

        let sql, p, options;
        // a standard select
        sql = "SELECT id FROM grant_request WHERE foo = 123 ORDER BY id desc, project_title asc LIMIT 10";
        p = FluxxAPI.fn.parseSelectStatement(z, sql);
        expect(p.model_type).toEqual('grant_request');
        expect(z.JSON.stringify(p.filter)).toEqual('{"group_type":"and","conditions":[["foo","eq",123]]}');
        expect(z.JSON.stringify(p.order_by)).toEqual('{"sort":[["id","desc"],["project_title","asc"]],"style":"ELASTIC"}');
        expect(z.JSON.stringify(p.limit)).toEqual('"10"');
        expect(z.JSON.stringify(p.cols)).toEqual('["id"]');
      
        // try more than one field to select, including on related model
        sql = "SELECT id, project_name, program_organization.name FROM grant_request WHERE foo = 123 ORDER BY id desc, project_title asc LIMIT 10";
        p = FluxxAPI.fn.parseSelectStatement(z, sql);
        expect(p.model_type).toEqual('grant_request');
        expect(z.JSON.stringify(p.filter)).toEqual('{"group_type":"and","conditions":[["foo","eq",123]]}');
        expect(z.JSON.stringify(p.order_by)).toEqual('{"sort":[["id","desc"],["project_title","asc"]],"style":"ELASTIC"}');
        expect(z.JSON.stringify(p.limit)).toEqual('"10"');
        expect(z.JSON.stringify(p.cols)).toEqual('["id","project_name","program_organization.name"]'); // relations not parsed yet
      
        options = FluxxAPI.fn.optionsFromParsedSelectStatement(z, bundle, p);
        options.should.be.an.Object();
        expect(options.url).toEqual("https://undefined/api/rest/v2/grant_request/list");
        expect(options.method).toEqual("POST");
        options.headers.should.be.an.Object();
        expect(options.headers['Content-Type']).toEqual("application/x-www-form-urlencoded");
        expect(options.headers.Accept).toEqual("application/json");
        expect(options.headers.Authorization).toEqual("Bearer undefined");
        options.params.should.be.an.Object();
        expect(options.params).toEqual({});
        options.body.should.be.an.Object();
        expect(options.body.filter).toEqual('{"group_type":"and","conditions":[["foo","eq",123]]}');
        expect(options.body.cols).toEqual('["id","project_name"]');
        expect(options.body.relation).toEqual('{"program_organization":["name"]}');
        expect(options.body.sort).toEqual('[["id","desc"],["project_title","asc"]]');
        expect(options.model_type).toEqual('GrantRequest');
        
        // change to CamelCase and ensure the URL uses snake_case
        sql = "SELECT id, project_name, program_organization.name FROM GrantRequest WHERE foo = 123 ORDER BY id desc, project_title asc LIMIT 10";
        p = FluxxAPI.fn.parseSelectStatement(z, sql);
        options = FluxxAPI.fn.optionsFromParsedSelectStatement(z, bundle, p);
        options.should.be.an.Object();
        expect(options.url).toEqual("https://undefined/api/rest/v2/grant_request/list");
        
        sql = "SELECT id FROM grant request WHERE foo = 123 ORDER BY id desc, project_title asc LIMIT 10";
        p = FluxxAPI.fn.parseSelectStatement(z, sql);
        expect(p).toEqual(false); // no space allowed in model name
  
        sql = "SELECT id FROM grant_request WHERE foo = 123 ORDER BY id desc, project_title asc LIMIT 10";
        p = FluxxAPI.fn.parseSelectStatement(z, sql);
        expect(FluxxAPI.fn.modelToCamel(p.model_type)).toEqual("GrantRequest");
        expect(FluxxAPI.fn.modelToSnake(p.model_type)).toEqual("grant_request");
  
        sql = "SELECT id FROM grant_request"; // test for basic select with no filter, order by or limit
        p = FluxxAPI.fn.parseSelectStatement(z, sql);
        expect(p.model_type).toEqual('grant_request');
        expect(z.JSON.stringify(p.filter)).toEqual('[]');
        expect(z.JSON.stringify(p.order_by)).toEqual('""');
        expect(z.JSON.stringify(p.limit)).toEqual(undefined);
        expect(z.JSON.stringify(p.cols)).toEqual('["id"]');
    
        check_basic_request('SELECT id FROM grant_request LIMIT 10'); // standard
        check_basic_request('  SELECT id FROM grant_request LIMIT 10'); // leading spaces
        check_basic_request(' \n SELECT id FROM grant_request LIMIT 10'); // leading spaces including newline
        check_basic_request('SELECT id FROM grant_request LIMIT 10   '); // trailing space
        check_basic_request('SELECT    id FROM grant_request LIMIT 10   '); // extra spaces before field list
        check_basic_request('SELECT    id     FROM grant_request LIMIT 10   '); // extra spaces before FROM
        check_basic_request('SELECT    id,project_title     FROM grant_request LIMIT 10   '); // more than one field, no spaces
        check_basic_request('SELECT    id  ,  project_title     FROM grant_request LIMIT 10   '); // more than one field, spaces
        check_basic_request('SELECT    id  ,  project_title     FROM  grant_request LIMIT 10   '); // spaces after FROM
        check_basic_request('SELECT    id  ,  project_title     FROM  grant_request   LIMIT 10   '); // spaces before LIMIT
        check_basic_request('SELECT    id  ,  project_title     FROM  grant_request   LIMIT  10   '); // spaces after LIMIT
        check_basic_request('SELECT    id  ,  project_title\nFROM  grant_request   LIMIT  10   '); // newline as a space
        check_basic_request('SELECT    id  ,  project_title\nFROM  grant_request   LIMIT  10\n\n\n'); // trailing newlines
        
        function check_basic_request(sql) {
          let p = FluxxAPI.fn.parseSelectStatement(z, sql);
          expect(p.model_type).toEqual('grant_request');
          expect(z.JSON.stringify(p.filter)).toEqual('[]');
          expect(z.JSON.stringify(p.order_by)).toEqual('""');
          expect(z.JSON.stringify(p.limit)).toEqual('"10"');
        }
  
        sql = "SELECT id FROM grant_request WHERE project_title CONTAINS 'test'";
        p = FluxxAPI.fn.parseSelectStatement(z, sql);
        options = FluxxAPI.fn.optionsFromParsedSelectStatement(z, bundle, p);
  
        sql = "SELECT id FROM model_attribute_value WHERE value CONTAINS 'test'"; // non-elastic table, should throw exception
        try {
          p = FluxxAPI.fn.parseSelectStatement(z, sql);
          options = FluxxAPI.fn.optionsFromParsedSelectStatement(z, bundle, p);
          expect(false).toEqual("Should not have got here: an exception should be thrown when using non-'=' comparators on a non-Elastic table");
        } catch (e) {
          expect(e).toContain("Non-Elastic model_type");
        }
  
//          cols: m[1].split(/ *, */), // from comma-separated string to Array
//          model_type: model_type,
//          filter: parseWhereClause(z, m[3], model_type),
//          order_by: parseOrderByClause(z, m[5], model_type), // model_type needed as some models have different format for order_by
//          limit: m[7],

        return;
      },
      in_bundle,
    );
  });

});
