export const jsonSchema = {
  "required": ["shopType", "active", "name", "domains", "currency", "locales", "language", "timezone"],
  "type": "object",
  "properties": {
    "_id": {
      "type": "string"
    },
    "allowGuestCheckout": {
      "type": "boolean"
    },
    "slug": {
      "type": "string"
    },
    "merchantShops": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "_id": {
            "type": "string",
            "description": "Shop description"
          },
          "slug": {
            "type": "string",
            "description": "Shop Slug"
          },
          "name": {
            "type": "string",
            "description": "Shop Name"
          }
        }
      }
    },
    "shopType": {
      "type": "string",
      "description": "default value: `merchant`, accepted values: `primary`, `merchant`, `affiliate`"
    },
    "active": {
      "type": "boolean"
    },
    "name": {
      "type": "string"
    },
    "description": {
      "type": "string"
    },
    "keywords": {
      "type": "string"
    },
    "addressBook": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["fullName", "address1", "city", "region", "country", "phone", "isCommercial"],
        "properties": {
          "_id": {
            "type": "string"
          },
          "fullName": {
            "type": "string",
            "description": "Full name"
          },
          "firstName": {
            "type": "string",
            "description": "First name"
          },
          "lastName": {
            "type": "string",
            "description": "Last name"
          },
          "address1": {
            "description": "Address 1",
            "type": "string"
          },
          "address2": {
            "description": "Address 2",
            "type": "string"
          },
          "addressName": {
            "type": "string"
          },
          "city": {
            "type": "string",
            "description": "City"
          },
          "company": {
            "type": "string",
            "description": "Company"
          },
          "phone": {
            "type": "string",
            "description": "Phone"
          },
          "region": {
            "description": "State/Province/Region",
            "type": "string"
          },
          "postal": {
            "description": "ZIP/Postal Code",
            "type": "string"
          },
          "country": {
            "type": "string",
            "description": "Country"
          },
          "isCommercial": {
            "description": "This is a commercial address.",
            "type": "boolean"
          },
          "isBillingDefault": {
            "description": "Make this your default billing address?",
            "type": "boolean"
          },
          "isShippingDefault": {
            "description": "Make this your default shipping address?",
            "type": "boolean"
          },
          "failedValidation": {
            "description": "Failed validation",
            "type": "boolean"
          },
          "metafields": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "key": {
                  "type": "string",
                  "maxLength": 30
                },
                "namespace": {
                  "type": "string",
                  "maxLength": 20
                },
                "scope": {
                  "type": "string"
                },
                "value": {
                  "type": "string"
                },
                "valueType": {
                  "type": "string"
                },
                "description": {
                  "type": "string"
                }
              }
            }
          }
        }
      }
    },
    "domains": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "emails": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "provides": {
            "type": "string"
          },
          "address": {
            "type": "string"
          },
          "verified": {
            "type": "boolean"
          }
        }
      }
    },
    "currency": {
      "type": "string",
      "description": "Base Currency"
    },
    "locales": {
      "type": "string"
    },
    "language": {
      "type": "string",
      "description": "Base Language"
    },
    "languages": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "public": {
      "type": "string"
    },
    "timezone": {
      "type": "string",
      "description": "Timezone"
    },
    "baseUOL": {
      "type": "string",
      "description": "Base Unit of Length"
    },
    "unitsOfLength": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "uol": {
            "type": "string"
          },
          "length": {
            "type": "string"
          },
          "default": {
            "type": "boolean"
          }
        }
      }
    },
    "baseUOM": {
      "type": "string",
      "description": "Base Unit of Measure"
    },
    "unitsOfMeasure": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "uom": {
            "type": "string"
          },
          "label": {
            "type": "string"
          },
          "default": {
            "type": "boolean"
          }
        }
      }
    },
    "metafields": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "key": {
            "type": "string",
            "maxLength": 30
          },
          "namespace": {
            "type": "string",
            "maxLength": 20
          },
          "scope": {
            "type": "string"
          },
          "value": {
            "type": "string"
          },
          "valueType": {
            "type": "string"
          },
          "description": {
            "type": "string"
          }
        }
      }
    },
    "defaultParcelSize": {
      "type": "object",
      "properties": {
        "weight": {
          "type": "number",
          "minimum": 0
        },
        "height": {
          "type": "number",
          "minimum": 0
        },
        "length": {
          "type": "number",
          "minimum": 0
        },
        "width": {
          "type": "number",
          "minimum": 0
        }
      }
    },
    "layout": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "layout": {
            "type": "string"
          },
          "workflow": {
            "type": "string"
          },
          "template": {
            "type": "string"
          },
          "collection": {
            "type": "string"
          },
          "theme": {
            "type": "string"
          },
          "enabled": {
            "type": "boolean"
          },
          "status": {
            "type": "string"
          },
          "label": {
            "type": "string"
          },
          "container": {
            "type": "string"
          },
          "audience": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "structure": {
            "type": "object",
            "properties": {
              "template": {
                "type": "string"
              },
              "layoutHeader": {
                "type": "string"
              },
              "layoutFooter": {
                "type": "string"
              },
              "notFound": {
                "type": "string"
              },
              "dashboardHeader": {
                "type": "string"
              },
              "dashboardControls": {
                "type": "string"
              },
              "dashboardHeaderControls": {
                "type": "string"
              },
              "adminControlsFooter": {
                "type": "string"
              }
            }
          },
          "priority": {
            "type": "number",
            "minimum": 0
          },
          "position": {
            "type": "number",
            "minimum": 0
          }
        }
      }
    },
    "theme": {
      "type": "object",
      "properties": {
        "themeId": {
          "type": "string"
        },
        "styles": {
          "type": "string"
        }
      }
    },
    "brandAssets": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "mediaId": {
            "type": "string"
          },
          "type": {
            "type": "string"
          }
        }
      }
    },
    "createdAt": {
      "type": "string"
    },
    "updatedAt": {
      "type": "string"
    },
    "paymentMethods": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "availablePaymentMethods": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "workflow": {
      "type": "object",
      "properties": {
        "status": {
          "type": "string"
        },
        "workflow": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      }
    },
    "defaultNavigationTreeId": {
      "type": "string"
    },
    "shopLogoUrls": {
      "type": "object",
      "properties": {
        "primaryShopLogoUrl": {
          "type": "string"
        }
      }
    },
    "storefrontUrls": {
      "type": "object",
      "properties": {
        "storefrontHomeUrl": {
          "type": "string",
          "description": "Storefront Home URL"
        },
        "storefrontLoginUrl": {
          "type": "string",
          "description": "Storefront Login URL"
        },
        "storefrontOrderUrl": {
          "type": "string",
          "description": "Storefront single order URL (can include `:orderReferenceId` and `:orderToken` in string)"
        },
        "storefrontOrdersUrl": {
          "type": "string",
          "description": "Storefront orders URL (can include `:accountId` in string)"
        },
        "storefrontAccountProfileUrl": {
          "type": "string",
          "description": "Storefront Account Profile URL (can include `:accountId` in string)"
        }
      }
    },
    "allowCustomUserLocale": {
      "type": "boolean",
      "description": "Allow custom user locale"
    }
  }
}
