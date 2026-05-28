export const DEFAULT_SETTINGS = {
  lookbackDays:        35,
  autoRefreshOnOpen:   false,
  warnDays:            7,
  alertDays:           14,
  warnColor:           "#e67e22",
  alertColor:          "#c0392b",
  searchQuery:         'subject:("thank you for applying" OR "application received" OR "your application" OR "application was sent" OR "thank you for your interest" OR "next steps" OR interview OR "regret to inform" OR "not moving forward" OR "your candidacy" OR "offer of employment" OR "your offer") OR from:(greenhouse OR lever OR workday OR ashby OR rippling OR bamboohr OR icims OR smartrecruiters OR applyresponse OR candidatecare OR saashr OR silkroad)',
  ignoredIds:          [],
  sources:             ["LinkedIn", "Indeed", "Direct", "Other"],
  defaultStatusFilter: "All",
};
