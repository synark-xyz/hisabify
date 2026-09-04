import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { ErrorState } from "@/components/ErrorState";
import { logger } from "@/lib/logger";

const NotFound = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    logger.warn("404: user attempted to access a non-existent route", {
      component: "NotFound",
      pathname: location.pathname,
    });
  }, [location.pathname]);

  // `navigate` rather than an <a href="/">: a full page reload here throws away the whole
  // React tree and re-runs the splash for a user who never left the app.
  return (
    <ErrorState
      fullScreen
      variant="notFound"
      title={t("notFound.title")}
      description={t("notFound.description")}
      onGoHome={() => navigate("/", { replace: true })}
    />
  );
};

export default NotFound;
