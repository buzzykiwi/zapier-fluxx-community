'use_strict';

var _internal = require('./_internal');
//var mav_tree = require('./mav_tree');
var c = require('./const');
// CORE_MODELS is separate due to its size. It is generated from a spreadsheet and a script.
c.CORE_MODELS = require('./core_models').CORE_MODELS;


// utility
let modelToSnake = module.exports.modelToSnake = function(model)
{
  // lower_case stays the same
  // lowercase stays the same
  // Project changed to project
  // GrantRequest changed to grant_request
  if (model.toLowerCase() == model) {
    return model; // grant_request will make it through
  }
  // now replace any upper case letters with _ and the lower case equivalent
  var r = '';
  for (i = 0; i < model.length; i++) {
    const ch = model[i];
    if (ch >= 'A' && ch <= 'Z') {
      if (i === 0) {
        r = ch.toLowerCase();
      } else {
        r = r + '_' + ch.toLowerCase();
      }
    } else {
      r = r + ch;
    }
  }
  return r;
};
    
let modelToCamel = module.exports.modelToCamel = function(model)
{
  // lower_case changed to LowerCase
  // lowercase changed to Lowercase
  // Project stays the same
  // GrantRequest stays the same
  if (model[0].toUpperCase() == model[0]) {
    return model;
  }
  var capitalise_next = false;
  var r = '';
  var ch = '';
  for (i = 0; i < model.length; i++) {
    ch = model[i];
    if (capitalise_next === true || i === 0) {
      ch = ch.toUpperCase();
    }
    if (ch == '_') {
      capitalise_next = true;
    } else {
      r = r + ch;
      capitalise_next = false;
    }
  }
  return r;
};


// OPERATORS REGEX
let parseWhereClause = module.exports.parseWhereClause = function(z, input, model_type)
{
  if (input === null || input === undefined || input === "") {
    return [];
  }
  
  // surround input in parentheses
  input = `(${input})`;

  let re = _internal.fluxx_operators_basic_regex();
  let tokens = input.match(re);
  // e.g.
  //["field_1 eq 50", "AND", "(", "field_2 < 4", "OR", "field_2 > 40", ")"]

  // go through the tokens and find any "NOT" that are not followed by "(".
  // If found, insert "(" after the NOT, and insert a ")" 2 places later.
  // In this way, any bare NOT statements will only bind to the item directly after.
  // If they are bound to a bracketed group, if the group was AND it will be come NOT-AND,
  // likewise for OR / NOT-OR
  tokens = _internal.clean_up_nots(tokens);
  const stack = new (_internal.Stack)();

  let filter = {
    data:null
  };

  let extra_brackets_added = 0;
  let new_obj;
  var new_text_item;

  let token = null, token_count = 0;
  let new_node;
  
  for (token of tokens) {
    token_count++;
    switch(true) {
      case token == "(":
        new_obj = new (_internal.RuleNode)();
        if (stack.length() == 0) { // need to add 1st node
          filter.data = new_obj;
          stack.push(filter.data); // becomes the first node
        } else {
          stack.currentConditions().push(new_obj); // adds it to the filter array
          stack.push(stack.lastCondition()); // adds the new node from the filter array to the stack 
        }
        break;

      case token == "NOT(": // can't be the first bracket
        new_obj = new (_internal.RuleNode)("NOT"); // we don't know if it's an AND or OR yet; find out later.
        stack.currentConditions().push(new_obj); // adds it to the filter array
        stack.push(stack.lastCondition()); // adds the new node from the filter array to the stack 

        break;

      case token == ")":
        extra_brackets_added++; // because we are gong back 1 level (maybe more).
        for (; extra_brackets_added > 0; extra_brackets_added--) {
          if (stack.top().group_type === null) {
            stack.top().group_type = "AND"; // just in case
          } else if (stack.top().group_type == "NOT") {
            stack.top().group_type = "NOT-AND";
          }
          stack.pop();
        }
        break;
  
      case token == "AND":
        if (stack.top().group_type === null) {
          stack.top().group_type = "AND";
        } else if (stack.top().group_type === "NOT") {
          stack.top().group_type = "NOT-AND";
        } else if (stack.top().group_type == "OR" || stack.top().group_type == "NOT-OR") { // ignore if it was already AND
          // bind to last node/condition in the array -- make a new AND node containing that item.
          new_node = new (_internal.RuleNode)("AND",[stack.currentConditions().pop()]);
          stack.currentConditions().push(new_node);
          // {group_type:"AND", conditions:[stack.last().conditions.pop()]});
          stack.push(new_node);
          // any new items will go onto that new node with the AND and the previous item from the list
          extra_brackets_added++; // because we went up one level
        }
        break;
  
      case token == "OR":
        if (stack.top().group_type === null) {
          stack.top().group_type = "OR";
        } else if (stack.top().group_type === "NOT") {
          stack.top().group_type = "NOT-OR";
        } else if (stack.top().group_type == "AND" || stack.top().group_type == "NOT-AND") { // ignore if it was already OR
          // bind to the entire last group, whether ands or ors.
          // Do this by replacing the entire current node with an OR, adding the previous node as the first item in the new node's conditions array. Then we add ourselves at the same level.
          if (stack.length() >= 2) {
            stack.previousConditions().push(new (_internal.RuleNode)("OR",[stack.previousConditions().pop()]));
            stack.pop(); // the last item is now invalid because we moved it
            stack.push(stack.lastCondition());
          } else {
            filter.data = new (_internal.RuleNode)("OR",[filter.data]);
            stack.pop();
            stack.push(filter.data);
          }
          // any new items will go onto that new node with the OR and the previous item from the list
        }
        break;
          
      default: // string conditions will get parsed into constituent parts later
        new_text_item = _internal.parseTextToken(token);
        if (new_text_item[1] == 'filter') { // cross-card filter
          new_obj = new (_internal.RuleNode)();
          stack.currentConditions().push([new_text_item[0],"filter",new_obj]);
          stack.push(new_obj);
          //new_obj.relationship_filter_model_type = modelToCamel(new_text_item[2]);
        } else {
          stack.currentConditions().push(new_text_item);
        }
    }
    if (stack.length() == 0) break;
  };
  if (stack.length() != 0 || token_count != tokens.length) {
    throw "Mismatched brackets in WHERE clause";
  }
  
  no_elastic = c.NO_ELASTIC.includes(modelToCamel(model_type));
  // Check to see if we have one of the four allowed constructions.
  // If we come across any errors, we throw.
  if (no_elastic) {
    let ret = _internal.convertToNonElasticFilter(filter, model_type);
    // convert all operands to lower case - not needed for non-elastic
    // convertAndOrNotToLower(ret.data);
    return ret;
  }

  //filter
  convertAndOrNotToLower(filter.data);
//  reduceSingleItemAndsAndOrs(z, filter.data, filter, "data");
  return filter.data;
};

// go through the entire filter and find all the value-operand-value triples.
// Convert the operand to lower case.
function convertAndOrNotToLower(o)
{
  if (o === undefined || o === null || typeof o == 'string') {
    return o;
  }
  let cond;
  if (typeof o.group_type === 'string') {
    o.group_type = o.group_type.toLowerCase();
  }
  if (Array.isArray(o.conditions)) {
    o.conditions.forEach(cond => {
      if (isObj(cond)) {
        convertAndOrNotToLower(cond);
      } else if (Array.isArray(cond) && cond[1] == 'filter' && isObj(cond[2])) {
        convertAndOrNotToLower(cond[2]);
      }
    });
  }
}

