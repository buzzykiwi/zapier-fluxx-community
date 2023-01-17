'use_strict';

// original imported:
//const authentication = require('./authentication');

// taken from example code
const {
  config: authentication,
  befores = [],
  afters = [],
} = require('./authentication');


// Triggers
const newQueueTrigger = require('./triggers/new_queue.js');
const downloadFluxxFileTrigger = require('./triggers/download_fluxx_file.js');
const machineModelListTrigger = require('./triggers/machine_model_list.js');
const machineModels2TestTrigger = require('./triggers/machine_models_2_test.js');
const getUserList = require("./triggers/user_list");
const getModelDocumentType = require("./triggers/model_document_type");
const getModelDocumentSubType = require("./triggers/model_document_sub_type");
const recordsSqlTrigger = require("./triggers/records_sql_trigger");

// Creates
const recordSqlSearch = require('./creates/record_sql_search.js');
const recordsSqlSearch = require('./creates/records_sql_search.js');
const updateFluxxRecordCreate = require('./creates/record_update_new.js');
const uploadFileCreate = require('./creates/file_upload.js');
const downloadFileCreate = require('./creates/file_download.js');
const testMavs = require('./creates/test_mavs.js');

// Other
const hydrators = require('./hydrators');

// Searches
const searchUser = require("./searches/user");
const searchRecord = require('./searches/record.js');

const createTestSubInputs = require("./creates/test_sub_inputs");

module.exports = {
  version: require('./package.json').version,
  platformVersion: require('zapier-platform-core').version,
  authentication: authentication,
  beforeRequest: [...befores], // new
  afterResponse: [...afters], // new

  hydrators: hydrators,

  triggers: {
    [newQueueTrigger.key]: newQueueTrigger,
    [downloadFluxxFileTrigger.key]: downloadFluxxFileTrigger,
    [machineModelListTrigger.key]: machineModelListTrigger,
    [machineModels2TestTrigger.key]: machineModels2TestTrigger,
    [getUserList.key]: getUserList,
    [getModelDocumentType.key]: getModelDocumentType,
    [getModelDocumentSubType.key]: getModelDocumentSubType,
    [recordsSqlTrigger.key]: recordsSqlTrigger,
  },
  creates: {
    [updateFluxxRecordCreate.key]: updateFluxxRecordCreate,
    [recordSqlSearch.key]: recordSqlSearch,
    [recordsSqlSearch.key]: recordsSqlSearch,
    [uploadFileCreate.key]: uploadFileCreate,
    [downloadFileCreate.key]: downloadFileCreate,
    [createTestSubInputs.key]: createTestSubInputs,
    [testMavs.key]: testMavs,
  },
  searches: {
    [searchUser.key]: searchUser,
    [searchRecord.key]: searchRecord,
  },
};
