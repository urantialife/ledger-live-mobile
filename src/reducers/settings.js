// @flow
/* eslint import/no-cycle: 0 */
import { handleActions } from "redux-actions";
import { Platform } from "react-native";
import merge from "lodash/merge";
import {
  findCurrencyByTicker,
  getCryptoCurrencyById,
  getFiatCurrencyByTicker,
} from "@ledgerhq/live-common/lib/currencies";
import { createSelector } from "reselect";
import type {
  CryptoCurrency,
  Currency,
  Account,
} from "@ledgerhq/live-common/lib/types";
import Config from "react-native-config";
import type { State } from ".";
import { currencySettingsDefaults } from "../helpers/CurrencySettingsDefaults";

export const intermediaryCurrency = getCryptoCurrencyById("bitcoin");

export type CurrencySettings = {
  confirmationsNb: number,
  exchange: ?*,
};

export const timeRangeDaysByKey = {
  week: 7,
  month: 30,
  year: 365,
};

export type TimeRange = $Keys<typeof timeRangeDaysByKey>;

export type Privacy = {
  // when we set the privacy, we also retrieve the biometricsType info
  biometricsType: ?string,
  // this tells if the biometrics was enabled by user yet
  biometricsEnabled: boolean,
};

export type SettingsState = {
  counterValue: string,
  counterValueExchange: ?string,
  reportErrorsEnabled: boolean,
  analyticsEnabled: boolean,
  privacy: ?Privacy,
  currenciesSettings: {
    [ticker: string]: CurrencySettings,
  },
  selectedTimeRange: TimeRange,
  orderAccounts: string,
  hasCompletedOnboarding: boolean,
  hasAcceptedTradingWarning: boolean,
  hasInstalledAnyApp: boolean,
  readOnlyModeEnabled: boolean,
  experimentalUSBEnabled: boolean,
  countervalueFirst: boolean,
};

const INITIAL_STATE: SettingsState = {
  counterValue: "USD",
  counterValueExchange: null,
  privacy: null,
  reportErrorsEnabled: true,
  analyticsEnabled: true,
  currenciesSettings: {},
  selectedTimeRange: "month",
  orderAccounts: "balance|desc",
  hasCompletedOnboarding: false,
  hasAcceptedTradingWarning: false,
  hasInstalledAnyApp: false,
  readOnlyModeEnabled: !Config.DISABLE_READ_ONLY,
  experimentalUSBEnabled: false,
  countervalueFirst: false,
};

function asCryptoCurrency(c: Currency): ?CryptoCurrency {
  // $FlowFixMe
  return "coinType" in c ? c : null;
}

const handlers: Object = {
  SETTINGS_IMPORT: (state: SettingsState, { settings }) => ({
    ...state,
    ...settings,
  }),
  SETTINGS_IMPORT_DESKTOP: (state: SettingsState, { settings }) => ({
    ...state,
    ...settings,
    currenciesSettings: merge(
      state.currenciesSettings,
      settings.currenciesSettings,
    ),
  }),
  UPDATE_CURRENCY_SETTINGS: (
    { currenciesSettings, ...state }: SettingsState,
    { ticker, patch },
  ) => ({
    ...state,
    currenciesSettings: {
      ...currenciesSettings,
      [ticker]: { ...currenciesSettings[ticker], ...patch },
    },
  }),
  SETTINGS_SET_PRIVACY: (state: SettingsState, { privacy }) => ({
    ...state,
    privacy,
  }),

  SETTINGS_SET_PRIVACY_BIOMETRICS: (state: SettingsState, { enabled }) => ({
    ...state,
    privacy: {
      ...state.privacy,
      biometricsEnabled: enabled,
    },
  }),

  SETTINGS_DISABLE_PRIVACY: (state: SettingsState) => ({
    ...state,
    privacy: null,
  }),

  SETTINGS_SET_REPORT_ERRORS: (
    state: SettingsState,
    { reportErrorsEnabled },
  ) => ({
    ...state,
    reportErrorsEnabled,
  }),

  SETTINGS_SET_ANALYTICS: (state: SettingsState, { analyticsEnabled }) => ({
    ...state,
    analyticsEnabled,
  }),

  SETTINGS_SET_COUNTERVALUE: (state: SettingsState, { counterValue }) => ({
    ...state,
    counterValue,
    counterValueExchange: null, // also reset the exchange
  }),

  SETTINGS_SET_ORDER_ACCOUNTS: (state: SettingsState, { orderAccounts }) => ({
    ...state,
    orderAccounts,
  }),

  SETTINGS_SET_PAIRS: (
    state: SettingsState,
    {
      pairs,
    }: {
      pairs: Array<{
        from: Currency,
        to: Currency,
        exchange: *,
      }>,
    },
  ) => {
    const counterValueCurrency = counterValueCurrencyLocalSelector(state);
    const copy = { ...state };
    copy.currenciesSettings = { ...copy.currenciesSettings };
    for (const { to, from, exchange } of pairs) {
      const fromCrypto = asCryptoCurrency(from);
      if (fromCrypto && to.ticker === intermediaryCurrency.ticker) {
        copy.currenciesSettings[fromCrypto.ticker] = {
          ...copy.currenciesSettings[fromCrypto.ticker],
          exchange,
        };
      } else if (
        from.ticker === intermediaryCurrency.ticker &&
        to.ticker === counterValueCurrency.ticker
      ) {
        copy.counterValueExchange = exchange;
      }
    }
    return copy;
  },

  SETTINGS_SET_SELECTED_TIME_RANGE: (
    state,
    { payload: selectedTimeRange },
  ) => ({
    ...state,
    selectedTimeRange,
  }),

  SETTINGS_COMPLETE_ONBOARDING: state => ({
    ...state,
    hasCompletedOnboarding: true,
  }),

  SETTINGS_ACCEPT_TRADING_WARNING: state => ({
    ...state,
    hasAcceptedTradingWarning: true,
  }),

  SETTINGS_INSTALL_APP_FIRST_TIME: state => ({
    ...state,
    hasInstalledAnyApp: true,
  }),

  SETTINGS_SET_READONLY_MODE: (state, action) => ({
    ...state,
    readOnlyModeEnabled: action.enabled,
  }),

  SETTINGS_SET_EXPERIMENTAL_USB_SUPPORT: (state, action) => ({
    ...state,
    experimentalUSBEnabled: action.enabled,
  }),

  SETTINGS_SWITCH_COUNTERVALUE_FIRST: state => ({
    ...state,
    countervalueFirst: !state.countervalueFirst,
  }),
};

