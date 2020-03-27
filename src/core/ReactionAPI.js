import { createServer } from "http";
import { createRequire } from "module";
import diehard from "diehard";
import express from "express";
import _ from "lodash";
import SimpleSchema from "simpl-schema";
import importAsString from "@reactioncommerce/api-utils/importAsString.js";
import Logger from "@reactioncommerce/logger";
import appEvents from "./util/appEvents.js";
import getAbsoluteUrl from "./util/getAbsoluteUrl.js";
import config from "./config.js";
import createApolloServer from "./createApolloServer.js";
import coreResolvers from "./graphql/resolvers/index.js";
import MongoRepository from "./repository/MongoRepository.js"

const require = createRequire(import.meta.url); // eslint-disable-line
const { PubSub } = require("apollo-server");

const coreGraphQLSchema = importAsString("./graphql/schema.graphql");
const coreGraphQLSubscriptionSchema = importAsString("./graphql/subscription.graphql");

const {
  REACTION_APOLLO_FEDERATION_ENABLED,
  REACTION_GRAPHQL_SUBSCRIPTIONS_ENABLED,
  PORT,
  REACTION_LOG_LEVEL,
  ROOT_URL
} = config;

const debugLevels = ["DEBUG", "TRACE"];

const optionsSchema = new SimpleSchema({
  "httpServer": {
    type: Object,
    optional: true,
    blackbox: true
  },
  "mongodb": {
    type: Object,
    optional: true,
    blackbox: true
  },
  "serveStaticPaths": {
    type: Array,
    optional: true
  },
  "serveStaticPaths.$": String,
  "rootUrl": {
    type: String,
    optional: true
  },
  "version": {
    type: String,
    optional: true
  }
});

const startServerOptionsSchema = new SimpleSchema({
  port: {
    type: SimpleSchema.Integer,
    optional: true
  }
});

const startOptionsSchema = new SimpleSchema({
  mongoUrl: {
    type: String,
    optional: true
  },
  port: {
    type: SimpleSchema.Integer,
    optional: true
  },
  shouldInitReplicaSet: {
    type: Boolean,
    optional: true
  }
});

const listenForDeath = _.once(diehard.listen.bind(diehard));

export default class ReactionAPI {
  constructor(options = {}) {
    optionsSchema.validate(options);

    this.options = { ...options };

    this.collections = {};

    this.version = options.version || null;

    this.context = {
      app: this,
      appEvents,
      appVersion: this.version,
      auth: {},
      collections: this.collections,
      /**
       * @summary When calling a query or mutation function that checks permissions from another
       *   query or mutation where you have already checked permissions, or from system code such
       *   as a background job or ETL process, call `context.getInternalContext()` and pass the
       *   result as the `context` argument. This will bypass all permission checks in the function
       *   you are calling.
       * @return {Object} Context object with permission to do anything
       */
      getInternalContext: () => ({
        ...this.context,
        account: null,
        accountId: null,
        isInternalCall: true,
        user: null,
        userHasPermission: async () => true,
        userId: null,
        validatePermissions: async () => undefined
      }),
      getFunctionsOfType: (type) => (this.functionsByType[type] || []).map(({ func }) => func),
      mutations: {},
      queries: {},
      // In a large production app, you may want to use an external pub-sub system.
      // See https://www.apollographql.com/docs/apollo-server/features/subscriptions.html#PubSub-Implementations
      // We may eventually bind this directly to Kafka.
      pubSub: new PubSub()
    };

    const schemas = [coreGraphQLSchema];

    if (REACTION_GRAPHQL_SUBSCRIPTIONS_ENABLED) {
      schemas.push(coreGraphQLSubscriptionSchema);
    }

    this.functionsByType = {};
    this.graphQL = {
      resolvers: {},
      schemas
    };

    _.merge(this.graphQL.resolvers, coreResolvers);

    // Passing in `rootUrl` option is mostly for tests. Recommend using ROOT_URL env variable.
    const resolvedRootUrl = options.rootUrl || ROOT_URL;

    this.rootUrl = resolvedRootUrl.endsWith("/") ? resolvedRootUrl : `${resolvedRootUrl}/`;
    this.context.rootUrl = this.rootUrl;
    this.context.getAbsoluteUrl = (path) => getAbsoluteUrl(this.context.rootUrl, path);

    this.registeredPlugins = {};
    this.expressMiddleware = [];

    this.repository = new MongoRepository(options);
  }