// This was a nice idea, but Fluxx requires an AND/OR at root level, and cross card filters can only contain an and/or in them, so no reduction possible.
function reduceSingleItemAndsAndOrs(z, o, par, attribute)
{
  if (o === undefined || o === null || typeof o == 'string') {
    return;
  }
  let cond, index;
  let conds = o.conditions;
  if (Array.isArray(conds)) {
    if (conds.length == 1) {
      // here's where we can remove the AND/OR.
      par[attribute] = conds[0]; // replaces itself in the parent item. new item has same "parent" as current item
      reduceSingleItemAndsAndOrs(z, conds[0], par, attribute); // then go and check that item
    } else {
      o.conditions.forEach((cond, index) => {
        reduceSingleItemAndsAndOrs(z, cond, o.conditions, index); // check all sub items
      });
    }
  } else if (Array.isArray(o) && o[1] == 'filter'){
    reduceSingleItemAndsAndOrs(z, o[2], o, 2); // check all sub items
  } else {
  }
}


let parseOrderByClause = module.exports.parseOrderByClause = function(z,order_by, model_type)
{
  let pair, o;
  let pairs = [];
  let no_elastic;
  let ret = {};

  if (typeof order_by == 'string') {
    let order = order_by.split(/ *, */);
    order.forEach(o => {
      pair = o.split(/ +/);
      if (pair.length == 1) {
        pair.push("asc");
      }
      pairs.push(pair);
    });
  } else if (order_by === undefined || order_by === null || order_by === "") {
    return "";
  } else {
    throw 'Unreadable Order By clause';
  }

  no_elastic = c.NO_ELASTIC.includes(modelToCamel(model_type));

  if (no_elastic) { // can only take one sort ordering pair
    if (pairs.length == 1) {
      ret['sort_attribute'] = pairs[0][0];
      ret['sort_order'] = pairs[0][1];
      ret['style'] = "NO_ELASTIC";
    } else if (pairs.length > 1) {
      throw 'Only one ORDER BY field can be used on the ' + model_type + " model";
    }
  } else { // elastic: can take multiple sort ordering pairs
    if (pairs.length > 0) {
      if (pairs.length == 1) {
        pairs = pairs[0]; // does not need to be array-in-array.
      }
      ret['sort'] = pairs;
      ret['style'] = "ELASTIC";
    }
  }
  return ret;
};

// parseSelectStatement
let parseSelectStatement = module.exports.parseSelectStatement = function(z, clause)
{
  let re = new RegExp(String.raw`^\s*SELECT\s+([a-z][\da-z_,. ]*)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.*?))?(\s+ORDER\s*BY\s+([^ ].*?(?!LIMIT)))?(\s+LIMIT\s*(\d+))?\s*$`,"s");

  // in Zapier, strings containing commas get sent to us as arrays which need a comma join.
  if (Array.isArray(clause)) {
    clause = clause.join(",");
  }
  if (typeof clause != 'string') {
    throw 'illegal input';
  }
  m = clause.match(re);

  if (m !== null) {
    // it looks like an SQL statement
    let model_type = m[2];          // the FROM model
    return {
      cols: m[1].split(/ *, */), // from comma-separated string to Array
      model_type: model_type,
      filter: parseWhereClause(z, m[3], model_type),
      order_by: parseOrderByClause(z, m[5], model_type), // model_type needed as some models have different format for order_by
      limit: m[7],
    };
  }
  return false;
};

/**
 * restoreNullFieldsInResponse(field_list, record)
 *
 * Fluxx does not return requested fields that contained NULL.
 * However, it makes more sense to handle a response that contains
 * null values for keys that you had requested.
 * Input:
 *    field_list (Array) all field names that you requested for the record
 *    record (Array or Object) the set of results (Array) or single result (Object)
 *            containing the result(s).
 *    field_key (String) the name of the object key within each result Object which
 *            contains the Object that has field names as keys.
 *
 *    e.g.  for an array, record=[{},{},{}...]
 *          each record object {} looks like
 *          {
 *            id: 123,
 *            model_type: "GrantRequest",
 *            fields:{
 *              id: 22,
 *              full_name: "John Doe",
 *              email: "john@gmail.com"
 *            }
 *          }
 * Output: the record is edited in-place.
 */
const restoreNullFieldsInResponse = module.exports.restoreNullFieldsInResponse = function(field_list, record, field_key="fields")
{
  if (Array.isArray(record)) {
    let r = {};
    record.forEach (r => {
      field_list.forEach(field => {
        if (!(field in r[field_key])) {
          r[field_key][field] = null;
        }
      });
    });
  } else if (isObj(record)) {
    field_list.forEach(field => {
      if (!(field in record[field_key])) {
        record[field_key][field] = null;
      }
    });
  }
  // the record(s) are manipulated in place; no need to return them here.
};

/**
 * isObj(thing)
 * Determines whether the input argument represents a standard JS Object, as opposed
 * to an Array.
 * Return: boolean. true means it is a non-null Object. All other types return false.
 */
let isObj = module.exports.isObj = function(thing)
{
  return typeof thing === 'object' &&
    !Array.isArray(thing) &&
    thing !== null
};

let splitFieldListIntoColsAndRelations = module.exports.splitFieldListIntoColsAndRelations = function(field_list)
{
  const cols = [];
  const rel = [];
  const relation = {}; // this is what we send to Fluxx
  // populate the columns/relations
  if (field_list === undefined) {
    cols.push("id");
  } else {
    // first, isolate any requested fields with a "."
    field_list.forEach(field => {
      if (field.includes(".")) {
        rel.push(field);
      } else {
        cols.push(field);
      }
    });
    if (rel.length > 0) {          
      rel.sort();
      let item;
      rel.forEach(item => {
        const spl = item.toString().split(".");
        if (spl.length == 2) {
          if (relation[spl[0]] === undefined) {
            relation[spl[0]] = [];
          }
          relation[spl[0]].push(spl[1]);
        }
      });
      
    }
  }
  return {cols:cols, relation:relation};
};

/**
 * preProcessFluxxResponse(z, cols, response, model_type)
 *
 * Performs several processes on the data immediately returned from the FLuxx API:
 * 1 - Makes all returned objects conform to the template object in processSingleItemResponse(),
 *     in that the object has an upper level "id" and "model_type" property, then a dictionary
 *     "fields" that holds all the fields and their objects
 * 2 - Any relations are put into form "local_field.foreign.field" and included in the fields list.
 * 3 - Any null fields are added back in as null (the Fluxx API does not return them if they are null)
 * 4 - If there are multi-value variables returned, especially with enhanced_mavs specified, these are
 *     put into a standardised form that should make it easier to parse and/or retrieve percentage
 *     values.
 *
 * Input:
 *    cols:       Array of column names, can include relations in the form local_field.foreign_field
 *    response:   The array of returned objects, or a single returned object. These are typically found
 *                by taking the raw response of the API call, and retrieving the value for the "data" key.
 *    model_type: "GrantResponse" or "grant_response" forms both acceptable.
 * Output:
 *                Array of records containing keys with id, model_type and fields.
 */

