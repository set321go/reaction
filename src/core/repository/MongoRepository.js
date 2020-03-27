import config from "../config.js";
import mongoConnectWithRetry from "../util/mongoConnectWithRetry";
import initReplicaSet from "../util/initReplicaSet";
import collectionIndex from "@reactioncommerce/api-utils/collectionIndex.js";
import Logger from "@reactioncommerce/logger";

const {
  MONGO_URL,
  REACTION_SHOULD_INIT_REPLICA_SET
} = config;

export default class RepositoryAPI {
  constructor(options = {}) {
    this.mongoOptions = {
      mongoUrl: options.mongoUrl
    };
    this.repositories = {};
    this.db = {};
    this.client = {};
  }

  async connectToRepository() {
    const {
      mongoUrl = MONGO_URL,
      shouldInitReplicaSet = REACTION_SHOULD_INIT_REPLICA_SET
    } = this.mongoOptions;

    if (shouldInitReplicaSet) {
      try {
        await initReplicaSet(mongoUrl);
      } catch (error) {
        Logger.warn(`Failed to initialize a MongoDB replica set. This may result in errors or some things not working. Error: ${error.message}`);
      }
    }

    this.client = await mongoConnectWithRetry(mongoUrl);
    this.db = this.client.db();
  }

  async disconnectFromRepository() {
    if (this.client) {
      await this.client.close();
    }
  }

  async registerTypes(registeredPlugins = {}){
    // Reset these
    this.repositories = {};

    // Loop through all registered plugins
    for (const pluginName in registeredPlugins) {
      if ({}.hasOwnProperty.call(registeredPlugins, pluginName)) {
        const pluginConfig = registeredPlugins[pluginName];

        // If a plugin config has `collections` key
        if (pluginConfig.collections) {
          // Loop through `collections` object keys
          for (const collectionKey in pluginConfig.collections) {
            if ({}.hasOwnProperty.call(pluginConfig.collections, collectionKey)) {
              const collectionConfig = pluginConfig.collections[collectionKey];

              // Validate that the `collections` key value is an object and has `name`
              if (!collectionConfig || typeof collectionConfig.name !== "string" || collectionConfig.name.length === 0) {
                throw new Error(`In registerPlugin, collection "${collectionKey}" needs a name property`);
              }

              // Validate that the `collections` key hasn't already been taken by another plugin
              if (this.repositories[collectionKey]) {
                throw new Error(`Plugin ${pluginName} defines a collection with key "${collectionKey}" in registerPlugin,` +
                                " but another plugin has already defined a collection with that key");
              }

              // Add the collection instance to `context.collections`
              this.repositories[collectionKey] = this.db.collection(collectionConfig.name);

              // If the collection config has `indexes` key, define all requested indexes
              if (Array.isArray(collectionConfig.indexes)) {
                const indexingPromises = collectionConfig.indexes.map((indexArgs) => (
                  collectionIndex(this.repositories[collectionKey], ...indexArgs)
                ));
                await Promise.all(indexingPromises); // eslint-disable-line no-await-in-loop
              }
            }
          }
        }
      }
    }

    return this.repositories;
  }
}