  _registerFunctionsByType(functionsByType, pluginName) {
    if (functionsByType) {
      Object.keys(functionsByType).forEach((type) => {
        if (!Array.isArray(this.functionsByType[type])) {
          this.functionsByType[type] = [];
        }
        functionsByType[type].forEach((func) => {
          const entryWithSameName = this.functionsByType[type].find((existingEntry) => existingEntry.func.name === func.name);
          if (entryWithSameName) {
            Logger.warn(`Plugin "${pluginName}" registers a function of type "${type}" named "${func.name}", `
              + `but plugin "${entryWithSameName.pluginName}" has already registered a function of type "${type}" named "${entryWithSameName.func.name}".`
              + " We recommend you choose a unique and descriptive name for all functions passed to `functionsByType` to help with debugging.");
          }

          this.functionsByType[type].push({ func, pluginName });
        });
      });
    }
  }

  /**
   * @summary Calls all `registerPluginHandler` type functions from all registered
   *   plugins, and then calls all `startup` type functions in series, in the order
   *   in which they were registered.
   * @returns {Promise<undefined>} Nothing
   */
  async runServiceStartup() {
    // Call `functionsByType.registerPluginHandler` functions for every plugin that
    // has supplied one, passing in all other plugins. Allows one plugin to check
    // for the presence of another plugin and read its config.
    //
    // These are not async but they run before plugin `startup` functions, so a plugin
    // can save off relevant config and handle it later in `startup`.
    const registerPluginHandlerFuncs = this.context.getFunctionsOfType("registerPluginHandler");
    const packageInfoArray = Object.values(this.registeredPlugins);
    registerPluginHandlerFuncs.forEach((registerPluginHandlerFunc) => {
      if (typeof registerPluginHandlerFunc !== "function") {
        throw new Error('A plugin registered a function of type "registerPluginHandler" which is not actually a function');
      }
      packageInfoArray.forEach(registerPluginHandlerFunc);
    });

    // Reaction 3.0.0 removes the old migrations system, which tracked a single
    // database version in a single document in a Migrations collection. We
    // require that you have run all 2.x migrations before upgrading to 3.0.0+.
    // If no migration control record is found, we assume that it's a new
    // database or you have intentionally removed it after running all necessary
    // 2.x migrations.
    const migrationsControl = await this.db.collection("Migrations").findOne({ _id: "control" });
    if (migrationsControl && migrationsControl.version < 76) {
      throw new Error(`Detected a migration version (${migrationsControl.version}) for the previous migration system, which is less than 76.` +
        " This likely means that you have not run all 2.x migrations. You must complete the upgrade to at least 2.7.0 before upgrading to 3.0.0 or higher.");
    }

    const preStartupFunctionsRegisteredByPlugins = this.functionsByType.preStartup;
    if (Array.isArray(preStartupFunctionsRegisteredByPlugins)) {
      // We are intentionally running these in series, in the order in which they were registered
      for (const preStartupFunctionInfo of preStartupFunctionsRegisteredByPlugins) {
        Logger.info(`Running pre-startup function "${preStartupFunctionInfo.func.name}" for plugin "${preStartupFunctionInfo.pluginName}"...`);
        const startTime = Date.now();
        await preStartupFunctionInfo.func(this.context); // eslint-disable-line no-await-in-loop
        const elapsedMs = Date.now() - startTime;
        Logger.info(`pre-startup function "${preStartupFunctionInfo.func.name}" for plugin "${preStartupFunctionInfo.pluginName}" finished in ${elapsedMs}ms`);
      }
    }

    const startupFunctionsRegisteredByPlugins = this.functionsByType.startup;
    if (Array.isArray(startupFunctionsRegisteredByPlugins)) {
      // We are intentionally running these in series, in the order in which they were registered
      for (const startupFunctionInfo of startupFunctionsRegisteredByPlugins) {
        Logger.info(`Running startup function "${startupFunctionInfo.func.name}" for plugin "${startupFunctionInfo.pluginName}"...`);
        const startTime = Date.now();
        await startupFunctionInfo.func(this.context); // eslint-disable-line no-await-in-loop
        const elapsedMs = Date.now() - startTime;
        Logger.info(`Startup function "${startupFunctionInfo.func.name}" for plugin "${startupFunctionInfo.pluginName}" finished in ${elapsedMs}ms`);
      }
    }
  }

