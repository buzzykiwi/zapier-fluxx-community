'use_strict';

module.exports.NO_ELASTIC =
[
  "Alert",
  "AlertModelLog",
  "AlertRecipient",
  "AlertTransitionState",
  "CardConfiguration",
  "CensusConfig",
  "ClientConfiguration",
  "ClientStore",
  "CommitTicket",
  "ComplianceChecklistItem",
  "ConfigModelDocument",
  "DashboardGroup",
  "DashboardTemplate",
  "DashboardTheme",
  "Document",
  "EmailUser",
  "ExtractFormat",
  "Favorite",
  "FieldList",
  "Form",
  "FormElement",
  "Fund",
  "FundDocket",
  "FundingSourceAllocationAuthority",
  "FundingSourceForecast",
  "FundLineItem",
  "FxConversion",
  "GenericTemplate",
  "GeoCity",
  "GeoCountry",
  "GeoCounty",
  "GeoPlace",
  "GeoPlaceRelationship",
  "GeoRegion",
  "GeoState",
  "GithubCommit",
  "GranteeBudget",
  "GroupMember",
  "IntegrationFilter",
  "Job",
  "Language",
  "MachineCategory",
  "MachineEvent",
  "MachineEventFromState",
  "MachineEventRole",
  "MachineModelType",
  "MachineState",
  "MachineStateCategory",
  "MachineStateGroup",
  "MachineWorkflow",
  "MachineWorkflowFork",
  "Mention",
  "MigrateRow",
  "Migration",
  "MigrationConfig",
  "MigrationConfigColumn",
  "MigrationConfigModel",
  "MigrationConfigModelLink",
  "MigrationFile",
  "ModelAttribute",
  "ModelAttributeChoice",
  "ModelAttributeValue",
  "ModelCloneConfiguration",
  "ModelDocumentMaster",
  "ModelDocumentSign",
  "ModelDocumentSignEnvelope",
  "ModelDocumentTemplate",
  "ModelMethod",
  "ModelTheme",
  "ModelValidation",
  "ModelValidationField",
  "MultiElementValue",
  "OfacPerson",
  "PeriodicSync",
  "PermissionDelegator",
  "Persona",
  "PopulationEstimate",
  "PopulationEstimateYear",
  "PostRelationship",
  "ProgramBudget",
  "ProjectList",
  "ProjectListItem",
  "ProjectOrganization",
  "ProjectRequest",
  "ProjectUser",
  "RealMeInvitation",
  "RealtimeUpdate",
  "Request",
  "RequestEvaluationMetric",
  "RequestFundingSource",
  "RequestGeoState",
  "RequestOutcome",
  "RequestProgram",
  "RequestReviewerAssignment",
  "RequestTransactionFundingSource",
  "Role",
  "RoleUser",
  "Segment",
  "SegmentTag",
  "SharedCard",
  "SpendingForecast",
  "Stencil",
  "StencilBook",
  "StencilBookPage",
  "StencilForm",
  "TableView",
  "Tagging",
  "TransactionReportDependency",
  "TranslatorLanguage",
  "UserProfile",
  "UserProfileRule",
  "UserSegmentTag",
  "WikiDocument",
  "WikiDocumentTemplate"
];

