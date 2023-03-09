'use_strict';
var c = require('./const');
var fn = require('./fn');

var RuleNode = module.exports.RuleNode = function(type=null, conditions=[])
{
  this.group_type = type;
  this.conditions = conditions;
}

RuleNode.prototype.lastChild = function() {
  return this.conditions[this.conditions.length -1];
}

var Stack = module.exports.Stack = function()
{
  this.stack = [];
}

// stack.top()
// returns the top item on the stack
Stack.prototype.top = function() {
  return this.stack[this.stack.length -1];
}

// stack.previous()
// returns the second-to-top item on the stack
Stack.prototype.previous = function() {
  return this.stack[this.stack.length -2];
}

// stack.currentConditions()
// returns the list of conditions at the current stack level
Stack.prototype.currentConditions = function() {
  let node = this.top();
  if (node !== undefined) {
    return node.conditions;
  }
  return false;
}

// stack.previousConditions()
// returns the list of conditions at the current stack level
Stack.prototype.previousConditions = function() {
  let node = this.previous();
  if (node !== undefined) {
    return node.conditions;
  }
  return false;
}

// Stack.lastCondition()
// returns the last condition in the list at the current stack level
Stack.prototype.lastCondition = function() {
  let node = this.top();
  if (node !== undefined) {
    return node.lastChild();
  }
}

Stack.prototype.length = function() {
  return this.stack.length;
}
Stack.prototype.push = function(obj) {
  this.stack.push(obj);
}
Stack.prototype.pop = function() {
  return this.stack.pop();
}


var clean_up_nots = module.exports.clean_up_nots = function(tokens)
{
  let i;
  for (i = 0; i < tokens.length; i++) {
    if (tokens[i] == 'NOT') {
      tokens[i] = 'NOT(';
      if (tokens[i+1] == '(') {
        tokens.splice(i+1,1); // remoove item; automatically renumbers
      } else {
        tokens.splice(i+2, 0, ")");
      }
    }
  }
  return tokens;
};

var fluxx_operators_basic = null;
var fluxx_operators_detailed = null;
var fluxx_operators_detailed_o = null;

var fluxx_operators_detailed_regex = module.exports.fluxx_operators_detailed_regex = function() {
  if (fluxx_operators_detailed === null) {
    let operator_regex_string = fluxx_operator_regex(true) // true to capture individual operators
    fluxx_operators_detailed = new RegExp("^\\s*([_a-z0-9]+)\\s*(?:" +operator_regex_string+")\\s*(.*)"); // non capturing group surrounds the set of options
  }
  return fluxx_operators_detailed;
};
module.exports.fluxx_operators_basic_regex = function() {
  if (fluxx_operators_basic === null) {
    let operator_regex_string = fluxx_operator_regex(false);
    let re_string = `((?:[a-z0-9_]+)\\s*(?:${operator_regex_string}))|(AND|OR|NOT)|([()])`;
    fluxx_operators_basic = new RegExp(re_string,"g");
  }
  return fluxx_operators_basic;
};

var deepCopy = module.exports.deepCopy = function(o)
{
  return JSON.parse(JSON.stringify(o));
};

var fluxx_operator_regex = module.exports.fluxx_operator_regex = function(detailed_parse=false)
{
  let operators = deepCopy(c.FLUXX_OPERATORS);
  let i=0, count=2, operator_regex = "", op = null, operand_regex = "";
  // For operators like =, they are followed by something in single or double quotes,
  // or a number with optional "-" and ".", or a word in standard ASCII upper & lower case e.g. NULL. 

  //the last part of the operand_regex is to capture NULL etc without quotes
  let raw_operand_regex = String.raw`(?:"[^"]*")|(?:'[^']*')|(?:[-\d.]+)|(?:[a-zA-Z]+)`;

  for (; i < operators.length; i++) {
    op = operators[i];
    op.index = count;
    count = count + (op.use_second_capture === true ? 2 : 1);

    if (detailed_parse) {
      operand_regex = (op.needs_operand === true) ? `\\s*(${raw_operand_regex})`: "";
    } else {
      operand_regex = (op.needs_operand === true) ? `\\s*(?:${raw_operand_regex})`: "";
    }
    if (i > 0) {
      operator_regex = operator_regex + "|";
    }
    // capture individual operands ONLY when parsing into final objects
    operator_regex = operator_regex + (detailed_parse ? `(${op.op})` : `(?:${op.op}${operand_regex})`);
  }
  if (detailed_parse) {
    fluxx_operators_detailed_o = operators; // we want to refer to this later
  }
  return operator_regex;
};

