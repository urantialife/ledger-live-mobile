// @flow

import React, { PureComponent, Fragment } from "react";
import { compose } from "redux";
import { connect } from "react-redux";
import { View, StyleSheet, Platform } from "react-native";
import { Trans } from "react-i18next";
import type {
  Portfolio,
  Currency,
  Unit,
} from "@ledgerhq/live-common/lib/types";
import { getCurrencyColor } from "@ledgerhq/live-common/lib/currencies/color";
import colors from "../colors";
import { setSelectedTimeRange } from "../actions/settings";
import getWindowDimensions from "../logic/getWindowDimensions";
import Delta from "./Delta";
import FormatDate from "./FormatDate";
import type { Item } from "./Graph/types";
import Graph from "./Graph";
import Pills from "./Pills";
import Card from "./Card";
import LText from "./LText";
import CurrencyUnitValue from "./CurrencyUnitValue";
import Placeholder from "./Placeholder";

const mapDispatchToProps = {
  setSelectedTimeRange,
};

type Props = {
  portfolio: Portfolio,
  setSelectedTimeRange: string => void,
  counterValueCurrency: Currency,
  useCounterValue?: boolean,
  renderTitle?: ({ counterValueUnit: Unit, item: Item }) => React$Node,
};

type State = {
  hoveredItem: ?Item,
};

class GraphCard extends PureComponent<Props, State> {
  state = {
    hoveredItem: null,
  };

  timeRangeItems = [
    { key: "week", label: <Trans i18nKey="common:time.week" /> },
    { key: "month", label: <Trans i18nKey="common:time.month" /> },
    { key: "year", label: <Trans i18nKey="common:time.year" /> },
  ];

  onTimeRangeChange = item => this.props.setSelectedTimeRange(item.key);

  onItemHover = hoveredItem => this.setState({ hoveredItem });

  mapGraphValue = d => d.value.toNumber();

  render() {
    const { portfolio, renderTitle, counterValueCurrency } = this.props;

    const { hoveredItem } = this.state;

    const range = portfolio.range;
    const isAvailable = portfolio.balanceAvailable;
    const accounts = portfolio.accounts;
    const balanceHistory = portfolio.balanceHistory;
    const start = portfolio.balanceHistory[0];
    const end = portfolio.balanceHistory[portfolio.balanceHistory.length - 1];

    const graphColor =
      accounts.length === 1
        ? getCurrencyColor(
            accounts[0].type === "Account"
              ? accounts[0].currency
              : accounts[0].token,
          )
        : undefined;

    return (
      <Card style={styles.root}>
        <GraphCardHeader
          isLoading={!isAvailable}
          from={start}
          to={end}
          hoveredItem={hoveredItem}
          unit={counterValueCurrency.units[0]}
          renderTitle={renderTitle}
        />
        <Graph
          isInteractive={isAvailable}
          isLoading={!isAvailable}
          height={100}
          width={getWindowDimensions().width - 32}
          color={isAvailable ? graphColor : colors.grey}
          data={balanceHistory}
          onItemHover={this.onItemHover}
          mapValue={this.mapGraphValue}
        />
        <View style={styles.pillsContainer}>
          <Pills
            isDisabled={!isAvailable}
            value={range}
            onChange={this.onTimeRangeChange}
            items={this.timeRangeItems}
          />
        </View>
      </Card>
    );
  }
}

class GraphCardHeader extends PureComponent<{
  isLoading: boolean,
  from: Item,
  to: Item,
  unit: Unit,
  hoveredItem: ?Item,
  renderTitle?: ({ counterValueUnit: Unit, item: Item }) => React$Node,
}> {
  render() {
    const { unit, from, to, hoveredItem, renderTitle, isLoading } = this.props;
    const item = hoveredItem || to;
    return (
      <Fragment>
        <View style={styles.balanceTextContainer}>
          {isLoading ? (
            <Placeholder width={228} containerHeight={27} />
          ) : renderTitle ? (
            renderTitle({ counterValueUnit: unit, item })
          ) : (
            <LText tertiary style={styles.balanceText}>
              <CurrencyUnitValue unit={unit} value={item.value} />
            </LText>
          )}
        </View>
        <View style={styles.subtitleContainer}>
          {isLoading ? (
            <Fragment>
              <Placeholder
                width={50}
                containerHeight={19}
                style={{ marginRight: 10 }}
              />
              <Placeholder width={50} containerHeight={19} />
            </Fragment>
          ) : hoveredItem ? (
            <LText>
              <FormatDate date={hoveredItem.date} format="MMMM D, YYYY" />
            </LText>
          ) : (
            <Fragment>
              <Delta
                percent
                from={from.value}
                to={to.value}
                style={styles.deltaPercent}
              />
              <Delta from={from.value} to={to.value} unit={unit} />
            </Fragment>
          )}
        </View>
      </Fragment>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.white,
    paddingVertical: 16,
    margin: 16,
    ...Platform.select({
      android: {
        elevation: 1,
      },
      ios: {
        shadowOpacity: 0.03,
        shadowRadius: 8,
        shadowOffset: {
          height: 4,
        },
      },
    }),
  },
  balanceTextContainer: {
    marginBottom: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceText: {
    fontSize: 22,
    color: colors.darkBlue,
  },
  subtitleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  pillsContainer: {
    marginTop: 16,
    alignItems: "center",
  },
  deltaPercent: {
    marginRight: 20,
  },
});

export default compose(
  connect(
    null,
    mapDispatchToProps,
  ),
)(GraphCard);