module.exports.preProcessFluxxResponse = function(z, cols, response, model_type)
{
  response.throwForStatus();
  handleFluxxAPIReturnErrors(z, response);

  let data;
  let snake = modelToSnake(model_type);
  if (snake.startsWith("mac_model")) {
    snake = "machine_model";
  }
  if (response.data.records === undefined) {
    data = response.data[snake]; // gets dict of single result;
  } else {
    data = response.data.records[snake]; // gets array of dicts of results;
  }
  let ordered_response;
  let item;
  if (isObj(data)) { // single response, in Object    
    ordered_response = processSingleItemResponse(z, data, model_type);
  } else if (Array.isArray(data)) {
    ordered_response = [];
    data.forEach(item => {
      ordered_response.push(processSingleItemResponse(z, item, model_type));
    });
  } else throw 'Illegal response from Fluxx API call';
  
  // restoring nulls works for arrays of objects or just a single object
  // the ordered_response is edited in-place
  restoreNullFieldsInResponse(cols, ordered_response, "fields");
  return ordered_response;
};

/*
 * processSingleItemResponse(z, item, model_type)
 *
 * Feed each item (single item for a fetch/update; each object from a list from a search)
 * into this function. It creates a new structure like this, to standardise handling
 * of multi-attribute values and relations:
 * {
 *  id: 12345,
 *  model_type: "GrantRequest",
 *  fields: {
 *    id: 12345,
 *    name: "foo",
 *    program_organization_id.name: "Dunder Miflin Paper Co.", // relation shown in dot notation
 *    a_mav_field_with_enhanced_mavs_on: [
 *      {
 *        value: "Hierarchy / To / Selection / Leaf / Node 1",
 *        percent: 50,
 *        breadcrumbs: ["Hierarchy", "To", "Selection", "Leaf", "Node 1"], // May not be accessible as Line Items
 *        breadcrumbs_rev: {
 *          5 => "Hierarchy",                                       // May be easier to access as Line Items,
 *          4 => "To",                                              //  reversed, so [1] is the "end" leaf
 *          3 => "Selection",
 *          2 => "Leaf",
 *          1 => "Node 1",
 *        }
 *      }
 *    ],
 *    a_mav_field_without_enhanced_mavs_on: [
 *      "Node 1",
 *      "Node 2",
 *    ]
 *  }
 * }
 *
 *  If the result was an Object (single item GET) with only an id returned, the
 *  record did not exist, so we just return a null.
 */
const processSingleItemResponse = module.exports.processSingleItemResponse = function(z, item, model_type)
{
  const out = {}; // holds our output
  // top level holds only id and model_type
  out.id = item.id;
  out.model_type = modelToSnake(model_type);

  // the fields key holds all other returned (requested) fields
  out.fields = {};
  const keys = Object.keys(item);
  
  keys.forEach(field => {
    const val = item[field];
    if (Array.isArray(val) && val.length > 0 && isObj(val[0])) {
      // it was a relation. show_mavs sections contain further arrays.
      const foreign_fields = Object.keys(val[0]);
      foreign_fields.forEach(foreign_field => {
        // need to allow for MAVs here, too.
        const inner_val = val[0][foreign_field];
        if (Array.isArray(inner_val) && inner_val.length > 0 && Array.isArray(inner_val[0]) ) { // mav on relation
        
          // out.fields[field + "." + foreign_field] = [];
          out.fields[field + "." + foreign_field + ".add_list"] = "";
          out.fields[field + "." + foreign_field + ".add_list_by_id"] = "";

          out.fields[field + "." + foreign_field + `.line_items`] = [];

          let max_depth = 0;
          // find the max depth of breadcrumbs for the set of results, so we can null-fill missing items
          inner_val.forEach(mav => {
            (mav.length > max_depth) && (max_depth = mav.length);
          });
      
          // run through all the MAVs, and make out.fields[field] an array of these MAVs.
          inner_val.forEach(mav => {
            let line_item = {};
        
            // ignore 0-length arrays that sneak in
            if (!(Array.isArray(mav) && mav.length === 0)) {

              // now within each (array) segment there is 1 or more
              // objects holding path segment info.
              let percentage = -1;
              let segments = [];
              let ez_path = "";
              mav.forEach(segment => {
                segments.push(segment.desc);
                ez_path = `${ez_path}§${segment.val}`
                // all segments of the MAV show the same percentage, even though only the final one is really "chosen"
                if (segment.amount_value === undefined) {
                  percentage = null;
                } else {
                  percentage = segment.amount_value;
                }
              });
          
              if (percentage !== null && percentage != -1) {
                out.fields[field + "." + foreign_field + `.add_list_by_id`] += (`§add_by_id/${percentage}§${mav[mav.length - 1].id}` + "\n");
                out.fields[field + "." + foreign_field + `.add_list`] += (`§add/${percentage}${ez_path.replace(",","||COMMA||")}` + "\n");
              } else {
                out.fields[field + "." + foreign_field + `.add_list_by_id`] += (`§add_by_id§${mav[mav.length - 1].id}` + "\n");
                out.fields[field + "." + foreign_field + `.add_list`] += (`§add${ez_path.replace(",","||COMMA||")}` + "\n");
              }
              line_item.path = ez_path.replace(",","||COMMA||");
              line_item.id = mav[mav.length - 1].id;
              line_item.val = mav[mav.length - 1].val.replace(",","||COMMA||");
              line_item.percent = (percentage !== null && percentage != -1) ? percentage : null;
              line_item.desc = mav[mav.length - 1].desc.replace(",","||COMMA||");
              // the retired value does not get transferred when doing a show_mavs request.
              out.fields[field + "." + foreign_field + `.line_items`].push(line_item);
          
            }
          });
        
        } else {
          out.fields[field + "." + foreign_field] = val[0][foreign_field];
        }
      });
      
    } else if (Array.isArray(val) && val.length > 0 && (Array.isArray(val[0]) || Array.isArray(val[1]))) {
      // show_mavs section
      //out.fields[field] = [];
      out.fields[field + ".add_list"] = "";
      out.fields[field + ".add_list_by_id"] = "";

      out.fields[field + `.line_items`] = [];

      let max_depth = 0;
      // find the max depth of breadcrumbs for the set of results, so we can null-fill missing items
      val.forEach(mav => {
        (mav.length > max_depth) && (max_depth = mav.length);
      });
      
      // run through all the MAVs, and make out.fields[field] an array of these MAVs.
      val.forEach(mav => {
        let line_item = {};
        
        // ignore 0-length arrays that sneak in
        if (!(Array.isArray(mav) && mav.length === 0)) {

          // now within each (array) segment there is 1 or more
          // objects holding path segment info.
          let percentage = -1;
          let segments = [];
          let ez_path = "";
          mav.forEach(segment => {
            segments.push(segment.desc);
            ez_path = `${ez_path}§${segment.val}`
            // all segments of the MAV show the same percentage, even though only the final one is really "chosen"
            if (segment.amount_value === undefined) {
              percentage = null;
            } else {
              percentage = segment.amount_value;
            }
          });
          
          if (percentage !== null && percentage != -1) {
            out.fields[field + `.add_list_by_id`] += (`§add_by_id/${percentage}§${mav[mav.length - 1].id}` + "\n");
            out.fields[field + `.add_list`] += (`§add/${percentage}${ez_path.replace(",","||COMMA||")}` + "\n");
          } else {
            out.fields[field + `.add_list_by_id`] += (`§add_by_id§${mav[mav.length - 1].id}` + "\n");
            out.fields[field + `.add_list`] += (`§add${ez_path.replace(",","||COMMA||")}` + "\n");
          }
          line_item.path = ez_path.replace(",","||COMMA||");
          line_item.id = mav[mav.length - 1].id;
          line_item.val = mav[mav.length - 1].val.replace(",","||COMMA||");
          line_item.percent = (percentage !== null && percentage != -1) ? percentage : null;
          line_item.desc = mav[mav.length - 1].desc.replace(",","||COMMA||");
          // the retired value does not get transferred when doing a show_mavs request.
          out.fields[field + `.line_items`].push(line_item);
          
        }
      });
    } else if (Array.isArray(val) && val.length > 0 && (val[0] === null || typeof val[0] === 'string')) { // plain old multi select values
      out.fields[field] = [];
      val.forEach(mav => {
        if (mav !== null) {
          out.fields[field].push(mav);
        }
      });
    } else {
      out.fields[field] = item[field];
      if (Array.isArray(item[field])) {
        out.fields[field+"_json"] = JSON.stringify(item[field]);
      }
    }
  });
  return out;
};

