import { AppEvent } from './event';

/** Root stack param list — keeps navigation.navigate calls type-safe. */
export type RootStackParamList = {
  Welcome:     undefined;
  SignIn:      undefined;
  SignUp:      undefined;
  Onboarding:  undefined;
  Main:        undefined;
  CreateEvent: { event?: AppEvent } | undefined;
  EventDetail: { event: AppEvent };
  EventAlarms: undefined;
  Profile:     undefined;
  Search:      undefined;
  Stats:       undefined;
};