const storeSelector = (state: *): SettingsState => state.settings;

export const exportSelector = storeSelector;

const counterValueCurrencyLocalSelector = (state: SettingsState): Currency =>
  findCurrencyByTicker(state.counterValue) || getFiatCurrencyByTicker("USD");

// $FlowFixMe
export const counterValueCurrencySelector = createSelector(
  storeSelector,
  counterValueCurrencyLocalSelector,
);

const counterValueExchangeLocalSelector = (s: SettingsState) =>
  s.counterValueExchange;

// $FlowFixMe
export const counterValueExchangeSelector = createSelector(
  storeSelector,
  counterValueExchangeLocalSelector,
);

const defaultCurrencySettingsForCurrency: CryptoCurrency => CurrencySettings = crypto => {
  const defaults = currencySettingsDefaults(crypto);
  return {
    confirmationsNb: defaults.confirmationsNb
      ? defaults.confirmationsNb.def
      : 0,
    exchange: null,
  };
};

// DEPRECATED
export const currencySettingsSelector = (
  state: State,
  { currency }: { currency: CryptoCurrency },
) => ({
  exchange: null,
  ...defaultCurrencySettingsForCurrency(currency),
  ...state.settings.currenciesSettings[currency.ticker],
});

export const exchangeSettingsForTickerSelector = (
  state: State,
  { ticker }: { ticker: string },
): ?string => {
  const obj = state.settings.currenciesSettings[ticker];
  return obj && obj.exchange;
};

// $FlowFixMe
export const privacySelector = createSelector(
  storeSelector,
  s => s.privacy,
);

// $FlowFixMe
export const reportErrorsEnabledSelector = createSelector(
  storeSelector,
  s => s.reportErrorsEnabled,
);

// $FlowFixMe
export const analyticsEnabledSelector = createSelector(
  storeSelector,
  s => s.analyticsEnabled,
);

// $FlowFixMe
export const experimentalUSBEnabledSelector = createSelector(
  storeSelector,
  s => s.experimentalUSBEnabled,
);

export const currencySettingsForAccountSelector = (
  s: *,
  { account }: { account: Account },
) => currencySettingsSelector(s, { currency: account.currency });

// $FlowFixMe
export const exchangeSettingsForAccountSelector = createSelector(
  currencySettingsForAccountSelector,
  settings => settings.exchange,
);

export const selectedTimeRangeSelector = (state: State) =>
  state.settings.selectedTimeRange;

export const orderAccountsSelector = (state: State) =>
  state.settings.orderAccounts;

export const hasCompletedOnboardingSelector = (state: State) =>
  state.settings.hasCompletedOnboarding;

export const hasAcceptedTradingWarningSelector = (state: State) =>
  state.settings.hasAcceptedTradingWarning;

export const hasInstalledAnyAppSelector = (state: State) =>
  state.settings.hasInstalledAnyApp;

export const countervalueFirstSelector = (state: State) =>
  state.settings.countervalueFirst;

export const readOnlyModeEnabledSelector = (state: State) =>
  Platform.OS !== "android" && state.settings.readOnlyModeEnabled;

export default handleActions(handlers, INITIAL_STATE);