module.exports.optionsFromParsedSelectStatement = function(z, bundle, p)
{
  let parsed_cols = splitFieldListIntoColsAndRelations(p.cols);
  let order_by = p.order_by;
  // ensure there's always at least one column requested: id
  if (parsed_cols.cols === null || parsed_cols.cols === undefined || (Array.isArray(parsed_cols.cols) && parsed_cols.cols.length == 0)) {
    parsed_cols.cols == ["id"];
  }

  let options = {
    url: `https://${bundle.authData.client_domain}/api/rest/v2/${modelToSnake(p.model_type)}/list`,
    method: 'POST',
    headers: c.STANDARD_HEADERS(bundle),
    params: {},
    body: {
      cols: z.JSON.stringify(parsed_cols.cols),
      // we add the filter below
      // we add sorting below
    },
    model_type: modelToCamel(p.model_type),
  };
  if (p.filter !== null && p.filter !== undefined && !(Array.isArray(p.filter) && p.filter.length == 0)) {
    options.body.filter = z.JSON.stringify(p.filter);
  }
  if (Object.keys(parsed_cols.relation).length > 0) {
    options.body['relation'] = z.JSON.stringify(parsed_cols.relation);
  } 
  if (order_by !== undefined && order_by !== null) {
    if (order_by.style == 'ELASTIC') {
      options.body['sort'] = z.JSON.stringify(order_by.sort);
    } else if (order_by.style == 'NO_ELASTIC') {
      options.body['sort_attribute'] = order_by.sort_attribute;
      options.body['sort_order'] = order_by.sort_order;
    }
  }
  return options;
};

/**
 * optionsForSingleItemFetch
 * similar to optionsFromParsedSelectStatement except returns the options object
 * for a single item rather than a list of items.
 * The p object has to contain:
 * - id requested
 * - model_type
 * - cols is array of column names
 * - no sorting or filter required.
 */
module.exports.optionsForSingleItemFetch = function(z, bundle, p)
{
  let parsed_cols = splitFieldListIntoColsAndRelations(p.cols);
  let options = {
    url: `https://${bundle.authData.client_domain}/api/rest/v2/${modelToSnake(p.model_type)}/${p.id}`,
    method: 'GET',
    headers: c.STANDARD_HEADERS(bundle),
    params: {
      cols: z.JSON.stringify(parsed_cols.cols),
    },
    model_type: modelToCamel(p.model_type),
  };
  if (Object.keys(parsed_cols.relation).length > 0) {
    options.params['relation'] = z.JSON.stringify(parsed_cols.relation);
  } 
  return options;
};

/* This is not being used anywhere: may need it when handling MAS?
 * On the other hand, I think I first set this up when I thought that
 * any single-value <select> controls would need special handling.
 * They don't though: simply set their string value. A new option
 * will be created if the string you set it to does not exist already.
 */
/**
 *
 * Pass this a model_type (e.g. GrantRequest) and a list
 * of fields in field, and this returns an object where
 * o.model_attribute = a list of objects that represent any
 * of the field names that are multi-value. Each object
 * has keys id, name, description and model_type.
*/
module.exports.determine_mas = async function(z, model_type, field_list)
{
  const sma_options = {
    url: `https://${bundle.authData.client_domain}/api/rest/v2/model_attribute/list`,
    method: 'POST',
    headers: FluxxAPI.c.STANDARD_HEADERS(bundle),
    params: {},
    body: {
      cols: z.JSON.stringify(['name', 'description', 'model_type']),
    },
  };
  
  sma_options.body.filter = JSON.stringify({
    name: field_list /* array */,
    model_type: modelToCamel(model_type) /* GrantRequest */,
    attribute_type: 'multi_value',
  });
  const response = await z.request(sma_options);
  response.throwForStatus();
  handleFluxxAPIReturnErrors(z, response);
  return response.data.records.model_attribute;
}

/**
 * dynamic_fields_for_dynamic_model(z, bundle, model_type)
 */
let dynamic_fields_for_dynamic_model = module.exports.dynamic_fields_for_dynamic_model = async function (z, bundle, model_type)
{
  const options = {
    url: `https://${bundle.authData.client_domain}/api/rest/v2/model_attribute/list`,
    method: 'POST',
    headers: c.STANDARD_HEADERS(bundle),
    params: {},
    body: {
      cols: z.JSON.stringify(['id', 'name', 'attribute_type', 'multi_allowed']),
      sort_attribute: 'name',
      sort_order: 'asc',
      filter: z.JSON.stringify({
        model_attribute: {
          model_type: modelToCamel(model_type),
        },
      }),
    },
  };
  let response = await paginated_fetch(z, bundle, options, "model_attribute", 0); // limit 0 means no limit
  return response.data.records.model_attribute;
}

/**
 * fields_for_model
 * returns an array suitable as a dropdown with all the fields for a given model
 * model_type: the model whose fields will be returned
 * fields: the total array of all core fields
 * write_access: if true, remove the "id" and any r-o fields from the list: use this if looking for fields to update
 * or add to a new record, as you should never have to write to the id field.
 */
let fields_for_model = module.exports.fields_for_model = async function(z, bundle, model_type, fields, write_access = false, multi_value_only = false)
{
  const model_attribute = {
    model_type: modelToCamel(model_type),
  };
  if (multi_value_only) {
    model_attribute.attribute_type = 'multi_value';
  }
        
  const options = {
    url: `https://${bundle.authData.client_domain}/api/rest/v2/model_attribute/list`,
    method: 'POST',
    headers: c.STANDARD_HEADERS(bundle),
    params: {},
    body: {
      cols: z.JSON.stringify(['name', 'id', 'attribute_type', 'multi_allowed']),
      sort_attribute: 'name',
      sort_order: 'asc',
      filter: z.JSON.stringify({
        model_attribute: model_attribute,
      }),
    },
  };
  
  // first the core fields
  const field_list = fields[modelToCamel(model_type)];

  // then the dynamic fields
  let response = await paginated_fetch(z, bundle, options, "model_attribute", 0); // limit 0 means no limit

  response = response.data.records.model_attribute;

  const dropdown_list = [];
  
  // If we are looking for multi-values only, the CORE list doesn't contain any. Bypass.
  // Otherwise, add all the core fields for this model type.
  if (!multi_value_only) {
    // Add the core fields to the list, first
    Object.keys(field_list).forEach((field) => {
      // ignore the key reserved for info about the model, as well as reverse relationships which don't appear to work
      if (
        field != '#info' && 
        field.search('MacModelTypeDyn') == -1 && 
        !(write_access == true && field == 'id') &&
        !(write_access == true && field_list[field].permission == '[]') )
        {
          dropdown_list.push({
            id: field,
            value: field,
            label: field + ' (' + 
              field_list[field].data_type + 
              (field_list[field].data_type == 'method' ? '; ' + field_list[field].type : '') +
              ((field_list[field].plural == 'plural' && field_list[field].type != 'column')? '; list': '') + 
            ')',
          });
        }
    });
  }
  if (response.length > 0) {
    if (!multi_value_only) {
      dropdown_list.push({
        id: 'DYNAMIC_FIELDS',
        value: '',
        label: 'DYNAMIC FIELDS (do not select this option; choose from options below)',
      });
    }
    // Then add the dynamic fields
    response.forEach((item) => {
      dropdown_list.push({
        id: item.id,
        value: item.name,
        label: `${item.name} (${item.attribute_type})${
          item.multi_allowed == 1 ? ' (multi-allowed)' : ''
        }`,
      });
    });
  }
  return dropdown_list;
};


