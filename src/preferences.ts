import { getPreferenceValues } from "@raycast/api";

export type Preferences = {
  apiToken: string;
  orgId: string;
  simplifyJiraLinks: boolean;
  visibleTimeSpanDays: string;
};
export const preferences = getPreferenceValues<Preferences>();
