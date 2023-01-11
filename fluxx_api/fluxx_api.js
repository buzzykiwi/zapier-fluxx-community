FluxxAPI = function() {
  // Private methods
  // These methods are available in the closure
  // but are not exposed outside the object we'll be returning.




  // PUBLIC METHODS
  // We return an object that uses our private functions,
  // but only exposes the interface we want to be available.
  return 
// Note that we're executing the function here.
}();

console.log(JSON.stringify(FluxxAPI.optionsForSelectClause(z, "SELECT id FROM Job2 WHERE NOT (c = 3 OR c<2) AND test_id CROSSCARD ( name='stephen') AND test IS 5 MONTHS AGO")));

console.log(FluxxAPI.splitFieldListIntoColsAndRelations(["id", "test", "program_organization_id.full_name", "updated_by.full_name"]));
/*
think about API:

public:
Y parseWhereClause(string)
Y optionsForSelectClause(string)
Y modelToSnake(string)
Y modelToCamel(string)
Y NO_ELASTIC
  fetchOneOptions(model_type, cols, filter, sort_by[obj with some keys to add directly to QS])
  searchOptions  (model_type, cols, filter, sort_by[obj with some keys to add directly to QS])
  fetchByIdOptions (model_type, model_id, cols)
  updateOptions(model_type, model_id, fields, values, cols)
  updateOrNewRecordOptions(model_type, model_id, fields, values, cols)
  newRecordOptions(model_type, model_id, fields, values, cols)

*/