  /**
   * @summary Creates the Apollo server and the Express app
   * @returns {undefined}
   */
  initServer() {
    const { httpServer, serveStaticPaths = [] } = this.options;
    const { resolvers, schemas } = this.graphQL;

    const {
      apolloServer,
      expressApp,
      path
    } = createApolloServer({
      context: this.context,
      debug: debugLevels.includes(REACTION_LOG_LEVEL),
      expressMiddleware: this.expressMiddleware,
      resolvers,
      schemas
    });

    this.apolloServer = apolloServer;
    this.expressApp = expressApp;
    this.graphQLPath = path;

    this.graphQLServerUrl = getAbsoluteUrl(this.rootUrl, path);

    // HTTP server for GraphQL subscription websocket handlers
    this.httpServer = httpServer || createServer(this.expressApp);

    if (REACTION_APOLLO_FEDERATION_ENABLED && REACTION_GRAPHQL_SUBSCRIPTIONS_ENABLED) {
      throw new Error("Subscriptions are not supported with Apollo Federation. Set `REACTION_GRAPHQL_SUBSCRIPTIONS_ENABLED=false` to disable subscriptions.");
    }

    if (REACTION_GRAPHQL_SUBSCRIPTIONS_ENABLED) {
      apolloServer.installSubscriptionHandlers(this.httpServer);
      this.graphQLServerSubscriptionUrl = getAbsoluteUrl(this.rootUrl.replace("http", "ws"), apolloServer.subscriptionsPath);
    }

    // Serve files in the /public folder statically
    for (const staticPath of serveStaticPaths) {
      this.expressApp.use(express.static(staticPath));
    }
  }

  /**
   * @summary Creates the Apollo server and the Express app, if necessary,
   *   and then starts it listening on `port`.
   * @param {Object} options Options object
   * @param {Number} [options.port] Port to listen on. If not provided,
   *   the server will be created but will not listen.
   * @returns {Promise<undefined>} Nothing
   */
  async startServer(options = {}) {
    startServerOptionsSchema.validate(options);

    const { port } = options;

    if (!this.httpServer) this.initServer();

    return new Promise((resolve, reject) => {
      if (!port) {
        resolve();
        return;
      }

      try {
        this.httpServer.on("error", (error) => {
          throw error;
        });

        // To also listen for WebSocket connections for GraphQL
        // subs, this needs to be `this.httpServer.listen`
        // rather than `this.expressApp.listen`.
        this.httpServer.listen({ port }, () => {
          this.serverPort = port;
          resolve();
        });
      } catch (error) {
        if (error.code === "EADDRINUSE") {
          this.retryStartServer(port);
        } else {
          reject(error);
        }
      }
    });
  }

  async retryStartServer(port) {
    Logger.error(`Port ${port} is in use. Stop whatever is listening on that port. Retrying in 5 seconds...`);
    setTimeout(() => {
      const stopStart = async () => {
        await this.stopServer();
        await this.startServer({ port });
      };

      stopStart.catch((error) => { throw error; });
    }, 5000);
  }