let fetch_core_and_machine_model_list = module.exports.fetch_core_and_machine_model_list = async function(z, bundle, group)
{  
  const options = {
    url: `https://${bundle.authData.client_domain}/api/rest/v2/machine_model_type/list`,
    method: 'POST',
    headers: c.STANDARD_HEADERS(bundle),
    params: {},
    body: {
      cols: z.JSON.stringify(['model_type', 'name', 'id']),
      sort_attribute: 'name',
      sort_order: 'asc',
    },
  };
  
  var r = [
    { id: -1, value: 'AdhocReport', label: 'Adhoc Report' },
    { id: -3, value: 'Affiliate', label: 'Affiliate' },
    { id: -2, value: 'AffiliateType', label: 'Affiliate Type' },
    { id: -8, value: 'Alert', label: 'Alert' },
    { id: -4, value: 'AlertEmail', label: 'Alert Email' },
    { id: -5, value: 'AlertModelLog', label: 'Alert Model Log' },
    { id: -6, value: 'AlertRecipient', label: 'Alert Recipient' },
    {
      id: -7,
      value: 'AlertTransitionState',
      label: 'Alert Transition State',
    },
    {
      id: -9,
      value: 'BankAccount',
      label: 'Bank Account',
      intermediate: true,
    },
    { id: -10, value: 'BudgetRequest', label: 'Budget Request' },
    { id: -11, value: 'CardConfiguration', label: 'Card Configuration' },
    { id: -12, value: 'CensusConfig', label: 'Census Config' },
    { id: -12.5, value: 'Claim', label: 'Claim', intermediate: true },
    { id: -13, value: 'ClientConfiguration', label: 'Client Configuration' },
    { id: -14, value: 'ClientStore', label: 'Client Store' },
    { id: -15, value: 'Coi', label: 'Coi', intermediate: true },
    { id: -16, value: 'CommitTicket', label: 'Commit Ticket' },
    {
      id: -17,
      value: 'ComplianceChecklistItem',
      label: 'Compliance Checklist Item',
    },
    { id: -18, value: 'ConceptInitiative', label: 'Concept Initiative' },
    { id: -19, value: 'ConfigModelDocument', label: 'Config Model Document' },
    { id: -23, value: 'Document', label: 'Document' },
    { id: -20, value: 'DashboardGroup', label: 'Dashboard Group' },
    { id: -21, value: 'DashboardTemplate', label: 'Dashboard Template' },
    { id: -22, value: 'DashboardTheme', label: 'Dashboard Theme' },
    { id: -24, value: 'EmailUser', label: 'Email User' },
    {
      id: -25,
      value: 'EtlRequestBudget',
      label: 'Etl Request Budget',
      intermediate: true,
    },
    {
      id: -26,
      value: 'EtlRequestTransactionBudget',
      label: 'Etl Request Transaction Budget',
      intermediate: true,
    },
    { id: -27, value: 'ExcelReport', label: 'Excel Report' },
    { id: -28, value: 'ExtractFormat', label: 'Extract Format' },
    { id: -29, value: 'Favorite', label: 'Favorite' },
    { id: -30, value: 'FieldList', label: 'Field List' },
    { id: -32, value: 'Form', label: 'Form' },
    { id: -31, value: 'FormElement', label: 'Form Element' },
    { id: -39, value: 'Fund', label: 'Fund', intermediate: true },
    {
      id: -33,
      value: 'FundDocket',
      label: 'Fund Docket',
      intermediate: true,
    },
    { id: -34, value: 'FundLineItem', label: 'Fund Line Item' },
    {
      id: -38,
      value: 'FundingSource',
      label: 'Funding Source',
      intermediate: true,
    },
    {
      id: -36,
      value: 'FundingSourceAllocation',
      label: 'Funding Source Allocation',
    },
    {
      id: -35,
      value: 'FundingSourceAllocationAuthority',
      label: 'Funding Source Allocation Authority',
      intermediate: true,
    },
    {
      id: -37,
      value: 'FundingSourceForecast',
      label: 'Funding Source Forecast',
    },
    { id: -40, value: 'FxConversion', label: 'Fx Conversion' },
    { id: -41, value: 'FxType', label: 'Fx Type' },
    { id: -42, value: 'GenericTemplate', label: 'Generic Template' },
    { id: -43, value: 'GeoCity', label: 'Geo City' },
    { id: -44, value: 'GeoCounty', label: 'Geo County' },
    { id: -45, value: 'GeoCountry', label: 'Geo Country' },
    { id: -47, value: 'GeoPlace', label: 'Geo Place' },
    {
      id: -46,
      value: 'GeoPlaceRelationship',
      label: 'Geo Place Relationship',
    },
    { id: -48, value: 'GeoRegion', label: 'Geo Region' },
    { id: -49, value: 'GeoState', label: 'Geo State' },
    { id: -50, value: 'GithubCommit', label: 'Github Commit' },
    {
      id: -51,
      value: 'GranteeBudget',
      label: 'Grantee Budget', intermediate: true,
    },
    {
      id: -51.5,
      value: 'GrantRequest',
      label: 'Grant Request',
      basic: true,
      intermediate: true,
    },
    { id: -53, value: 'Group', label: 'Group' },
    { id: -52, value: 'GroupMember', label: 'Group Member' },
    { id: -54, value: 'GsStream', label: 'Gs Stream' },
    { id: -55, value: 'Indicator', label: 'Indicator', intermediate: true },
    {
      id: -56,
      value: 'Initiative',
      label: 'Initiative',
      basic: true,
      intermediate: true,
    },
    { id: -57, value: 'IntegrationFilter', label: 'Integration Filter' },
    {
      id: -58,
      value: 'IntegrationLog',
      label: 'Integration Log',
      intermediate: true,
    },
    { id: -59, value: 'Job', label: 'Job' },
    { id: -60, value: 'Language', label: 'Language' },
    { id: -61, value: 'Loi', label: 'Loi', intermediate: true },
    { id: -62, value: 'MachineCategory', label: 'Machine Category' },
    { id: -65, value: 'MachineEvent', label: 'Machine Event' },
    {
      id: -63,
      value: 'MachineEventFromState',
      label: 'Machine Event From State',
    },
    { id: -64, value: 'MachineEventRole', label: 'Machine Event Role' },
    { id: -67, value: 'MachineModel', label: 'Machine Model' },
    { id: -66, value: 'MachineModelType', label: 'Machine Model Type' },
    { id: -70, value: 'MachineState', label: 'Machine State' },
    {
      id: -68,
      value: 'MachineStateCategory',
      label: 'Machine State Category',
    },
    {
      id: -69,
      value: 'MachineStateGroup',
      label: 'Machine State Group',
      intermediate: true,
    },
    { id: -72, value: 'MachineWorkflow', label: 'Machine Workflow' },
    { id: -71, value: 'MachineWorkflowFork', label: 'Machine Workflow Fork' },
    {
      id: -73,
      value: 'MatchingGiftProfile',
      label: 'Matching Gift Profile',
      intermediate: true,
    },
    { id: -74, value: 'MelResult', label: 'Mel Result' },
    { id: -75, value: 'MelUpdate', label: 'Mel Update' },
    { id: -76, value: 'Mention', label: 'Mention' },
    { id: -77, value: 'MigrateRow', label: 'Migrate Row' },
    { id: -81, value: 'MigrationConfig', label: 'Migration Config' },
    {
      id: -78,
      value: 'MigrationConfigColumn',
      label: 'Migration Config Column',
    },
    {
      id: -80,
      value: 'MigrationConfigModel',
      label: 'Migration Config Model',
    },
    {
      id: -79,
      value: 'MigrationConfigModelLink',
      label: 'Migration Config Model Link',
    },
    { id: -83, value: 'Migration', label: 'Migration' },
    { id: -82, value: 'MigrationFile', label: 'Migration File' },
    { id: -86, value: 'ModelAttribute', label: 'Model Attribute' },
    {
      id: -84,
      value: 'ModelAttributeChoice',
      label: 'Model Attribute Choice',
    },
    { id: -85, value: 'ModelAttributeValue', label: 'Model Attribute Value' },
    {
      id: -87,
      value: 'ModelCloneConfiguration',
      label: 'Model Clone Configuration',
    },
    {
      id: -94,
      value: 'ModelDocument',
      label: 'Model Document',
      basic: true,
    },
    { id: -88, value: 'ModelDocumentMaster', label: 'Model Document Master' },
    { id: -90, value: 'ModelDocumentSign', label: 'Model Document Sign' },
    {
      id: -89,
      value: 'ModelDocumentSignEnvelope',
      label: 'Model Document Sign Envelope',
    },
    {
      id: -91,
      value: 'ModelDocumentSubType',
      label: 'Model Document Sub Type',
    },
    {
      id: -92,
      value: 'ModelDocumentTemplate',
      label: 'Model Document Template',
      intermediate: true,
    },
    { id: -93, value: 'ModelDocumentType', label: 'Model Document Type' },
    { id: -95, value: 'ModelEmail', label: 'Model Email' },
    { id: -96, value: 'ModelMethod', label: 'Model Method' },
    { id: -97, value: 'ModelTheme', label: 'Model Theme' },
    { id: -99, value: 'ModelValidation', label: 'Model Validation' },
    {
      id: -98,
      value: 'ModelValidationField',
      label: 'Model Validation Field',
    },
    { id: -100, value: 'MultiElementValue', label: 'Multi Element Value' },
    { id: -101, value: 'Note', label: 'Note' },
    {
      id: -102,
      value: 'OfacPerson',
      label: 'Ofac Person',
      intermediate: true,
    },
    {
      id: -103,
      value: 'Organization',
      label: 'Organization',
      basic: true,
      intermediate: true,
    },
    { id: -104, value: 'Outcome', label: 'Outcome', intermediate: true },
    { id: -105, value: 'PeriodicSync', label: 'Periodic Sync' },
    { id: -106, value: 'PermissionDelegator', label: 'Permission Delegator' },
    { id: -107, value: 'Persona', label: 'Persona' },
    { id: -109, value: 'PopulationEstimate', label: 'Population Estimate' },
    {
      id: -108,
      value: 'PopulationEstimateYear',
      label: 'Population Estimate Year',
    },
    { id: -111, value: 'Post', label: 'Post' },
    { id: -110, value: 'PostRelationship', label: 'Post Relationship' },
    {
      id: -113,
      value: 'Program',
      label: 'Program',
      basic: true,
      intermediate: true,
    },
    { id: -112, value: 'ProgramBudget', label: 'Program Budget' },
    {
      id: -119,
      value: 'Project',
      label: 'Project',
      basic: true,
      intermediate: true,
    },
    { id: -115, value: 'ProjectList', label: 'Project List' },
    { id: -114, value: 'ProjectListItem', label: 'Project List Item' },
    { id: -116, value: 'ProjectOrganization', label: 'Project Organization' },
    { id: -117, value: 'ProjectRequest', label: 'Project Request' },
    { id: -118, value: 'ProjectUser', label: 'Project User' },
    { id: -120, value: 'RealMeInvitation', label: 'Real Me Invitation' },
    { id: -121, value: 'RealtimeUpdate', label: 'Realtime Update' },
    { id: -122, value: 'Relationship', label: 'Relationship' },
    { id: -140, value: 'Request', label: 'Request' },
    {
      id: -123,
      value: 'RequestAmendment',
      label: 'Request Amendment',
      intermediate: true,
    },
    {
      id: -124,
      value: 'RequestEvaluationMetric',
      label: 'Request Evaluation Metric',
    },
    {
      id: -125,
      value: 'RequestFundingSource',
      label: 'Request Funding Source',
      intermediate: true,
    },
    { id: -126, value: 'RequestGeoState', label: 'Request Geo State' },
    { id: -127, value: 'RequestOrganization', label: 'Request Organization' },
    { id: -128, value: 'RequestOutcome', label: 'Request Outcome' },
    { id: -129, value: 'RequestProgram', label: 'Request Program' },
    {
      id: -130,
      value: 'RequestRecommendation',
      label: 'Request Recommendation',
      intermediate: true,
    },
    {
      id: -131,
      value: 'RequestRecommender',
      label: 'Request Recommender',
      intermediate: true,
    },
    {
      id: -132,
      value: 'RequestRegrant',
      label: 'Request Regrant',
      intermediate: true,
    },
    {
      id: -133,
      value: 'RequestReport',
      label: 'Request Report',
      basic: true,
      intermediate: true,
    },
    {
      id: -136,
      value: 'RequestReview',
      label: 'Request Review',
      intermediate: true,
    },
    {
      id: -134,
      value: 'RequestReviewSet',
      label: 'Request Review Set',
      intermediate: true,
    },
    {
      id: -135,
      value: 'RequestReviewerAssignment',
      label: 'Request Reviewer Assignment',
    },
    {
      id: -138,
      value: 'RequestTransaction',
      label: 'Request Transaction',
      basic: true,
      intermediate: true,
    },
    {
      id: -137,
      value: 'RequestTransactionFundingSource',
      label: 'Request Transaction Funding Source',
      intermediate: true,
    },
    {
      id: -139,
      value: 'RequestUser',
      label: 'Request User',
      intermediate: true,
    },
    { id: -142, value: 'Role', label: 'Role' },
    { id: -141, value: 'RoleUser', label: 'Role User' },
    { id: -144, value: 'Segment', label: 'Segment' },
    { id: -143, value: 'SegmentTag', label: 'Segment Tag' },
    { id: -145, value: 'SharedCard', label: 'Shared Card' },
    { id: -146, value: 'SpendingForecast', label: 'Spending Forecast' },
    { id: -147, value: 'SphinxCheck', label: 'Sphinx Check' },
    { id: -151, value: 'Stencil', label: 'Stencil' },
    { id: -148, value: 'StencilBookPage', label: 'Stencil Book Page' },
    { id: -149, value: 'StencilBook', label: 'Stencil Book' },
    { id: -150, value: 'StencilForm', label: 'Stencil Form' },
    {
      id: -152,
      value: 'SubInitiative',
      label: 'Sub Initiative',
      basic: true,
      intermediate: true,
    },
    {
      id: -153,
      value: 'SubProgram',
      label: 'Sub Program',
      basic: true,
      intermediate: true,
    },
    { id: -154, value: 'TableView', label: 'Table View' },
    { id: -156, value: 'Tag', label: 'Tag' },
    { id: -155, value: 'Tagging', label: 'Tagging' },
    {
      id: -157,
      value: 'TransactionReportDependency',
      label: 'Transaction Report Dependency',
    },
    {
      id: -158,
      value: 'TranslatorAssignment',
      label: 'Translator Assignment',
    },
    { id: -159, value: 'TranslatorLanguage', label: 'Translator Language' },
    {
      id: -165,
      value: 'User',
      label: 'User',
      basic: true,
      intermediate: true,
    },
    { id: -160, value: 'UserOrganization', label: 'User Organization' },
    {
      id: -161,
      value: 'UserPermission',
      label: 'User Permission',
      intermediate: true,
    },
    { id: -163, value: 'UserProfile', label: 'User Profile' },
    { id: -162, value: 'UserProfileRule', label: 'User Profile Rule' },
    { id: -164, value: 'UserSegmentTag', label: 'User Segment Tag' },
    { id: -167, value: 'WikiDocument', label: 'Wiki Document' },
    {
      id: -166,
      value: 'WikiDocumentTemplate',
      label: 'Wiki Document Template',
    },
    { id: -168, value: 'WorkTask', label: 'Work Task', intermediate: true },
    {
      id: -169,
      value: 'WorkflowEvent',
      label: 'Workflow Event',
      intermediate: true,
    },
  ];

  if (group == 'Basic' || group == '')
    return r.filter((item) => {
      return item.basic === true;
    });
  if (group == 'Intermediate')
    return r.filter((item) => {
      return item.intermediate === true;
    });
  if (group == 'Dynamic Models only') r = [];
  // otherwise, we show All.

  let response = await paginated_fetch(z, bundle, options, "machine_model_type", 0); // limit 0 means no limit
  response = response.data.records.machine_model_type;
  response.forEach(function (mm) {
    r.push({ 
      id: mm.id, 
      value: mm.model_type, 
      label: mm.name
    });
  });
  return r;
};

