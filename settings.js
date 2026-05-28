export const DEFAULT_SETTINGS = {
  lookbackDays:        35,
  autoRefreshOnOpen:   false,
  warnDays:            7,
  alertDays:           14,
  warnColor:           "#e67e22",
  alertColor:          "#c0392b",
  searchQuery:         '"thank you for applying" OR "application received" OR "your application" OR "we received your application" OR interview OR "next steps" OR recruiter OR "regret to inform" OR "not moving forward" OR "move forward" OR offer OR greenhouse OR lever OR workday OR myworkday OR ashby OR rippling OR bamboohr OR icims OR smartrecruiters',
  ignoredIds:          [],
  sources:             ["LinkedIn", "Indeed", "Direct", "Other"],
  defaultStatusFilter: "All",
};