module.exports.FLUXX_OPERATORS = 
[
	{op:"={1,2}", fluxx_op:"eq", needs_operand:true},
	{op:"eq", fluxx_op:"eq", needs_operand:true},
	{op:"EQ", fluxx_op:"eq", needs_operand:true},
	{op:"!=", fluxx_op:"not-eq", needs_operand:true},
	{op:"<>", fluxx_op:"not-eq", needs_operand:true},
	{op:"neq", fluxx_op:"not-eq", needs_operand:true},
	{op:"NEQ", fluxx_op:"not-eq", needs_operand:true},
	{op:"not-eq", fluxx_op:"not-eq", needs_operand:true},
	{op:"NOT[-\\s]*EQ", fluxx_op:"not-eq", needs_operand:true},
	{op:"<", fluxx_op:"lt", needs_operand:true},
	{op:"lt", fluxx_op:"lt", needs_operand:true},
	{op:"LT", fluxx_op:"lt", needs_operand:true},
	{op:">", fluxx_op:"gt", needs_operand:true},
	{op:"gte", fluxx_op:"gte", needs_operand:true},
	{op:"GTE", fluxx_op:"gte", needs_operand:true},
	{op:"<=", fluxx_op:"lte", needs_operand:true},
	{op:"lte", fluxx_op:"lte", needs_operand:true},
	{op:"LTE", fluxx_op:"lte", needs_operand:true},
	{op:"STARTS[-\\s]*WITH", fluxx_op:"starts_with", needs_operand:true},
	{op:"NOT[-\\s]*STARTS[-\\s]*WITH", fluxx_op:"not-starts_with", needs_operand:true},
	{op:"CONTAINS", fluxx_op:"contains", needs_operand:true},
	{op:"NOT[-\\s]*CONTAINS", fluxx_op:"contains", needs_operand:true},
	{op:"LIKE", fluxx_op:"like", needs_operand:true},
	{op:"NOT[-\\s]*LIKE", fluxx_op:"not-like", needs_operand:true},

	{op:"IS\\s+NULL", fluxx_op:"null", single:true},
	{op:"IS\\s+NOT\\s+NULL", fluxx_op:"not-null", single:true},
	{op:"IS\\s+IN\\s+RANGE\\s+(-?[.\\d]+ *- *-?[.\\d]+)", fluxx_op:"range", use_second_capture:true},
	{op:"IS\\s+IN\\s+YEAR\\s+RANGE\\s+(\\d+(?:\\s*-\\s*\\d+)?)", fluxx_op:"range-year-cal", use_second_capture:true},
	{op:"IS\\s+IN\\s+FISCAL\\s+YEAR\\s+RANGE\\s+(\\d+(?:\\s*-\\s*\\d+)?)", fluxx_op:"range-year-fiscal", use_second_capture:true},
	{op:"IS\\s+YESTERDAY", fluxx_op:"yesterday", single:true},
	{op:"IS\\s+TODAY", fluxx_op:"today", single:true},
	{op:"IS\\s+TOMORROW", fluxx_op:"tomorrow", single:true},

	{op:"IS\\s+IN\\s+LAST\\s+(-?\\d+)\\s+DAYS", fluxx_op:"last-n-days", use_second_capture:true},
	{op:"IS\\s+IN\\s+NEXT\\s+(-?\\d+)\\s+DAYS", fluxx_op:"next-n-days", use_second_capture:true},
	{op:"IS\\s+(-?\\d+)\\s+DAYS\\s+AGO", fluxx_op:"days-n-ago", use_second_capture:true},
	{op:"IS\\s+LAST\\s+WEEK", fluxx_op:"last-week", single:true},
	{op:"IS\\s+THIS\\s+WEEK", fluxx_op:"this-week", single:true},
	{op:"IS\\s+NEXT\\s+WEEK", fluxx_op:"next-week", single:true},
	{op:"IS\\s+IN\\s+LAST\\s+(-?\\d+)\\s+WEEKS", fluxx_op:"last-n-weeks", use_second_capture:true},
	{op:"IS\\s+IN\\s+NEXT\\s+(-?\\d+)\\s+WEEKS", fluxx_op:"next-n-weeks", use_second_capture:true},
	{op:"IS\\s+(-?\\d+)\\s+WEEKS\\s+AGO", fluxx_op:"weeks-n-ago", use_second_capture:true},
	{op:"IS\\s+LAST\\s+MONTH", fluxx_op:"last-month", single:true},
	{op:"IS\\s+THIS\\s+MONTH", fluxx_op:"this-month", single:true},
	{op:"IS\\s+NEXT\\s+MONTH", fluxx_op:"next-month", single:true},
	{op:"IS\\s+IN\\s+LAST\\s+(-?\\d+)\\s+MONTHS", fluxx_op:"last-n-months", use_second_capture:true},
	{op:"IS\\s+IN\\s+NEXT\\s+(-?\\d+)\\s+MONTHS", fluxx_op:"next-n-months", use_second_capture:true},
	{op:"IS\\s+(-?\\d+)\\s+MONTHS\\s+AGO", fluxx_op:"months-n-ago", use_second_capture:true},
	{op:"IS\\s+LAST\\s+QUARTER", fluxx_op:"last-quarter", single:true},
	{op:"IS\\s+THIS\\s+QUARTER", fluxx_op:"this-quarter", single:true},
	{op:"IS\\s+NEXT\\s+QUARTER", fluxx_op:"next-quarter", single:true},
	{op:"IS\\s+IN\\s+LAST\\s+(-?\\d+)\\s+QUARTERS", fluxx_op:"last-n-quarters", use_second_capture:true},
	{op:"IS\\s+IN\\s+NEXT\\s+(-?\\d+)\\s+QUARTERS", fluxx_op:"next-n-quarters", use_second_capture:true},
	{op:"IS\\s+(-?\\d+)\\s+QUARTERS\\s+AGO", fluxx_op:"quarters-n-ago", use_second_capture:true},
	{op:"IS\\s+LAST\\s+FISCAL\\s+QUARTER", fluxx_op:"last-fiscal-quarter", single:true},
	{op:"IS\\s+THIS\\s+FISCAL\\s+QUARTER", fluxx_op:"this-fiscal-quarter", single:true},
	{op:"IS\\s+NEXT\\s+FISCAL\\s+QUARTER", fluxx_op:"next-fiscal-quarter", single:true},
	{op:"IS\\s+IN\\s+LAST\\s+(-?\\d+)\\s+FISCAL QUARTERS", fluxx_op:"last-n-fiscal-quarters", use_second_capture:true},
	{op:"IS\\s+IN\\s+NEXT\\s+(-?\\d+)\\s+FISCAL\\s+QUARTERS", fluxx_op:"next-n-fiscal-quarters", use_second_capture:true},
	{op:"IS\\s+(-?\\d+)\\s+FISCAL\\s+QUARTERS\\s+AGO", fluxx_op:"fiscal-n-quarters-ago", use_second_capture:true},
	{op:"IS\\s+LAST\\s+YEAR", fluxx_op:"last-year", single:true},
	{op:"IS\\s+THIS\\s+YEAR", fluxx_op:"this-year", single:true},
	{op:"IS\\s+NEXT\\s+YEAR", fluxx_op:"next-year", single:true},
	{op:"IS\\s+IN\\s+LAST\\s+(-?\\d+)\\s+YEARS", fluxx_op:"last-n-years", use_second_capture:true},
	{op:"IS\\s+IN\\s+NEXT\\s+(-?\\d+)\\s+YEARS", fluxx_op:"next-n-years", use_second_capture:true},
	{op:"IS\\s+(-?\\d+)\\s+YEARS\\s+AGO", fluxx_op:"years-n-ago", use_second_capture:true},
	{op:"IS\\s+LAST\\s+FISCAL\\s+YEAR", fluxx_op:"last-fiscal", single:true},
	{op:"IS\\s+THIS\\s+FISCAL\\s+YEAR", fluxx_op:"this-fiscal", single:true},
	{op:"IS\\s+NEXT\\s+FISCAL\\s+YEAR", fluxx_op:"next-fiscal-year", single:true},
	{op:"IS\\s+IN\\s+LAST\\s+(-?\\d+)\\s+FISCAL\\s+YEARS", fluxx_op:"last-n-fiscal-years", use_second_capture:true},
	{op:"IS\\s+IN\\s+NEXT\\s+(-?\\d+)\\s+FISCAL\\s+YEARS", fluxx_op:"next-n-fiscal-years", use_second_capture:true},
	{op:"IS\\s+(-?\\d+)\\s+FISCAL\\s+YEARS\\s+AGO", fluxx_op:"fiscal-n-years-ago", use_second_capture:true},
	{op:"CROSSCARD\\s*\\(", fluxx_op:"filter", single:true},


  // there may be some more to explore, such as:
  // gt-relative-date -- looks for items with date after "today + n days"
  // lt-relative-date -- looks for items with date before "today + n days"
  // gt-field
  // gte-field
  // eq-field (tried, failed)
];

module.exports.STANDARD_HEADERS = function(bundle)
{
  return {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
    Authorization: `Bearer ${bundle.authData.access_token}`,
  };
};