/**
 * getModelTypeDescription
 * Provides a hyperlink to the Fluxx documentation for a model_type as defined in bundle.inputData.model_type.
 */
module.exports.getModelTypeDescription = function (z, bundle) {
  if (bundle.inputData.model_type === null || bundle.inputData.model_type === undefined || bundle.inputData.model_type.length == 0) {
    return {
      key: 'model_type_description',
      label: 'Model Type Description',
      type: 'copy',
      helpText: `*A link to API docs will appear once you have chosen a Model Type*`,
    };
  }
  let descriptions = "";
  let model_type_snake = modelToCamel(bundle.inputData.model_type);
  let link = `[${model_type_snake}](https://${bundle.authData.client_domain}/api/rest/v2/${model_type_snake}/doc)`
  
  return {
    key: 'model_type_description',
    label: 'Model Type Description',
    type: 'copy',
    helpText: `See API documentation for *${link}*`,
  };
}

/**
 * getReturnFieldDescriptions
 * Provides a list of descriptions of input fields as help text in a form.
 * The list of fields has to be in the bundle.inputData.fields array.
 */
module.exports.getReturnFieldDescriptions = async function (z, bundle) {
  let descriptions = "";
  let fields = bundle.inputData.fields;
  let core_models = c.CORE_MODELS;
  let field;
    
  if (fields !== null && 
    fields !== undefined && 
    fields.length > 0 && 
    bundle.inputData.model_type != null && 
    bundle.inputData.model_type !== undefined && 
    bundle.inputData.model_type != '') {

    let model_type_snake = modelToCamel(bundle.inputData.model_type);
    let dyn_fields = await dynamic_fields_for_dynamic_model(z, bundle, bundle.inputData.model_type);
    
    fields.forEach( field => {
      let s = core_models[model_type_snake][field];
      if (s !== undefined) {
        let link = false;
        if (s.data_type.match(/^[A-Z]/) && s.data_type != 'CDT') {
          link = `[${s.data_type}](https://${bundle.authData.client_domain}/api/rest/v2/${s.data_type}/doc)`
        }
        descriptions += `**Core field: ${field}**` + "\n\n- " + s.description + "\n\n";
        if (s.plural == "plural" && s.type != 'column') {
          descriptions += "- Returns a **list** of ids. Lists are read-only.\n\n";
        }
        descriptions += `- Type: ${s.type} (${ (link === false ? s.data_type: link)})` + "\n\n";
      } else {
        let dyn_field = dyn_fields.find(f => f.name == field);
        if (dyn_field !== undefined) {
          if (dyn_field.multi_allowed == 1) {
            descriptions = descriptions + `**Dynamic field: ${field}**` + "\n\n";
            descriptions += "- multi-value list\n\n";
            descriptions += "To add or remove items to/from the selection, please use the following format in the Value List for this item:\n\n";
            descriptions += "    #remove_all\n";
            descriptions += "    #remove#level 1#level 2\n";
            descriptions += "    #remove_id#123\n";
            descriptions += "    #add#level 1#level 2\n";
            descriptions += "    #add/50#level 1#level 2\n";
            descriptions += "    #add_id/50#123\n";
            descriptions += "\n";
            descriptions += "- The '#' can be changed to a different delimiter on any line, so long as it is consistent on that line\n";
            descriptions += "- If used, the IDs for *remove_id* and *add_id* are Model Attribute Value ids.\n";
            descriptions += "- The numbers after '#add/' and '#add_id/' are percentages.\n";
            descriptions += "- If you add a value that already exists for a field, the percentage will be updated if different; otherwise, the add is ignored.\n";
            descriptions += "Removes are processed before adds.\n\n";            
          } else {
            descriptions += `**Dynamic field: ${field}**` + "\n\n- " + dyn_field.attribute_type + "\n\n";
          }
        }
      }
    });
    
    return {
      key: 'field_descriptions',
      label: 'Field Descriptions',
      type: 'copy',
      helpText: descriptions,
    };
  }
  return {
    key: 'field_descriptions',
    label: 'Field Descriptions',
    type: 'copy',
    helpText: '*field descriptions appear here after you select at least one field*',
  };
}

