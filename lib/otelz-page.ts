import {
  buildOtelzAffiliateUrl,
  OTELZ_DEFAULT_AFFILIATE,
  OTELZ_SALES_PAGES,
  type OtelzAffiliateParams,
} from "@/lib/otelz";
import { getCompanySettings } from "@/lib/queries/company-settings";

export async function getOtelzPageContext() {
  const settings = await getCompanySettings();
  const affiliate: OtelzAffiliateParams = {
    to: settings.otelzAffiliateTo?.trim() || OTELZ_DEFAULT_AFFILIATE.to,
    cid: settings.otelzAffiliateCid?.trim() || OTELZ_DEFAULT_AFFILIATE.cid,
  };

  return {
    enabled: settings.otelzEnabled ?? true,
    affiliate,
    salesPages: OTELZ_SALES_PAGES.map((page) => ({
      ...page,
      href: buildOtelzAffiliateUrl(page.path, affiliate),
    })),
    homeUrl: buildOtelzAffiliateUrl("/", affiliate),
    bannerUrl: buildOtelzAffiliateUrl("/", affiliate),
  };
}