  async stopServer() {
    if (!this.httpServer || !this.httpServer.listening) return null;
    return new Promise((resolve, reject) => {
      this.httpServer.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * @summary Starts the entire app. Connects to `mongoUrl`, builds the
   *   `context.collections`, runs plugin startup code, creates the
   *   Apollo server and the Express app as necessary, and then starts
   *   the server listening on `port` if `port` is provided.
   * @param {Object} options Options object
   * @param {String} [options.mongoUrl] MongoDB connection URL. If not provided,
   *   the MONGO_URL environment variable is used.
   * @param {Number} [options.port] Port to listen on. If not provided,
   *   the PORT environment variable is used, which defaults to 3000.
   *   If set to `null`, the server will be created but will not listen.
   * @param {Number} [options.shouldInitReplicaSet] Automatically initialize a
   *   replica set for the MongoDB instance. Set this to `true` when running
   *   the app for development or tests.
   * @returns {Promise<undefined>} Nothing
   */
  async start(options = {}) {
    startOptionsSchema.validate(options);

    // Allow passing `port: null` to skip listening. Otherwise default to PORT env.
    let { port } = options;
    if (port === undefined) port = PORT;

    diehard.register((done) => {
      Logger.info("Stopping Reaction API...");

      /* eslint-disable promise/no-callback-in-promise */
      this.stop()
        .then(() => {
          Logger.info("Reaction API stopped");
          done();
          return null;
        })
        .catch((error) => {
          Logger.error(error);
          done();
        });
    });

    listenForDeath();

    // (1) Connect to DB database
    await this.repository.connectToRepository();

    // (1a) Register the db instance
    this.context.app.db = this.repository.db;

    // (2) Register plugin types
    this.collections = await this.repository.registerTypes(this.registeredPlugins);

    // (2a) Register the collections
    this.context.collections = this.collections;


    // (3) Init the server here. Some startup may need `app.expressApp`
    this.initServer();

    // (4) Run service startup functions
    await this.runServiceStartup();

    // (5) Start the Express GraphQL server
    await this.startServer({ port });
  }

  /**
   * @summary Stops the entire app. Closes the DB connection and
   *   stops the Express server listening.
   * @returns {Promise<undefined>} Nothing
   */
  async stop() {
    // (1) Stop the Express GraphQL server
    await this.stopServer();

    // (2) Run all "shutdown" functions registered by plugins
    const shutdownFunctionsRegisteredByPlugins = this.functionsByType.shutdown;
    if (Array.isArray(shutdownFunctionsRegisteredByPlugins)) {
      // We are intentionally running these in series, in the order in which they were registered
      for (const shutdownFunctionInfo of shutdownFunctionsRegisteredByPlugins) {
        Logger.info(`Running shutdown function "${shutdownFunctionInfo.func.name}" for plugin "${shutdownFunctionInfo.pluginName}"...`);
        const startTime = Date.now();
        await shutdownFunctionInfo.func(this.context); // eslint-disable-line no-await-in-loop
        const elapsedMs = Date.now() - startTime;
        Logger.info(`Shutdown function "${shutdownFunctionInfo.func.name}" for plugin "${shutdownFunctionInfo.pluginName}" finished in ${elapsedMs}ms`);
      }
    }

    // (3) Stop app events since the handlers will not have database access after this point
    appEvents.stop();

    // (4) Disconnect from DB database
    await this.repository.disconnectFromRepository();
  }

  /**
   * @summary Plugins should call this to register everything they provide.
   *   This is a non-Meteor replacement for the old `Reaction.registerPackage`.
   * @param {Object} plugin Plugin configuration object
   * @returns {Promise<undefined>} Nothing
   */
  async registerPlugin(plugin = {}) {
    if (typeof plugin.name !== "string" || plugin.name.length === 0) {
      throw new Error("Plugin configuration passed to registerPlugin must have 'name' field");
    }

    if (this.registeredPlugins[plugin.name]) {
      throw new Error(`You registered multiple plugins with the name "${plugin.name}"`);
    }

    this.registeredPlugins[plugin.name] = plugin;

    if (plugin.graphQL) {
      if (plugin.graphQL.resolvers) {
        _.merge(this.graphQL.resolvers, plugin.graphQL.resolvers);
      }
      if (plugin.graphQL.schemas) {
        this.graphQL.schemas.push(...plugin.graphQL.schemas);
      }
    }

    if (plugin.mutations) {
      _.merge(this.context.mutations, plugin.mutations);
    }

    if (plugin.queries) {
      _.merge(this.context.queries, plugin.queries);
    }

    if (plugin.auth) {
      Object.keys(plugin.auth).forEach((key) => {
        if (this.context.auth[key]) {
          throw new Error(`Plugin "${plugin.name} tried to register auth function "${key}" but another plugin already registered this type of function`);
        }
        this.context.auth[key] = plugin.auth[key];
      });
    }

    this._registerFunctionsByType(plugin.functionsByType, plugin.name);

    if (Array.isArray(plugin.expressMiddleware)) {
      this.expressMiddleware.push(...plugin.expressMiddleware.map((def) => ({ ...def, pluginName: plugin.name })));
    }

    if (plugin.contextAdditions) {
      Object.keys(plugin.contextAdditions).forEach((key) => {
        if ({}.hasOwnProperty.call(this.context, key)) {
          throw new Error(`Plugin ${plugin.name} is trying to add ${key} key to context but it's already there`);
        }
        this.context[key] = plugin.contextAdditions[key];
      });
    }
  }
}