// FIXME - this may not work????
// There are ways to achieve it though.
// I'll need to look at exactly how the current NE thing is structured, and how to transform this
// into a working format.
// At present, it is:
// filter[model_name][field_name]=value1&filter[model_name][field_name]=value2 etc, where if a
// second field_name is used, Fluxx does an implicit AND, whereas different values for the same
// field_name are ORed.
// What we need instead is to split up the different FIELDS, and do a single & for each one...
// and for each field_name, the possible values are presented as an array.
// e.g. filter[model_name][field_name1]=[foo, bar, wombat]&filter[model_name][field_name2]="1,2,3"


var convertToNonElasticFilter = module.exports.convertToNonElasticFilter = function(input_filter, model_type)
{
  let model_type_snake = fn.modelToSnake(model_type);
  /*
    This returns a fully formed filter suitable for use for Elastic-enabled models.
    The question is how to convert or what to accept for non-elastic models, that need
    to end up in the form:

    filter["grant_request"]["name1"] = ["value1","value2","value3"]; // these 3 are ORed together
      // implicit AND in here between the 2 groups of ORs.
    filter["grant_request"]["name2"][] = ["value1","value2","value3"]; // these 3 are ORed together

    // ALL operators must be "=".

    Easy option:
  (a = 1 OR a = 2 OR a = 3) AND (b = 4 OR b = 5 OR b = 6)
  ... check to see that there is a top-level AND, that contains 2 or more ORs, 
  and each OR in the group has the same field name.

    Option 2:
  a = 1
  ... single AND node with 1 item in it

    Option 3:
  a = 1 OR a = 2 OR a = 3
  ... single OR node with multiple items all with the same field name

  a = 1 AND b = 2 AND c = 3
  ... single AND node with multiple items, all with different field names
  */

  // Check to see if we have one of the four allowed constructions.
  // If we come across any errors, we throw.

  let f = input_filter.data;
  let field_type;
  let field_hash = {};
  let filter = {};
  let inner_conditions;
  let inner_condition;
  filter[model_type_snake]={};

  // there is only one way we accept an OR node, and that is if all items in it are value arrays,
  // and they all have the same field name. OPTION 2.
  if (f.group_type == "OR") {
    if (f.conditions.length == 0) {
      return filter; // nothing to see here
    }
    checkOrNode(f, model_type); // throw if OR node contains bad data.
  
    // now convert this to a non-elastic filter style.
    // f.conditions is an array of conditions []
    // f.conditions[0] would be [field, operator, conparator]
    // The only acceptable OR conditions are those where the field is the same
    // for all siblings on this level. So, we can use the field name of the first item for all.
    filter[model_type_snake][f.conditions[0][0]] = []; // prime with an array for that field  FINE
    f.conditions.forEach(cond => {
      filter[model_type_snake][cond[0]].push(cond[2]); // push the value - FINE.
    });
    return filter;
  }

  // The top level is an AND. We have some options:
  // - just 1 item in it, and that's a condition
  // - more than 1 item, they are all conditions (not nodes) and all different fields.
  // - all items in it are OR nodes, and each OR node contains the same field and "="
  if (f.group_type == "AND") {
    if (f.conditions.length == 1) {
      if (Array.isArray(f.conditions[0])) {
        if (f.conditions[0][1] == 'eq') {
          filter[model_type_snake][f.conditions[0][0]] = f.conditions[0][2];
          return filter;
        }
        else throw `Non-Elastic model_type ${model_type}; you can only use the "=" operator`;
      }
      else throw `Non-Elastic model_type ${model_type}; too many brackets`;
    }
  
    // top level AND with multiple items.
  
    checkAndNode(f, model_type);

    // Good to go with set of ANDs at 1 level with possibility of ORs inside
    f.conditions.forEach(cond => {
      if (Array.isArray(cond)) {
        if (filter[model_type_snake][cond[0]] === undefined) {
          filter[model_type_snake][cond[0]] = [];
        }
        filter[model_type_snake][cond[0]].push(cond[2]);
      } else {
        inner_conditions = cond.conditions;
        if (inner_conditions.length > 0) {
          filter[model_type_snake][inner_conditions[0][0]] = [];
          inner_conditions.forEach(inner_condition => {
            filter[model_type_snake][inner_condition[0]].push(inner_condition[2]);
          });
        }
      }
    });
    return filter;
  }
  throw `Non-Elastic model_type ${model_type}; you cannot use ${f.group_type}`;
};