module.exports.getModelTypeDropdown = async (z, bundle) => {
  // Generate a list of Model Types
  // based on the "group" e.g. Basic, All.

  const r = await fetch_core_and_machine_model_list(z, bundle, bundle.inputData.model_group);
  return {
    key: 'model_type',
    label: 'Model Type',
    choices: r,
    type: 'string',
    required: true,
    altersDynamicFields: true,
  };
};

module.exports.getReturnFieldsDropdown = async (z, bundle) => {

  // Fields to return from new/updated model
  const model_type = bundle.inputData.model_type;

  if (model_type === undefined || model_type === '') {
    return;
  }

  const r = await fields_for_model(z, bundle, model_type, c.CORE_MODELS);
  return {
    key: 'fields',
    label: 'Fields to Retrieve',
    choices: r,
    type: 'string',
    required: true,
    list: true,
    altersDynamicFields: true,
    helpText:
      'Enter a list of field names, one per row, to retrieve for the requested model.\n\nYou may include fields on related models, max 1 level deep, by using Custom text e.g. program_organization_id.name\n\nFor related fields, the name of the field before the dot will usually end with _id.',
  };
};

let handleFluxxAPIReturnErrors = module.exports.handleFluxxAPIReturnErrors = (z, response) => {
  if (response.status === 429) {
    throw new z.errors.ThrottledError('Fluxx API limit exceeded – retry after 60 seconds', 60);  // Zapier will retry in 60 seconds
  }
  
  let data = response.data;
  if (isObj(data) && data.error !== undefined) {
    let code = data.error.code;
    let msg = data.error.message;
    let c; // use later
    if (code == 100 && (c = msg.match(/uninitialized constant (.*)>$/))) {
      throw new z.errors.HaltedError(`Fluxx API: Unknown model: ${c[1]}`)
    }
    if (code == 100 && (c = msg.match(/#<Elasticsearch::Transport::Transport::Errors::BadRequest: \[400\] (.*)>/))) {
      // let d = JSON.parse(c[1]); // not sure what to do here - perhaps just show the full message
      throw `Fluxx API returned error ${code}; ${msg}`;
    }
    if (code == 100) {
      throw new z.errors.HaltedError(`Fluxx API returned error ${code}; ${JSON.parse(msg)}`)
    }
  }
}

/**
 * paginated_fetch
 * for use only in multi-record fetches, not single record, obviously.
 */
let paginated_fetch = module.exports.paginated_fetch = async (z, bundle, options, model_type, limit=0) =>
{
  const max_return = 500; // for testing. In production, set to the max that Fluxx will allow in one call.
  // set per_page = max_return
  // on the response, look for total_pages and current_page
  // if current_page == total_pages then we're done.
  let response;
  let page = 1;
  let errors = 0;
  let ret; // used for getting the array of results from each request. We will add these to the final array.
  let first_response = null;
  var snakey = modelToSnake(model_type);
  if (snakey.startsWith("mac_model")) {
    snakey = "machine_model";
  }
  let finish_now = false;
  if (limit === undefined || limit === null || limit === "") {
    limit = 0;
  }

  options.body.per_page = (limit != 0 && limit < max_return) ? limit : max_return;
  
  do {
    options.body.page = page;

    response = await z.request(options);
    response.throwForStatus();
    handleFluxxAPIReturnErrors(z, response);

    if (response.data !== undefined && response.data.records !== undefined && response.data.records[snakey] !== undefined) {
      if (first_response === null) {
        first_response = response; // we will add the subsequent results to this first fetch response as we fetch them.
      } else {
        first_response.data.records[snakey] = first_response.data.records[snakey].concat(response.data.records[snakey]);
        
      }
      page++; // we got a good reply for a page, so look for the next one.
      
      if (limit > 0) {
        if (first_response.data.records[snakey].length > limit) {
          first_response.data.records[snakey] = first_response.data.records[snakey].slice(0, limit);
          finish_now = true;
        } else if (first_response.data.records[snakey].length == limit) {
          finish_now = true;          
        }
      }
    } else {
      errors++;
      throw("error: response.data was undefined " + snakey)
    }
  } while (response.data.current_page < response.data.total_pages && errors < 2 && finish_now === false); // repeat if number of items equals that requested, OR < 2 errors.
  
  return first_response !== null ? first_response : [];
}

let getInputFieldsForModelTypes = module.exports.getInputFieldsForModelTypes = async (z, bundle, required=true, model_group_input_name='model_group', model_type_key='model_type') => {
  // Generate a list of Model Types
  // based on the "group" e.g. Basic, All.
  const r = await fetch_core_and_machine_model_list(z, bundle, bundle.inputData[model_group_input_name]);
  return {
    key: model_type_key,
    label: 'Model Type',
    choices: r,
    type: 'string',
    required: required,
    placeholder: 'Choose model…',
    altersDynamicFields: true,
  };
}
module.exports.getInputFieldsForModelTypesNotRequired = async (z, bundle) => {
  return await getInputFieldsForModelTypes(z, bundle, false);
}
module.exports.getInputFieldsForModelTypesForDedupe = async (z, bundle) => {
  return await getInputFieldsForModelTypes(z, bundle, false, 'dedupe_model_group', 'dedupe_model_type');
}

module.exports.sql_descriptions = async (z, bundle) => {
  let desc = "";
  try {
    if (bundle.inputData.in === undefined || bundle.inputData.in === null || bundle.inputData.in.trim() == "") {
      throw "blank SQL statement";
    }
    let p = parseSelectStatement(z, bundle.inputData.in);
    if (p == false) {
      throw "invalid SQL";
    }
    // p = {select: cols, from: model_type, where: filter, order_by: order_by, limit: limit};
    let parsed_cols = splitFieldListIntoColsAndRelations(p.cols);  

    desc += `- Model Type: ${modelToCamel(p.model_type)}\n`; 
    (Object.keys(parsed_cols.cols).length > 0)      && (desc += `- Cols: ${z.JSON.stringify(parsed_cols.cols)}\n`);
    (Object.keys(parsed_cols.relation).length > 0)  && (desc += `- Relation: ${z.JSON.stringify(parsed_cols.relation)}\n`);
    desc += `- Filter: ${_internal.unescapeSlashes(z.JSON.stringify(p.filter))}\n`;
    (p.order_by !== undefined) && (p.order_by !== "") && (desc += `- Order By: ${z.JSON.stringify(p.order_by).replace(',"style":"ELASTIC"', "") }\n`);
    (p.limit !== undefined)     && (desc += `- Limit: ${z.JSON.stringify(p.limit)}\n`);
    
    desc += `\nPlease check to ensure that the SQL parser has accurately represented your SQL statement. Common errors include forgetting to capitalise SELECT, FROM, WHERE, AND, OR, NOT, ORDER BY, LIMIT.`;
  } catch (e) {
    desc = z.JSON.stringify(e);
  }
  return {
    key: 'help_text',
    label: 'SQL Description',
    type: 'copy',
    helpText: desc,
  };
};

module.exports.create_fluxx_record = async (
    z,
    bundle,
    model_type,
    fields_and_update_values,
    cols
  ) => {
    const options = {
      url: `https://${bundle.authData.client_domain}/api/rest/v2/${modelToSnake(
        model_type
      )}`,
      method: 'POST',
      headers: c.STANDARD_HEADERS(bundle),
      params: {},
      body: {
        data: z.JSON.stringify(fields_and_update_values).replace("||COMMA||", ","),
        cols: z.JSON.stringify(cols),
      },
    };

    var response = await z.request(options);
    response.throwForStatus();
    handleFluxxAPIReturnErrors(z, response);
    response = response.data;
    let ordered_response = {
      model_type: modelToSnake(model_type),
      id: response[modelToSnake(model_type)].id,
      fields: response[modelToSnake(model_type)],
    };
    
    restoreNullFieldsInResponse(cols, ordered_response, "fields");
    
    return ordered_response;
  }
