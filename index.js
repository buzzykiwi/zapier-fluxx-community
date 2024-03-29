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
const machineModelListTrigger = require('./triggers/machine_model_list.js');
const getUserList = require("./triggers/user_list");
const getModelDocumentType = require("./triggers/model_document_type");
const getModelDocumentSubType = require("./triggers/model_document_sub_type");
const recordsSqlTrigger = require("./triggers/records_sql_trigger");
const multiFieldsForModel = require("./triggers/multi_fields_for_model.js");
const allFieldsForModel = require("./triggers/all_fields_for_model.js");
const allFieldsForSQLModel = require("./triggers/all_fields_for_sql_model.js");
const writeableFieldsForModel = require("./triggers/writeable_fields_for_model.js");

// Creates
const recordsSqlSearch = require('./creates/records_sql_search.js');
const updateFluxxRecordCreate = require('./creates/record_update_new.js');
const updateFluxxRecordLineItemCreate = require('./creates/record_update_new_line_item.js');
const uploadFileCreate = require('./creates/file_upload.js');
const downloadFileCreate = require('./creates/file_download.js');
const selectListManagement = require('./creates/select_list_management.js');
const transactionCreate = require('./creates/transaction_new.js');
const transformMavSelection = require('./creates/transform_mav_selection.js');
const selectListOptions = require('./creates/select_list_options.js');

// Other
const hydrators = require('./hydrators');

// Searches
const searchUser = require("./searches/user");
const searchRecord = require('./searches/record.js');
const recordSqlSearch = require('./searches/record_sql_search.js');


module.exports = {
  version: require('./package.json').version,
  platformVersion: require('zapier-platform-core').version,
  authentication: authentication,
  beforeRequest: [...befores], // new
  afterResponse: [...afters], // new

  hydrators: hydrators,

  triggers: {
    [newQueueTrigger.key]: newQueueTrigger,
    [machineModelListTrigger.key]: machineModelListTrigger,
    [getUserList.key]: getUserList,
    [getModelDocumentType.key]: getModelDocumentType,
    [getModelDocumentSubType.key]: getModelDocumentSubType,
    [recordsSqlTrigger.key]: recordsSqlTrigger,
    [multiFieldsForModel.key]: multiFieldsForModel,
    [allFieldsForModel.key]: allFieldsForModel,
    [allFieldsForSQLModel.key]: allFieldsForSQLModel,
    [writeableFieldsForModel.key]: writeableFieldsForModel,
  },
  creates: {
    [updateFluxxRecordCreate.key]: updateFluxxRecordCreate,
    [updateFluxxRecordLineItemCreate.key]: updateFluxxRecordLineItemCreate,
    [recordsSqlSearch.key]: recordsSqlSearch,
    [uploadFileCreate.key]: uploadFileCreate,
    [downloadFileCreate.key]: downloadFileCreate,
    [selectListManagement.key]: selectListManagement,
    [transactionCreate.key]: transactionCreate,
    [transformMavSelection.key]: transformMavSelection,
    [selectListOptions.key]: selectListOptions,
  },
  searches: {
    [searchUser.key]: searchUser,
    [searchRecord.key]: searchRecord,
    [recordSqlSearch.key]: recordSqlSearch,
  },
};
