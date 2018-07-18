import SimpleSchema from "simpl-schema";
import { check } from "meteor/check";
import { Tracker } from "meteor/tracker";
import { PackageConfig, Shop } from "/lib/collections/schemas";
import { registerSchema } from "@reactioncommerce/schemas";

/**
 * @name ShopTypes
 * @memberof Schemas
 * @type {SimpleSchema}
 * @summary ShopTypes schema
 */
export const ShopTypes = new SimpleSchema({
  shopType: {
    type: String,
    defaultValue: "merchant"
  },
  enabled: {
    type: Boolean,
    defaultValue: false
  }
}, { check, tracker: Tracker });

registerSchema("ShopTypes", ShopTypes);

/**
 * @name EnabledPackagesByShopType
 * @memberof Schemas
 * @type {SimpleSchema}
 * @summary EnabledPackagesByShopType schema
 */
export const EnabledPackagesByShopType = new SimpleSchema({
  shopType: String,
  enabledPackages: [String]
}, { check, tracker: Tracker });

registerSchema("EnabledPackagesByShopType", EnabledPackagesByShopType);

/**
 * @name MarketplacePackageConfig
 * @memberof Schemas
 * @type {SimpleSchema}
 * @summary MarketplacePackageConfig schema
 */
export const MarketplacePackageConfig = PackageConfig.clone().extend({
  // Remove blackbox: true from settings obj
  "settings": {
    type: Object,
    optional: true,
    blackbox: false,
    defaultValue: {}
  },
  "settings.thirdPartyLogistics": {
    type: Object,
    blackbox: true,
    optional: true
  },
  "settings.shops": {
    type: Object,
    defaultValue: {}
  },
  "settings.shops.enabledShopTypes": {
    type: Array,
    defaultValue: [{
      shopType: "merchant",
      enabled: true
    }, {
      shopType: "affiliate",
      enabled: false
    }]
  },
  "settings.shops.enabledShopTypes.$": {
    type: ShopTypes
  },
  "settings.shops.enabledPackagesByShopTypes": {
    type: Array,
    optional: true
  },
  "settings.shops.enabledPackagesByShopTypes.$": {
    type: EnabledPackagesByShopType
  },
  "settings.payoutMethod": {
    type: Object,
    blackbox: true,
    optional: true
  },
  "settings.public": {
    type: Object,
    optional: true,
    defaultValue: {}
  },
  // if true, any user can create a shop
  // if false, shop owners must be invited via Accounts panel
  "settings.public.allowMerchantSignup": {
    type: Boolean,
    defaultValue: false
  },
  // Deprecated - no longer used in any marketplace considerations
  // marketplace is enabled and disabled via the package
  // seller signup is controlled by the allowMerchantSignup setting
  "settings.public.allowGuestSellers": {
    type: Boolean,
    defaultValue: false
  },
  "settings.public.marketplaceNakedRoutes": {
    type: Boolean,
    defaultValue: true
  },
  // if true, permit each merchant to setup their own payment provider
  "settings.public.perMerchantPaymentProviders": {
    type: Boolean,
    defaultValue: false
  },
  // if true, the cart should be different for each merchant
  "settings.public.merchantCart": {
    type: Boolean,
    defaultValue: false
  },
  // if true, each merchant sets their own currency
  // TODO: REMOVE in favor of merchantLocale
  // "settings.public.merchantCurrency": {
  //   type: Boolean,
  //   defaultValue: false
  // },
  // if true, each merchant performs their own fulfillment
  "settings.public.merchantFulfillment": {
    type: Boolean,
    defaultValue: true
  },
  // if true, each merchant sets their own language
  // // TODO: REMOVE in favor of merchantLocale
  // "settings.public.merchantLanguage": { // DEPRECATED
  //   type: Boolean,
  //   defaultValue: false
  // },
  // if true, each merchant sets their own locale, language, and currency
  "settings.public.merchantLocale": {
    type: Boolean,
    defaultValue: false
  },
  // if true, permit each merchant to setup their own shipping rates
  "settings.public.merchantShippingRates": {
    type: Boolean,
    defaultValue: false
  },
  // if true, each merchant sets their own currency
  "settings.public.merchantTheme": {
    type: Boolean,
    defaultValue: false
  }
});

registerSchema("MarketplacePackageConfig", MarketplacePackageConfig);

/**
 * @name SellerShop
 * @memberof Schemas
 * @type {SimpleSchema}
 * @summary SellerShop schema
 */
export const SellerShop = Shop.clone().extend({
  stripeConnectSettings: {
    type: Object,
    optional: true
  }
});

registerSchema("SellerShop", SellerShop);