// For non-elastic searches, an OR node:
// 1. must contain only values, not more nodes
// 2. all operators must be "="
// 3. all fields must be the same
// Simply throws an exception if invalid.
var checkOrNode = module.exports.checkOrNode = function (node, model_type)
{
  let field_type = null;
  node.conditions.forEach(cond => {
    if (!(Array.isArray(cond))) {
      throw `Non-Elastic model_type ${model_type}; you cannot use brackets in an OR group`;
    }
    if (field_type == null) {
      field_type = cond[0];
    } else if (cond[0] != field_type) {
      throw `Non-Elastic model_type ${model_type}; you cannot mix field names in an OR group`;
    }
    if (cond[1] != 'eq') {
      throw `Non-Elastic model_type ${model_type}; you can only use the "=" operator`;
    }
  });
};

// For non-elastic searches, an AND node:
// 1. all field names must be different.
// 2. all operators must be "="
// 3. child OR nodes (with no further nesting) are allowed. These are checked.
// Throws an exception if invalid.
var checkAndNode = module.exports.checkAndNode = function(node, model_type)
{
  let field_hash = {};
  node.conditions.forEach(cond => {
    if (Array.isArray(cond)) { // not a node
      // they all have to have different field names
      if (field_hash[cond[0]] !== undefined) {
        throw `Non-Elastic model_type ${model_type}; all ANDs must be for different field names`;
      }
      if (cond[1] != 'eq') {
        throw `Non-Elastic model_type ${model_type}; you can only use the "=" operator`;
      }
      field_hash[cond[0]] = true;
    } else if (cond.group_type == 'OR' || (cond.group_type == 'AND' && cond.conditions.length < 2)) {
      checkOrNode(cond, model_type); // not allowed further children; but check those items
    } else {
      throw `Non-Elastic model_type ${model_type}; you cannot nest AND conditions`;
    }
  });
};

// Pass this function a string, non-delimited.
// It will return that string with any escaped characters resolved.
// e.g. the two characters \n will convert to a real newline character.
// \" will be a double quote. \' a single quote.
var unescapeSlashes = module.exports.unescapeSlashes = function(str) {
  if (str === undefined) str = "";
  // add another escaped slash if the string ends with an odd
  // number of escaped slashes which will crash JSON.parse
  let parsedStr = str.replace(/(^|[^\\])(\\\\)*\\$/, "$&\\");

  // escape unescaped double quotes to prevent error with
  // added double quotes in json string
  parsedStr = parsedStr.replace(/(^|[^\\])((\\\\)*")/g, "$1\\$2");

  try {
    parsedStr = JSON.parse(`"${parsedStr}"`);
  } catch(e) {
    return str;
  }
  return parsedStr ;
};

// Pass this function a comparison token such as the text string:  field_name != "test"
// or: field_name IS NOT NULL
// or: field_name IS IN NEXT 5 YEARS
// It returns a three-element array with:
// [ "field_name", "fluxx operator", "operand, if any"]
// Fluxx operators are things like "eq", "lt", "next-n-years" as in the FLUXX_OPERATORS table
// Operands are smart: numbers are presented without quotes, strings have quotes, and true, false
// and null/nil are presented without quotes.

var parseTextToken = module.exports.parseTextToken = function(token)
{
  let is_delimited, mm, operand, i, operator, secondary, comparator, no_elastic;
  let re = fluxx_operators_detailed_regex();
  
  mm = token.match(re);
  if (mm !== null) {
    operand = mm[1];
    for (i = 2; i < mm.length; i++) {
      if (mm[i] !== undefined){
        operator = fluxx_operators_detailed_o.find(el => el.index == i); // the object from table above
        secondary = mm[i+1]; // e.g. ranges, last "n" days, etc, where there is a number inside the operator
        operator = operator.fluxx_op; // just the operator required in the statement e.g. eq
        comparator = mm.pop(); // last element of array; removes it from array.

        switch (true) {
          case (comparator === null || comparator === "" || comparator === undefined):
            comparator = "";
            break;
          case (comparator.toLowerCase() == "false"):
            comparator = false;
            break;
          case (comparator.toLowerCase() == "true"):
            comparator = true;
            break;
          case (comparator.toLowerCase() == "null"):
          case (comparator.toLowerCase() == "nil"):
            comparator = null;
            break;
          case (!isNaN(Number(comparator))):
            comparator = Number(comparator);
            break;
          default:
            is_delimited = comparator.match(/^ *(['"])(.*)\1 *$/);
            if (is_delimited) {
              comparator = unescapeSlashes(is_delimited[2]); // send unescapeSlashes the unquoted version
            }
        }
        break;
      }
    }
  
    filter = [operand,operator];
    if (secondary !== undefined) {
      filter.push(secondary);
    } else {
      filter.push(comparator);
    }
      
    return filter;
  }
};

