import React from "react";
import { Switch, Route, Redirect, useHistory } from "react-router-dom";
import { getLocalSettings, IFusebitSettings } from "../lib/Settings";
import { makeStyles } from "@material-ui/core/styles";
import { useProfile } from "./ProfileProvider";
import ProfileSelectorWithDetails from "./ProfileSelectorWithDetails";
import ProfileBreadcrumb from "./ProfileBreadcrumb";
import Grid from "@material-ui/core/Grid";
import { FusebitError } from "./ErrorBoundary";
import AccountOverview from "./AccountOverview";
import AccountSubscriptions from "./AccountSubscriptions";
import AccountUsers from "./AccountUsers";
import AccountClients from "./AccountClients";
import Paper from "@material-ui/core/Paper";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";

const useStyles = makeStyles(theme => ({
  gridContainer: {
    marginTop: 12,
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2)
  },
  gridLine: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1)
  }
}));

const ExplorerTabs = {
  account: [
    {
      name: "overview"
    },
    {
      name: "subscriptions"
    },
    {
      name: "activity"
    },
    {
      name: "users"
    },
    {
      name: "clients"
    },
    {
      name: "issuers"
    },
    {
      name: "settings"
    }
  ]
};

function ProfileExplorer({ ...rest }) {
  const history = useHistory();
  const { profile } = useProfile();
  const classes = useStyles();
  const settings = getLocalSettings() as IFusebitSettings;
  const [data, setData] = React.useState({});

  function ExplorerView({ children, tabs, match }: any) {
    const { path } = match;
    // Last segment of the URL indicates the selected tab
    const selectedTab = path.split("/").pop();
    return (
      <ProfileSelectorWithDetails settings={settings}>
        <Grid container className={classes.gridContainer}>
          <Grid item xs={12} className={classes.gridLine}>
            <ProfileBreadcrumb />
          </Grid>
          <Grid item xs={12} className={classes.gridLine}>
            <Paper square={true}>
              <Paper elevation={4} square={true}>
                <Tabs
                  value={selectedTab}
                  indicatorColor="primary"
                  textColor="primary"
                  onChange={(event, newTab) => history.push(newTab)}
                >
                  {tabs.map((tab: any) => (
                    <Tab key={tab.name} label={tab.name} value={tab.name} />
                  ))}
                </Tabs>
              </Paper>
              <br />
              {children}
            </Paper>
          </Grid>
        </Grid>
      </ProfileSelectorWithDetails>
    );
  }

  function getDefaultUrl() {
    return `/accounts/${profile.account}/overview`;
    // return profile.subscription
    //   ? `/accounts/${profile.account}/subscriptions/${profile.subscription}/overview`
    //   : `/accounts/${profile.account}/overview`;
  }

  function NotFound() {
    throw new FusebitError(
      "Oops! Can't find the resource you are trying to access.",
      {
        details: [
          `If you navigated to a URL that was given to you, please check it is valid. `,
          `Otherwise, use the link below to go back to a safe place. `
        ].join(""),
        actions: [
          {
            text: profile.subscription
              ? "Go back to subscription overview"
              : "Go back to account overview",
            url: getDefaultUrl()
          }
        ]
      }
    );
  }

  const handleOnNewData = (data: any) => setData(data);

  return (
    <Switch>
      <Route
        path="/accounts/:accountId/overview"
        exact={true}
        render={({ ...rest }) => (
          <ExplorerView tabs={ExplorerTabs.account} {...rest}>
            <AccountOverview
              data={data}
              onNewData={handleOnNewData}
              {...rest}
            />
          </ExplorerView>
        )}
      />
      <Route
        path="/accounts/:accountId/subscriptions"
        exact={true}
        render={({ ...rest }) => (
          <ExplorerView tabs={ExplorerTabs.account} {...rest}>
            <AccountSubscriptions
              data={data}
              onNewData={handleOnNewData}
              {...rest}
            />
          </ExplorerView>
        )}
      />
      <Route
        path="/accounts/:accountId/users"
        exact={true}
        render={({ ...rest }) => (
          <ExplorerView tabs={ExplorerTabs.account} {...rest}>
            <AccountUsers data={data} onNewData={handleOnNewData} {...rest} />
          </ExplorerView>
        )}
      />
      <Route
        path="/accounts/:accountId/clients"
        exact={true}
        render={({ ...rest }) => (
          <ExplorerView tabs={ExplorerTabs.account} {...rest}>
            <AccountClients data={data} onNewData={handleOnNewData} {...rest} />
          </ExplorerView>
        )}
      />
      <Redirect from="/" exact={true} to={getDefaultUrl()} />
      <Route component={(NotFound as unknown) as React.FunctionComponent} />
    </Switch>
  );
}

export default ProfileExplorer;
