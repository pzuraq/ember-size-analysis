(function() {
/*!
 * @overview  Ember - JavaScript Application Framework
 * @copyright Copyright 2011-2019 Tilde Inc. and contributors
 *            Portions Copyright 2006-2011 Strobe Inc.
 *            Portions Copyright 2008-2011 Apple Inc. All rights reserved.
 * @license   Licensed under MIT license
 *            See https://raw.github.com/emberjs/ember.js/master/LICENSE
 * @version   3.13.0-enable-tracked-properties+42d8229a
 */

/*globals process */
var enifed, requireModule, Ember;

// Used in @ember/-internals/environment/lib/global.js
mainContext = this; // eslint-disable-line no-undef

enifed("@ember/-internals/browser-environment", ["exports"], function (_exports) {
  "use strict";

  _exports.hasDOM = _exports.isFirefox = _exports.isChrome = _exports.userAgent = _exports.history = _exports.location = _exports.window = void 0;
  // check if window exists and actually is the global
  var hasDom = typeof self === 'object' && self !== null && self.Object === Object && typeof Window !== 'undefined' && self.constructor === Window && typeof document === 'object' && document !== null && self.document === document && typeof location === 'object' && location !== null && self.location === location && typeof history === 'object' && history !== null && self.history === history && typeof navigator === 'object' && navigator !== null && self.navigator === navigator && typeof navigator.userAgent === 'string';
  _exports.hasDOM = hasDom;
  const window = hasDom ? self : null;
  _exports.window = window;
  const location$1 = hasDom ? self.location : null;
  _exports.location = location$1;
  const history$1 = hasDom ? self.history : null;
  _exports.history = history$1;
  const userAgent = hasDom ? self.navigator.userAgent : 'Lynx (textmode)';
  _exports.userAgent = userAgent;
  const isChrome = hasDom ? Boolean(window.chrome) && !window.opera : false;
  _exports.isChrome = isChrome;
  const isFirefox = hasDom ? typeof InstallTrigger !== 'undefined' : false;
  _exports.isFirefox = isFirefox;
});
enifed("@ember/-internals/container", ["exports", "@ember/-internals/owner", "@ember/-internals/utils", "@ember/debug", "@ember/polyfills"], function (_exports, _owner, _utils, _debug, _polyfills) {
  "use strict";

  _exports.privatize = privatize;
  _exports.FACTORY_FOR = _exports.Container = _exports.Registry = void 0;
  let leakTracking;
  let containers;

  if (false
  /* DEBUG */
  ) {
      // requires v8
      // chrome --js-flags="--allow-natives-syntax --expose-gc"
      // node --allow-natives-syntax --expose-gc
      try {
        if (typeof gc === 'function') {
          leakTracking = (() => {
            // avoid syntax errors when --allow-natives-syntax not present
            let GetWeakSetValues = new Function('weakSet', 'return %GetWeakSetValues(weakSet, 0)');
            containers = new WeakSet();
            return {
              hasContainers() {
                gc();
                return GetWeakSetValues(containers).length > 0;
              },

              reset() {
                let values = GetWeakSetValues(containers);

                for (let i = 0; i < values.length; i++) {
                  containers.delete(values[i]);
                }
              }

            };
          })();
        }
      } catch (e) {// ignore
      }
    }
  /**
   A container used to instantiate and cache objects.
  
   Every `Container` must be associated with a `Registry`, which is referenced
   to determine the factory and options that should be used to instantiate
   objects.
  
   The public API for `Container` is still in flux and should not be considered
   stable.
  
   @private
   @class Container
   */


  class Container {
    constructor(registry, options = {}) {
      this.registry = registry;
      this.owner = options.owner || null;
      this.cache = (0, _utils.dictionary)(options.cache || null);
      this.factoryManagerCache = (0, _utils.dictionary)(options.factoryManagerCache || null);
      this.isDestroyed = false;
      this.isDestroying = false;

      if (false
      /* DEBUG */
      ) {
          this.validationCache = (0, _utils.dictionary)(options.validationCache || null);

          if (containers !== undefined) {
            containers.add(this);
          }
        }
    }
    /**
     @private
     @property registry
     @type Registry
     @since 1.11.0
     */

    /**
     @private
     @property cache
     @type InheritingDict
     */

    /**
     @private
     @property validationCache
     @type InheritingDict
     */

    /**
     Given a fullName return a corresponding instance.
      The default behavior is for lookup to return a singleton instance.
     The singleton is scoped to the container, allowing multiple containers
     to all have their own locally scoped singletons.
      ```javascript
     let registry = new Registry();
     let container = registry.container();
      registry.register('api:twitter', Twitter);
      let twitter = container.lookup('api:twitter');
      twitter instanceof Twitter; // => true
      // by default the container will return singletons
     let twitter2 = container.lookup('api:twitter');
     twitter2 instanceof Twitter; // => true
      twitter === twitter2; //=> true
     ```
      If singletons are not wanted, an optional flag can be provided at lookup.
      ```javascript
     let registry = new Registry();
     let container = registry.container();
      registry.register('api:twitter', Twitter);
      let twitter = container.lookup('api:twitter', { singleton: false });
     let twitter2 = container.lookup('api:twitter', { singleton: false });
      twitter === twitter2; //=> false
     ```
      @private
     @method lookup
     @param {String} fullName
     @param {Object} [options]
     @param {String} [options.source] The fullname of the request source (used for local lookup)
     @return {any}
     */


    lookup(fullName, options) {
      false && !!this.isDestroyed && (0, _debug.assert)('expected container not to be destroyed', !this.isDestroyed);
      false && !this.registry.isValidFullName(fullName) && (0, _debug.assert)('fullName must be a proper full name', this.registry.isValidFullName(fullName));
      return lookup(this, this.registry.normalize(fullName), options);
    }
    /**
     A depth first traversal, destroying the container, its descendant containers and all
     their managed objects.
      @private
     @method destroy
     */


    destroy() {
      destroyDestroyables(this);
      this.isDestroying = true;
    }

    finalizeDestroy() {
      resetCache(this);
      this.isDestroyed = true;
    }
    /**
     Clear either the entire cache or just the cache for a particular key.
        @private
     @method reset
     @param {String} fullName optional key to reset; if missing, resets everything
    */


    reset(fullName) {
      if (this.isDestroyed) return;

      if (fullName === undefined) {
        destroyDestroyables(this);
        resetCache(this);
      } else {
        resetMember(this, this.registry.normalize(fullName));
      }
    }
    /**
     Returns an object that can be used to provide an owner to a
     manually created instance.
      @private
     @method ownerInjection
     @returns { Object }
    */


    ownerInjection() {
      return {
        [_owner.OWNER]: this.owner
      };
    }
    /**
     Given a fullName, return the corresponding factory. The consumer of the factory
     is responsible for the destruction of any factory instances, as there is no
     way for the container to ensure instances are destroyed when it itself is
     destroyed.
      @public
     @method factoryFor
     @param {String} fullName
     @param {Object} [options]
     @param {String} [options.source] The fullname of the request source (used for local lookup)
     @return {any}
     */


    factoryFor(fullName, options = {}) {
      false && !!this.isDestroyed && (0, _debug.assert)('expected container not to be destroyed', !this.isDestroyed);
      let normalizedName = this.registry.normalize(fullName);
      false && !this.registry.isValidFullName(normalizedName) && (0, _debug.assert)('fullName must be a proper full name', this.registry.isValidFullName(normalizedName));
      false && !(false
      /* EMBER_MODULE_UNIFICATION */
      || !options.namespace) && (0, _debug.assert)('EMBER_MODULE_UNIFICATION must be enabled to pass a namespace option to factoryFor', false || !options.namespace);

      if (options.source || options.namespace) {
        normalizedName = this.registry.expandLocalLookup(fullName, options);

        if (!normalizedName) {
          return;
        }
      }

      return factoryFor(this, normalizedName, fullName);
    }

  }

  _exports.Container = Container;

  if (false
  /* DEBUG */
  ) {
      Container._leakTracking = leakTracking;
    }
  /*
   * Wrap a factory manager in a proxy which will not permit properties to be
   * set on the manager.
   */


  function wrapManagerInDeprecationProxy(manager) {
    if (_utils.HAS_NATIVE_PROXY) {
      let validator = {
        set(_obj, prop) {
          throw new Error("You attempted to set \"" + prop + "\" on a factory manager created by container#factoryFor. A factory manager is a read-only construct.");
        }

      }; // Note:
      // We have to proxy access to the manager here so that private property
      // access doesn't cause the above errors to occur.

      let m = manager;
      let proxiedManager = {
        class: m.class,

        create(props) {
          return m.create(props);
        }

      };
      let proxy = new Proxy(proxiedManager, validator);
      FACTORY_FOR.set(proxy, manager);
    }

    return manager;
  }

  function isSingleton(container, fullName) {
    return container.registry.getOption(fullName, 'singleton') !== false;
  }

  function isInstantiatable(container, fullName) {
    return container.registry.getOption(fullName, 'instantiate') !== false;
  }

  function lookup(container, fullName, options = {}) {
    false && !(false
    /* EMBER_MODULE_UNIFICATION */
    || !options.namespace) && (0, _debug.assert)('EMBER_MODULE_UNIFICATION must be enabled to pass a namespace option to lookup', false || !options.namespace);
    let normalizedName = fullName;

    if (options.source || options.namespace) {
      normalizedName = container.registry.expandLocalLookup(fullName, options);

      if (!normalizedName) {
        return;
      }
    }

    if (options.singleton !== false) {
      let cached = container.cache[normalizedName];

      if (cached !== undefined) {
        return cached;
      }
    }

    return instantiateFactory(container, normalizedName, fullName, options);
  }

  function factoryFor(container, normalizedName, fullName) {
    let cached = container.factoryManagerCache[normalizedName];

    if (cached !== undefined) {
      return cached;
    }

    let factory = container.registry.resolve(normalizedName);

    if (factory === undefined) {
      return;
    }

    if (false
    /* DEBUG */
    && factory && typeof factory._onLookup === 'function') {
      factory._onLookup(fullName);
    }

    let manager = new FactoryManager(container, factory, fullName, normalizedName);

    if (false
    /* DEBUG */
    ) {
        manager = wrapManagerInDeprecationProxy(manager);
      }

    container.factoryManagerCache[normalizedName] = manager;
    return manager;
  }

  function isSingletonClass(container, fullName, {
    instantiate,
    singleton
  }) {
    return singleton !== false && !instantiate && isSingleton(container, fullName) && !isInstantiatable(container, fullName);
  }

  function isSingletonInstance(container, fullName, {
    instantiate,
    singleton
  }) {
    return singleton !== false && instantiate !== false && isSingleton(container, fullName) && isInstantiatable(container, fullName);
  }

  function isFactoryClass(container, fullname, {
    instantiate,
    singleton
  }) {
    return instantiate === false && (singleton === false || !isSingleton(container, fullname)) && !isInstantiatable(container, fullname);
  }

  function isFactoryInstance(container, fullName, {
    instantiate,
    singleton
  }) {
    return instantiate !== false && (singleton !== false || isSingleton(container, fullName)) && isInstantiatable(container, fullName);
  }

  function instantiateFactory(container, normalizedName, fullName, options) {
    let factoryManager = factoryFor(container, normalizedName, fullName);

    if (factoryManager === undefined) {
      return;
    } // SomeClass { singleton: true, instantiate: true } | { singleton: true } | { instantiate: true } | {}
    // By default majority of objects fall into this case


    if (isSingletonInstance(container, fullName, options)) {
      return container.cache[normalizedName] = factoryManager.create();
    } // SomeClass { singleton: false, instantiate: true }


    if (isFactoryInstance(container, fullName, options)) {
      return factoryManager.create();
    } // SomeClass { singleton: true, instantiate: false } | { instantiate: false } | { singleton: false, instantiation: false }


    if (isSingletonClass(container, fullName, options) || isFactoryClass(container, fullName, options)) {
      return factoryManager.class;
    }

    throw new Error('Could not create factory');
  }

  function processInjections(container, injections, result) {
    if (false
    /* DEBUG */
    ) {
        container.registry.validateInjections(injections);
      }

    let hash = result.injections;

    if (hash === undefined) {
      hash = result.injections = {};
    }

    for (let i = 0; i < injections.length; i++) {
      let {
        property,
        specifier,
        source
      } = injections[i];

      if (source) {
        hash[property] = lookup(container, specifier, {
          source
        });
      } else {
        hash[property] = lookup(container, specifier);
      }

      if (!result.isDynamic) {
        result.isDynamic = !isSingleton(container, specifier);
      }
    }
  }

  function buildInjections(container, typeInjections, injections) {
    let result = {
      injections: undefined,
      isDynamic: false
    };

    if (typeInjections !== undefined) {
      processInjections(container, typeInjections, result);
    }

    if (injections !== undefined) {
      processInjections(container, injections, result);
    }

    return result;
  }

  function injectionsFor(container, fullName) {
    let registry = container.registry;
    let [type] = fullName.split(':');
    let typeInjections = registry.getTypeInjections(type);
    let injections = registry.getInjections(fullName);
    return buildInjections(container, typeInjections, injections);
  }

  function destroyDestroyables(container) {
    let cache = container.cache;
    let keys = Object.keys(cache);

    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      let value = cache[key];

      if (value.destroy) {
        value.destroy();
      }
    }
  }

  function resetCache(container) {
    container.cache = (0, _utils.dictionary)(null);
    container.factoryManagerCache = (0, _utils.dictionary)(null);
  }

  function resetMember(container, fullName) {
    let member = container.cache[fullName];
    delete container.factoryManagerCache[fullName];

    if (member) {
      delete container.cache[fullName];

      if (member.destroy) {
        member.destroy();
      }
    }
  }

  const FACTORY_FOR = new WeakMap();
  _exports.FACTORY_FOR = FACTORY_FOR;

  class FactoryManager {
    constructor(container, factory, fullName, normalizedName) {
      this.container = container;
      this.owner = container.owner;
      this.class = factory;
      this.fullName = fullName;
      this.normalizedName = normalizedName;
      this.madeToString = undefined;
      this.injections = undefined;
      FACTORY_FOR.set(this, this);
    }

    toString() {
      if (this.madeToString === undefined) {
        this.madeToString = this.container.registry.makeToString(this.class, this.fullName);
      }

      return this.madeToString;
    }

    create(options) {
      let injectionsCache = this.injections;

      if (injectionsCache === undefined) {
        let {
          injections,
          isDynamic
        } = injectionsFor(this.container, this.normalizedName);
        injectionsCache = injections;

        if (!isDynamic) {
          this.injections = injections;
        }
      }

      let props = injectionsCache;

      if (options !== undefined) {
        props = (0, _polyfills.assign)({}, injectionsCache, options);
      }

      if (false
      /* DEBUG */
      ) {
          let lazyInjections;
          let validationCache = this.container.validationCache; // Ensure that all lazy injections are valid at instantiation time

          if (!validationCache[this.fullName] && this.class && typeof this.class._lazyInjections === 'function') {
            lazyInjections = this.class._lazyInjections();
            lazyInjections = this.container.registry.normalizeInjectionsHash(lazyInjections);
            this.container.registry.validateInjections(lazyInjections);
          }

          validationCache[this.fullName] = true;
        }

      if (!this.class.create) {
        throw new Error("Failed to create an instance of '" + this.normalizedName + "'. Most likely an improperly defined class or an invalid module export.");
      } // required to allow access to things like
      // the customized toString, _debugContainerKey,
      // owner, etc. without a double extend and without
      // modifying the objects properties


      if (typeof this.class._initFactory === 'function') {
        this.class._initFactory(this);
      } else {
        // in the non-EmberObject case we need to still setOwner
        // this is required for supporting glimmer environment and
        // template instantiation which rely heavily on
        // `options[OWNER]` being passed into `create`
        // TODO: clean this up, and remove in future versions
        if (options === undefined || props === undefined) {
          // avoid mutating `props` here since they are the cached injections
          props = (0, _polyfills.assign)({}, props);
        }

        (0, _owner.setOwner)(props, this.owner);
      }

      let instance = this.class.create(props);
      FACTORY_FOR.set(instance, this);
      return instance;
    }

  }

  const VALID_FULL_NAME_REGEXP = /^[^:]+:[^:]+$/;
  /**
   A registry used to store factory and option information keyed
   by type.
  
   A `Registry` stores the factory and option information needed by a
   `Container` to instantiate and cache objects.
  
   The API for `Registry` is still in flux and should not be considered stable.
  
   @private
   @class Registry
   @since 1.11.0
  */

  class Registry {
    constructor(options = {}) {
      this.fallback = options.fallback || null;
      this.resolver = options.resolver || null;
      this.registrations = (0, _utils.dictionary)(options.registrations || null);
      this._typeInjections = (0, _utils.dictionary)(null);
      this._injections = (0, _utils.dictionary)(null);
      this._localLookupCache = Object.create(null);
      this._normalizeCache = (0, _utils.dictionary)(null);
      this._resolveCache = (0, _utils.dictionary)(null);
      this._failSet = new Set();
      this._options = (0, _utils.dictionary)(null);
      this._typeOptions = (0, _utils.dictionary)(null);
    }
    /**
     A backup registry for resolving registrations when no matches can be found.
        @private
     @property fallback
     @type Registry
     */

    /**
     An object that has a `resolve` method that resolves a name.
        @private
     @property resolver
     @type Resolver
     */

    /**
     @private
     @property registrations
     @type InheritingDict
     */

    /**
     @private
        @property _typeInjections
     @type InheritingDict
     */

    /**
     @private
        @property _injections
     @type InheritingDict
     */

    /**
     @private
        @property _normalizeCache
     @type InheritingDict
     */

    /**
     @private
        @property _resolveCache
     @type InheritingDict
     */

    /**
     @private
        @property _options
     @type InheritingDict
     */

    /**
     @private
        @property _typeOptions
     @type InheritingDict
     */

    /**
     Creates a container based on this registry.
        @private
     @method container
     @param {Object} options
     @return {Container} created container
     */


    container(options) {
      return new Container(this, options);
    }
    /**
     Registers a factory for later injection.
        Example:
        ```javascript
     let registry = new Registry();
        registry.register('model:user', Person, {singleton: false });
     registry.register('fruit:favorite', Orange);
     registry.register('communication:main', Email, {singleton: false});
     ```
        @private
     @method register
     @param {String} fullName
     @param {Function} factory
     @param {Object} options
     */


    register(fullName, factory, options = {}) {
      false && !this.isValidFullName(fullName) && (0, _debug.assert)('fullName must be a proper full name', this.isValidFullName(fullName));
      false && !(factory !== undefined) && (0, _debug.assert)("Attempting to register an unknown factory: '" + fullName + "'", factory !== undefined);
      let normalizedName = this.normalize(fullName);
      false && !!this._resolveCache[normalizedName] && (0, _debug.assert)("Cannot re-register: '" + fullName + "', as it has already been resolved.", !this._resolveCache[normalizedName]);

      this._failSet.delete(normalizedName);

      this.registrations[normalizedName] = factory;
      this._options[normalizedName] = options;
    }
    /**
     Unregister a fullName
        ```javascript
     let registry = new Registry();
     registry.register('model:user', User);
        registry.resolve('model:user').create() instanceof User //=> true
        registry.unregister('model:user')
     registry.resolve('model:user') === undefined //=> true
     ```
        @private
     @method unregister
     @param {String} fullName
     */


    unregister(fullName) {
      false && !this.isValidFullName(fullName) && (0, _debug.assert)('fullName must be a proper full name', this.isValidFullName(fullName));
      let normalizedName = this.normalize(fullName);
      this._localLookupCache = Object.create(null);
      delete this.registrations[normalizedName];
      delete this._resolveCache[normalizedName];
      delete this._options[normalizedName];

      this._failSet.delete(normalizedName);
    }
    /**
     Given a fullName return the corresponding factory.
        By default `resolve` will retrieve the factory from
     the registry.
        ```javascript
     let registry = new Registry();
     registry.register('api:twitter', Twitter);
        registry.resolve('api:twitter') // => Twitter
     ```
        Optionally the registry can be provided with a custom resolver.
     If provided, `resolve` will first provide the custom resolver
     the opportunity to resolve the fullName, otherwise it will fallback
     to the registry.
        ```javascript
     let registry = new Registry();
     registry.resolver = function(fullName) {
        // lookup via the module system of choice
      };
        // the twitter factory is added to the module system
     registry.resolve('api:twitter') // => Twitter
     ```
        @private
     @method resolve
     @param {String} fullName
     @param {Object} [options]
     @param {String} [options.source] the fullname of the request source (used for local lookups)
     @return {Function} fullName's factory
     */


    resolve(fullName, options) {
      let factory = resolve(this, this.normalize(fullName), options);

      if (factory === undefined && this.fallback !== null) {
        factory = this.fallback.resolve(...arguments);
      }

      return factory;
    }
    /**
     A hook that can be used to describe how the resolver will
     attempt to find the factory.
        For example, the default Ember `.describe` returns the full
     class name (including namespace) where Ember's resolver expects
     to find the `fullName`.
        @private
     @method describe
     @param {String} fullName
     @return {string} described fullName
     */


    describe(fullName) {
      if (this.resolver !== null && this.resolver.lookupDescription) {
        return this.resolver.lookupDescription(fullName);
      } else if (this.fallback !== null) {
        return this.fallback.describe(fullName);
      } else {
        return fullName;
      }
    }
    /**
     A hook to enable custom fullName normalization behavior
        @private
     @method normalizeFullName
     @param {String} fullName
     @return {string} normalized fullName
     */


    normalizeFullName(fullName) {
      if (this.resolver !== null && this.resolver.normalize) {
        return this.resolver.normalize(fullName);
      } else if (this.fallback !== null) {
        return this.fallback.normalizeFullName(fullName);
      } else {
        return fullName;
      }
    }
    /**
     Normalize a fullName based on the application's conventions
        @private
     @method normalize
     @param {String} fullName
     @return {string} normalized fullName
     */


    normalize(fullName) {
      return this._normalizeCache[fullName] || (this._normalizeCache[fullName] = this.normalizeFullName(fullName));
    }
    /**
     @method makeToString
        @private
     @param {any} factory
     @param {string} fullName
     @return {function} toString function
     */


    makeToString(factory, fullName) {
      if (this.resolver !== null && this.resolver.makeToString) {
        return this.resolver.makeToString(factory, fullName);
      } else if (this.fallback !== null) {
        return this.fallback.makeToString(factory, fullName);
      } else {
        return factory.toString();
      }
    }
    /**
     Given a fullName check if the container is aware of its factory
     or singleton instance.
        @private
     @method has
     @param {String} fullName
     @param {Object} [options]
     @param {String} [options.source] the fullname of the request source (used for local lookups)
     @return {Boolean}
     */


    has(fullName, options) {
      if (!this.isValidFullName(fullName)) {
        return false;
      }

      let source = options && options.source && this.normalize(options.source);
      let namespace = options && options.namespace || undefined;
      return has(this, this.normalize(fullName), source, namespace);
    }
    /**
     Allow registering options for all factories of a type.
        ```javascript
     let registry = new Registry();
     let container = registry.container();
        // if all of type `connection` must not be singletons
     registry.optionsForType('connection', { singleton: false });
        registry.register('connection:twitter', TwitterConnection);
     registry.register('connection:facebook', FacebookConnection);
        let twitter = container.lookup('connection:twitter');
     let twitter2 = container.lookup('connection:twitter');
        twitter === twitter2; // => false
        let facebook = container.lookup('connection:facebook');
     let facebook2 = container.lookup('connection:facebook');
        facebook === facebook2; // => false
     ```
        @private
     @method optionsForType
     @param {String} type
     @param {Object} options
     */


    optionsForType(type, options) {
      this._typeOptions[type] = options;
    }

    getOptionsForType(type) {
      let optionsForType = this._typeOptions[type];

      if (optionsForType === undefined && this.fallback !== null) {
        optionsForType = this.fallback.getOptionsForType(type);
      }

      return optionsForType;
    }
    /**
     @private
     @method options
     @param {String} fullName
     @param {Object} options
     */


    options(fullName, options) {
      let normalizedName = this.normalize(fullName);
      this._options[normalizedName] = options;
    }

    getOptions(fullName) {
      let normalizedName = this.normalize(fullName);
      let options = this._options[normalizedName];

      if (options === undefined && this.fallback !== null) {
        options = this.fallback.getOptions(fullName);
      }

      return options;
    }

    getOption(fullName, optionName) {
      let options = this._options[fullName];

      if (options !== undefined && options[optionName] !== undefined) {
        return options[optionName];
      }

      let type = fullName.split(':')[0];
      options = this._typeOptions[type];

      if (options && options[optionName] !== undefined) {
        return options[optionName];
      } else if (this.fallback !== null) {
        return this.fallback.getOption(fullName, optionName);
      }

      return undefined;
    }
    /**
     Used only via `injection`.
        Provides a specialized form of injection, specifically enabling
     all objects of one type to be injected with a reference to another
     object.
        For example, provided each object of type `controller` needed a `router`.
     one would do the following:
        ```javascript
     let registry = new Registry();
     let container = registry.container();
        registry.register('router:main', Router);
     registry.register('controller:user', UserController);
     registry.register('controller:post', PostController);
        registry.typeInjection('controller', 'router', 'router:main');
        let user = container.lookup('controller:user');
     let post = container.lookup('controller:post');
        user.router instanceof Router; //=> true
     post.router instanceof Router; //=> true
        // both controllers share the same router
     user.router === post.router; //=> true
     ```
        @private
     @method typeInjection
     @param {String} type
     @param {String} property
     @param {String} fullName
     */


    typeInjection(type, property, fullName) {
      false && !this.isValidFullName(fullName) && (0, _debug.assert)('fullName must be a proper full name', this.isValidFullName(fullName));
      let fullNameType = fullName.split(':')[0];
      false && !(fullNameType !== type) && (0, _debug.assert)("Cannot inject a '" + fullName + "' on other " + type + "(s).", fullNameType !== type);
      let injections = this._typeInjections[type] || (this._typeInjections[type] = []);
      injections.push({
        property,
        specifier: fullName
      });
    }
    /**
     Defines injection rules.
        These rules are used to inject dependencies onto objects when they
     are instantiated.
        Two forms of injections are possible:
        * Injecting one fullName on another fullName
     * Injecting one fullName on a type
        Example:
        ```javascript
     let registry = new Registry();
     let container = registry.container();
        registry.register('source:main', Source);
     registry.register('model:user', User);
     registry.register('model:post', Post);
        // injecting one fullName on another fullName
     // eg. each user model gets a post model
     registry.injection('model:user', 'post', 'model:post');
        // injecting one fullName on another type
     registry.injection('model', 'source', 'source:main');
        let user = container.lookup('model:user');
     let post = container.lookup('model:post');
        user.source instanceof Source; //=> true
     post.source instanceof Source; //=> true
        user.post instanceof Post; //=> true
        // and both models share the same source
     user.source === post.source; //=> true
     ```
        @private
     @method injection
     @param {String} factoryName
     @param {String} property
     @param {String} injectionName
     */


    injection(fullName, property, injectionName) {
      false && !this.isValidFullName(injectionName) && (0, _debug.assert)("Invalid injectionName, expected: 'type:name' got: " + injectionName, this.isValidFullName(injectionName));
      let normalizedInjectionName = this.normalize(injectionName);

      if (fullName.indexOf(':') === -1) {
        return this.typeInjection(fullName, property, normalizedInjectionName);
      }

      false && !this.isValidFullName(fullName) && (0, _debug.assert)('fullName must be a proper full name', this.isValidFullName(fullName));
      let normalizedName = this.normalize(fullName);
      let injections = this._injections[normalizedName] || (this._injections[normalizedName] = []);
      injections.push({
        property,
        specifier: normalizedInjectionName
      });
    }
    /**
     @private
     @method knownForType
     @param {String} type the type to iterate over
    */


    knownForType(type) {
      let localKnown = (0, _utils.dictionary)(null);
      let registeredNames = Object.keys(this.registrations);

      for (let index = 0; index < registeredNames.length; index++) {
        let fullName = registeredNames[index];
        let itemType = fullName.split(':')[0];

        if (itemType === type) {
          localKnown[fullName] = true;
        }
      }

      let fallbackKnown, resolverKnown;

      if (this.fallback !== null) {
        fallbackKnown = this.fallback.knownForType(type);
      }

      if (this.resolver !== null && this.resolver.knownForType) {
        resolverKnown = this.resolver.knownForType(type);
      }

      return (0, _polyfills.assign)({}, fallbackKnown, localKnown, resolverKnown);
    }

    isValidFullName(fullName) {
      return VALID_FULL_NAME_REGEXP.test(fullName);
    }

    getInjections(fullName) {
      let injections = this._injections[fullName];

      if (this.fallback !== null) {
        let fallbackInjections = this.fallback.getInjections(fullName);

        if (fallbackInjections !== undefined) {
          injections = injections === undefined ? fallbackInjections : injections.concat(fallbackInjections);
        }
      }

      return injections;
    }

    getTypeInjections(type) {
      let injections = this._typeInjections[type];

      if (this.fallback !== null) {
        let fallbackInjections = this.fallback.getTypeInjections(type);

        if (fallbackInjections !== undefined) {
          injections = injections === undefined ? fallbackInjections : injections.concat(fallbackInjections);
        }
      }

      return injections;
    }
    /**
     Given a fullName and a source fullName returns the fully resolved
     fullName. Used to allow for local lookup.
        ```javascript
     let registry = new Registry();
        // the twitter factory is added to the module system
     registry.expandLocalLookup('component:post-title', { source: 'template:post' }) // => component:post/post-title
     ```
        @private
     @method expandLocalLookup
     @param {String} fullName
     @param {Object} [options]
     @param {String} [options.source] the fullname of the request source (used for local lookups)
     @return {String} fullName
     */


    expandLocalLookup(fullName, options) {
      if (this.resolver !== null && this.resolver.expandLocalLookup) {
        false && !this.isValidFullName(fullName) && (0, _debug.assert)('fullName must be a proper full name', this.isValidFullName(fullName));
        false && !(!options.source || this.isValidFullName(options.source)) && (0, _debug.assert)('options.source must be a proper full name', !options.source || this.isValidFullName(options.source));
        let normalizedFullName = this.normalize(fullName);
        let normalizedSource = this.normalize(options.source);
        return expandLocalLookup(this, normalizedFullName, normalizedSource, options.namespace);
      } else if (this.fallback !== null) {
        return this.fallback.expandLocalLookup(fullName, options);
      } else {
        return null;
      }
    }

  }

  _exports.Registry = Registry;

  if (false
  /* DEBUG */
  ) {
      const proto = Registry.prototype;

      proto.normalizeInjectionsHash = function (hash) {
        let injections = [];

        for (let key in hash) {
          if (hash.hasOwnProperty(key)) {
            let {
              specifier,
              source,
              namespace
            } = hash[key];
            false && !this.isValidFullName(specifier) && (0, _debug.assert)("Expected a proper full name, given '" + specifier + "'", this.isValidFullName(specifier));
            injections.push({
              property: key,
              specifier,
              source,
              namespace
            });
          }
        }

        return injections;
      };

      proto.validateInjections = function (injections) {
        if (!injections) {
          return;
        }

        for (let i = 0; i < injections.length; i++) {
          let {
            specifier,
            source,
            namespace
          } = injections[i];
          false && !this.has(specifier, {
            source,
            namespace
          }) && (0, _debug.assert)("Attempting to inject an unknown injection: '" + specifier + "'", this.has(specifier, {
            source,
            namespace
          }));
        }
      };
    }

  function expandLocalLookup(registry, normalizedName, normalizedSource, namespace) {
    let cache = registry._localLookupCache;
    let normalizedNameCache = cache[normalizedName];

    if (!normalizedNameCache) {
      normalizedNameCache = cache[normalizedName] = Object.create(null);
    }

    let cacheKey = namespace || normalizedSource;
    let cached = normalizedNameCache[cacheKey];

    if (cached !== undefined) {
      return cached;
    }

    let expanded = registry.resolver.expandLocalLookup(normalizedName, normalizedSource, namespace);
    return normalizedNameCache[cacheKey] = expanded;
  }

  function resolve(registry, _normalizedName, options) {
    let normalizedName = _normalizedName; // when `source` is provided expand normalizedName
    // and source into the full normalizedName

    if (options !== undefined && (options.source || options.namespace)) {
      normalizedName = registry.expandLocalLookup(_normalizedName, options);

      if (!normalizedName) {
        return;
      }
    }

    let cached = registry._resolveCache[normalizedName];

    if (cached !== undefined) {
      return cached;
    }

    if (registry._failSet.has(normalizedName)) {
      return;
    }

    let resolved;

    if (registry.resolver) {
      resolved = registry.resolver.resolve(normalizedName);
    }

    if (resolved === undefined) {
      resolved = registry.registrations[normalizedName];
    }

    if (resolved === undefined) {
      registry._failSet.add(normalizedName);
    } else {
      registry._resolveCache[normalizedName] = resolved;
    }

    return resolved;
  }

  function has(registry, fullName, source, namespace) {
    return registry.resolve(fullName, {
      source,
      namespace
    }) !== undefined;
  }

  const privateNames = (0, _utils.dictionary)(null);
  const privateSuffix = ("" + Math.random() + Date.now()).replace('.', '');

  function privatize([fullName]) {
    let name = privateNames[fullName];

    if (name) {
      return name;
    }

    let [type, rawName] = fullName.split(':');
    return privateNames[fullName] = (0, _utils.intern)(type + ":" + rawName + "-" + privateSuffix);
  }
  /*
  Public API for the container is still in flux.
  The public API, specified on the application namespace should be considered the stable API.
  // @module container
    @private
  */

});
enifed("@ember/-internals/environment", ["exports", "@ember/deprecated-features"], function (_exports, _deprecatedFeatures) {
  "use strict";

  _exports.getLookup = getLookup;
  _exports.setLookup = setLookup;
  _exports.getENV = getENV;
  _exports.ENV = _exports.context = _exports.global = void 0;

  // from lodash to catch fake globals
  function checkGlobal(value) {
    return value && value.Object === Object ? value : undefined;
  } // element ids can ruin global miss checks


  function checkElementIdShadowing(value) {
    return value && value.nodeType === undefined ? value : undefined;
  } // export real global


  var global$1 = checkGlobal(checkElementIdShadowing(typeof global === 'object' && global)) || checkGlobal(typeof self === 'object' && self) || checkGlobal(typeof window === 'object' && window) || typeof mainContext !== 'undefined' && mainContext || // set before strict mode in Ember loader/wrapper
  new Function('return this')(); // eval outside of strict mode
  // legacy imports/exports/lookup stuff (should we keep this??)

  _exports.global = global$1;

  const context = function (global, Ember) {
    return Ember === undefined ? {
      imports: global,
      exports: global,
      lookup: global
    } : {
      // import jQuery
      imports: Ember.imports || global,
      // export Ember
      exports: Ember.exports || global,
      // search for Namespaces
      lookup: Ember.lookup || global
    };
  }(global$1, global$1.Ember);

  _exports.context = context;

  function getLookup() {
    return context.lookup;
  }

  function setLookup(value) {
    context.lookup = value;
  }
  /**
    The hash of environment variables used to control various configuration
    settings. To specify your own or override default settings, add the
    desired properties to a global hash named `EmberENV` (or `ENV` for
    backwards compatibility with earlier versions of Ember). The `EmberENV`
    hash must be created before loading Ember.
  
    @class EmberENV
    @type Object
    @public
  */


  const ENV = {
    ENABLE_OPTIONAL_FEATURES: false,

    /**
      Determines whether Ember should add to `Array`, `Function`, and `String`
      native object prototypes, a few extra methods in order to provide a more
      friendly API.
         We generally recommend leaving this option set to true however, if you need
      to turn it off, you can add the configuration property
      `EXTEND_PROTOTYPES` to `EmberENV` and set it to `false`.
         Note, when disabled (the default configuration for Ember Addons), you will
      instead have to access all methods and functions from the Ember
      namespace.
         @property EXTEND_PROTOTYPES
      @type Boolean
      @default true
      @for EmberENV
      @public
    */
    EXTEND_PROTOTYPES: {
      Array: true,
      Function: true,
      String: true
    },

    /**
      The `LOG_STACKTRACE_ON_DEPRECATION` property, when true, tells Ember to log
      a full stack trace during deprecation warnings.
         @property LOG_STACKTRACE_ON_DEPRECATION
      @type Boolean
      @default true
      @for EmberENV
      @public
    */
    LOG_STACKTRACE_ON_DEPRECATION: true,

    /**
      The `LOG_VERSION` property, when true, tells Ember to log versions of all
      dependent libraries in use.
         @property LOG_VERSION
      @type Boolean
      @default true
      @for EmberENV
      @public
    */
    LOG_VERSION: true,
    RAISE_ON_DEPRECATION: false,
    STRUCTURED_PROFILE: false,

    /**
      Whether to insert a `<div class="ember-view" />` wrapper around the
      application template. See RFC #280.
         This is not intended to be set directly, as the implementation may change in
      the future. Use `@ember/optional-features` instead.
         @property _APPLICATION_TEMPLATE_WRAPPER
      @for EmberENV
      @type Boolean
      @default true
      @private
    */
    _APPLICATION_TEMPLATE_WRAPPER: true,

    /**
      Whether to use Glimmer Component semantics (as opposed to the classic "Curly"
      components semantics) for template-only components. See RFC #278.
         This is not intended to be set directly, as the implementation may change in
      the future. Use `@ember/optional-features` instead.
         @property _TEMPLATE_ONLY_GLIMMER_COMPONENTS
      @for EmberENV
      @type Boolean
      @default false
      @private
    */
    _TEMPLATE_ONLY_GLIMMER_COMPONENTS: false,

    /**
      Whether the app is using jQuery. See RFC #294.
         This is not intended to be set directly, as the implementation may change in
      the future. Use `@ember/optional-features` instead.
         @property _JQUERY_INTEGRATION
      @for EmberENV
      @type Boolean
      @default true
      @private
    */
    _JQUERY_INTEGRATION: true,

    /**
      Whether the app defaults to using async observers.
         This is not intended to be set directly, as the implementation may change in
      the future. Use `@ember/optional-features` instead.
         @property _DEFAULT_ASYNC_OBSERVERS
      @for EmberENV
      @type Boolean
      @default false
      @private
    */
    _DEFAULT_ASYNC_OBSERVERS: false,

    /**
      Controls the maximum number of scheduled rerenders without "settling". In general,
      applications should not need to modify this environment variable, but please
      open an issue so that we can determine if a better default value is needed.
         @property _RERENDER_LOOP_LIMIT
      @for EmberENV
      @type number
      @default 1000
      @private
     */
    _RERENDER_LOOP_LIMIT: 1000,
    EMBER_LOAD_HOOKS: {},
    FEATURES: {}
  };
  _exports.ENV = ENV;

  (EmberENV => {
    if (typeof EmberENV !== 'object' || EmberENV === null) return;

    for (let flag in EmberENV) {
      if (!EmberENV.hasOwnProperty(flag) || flag === 'EXTEND_PROTOTYPES' || flag === 'EMBER_LOAD_HOOKS') continue;
      let defaultValue = ENV[flag];

      if (defaultValue === true) {
        ENV[flag] = EmberENV[flag] !== false;
      } else if (defaultValue === false) {
        ENV[flag] = EmberENV[flag] === true;
      }
    }

    let {
      EXTEND_PROTOTYPES
    } = EmberENV;

    if (EXTEND_PROTOTYPES !== undefined) {
      if (typeof EXTEND_PROTOTYPES === 'object' && EXTEND_PROTOTYPES !== null) {
        ENV.EXTEND_PROTOTYPES.String = EXTEND_PROTOTYPES.String !== false;

        if (_deprecatedFeatures.FUNCTION_PROTOTYPE_EXTENSIONS) {
          ENV.EXTEND_PROTOTYPES.Function = EXTEND_PROTOTYPES.Function !== false;
        }

        ENV.EXTEND_PROTOTYPES.Array = EXTEND_PROTOTYPES.Array !== false;
      } else {
        let isEnabled = EXTEND_PROTOTYPES !== false;
        ENV.EXTEND_PROTOTYPES.String = isEnabled;

        if (_deprecatedFeatures.FUNCTION_PROTOTYPE_EXTENSIONS) {
          ENV.EXTEND_PROTOTYPES.Function = isEnabled;
        }

        ENV.EXTEND_PROTOTYPES.Array = isEnabled;
      }
    } // TODO this does not seem to be used by anything,
    //      can we remove it? do we need to deprecate it?


    let {
      EMBER_LOAD_HOOKS
    } = EmberENV;

    if (typeof EMBER_LOAD_HOOKS === 'object' && EMBER_LOAD_HOOKS !== null) {
      for (let hookName in EMBER_LOAD_HOOKS) {
        if (!EMBER_LOAD_HOOKS.hasOwnProperty(hookName)) continue;
        let hooks = EMBER_LOAD_HOOKS[hookName];

        if (Array.isArray(hooks)) {
          ENV.EMBER_LOAD_HOOKS[hookName] = hooks.filter(hook => typeof hook === 'function');
        }
      }
    }

    let {
      FEATURES
    } = EmberENV;

    if (typeof FEATURES === 'object' && FEATURES !== null) {
      for (let feature in FEATURES) {
        if (!FEATURES.hasOwnProperty(feature)) continue;
        ENV.FEATURES[feature] = FEATURES[feature] === true;
      }
    }
  })(global$1.EmberENV || global$1.ENV);

  function getENV() {
    return ENV;
  }
});
enifed("@ember/-internals/error-handling/index", ["exports"], function (_exports) {
  "use strict";

  _exports.getOnerror = getOnerror;
  _exports.setOnerror = setOnerror;
  _exports.getDispatchOverride = getDispatchOverride;
  _exports.setDispatchOverride = setDispatchOverride;
  _exports.onErrorTarget = void 0;
  let onerror;
  const onErrorTarget = {
    get onerror() {
      return onerror;
    }

  }; // Ember.onerror getter

  _exports.onErrorTarget = onErrorTarget;

  function getOnerror() {
    return onerror;
  } // Ember.onerror setter


  function setOnerror(handler) {
    onerror = handler;
  }

  let dispatchOverride; // allows testing adapter to override dispatch

  function getDispatchOverride() {
    return dispatchOverride;
  }

  function setDispatchOverride(handler) {
    dispatchOverride = handler;
  }
});
enifed("@ember/-internals/meta/index", ["exports", "@ember/-internals/meta/lib/meta"], function (_exports, _meta) {
  "use strict";

  Object.defineProperty(_exports, "counters", {
    enumerable: true,
    get: function () {
      return _meta.counters;
    }
  });
  Object.defineProperty(_exports, "deleteMeta", {
    enumerable: true,
    get: function () {
      return _meta.deleteMeta;
    }
  });
  Object.defineProperty(_exports, "Meta", {
    enumerable: true,
    get: function () {
      return _meta.Meta;
    }
  });
  Object.defineProperty(_exports, "meta", {
    enumerable: true,
    get: function () {
      return _meta.meta;
    }
  });
  Object.defineProperty(_exports, "peekMeta", {
    enumerable: true,
    get: function () {
      return _meta.peekMeta;
    }
  });
  Object.defineProperty(_exports, "setMeta", {
    enumerable: true,
    get: function () {
      return _meta.setMeta;
    }
  });
  Object.defineProperty(_exports, "UNDEFINED", {
    enumerable: true,
    get: function () {
      return _meta.UNDEFINED;
    }
  });
});
enifed("@ember/-internals/meta/lib/meta", ["exports", "@ember/-internals/utils", "@ember/debug"], function (_exports, _utils, _debug) {
  "use strict";

  _exports.setMeta = setMeta;
  _exports.peekMeta = peekMeta;
  _exports.deleteMeta = deleteMeta;
  _exports.counters = _exports.meta = _exports.Meta = _exports.UNDEFINED = void 0;
  const objectPrototype = Object.prototype;
  let counters;
  _exports.counters = counters;

  if (false
  /* DEBUG */
  ) {
      _exports.counters = counters = {
        peekCalls: 0,
        peekPrototypeWalks: 0,
        setCalls: 0,
        deleteCalls: 0,
        metaCalls: 0,
        metaInstantiated: 0,
        matchingListenersCalls: 0,
        observerEventsCalls: 0,
        addToListenersCalls: 0,
        removeFromListenersCalls: 0,
        removeAllListenersCalls: 0,
        listenersInherited: 0,
        listenersFlattened: 0,
        parentListenersUsed: 0,
        flattenedListenersCalls: 0,
        reopensAfterFlatten: 0,
        readableLazyChainsCalls: 0,
        writableLazyChainsCalls: 0
      };
    }
  /**
  @module ember
  */


  const UNDEFINED = (0, _utils.symbol)('undefined');
  _exports.UNDEFINED = UNDEFINED;
  let currentListenerVersion = 1;

  class Meta {
    constructor(obj) {
      this._listenersVersion = 1;
      this._inheritedEnd = -1;
      this._flattenedVersion = 0;

      if (false
      /* DEBUG */
      ) {
          counters.metaInstantiated++;
          this._values = undefined;
        }

      this._parent = undefined;
      this._deps = undefined;
      this._tag = undefined;
      this._tags = undefined; // initial value for all flags right now is false
      // see FLAGS const for detailed list of flags used

      this._flags = 0
      /* NONE */
      ; // used only internally

      this.source = obj;
      this.proto = obj.constructor === undefined ? undefined : obj.constructor.prototype;
    }

    get parent() {
      let parent = this._parent;

      if (parent === undefined) {
        let proto = getPrototypeOf(this.source);
        this._parent = parent = proto === null || proto === objectPrototype ? null : meta(proto);
      }

      return parent;
    }

    setInitializing() {
      this._flags |= 8
      /* INITIALIZING */
      ;
    }

    unsetInitializing() {
      this._flags ^= 8
      /* INITIALIZING */
      ;
    }

    isInitializing() {
      return this._hasFlag(8
      /* INITIALIZING */
      );
    }

    isPrototypeMeta(obj) {
      return this.proto === this.source && this.source === obj;
    }

    destroy() {
      if (this.isMetaDestroyed()) {
        return;
      }

      this.setMetaDestroyed(); // remove chainWatchers to remove circular references that would prevent GC
    }

    isSourceDestroying() {
      return this._hasFlag(1
      /* SOURCE_DESTROYING */
      );
    }

    setSourceDestroying() {
      this._flags |= 1
      /* SOURCE_DESTROYING */
      ;
    }

    isSourceDestroyed() {
      return this._hasFlag(2
      /* SOURCE_DESTROYED */
      );
    }

    setSourceDestroyed() {
      this._flags |= 2
      /* SOURCE_DESTROYED */
      ;
    }

    isMetaDestroyed() {
      return this._hasFlag(4
      /* META_DESTROYED */
      );
    }

    setMetaDestroyed() {
      this._flags |= 4
      /* META_DESTROYED */
      ;
    }

    _hasFlag(flag) {
      return (this._flags & flag) === flag;
    }

    _getOrCreateOwnMap(key) {
      return this[key] || (this[key] = Object.create(null));
    }

    writableTags() {
      return this._getOrCreateOwnMap('_tags');
    }

    readableTags() {
      return this._tags;
    }

    writableTag(create) {
      false && !!this.isMetaDestroyed() && (0, _debug.assert)(this.isMetaDestroyed() ? "Cannot create a new tag for `" + (0, _utils.toString)(this.source) + "` after it has been destroyed." : '', !this.isMetaDestroyed());
      let ret = this._tag;

      if (ret === undefined) {
        ret = this._tag = create(this.source);
      }

      return ret;
    }

    readableTag() {
      return this._tag;
    }
  }

  _exports.Meta = Meta;

  if (false
  /* DEBUG */
  ) {
      Meta.prototype.writeValues = function (subkey, value) {
        false && !!this.isMetaDestroyed() && (0, _debug.assert)(this.isMetaDestroyed() ? "Cannot set the value of `" + subkey + "` on `" + (0, _utils.toString)(this.source) + "` after it has been destroyed." : '', !this.isMetaDestroyed());

        let map = this._getOrCreateOwnMap('_values');

        map[subkey] = value === undefined ? UNDEFINED : value;
      };

      Meta.prototype.peekValues = function (key) {
        let val = this._findInherited2('_values', key);

        return val === UNDEFINED ? undefined : val;
      };

      Meta.prototype.deleteFromValues = function (key) {
        delete this._getOrCreateOwnMap('_values')[key];
      };

      Meta.prototype.readInheritedValue = function (key) {
        return this._findInherited2('_values', key);
      };

      Meta.prototype.writeValue = function (obj, key, value) {
        let descriptor = (0, _utils.lookupDescriptor)(obj, key);
        let isMandatorySetter = descriptor !== null && descriptor.set && descriptor.set.isMandatorySetter;

        if (isMandatorySetter) {
          this.writeValues(key, value);
        } else {
          obj[key] = value;
        }
      };
    }

  const getPrototypeOf = Object.getPrototypeOf;
  const metaStore = new WeakMap();

  function setMeta(obj, meta) {
    false && !(obj !== null) && (0, _debug.assert)('Cannot call `setMeta` on null', obj !== null);
    false && !(obj !== undefined) && (0, _debug.assert)('Cannot call `setMeta` on undefined', obj !== undefined);
    false && !(typeof obj === 'object' || typeof obj === 'function') && (0, _debug.assert)("Cannot call `setMeta` on " + typeof obj, typeof obj === 'object' || typeof obj === 'function');

    if (false
    /* DEBUG */
    ) {
        counters.setCalls++;
      }

    metaStore.set(obj, meta);
  }

  function peekMeta(obj) {
    false && !(obj !== null) && (0, _debug.assert)('Cannot call `peekMeta` on null', obj !== null);
    false && !(obj !== undefined) && (0, _debug.assert)('Cannot call `peekMeta` on undefined', obj !== undefined);
    false && !(typeof obj === 'object' || typeof obj === 'function') && (0, _debug.assert)("Cannot call `peekMeta` on " + typeof obj, typeof obj === 'object' || typeof obj === 'function');

    if (false
    /* DEBUG */
    ) {
        counters.peekCalls++;
      }

    let meta = metaStore.get(obj);

    if (meta !== undefined) {
      return meta;
    }

    let pointer = getPrototypeOf(obj);

    while (pointer !== null) {
      if (false
      /* DEBUG */
      ) {
          counters.peekPrototypeWalks++;
        }

      meta = metaStore.get(pointer);

      if (meta !== undefined) {
        if (meta.proto !== pointer) {
          // The meta was a prototype meta which was not marked as initializing.
          // This can happen when a prototype chain was created manually via
          // Object.create() and the source object does not have a constructor.
          meta.proto = pointer;
        }

        return meta;
      }

      pointer = getPrototypeOf(pointer);
    }

    return null;
  }
  /**
    Tears down the meta on an object so that it can be garbage collected.
    Multiple calls will have no effect.
  
    @method deleteMeta
    @for Ember
    @param {Object} obj  the object to destroy
    @return {void}
    @private
  */


  function deleteMeta(obj) {
    false && !(obj !== null) && (0, _debug.assert)('Cannot call `deleteMeta` on null', obj !== null);
    false && !(obj !== undefined) && (0, _debug.assert)('Cannot call `deleteMeta` on undefined', obj !== undefined);
    false && !(typeof obj === 'object' || typeof obj === 'function') && (0, _debug.assert)("Cannot call `deleteMeta` on " + typeof obj, typeof obj === 'object' || typeof obj === 'function');

    if (false
    /* DEBUG */
    ) {
        counters.deleteCalls++;
      }

    let meta = peekMeta(obj);

    if (meta !== null) {
      meta.destroy();
    }
  }
  /**
    Retrieves the meta hash for an object. If `writable` is true ensures the
    hash is writable for this object as well.
  
    The meta object contains information about computed property descriptors as
    well as any watched properties and other information. You generally will
    not access this information directly but instead work with higher level
    methods that manipulate this hash indirectly.
  
    @method meta
    @for Ember
    @private
  
    @param {Object} obj The object to retrieve meta for
    @param {Boolean} [writable=true] Pass `false` if you do not intend to modify
      the meta hash, allowing the method to avoid making an unnecessary copy.
    @return {Object} the meta hash for an object
  */


  const meta = function meta(obj) {
    false && !(obj !== null) && (0, _debug.assert)('Cannot call `meta` on null', obj !== null);
    false && !(obj !== undefined) && (0, _debug.assert)('Cannot call `meta` on undefined', obj !== undefined);
    false && !(typeof obj === 'object' || typeof obj === 'function') && (0, _debug.assert)("Cannot call `meta` on " + typeof obj, typeof obj === 'object' || typeof obj === 'function');

    if (false
    /* DEBUG */
    ) {
        counters.metaCalls++;
      }

    let maybeMeta = peekMeta(obj); // remove this code, in-favor of explicit parent

    if (maybeMeta !== null && maybeMeta.source === obj) {
      return maybeMeta;
    }

    let newMeta = new Meta(obj);
    setMeta(obj, newMeta);
    return newMeta;
  };

  _exports.meta = meta;

  if (false
  /* DEBUG */
  ) {
      meta._counters = counters;
    }
});
enifed("@ember/-internals/metal", ["exports", "@ember/canary-features", "@ember/-internals/meta", "@ember/debug", "@ember/-internals/utils", "@ember/runloop", "@glimmer/reference", "@ember/-internals/environment", "@ember/error", "ember/version", "@ember/deprecated-features", "@ember/polyfills", "@ember/-internals/owner"], function (_exports, _canaryFeatures, _meta2, _debug, _utils, _runloop, _reference, _environment, _error, _version, _deprecatedFeatures, _polyfills, _owner) {
  "use strict";

  _exports.deprecateProperty = deprecateProperty;
  _exports._getPath = _getPath;
  _exports.get = get;
  _exports.getWithDefault = getWithDefault;
  _exports.set = set;
  _exports.trySet = trySet;
  _exports.objectAt = objectAt;
  _exports.replace = replace;
  _exports.replaceInNativeArray = replaceInNativeArray;
  _exports.addArrayObserver = addArrayObserver;
  _exports.removeArrayObserver = removeArrayObserver;
  _exports.arrayContentWillChange = arrayContentWillChange;
  _exports.arrayContentDidChange = arrayContentDidChange;
  _exports.isNone = isNone;
  _exports.isEmpty = isEmpty;
  _exports.isBlank = isBlank;
  _exports.isPresent = isPresent;
  _exports.beginPropertyChanges = beginPropertyChanges;
  _exports.changeProperties = changeProperties;
  _exports.endPropertyChanges = endPropertyChanges;
  _exports.notifyPropertyChange = notifyPropertyChange;
  _exports.defineProperty = defineProperty;
  _exports.watcherCount = watcherCount;
  _exports.getProperties = getProperties;
  _exports.setProperties = setProperties;
  _exports.expandProperties = expandProperties;
  _exports.addObserver = addObserver;
  _exports.activateObserver = activateObserver;
  _exports.removeObserver = removeObserver;
  _exports.flushAsyncObservers = flushAsyncObservers;
  _exports.observer = observer;
  _exports.inject = inject;
  _exports.tagForProperty = tagForProperty;
  _exports.tagFor = tagFor;
  _exports.markObjectAsDirty = markObjectAsDirty;
  _exports.consume = consume;
  _exports.tracked = tracked;
  _exports.track = track;
  _exports.addNamespace = addNamespace;
  _exports.classToString = classToString;
  _exports.findNamespace = findNamespace;
  _exports.findNamespaces = findNamespaces;
  _exports.processNamespace = processNamespace;
  _exports.processAllNamespaces = processAllNamespaces;
  _exports.removeNamespace = removeNamespace;
  _exports.isNamespaceSearchDisabled = isSearchDisabled;
  _exports.setNamespaceSearchDisabled = setSearchDisabled;
  _exports.NAMESPACES_BY_ID = _exports.NAMESPACES = _exports.Tracker = _exports.assertNotRendered = _exports.didRender = _exports.runInTransaction = _exports.update = _exports.UNKNOWN_PROPERTY_TAG = _exports.DEBUG_INJECTION_FUNCTIONS = _exports.aliasMethod = _exports.Mixin = _exports.Libraries = _exports.libraries = _exports.PROPERTY_DID_CHANGE = _exports.PROXY_CONTENT = void 0;

  const firstDotIndexCache = new _utils.Cache(1000, key => key.indexOf('.'));

  function isPath(path) {
    return typeof path === 'string' && firstDotIndexCache.get(path) !== -1;
  }

  const UNKNOWN_PROPERTY_TAG = (0, _utils.symbol)('UNKNOWN_PROPERTY_TAG');
  _exports.UNKNOWN_PROPERTY_TAG = UNKNOWN_PROPERTY_TAG;

  function makeTag() {
    return _reference.DirtyableTag.create();
  }

  function tagForProperty(object, propertyKey, _meta) {
    let objectType = typeof object;

    if (objectType !== 'function' && (objectType !== 'object' || object === null)) {
      return _reference.CONSTANT_TAG;
    }

    let meta$$1 = _meta === undefined ? (0, _meta2.meta)(object) : _meta;

    if (true
    /* EMBER_METAL_TRACKED_PROPERTIES */
    ) {
        if (!(propertyKey in object) && typeof object[UNKNOWN_PROPERTY_TAG] === 'function') {
          return object[UNKNOWN_PROPERTY_TAG](propertyKey);
        }
      } else if ((0, _utils.isProxy)(object)) {
      return tagFor(object, meta$$1);
    }

    let tags = meta$$1.writableTags();
    let tag = tags[propertyKey];

    if (tag) {
      return tag;
    }

    if (true
    /* EMBER_METAL_TRACKED_PROPERTIES */
    ) {
        let pair = (0, _reference.combine)([makeTag(), _reference.UpdatableTag.create(_reference.CONSTANT_TAG)]);

        if (false
        /* DEBUG */
        ) {
            if (true
            /* EMBER_METAL_TRACKED_PROPERTIES */
            ) {
                (0, _utils.setupMandatorySetter)(object, propertyKey);
              }

            pair._propertyKey = propertyKey;
          }

        return tags[propertyKey] = pair;
      } else {
      return tags[propertyKey] = makeTag();
    }
  }

  function tagFor(object, _meta) {
    if (typeof object === 'object' && object !== null) {
      let meta$$1 = _meta === undefined ? (0, _meta2.meta)(object) : _meta;

      if (!meta$$1.isMetaDestroyed()) {
        return meta$$1.writableTag(makeTag);
      }
    }

    return _reference.CONSTANT_TAG;
  }

  let dirty;
  let update;
  _exports.update = update;

  if (true
  /* EMBER_METAL_TRACKED_PROPERTIES */
  ) {
      dirty = tag => {
        tag.inner.first.inner.dirty();
      };

      _exports.update = update = (outer, inner) => {
        outer.inner.lastChecked = 0;
        outer.inner.second.inner.update(inner);
      };
    } else {
    dirty = tag => {
      tag.inner.dirty();
    };
  }

  function markObjectAsDirty(obj, propertyKey, _meta) {
    let meta$$1 = _meta === undefined ? (0, _meta2.meta)(obj) : _meta;
    let objectTag = meta$$1.readableTag();

    if (objectTag !== undefined) {
      if ((0, _utils.isProxy)(obj)) {
        objectTag.inner.first.inner.dirty();
      } else {
        objectTag.inner.dirty();
      }
    }

    let tags = meta$$1.readableTags();
    let propertyTag = tags !== undefined ? tags[propertyKey] : undefined;

    if (propertyTag !== undefined) {
      dirty(propertyTag);
    }

    if (objectTag !== undefined || propertyTag !== undefined) {
      ensureRunloop();
    }
  }

  function ensureRunloop() {
    _runloop.backburner.ensureInstance();
  }

  const EMPTY_ARRAY = Object.freeze([]);

  function objectAt(array, index) {
    if (Array.isArray(array)) {
      return array[index];
    } else {
      return array.objectAt(index);
    }
  }

  function replace(array, start, deleteCount, items = EMPTY_ARRAY) {
    if (Array.isArray(array)) {
      replaceInNativeArray(array, start, deleteCount, items);
    } else {
      array.replace(start, deleteCount, items);
    }
  }

  const CHUNK_SIZE = 60000; // To avoid overflowing the stack, we splice up to CHUNK_SIZE items at a time.
  // See https://code.google.com/p/chromium/issues/detail?id=56588 for more details.

  function replaceInNativeArray(array, start, deleteCount, items) {
    arrayContentWillChange(array, start, deleteCount, items.length);

    if (items.length <= CHUNK_SIZE) {
      array.splice(start, deleteCount, ...items);
    } else {
      array.splice(start, deleteCount);

      for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        let chunk = items.slice(i, i + CHUNK_SIZE);
        array.splice(start + i, 0, ...chunk);
      }
    }

    arrayContentDidChange(array, start, deleteCount, items.length);
  }

  /**
    An object that that tracks @tracked properties that were consumed.
  
    @private
  */


  class Tracker {
    constructor() {
      this.tags = new Set();
      this.last = null;
    }

    add(tag) {
      this.tags.add(tag);
      this.last = tag;
    }

    get size() {
      return this.tags.size;
    }

    combine() {
      if (this.tags.size === 0) {
        return _reference.CONSTANT_TAG;
      } else if (this.tags.size === 1) {
        return this.last;
      } else {
        let tags = [];
        this.tags.forEach(tag => tags.push(tag));
        return (0, _reference.combine)(tags);
      }
    }

  }

  _exports.Tracker = Tracker;

  function tracked(...args) {
    return descriptorForField(args);
  }


  function descriptorForField([_target, key, desc]) {
    false && !(!desc || !desc.value && !desc.get && !desc.set) && (0, _debug.assert)("You attempted to use @tracked on " + key + ", but that element is not a class field. @tracked is only usable on class fields. Native getters and setters will autotrack add any tracked fields they encounter, so there is no need mark getters and setters with @tracked.", !desc || !desc.value && !desc.get && !desc.set);
    let initializer = desc ? desc.initializer : undefined;
    let values = new WeakMap();
    let hasInitializer = typeof initializer === 'function';
    return {
      enumerable: true,
      configurable: true,

      get() {
        let propertyTag = tagForProperty(this, key);
        if (CURRENT_TRACKER) CURRENT_TRACKER.add(propertyTag);
        let value; // If the field has never been initialized, we should initialize it

        if (hasInitializer && !values.has(this)) {
          value = initializer.call(this);
          values.set(this, value);
        } else {
          value = values.get(this);
        } // Add the tag of the returned value if it is an array, since arrays
        // should always cause updates if they are consumed and then changed


        if (Array.isArray(value) || (0, _utils.isEmberArray)(value)) {
          update(propertyTag, tagForProperty(value, '[]'));
        }

        return value;
      },

      set(newValue) {
        markObjectAsDirty(this, key);
        values.set(this, newValue);

        if (propertyDidChange !== null) {
          propertyDidChange();
        }
      }

    };
  }
  /**
    @private
  
    Whenever a tracked computed property is entered, the current tracker is
    saved off and a new tracker is replaced.
  
    Any tracked properties consumed are added to the current tracker.
  
    When a tracked computed property is exited, the tracker's tags are
    combined and added to the parent tracker.
  
    The consequence is that each tracked computed property has a tag
    that corresponds to the tracked properties consumed inside of
    itself, including child tracked computed properties.
  */


  let CURRENT_TRACKER = null;

  function track(callback) {
    let parent = CURRENT_TRACKER;
    let current = new Tracker();
    CURRENT_TRACKER = current;

    try {
      callback();
    } finally {
      CURRENT_TRACKER = parent;
    }

    return current.combine();
  }

  function consume(tag) {
    if (CURRENT_TRACKER !== null) {
      CURRENT_TRACKER.add(tag);
    }
  }

  function isTracking() {
    return CURRENT_TRACKER !== null;
  }

  let propertyDidChange = null;
  /**
  @module @ember/object
  */

  function get(obj, keyName) {
    false && !(arguments.length === 2) && (0, _debug.assert)("Get must be called with two arguments; an object and a property key", arguments.length === 2);
    false && !(obj !== undefined && obj !== null) && (0, _debug.assert)("Cannot call get with '" + keyName + "' on an undefined object.", obj !== undefined && obj !== null);
    false && !(typeof keyName === 'string' || typeof keyName === 'number' && !isNaN(keyName)) && (0, _debug.assert)("The key provided to get must be a string or number, you passed " + keyName, typeof keyName === 'string' || typeof keyName === 'number' && !isNaN(keyName));
    false && !(typeof keyName !== 'string' || keyName.lastIndexOf('this.', 0) !== 0) && (0, _debug.assert)("'this' in paths is not supported", typeof keyName !== 'string' || keyName.lastIndexOf('this.', 0) !== 0);
    let type = typeof obj;
    let isObject = type === 'object';
    let isFunction = type === 'function';
    let isObjectLike = isObject || isFunction;

    if (isPath(keyName)) {
      return isObjectLike ? _getPath(obj, keyName) : undefined;
    }

    let value;

    if (isObjectLike) {
      let tracking = isTracking();

      if (true
      /* EMBER_METAL_TRACKED_PROPERTIES */
      ) {
          if (tracking) {
            consume(tagForProperty(obj, keyName));
          }
        }

      let descriptor = descriptorForProperty(obj, keyName);

      if (descriptor !== undefined) {
        return descriptor.get(obj, keyName);
      }

      if (false
      /* DEBUG */
      && _utils.HAS_NATIVE_PROXY) {
        value = getPossibleMandatoryProxyValue(obj, keyName);
      } else {
        value = obj[keyName];
      } // Add the tag of the returned value if it is an array, since arrays
      // should always cause updates if they are consumed and then changed


      if (true
      /* EMBER_METAL_TRACKED_PROPERTIES */
      && tracking && (Array.isArray(value) || (0, _utils.isEmberArray)(value))) {
        consume(tagForProperty(value, '[]'));
      }
    } else {
      value = obj[keyName];
    }

    if (value === undefined) {
      if (isObject && !(keyName in obj) && typeof obj.unknownProperty === 'function') {
        return obj.unknownProperty(keyName);
      }
    }

    return value;
  }

  function _getPath(root, path) {
    let obj = root;
    let parts = typeof path === 'string' ? path.split('.') : path;

    for (let i = 0; i < parts.length; i++) {
      if (obj === undefined || obj === null || obj.isDestroyed) {
        return undefined;
      }

      obj = get(obj, parts[i]);
    }

    return obj;
  }
  
  function set(obj, keyName, value, tolerant) {
    false && !(arguments.length === 3 || arguments.length === 4) && (0, _debug.assert)("Set must be called with three or four arguments; an object, a property key, a value and tolerant true/false", arguments.length === 3 || arguments.length === 4);
    false && !(obj && typeof obj === 'object' || typeof obj === 'function') && (0, _debug.assert)("Cannot call set with '" + keyName + "' on an undefined object.", obj && typeof obj === 'object' || typeof obj === 'function');
    false && !(typeof keyName === 'string' || typeof keyName === 'number' && !isNaN(keyName)) && (0, _debug.assert)("The key provided to set must be a string or number, you passed " + keyName, typeof keyName === 'string' || typeof keyName === 'number' && !isNaN(keyName));
    false && !(typeof keyName !== 'string' || keyName.lastIndexOf('this.', 0) !== 0) && (0, _debug.assert)("'this' in paths is not supported", typeof keyName !== 'string' || keyName.lastIndexOf('this.', 0) !== 0);

    if (obj.isDestroyed) {
      false && !tolerant && (0, _debug.assert)("calling set on destroyed object: " + (0, _utils.toString)(obj) + "." + keyName + " = " + (0, _utils.toString)(value), tolerant);
      return;
    }

    if (isPath(keyName)) {
      return setPath(obj, keyName, value, tolerant);
    }

    let meta$$1 = (0, _meta2.peekMeta)(obj);
    let descriptor = descriptorForProperty(obj, keyName, meta$$1);

    if (descriptor !== undefined) {
      descriptor.set(obj, keyName, value);
      return value;
    }

    let currentValue;

    if (false
    /* DEBUG */
    && _utils.HAS_NATIVE_PROXY) {
      currentValue = getPossibleMandatoryProxyValue(obj, keyName);
    } else {
      currentValue = obj[keyName];
    }

    if (currentValue === undefined && 'object' === typeof obj && !(keyName in obj) && typeof obj.setUnknownProperty === 'function') {
      /* unknown property */
      obj.setUnknownProperty(keyName, value);
    } else {
      if (false
      /* DEBUG */
      ) {
          if (true
          /* EMBER_METAL_TRACKED_PROPERTIES */
          ) {
              (0, _utils.setWithMandatorySetter)(obj, keyName, value);
            } else {
            setWithMandatorySetter$1(obj, keyName, value, meta$$1);
          }
        } else {
        obj[keyName] = value;
      }

      if (currentValue !== value) {
        notifyPropertyChange(obj, keyName, meta$$1);
      }
    }

    return value;
  }


  const PROXY_CONTENT = (0, _utils.symbol)('PROXY_CONTENT');
  _exports.PROXY_CONTENT = PROXY_CONTENT;
  let getPossibleMandatoryProxyValue;

  let DEBUG_INJECTION_FUNCTIONS;
  _exports.DEBUG_INJECTION_FUNCTIONS = DEBUG_INJECTION_FUNCTIONS;

  if (false
  /* DEBUG */
  ) {
      _exports.DEBUG_INJECTION_FUNCTIONS = DEBUG_INJECTION_FUNCTIONS = new WeakMap();
    }

  function inject(type, ...args) {
    false && !(typeof type === 'string') && (0, _debug.assert)('a string type must be provided to inject', typeof type === 'string');
    let calledAsDecorator = a(args);
    let source, namespace;
    let name = calledAsDecorator ? undefined : args[0];
    let options = calledAsDecorator ? undefined : args[1];

    if (false
    /* EMBER_MODULE_UNIFICATION */
    ) {
        source = options ? options.source : undefined;
        namespace = undefined;

        if (name !== undefined) {
          let namespaceDelimiterOffset = name.indexOf('::');

          if (namespaceDelimiterOffset !== -1) {
            namespace = name.slice(0, namespaceDelimiterOffset);
            name = name.slice(namespaceDelimiterOffset + 2);
          }
        }
      }

    let getInjection = function (propertyName) {
      let owner = (0, _owner.getOwner)(this) || this.container; // fallback to `container` for backwards compat

      false && !Boolean(owner) && (0, _debug.assert)("Attempting to lookup an injected property on an object without a container, ensure that the object was instantiated via a container.", Boolean(owner));
      return owner.lookup(type + ":" + (name || propertyName), {
        source,
        namespace
      });
    };

    if (false
    /* DEBUG */
    ) {
        DEBUG_INJECTION_FUNCTIONS.set(getInjection, {
          namespace,
          source,
          type,
          name
        });
      }

    let decorator = computed({
      get: getInjection,

      set(keyName, value) {
        defineProperty(this, keyName, null, value);
      }

    });

    if (calledAsDecorator) {
      false && !Boolean(true
      /* EMBER_NATIVE_DECORATOR_SUPPORT */
      ) && (0, _debug.assert)('Native decorators are not enabled without the EMBER_NATIVE_DECORATOR_SUPPORT flag. If you are using inject in a classic class, add parenthesis to it: inject()', Boolean(true));
      return decorator(args[0], args[1], args[2]);
    } else {
      return decorator;
    }
  }
});
enifed("@ember/-internals/owner/index", ["exports", "@ember/-internals/utils"], function (_exports, _utils) {
  "use strict";

  _exports.getOwner = getOwner;
  _exports.setOwner = setOwner;
  _exports.OWNER = void 0;

  /**
  @module @ember/application
  */
  const OWNER = (0, _utils.symbol)('OWNER');
  /**
    Framework objects in an Ember application (components, services, routes, etc.)
    are created via a factory and dependency injection system. Each of these
    objects is the responsibility of an "owner", which handled its
    instantiation and manages its lifetime.
  
    `getOwner` fetches the owner object responsible for an instance. This can
    be used to lookup or resolve other class instances, or register new factories
    into the owner.
  
    For example, this component dynamically looks up a service based on the
    `audioType` passed as an attribute:
  
    ```app/components/play-audio.js
    import Component from '@ember/component';
    import { computed } from '@ember/object';
    import { getOwner } from '@ember/application';
  
    // Usage:
    //
    //   {{play-audio audioType=model.audioType audioFile=model.file}}
    //
    export default Component.extend({
      audioService: computed('audioType', function() {
        let owner = getOwner(this);
        return owner.lookup(`service:${this.get('audioType')}`);
      }),
  
      click() {
        let player = this.get('audioService');
        player.play(this.get('audioFile'));
      }
    });
    ```
  
    @method getOwner
    @static
    @for @ember/application
    @param {Object} object An object with an owner.
    @return {Object} An owner object.
    @since 2.3.0
    @public
  */

  _exports.OWNER = OWNER;

  function getOwner(object) {
    return object[OWNER];
  }
  /**
    `setOwner` forces a new owner on a given object instance. This is primarily
    useful in some testing cases.
  
    @method setOwner
    @static
    @for @ember/application
    @param {Object} object An object instance.
    @param {Object} object The new owner object of the object instance.
    @since 2.3.0
    @public
  */


  function setOwner(object, owner) {
    object[OWNER] = owner;
  }
});
enifed("@ember/-internals/utils", ["exports", "@ember/polyfills", "@ember/debug"], function (_exports, _polyfills, _debug) {
  "use strict";

  _exports.symbol = symbol;
  _exports.isInternalSymbol = isInternalSymbol;
  _exports.dictionary = makeDictionary;
  _exports.uuid = uuid;
  _exports.generateGuid = generateGuid;
  _exports.guidFor = guidFor;
  _exports.intern = intern;
  _exports.wrap = wrap;
  _exports.inspect = inspect;
  _exports.lookupDescriptor = lookupDescriptor;
  _exports.canInvoke = canInvoke;
  _exports.tryInvoke = tryInvoke;
  _exports.makeArray = makeArray;
  _exports.getName = getName;
  _exports.setName = setName;
  _exports.toString = toString;
  _exports.isProxy = isProxy;
  _exports.setProxy = setProxy;
  _exports.isEmberArray = isEmberArray;
  _exports.setWithMandatorySetter = _exports.teardownMandatorySetter = _exports.setupMandatorySetter = _exports.EMBER_ARRAY = _exports.Cache = _exports.HAS_NATIVE_PROXY = _exports.HAS_NATIVE_SYMBOL = _exports.ROOT = _exports.checkHasSuper = _exports.GUID_KEY = _exports.getOwnPropertyDescriptors = void 0;

  /**
    Strongly hint runtimes to intern the provided string.
  
    When do I need to use this function?
  
    For the most part, never. Pre-mature optimization is bad, and often the
    runtime does exactly what you need it to, and more often the trade-off isn't
    worth it.
  
    Why?
  
    Runtimes store strings in at least 2 different representations:
    Ropes and Symbols (interned strings). The Rope provides a memory efficient
    data-structure for strings created from concatenation or some other string
    manipulation like splitting.
  
    Unfortunately checking equality of different ropes can be quite costly as
    runtimes must resort to clever string comparison algorithms. These
    algorithms typically cost in proportion to the length of the string.
    Luckily, this is where the Symbols (interned strings) shine. As Symbols are
    unique by their string content, equality checks can be done by pointer
    comparison.
  
    How do I know if my string is a rope or symbol?
  
    Typically (warning general sweeping statement, but truthy in runtimes at
    present) static strings created as part of the JS source are interned.
    Strings often used for comparisons can be interned at runtime if some
    criteria are met.  One of these criteria can be the size of the entire rope.
    For example, in chrome 38 a rope longer then 12 characters will not
    intern, nor will segments of that rope.
  
    Some numbers: http://jsperf.com/eval-vs-keys/8
  
    Known Trick™
  
    @private
    @return {String} interned version of the provided string
  */
  function intern(str) {
    let obj = {};
    obj[str] = 1;

    for (let key in obj) {
      if (key === str) {
        return key;
      }
    }

    return str;
  }
  /**
    Returns whether Type(value) is Object.
  
    Useful for checking whether a value is a valid WeakMap key.
  
    Refs: https://tc39.github.io/ecma262/#sec-typeof-operator-runtime-semantics-evaluation
          https://tc39.github.io/ecma262/#sec-weakmap.prototype.set
  
    @private
    @function isObject
  */


  function isObject(value) {
    return value !== null && (typeof value === 'object' || typeof value === 'function');
  }
  /**
   @module @ember/object
  */

  /**
   Previously we used `Ember.$.uuid`, however `$.uuid` has been removed from
   jQuery master. We'll just bootstrap our own uuid now.
  
   @private
   @return {Number} the uuid
   */


  let _uuid = 0;
  /**
   Generates a universally unique identifier. This method
   is used internally by Ember for assisting with
   the generation of GUID's and other unique identifiers.
  
   @public
   @return {Number} [description]
   */

  function uuid() {
    return ++_uuid;
  }
  /**
   Prefix used for guids through out Ember.
   @private
   @property GUID_PREFIX
   @for Ember
   @type String
   @final
   */


  const GUID_PREFIX = 'ember'; // Used for guid generation...

  const OBJECT_GUIDS = new WeakMap();
  const NON_OBJECT_GUIDS = new Map();
  /**
    A unique key used to assign guids and other private metadata to objects.
    If you inspect an object in your browser debugger you will often see these.
    They can be safely ignored.
  
    On browsers that support it, these properties are added with enumeration
    disabled so they won't show up when you iterate over your properties.
  
    @private
    @property GUID_KEY
    @for Ember
    @type String
    @final
  */

  const GUID_KEY = intern("__ember" + Date.now());
  /**
    Generates a new guid, optionally saving the guid to the object that you
    pass in. You will rarely need to use this method. Instead you should
    call `guidFor(obj)`, which return an existing guid if available.
  
    @private
    @method generateGuid
    @static
    @for @ember/object/internals
    @param {Object} [obj] Object the guid will be used for. If passed in, the guid will
      be saved on the object and reused whenever you pass the same object
      again.
  
      If no object is passed, just generate a new guid.
    @param {String} [prefix] Prefix to place in front of the guid. Useful when you want to
      separate the guid into separate namespaces.
    @return {String} the guid
  */

  _exports.GUID_KEY = GUID_KEY;

  function generateGuid(obj, prefix = GUID_PREFIX) {
    let guid = prefix + uuid();

    if (isObject(obj)) {
      OBJECT_GUIDS.set(obj, guid);
    }

    return guid;
  }
  /**
    Returns a unique id for the object. If the object does not yet have a guid,
    one will be assigned to it. You can call this on any object,
    `EmberObject`-based or not.
  
    You can also use this method on DOM Element objects.
  
    @public
    @static
    @method guidFor
    @for @ember/object/internals
    @param {Object} obj any object, string, number, Element, or primitive
    @return {String} the unique guid for this instance.
  */


  function guidFor(value) {
    let guid;

    if (isObject(value)) {
      guid = OBJECT_GUIDS.get(value);

      if (guid === undefined) {
        guid = GUID_PREFIX + uuid();
        OBJECT_GUIDS.set(value, guid);
      }
    } else {
      guid = NON_OBJECT_GUIDS.get(value);

      if (guid === undefined) {
        let type = typeof value;

        if (type === 'string') {
          guid = 'st' + uuid();
        } else if (type === 'number') {
          guid = 'nu' + uuid();
        } else if (type === 'symbol') {
          guid = 'sy' + uuid();
        } else {
          guid = '(' + value + ')';
        }

        NON_OBJECT_GUIDS.set(value, guid);
      }
    }

    return guid;
  }

  const GENERATED_SYMBOLS = [];

  function isInternalSymbol(possibleSymbol) {
    return GENERATED_SYMBOLS.indexOf(possibleSymbol) !== -1;
  }

  function symbol(debugName) {
    // TODO: Investigate using platform symbols, but we do not
    // want to require non-enumerability for this API, which
    // would introduce a large cost.
    let id = GUID_KEY + Math.floor(Math.random() * Date.now());
    let symbol = intern("__" + debugName + id + "__");
    GENERATED_SYMBOLS.push(symbol);
    return symbol;
  } // the delete is meant to hint at runtimes that this object should remain in
  // dictionary mode. This is clearly a runtime specific hack, but currently it
  // appears worthwhile in some usecases. Please note, these deletes do increase
  // the cost of creation dramatically over a plain Object.create. And as this
  // only makes sense for long-lived dictionaries that aren't instantiated often.


  function makeDictionary(parent) {
    let dict = Object.create(parent);
    dict['_dict'] = null;
    delete dict['_dict'];
    return dict;
  }

  let getOwnPropertyDescriptors;

  if (Object.getOwnPropertyDescriptors !== undefined) {
    getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;
  } else {
    getOwnPropertyDescriptors = function (obj) {
      let descriptors = {};
      Object.keys(obj).forEach(key => {
        descriptors[key] = Object.getOwnPropertyDescriptor(obj, key);
      });
      return descriptors;
    };
  }

  var getOwnPropertyDescriptors$1 = getOwnPropertyDescriptors;
  _exports.getOwnPropertyDescriptors = getOwnPropertyDescriptors$1;


  const {
    toString: objectToString
  } = Object.prototype;
  const {
    toString: functionToString
  } = Function.prototype;
  const {
    isArray
  } = Array;
  const {
    keys: objectKeys
  } = Object;
  const {
    stringify
  } = JSON;
  const LIST_LIMIT = 100;
  const DEPTH_LIMIT = 4;
  const SAFE_KEY = /^[\w$]+$/;
  /**
   @module @ember/debug
  */

  /**
    Convenience method to inspect an object. This method will attempt to
    convert the object into a useful string description.
  
    It is a pretty simple implementation. If you want something more robust,
    use something like JSDump: https://github.com/NV/jsDump
  
    @method inspect
    @static
    @param {Object} obj The object you want to inspect.
    @return {String} A description of the object
    @since 1.4.0
    @private
  */

  function inspect(obj) {
    // detect Node util.inspect call inspect(depth: number, opts: object)
    if (typeof obj === 'number' && arguments.length === 2) {
      return this;
    }

    return inspectValue(obj, 0);
  }

  function inspectValue(value, depth, seen) {
    let valueIsArray = false;

    switch (typeof value) {
      case 'undefined':
        return 'undefined';

      case 'object':
        if (value === null) return 'null';

        if (isArray(value)) {
          valueIsArray = true;
          break;
        } // is toString Object.prototype.toString or undefined then traverse


        if (value.toString === objectToString || value.toString === undefined) {
          break;
        } // custom toString


        return value.toString();

      case 'function':
        return value.toString === functionToString ? value.name ? "[Function:" + value.name + "]" : "[Function]" : value.toString();

      case 'string':
        return stringify(value);

      case 'symbol':
      case 'boolean':
      case 'number':
      default:
        return value.toString();
    }

    if (seen === undefined) {
      seen = new _polyfills._WeakSet();
    } else {
      if (seen.has(value)) return "[Circular]";
    }

    seen.add(value);
    return valueIsArray ? inspectArray(value, depth + 1, seen) : inspectObject(value, depth + 1, seen);
  }

  function inspectKey(key) {
    return SAFE_KEY.test(key) ? key : stringify(key);
  }

  function inspectObject(obj, depth, seen) {
    if (depth > DEPTH_LIMIT) {
      return '[Object]';
    }

    let s = '{';
    let keys = objectKeys(obj);

    for (let i = 0; i < keys.length; i++) {
      s += i === 0 ? ' ' : ', ';

      if (i >= LIST_LIMIT) {
        s += "... " + (keys.length - LIST_LIMIT) + " more keys";
        break;
      }

      let key = keys[i];
      s += inspectKey(key) + ': ' + inspectValue(obj[key], depth, seen);
    }

    s += ' }';
    return s;
  }

  function inspectArray(arr, depth, seen) {
    if (depth > DEPTH_LIMIT) {
      return '[Array]';
    }

    let s = '[';

    for (let i = 0; i < arr.length; i++) {
      s += i === 0 ? ' ' : ', ';

      if (i >= LIST_LIMIT) {
        s += "... " + (arr.length - LIST_LIMIT) + " more items";
        break;
      }

      s += inspectValue(arr[i], depth, seen);
    }

    s += ' ]';
    return s;
  }

  function lookupDescriptor(obj, keyName) {
    let current = obj;

    do {
      let descriptor = Object.getOwnPropertyDescriptor(current, keyName);

      if (descriptor !== undefined) {
        return descriptor;
      }

      current = Object.getPrototypeOf(current);
    } while (current !== null);

    return null;
  }
  /**
    Checks to see if the `methodName` exists on the `obj`.
  
    ```javascript
    let foo = { bar: function() { return 'bar'; }, baz: null };
  
    Ember.canInvoke(foo, 'bar'); // true
    Ember.canInvoke(foo, 'baz'); // false
    Ember.canInvoke(foo, 'bat'); // false
    ```
  
    @method canInvoke
    @for Ember
    @param {Object} obj The object to check for the method
    @param {String} methodName The method name to check for
    @return {Boolean}
    @private
  */


  function canInvoke(obj, methodName) {
    return obj !== null && obj !== undefined && typeof obj[methodName] === 'function';
  }
  /**
    @module @ember/utils
  */

  /**
    Checks to see if the `methodName` exists on the `obj`,
    and if it does, invokes it with the arguments passed.
  
    ```javascript
    import { tryInvoke } from '@ember/utils';
  
    let d = new Date('03/15/2013');
  
    tryInvoke(d, 'getTime');              // 1363320000000
    tryInvoke(d, 'setFullYear', [2014]);  // 1394856000000
    tryInvoke(d, 'noSuchMethod', [2014]); // undefined
    ```
  
    @method tryInvoke
    @for @ember/utils
    @static
    @param {Object} obj The object to check for the method
    @param {String} methodName The method name to check for
    @param {Array} [args] The arguments to pass to the method
    @return {*} the return value of the invoked method or undefined if it cannot be invoked
    @public
  */


  function tryInvoke(obj, methodName, args) {
    if (canInvoke(obj, methodName)) {
      let method = obj[methodName];
      return method.apply(obj, args);
    }
  }

  const {
    isArray: isArray$1
  } = Array;

  function makeArray(obj) {
    if (obj === null || obj === undefined) {
      return [];
    }

    return isArray$1(obj) ? obj : [obj];
  }

  const NAMES = new WeakMap();

  function setName(obj, name) {
    if (isObject(obj)) NAMES.set(obj, name);
  }

  function getName(obj) {
    return NAMES.get(obj);
  }

  const objectToString$1 = Object.prototype.toString;

  function isNone(obj) {
    return obj === null || obj === undefined;
  }
  /*
   A `toString` util function that supports objects without a `toString`
   method, e.g. an object created with `Object.create(null)`.
  */


  function toString(obj) {
    if (typeof obj === 'string') {
      return obj;
    }

    if (null === obj) return 'null';
    if (undefined === obj) return 'undefined';

    if (Array.isArray(obj)) {
      // Reimplement Array.prototype.join according to spec (22.1.3.13)
      // Changing ToString(element) with this safe version of ToString.
      let r = '';

      for (let k = 0; k < obj.length; k++) {
        if (k > 0) {
          r += ',';
        }

        if (!isNone(obj[k])) {
          r += toString(obj[k]);
        }
      }

      return r;
    }

    if (typeof obj.toString === 'function') {
      return obj.toString();
    }

    return objectToString$1.call(obj);
  }

  const HAS_NATIVE_SYMBOL = function () {
    if (typeof Symbol !== 'function') {
      return false;
    } // use `Object`'s `.toString` directly to prevent us from detecting
    // polyfills as native


    return Object.prototype.toString.call(Symbol()) === '[object Symbol]';
  }();

  _exports.HAS_NATIVE_SYMBOL = HAS_NATIVE_SYMBOL;
  const HAS_NATIVE_PROXY = typeof Proxy === 'function';
  _exports.HAS_NATIVE_PROXY = HAS_NATIVE_PROXY;
  const PROXIES = new _polyfills._WeakSet();

  function isProxy(value) {
    if (isObject(value)) {
      return PROXIES.has(value);
    }

    return false;
  }

  function setProxy(object) {
    if (isObject(object)) {
      PROXIES.add(object);
    }
  }

  class Cache {
    constructor(limit, func, store) {
      this.limit = limit;
      this.func = func;
      this.store = store;
      this.size = 0;
      this.misses = 0;
      this.hits = 0;
      this.store = store || new Map();
    }

    get(key) {
      if (this.store.has(key)) {
        this.hits++;
        return this.store.get(key);
      } else {
        this.misses++;
        return this.set(key, this.func(key));
      }
    }

    set(key, value) {
      if (this.limit > this.size) {
        this.size++;
        this.store.set(key, value);
      }

      return value;
    }

    purge() {
      this.store.clear();
      this.size = 0;
      this.hits = 0;
      this.misses = 0;
    }

  }

  _exports.Cache = Cache;
  const EMBER_ARRAY = symbol('EMBER_ARRAY');
  _exports.EMBER_ARRAY = EMBER_ARRAY;

  function isEmberArray(obj) {
    return obj && obj[EMBER_ARRAY];
  }

  let setupMandatorySetter;
  _exports.setupMandatorySetter = setupMandatorySetter;
  let teardownMandatorySetter;
  _exports.teardownMandatorySetter = teardownMandatorySetter;
  let setWithMandatorySetter;
  _exports.setWithMandatorySetter = setWithMandatorySetter;

  if (false
  /* DEBUG */
  && true
  /* EMBER_METAL_TRACKED_PROPERTIES */
  ) {
      let MANDATORY_SETTERS = new WeakMap();

      let getPropertyDescriptor = function (obj, keyName) {
        let current = obj;

        while (current !== null) {
          let desc = Object.getOwnPropertyDescriptor(current, keyName);

          if (desc !== undefined) {
            return desc;
          }

          current = Object.getPrototypeOf(current);
        }

        return;
      };

      let propertyIsEnumerable = function (obj, key) {
        return Object.prototype.propertyIsEnumerable.call(obj, key);
      };

      _exports.setupMandatorySetter = setupMandatorySetter = function (obj, keyName) {
        let desc = getPropertyDescriptor(obj, keyName) || {};

        if (desc.get || desc.set) {
          // if it has a getter or setter, we can't install the mandatory setter.
          // native setters are allowed, we have to assume that they will resolve
          // to tracked properties.
          return;
        }

        if (desc && (!desc.configurable || !desc.writable)) {
          // if it isn't writable anyways, so we shouldn't provide the setter.
          // if it isn't configurable, we can't overwrite it anyways.
          return;
        }

        let setters = MANDATORY_SETTERS.get(obj);

        if (setters === undefined) {
          setters = {};
          MANDATORY_SETTERS.set(obj, setters);
        }

        desc.hadOwnProperty = Object.hasOwnProperty.call(obj, keyName);
        setters[keyName] = desc;
        Object.defineProperty(obj, keyName, {
          configurable: true,
          enumerable: propertyIsEnumerable(obj, keyName),

          get() {
            if (desc.get) {
              return desc.get.call(this);
            } else {
              return desc.value;
            }
          },

          set(value) {
            false && !false && (0, _debug.assert)("You attempted to update " + this + "." + String(keyName) + " to \"" + String(value) + "\", but it is being tracked by a tracking context, such as a template, computed property, or observer. In order to make sure the context updates properly, you must invalidate the property when updating it. You can mark the property as `@tracked`, or use `@ember/object#set` to do this.");
          }

        });
      };

      _exports.teardownMandatorySetter = teardownMandatorySetter = function (obj, keyName) {
        let setters = MANDATORY_SETTERS.get(obj);

        if (setters !== undefined && setters[keyName] !== undefined) {
          Object.defineProperty(obj, keyName, setters[keyName]);
          setters[keyName] = undefined;
        }
      };

      _exports.setWithMandatorySetter = setWithMandatorySetter = function (obj, keyName, value) {
        let setters = MANDATORY_SETTERS.get(obj);

        if (setters !== undefined && setters[keyName] !== undefined) {
          let setter = setters[keyName];

          if (setter.set) {
            setter.set.call(obj, value);
          } else {
            setter.value = value; // If the object didn't have own property before, it would have changed
            // the enumerability after setting the value the first time.

            if (!setter.hadOwnProperty) {
              let desc = getPropertyDescriptor(obj, keyName);
              desc.enumerable = true;
              Object.defineProperty(obj, keyName, desc);
            }
          }
        } else {
          obj[keyName] = value;
        }
      };
    }
  /*
   This package will be eagerly parsed and should have no dependencies on external
   packages.
  
   It is intended to be used to share utility methods that will be needed
   by every Ember application (and is **not** a dumping ground of useful utilities).
  
   Utility methods that are needed in < 80% of cases should be placed
   elsewhere (so they can be lazily evaluated / parsed).
  */

});
enifed("@ember/error/index", ["exports"], function (_exports) {
  "use strict";

  _exports.default = void 0;

  /**
   @module @ember/error
  */

  /**
    The JavaScript Error object used by Ember.assert.
  
    @class Error
    @namespace Ember
    @extends Error
    @constructor
    @public
  */
  var _default = Error;
  _exports.default = _default;
});
enifed("@ember/instrumentation/index", ["exports", "@ember/-internals/environment", "@ember/canary-features"], function (_exports, _environment, _canaryFeatures) {
  "use strict";

  _exports.instrument = instrument;
  _exports._instrumentStart = _instrumentStart;
  _exports.subscribe = subscribe;
  _exports.unsubscribe = unsubscribe;
  _exports.reset = reset;
  _exports.flaggedInstrument = _exports.subscribers = void 0;

  /* eslint no-console:off */

  /* global console */

  /**
  @module @ember/instrumentation
  @private
  */

  /**
    The purpose of the Ember Instrumentation module is
    to provide efficient, general-purpose instrumentation
    for Ember.
  
    Subscribe to a listener by using `subscribe`:
  
    ```javascript
    import { subscribe } from '@ember/instrumentation';
  
    subscribe("render", {
      before(name, timestamp, payload) {
  
      },
  
      after(name, timestamp, payload) {
  
      }
    });
    ```
  
    If you return a value from the `before` callback, that same
    value will be passed as a fourth parameter to the `after`
    callback.
  
    Instrument a block of code by using `instrument`:
  
    ```javascript
    import { instrument } from '@ember/instrumentation';
  
    instrument("render.handlebars", payload, function() {
      // rendering logic
    }, binding);
    ```
  
    Event names passed to `instrument` are namespaced
    by periods, from more general to more specific. Subscribers
    can listen for events by whatever level of granularity they
    are interested in.
  
    In the above example, the event is `render.handlebars`,
    and the subscriber listened for all events beginning with
    `render`. It would receive callbacks for events named
    `render`, `render.handlebars`, `render.container`, or
    even `render.handlebars.layout`.
  
    @class Instrumentation
    @static
    @private
  */
  let subscribers = [];
  _exports.subscribers = subscribers;
  let cache = {};

  function populateListeners(name) {
    let listeners = [];
    let subscriber;

    for (let i = 0; i < subscribers.length; i++) {
      subscriber = subscribers[i];

      if (subscriber.regex.test(name)) {
        listeners.push(subscriber.object);
      }
    }

    cache[name] = listeners;
    return listeners;
  }

  const time = (() => {
    let perf = 'undefined' !== typeof window ? window.performance || {} : {};
    let fn = perf.now || perf.mozNow || perf.webkitNow || perf.msNow || perf.oNow;
    return fn ? fn.bind(perf) : Date.now;
  })();

  function isCallback(value) {
    return typeof value === 'function';
  }

  function instrument(name, p1, p2, p3) {
    let _payload;

    let callback;
    let binding;

    if (arguments.length <= 3 && isCallback(p1)) {
      callback = p1;
      binding = p2;
    } else {
      _payload = p1;
      callback = p2;
      binding = p3;
    } // fast path


    if (subscribers.length === 0) {
      return callback.call(binding);
    } // avoid allocating the payload in fast path


    let payload = _payload || {};

    let finalizer = _instrumentStart(name, () => payload);

    if (finalizer === NOOP) {
      return callback.call(binding);
    } else {
      return withFinalizer(callback, finalizer, payload, binding);
    }
  }

  let flaggedInstrument;
  _exports.flaggedInstrument = flaggedInstrument;

  if (_canaryFeatures.EMBER_IMPROVED_INSTRUMENTATION) {
    _exports.flaggedInstrument = flaggedInstrument = instrument;
  } else {
    _exports.flaggedInstrument = flaggedInstrument = function instrument(_name, _payload, callback) {
      return callback();
    };
  }

  function withFinalizer(callback, finalizer, payload, binding) {
    try {
      return callback.call(binding);
    } catch (e) {
      payload.exception = e;
      throw e;
    } finally {
      finalizer();
    }
  }

  function NOOP() {}

  function _instrumentStart(name, payloadFunc, payloadArg) {
    if (subscribers.length === 0) {
      return NOOP;
    }

    let listeners = cache[name];

    if (!listeners) {
      listeners = populateListeners(name);
    }

    if (listeners.length === 0) {
      return NOOP;
    }

    let payload = payloadFunc(payloadArg);
    let STRUCTURED_PROFILE = _environment.ENV.STRUCTURED_PROFILE;
    let timeName;

    if (STRUCTURED_PROFILE) {
      timeName = name + ": " + payload.object;
      console.time(timeName);
    }

    let beforeValues = [];
    let timestamp = time();

    for (let i = 0; i < listeners.length; i++) {
      let listener = listeners[i];
      beforeValues.push(listener.before(name, timestamp, payload));
    }

    return function _instrumentEnd() {
      let timestamp = time();

      for (let i = 0; i < listeners.length; i++) {
        let listener = listeners[i];

        if (typeof listener.after === 'function') {
          listener.after(name, timestamp, payload, beforeValues[i]);
        }
      }

      if (STRUCTURED_PROFILE) {
        console.timeEnd(timeName);
      }
    };
  }
  /**
    Subscribes to a particular event or instrumented block of code.
  
    @method subscribe
    @for @ember/instrumentation
    @static
  
    @param {String} [pattern] Namespaced event name.
    @param {Object} [object] Before and After hooks.
  
    @return {Subscriber}
    @private
  */


  function subscribe(pattern, object) {
    let paths = pattern.split('.');
    let path;
    let regexes = [];

    for (let i = 0; i < paths.length; i++) {
      path = paths[i];

      if (path === '*') {
        regexes.push('[^\\.]*');
      } else {
        regexes.push(path);
      }
    }

    let regex = regexes.join('\\.');
    regex = regex + "(\\..*)?";
    let subscriber = {
      pattern,
      regex: new RegExp("^" + regex + "$"),
      object
    };
    subscribers.push(subscriber);
    cache = {};
    return subscriber;
  }
  /**
    Unsubscribes from a particular event or instrumented block of code.
  
    @method unsubscribe
    @for @ember/instrumentation
    @static
  
    @param {Object} [subscriber]
    @private
  */


  function unsubscribe(subscriber) {
    let index = 0;

    for (let i = 0; i < subscribers.length; i++) {
      if (subscribers[i] === subscriber) {
        index = i;
      }
    }

    subscribers.splice(index, 1);
    cache = {};
  }
  /**
    Resets `Instrumentation` by flushing list of subscribers.
  
    @method reset
    @for @ember/instrumentation
    @static
    @private
  */


  function reset() {
    subscribers.length = 0;
    cache = {};
  }
});
enifed("@ember/modifier/index", ["exports", "@ember/-internals/glimmer"], function (_exports, _glimmer) {
  "use strict";

  Object.defineProperty(_exports, "setModifierManager", {
    enumerable: true,
    get: function () {
      return _glimmer.setModifierManager;
    }
  });
  Object.defineProperty(_exports, "capabilties", {
    enumerable: true,
    get: function () {
      return _glimmer.modifierCapabilties;
    }
  });
});
enifed("@ember/object/index", ["exports", "@ember/debug", "@ember/polyfills", "@ember/-internals/metal"], function (_exports, _debug, _polyfills, _metal) {
  "use strict";

  _exports.action = void 0;

  /**
    Decorator that turns the target function into an Action which can be accessed
    directly by reference.
  
    ```js
    import Component from '@ember/component';
    import { action, set } from '@ember/object';
  
    export default class Tooltip extends Component {
      @action
      toggleShowing() {
        set(this, 'isShowing', !this.isShowing);
      }
    }
    ```
    ```hbs
    <!-- template.hbs -->
    <button {{action this.toggleShowing}}>Show tooltip</button>
  
    {{#if isShowing}}
      <div class="tooltip">
        I'm a tooltip!
      </div>
    {{/if}}
    ```
  
    Decorated actions also interop with the string style template actions:
  
    ```hbs
    <!-- template.hbs -->
    <button {{action "toggleShowing"}}>Show tooltip</button>
  
    {{#if isShowing}}
      <div class="tooltip">
        I'm a tooltip!
      </div>
    {{/if}}
    ```
  
    It also binds the function directly to the instance, so it can be used in any
    context and will correctly refer to the class it came from:
  
    ```hbs
    <!-- template.hbs -->
    <button
      {{did-insert this.toggleShowing}}
      {{on "click" this.toggleShowing}}
    >
      Show tooltip
    </button>
  
    {{#if isShowing}}
      <div class="tooltip">
        I'm a tooltip!
      </div>
    {{/if}}
    ```
  
    This can also be used in JavaScript code directly:
  
    ```js
    import Component from '@ember/component';
    import { action, set } from '@ember/object';
  
    export default class Tooltip extends Component {
      constructor() {
        super(...arguments);
  
        // this.toggleShowing is still bound correctly when added to
        // the event listener
        document.addEventListener('click', this.toggleShowing);
      }
  
      @action
      toggleShowing() {
        set(this, 'isShowing', !this.isShowing);
      }
    }
    ```
  
    This is considered best practice, since it means that methods will be bound
    correctly no matter where they are used. By contrast, the `{{action}}` helper
    and modifier can also be used to bind context, but it will be required for
    every usage of the method:
  
    ```hbs
    <!-- template.hbs -->
    <button
      {{did-insert (action this.toggleShowing)}}
      {{on "click" (action this.toggleShowing)}}
    >
      Show tooltip
    </button>
  
    {{#if isShowing}}
      <div class="tooltip">
        I'm a tooltip!
      </div>
    {{/if}}
    ```
  
    They also do not have equivalents in JavaScript directly, so they cannot be
    used for other situations where binding would be useful.
  
    @method action
    @category EMBER_NATIVE_DECORATOR_SUPPORT
    @for @ember/object
    @static
    @param {} elementDesc the descriptor of the element to decorate
    @return {ElementDescriptor} the decorated descriptor
    @private
  */
  let action;
  _exports.action = action;

  if (true
  /* EMBER_NATIVE_DECORATOR_SUPPORT */
  ) {
      let BINDINGS_MAP = new WeakMap();

      let setupAction = function (target, key, actionFn) {
        if (target.constructor !== undefined && typeof target.constructor.proto === 'function') {
          target.constructor.proto();
        }

        if (!target.hasOwnProperty('actions')) {
          let parentActions = target.actions; // we need to assign because of the way mixins copy actions down when inheriting

          target.actions = parentActions ? (0, _polyfills.assign)({}, parentActions) : {};
        }

        target.actions[key] = actionFn;
        return {
          get() {
            let bindings = BINDINGS_MAP.get(this);

            if (bindings === undefined) {
              bindings = new Map();
              BINDINGS_MAP.set(this, bindings);
            }

            let fn = bindings.get(actionFn);

            if (fn === undefined) {
              fn = actionFn.bind(this);
              bindings.set(actionFn, fn);
            }

            return fn;
          }

        };
      };

      _exports.action = action = function action(target, key, desc) {
        let actionFn;

        actionFn = desc.value;
        false && !(typeof actionFn === 'function') && (0, _debug.assert)('The @action decorator must be applied to methods when used in native classes', typeof actionFn === 'function');
        return setupAction(target, key, actionFn);
      };
    }
});
enifed("@ember/polyfills/index", ["exports", "@ember/deprecated-features", "@ember/polyfills/lib/merge", "@ember/polyfills/lib/assign", "@ember/polyfills/lib/weak_set"], function (_exports, _deprecatedFeatures, _merge, _assign, _weak_set) {
  "use strict";
  Object.defineProperty(_exports, "_WeakSet", {
    enumerable: true,
    get: function () {
      return _weak_set.default;
    }
  });
  _exports.merge = void 0;
  let merge = _deprecatedFeatures.MERGE ? _merge.default : undefined; // Export `assignPolyfill` for testing

  _exports.merge = merge;
});

enifed("@ember/polyfills/lib/weak_set", ["exports"], function (_exports) {
  "use strict";

  _exports.default = void 0;

  /* globals WeakSet */
  var _default = typeof WeakSet === 'function' ? WeakSet : class WeakSetPolyFill {
    constructor() {
      this._map = new WeakMap();
    }

    add(val) {
      this._map.set(val, true);

      return this;
    }

    delete(val) {
      return this._map.delete(val);
    }

    has(val) {
      return this._map.has(val);
    }

  };

  _exports.default = _default;
});
enifed("@ember/runloop/index", ["exports", "@ember/debug", "@ember/-internals/error-handling", "@ember/-internals/metal", "backburner"], function (_exports, _debug, _errorHandling, _metal, _backburner) {
  "use strict";

  _exports.getCurrentRunLoop = getCurrentRunLoop;
  _exports.run = run;
  _exports.join = join;
  _exports.begin = begin;
  _exports.end = end;
  _exports.schedule = schedule;
  _exports.hasScheduledTimers = hasScheduledTimers;
  _exports.cancelTimers = cancelTimers;
  _exports.later = later;
  _exports.once = once;
  _exports.scheduleOnce = scheduleOnce;
  _exports.next = next;
  _exports.cancel = cancel;
  _exports.debounce = debounce;
  _exports.throttle = throttle;
  _exports.bind = _exports._globalsRun = _exports.backburner = _exports.queues = _exports._rsvpErrorQueue = void 0;
  let currentRunLoop = null;

  function getCurrentRunLoop() {
    return currentRunLoop;
  }

  function onBegin(current) {
    currentRunLoop = current;
  }

  function onEnd(current, next) {
    currentRunLoop = next;
  }

  const _rsvpErrorQueue = ("" + Math.random() + Date.now()).replace('.', '');
  /**
    Array of named queues. This array determines the order in which queues
    are flushed at the end of the RunLoop. You can define your own queues by
    simply adding the queue name to this array. Normally you should not need
    to inspect or modify this property.
  
    @property queues
    @type Array
    @default ['actions', 'destroy']
    @private
  */


  _exports._rsvpErrorQueue = _rsvpErrorQueue;
  const queues = ['actions', // used in router transitions to prevent unnecessary loading state entry
  // if all context promises resolve on the 'actions' queue first
  'routerTransitions', 'render', 'afterRender', 'destroy', // used to re-throw unhandled RSVP rejection errors specifically in this
  // position to avoid breaking anything rendered in the other sections
  _rsvpErrorQueue];
  _exports.queues = queues;
  const backburner = new _backburner.default(queues, {
    defaultQueue: 'actions',
    onBegin,
    onEnd,
    onErrorTarget: _errorHandling.onErrorTarget,
    onErrorMethod: 'onerror',
    flush
  });
  /**
   @module @ember/runloop
  */
  // ..........................................................
  // run - this is ideally the only public API the dev sees
  //

  /**
    Runs the passed target and method inside of a RunLoop, ensuring any
    deferred actions including bindings and views updates are flushed at the
    end.
  
    Normally you should not need to invoke this method yourself. However if
    you are implementing raw event handlers when interfacing with other
    libraries or plugins, you should probably wrap all of your code inside this
    call.
  
    ```javascript
    import { run } from '@ember/runloop';
  
    run(function() {
      // code to be executed within a RunLoop
    });
    ```
    @method run
    @for @ember/runloop
    @static
    @param {Object} [target] target of method to call
    @param {Function|String} method Method to invoke.
      May be a function or a string. If you pass a string
      then it will be looked up on the passed target.
    @param {Object} [args*] Any additional arguments you wish to pass to the method.
    @return {Object} return value from invoking the passed function.
    @public
  */

  _exports.backburner = backburner;

  function run() {
    return backburner.run(...arguments);
  } // used for the Ember.run global only


  const _globalsRun = run.bind(null);
  /**
    If no run-loop is present, it creates a new one. If a run loop is
    present it will queue itself to run on the existing run-loops action
    queue.
  
    Please note: This is not for normal usage, and should be used sparingly.
  
    If invoked when not within a run loop:
  
    ```javascript
    import { join } from '@ember/runloop';
  
    join(function() {
      // creates a new run-loop
    });
    ```
  
    Alternatively, if called within an existing run loop:
  
    ```javascript
    import { run, join } from '@ember/runloop';
  
    run(function() {
      // creates a new run-loop
  
      join(function() {
        // joins with the existing run-loop, and queues for invocation on
        // the existing run-loops action queue.
      });
    });
    ```
  
    @method join
    @static
    @for @ember/runloop
    @param {Object} [target] target of method to call
    @param {Function|String} method Method to invoke.
      May be a function or a string. If you pass a string
      then it will be looked up on the passed target.
    @param {Object} [args*] Any additional arguments you wish to pass to the method.
    @return {Object} Return value from invoking the passed function. Please note,
    when called within an existing loop, no return value is possible.
    @public
  */


  _exports._globalsRun = _globalsRun;

  function join() {
    return backburner.join(...arguments);
  }
  /**
    Allows you to specify which context to call the specified function in while
    adding the execution of that function to the Ember run loop. This ability
    makes this method a great way to asynchronously integrate third-party libraries
    into your Ember application.
  
    `bind` takes two main arguments, the desired context and the function to
    invoke in that context. Any additional arguments will be supplied as arguments
    to the function that is passed in.
  
    Let's use the creation of a TinyMCE component as an example. Currently,
    TinyMCE provides a setup configuration option we can use to do some processing
    after the TinyMCE instance is initialized but before it is actually rendered.
    We can use that setup option to do some additional setup for our component.
    The component itself could look something like the following:
  
    ```app/components/rich-text-editor.js
    import Component from '@ember/component';
    import { on } from '@ember/object/evented';
    import { bind } from '@ember/runloop';
  
    export default Component.extend({
      initializeTinyMCE: on('didInsertElement', function() {
        tinymce.init({
          selector: '#' + this.$().prop('id'),
          setup: bind(this, this.setupEditor)
        });
      }),
  
      didInsertElement() {
        tinymce.init({
          selector: '#' + this.$().prop('id'),
          setup: bind(this, this.setupEditor)
        });
      }
  
      setupEditor(editor) {
        this.set('editor', editor);
  
        editor.on('change', function() {
          console.log('content changed!');
        });
      }
    });
    ```
  
    In this example, we use `bind` to bind the setupEditor method to the
    context of the RichTextEditor component and to have the invocation of that
    method be safely handled and executed by the Ember run loop.
  
    @method bind
    @static
    @for @ember/runloop
    @param {Object} [target] target of method to call
    @param {Function|String} method Method to invoke.
      May be a function or a string. If you pass a string
      then it will be looked up on the passed target.
    @param {Object} [args*] Any additional arguments you wish to pass to the method.
    @return {Function} returns a new function that will always have a particular context
    @since 1.4.0
    @public
  */


  const bind = (...curried) => {
    false && !function (methodOrTarget, methodOrArg) {
      // Applies the same logic as backburner parseArgs for detecting if a method
      // is actually being passed.
      let length = arguments.length;

      if (length === 0) {
        return false;
      } else if (length === 1) {
        return typeof methodOrTarget === 'function';
      } else {
        let type = typeof methodOrArg;
        return type === 'function' || // second argument is a function
        methodOrTarget !== null && type === 'string' && methodOrArg in methodOrTarget || // second argument is the name of a method in first argument
        typeof methodOrTarget === 'function' //first argument is a function
        ;
      }
    }(...curried) && (0, _debug.assert)('could not find a suitable method to bind', function (methodOrTarget, methodOrArg) {
      let length = arguments.length;

      if (length === 0) {
        return false;
      } else if (length === 1) {
        return typeof methodOrTarget === 'function';
      } else {
        let type = typeof methodOrArg;
        return type === 'function' || methodOrTarget !== null && type === 'string' && methodOrArg in methodOrTarget || typeof methodOrTarget === 'function';
      }
    }(...curried));
    return (...args) => join(...curried.concat(args));
  };
  /**
    Begins a new RunLoop. Any deferred actions invoked after the begin will
    be buffered until you invoke a matching call to `end()`. This is
    a lower-level way to use a RunLoop instead of using `run()`.
  
    ```javascript
    import { begin, end } from '@ember/runloop';
  
    begin();
    // code to be executed within a RunLoop
    end();
    ```
  
    @method begin
    @static
    @for @ember/runloop
    @return {void}
    @public
  */


  _exports.bind = bind;

  function begin() {
    backburner.begin();
  }
  /**
    Ends a RunLoop. This must be called sometime after you call
    `begin()` to flush any deferred actions. This is a lower-level way
    to use a RunLoop instead of using `run()`.
  
    ```javascript
    import { begin, end } from '@ember/runloop';
  
    begin();
    // code to be executed within a RunLoop
    end();
    ```
  
    @method end
    @static
    @for @ember/runloop
    @return {void}
    @public
  */


  function end() {
    backburner.end();
  }
  /**
    Adds the passed target/method and any optional arguments to the named
    queue to be executed at the end of the RunLoop. If you have not already
    started a RunLoop when calling this method one will be started for you
    automatically.
  
    At the end of a RunLoop, any methods scheduled in this way will be invoked.
    Methods will be invoked in an order matching the named queues defined in
    the `queues` property.
  
    ```javascript
    import { schedule } from '@ember/runloop';
  
    schedule('afterRender', this, function() {
      // this will be executed in the 'afterRender' queue
      console.log('scheduled on afterRender queue');
    });
  
    schedule('actions', this, function() {
      // this will be executed in the 'actions' queue
      console.log('scheduled on actions queue');
    });
  
    // Note the functions will be run in order based on the run queues order.
    // Output would be:
    //   scheduled on actions queue
    //   scheduled on afterRender queue
    ```
  
    @method schedule
    @static
    @for @ember/runloop
    @param {String} queue The name of the queue to schedule against. Default queues is 'actions'
    @param {Object} [target] target object to use as the context when invoking a method.
    @param {String|Function} method The method to invoke. If you pass a string it
      will be resolved on the target object at the time the scheduled item is
      invoked allowing you to change the target function.
    @param {Object} [arguments*] Optional arguments to be passed to the queued method.
    @return {*} Timer information for use in canceling, see `cancel`.
    @public
  */


  function schedule()
  /* queue, target, method */
  {
    return backburner.schedule(...arguments);
  } // Used by global test teardown


  function hasScheduledTimers() {
    return backburner.hasTimers();
  } // Used by global test teardown


  function cancelTimers() {
    backburner.cancelTimers();
  }
  /**
    Invokes the passed target/method and optional arguments after a specified
    period of time. The last parameter of this method must always be a number
    of milliseconds.
  
    You should use this method whenever you need to run some action after a
    period of time instead of using `setTimeout()`. This method will ensure that
    items that expire during the same script execution cycle all execute
    together, which is often more efficient than using a real setTimeout.
  
    ```javascript
    import { later } from '@ember/runloop';
  
    later(myContext, function() {
      // code here will execute within a RunLoop in about 500ms with this == myContext
    }, 500);
    ```
  
    @method later
    @static
    @for @ember/runloop
    @param {Object} [target] target of method to invoke
    @param {Function|String} method The method to invoke.
      If you pass a string it will be resolved on the
      target at the time the method is invoked.
    @param {Object} [args*] Optional arguments to pass to the timeout.
    @param {Number} wait Number of milliseconds to wait.
    @return {*} Timer information for use in canceling, see `cancel`.
    @public
  */


  function later()
  /*target, method*/
  {
    return backburner.later(...arguments);
  }
  /**
   Schedule a function to run one time during the current RunLoop. This is equivalent
    to calling `scheduleOnce` with the "actions" queue.
  
    @method once
    @static
    @for @ember/runloop
    @param {Object} [target] The target of the method to invoke.
    @param {Function|String} method The method to invoke.
      If you pass a string it will be resolved on the
      target at the time the method is invoked.
    @param {Object} [args*] Optional arguments to pass to the timeout.
    @return {Object} Timer information for use in canceling, see `cancel`.
    @public
  */


  function once(...args) {
    args.unshift('actions');
    return backburner.scheduleOnce(...args);
  }
  /**
    Schedules a function to run one time in a given queue of the current RunLoop.
    Calling this method with the same queue/target/method combination will have
    no effect (past the initial call).
  
    Note that although you can pass optional arguments these will not be
    considered when looking for duplicates. New arguments will replace previous
    calls.
  
    ```javascript
    import { run, scheduleOnce } from '@ember/runloop';
  
    function sayHi() {
      console.log('hi');
    }
  
    run(function() {
      scheduleOnce('afterRender', myContext, sayHi);
      scheduleOnce('afterRender', myContext, sayHi);
      // sayHi will only be executed once, in the afterRender queue of the RunLoop
    });
    ```
  
    Also note that for `scheduleOnce` to prevent additional calls, you need to
    pass the same function instance. The following case works as expected:
  
    ```javascript
    function log() {
      console.log('Logging only once');
    }
  
    function scheduleIt() {
      scheduleOnce('actions', myContext, log);
    }
  
    scheduleIt();
    scheduleIt();
    ```
  
    But this other case will schedule the function multiple times:
  
    ```javascript
    import { scheduleOnce } from '@ember/runloop';
  
    function scheduleIt() {
      scheduleOnce('actions', myContext, function() {
        console.log('Closure');
      });
    }
  
    scheduleIt();
    scheduleIt();
  
    // "Closure" will print twice, even though we're using `scheduleOnce`,
    // because the function we pass to it won't match the
    // previously scheduled operation.
    ```
  
    Available queues, and their order, can be found at `queues`
  
    @method scheduleOnce
    @static
    @for @ember/runloop
    @param {String} [queue] The name of the queue to schedule against. Default queues is 'actions'.
    @param {Object} [target] The target of the method to invoke.
    @param {Function|String} method The method to invoke.
      If you pass a string it will be resolved on the
      target at the time the method is invoked.
    @param {Object} [args*] Optional arguments to pass to the timeout.
    @return {Object} Timer information for use in canceling, see `cancel`.
    @public
  */


  function scheduleOnce()
  /* queue, target, method*/
  {
    return backburner.scheduleOnce(...arguments);
  }
  /**
    Schedules an item to run from within a separate run loop, after
    control has been returned to the system. This is equivalent to calling
    `later` with a wait time of 1ms.
  
    ```javascript
    import { next } from '@ember/runloop';
  
    next(myContext, function() {
      // code to be executed in the next run loop,
      // which will be scheduled after the current one
    });
    ```
  
    Multiple operations scheduled with `next` will coalesce
    into the same later run loop, along with any other operations
    scheduled by `later` that expire right around the same
    time that `next` operations will fire.
  
    Note that there are often alternatives to using `next`.
    For instance, if you'd like to schedule an operation to happen
    after all DOM element operations have completed within the current
    run loop, you can make use of the `afterRender` run loop queue (added
    by the `ember-views` package, along with the preceding `render` queue
    where all the DOM element operations happen).
  
    Example:
  
    ```app/components/my-component.js
    import Component from '@ember/component';
    import { scheduleOnce } from '@ember/runloop';
  
    export Component.extend({
      didInsertElement() {
        this._super(...arguments);
        scheduleOnce('afterRender', this, 'processChildElements');
      },
  
      processChildElements() {
        // ... do something with component's child component
        // elements after they've finished rendering, which
        // can't be done within this component's
        // `didInsertElement` hook because that gets run
        // before the child elements have been added to the DOM.
      }
    });
    ```
  
    One benefit of the above approach compared to using `next` is
    that you will be able to perform DOM/CSS operations before unprocessed
    elements are rendered to the screen, which may prevent flickering or
    other artifacts caused by delaying processing until after rendering.
  
    The other major benefit to the above approach is that `next`
    introduces an element of non-determinism, which can make things much
    harder to test, due to its reliance on `setTimeout`; it's much harder
    to guarantee the order of scheduled operations when they are scheduled
    outside of the current run loop, i.e. with `next`.
  
    @method next
    @static
    @for @ember/runloop
    @param {Object} [target] target of method to invoke
    @param {Function|String} method The method to invoke.
      If you pass a string it will be resolved on the
      target at the time the method is invoked.
    @param {Object} [args*] Optional arguments to pass to the timeout.
    @return {Object} Timer information for use in canceling, see `cancel`.
    @public
  */


  function next(...args) {
    args.push(1);
    return backburner.later(...args);
  }
  /**
    Cancels a scheduled item. Must be a value returned by `later()`,
    `once()`, `scheduleOnce()`, `next()`, `debounce()`, or
    `throttle()`.
  
    ```javascript
    import {
      next,
      cancel,
      later,
      scheduleOnce,
      once,
      throttle,
      debounce
    } from '@ember/runloop';
  
    let runNext = next(myContext, function() {
      // will not be executed
    });
  
    cancel(runNext);
  
    let runLater = later(myContext, function() {
      // will not be executed
    }, 500);
  
    cancel(runLater);
  
    let runScheduleOnce = scheduleOnce('afterRender', myContext, function() {
      // will not be executed
    });
  
    cancel(runScheduleOnce);
  
    let runOnce = once(myContext, function() {
      // will not be executed
    });
  
    cancel(runOnce);
  
    let throttle = throttle(myContext, function() {
      // will not be executed
    }, 1, false);
  
    cancel(throttle);
  
    let debounce = debounce(myContext, function() {
      // will not be executed
    }, 1);
  
    cancel(debounce);
  
    let debounceImmediate = debounce(myContext, function() {
      // will be executed since we passed in true (immediate)
    }, 100, true);
  
    // the 100ms delay until this method can be called again will be canceled
    cancel(debounceImmediate);
    ```
  
    @method cancel
    @static
    @for @ember/runloop
    @param {Object} timer Timer object to cancel
    @return {Boolean} true if canceled or false/undefined if it wasn't found
    @public
  */


  function cancel(timer) {
    return backburner.cancel(timer);
  }
  /**
    Delay calling the target method until the debounce period has elapsed
    with no additional debounce calls. If `debounce` is called again before
    the specified time has elapsed, the timer is reset and the entire period
    must pass again before the target method is called.
  
    This method should be used when an event may be called multiple times
    but the action should only be called once when the event is done firing.
    A common example is for scroll events where you only want updates to
    happen once scrolling has ceased.
  
    ```javascript
    import { debounce } from '@ember/runloop';
  
    function whoRan() {
      console.log(this.name + ' ran.');
    }
  
    let myContext = { name: 'debounce' };
  
    debounce(myContext, whoRan, 150);
  
    // less than 150ms passes
    debounce(myContext, whoRan, 150);
  
    // 150ms passes
    // whoRan is invoked with context myContext
    // console logs 'debounce ran.' one time.
    ```
  
    Immediate allows you to run the function immediately, but debounce
    other calls for this function until the wait time has elapsed. If
    `debounce` is called again before the specified time has elapsed,
    the timer is reset and the entire period must pass again before
    the method can be called again.
  
    ```javascript
    import { debounce } from '@ember/runloop';
  
    function whoRan() {
      console.log(this.name + ' ran.');
    }
  
    let myContext = { name: 'debounce' };
  
    debounce(myContext, whoRan, 150, true);
  
    // console logs 'debounce ran.' one time immediately.
    // 100ms passes
    debounce(myContext, whoRan, 150, true);
  
    // 150ms passes and nothing else is logged to the console and
    // the debouncee is no longer being watched
    debounce(myContext, whoRan, 150, true);
  
    // console logs 'debounce ran.' one time immediately.
    // 150ms passes and nothing else is logged to the console and
    // the debouncee is no longer being watched
    ```
  
    @method debounce
    @static
    @for @ember/runloop
    @param {Object} [target] target of method to invoke
    @param {Function|String} method The method to invoke.
      May be a function or a string. If you pass a string
      then it will be looked up on the passed target.
    @param {Object} [args*] Optional arguments to pass to the timeout.
    @param {Number} wait Number of milliseconds to wait.
    @param {Boolean} immediate Trigger the function on the leading instead
      of the trailing edge of the wait interval. Defaults to false.
    @return {Array} Timer information for use in canceling, see `cancel`.
    @public
  */


  function debounce() {
    return backburner.debounce(...arguments);
  }
  /**
    Ensure that the target method is never called more frequently than
    the specified spacing period. The target method is called immediately.
  
    ```javascript
    import { throttle } from '@ember/runloop';
  
    function whoRan() {
      console.log(this.name + ' ran.');
    }
  
    let myContext = { name: 'throttle' };
  
    throttle(myContext, whoRan, 150);
    // whoRan is invoked with context myContext
    // console logs 'throttle ran.'
  
    // 50ms passes
    throttle(myContext, whoRan, 150);
  
    // 50ms passes
    throttle(myContext, whoRan, 150);
  
    // 150ms passes
    throttle(myContext, whoRan, 150);
    // whoRan is invoked with context myContext
    // console logs 'throttle ran.'
    ```
  
    @method throttle
    @static
    @for @ember/runloop
    @param {Object} [target] target of method to invoke
    @param {Function|String} method The method to invoke.
      May be a function or a string. If you pass a string
      then it will be looked up on the passed target.
    @param {Object} [args*] Optional arguments to pass to the timeout.
    @param {Number} spacing Number of milliseconds to space out requests.
    @param {Boolean} immediate Trigger the function on the leading instead
      of the trailing edge of the wait interval. Defaults to true.
    @return {Array} Timer information for use in canceling, see `cancel`.
    @public
  */


  function throttle() {
    return backburner.throttle(...arguments);
  }
});
enifed("@ember/service/index", ["exports", "@ember/-internals/runtime", "@ember/-internals/metal"], function (_exports, _runtime, _metal) {
  "use strict";

  _exports.inject = inject;
  _exports.default = void 0;

  /**
   @module @ember/service
   @public
   */

  /**
    Creates a property that lazily looks up a service in the container. There are
    no restrictions as to what objects a service can be injected into.
  
    Example:
  
    ```app/routes/application.js
    import Route from '@ember/routing/route';
    import { inject as service } from '@ember/service';
  
    export default class ApplicationRoute extends Route {
      @service('auth') authManager;
  
      model() {
        return this.authManager.findCurrentUser();
      }
    }
    ```
  
    Classic Class Example:
  
    ```app/routes/application.js
    import Route from '@ember/routing/route';
    import { inject as service } from '@ember/service';
  
    export default Route.extend({
      authManager: service('auth'),
  
      model() {
        return this.get('authManager').findCurrentUser();
      }
    });
    ```
  
    This example will create an `authManager` property on the application route
    that looks up the `auth` service in the container, making it easily accessible
    in the `model` hook.
  
    @method inject
    @static
    @since 1.10.0
    @for @ember/service
    @param {String} name (optional) name of the service to inject, defaults to
           the property's name
    @return {ComputedDecorator} injection decorator instance
    @public
  */
  function inject() {
    return (0, _metal.inject)('service', ...arguments);
  }
  /**
    @class Service
    @extends EmberObject
    @since 1.10.0
    @public
  */


  const Service = _runtime.FrameworkObject.extend();

  Service.reopenClass({
    isServiceFactory: true
  });

  if (true
  /* EMBER_FRAMEWORK_OBJECT_OWNER_ARGUMENT */
  ) {
      (0, _runtime.setFrameworkClass)(Service);
    }

  var _default = Service;
  _exports.default = _default;
});
enifed("@glimmer/encoder", ["exports"], function (_exports) {
  "use strict";

  _exports.InstructionEncoder = void 0;

  class InstructionEncoder {
    constructor(buffer) {
      this.buffer = buffer;
      this.typePos = 0;
      this.size = 0;
    }

    encode(type, machine) {
      if (type > 255
      /* TYPE_SIZE */
      ) {
          throw new Error("Opcode type over 8-bits. Got " + type + ".");
        }

      this.buffer.push(type | machine | arguments.length - 2 << 8
      /* ARG_SHIFT */
      );
      this.typePos = this.buffer.length - 1;

      for (let i = 2; i < arguments.length; i++) {
        let op = arguments[i];

        if (typeof op === 'number' && op > 4294967295
        /* MAX_SIZE */
        ) {
            throw new Error("Operand over 32-bits. Got " + op + ".");
          }

        this.buffer.push(op);
      }

      this.size = this.buffer.length;
    }

    patch(position, target) {
      if (this.buffer[position + 1] === -1) {
        this.buffer[position + 1] = target;
      } else {
        throw new Error('Trying to patch operand in populated slot instead of a reserved slot.');
      }
    }

    patchWith(position, target, operand) {
      if (this.buffer[position + 1] === -1) {
        this.buffer[position + 1] = target;
        this.buffer[position + 2] = operand;
      } else {
        throw new Error('Trying to patch operand in populated slot instead of a reserved slot.');
      }
    }

  }

  _exports.InstructionEncoder = InstructionEncoder;
});
enifed("@glimmer/low-level", ["exports"], function (_exports) {
  "use strict";

  _exports.Stack = _exports.Storage = void 0;

  class Storage {
    constructor() {
      this.array = [];
      this.next = 0;
    }

    add(element) {
      let {
        next: slot,
        array
      } = this;

      if (slot === array.length) {
        this.next++;
      } else {
        let prev = array[slot];
        this.next = prev;
      }

      this.array[slot] = element;
      return slot;
    }

    deref(pointer) {
      return this.array[pointer];
    }

    drop(pointer) {
      this.array[pointer] = this.next;
      this.next = pointer;
    }

  }

  _exports.Storage = Storage;

  class Stack {
    constructor(vec = []) {
      this.vec = vec;
    }

    clone() {
      return new Stack(this.vec.slice());
    }

    sliceFrom(start) {
      return new Stack(this.vec.slice(start));
    }

    slice(start, end) {
      return new Stack(this.vec.slice(start, end));
    }

    copy(from, to) {
      this.vec[to] = this.vec[from];
    } // TODO: how to model u64 argument?


    writeRaw(pos, value) {
      // TODO: Grow?
      this.vec[pos] = value;
    } // TODO: partially decoded enum?


    getRaw(pos) {
      return this.vec[pos];
    }

    reset() {
      this.vec.length = 0;
    }

    len() {
      return this.vec.length;
    }

  }

  _exports.Stack = Stack;
});
enifed("@glimmer/node", ["exports", "@glimmer/runtime"], function (_exports, _runtime) {
  "use strict";

  _exports.serializeBuilder = serializeBuilder;
  _exports.NodeDOMTreeConstruction = void 0;

  class NodeDOMTreeConstruction extends _runtime.DOMTreeConstruction {
    constructor(doc) {
      super(doc);
    } // override to prevent usage of `this.document` until after the constructor


    setupUselessElement() {} // override to avoid SVG detection/work when in node (this is not needed in SSR)


    createElement(tag) {
      return this.document.createElement(tag);
    } // override to avoid namespace shenanigans when in node (this is not needed in SSR)


    setAttribute(element, name, value) {
      element.setAttribute(name, value);
    }

  }

  _exports.NodeDOMTreeConstruction = NodeDOMTreeConstruction;
  const TEXT_NODE = 3;

  function currentNode(cursor) {
    let {
      element,
      nextSibling
    } = cursor;

    if (nextSibling === null) {
      return element.lastChild;
    } else {
      return nextSibling.previousSibling;
    }
  }

  class SerializeBuilder extends _runtime.NewElementBuilder {
    constructor() {
      super(...arguments);
      this.serializeBlockDepth = 0;
    }

    __openBlock() {
      let depth = this.serializeBlockDepth++;

      this.__appendComment("%+b:" + depth + "%");

      super.__openBlock();
    }

    __closeBlock() {
      super.__closeBlock();

      this.__appendComment("%-b:" + --this.serializeBlockDepth + "%");
    }

    __appendHTML(html) {
      // Do we need to run the html tokenizer here?
      let first = this.__appendComment('%glmr%');

      if (this.element.tagName === 'TABLE') {
        let openIndex = html.indexOf('<');

        if (openIndex > -1) {
          let tr = html.slice(openIndex + 1, openIndex + 3);

          if (tr === 'tr') {
            html = "<tbody>" + html + "</tbody>";
          }
        }
      }

      if (html === '') {
        this.__appendComment('% %');
      } else {
        super.__appendHTML(html);
      }

      let last = this.__appendComment('%glmr%');

      return new _runtime.ConcreteBounds(this.element, first, last);
    }

    __appendText(string) {
      let current = currentNode(this);

      if (string === '') {
        return this.__appendComment('% %');
      } else if (current && current.nodeType === TEXT_NODE) {
        this.__appendComment('%|%');
      }

      return super.__appendText(string);
    }

    closeElement() {
      if (this.element['needsExtraClose'] === true) {
        this.element['needsExtraClose'] = false;
        super.closeElement();
      }

      return super.closeElement();
    }

    openElement(tag) {
      if (tag === 'tr') {
        if (this.element.tagName !== 'TBODY') {
          this.openElement('tbody'); // This prevents the closeBlock comment from being re-parented
          // under the auto inserted tbody. Rehydration builder needs to
          // account for the insertion since it is injected here and not
          // really in the template.

          this.constructing['needsExtraClose'] = true;
          this.flushElement(null);
        }
      }

      return super.openElement(tag);
    }

    pushRemoteElement(element, cursorId, nextSibling = null) {
      let {
        dom
      } = this;
      let script = dom.createElement('script');
      script.setAttribute('glmr', cursorId);
      dom.insertBefore(element, script, nextSibling);
      super.pushRemoteElement(element, cursorId, nextSibling);
    }

  }

  function serializeBuilder(env, cursor) {
    return SerializeBuilder.forInitialRender(env, cursor);
  }
});
enifed("@glimmer/program", ["exports", "@glimmer/util"], function (_exports, _util) {
  "use strict";

  _exports.Opcode = _exports.Program = _exports.RuntimeProgram = _exports.WriteOnlyProgram = _exports.Heap = _exports.LazyConstants = _exports.Constants = _exports.RuntimeConstants = _exports.WriteOnlyConstants = _exports.WELL_KNOWN_EMPTY_ARRAY_POSITION = void 0;
  const UNRESOLVED = {};
  const WELL_KNOWN_EMPTY_ARRAY_POSITION = 0;
  _exports.WELL_KNOWN_EMPTY_ARRAY_POSITION = WELL_KNOWN_EMPTY_ARRAY_POSITION;
  const WELL_KNOW_EMPTY_ARRAY = Object.freeze([]);

  class WriteOnlyConstants {
    constructor() {
      // `0` means NULL
      this.strings = [];
      this.arrays = [WELL_KNOW_EMPTY_ARRAY];
      this.tables = [];
      this.handles = [];
      this.resolved = [];
      this.numbers = [];
    }

    string(value) {
      let index = this.strings.indexOf(value);

      if (index > -1) {
        return index;
      }

      return this.strings.push(value) - 1;
    }

    stringArray(strings) {
      let _strings = new Array(strings.length);

      for (let i = 0; i < strings.length; i++) {
        _strings[i] = this.string(strings[i]);
      }

      return this.array(_strings);
    }

    array(values) {
      if (values.length === 0) {
        return WELL_KNOWN_EMPTY_ARRAY_POSITION;
      }

      let index = this.arrays.indexOf(values);

      if (index > -1) {
        return index;
      }

      return this.arrays.push(values) - 1;
    }

    handle(handle) {
      let index = this.handles.indexOf(handle);

      if (index > -1) {
        return index;
      }

      this.resolved.push(UNRESOLVED);
      return this.handles.push(handle) - 1;
    }

    serializable(value) {
      let str = JSON.stringify(value);
      let index = this.strings.indexOf(str);

      if (index > -1) {
        return index;
      }

      return this.strings.push(str) - 1;
    }

    number(number) {
      let index = this.numbers.indexOf(number);

      if (index > -1) {
        return index;
      }

      return this.numbers.push(number) - 1;
    }

    toPool() {
      return {
        strings: this.strings,
        arrays: this.arrays,
        handles: this.handles,
        numbers: this.numbers
      };
    }

  }

  _exports.WriteOnlyConstants = WriteOnlyConstants;

  class RuntimeConstants {
    constructor(resolver, pool) {
      this.resolver = resolver;
      this.strings = pool.strings;
      this.arrays = pool.arrays;
      this.handles = pool.handles;
      this.resolved = this.handles.map(() => UNRESOLVED);
      this.numbers = pool.numbers;
    }

    getString(value) {
      return this.strings[value];
    }

    getNumber(value) {
      return this.numbers[value];
    }

    getStringArray(value) {
      let names = this.getArray(value);

      let _names = new Array(names.length);

      for (let i = 0; i < names.length; i++) {
        let n = names[i];
        _names[i] = this.getString(n);
      }

      return _names;
    }

    getArray(value) {
      return this.arrays[value];
    }

    resolveHandle(index) {
      let resolved = this.resolved[index];

      if (resolved === UNRESOLVED) {
        let handle = this.handles[index];
        resolved = this.resolved[index] = this.resolver.resolve(handle);
      }

      return resolved;
    }

    getSerializable(s) {
      return JSON.parse(this.strings[s]);
    }

  }

  _exports.RuntimeConstants = RuntimeConstants;

  class Constants extends WriteOnlyConstants {
    constructor(resolver, pool) {
      super();
      this.resolver = resolver;

      if (pool) {
        this.strings = pool.strings;
        this.arrays = pool.arrays;
        this.handles = pool.handles;
        this.resolved = this.handles.map(() => UNRESOLVED);
        this.numbers = pool.numbers;
      }
    }

    getNumber(value) {
      return this.numbers[value];
    }

    getString(value) {
      return this.strings[value];
    }

    getStringArray(value) {
      let names = this.getArray(value);

      let _names = new Array(names.length);

      for (let i = 0; i < names.length; i++) {
        let n = names[i];
        _names[i] = this.getString(n);
      }

      return _names;
    }

    getArray(value) {
      return this.arrays[value];
    }

    resolveHandle(index) {
      let resolved = this.resolved[index];

      if (resolved === UNRESOLVED) {
        let handle = this.handles[index];
        resolved = this.resolved[index] = this.resolver.resolve(handle);
      }

      return resolved;
    }

    getSerializable(s) {
      return JSON.parse(this.strings[s]);
    }

  }

  _exports.Constants = Constants;

  class LazyConstants extends Constants {
    constructor() {
      super(...arguments);
      this.others = [];
      this.serializables = [];
    }

    serializable(value) {
      let index = this.serializables.indexOf(value);

      if (index > -1) {
        return index;
      }

      return this.serializables.push(value) - 1;
    }

    getSerializable(s) {
      return this.serializables[s];
    }

    getOther(value) {
      return this.others[value - 1];
    }

    other(other) {
      return this.others.push(other);
    }

  }

  _exports.LazyConstants = LazyConstants;

  class Opcode {
    constructor(heap) {
      this.heap = heap;
      this.offset = 0;
    }

    get size() {
      let rawType = this.heap.getbyaddr(this.offset);
      return ((rawType & 768
      /* OPERAND_LEN_MASK */
      ) >> 8
      /* ARG_SHIFT */
      ) + 1;
    }

    get isMachine() {
      let rawType = this.heap.getbyaddr(this.offset);
      return rawType & 1024
      /* MACHINE_MASK */
      ;
    }

    get type() {
      return this.heap.getbyaddr(this.offset) & 255
      /* TYPE_MASK */
      ;
    }

    get op1() {
      return this.heap.getbyaddr(this.offset + 1);
    }

    get op2() {
      return this.heap.getbyaddr(this.offset + 2);
    }

    get op3() {
      return this.heap.getbyaddr(this.offset + 3);
    }

  }

  _exports.Opcode = Opcode;

  function encodeTableInfo(scopeSize, state) {
    return state | scopeSize << 2;
  }

  function changeState(info, newState) {
    return info | newState << 30;
  }

  const PAGE_SIZE = 0x100000;
  /**
   * The Heap is responsible for dynamically allocating
   * memory in which we read/write the VM's instructions
   * from/to. When we malloc we pass out a VMHandle, which
   * is used as an indirect way of accessing the memory during
   * execution of the VM. Internally we track the different
   * regions of the memory in an int array known as the table.
   *
   * The table 32-bit aligned and has the following layout:
   *
   * | ... | hp (u32) |       info (u32)   | size (u32) |
   * | ... |  Handle  | Scope Size | State | Size       |
   * | ... | 32bits   | 30bits     | 2bits | 32bit      |
   *
   * With this information we effectively have the ability to
   * control when we want to free memory. That being said you
   * can not free during execution as raw address are only
   * valid during the execution. This means you cannot close
   * over them as you will have a bad memory access exception.
   */

  class Heap {
    constructor(serializedHeap) {
      this.placeholders = [];
      this.offset = 0;
      this.handle = 0;
      this.capacity = PAGE_SIZE;

      if (serializedHeap) {
        let {
          buffer,
          table,
          handle
        } = serializedHeap;
        this.heap = new Uint32Array(buffer);
        this.table = table;
        this.offset = this.heap.length;
        this.handle = handle;
        this.capacity = 0;
      } else {
        this.heap = new Uint32Array(PAGE_SIZE);
        this.table = [];
      }
    }

    push(item) {
      this.sizeCheck();
      this.heap[this.offset++] = item;
    }

    sizeCheck() {
      if (this.capacity === 0) {
        let heap = slice(this.heap, 0, this.offset);
        this.heap = new Uint32Array(heap.length + PAGE_SIZE);
        this.heap.set(heap, 0);
        this.capacity = PAGE_SIZE;
      }

      this.capacity--;
    }

    getbyaddr(address) {
      return this.heap[address];
    }

    setbyaddr(address, value) {
      this.heap[address] = value;
    }

    malloc() {
      // push offset, info, size
      this.table.push(this.offset, 0, 0);
      let handle = this.handle;
      this.handle += 3
      /* ENTRY_SIZE */
      ;
      return handle;
    }

    finishMalloc(handle, scopeSize) {
      this.table[handle + 1
      /* INFO_OFFSET */
      ] = encodeTableInfo(scopeSize, 0
      /* Allocated */
      );
    }

    size() {
      return this.offset;
    } // It is illegal to close over this address, as compaction
    // may move it. However, it is legal to use this address
    // multiple times between compactions.


    getaddr(handle) {
      return this.table[handle];
    }

    gethandle(address) {
      this.table.push(address, encodeTableInfo(0, 3
      /* Pointer */
      ), 0);
      let handle = this.handle;
      this.handle += 3
      /* ENTRY_SIZE */
      ;
      return handle;
    }

    sizeof(handle) {
      return -1;
    }

    scopesizeof(handle) {
      let info = this.table[handle + 1
      /* INFO_OFFSET */
      ];
      return info >> 2;
    }

    free(handle) {
      let info = this.table[handle + 1
      /* INFO_OFFSET */
      ];
      this.table[handle + 1
      /* INFO_OFFSET */
      ] = changeState(info, 1
      /* Freed */
      );
    }

    pushPlaceholder(valueFunc) {
      this.sizeCheck();
      let address = this.offset++;
      this.heap[address] = 2147483647
      /* MAX_SIZE */
      ;
      this.placeholders.push([address, valueFunc]);
    }

    patchPlaceholders() {
      let {
        placeholders
      } = this;

      for (let i = 0; i < placeholders.length; i++) {
        let [address, getValue] = placeholders[i];
        this.setbyaddr(address, getValue());
      }
    }

    capture(offset = this.offset) {
      this.patchPlaceholders(); // Only called in eager mode

      let buffer = slice(this.heap, 0, offset).buffer;
      return {
        handle: this.handle,
        table: this.table,
        buffer: buffer
      };
    }

  }

  _exports.Heap = Heap;

  class WriteOnlyProgram {
    constructor(constants = new WriteOnlyConstants(), heap = new Heap()) {
      this.constants = constants;
      this.heap = heap;
      this._opcode = new Opcode(this.heap);
    }

    opcode(offset) {
      this._opcode.offset = offset;
      return this._opcode;
    }

  }

  _exports.WriteOnlyProgram = WriteOnlyProgram;

  class RuntimeProgram {
    constructor(constants, heap) {
      this.constants = constants;
      this.heap = heap;
      this._opcode = new Opcode(this.heap);
    }

    static hydrate(rawHeap, pool, resolver) {
      let heap = new Heap(rawHeap);
      let constants = new RuntimeConstants(resolver, pool);
      return new RuntimeProgram(constants, heap);
    }

    opcode(offset) {
      this._opcode.offset = offset;
      return this._opcode;
    }

  }

  _exports.RuntimeProgram = RuntimeProgram;

  class Program extends WriteOnlyProgram {}

  _exports.Program = Program;

  function slice(arr, start, end) {
    if (arr.slice !== undefined) {
      return arr.slice(start, end);
    }

    let ret = new Uint32Array(end);

    for (; start < end; start++) {
      ret[start] = arr[start];
    }

    return ret;
  }
});
enifed("@glimmer/reference", ["exports", "@glimmer/util"], function (_exports, _util) {
  "use strict";

  _exports.isConst = isConst;
  _exports.isConstTag = isConstTag;
  _exports.bump = bump;
  _exports.combineTagged = combineTagged;
  _exports.combineSlice = combineSlice;
  _exports.combine = combine;
  _exports.map = map;
  _exports.isModified = isModified;
  _exports.ReferenceCache = _exports.CachedReference = _exports.UpdatableTag = _exports.CachedTag = _exports.DirtyableTag = _exports.CURRENT_TAG = _exports.VOLATILE_TAG = _exports.CONSTANT_TAG = _exports.TagWrapper = _exports.RevisionTag = _exports.VOLATILE = _exports.INITIAL = _exports.CONSTANT = _exports.IteratorSynchronizer = _exports.ReferenceIterator = _exports.IterationArtifacts = _exports.ListItem = _exports.ConstReference = void 0;
  const CONSTANT = 0;
  _exports.CONSTANT = CONSTANT;
  const INITIAL = 1;
  _exports.INITIAL = INITIAL;
  const VOLATILE = NaN;
  _exports.VOLATILE = VOLATILE;

  class RevisionTag {
    validate(snapshot) {
      return this.value() === snapshot;
    }

  }

  _exports.RevisionTag = RevisionTag;
  RevisionTag.id = 0;
  const VALUE = [];
  const VALIDATE = [];

  class TagWrapper {
    constructor(type, inner) {
      this.type = type;
      this.inner = inner;
    }

    value() {
      let func = VALUE[this.type];
      return func(this.inner);
    }

    validate(snapshot) {
      let func = VALIDATE[this.type];
      return func(this.inner, snapshot);
    }

  }

  _exports.TagWrapper = TagWrapper;

  function register(Type) {
    let type = VALUE.length;
    VALUE.push(tag => tag.value());
    VALIDATE.push((tag, snapshot) => tag.validate(snapshot));
    Type.id = type;
  } ///
  // CONSTANT: 0


  VALUE.push(() => CONSTANT);
  VALIDATE.push((_tag, snapshot) => snapshot === CONSTANT);
  const CONSTANT_TAG = new TagWrapper(0, null); // VOLATILE: 1

  _exports.CONSTANT_TAG = CONSTANT_TAG;
  VALUE.push(() => VOLATILE);
  VALIDATE.push((_tag, snapshot) => snapshot === VOLATILE);
  const VOLATILE_TAG = new TagWrapper(1, null); // CURRENT: 2

  _exports.VOLATILE_TAG = VOLATILE_TAG;
  VALUE.push(() => $REVISION);
  VALIDATE.push((_tag, snapshot) => snapshot === $REVISION);
  const CURRENT_TAG = new TagWrapper(2, null);
  _exports.CURRENT_TAG = CURRENT_TAG;

  function isConst({
    tag
  }) {
    return tag === CONSTANT_TAG;
  }

  function isConstTag(tag) {
    return tag === CONSTANT_TAG;
  } ///


  let $REVISION = INITIAL;

  function bump() {
    $REVISION++;
  }

  class DirtyableTag extends RevisionTag {
    static create(revision = $REVISION) {
      return new TagWrapper(this.id, new DirtyableTag(revision));
    }

    constructor(revision = $REVISION) {
      super();
      this.revision = revision;
    }

    value() {
      return this.revision;
    }

    dirty() {
      this.revision = ++$REVISION;
    }

  }

  _exports.DirtyableTag = DirtyableTag;
  register(DirtyableTag);

  function combineTagged(tagged) {
    let optimized = [];

    for (let i = 0, l = tagged.length; i < l; i++) {
      let tag = tagged[i].tag;
      if (tag === VOLATILE_TAG) return VOLATILE_TAG;
      if (tag === CONSTANT_TAG) continue;
      optimized.push(tag);
    }

    return _combine(optimized);
  }

  function combineSlice(slice) {
    let optimized = [];
    let node = slice.head();

    while (node !== null) {
      let tag = node.tag;
      if (tag === VOLATILE_TAG) return VOLATILE_TAG;
      if (tag !== CONSTANT_TAG) optimized.push(tag);
      node = slice.nextNode(node);
    }

    return _combine(optimized);
  }

  function combine(tags) {
    let optimized = [];

    for (let i = 0, l = tags.length; i < l; i++) {
      let tag = tags[i];
      if (tag === VOLATILE_TAG) return VOLATILE_TAG;
      if (tag === CONSTANT_TAG) continue;
      optimized.push(tag);
    }

    return _combine(optimized);
  }

  function _combine(tags) {
    switch (tags.length) {
      case 0:
        return CONSTANT_TAG;

      case 1:
        return tags[0];

      case 2:
        return TagsPair.create(tags[0], tags[1]);

      default:
        return TagsCombinator.create(tags);
    }
  }

  class CachedTag extends RevisionTag {
    constructor() {
      super(...arguments);
      this.lastChecked = null;
      this.lastValue = null;
    }

    value() {
      let {
        lastChecked
      } = this;

      if (lastChecked !== $REVISION) {
        this.lastChecked = $REVISION;
        this.lastValue = this.compute();
      }

      return this.lastValue;
    }

    invalidate() {
      this.lastChecked = null;
    }

  }

  _exports.CachedTag = CachedTag;

  class TagsPair extends CachedTag {
    static create(first, second) {
      return new TagWrapper(this.id, new TagsPair(first, second));
    }

    constructor(first, second) {
      super();
      this.first = first;
      this.second = second;
    }

    compute() {
      return Math.max(this.first.value(), this.second.value());
    }

  }

  register(TagsPair);

  class TagsCombinator extends CachedTag {
    static create(tags) {
      return new TagWrapper(this.id, new TagsCombinator(tags));
    }

    constructor(tags) {
      super();
      this.tags = tags;
    }

    compute() {
      let {
        tags
      } = this;
      let max = -1;

      for (let i = 0; i < tags.length; i++) {
        let value = tags[i].value();
        max = Math.max(value, max);
      }

      return max;
    }

  }

  register(TagsCombinator);

  class UpdatableTag extends CachedTag {
    static create(tag) {
      return new TagWrapper(this.id, new UpdatableTag(tag));
    }

    constructor(tag) {
      super();
      this.tag = tag;
      this.lastUpdated = INITIAL;
    }

    compute() {
      return Math.max(this.lastUpdated, this.tag.value());
    }

    update(tag) {
      if (tag !== this.tag) {
        this.tag = tag;
        this.lastUpdated = $REVISION;
        this.invalidate();
      }
    }

  }

  _exports.UpdatableTag = UpdatableTag;
  register(UpdatableTag);

  class CachedReference {
    constructor() {
      this.lastRevision = null;
      this.lastValue = null;
    }

    value() {
      let {
        tag,
        lastRevision,
        lastValue
      } = this;

      if (lastRevision === null || !tag.validate(lastRevision)) {
        lastValue = this.lastValue = this.compute();
        this.lastRevision = tag.value();
      }

      return lastValue;
    }

    invalidate() {
      this.lastRevision = null;
    }

  }

  _exports.CachedReference = CachedReference;

  class MapperReference extends CachedReference {
    constructor(reference, mapper) {
      super();
      this.tag = reference.tag;
      this.reference = reference;
      this.mapper = mapper;
    }

    compute() {
      let {
        reference,
        mapper
      } = this;
      return mapper(reference.value());
    }

  }

  function map(reference, mapper) {
    return new MapperReference(reference, mapper);
  } //////////


  class ReferenceCache {
    constructor(reference) {
      this.lastValue = null;
      this.lastRevision = null;
      this.initialized = false;
      this.tag = reference.tag;
      this.reference = reference;
    }

    peek() {
      if (!this.initialized) {
        return this.initialize();
      }

      return this.lastValue;
    }

    revalidate() {
      if (!this.initialized) {
        return this.initialize();
      }

      let {
        reference,
        lastRevision
      } = this;
      let tag = reference.tag;
      if (tag.validate(lastRevision)) return NOT_MODIFIED;
      this.lastRevision = tag.value();
      let {
        lastValue
      } = this;
      let value = reference.value();
      if (value === lastValue) return NOT_MODIFIED;
      this.lastValue = value;
      return value;
    }

    initialize() {
      let {
        reference
      } = this;
      let value = this.lastValue = reference.value();
      this.lastRevision = reference.tag.value();
      this.initialized = true;
      return value;
    }

  }

  _exports.ReferenceCache = ReferenceCache;
  const NOT_MODIFIED = 'adb3b78e-3d22-4e4b-877a-6317c2c5c145';

  function isModified(value) {
    return value !== NOT_MODIFIED;
  }

  class ConstReference {
    constructor(inner) {
      this.inner = inner;
      this.tag = CONSTANT_TAG;
    }

    value() {
      return this.inner;
    }

  }

  _exports.ConstReference = ConstReference;

  class ListItem extends _util.ListNode {
    constructor(iterable, result) {
      super(iterable.valueReferenceFor(result));
      this.retained = false;
      this.seen = false;
      this.key = result.key;
      this.iterable = iterable;
      this.memo = iterable.memoReferenceFor(result);
    }

    update(item) {
      this.retained = true;
      this.iterable.updateValueReference(this.value, item);
      this.iterable.updateMemoReference(this.memo, item);
    }

    shouldRemove() {
      return !this.retained;
    }

    reset() {
      this.retained = false;
      this.seen = false;
    }

  }

  _exports.ListItem = ListItem;

  class IterationArtifacts {
    constructor(iterable) {
      this.iterator = null;
      this.map = (0, _util.dict)();
      this.list = new _util.LinkedList();
      this.tag = iterable.tag;
      this.iterable = iterable;
    }

    isEmpty() {
      let iterator = this.iterator = this.iterable.iterate();
      return iterator.isEmpty();
    }

    iterate() {
      let iterator;

      if (this.iterator === null) {
        iterator = this.iterable.iterate();
      } else {
        iterator = this.iterator;
      }

      this.iterator = null;
      return iterator;
    }

    has(key) {
      return !!this.map[key];
    }

    get(key) {
      return this.map[key];
    }

    wasSeen(key) {
      let node = this.map[key];
      return node !== undefined && node.seen;
    }

    append(item) {
      let {
        map,
        list,
        iterable
      } = this;
      let node = map[item.key] = new ListItem(iterable, item);
      list.append(node);
      return node;
    }

    insertBefore(item, reference) {
      let {
        map,
        list,
        iterable
      } = this;
      let node = map[item.key] = new ListItem(iterable, item);
      node.retained = true;
      list.insertBefore(node, reference);
      return node;
    }

    move(item, reference) {
      let {
        list
      } = this;
      item.retained = true;
      list.remove(item);
      list.insertBefore(item, reference);
    }

    remove(item) {
      let {
        list
      } = this;
      list.remove(item);
      delete this.map[item.key];
    }

    nextNode(item) {
      return this.list.nextNode(item);
    }

    head() {
      return this.list.head();
    }

  }

  _exports.IterationArtifacts = IterationArtifacts;

  class ReferenceIterator {
    // if anyone needs to construct this object with something other than
    // an iterable, let @wycats know.
    constructor(iterable) {
      this.iterator = null;
      let artifacts = new IterationArtifacts(iterable);
      this.artifacts = artifacts;
    }

    next() {
      let {
        artifacts
      } = this;
      let iterator = this.iterator = this.iterator || artifacts.iterate();
      let item = iterator.next();
      if (item === null) return null;
      return artifacts.append(item);
    }

  }

  _exports.ReferenceIterator = ReferenceIterator;
  var Phase;

  (function (Phase) {
    Phase[Phase["Append"] = 0] = "Append";
    Phase[Phase["Prune"] = 1] = "Prune";
    Phase[Phase["Done"] = 2] = "Done";
  })(Phase || (Phase = {}));

  class IteratorSynchronizer {
    constructor({
      target,
      artifacts
    }) {
      this.target = target;
      this.artifacts = artifacts;
      this.iterator = artifacts.iterate();
      this.current = artifacts.head();
    }

    sync() {
      let phase = Phase.Append;

      while (true) {
        switch (phase) {
          case Phase.Append:
            phase = this.nextAppend();
            break;

          case Phase.Prune:
            phase = this.nextPrune();
            break;

          case Phase.Done:
            this.nextDone();
            return;
        }
      }
    }

    advanceToKey(key) {
      let {
        current,
        artifacts
      } = this;
      let seek = current;

      while (seek !== null && seek.key !== key) {
        seek.seen = true;
        seek = artifacts.nextNode(seek);
      }

      if (seek !== null) {
        this.current = artifacts.nextNode(seek);
      }
    }

    nextAppend() {
      let {
        iterator,
        current,
        artifacts
      } = this;
      let item = iterator.next();

      if (item === null) {
        return this.startPrune();
      }

      let {
        key
      } = item;

      if (current !== null && current.key === key) {
        this.nextRetain(item);
      } else if (artifacts.has(key)) {
        this.nextMove(item);
      } else {
        this.nextInsert(item);
      }

      return Phase.Append;
    }

    nextRetain(item) {
      let {
        artifacts,
        current
      } = this;
      current = current;
      current.update(item);
      this.current = artifacts.nextNode(current);
      this.target.retain(item.key, current.value, current.memo);
    }

    nextMove(item) {
      let {
        current,
        artifacts,
        target
      } = this;
      let {
        key
      } = item;
      let found = artifacts.get(item.key);
      found.update(item);

      if (artifacts.wasSeen(item.key)) {
        artifacts.move(found, current);
        target.move(found.key, found.value, found.memo, current ? current.key : null);
      } else {
        this.advanceToKey(key);
      }
    }

    nextInsert(item) {
      let {
        artifacts,
        target,
        current
      } = this;
      let node = artifacts.insertBefore(item, current);
      target.insert(node.key, node.value, node.memo, current ? current.key : null);
    }

    startPrune() {
      this.current = this.artifacts.head();
      return Phase.Prune;
    }

    nextPrune() {
      let {
        artifacts,
        target,
        current
      } = this;

      if (current === null) {
        return Phase.Done;
      }

      let node = current;
      this.current = artifacts.nextNode(node);

      if (node.shouldRemove()) {
        artifacts.remove(node);
        target.delete(node.key);
      } else {
        node.reset();
      }

      return Phase.Prune;
    }

    nextDone() {
      this.target.done();
    }

  }

  _exports.IteratorSynchronizer = IteratorSynchronizer;
});
enifed("@glimmer/runtime", ["exports", "@glimmer/util", "@glimmer/reference", "@glimmer/vm", "@glimmer/low-level"], function (_exports, _util, _reference, _vm2, _lowLevel) {
  "use strict";

  _exports.renderMain = renderMain;
  _exports.renderComponent = renderComponent;
  _exports.setDebuggerCallback = setDebuggerCallback;
  _exports.resetDebuggerCallback = resetDebuggerCallback;
  _exports.getDynamicVar = getDynamicVar;
  _exports.isCurriedComponentDefinition = isCurriedComponentDefinition;
  _exports.curry = curry;
  _exports.isWhitespace = isWhitespace;
  _exports.normalizeProperty = normalizeProperty;
  _exports.clientBuilder = clientBuilder;
  _exports.rehydrationBuilder = rehydrationBuilder;
  _exports.isSerializationFirstNode = isSerializationFirstNode;
  _exports.capabilityFlagsFrom = capabilityFlagsFrom;
  _exports.hasCapability = hasCapability;
  _exports.Cursor = _exports.ConcreteBounds = _exports.SERIALIZATION_FIRST_NODE_STRING = _exports.RehydrateBuilder = _exports.NewElementBuilder = _exports.DOMTreeConstruction = _exports.IDOMChanges = _exports.SVG_NAMESPACE = _exports.DOMChanges = _exports.CurriedComponentDefinition = _exports.MINIMAL_CAPABILITIES = _exports.DEFAULT_CAPABILITIES = _exports.DefaultEnvironment = _exports.Environment = _exports.Scope = _exports.EMPTY_ARGS = _exports.DynamicAttribute = _exports.SimpleDynamicAttribute = _exports.RenderResult = _exports.UpdatingVM = _exports.LowLevelVM = _exports.ConditionalReference = _exports.PrimitiveReference = _exports.UNDEFINED_REFERENCE = _exports.NULL_REFERENCE = void 0;

  // these import bindings will be stripped from build
  class AppendOpcodes {
    constructor() {
      this.evaluateOpcode = (0, _util.fillNulls)(98
      /* Size */
      ).slice();
    }

    add(name, evaluate, kind = 'syscall') {
      this.evaluateOpcode[name] = {
        syscall: kind === 'syscall',
        evaluate
      };
    }

    debugBefore(vm, opcode, type) {
      let sp;
      let state;
      return {
        sp: sp,
        state
      };
    }

    debugAfter(vm, opcode, type, pre) {
      let expectedChange;
      let {
        sp,
        state
      } = pre;
      let metadata = null;

      if (metadata !== null) {
        if (typeof metadata.stackChange === 'number') {
          expectedChange = metadata.stackChange;
        } else {
          expectedChange = metadata.stackChange({
            opcode,
            constants: vm.constants,
            state
          });
          if (isNaN(expectedChange)) throw (0, _util.unreachable)();
        }
      }
    }

    evaluate(vm, opcode, type) {
      let operation = this.evaluateOpcode[type];

      if (operation.syscall) {
        operation.evaluate(vm, opcode);
      } else {
        operation.evaluate(vm.inner, opcode);
      }
    }

  }

  const APPEND_OPCODES = new AppendOpcodes();

  class AbstractOpcode {
    constructor() {
      (0, _util.initializeGuid)(this);
    }

  }

  class UpdatingOpcode extends AbstractOpcode {
    constructor() {
      super(...arguments);
      this.next = null;
      this.prev = null;
    }

  }

  class PrimitiveReference extends _reference.ConstReference {
    constructor(value) {
      super(value);
    }

    static create(value) {
      if (value === undefined) {
        return UNDEFINED_REFERENCE;
      } else if (value === null) {
        return NULL_REFERENCE;
      } else if (value === true) {
        return TRUE_REFERENCE;
      } else if (value === false) {
        return FALSE_REFERENCE;
      } else if (typeof value === 'number') {
        return new ValueReference(value);
      } else {
        return new StringReference(value);
      }
    }

    get(_key) {
      return UNDEFINED_REFERENCE;
    }

  }

  _exports.PrimitiveReference = PrimitiveReference;

  class StringReference extends PrimitiveReference {
    constructor() {
      super(...arguments);
      this.lengthReference = null;
    }

    get(key) {
      if (key === 'length') {
        let {
          lengthReference
        } = this;

        if (lengthReference === null) {
          lengthReference = this.lengthReference = new ValueReference(this.inner.length);
        }

        return lengthReference;
      } else {
        return super.get(key);
      }
    }

  }

  class ValueReference extends PrimitiveReference {
    constructor(value) {
      super(value);
    }

  }

  const UNDEFINED_REFERENCE = new ValueReference(undefined);
  _exports.UNDEFINED_REFERENCE = UNDEFINED_REFERENCE;
  const NULL_REFERENCE = new ValueReference(null);
  _exports.NULL_REFERENCE = NULL_REFERENCE;
  const TRUE_REFERENCE = new ValueReference(true);
  const FALSE_REFERENCE = new ValueReference(false);

  class ConditionalReference {
    constructor(inner) {
      this.inner = inner;
      this.tag = inner.tag;
    }

    value() {
      return this.toBool(this.inner.value());
    }

    toBool(value) {
      return !!value;
    }

  }

  _exports.ConditionalReference = ConditionalReference;

  class ConcatReference extends _reference.CachedReference {
    constructor(parts) {
      super();
      this.parts = parts;
      this.tag = (0, _reference.combineTagged)(parts);
    }

    compute() {
      let parts = new Array();

      for (let i = 0; i < this.parts.length; i++) {
        let value = this.parts[i].value();

        if (value !== null && value !== undefined) {
          parts[i] = castToString(value);
        }
      }

      if (parts.length > 0) {
        return parts.join('');
      }

      return null;
    }

  }

  function castToString(value) {
    if (typeof value.toString !== 'function') {
      return '';
    }

    return String(value);
  }

  APPEND_OPCODES.add(1
  /* Helper */
  , (vm, {
    op1: handle
  }) => {
    let stack = vm.stack;
    let helper = vm.constants.resolveHandle(handle);
    let args = stack.pop();
    let value = helper(vm, args);
    vm.loadValue(_vm2.Register.v0, value);
  });
  APPEND_OPCODES.add(6
  /* GetVariable */
  , (vm, {
    op1: symbol
  }) => {
    let expr = vm.referenceForSymbol(symbol);
    vm.stack.push(expr);
  });
  APPEND_OPCODES.add(4
  /* SetVariable */
  , (vm, {
    op1: symbol
  }) => {
    let expr = vm.stack.pop();
    vm.scope().bindSymbol(symbol, expr);
  });
  APPEND_OPCODES.add(5
  /* SetBlock */
  , (vm, {
    op1: symbol
  }) => {
    let handle = vm.stack.pop();
    let scope = vm.stack.pop(); // FIXME(mmun): shouldn't need to cast this

    let table = vm.stack.pop();
    let block = table ? [handle, scope, table] : null;
    vm.scope().bindBlock(symbol, block);
  });
  APPEND_OPCODES.add(96
  /* ResolveMaybeLocal */
  , (vm, {
    op1: _name
  }) => {
    let name = vm.constants.getString(_name);
    let locals = vm.scope().getPartialMap();
    let ref = locals[name];

    if (ref === undefined) {
      ref = vm.getSelf().get(name);
    }

    vm.stack.push(ref);
  });
  APPEND_OPCODES.add(20
  /* RootScope */
  , (vm, {
    op1: symbols,
    op2: bindCallerScope
  }) => {
    vm.pushRootScope(symbols, !!bindCallerScope);
  });
  APPEND_OPCODES.add(7
  /* GetProperty */
  , (vm, {
    op1: _key
  }) => {
    let key = vm.constants.getString(_key);
    let expr = vm.stack.pop();
    vm.stack.push(expr.get(key));
  });
  APPEND_OPCODES.add(8
  /* GetBlock */
  , (vm, {
    op1: _block
  }) => {
    let {
      stack
    } = vm;
    let block = vm.scope().getBlock(_block);

    if (block) {
      stack.push(block[2]);
      stack.push(block[1]);
      stack.push(block[0]);
    } else {
      stack.push(null);
      stack.push(null);
      stack.push(null);
    }
  });
  APPEND_OPCODES.add(9
  /* HasBlock */
  , (vm, {
    op1: _block
  }) => {
    let hasBlock = !!vm.scope().getBlock(_block);
    vm.stack.push(hasBlock ? TRUE_REFERENCE : FALSE_REFERENCE);
  });
  APPEND_OPCODES.add(10
  /* HasBlockParams */
  , vm => {
    // FIXME(mmun): should only need to push the symbol table
    let block = vm.stack.pop();
    let scope = vm.stack.pop();
    let table = vm.stack.pop();
    let hasBlockParams = table && table.parameters.length;
    vm.stack.push(hasBlockParams ? TRUE_REFERENCE : FALSE_REFERENCE);
  });
  APPEND_OPCODES.add(11
  /* Concat */
  , (vm, {
    op1: count
  }) => {
    let out = new Array(count);

    for (let i = count; i > 0; i--) {
      let offset = i - 1;
      out[offset] = vm.stack.pop();
    }

    vm.stack.push(new ConcatReference(out));
  });
  const CURRIED_COMPONENT_DEFINITION_BRAND = 'CURRIED COMPONENT DEFINITION [id=6f00feb9-a0ef-4547-99ea-ac328f80acea]';

  function isCurriedComponentDefinition(definition) {
    return !!(definition && definition[CURRIED_COMPONENT_DEFINITION_BRAND]);
  }

  function isComponentDefinition(definition) {
    return definition && definition[CURRIED_COMPONENT_DEFINITION_BRAND];
  }

  class CurriedComponentDefinition {
    /** @internal */
    constructor(inner, args) {
      this.inner = inner;
      this.args = args;
      this[CURRIED_COMPONENT_DEFINITION_BRAND] = true;
    }

    unwrap(args) {
      args.realloc(this.offset);
      let definition = this;

      while (true) {
        let {
          args: curriedArgs,
          inner
        } = definition;

        if (curriedArgs) {
          args.positional.prepend(curriedArgs.positional);
          args.named.merge(curriedArgs.named);
        }

        if (!isCurriedComponentDefinition(inner)) {
          return inner;
        }

        definition = inner;
      }
    }
    /** @internal */


    get offset() {
      let {
        inner,
        args
      } = this;
      let length = args ? args.positional.length : 0;
      return isCurriedComponentDefinition(inner) ? length + inner.offset : length;
    }

  }

  _exports.CurriedComponentDefinition = CurriedComponentDefinition;

  function curry(spec, args = null) {
    return new CurriedComponentDefinition(spec, args);
  }

  function normalizeStringValue(value) {
    if (isEmpty(value)) {
      return '';
    }

    return String(value);
  }

  function shouldCoerce(value) {
    return isString(value) || isEmpty(value) || typeof value === 'boolean' || typeof value === 'number';
  }

  function isEmpty(value) {
    return value === null || value === undefined || typeof value.toString !== 'function';
  }

  function isSafeString(value) {
    return typeof value === 'object' && value !== null && typeof value.toHTML === 'function';
  }

  function isNode(value) {
    return typeof value === 'object' && value !== null && typeof value.nodeType === 'number';
  }

  function isFragment(value) {
    return isNode(value) && value.nodeType === 11;
  }

  function isString(value) {
    return typeof value === 'string';
  }

  class DynamicTextContent extends UpdatingOpcode {
    constructor(node, reference, lastValue) {
      super();
      this.node = node;
      this.reference = reference;
      this.lastValue = lastValue;
      this.type = 'dynamic-text';
      this.tag = reference.tag;
      this.lastRevision = this.tag.value();
    }

    evaluate() {
      let {
        reference,
        tag
      } = this;

      if (!tag.validate(this.lastRevision)) {
        this.lastRevision = tag.value();
        this.update(reference.value());
      }
    }

    update(value) {
      let {
        lastValue
      } = this;
      if (value === lastValue) return;
      let normalized;

      if (isEmpty(value)) {
        normalized = '';
      } else if (isString(value)) {
        normalized = value;
      } else {
        normalized = String(value);
      }

      if (normalized !== lastValue) {
        let textNode = this.node;
        textNode.nodeValue = this.lastValue = normalized;
      }
    }

  }

  class IsCurriedComponentDefinitionReference extends ConditionalReference {
    static create(inner) {
      return new IsCurriedComponentDefinitionReference(inner);
    }

    toBool(value) {
      return isCurriedComponentDefinition(value);
    }

  }

  class ContentTypeReference {
    constructor(inner) {
      this.inner = inner;
      this.tag = inner.tag;
    }

    value() {
      let value = this.inner.value();

      if (shouldCoerce(value)) {
        return 1
        /* String */
        ;
      } else if (isComponentDefinition(value)) {
        return 0
        /* Component */
        ;
      } else if (isSafeString(value)) {
        return 3
        /* SafeString */
        ;
      } else if (isFragment(value)) {
        return 4
        /* Fragment */
        ;
      } else if (isNode(value)) {
        return 5
        /* Node */
        ;
      } else {
          return 1
          /* String */
          ;
        }
    }

  }

  APPEND_OPCODES.add(28
  /* AppendHTML */
  , vm => {
    let reference = vm.stack.pop();
    let rawValue = reference.value();
    let value = isEmpty(rawValue) ? '' : String(rawValue);
    vm.elements().appendDynamicHTML(value);
  });
  APPEND_OPCODES.add(29
  /* AppendSafeHTML */
  , vm => {
    let reference = vm.stack.pop();
    let rawValue = reference.value().toHTML();
    let value = isEmpty(rawValue) ? '' : rawValue;
    vm.elements().appendDynamicHTML(value);
  });
  APPEND_OPCODES.add(32
  /* AppendText */
  , vm => {
    let reference = vm.stack.pop();
    let rawValue = reference.value();
    let value = isEmpty(rawValue) ? '' : String(rawValue);
    let node = vm.elements().appendDynamicText(value);

    if (!(0, _reference.isConst)(reference)) {
      vm.updateWith(new DynamicTextContent(node, reference, value));
    }
  });
  APPEND_OPCODES.add(30
  /* AppendDocumentFragment */
  , vm => {
    let reference = vm.stack.pop();
    let value = reference.value();
    vm.elements().appendDynamicFragment(value);
  });
  APPEND_OPCODES.add(31
  /* AppendNode */
  , vm => {
    let reference = vm.stack.pop();
    let value = reference.value();
    vm.elements().appendDynamicNode(value);
  });
  APPEND_OPCODES.add(22
  /* ChildScope */
  , vm => vm.pushChildScope());
  APPEND_OPCODES.add(23
  /* PopScope */
  , vm => vm.popScope());
  APPEND_OPCODES.add(44
  /* PushDynamicScope */
  , vm => vm.pushDynamicScope());
  APPEND_OPCODES.add(45
  /* PopDynamicScope */
  , vm => vm.popDynamicScope());
  APPEND_OPCODES.add(12
  /* Constant */
  , (vm, {
    op1: other
  }) => {
    vm.stack.push(vm.constants.getOther(other));
  });
  APPEND_OPCODES.add(13
  /* Primitive */
  , (vm, {
    op1: primitive
  }) => {
    let stack = vm.stack;
    let flag = primitive & 7; // 111

    let value = primitive >> 3;

    switch (flag) {
      case 0
      /* NUMBER */
      :
        stack.push(value);
        break;

      case 1
      /* FLOAT */
      :
        stack.push(vm.constants.getNumber(value));
        break;

      case 2
      /* STRING */
      :
        stack.push(vm.constants.getString(value));
        break;

      case 3
      /* BOOLEAN_OR_VOID */
      :
        stack.pushEncodedImmediate(primitive);
        break;

      case 4
      /* NEGATIVE */
      :
        stack.push(vm.constants.getNumber(value));
        break;

      case 5
      /* BIG_NUM */
      :
        stack.push(vm.constants.getNumber(value));
        break;
    }
  });
  APPEND_OPCODES.add(14
  /* PrimitiveReference */
  , vm => {
    let stack = vm.stack;
    stack.push(PrimitiveReference.create(stack.pop()));
  });
  APPEND_OPCODES.add(15
  /* ReifyU32 */
  , vm => {
    let stack = vm.stack;
    stack.push(stack.peek().value());
  });
  APPEND_OPCODES.add(16
  /* Dup */
  , (vm, {
    op1: register,
    op2: offset
  }) => {
    let position = vm.fetchValue(register) - offset;
    vm.stack.dup(position);
  });
  APPEND_OPCODES.add(17
  /* Pop */
  , (vm, {
    op1: count
  }) => {
    vm.stack.pop(count);
  });
  APPEND_OPCODES.add(18
  /* Load */
  , (vm, {
    op1: register
  }) => {
    vm.load(register);
  });
  APPEND_OPCODES.add(19
  /* Fetch */
  , (vm, {
    op1: register
  }) => {
    vm.fetch(register);
  });
  APPEND_OPCODES.add(43
  /* BindDynamicScope */
  , (vm, {
    op1: _names
  }) => {
    let names = vm.constants.getArray(_names);
    vm.bindDynamicScope(names);
  });
  APPEND_OPCODES.add(61
  /* Enter */
  , (vm, {
    op1: args
  }) => {
    vm.enter(args);
  });
  APPEND_OPCODES.add(62
  /* Exit */
  , vm => {
    vm.exit();
  });
  APPEND_OPCODES.add(48
  /* PushSymbolTable */
  , (vm, {
    op1: _table
  }) => {
    let stack = vm.stack;
    stack.push(vm.constants.getSerializable(_table));
  });
  APPEND_OPCODES.add(47
  /* PushBlockScope */
  , vm => {
    let stack = vm.stack;
    stack.push(vm.scope());
  });
  APPEND_OPCODES.add(46
  /* CompileBlock */
  , vm => {
    let stack = vm.stack;
    let block = stack.pop();

    if (block) {
      stack.push(block.compile());
    } else {
      stack.pushNull();
    }
  });
  APPEND_OPCODES.add(51
  /* InvokeYield */
  , vm => {
    let {
      stack
    } = vm;
    let handle = stack.pop();
    let scope = stack.pop(); // FIXME(mmun): shouldn't need to cast this

    let table = stack.pop();
    let args = stack.pop();

    if (table === null) {
      // To balance the pop{Frame,Scope}
      vm.pushFrame();
      vm.pushScope(scope); // Could be null but it doesnt matter as it is immediatelly popped.

      return;
    }

    let invokingScope = scope; // If necessary, create a child scope

    {
      let locals = table.parameters;
      let localsCount = locals.length;

      if (localsCount > 0) {
        invokingScope = invokingScope.child();

        for (let i = 0; i < localsCount; i++) {
          invokingScope.bindSymbol(locals[i], args.at(i));
        }
      }
    }
    vm.pushFrame();
    vm.pushScope(invokingScope);
    vm.call(handle);
  });
  APPEND_OPCODES.add(53
  /* JumpIf */
  , (vm, {
    op1: target
  }) => {
    let reference = vm.stack.pop();

    if ((0, _reference.isConst)(reference)) {
      if (reference.value()) {
        vm.goto(target);
      }
    } else {
      let cache = new _reference.ReferenceCache(reference);

      if (cache.peek()) {
        vm.goto(target);
      }

      vm.updateWith(new Assert(cache));
    }
  });
  APPEND_OPCODES.add(54
  /* JumpUnless */
  , (vm, {
    op1: target
  }) => {
    let reference = vm.stack.pop();

    if ((0, _reference.isConst)(reference)) {
      if (!reference.value()) {
        vm.goto(target);
      }
    } else {
      let cache = new _reference.ReferenceCache(reference);

      if (!cache.peek()) {
        vm.goto(target);
      }

      vm.updateWith(new Assert(cache));
    }
  });
  APPEND_OPCODES.add(55
  /* JumpEq */
  , (vm, {
    op1: target,
    op2: comparison
  }) => {
    let other = vm.stack.peek();

    if (other === comparison) {
      vm.goto(target);
    }
  });
  APPEND_OPCODES.add(56
  /* AssertSame */
  , vm => {
    let reference = vm.stack.peek();

    if (!(0, _reference.isConst)(reference)) {
      vm.updateWith(Assert.initialize(new _reference.ReferenceCache(reference)));
    }
  });
  APPEND_OPCODES.add(63
  /* ToBoolean */
  , vm => {
    let {
      env,
      stack
    } = vm;
    stack.push(env.toConditionalReference(stack.pop()));
  });

  class Assert extends UpdatingOpcode {
    constructor(cache) {
      super();
      this.type = 'assert';
      this.tag = cache.tag;
      this.cache = cache;
    }

    static initialize(cache) {
      let assert = new Assert(cache);
      cache.peek();
      return assert;
    }

    evaluate(vm) {
      let {
        cache
      } = this;

      if ((0, _reference.isModified)(cache.revalidate())) {
        vm.throw();
      }
    }

  }

  class JumpIfNotModifiedOpcode extends UpdatingOpcode {
    constructor(tag, target) {
      super();
      this.target = target;
      this.type = 'jump-if-not-modified';
      this.tag = tag;
      this.lastRevision = tag.value();
    }

    evaluate(vm) {
      let {
        tag,
        target,
        lastRevision
      } = this;

      if (!vm.alwaysRevalidate && tag.validate(lastRevision)) {
        vm.goto(target);
      }
    }

    didModify() {
      this.lastRevision = this.tag.value();
    }

  }

  class DidModifyOpcode extends UpdatingOpcode {
    constructor(target) {
      super();
      this.target = target;
      this.type = 'did-modify';
      this.tag = _reference.CONSTANT_TAG;
    }

    evaluate() {
      this.target.didModify();
    }

  }

  class LabelOpcode {
    constructor(label) {
      this.tag = _reference.CONSTANT_TAG;
      this.type = 'label';
      this.label = null;
      this.prev = null;
      this.next = null;
      (0, _util.initializeGuid)(this);
      this.label = label;
    }

    evaluate() {}

    inspect() {
      return this.label + " [" + this._guid + "]";
    }

  }

  APPEND_OPCODES.add(26
  /* Text */
  , (vm, {
    op1: text
  }) => {
    vm.elements().appendText(vm.constants.getString(text));
  });
  APPEND_OPCODES.add(27
  /* Comment */
  , (vm, {
    op1: text
  }) => {
    vm.elements().appendComment(vm.constants.getString(text));
  });
  APPEND_OPCODES.add(33
  /* OpenElement */
  , (vm, {
    op1: tag
  }) => {
    vm.elements().openElement(vm.constants.getString(tag));
  });
  APPEND_OPCODES.add(34
  /* OpenDynamicElement */
  , vm => {
    let tagName = vm.stack.pop().value();
    vm.elements().openElement(tagName);
  });
  APPEND_OPCODES.add(41
  /* PushRemoteElement */
  , vm => {
    let elementRef = vm.stack.pop();
    let nextSiblingRef = vm.stack.pop();
    let guidRef = vm.stack.pop();
    let element;
    let nextSibling;
    let guid = guidRef.value();

    if ((0, _reference.isConst)(elementRef)) {
      element = elementRef.value();
    } else {
      let cache = new _reference.ReferenceCache(elementRef);
      element = cache.peek();
      vm.updateWith(new Assert(cache));
    }

    if ((0, _reference.isConst)(nextSiblingRef)) {
      nextSibling = nextSiblingRef.value();
    } else {
      let cache = new _reference.ReferenceCache(nextSiblingRef);
      nextSibling = cache.peek();
      vm.updateWith(new Assert(cache));
    }

    vm.elements().pushRemoteElement(element, guid, nextSibling);
  });
  APPEND_OPCODES.add(42
  /* PopRemoteElement */
  , vm => {
    vm.elements().popRemoteElement();
  });
  APPEND_OPCODES.add(38
  /* FlushElement */
  , vm => {
    let operations = vm.fetchValue(_vm2.Register.t0);
    let modifiers = null;

    if (operations) {
      modifiers = operations.flush(vm);
      vm.loadValue(_vm2.Register.t0, null);
    }

    vm.elements().flushElement(modifiers);
  });
  APPEND_OPCODES.add(39
  /* CloseElement */
  , vm => {
    let modifiers = vm.elements().closeElement();

    if (modifiers) {
      modifiers.forEach(([manager, modifier]) => {
        vm.env.scheduleInstallModifier(modifier, manager);
        let destructor = manager.getDestructor(modifier);

        if (destructor) {
          vm.newDestroyable(destructor);
        }
      });
    }
  });
  APPEND_OPCODES.add(40
  /* Modifier */
  , (vm, {
    op1: handle
  }) => {
    let {
      manager,
      state
    } = vm.constants.resolveHandle(handle);
    let stack = vm.stack;
    let args = stack.pop();
    let {
      constructing,
      updateOperations
    } = vm.elements();
    let dynamicScope = vm.dynamicScope();
    let modifier = manager.create(constructing, state, args, dynamicScope, updateOperations);
    let operations = vm.fetchValue(_vm2.Register.t0);
    operations.addModifier(manager, modifier);
    let tag = manager.getTag(modifier);

    if (!(0, _reference.isConstTag)(tag)) {
      vm.updateWith(new UpdateModifierOpcode(tag, manager, modifier));
    }
  });

  class UpdateModifierOpcode extends UpdatingOpcode {
    constructor(tag, manager, modifier) {
      super();
      this.tag = tag;
      this.manager = manager;
      this.modifier = modifier;
      this.type = 'update-modifier';
      this.lastUpdated = tag.value();
    }

    evaluate(vm) {
      let {
        manager,
        modifier,
        tag,
        lastUpdated
      } = this;

      if (!tag.validate(lastUpdated)) {
        vm.env.scheduleUpdateModifier(modifier, manager);
        this.lastUpdated = tag.value();
      }
    }

  }

  APPEND_OPCODES.add(35
  /* StaticAttr */
  , (vm, {
    op1: _name,
    op2: _value,
    op3: _namespace
  }) => {
    let name = vm.constants.getString(_name);
    let value = vm.constants.getString(_value);
    let namespace = _namespace ? vm.constants.getString(_namespace) : null;
    vm.elements().setStaticAttribute(name, value, namespace);
  });
  APPEND_OPCODES.add(36
  /* DynamicAttr */
  , (vm, {
    op1: _name,
    op2: trusting,
    op3: _namespace
  }) => {
    let name = vm.constants.getString(_name);
    let reference = vm.stack.pop();
    let value = reference.value();
    let namespace = _namespace ? vm.constants.getString(_namespace) : null;
    let attribute = vm.elements().setDynamicAttribute(name, value, !!trusting, namespace);

    if (!(0, _reference.isConst)(reference)) {
      vm.updateWith(new UpdateDynamicAttributeOpcode(reference, attribute));
    }
  });

  class UpdateDynamicAttributeOpcode extends UpdatingOpcode {
    constructor(reference, attribute) {
      super();
      this.reference = reference;
      this.attribute = attribute;
      this.type = 'patch-element';
      this.tag = reference.tag;
      this.lastRevision = this.tag.value();
    }

    evaluate(vm) {
      let {
        attribute,
        reference,
        tag
      } = this;

      if (!tag.validate(this.lastRevision)) {
        this.lastRevision = tag.value();
        attribute.update(reference.value(), vm.env);
      }
    }

  }

  function resolveComponent(resolver, name, meta) {
    let definition = resolver.lookupComponentDefinition(name, meta);
    return definition;
  }

  class CurryComponentReference {
    constructor(inner, resolver, meta, args) {
      this.inner = inner;
      this.resolver = resolver;
      this.meta = meta;
      this.args = args;
      this.tag = inner.tag;
      this.lastValue = null;
      this.lastDefinition = null;
    }

    value() {
      let {
        inner,
        lastValue
      } = this;
      let value = inner.value();

      if (value === lastValue) {
        return this.lastDefinition;
      }

      let definition = null;

      if (isCurriedComponentDefinition(value)) {
        definition = value;
      } else if (typeof value === 'string' && value) {
        let {
          resolver,
          meta
        } = this;
        definition = resolveComponent(resolver, value, meta);
      }

      definition = this.curry(definition);
      this.lastValue = value;
      this.lastDefinition = definition;
      return definition;
    }

    get() {
      return UNDEFINED_REFERENCE;
    }

    curry(definition) {
      let {
        args
      } = this;

      if (!args && isCurriedComponentDefinition(definition)) {
        return definition;
      } else if (!definition) {
        return null;
      } else {
        return new CurriedComponentDefinition(definition, args);
      }
    }

  }

  class ClassListReference {
    constructor(list) {
      this.list = list;
      this.tag = (0, _reference.combineTagged)(list);
      this.list = list;
    }

    value() {
      let ret = [];
      let {
        list
      } = this;

      for (let i = 0; i < list.length; i++) {
        let value = normalizeStringValue(list[i].value());
        if (value) ret.push(value);
      }

      return ret.length === 0 ? null : ret.join(' ');
    }

  }
  /**
   * Converts a ComponentCapabilities object into a 32-bit integer representation.
   */


  function capabilityFlagsFrom(capabilities) {
    return 0 | (capabilities.dynamicLayout ? 1
    /* DynamicLayout */
    : 0) | (capabilities.dynamicTag ? 2
    /* DynamicTag */
    : 0) | (capabilities.prepareArgs ? 4
    /* PrepareArgs */
    : 0) | (capabilities.createArgs ? 8
    /* CreateArgs */
    : 0) | (capabilities.attributeHook ? 16
    /* AttributeHook */
    : 0) | (capabilities.elementHook ? 32
    /* ElementHook */
    : 0) | (capabilities.dynamicScope ? 64
    /* DynamicScope */
    : 0) | (capabilities.createCaller ? 128
    /* CreateCaller */
    : 0) | (capabilities.updateHook ? 256
    /* UpdateHook */
    : 0) | (capabilities.createInstance ? 512
    /* CreateInstance */
    : 0);
  }

  function hasCapability(capabilities, capability) {
    return !!(capabilities & capability);
  }

  APPEND_OPCODES.add(69
  /* IsComponent */
  , vm => {
    let stack = vm.stack;
    let ref = stack.pop();
    stack.push(IsCurriedComponentDefinitionReference.create(ref));
  });
  APPEND_OPCODES.add(70
  /* ContentType */
  , vm => {
    let stack = vm.stack;
    let ref = stack.peek();
    stack.push(new ContentTypeReference(ref));
  });
  APPEND_OPCODES.add(71
  /* CurryComponent */
  , (vm, {
    op1: _meta
  }) => {
    let stack = vm.stack;
    let definition = stack.pop();
    let capturedArgs = stack.pop();
    let meta = vm.constants.getSerializable(_meta);
    let resolver = vm.constants.resolver;
    vm.loadValue(_vm2.Register.v0, new CurryComponentReference(definition, resolver, meta, capturedArgs)); // expectStackChange(vm.stack, -args.length - 1, 'CurryComponent');
  });
  APPEND_OPCODES.add(72
  /* PushComponentDefinition */
  , (vm, {
    op1: handle
  }) => {
    let definition = vm.constants.resolveHandle(handle);
    let {
      manager
    } = definition;
    let capabilities = capabilityFlagsFrom(manager.getCapabilities(definition.state));
    let instance = {
      definition,
      manager,
      capabilities,
      state: null,
      handle: null,
      table: null,
      lookup: null
    };
    vm.stack.push(instance);
  });
  APPEND_OPCODES.add(75
  /* ResolveDynamicComponent */
  , (vm, {
    op1: _meta
  }) => {
    let stack = vm.stack;
    let component = stack.pop().value();
    let meta = vm.constants.getSerializable(_meta);
    vm.loadValue(_vm2.Register.t1, null); // Clear the temp register

    let definition;

    if (typeof component === 'string') {
      let {
        constants: {
          resolver
        }
      } = vm;
      let resolvedDefinition = resolveComponent(resolver, component, meta);
      definition = resolvedDefinition;
    } else if (isCurriedComponentDefinition(component)) {
      definition = component;
    } else {
      throw (0, _util.unreachable)();
    }

    stack.push(definition);
  });
  APPEND_OPCODES.add(73
  /* PushDynamicComponentInstance */
  , vm => {
    let {
      stack
    } = vm;
    let definition = stack.pop();
    let capabilities, manager;

    if (isCurriedComponentDefinition(definition)) {
      manager = capabilities = null;
    } else {
      manager = definition.manager;
      capabilities = capabilityFlagsFrom(manager.getCapabilities(definition.state));
    }

    stack.push({
      definition,
      capabilities,
      manager,
      state: null,
      handle: null,
      table: null
    });
  });
  APPEND_OPCODES.add(74
  /* PushCurriedComponent */
  , (vm, {}) => {
    let stack = vm.stack;
    let component = stack.pop().value();
    let definition;

    if (isCurriedComponentDefinition(component)) {
      definition = component;
    } else {
      throw (0, _util.unreachable)();
    }

    stack.push(definition);
  });
  APPEND_OPCODES.add(76
  /* PushArgs */
  , (vm, {
    op1: _names,
    op2: flags
  }) => {
    let stack = vm.stack;
    let names = vm.constants.getStringArray(_names);
    let positionalCount = flags >> 4;
    let synthetic = flags & 0b1000;
    let blockNames = [];
    if (flags & 0b0100) blockNames.push('main');
    if (flags & 0b0010) blockNames.push('else');
    if (flags & 0b0001) blockNames.push('attrs');
    vm.args.setup(stack, names, blockNames, positionalCount, !!synthetic);
    stack.push(vm.args);
  });
  APPEND_OPCODES.add(77
  /* PushEmptyArgs */
  , vm => {
    let {
      stack
    } = vm;
    stack.push(vm.args.empty(stack));
  });
  APPEND_OPCODES.add(80
  /* CaptureArgs */
  , vm => {
    let stack = vm.stack;
    let args = stack.pop();
    let capturedArgs = args.capture();
    stack.push(capturedArgs);
  });
  APPEND_OPCODES.add(79
  /* PrepareArgs */
  , (vm, {
    op1: _state
  }) => {
    let stack = vm.stack;
    let instance = vm.fetchValue(_state);
    let args = stack.pop();
    let {
      definition
    } = instance;

    if (isCurriedComponentDefinition(definition)) {
      definition = resolveCurriedComponentDefinition(instance, definition, args);
    }

    let {
      manager,
      state
    } = definition;
    let capabilities = instance.capabilities;

    if (hasCapability(capabilities, 4
    /* PrepareArgs */
    ) !== true) {
      stack.push(args);
      return;
    }

    let blocks = args.blocks.values;
    let blockNames = args.blocks.names;
    let preparedArgs = manager.prepareArgs(state, args);

    if (preparedArgs) {
      args.clear();

      for (let i = 0; i < blocks.length; i++) {
        stack.push(blocks[i]);
      }

      let {
        positional,
        named
      } = preparedArgs;
      let positionalCount = positional.length;

      for (let i = 0; i < positionalCount; i++) {
        stack.push(positional[i]);
      }

      let names = Object.keys(named);

      for (let i = 0; i < names.length; i++) {
        stack.push(named[names[i]]);
      }

      args.setup(stack, names, blockNames, positionalCount, true);
    }

    stack.push(args);
  });

  function resolveCurriedComponentDefinition(instance, definition, args) {
    let unwrappedDefinition = instance.definition = definition.unwrap(args);
    let {
      manager,
      state
    } = unwrappedDefinition;
    instance.manager = manager;
    instance.capabilities = capabilityFlagsFrom(manager.getCapabilities(state));
    return unwrappedDefinition;
  }

  APPEND_OPCODES.add(81
  /* CreateComponent */
  , (vm, {
    op1: flags,
    op2: _state
  }) => {
    let instance = vm.fetchValue(_state);
    let {
      definition,
      manager
    } = instance;
    let capabilities = instance.capabilities = capabilityFlagsFrom(manager.getCapabilities(definition.state));
    let dynamicScope = null;

    if (hasCapability(capabilities, 64
    /* DynamicScope */
    )) {
      dynamicScope = vm.dynamicScope();
    }

    let hasDefaultBlock = flags & 1;
    let args = null;

    if (hasCapability(capabilities, 8
    /* CreateArgs */
    )) {
      args = vm.stack.peek();
    }

    let self = null;

    if (hasCapability(capabilities, 128
    /* CreateCaller */
    )) {
      self = vm.getSelf();
    }

    let state = manager.create(vm.env, definition.state, args, dynamicScope, self, !!hasDefaultBlock); // We want to reuse the `state` POJO here, because we know that the opcodes
    // only transition at exactly one place.

    instance.state = state;
    let tag = manager.getTag(state);

    if (hasCapability(capabilities, 256
    /* UpdateHook */
    ) && !(0, _reference.isConstTag)(tag)) {
      vm.updateWith(new UpdateComponentOpcode(tag, state, manager, dynamicScope));
    }
  });
  APPEND_OPCODES.add(82
  /* RegisterComponentDestructor */
  , (vm, {
    op1: _state
  }) => {
    let {
      manager,
      state
    } = vm.fetchValue(_state);
    let destructor = manager.getDestructor(state);
    if (destructor) vm.newDestroyable(destructor);
  });
  APPEND_OPCODES.add(91
  /* BeginComponentTransaction */
  , vm => {
    vm.beginCacheGroup();
    vm.elements().pushSimpleBlock();
  });
  APPEND_OPCODES.add(83
  /* PutComponentOperations */
  , vm => {
    vm.loadValue(_vm2.Register.t0, new ComponentElementOperations());
  });
  APPEND_OPCODES.add(37
  /* ComponentAttr */
  , (vm, {
    op1: _name,
    op2: trusting,
    op3: _namespace
  }) => {
    let name = vm.constants.getString(_name);
    let reference = vm.stack.pop();
    let namespace = _namespace ? vm.constants.getString(_namespace) : null;
    vm.fetchValue(_vm2.Register.t0).setAttribute(name, reference, !!trusting, namespace);
  });

  class ComponentElementOperations {
    constructor() {
      this.attributes = (0, _util.dict)();
      this.classes = [];
      this.modifiers = [];
    }

    setAttribute(name, value, trusting, namespace) {
      let deferred = {
        value,
        namespace,
        trusting
      };

      if (name === 'class') {
        this.classes.push(value);
      }

      this.attributes[name] = deferred;
    }

    addModifier(manager, modifier) {
      this.modifiers.push([manager, modifier]);
    }

    flush(vm) {
      for (let name in this.attributes) {
        let attr = this.attributes[name];
        let {
          value: reference,
          namespace,
          trusting
        } = attr;

        if (name === 'class') {
          reference = new ClassListReference(this.classes);
        }

        if (name === 'type') {
          continue;
        }

        let attribute = vm.elements().setDynamicAttribute(name, reference.value(), trusting, namespace);

        if (!(0, _reference.isConst)(reference)) {
          vm.updateWith(new UpdateDynamicAttributeOpcode(reference, attribute));
        }
      }

      if ('type' in this.attributes) {
        let type = this.attributes.type;
        let {
          value: reference,
          namespace,
          trusting
        } = type;
        let attribute = vm.elements().setDynamicAttribute('type', reference.value(), trusting, namespace);

        if (!(0, _reference.isConst)(reference)) {
          vm.updateWith(new UpdateDynamicAttributeOpcode(reference, attribute));
        }
      }

      return this.modifiers;
    }

  }

  APPEND_OPCODES.add(93
  /* DidCreateElement */
  , (vm, {
    op1: _state
  }) => {
    let {
      definition,
      state
    } = vm.fetchValue(_state);
    let {
      manager
    } = definition;
    let operations = vm.fetchValue(_vm2.Register.t0);
    let action = 'DidCreateElementOpcode#evaluate';
    manager.didCreateElement(state, vm.elements().expectConstructing(action), operations);
  });
  APPEND_OPCODES.add(84
  /* GetComponentSelf */
  , (vm, {
    op1: _state
  }) => {
    let {
      definition,
      state
    } = vm.fetchValue(_state);
    let {
      manager
    } = definition;
    vm.stack.push(manager.getSelf(state));
  });
  APPEND_OPCODES.add(85
  /* GetComponentTagName */
  , (vm, {
    op1: _state
  }) => {
    let {
      definition,
      state
    } = vm.fetchValue(_state);
    let {
      manager
    } = definition;
    vm.stack.push(manager.getTagName(state));
  }); // Dynamic Invocation Only

  APPEND_OPCODES.add(86
  /* GetComponentLayout */
  , (vm, {
    op1: _state
  }) => {
    let instance = vm.fetchValue(_state);
    let {
      manager,
      definition
    } = instance;
    let {
      constants: {
        resolver
      },
      stack
    } = vm;
    let {
      state: instanceState,
      capabilities
    } = instance;
    let {
      state: definitionState
    } = definition;
    let invoke;

    if (hasStaticLayoutCapability(capabilities, manager)) {
      invoke = manager.getLayout(definitionState, resolver);
    } else if (hasDynamicLayoutCapability(capabilities, manager)) {
      invoke = manager.getDynamicLayout(instanceState, resolver);
    } else {
      throw (0, _util.unreachable)();
    }

    stack.push(invoke.symbolTable);
    stack.push(invoke.handle);
  });

  function hasStaticLayoutCapability(capabilities, _manager) {
    return hasCapability(capabilities, 1
    /* DynamicLayout */
    ) === false;
  }

  function hasDynamicLayoutCapability(capabilities, _manager) {
    return hasCapability(capabilities, 1
    /* DynamicLayout */
    ) === true;
  }

  APPEND_OPCODES.add(68
  /* Main */
  , (vm, {
    op1: register
  }) => {
    let definition = vm.stack.pop();
    let invocation = vm.stack.pop();
    let {
      manager
    } = definition;
    let capabilities = capabilityFlagsFrom(manager.getCapabilities(definition.state));
    let state = {
      definition,
      manager,
      capabilities,
      state: null,
      handle: invocation.handle,
      table: invocation.symbolTable,
      lookup: null
    };
    vm.loadValue(register, state);
  });
  APPEND_OPCODES.add(89
  /* PopulateLayout */
  , (vm, {
    op1: _state
  }) => {
    let {
      stack
    } = vm;
    let handle = stack.pop();
    let table = stack.pop();
    let state = vm.fetchValue(_state);
    state.handle = handle;
    state.table = table;
  });
  APPEND_OPCODES.add(21
  /* VirtualRootScope */
  , (vm, {
    op1: _state
  }) => {
    let {
      symbols
    } = vm.fetchValue(_state).table;
    vm.pushRootScope(symbols.length + 1, true);
  });
  APPEND_OPCODES.add(87
  /* SetupForEval */
  , (vm, {
    op1: _state
  }) => {
    let state = vm.fetchValue(_state);

    if (state.table.hasEval) {
      let lookup = state.lookup = (0, _util.dict)();
      vm.scope().bindEvalScope(lookup);
    }
  });
  APPEND_OPCODES.add(2
  /* SetNamedVariables */
  , (vm, {
    op1: _state
  }) => {
    let state = vm.fetchValue(_state);
    let scope = vm.scope();
    let args = vm.stack.peek();
    let callerNames = args.named.atNames;

    for (let i = callerNames.length - 1; i >= 0; i--) {
      let atName = callerNames[i];
      let symbol = state.table.symbols.indexOf(callerNames[i]);
      let value = args.named.get(atName, false);
      if (symbol !== -1) scope.bindSymbol(symbol + 1, value);
      if (state.lookup) state.lookup[atName] = value;
    }
  });

  function bindBlock(symbolName, blockName, state, blocks, vm) {
    let symbol = state.table.symbols.indexOf(symbolName);
    let block = blocks.get(blockName);

    if (symbol !== -1) {
      vm.scope().bindBlock(symbol + 1, block);
    }

    if (state.lookup) state.lookup[symbolName] = block;
  }

  APPEND_OPCODES.add(3
  /* SetBlocks */
  , (vm, {
    op1: _state
  }) => {
    let state = vm.fetchValue(_state);
    let {
      blocks
    } = vm.stack.peek();
    bindBlock('&attrs', 'attrs', state, blocks, vm);
    bindBlock('&inverse', 'else', state, blocks, vm);
    bindBlock('&default', 'main', state, blocks, vm);
  }); // Dynamic Invocation Only

  APPEND_OPCODES.add(90
  /* InvokeComponentLayout */
  , (vm, {
    op1: _state
  }) => {
    let state = vm.fetchValue(_state);
    vm.call(state.handle);
  });
  APPEND_OPCODES.add(94
  /* DidRenderLayout */
  , (vm, {
    op1: _state
  }) => {
    let {
      manager,
      state
    } = vm.fetchValue(_state);
    let bounds = vm.elements().popBlock();
    let mgr = manager;
    mgr.didRenderLayout(state, bounds);
    vm.env.didCreate(state, manager);
    vm.updateWith(new DidUpdateLayoutOpcode(manager, state, bounds));
  });
  APPEND_OPCODES.add(92
  /* CommitComponentTransaction */
  , vm => {
    vm.commitCacheGroup();
  });

  class UpdateComponentOpcode extends UpdatingOpcode {
    constructor(tag, component, manager, dynamicScope) {
      super();
      this.tag = tag;
      this.component = component;
      this.manager = manager;
      this.dynamicScope = dynamicScope;
      this.type = 'update-component';
    }

    evaluate(_vm) {
      let {
        component,
        manager,
        dynamicScope
      } = this;
      manager.update(component, dynamicScope);
    }

  }

  class DidUpdateLayoutOpcode extends UpdatingOpcode {
    constructor(manager, component, bounds) {
      super();
      this.manager = manager;
      this.component = component;
      this.bounds = bounds;
      this.type = 'did-update-layout';
      this.tag = _reference.CONSTANT_TAG;
    }

    evaluate(vm) {
      let {
        manager,
        component,
        bounds
      } = this;
      manager.didUpdateLayout(component, bounds);
      vm.env.didUpdate(component, manager);
    }

  }
  /* tslint:disable */


  function debugCallback(context, get) {
    console.info('Use `context`, and `get(<path>)` to debug this template.'); // for example...

    context === get('this');
    debugger;
  }
  /* tslint:enable */


  let callback = debugCallback; // For testing purposes

  function setDebuggerCallback(cb) {
    callback = cb;
  }

  function resetDebuggerCallback() {
    callback = debugCallback;
  }

  class ScopeInspector {
    constructor(scope, symbols, evalInfo) {
      this.scope = scope;
      this.locals = (0, _util.dict)();

      for (let i = 0; i < evalInfo.length; i++) {
        let slot = evalInfo[i];
        let name = symbols[slot - 1];
        let ref = scope.getSymbol(slot);
        this.locals[name] = ref;
      }
    }

    get(path) {
      let {
        scope,
        locals
      } = this;
      let parts = path.split('.');
      let [head, ...tail] = path.split('.');
      let evalScope = scope.getEvalScope();
      let ref;

      if (head === 'this') {
        ref = scope.getSelf();
      } else if (locals[head]) {
        ref = locals[head];
      } else if (head.indexOf('@') === 0 && evalScope[head]) {
        ref = evalScope[head];
      } else {
        ref = this.scope.getSelf();
        tail = parts;
      }

      return tail.reduce((r, part) => r.get(part), ref);
    }

  }

  APPEND_OPCODES.add(97
  /* Debugger */
  , (vm, {
    op1: _symbols,
    op2: _evalInfo
  }) => {
    let symbols = vm.constants.getStringArray(_symbols);
    let evalInfo = vm.constants.getArray(_evalInfo);
    let inspector = new ScopeInspector(vm.scope(), symbols, evalInfo);
    callback(vm.getSelf().value(), path => inspector.get(path).value());
  });
  APPEND_OPCODES.add(95
  /* InvokePartial */
  , (vm, {
    op1: _meta,
    op2: _symbols,
    op3: _evalInfo
  }) => {
    let {
      constants,
      constants: {
        resolver
      },
      stack
    } = vm;
    let name = stack.pop().value();
    let meta = constants.getSerializable(_meta);
    let outerSymbols = constants.getStringArray(_symbols);
    let evalInfo = constants.getArray(_evalInfo);
    let handle = resolver.lookupPartial(name, meta);
    let definition = resolver.resolve(handle);
    let {
      symbolTable,
      handle: vmHandle
    } = definition.getPartial();
    {
      let partialSymbols = symbolTable.symbols;
      let outerScope = vm.scope();
      let partialScope = vm.pushRootScope(partialSymbols.length, false);
      let evalScope = outerScope.getEvalScope();
      partialScope.bindCallerScope(outerScope.getCallerScope());
      partialScope.bindEvalScope(evalScope);
      partialScope.bindSelf(outerScope.getSelf());
      let locals = Object.create(outerScope.getPartialMap());

      for (let i = 0; i < evalInfo.length; i++) {
        let slot = evalInfo[i];
        let name = outerSymbols[slot - 1];
        let ref = outerScope.getSymbol(slot);
        locals[name] = ref;
      }

      if (evalScope) {
        for (let i = 0; i < partialSymbols.length; i++) {
          let name = partialSymbols[i];
          let symbol = i + 1;
          let value = evalScope[name];
          if (value !== undefined) partialScope.bind(symbol, value);
        }
      }

      partialScope.bindPartialMap(locals);
      vm.pushFrame(); // sp += 2

      vm.call(vmHandle);
    }
  });

  class IterablePresenceReference {
    constructor(artifacts) {
      this.tag = artifacts.tag;
      this.artifacts = artifacts;
    }

    value() {
      return !this.artifacts.isEmpty();
    }

  }

  APPEND_OPCODES.add(66
  /* PutIterator */
  , vm => {
    let stack = vm.stack;
    let listRef = stack.pop();
    let key = stack.pop();
    let iterable = vm.env.iterableFor(listRef, key.value());
    let iterator = new _reference.ReferenceIterator(iterable);
    stack.push(iterator);
    stack.push(new IterablePresenceReference(iterator.artifacts));
  });
  APPEND_OPCODES.add(64
  /* EnterList */
  , (vm, {
    op1: relativeStart
  }) => {
    vm.enterList(relativeStart);
  });
  APPEND_OPCODES.add(65
  /* ExitList */
  , vm => {
    vm.exitList();
  });
  APPEND_OPCODES.add(67
  /* Iterate */
  , (vm, {
    op1: breaks
  }) => {
    let stack = vm.stack;
    let item = stack.peek().next();

    if (item) {
      let tryOpcode = vm.iterate(item.memo, item.value);
      vm.enterItem(item.key, tryOpcode);
    } else {
      vm.goto(breaks);
    }
  });

  class Cursor {
    constructor(element, nextSibling) {
      this.element = element;
      this.nextSibling = nextSibling;
    }

  }

  _exports.Cursor = Cursor;

  class ConcreteBounds {
    constructor(parentNode, first, last) {
      this.parentNode = parentNode;
      this.first = first;
      this.last = last;
    }

    parentElement() {
      return this.parentNode;
    }

    firstNode() {
      return this.first;
    }

    lastNode() {
      return this.last;
    }

  }

  _exports.ConcreteBounds = ConcreteBounds;

  class SingleNodeBounds {
    constructor(parentNode, node) {
      this.parentNode = parentNode;
      this.node = node;
    }

    parentElement() {
      return this.parentNode;
    }

    firstNode() {
      return this.node;
    }

    lastNode() {
      return this.node;
    }

  }

  function move(bounds, reference) {
    let parent = bounds.parentElement();
    let first = bounds.firstNode();
    let last = bounds.lastNode();
    let current = first;

    while (true) {
      let next = current.nextSibling;
      parent.insertBefore(current, reference);

      if (current === last) {
        return next;
      }

      current = next;
    }
  }

  function clear(bounds) {
    let parent = bounds.parentElement();
    let first = bounds.firstNode();
    let last = bounds.lastNode();
    let current = first;

    while (true) {
      let next = current.nextSibling;
      parent.removeChild(current);

      if (current === last) {
        return next;
      }

      current = next;
    }
  } // Patch:    insertAdjacentHTML on SVG Fix
  // Browsers: Safari, IE, Edge, Firefox ~33-34
  // Reason:   insertAdjacentHTML does not exist on SVG elements in Safari. It is
  //           present but throws an exception on IE and Edge. Old versions of
  //           Firefox create nodes in the incorrect namespace.
  // Fix:      Since IE and Edge silently fail to create SVG nodes using
  //           innerHTML, and because Firefox may create nodes in the incorrect
  //           namespace using innerHTML on SVG elements, an HTML-string wrapping
  //           approach is used. A pre/post SVG tag is added to the string, then
  //           that whole string is added to a div. The created nodes are plucked
  //           out and applied to the target location on DOM.


  function applySVGInnerHTMLFix(document, DOMClass, svgNamespace) {
    if (!document) return DOMClass;

    if (!shouldApplyFix(document, svgNamespace)) {
      return DOMClass;
    }

    let div = document.createElement('div');
    return class DOMChangesWithSVGInnerHTMLFix extends DOMClass {
      insertHTMLBefore(parent, nextSibling, html) {
        if (html === '') {
          return super.insertHTMLBefore(parent, nextSibling, html);
        }

        if (parent.namespaceURI !== svgNamespace) {
          return super.insertHTMLBefore(parent, nextSibling, html);
        }

        return fixSVG(parent, div, html, nextSibling);
      }

    };
  }

  function fixSVG(parent, div, html, reference) {
    let source; // This is important, because decendants of the <foreignObject> integration
    // point are parsed in the HTML namespace

    if (parent.tagName.toUpperCase() === 'FOREIGNOBJECT') {
      // IE, Edge: also do not correctly support using `innerHTML` on SVG
      // namespaced elements. So here a wrapper is used.
      let wrappedHtml = '<svg><foreignObject>' + html + '</foreignObject></svg>';
      div.innerHTML = wrappedHtml;
      source = div.firstChild.firstChild;
    } else {
      // IE, Edge: also do not correctly support using `innerHTML` on SVG
      // namespaced elements. So here a wrapper is used.
      let wrappedHtml = '<svg>' + html + '</svg>';
      div.innerHTML = wrappedHtml;
      source = div.firstChild;
    }

    return moveNodesBefore(source, parent, reference);
  }

  function shouldApplyFix(document, svgNamespace) {
    let svg = document.createElementNS(svgNamespace, 'svg');

    try {
      svg['insertAdjacentHTML']('beforeend', '<circle></circle>');
    } catch (e) {// IE, Edge: Will throw, insertAdjacentHTML is unsupported on SVG
      // Safari: Will throw, insertAdjacentHTML is not present on SVG
    } finally {
      // FF: Old versions will create a node in the wrong namespace
      if (svg.childNodes.length === 1 && svg.firstChild.namespaceURI === SVG_NAMESPACE) {
        // The test worked as expected, no fix required
        return false;
      }

      return true;
    }
  } // Patch:    Adjacent text node merging fix
  // Browsers: IE, Edge, Firefox w/o inspector open
  // Reason:   These browsers will merge adjacent text nodes. For exmaple given
  //           <div>Hello</div> with div.insertAdjacentHTML(' world') browsers
  //           with proper behavior will populate div.childNodes with two items.
  //           These browsers will populate it with one merged node instead.
  // Fix:      Add these nodes to a wrapper element, then iterate the childNodes
  //           of that wrapper and move the nodes to their target location. Note
  //           that potential SVG bugs will have been handled before this fix.
  //           Note that this fix must only apply to the previous text node, as
  //           the base implementation of `insertHTMLBefore` already handles
  //           following text nodes correctly.


  function applyTextNodeMergingFix(document, DOMClass) {
    if (!document) return DOMClass;

    if (!shouldApplyFix$1(document)) {
      return DOMClass;
    }

    return class DOMChangesWithTextNodeMergingFix extends DOMClass {
      constructor(document) {
        super(document);
        this.uselessComment = document.createComment('');
      }

      insertHTMLBefore(parent, nextSibling, html) {
        if (html === '') {
          return super.insertHTMLBefore(parent, nextSibling, html);
        }

        let didSetUselessComment = false;
        let nextPrevious = nextSibling ? nextSibling.previousSibling : parent.lastChild;

        if (nextPrevious && nextPrevious instanceof Text) {
          didSetUselessComment = true;
          parent.insertBefore(this.uselessComment, nextSibling);
        }

        let bounds = super.insertHTMLBefore(parent, nextSibling, html);

        if (didSetUselessComment) {
          parent.removeChild(this.uselessComment);
        }

        return bounds;
      }

    };
  }

  function shouldApplyFix$1(document) {
    let mergingTextDiv = document.createElement('div');
    mergingTextDiv.innerHTML = 'first';
    mergingTextDiv.insertAdjacentHTML('beforeend', 'second');

    if (mergingTextDiv.childNodes.length === 2) {
      // It worked as expected, no fix required
      return false;
    }

    return true;
  }

  const SVG_NAMESPACE = "http://www.w3.org/2000/svg"
  /* SVG */
  ; // http://www.w3.org/TR/html/syntax.html#html-integration-point

  _exports.SVG_NAMESPACE = SVG_NAMESPACE;
  const SVG_INTEGRATION_POINTS = {
    foreignObject: 1,
    desc: 1,
    title: 1
  }; // http://www.w3.org/TR/html/syntax.html#adjust-svg-attributes
  // TODO: Adjust SVG attributes
  // http://www.w3.org/TR/html/syntax.html#parsing-main-inforeign
  // TODO: Adjust SVG elements
  // http://www.w3.org/TR/html/syntax.html#parsing-main-inforeign

  const BLACKLIST_TABLE = Object.create(null);
  ['b', 'big', 'blockquote', 'body', 'br', 'center', 'code', 'dd', 'div', 'dl', 'dt', 'em', 'embed', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'hr', 'i', 'img', 'li', 'listing', 'main', 'meta', 'nobr', 'ol', 'p', 'pre', 'ruby', 's', 'small', 'span', 'strong', 'strike', 'sub', 'sup', 'table', 'tt', 'u', 'ul', 'var'].forEach(tag => BLACKLIST_TABLE[tag] = 1);
  const WHITESPACE = /[\t-\r \xA0\u1680\u180E\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]/;
  let doc = typeof document === 'undefined' ? null : document;

  function isWhitespace(string) {
    return WHITESPACE.test(string);
  }

  function moveNodesBefore(source, target, nextSibling) {
    let first = source.firstChild;
    let last = first;
    let current = first;

    while (current) {
      let next = current.nextSibling;
      target.insertBefore(current, nextSibling);
      last = current;
      current = next;
    }

    return new ConcreteBounds(target, first, last);
  }

  class DOMOperations {
    constructor(document) {
      this.document = document;
      this.setupUselessElement();
    } // split into seperate method so that NodeDOMTreeConstruction
    // can override it.


    setupUselessElement() {
      this.uselessElement = this.document.createElement('div');
    }

    createElement(tag, context) {
      let isElementInSVGNamespace, isHTMLIntegrationPoint;

      if (context) {
        isElementInSVGNamespace = context.namespaceURI === SVG_NAMESPACE || tag === 'svg';
        isHTMLIntegrationPoint = SVG_INTEGRATION_POINTS[context.tagName];
      } else {
        isElementInSVGNamespace = tag === 'svg';
        isHTMLIntegrationPoint = false;
      }

      if (isElementInSVGNamespace && !isHTMLIntegrationPoint) {
        // FIXME: This does not properly handle <font> with color, face, or
        // size attributes, which is also disallowed by the spec. We should fix
        // this.
        if (BLACKLIST_TABLE[tag]) {
          throw new Error("Cannot create a " + tag + " inside an SVG context");
        }

        return this.document.createElementNS(SVG_NAMESPACE, tag);
      } else {
        return this.document.createElement(tag);
      }
    }

    insertBefore(parent, node, reference) {
      parent.insertBefore(node, reference);
    }

    insertHTMLBefore(parent, nextSibling, html) {
      if (html === '') {
        let comment = this.createComment('');
        parent.insertBefore(comment, nextSibling);
        return new ConcreteBounds(parent, comment, comment);
      }

      let prev = nextSibling ? nextSibling.previousSibling : parent.lastChild;
      let last;

      if (nextSibling === null) {
        parent.insertAdjacentHTML("beforeend"
        /* beforeend */
        , html);
        last = parent.lastChild;
      } else if (nextSibling instanceof HTMLElement) {
        nextSibling.insertAdjacentHTML("beforebegin"
        /* beforebegin */
        , html);
        last = nextSibling.previousSibling;
      } else {
        // Non-element nodes do not support insertAdjacentHTML, so add an
        // element and call it on that element. Then remove the element.
        //
        // This also protects Edge, IE and Firefox w/o the inspector open
        // from merging adjacent text nodes. See ./compat/text-node-merging-fix.ts
        let {
          uselessElement
        } = this;
        parent.insertBefore(uselessElement, nextSibling);
        uselessElement.insertAdjacentHTML("beforebegin"
        /* beforebegin */
        , html);
        last = uselessElement.previousSibling;
        parent.removeChild(uselessElement);
      }

      let first = prev ? prev.nextSibling : parent.firstChild;
      return new ConcreteBounds(parent, first, last);
    }

    createTextNode(text) {
      return this.document.createTextNode(text);
    }

    createComment(data) {
      return this.document.createComment(data);
    }

  }

  var DOM;

  (function (DOM) {
    class TreeConstruction extends DOMOperations {
      createElementNS(namespace, tag) {
        return this.document.createElementNS(namespace, tag);
      }

      setAttribute(element, name, value, namespace = null) {
        if (namespace) {
          element.setAttributeNS(namespace, name, value);
        } else {
          element.setAttribute(name, value);
        }
      }

    }

    DOM.TreeConstruction = TreeConstruction;
    let appliedTreeContruction = TreeConstruction;
    appliedTreeContruction = applyTextNodeMergingFix(doc, appliedTreeContruction);
    appliedTreeContruction = applySVGInnerHTMLFix(doc, appliedTreeContruction, SVG_NAMESPACE);
    DOM.DOMTreeConstruction = appliedTreeContruction;
  })(DOM || (DOM = {}));

  class DOMChanges extends DOMOperations {
    constructor(document) {
      super(document);
      this.document = document;
      this.namespace = null;
    }

    setAttribute(element, name, value) {
      element.setAttribute(name, value);
    }

    removeAttribute(element, name) {
      element.removeAttribute(name);
    }

    insertAfter(element, node, reference) {
      this.insertBefore(element, node, reference.nextSibling);
    }

  }

  _exports.IDOMChanges = DOMChanges;
  let helper = DOMChanges;
  helper = applyTextNodeMergingFix(doc, helper);
  helper = applySVGInnerHTMLFix(doc, helper, SVG_NAMESPACE);
  var helper$1 = helper;
  _exports.DOMChanges = helper$1;
  const DOMTreeConstruction = DOM.DOMTreeConstruction;
  _exports.DOMTreeConstruction = DOMTreeConstruction;
  const badProtocols = ['javascript:', 'vbscript:'];
  const badTags = ['A', 'BODY', 'LINK', 'IMG', 'IFRAME', 'BASE', 'FORM'];
  const badTagsForDataURI = ['EMBED'];
  const badAttributes = ['href', 'src', 'background', 'action'];
  const badAttributesForDataURI = ['src'];

  function has(array, item) {
    return array.indexOf(item) !== -1;
  }

  function checkURI(tagName, attribute) {
    return (tagName === null || has(badTags, tagName)) && has(badAttributes, attribute);
  }

  function checkDataURI(tagName, attribute) {
    if (tagName === null) return false;
    return has(badTagsForDataURI, tagName) && has(badAttributesForDataURI, attribute);
  }

  function requiresSanitization(tagName, attribute) {
    return checkURI(tagName, attribute) || checkDataURI(tagName, attribute);
  }

  function sanitizeAttributeValue(env, element, attribute, value) {
    let tagName = null;

    if (value === null || value === undefined) {
      return value;
    }

    if (isSafeString(value)) {
      return value.toHTML();
    }

    if (!element) {
      tagName = null;
    } else {
      tagName = element.tagName.toUpperCase();
    }

    let str = normalizeStringValue(value);

    if (checkURI(tagName, attribute)) {
      let protocol = env.protocolForURL(str);

      if (has(badProtocols, protocol)) {
        return "unsafe:" + str;
      }
    }

    if (checkDataURI(tagName, attribute)) {
      return "unsafe:" + str;
    }

    return str;
  }
  /*
   * @method normalizeProperty
   * @param element {HTMLElement}
   * @param slotName {String}
   * @returns {Object} { name, type }
   */


  function normalizeProperty(element, slotName) {
    let type, normalized;

    if (slotName in element) {
      normalized = slotName;
      type = 'prop';
    } else {
      let lower = slotName.toLowerCase();

      if (lower in element) {
        type = 'prop';
        normalized = lower;
      } else {
        type = 'attr';
        normalized = slotName;
      }
    }

    if (type === 'prop' && (normalized.toLowerCase() === 'style' || preferAttr(element.tagName, normalized))) {
      type = 'attr';
    }

    return {
      normalized,
      type
    };
  } // properties that MUST be set as attributes, due to:
  // * browser bug
  // * strange spec outlier


  const ATTR_OVERRIDES = {
    INPUT: {
      form: true,
      // Chrome 46.0.2464.0: 'autocorrect' in document.createElement('input') === false
      // Safari 8.0.7: 'autocorrect' in document.createElement('input') === false
      // Mobile Safari (iOS 8.4 simulator): 'autocorrect' in document.createElement('input') === true
      autocorrect: true,
      // Chrome 54.0.2840.98: 'list' in document.createElement('input') === true
      // Safari 9.1.3: 'list' in document.createElement('input') === false
      list: true
    },
    // element.form is actually a legitimate readOnly property, that is to be
    // mutated, but must be mutated by setAttribute...
    SELECT: {
      form: true
    },
    OPTION: {
      form: true
    },
    TEXTAREA: {
      form: true
    },
    LABEL: {
      form: true
    },
    FIELDSET: {
      form: true
    },
    LEGEND: {
      form: true
    },
    OBJECT: {
      form: true
    },
    BUTTON: {
      form: true
    }
  };

  function preferAttr(tagName, propName) {
    let tag = ATTR_OVERRIDES[tagName.toUpperCase()];
    return tag && tag[propName.toLowerCase()] || false;
  }

  function dynamicAttribute(element, attr, namespace) {
    let {
      tagName,
      namespaceURI
    } = element;
    let attribute = {
      element,
      name: attr,
      namespace
    };

    if (namespaceURI === SVG_NAMESPACE) {
      return buildDynamicAttribute(tagName, attr, attribute);
    }

    let {
      type,
      normalized
    } = normalizeProperty(element, attr);

    if (type === 'attr') {
      return buildDynamicAttribute(tagName, normalized, attribute);
    } else {
      return buildDynamicProperty(tagName, normalized, attribute);
    }
  }

  function buildDynamicAttribute(tagName, name, attribute) {
    if (requiresSanitization(tagName, name)) {
      return new SafeDynamicAttribute(attribute);
    } else {
      return new SimpleDynamicAttribute(attribute);
    }
  }

  function buildDynamicProperty(tagName, name, attribute) {
    if (requiresSanitization(tagName, name)) {
      return new SafeDynamicProperty(name, attribute);
    }

    if (isUserInputValue(tagName, name)) {
      return new InputValueDynamicAttribute(name, attribute);
    }

    if (isOptionSelected(tagName, name)) {
      return new OptionSelectedDynamicAttribute(name, attribute);
    }

    return new DefaultDynamicProperty(name, attribute);
  }

  class DynamicAttribute {
    constructor(attribute) {
      this.attribute = attribute;
    }

  }

  _exports.DynamicAttribute = DynamicAttribute;

  class SimpleDynamicAttribute extends DynamicAttribute {
    set(dom, value, _env) {
      let normalizedValue = normalizeValue(value);

      if (normalizedValue !== null) {
        let {
          name,
          namespace
        } = this.attribute;

        dom.__setAttribute(name, normalizedValue, namespace);
      }
    }

    update(value, _env) {
      let normalizedValue = normalizeValue(value);
      let {
        element,
        name
      } = this.attribute;

      if (normalizedValue === null) {
        element.removeAttribute(name);
      } else {
        element.setAttribute(name, normalizedValue);
      }
    }

  }

  _exports.SimpleDynamicAttribute = SimpleDynamicAttribute;

  class DefaultDynamicProperty extends DynamicAttribute {
    constructor(normalizedName, attribute) {
      super(attribute);
      this.normalizedName = normalizedName;
    }

    set(dom, value, _env) {
      if (value !== null && value !== undefined) {
        this.value = value;

        dom.__setProperty(this.normalizedName, value);
      }
    }

    update(value, _env) {
      let {
        element
      } = this.attribute;

      if (this.value !== value) {
        element[this.normalizedName] = this.value = value;

        if (value === null || value === undefined) {
          this.removeAttribute();
        }
      }
    }

    removeAttribute() {
      // TODO this sucks but to preserve properties first and to meet current
      // semantics we must do this.
      let {
        element,
        namespace
      } = this.attribute;

      if (namespace) {
        element.removeAttributeNS(namespace, this.normalizedName);
      } else {
        element.removeAttribute(this.normalizedName);
      }
    }

  }

  class SafeDynamicProperty extends DefaultDynamicProperty {
    set(dom, value, env) {
      let {
        element,
        name
      } = this.attribute;
      let sanitized = sanitizeAttributeValue(env, element, name, value);
      super.set(dom, sanitized, env);
    }

    update(value, env) {
      let {
        element,
        name
      } = this.attribute;
      let sanitized = sanitizeAttributeValue(env, element, name, value);
      super.update(sanitized, env);
    }

  }

  class SafeDynamicAttribute extends SimpleDynamicAttribute {
    set(dom, value, env) {
      let {
        element,
        name
      } = this.attribute;
      let sanitized = sanitizeAttributeValue(env, element, name, value);
      super.set(dom, sanitized, env);
    }

    update(value, env) {
      let {
        element,
        name
      } = this.attribute;
      let sanitized = sanitizeAttributeValue(env, element, name, value);
      super.update(sanitized, env);
    }

  }

  class InputValueDynamicAttribute extends DefaultDynamicProperty {
    set(dom, value) {
      dom.__setProperty('value', normalizeStringValue(value));
    }

    update(value) {
      let input = this.attribute.element;
      let currentValue = input.value;
      let normalizedValue = normalizeStringValue(value);

      if (currentValue !== normalizedValue) {
        input.value = normalizedValue;
      }
    }

  }

  class OptionSelectedDynamicAttribute extends DefaultDynamicProperty {
    set(dom, value) {
      if (value !== null && value !== undefined && value !== false) {
        dom.__setProperty('selected', true);
      }
    }

    update(value) {
      let option = this.attribute.element;

      if (value) {
        option.selected = true;
      } else {
        option.selected = false;
      }
    }

  }

  function isOptionSelected(tagName, attribute) {
    return tagName === 'OPTION' && attribute === 'selected';
  }

  function isUserInputValue(tagName, attribute) {
    return (tagName === 'INPUT' || tagName === 'TEXTAREA') && attribute === 'value';
  }

  function normalizeValue(value) {
    if (value === false || value === undefined || value === null || typeof value.toString === 'undefined') {
      return null;
    }

    if (value === true) {
      return '';
    } // onclick function etc in SSR


    if (typeof value === 'function') {
      return null;
    }

    return String(value);
  }

  class Scope {
    constructor( // the 0th slot is `self`
    slots, callerScope, // named arguments and blocks passed to a layout that uses eval
    evalScope, // locals in scope when the partial was invoked
    partialMap) {
      this.slots = slots;
      this.callerScope = callerScope;
      this.evalScope = evalScope;
      this.partialMap = partialMap;
    }

    static root(self, size = 0) {
      let refs = new Array(size + 1);

      for (let i = 0; i <= size; i++) {
        refs[i] = UNDEFINED_REFERENCE;
      }

      return new Scope(refs, null, null, null).init({
        self
      });
    }

    static sized(size = 0) {
      let refs = new Array(size + 1);

      for (let i = 0; i <= size; i++) {
        refs[i] = UNDEFINED_REFERENCE;
      }

      return new Scope(refs, null, null, null);
    }

    init({
      self
    }) {
      this.slots[0] = self;
      return this;
    }

    getSelf() {
      return this.get(0);
    }

    getSymbol(symbol) {
      return this.get(symbol);
    }

    getBlock(symbol) {
      let block = this.get(symbol);
      return block === UNDEFINED_REFERENCE ? null : block;
    }

    getEvalScope() {
      return this.evalScope;
    }

    getPartialMap() {
      return this.partialMap;
    }

    bind(symbol, value) {
      this.set(symbol, value);
    }

    bindSelf(self) {
      this.set(0, self);
    }

    bindSymbol(symbol, value) {
      this.set(symbol, value);
    }

    bindBlock(symbol, value) {
      this.set(symbol, value);
    }

    bindEvalScope(map) {
      this.evalScope = map;
    }

    bindPartialMap(map) {
      this.partialMap = map;
    }

    bindCallerScope(scope) {
      this.callerScope = scope;
    }

    getCallerScope() {
      return this.callerScope;
    }

    child() {
      return new Scope(this.slots.slice(), this.callerScope, this.evalScope, this.partialMap);
    }

    get(index) {
      if (index >= this.slots.length) {
        throw new RangeError("BUG: cannot get $" + index + " from scope; length=" + this.slots.length);
      }

      return this.slots[index];
    }

    set(index, value) {
      if (index >= this.slots.length) {
        throw new RangeError("BUG: cannot get $" + index + " from scope; length=" + this.slots.length);
      }

      this.slots[index] = value;
    }

  }

  _exports.Scope = Scope;

  class Transaction {
    constructor() {
      this.scheduledInstallManagers = [];
      this.scheduledInstallModifiers = [];
      this.scheduledUpdateModifierManagers = [];
      this.scheduledUpdateModifiers = [];
      this.createdComponents = [];
      this.createdManagers = [];
      this.updatedComponents = [];
      this.updatedManagers = [];
      this.destructors = [];
    }

    didCreate(component, manager) {
      this.createdComponents.push(component);
      this.createdManagers.push(manager);
    }

    didUpdate(component, manager) {
      this.updatedComponents.push(component);
      this.updatedManagers.push(manager);
    }

    scheduleInstallModifier(modifier, manager) {
      this.scheduledInstallModifiers.push(modifier);
      this.scheduledInstallManagers.push(manager);
    }

    scheduleUpdateModifier(modifier, manager) {
      this.scheduledUpdateModifiers.push(modifier);
      this.scheduledUpdateModifierManagers.push(manager);
    }

    didDestroy(d) {
      this.destructors.push(d);
    }

    commit() {
      let {
        createdComponents,
        createdManagers
      } = this;

      for (let i = 0; i < createdComponents.length; i++) {
        let component = createdComponents[i];
        let manager = createdManagers[i];
        manager.didCreate(component);
      }

      let {
        updatedComponents,
        updatedManagers
      } = this;

      for (let i = 0; i < updatedComponents.length; i++) {
        let component = updatedComponents[i];
        let manager = updatedManagers[i];
        manager.didUpdate(component);
      }

      let {
        destructors
      } = this;

      for (let i = 0; i < destructors.length; i++) {
        destructors[i].destroy();
      }

      let {
        scheduledInstallManagers,
        scheduledInstallModifiers
      } = this;

      for (let i = 0; i < scheduledInstallManagers.length; i++) {
        let modifier = scheduledInstallModifiers[i];
        let manager = scheduledInstallManagers[i];
        manager.install(modifier);
      }

      let {
        scheduledUpdateModifierManagers,
        scheduledUpdateModifiers
      } = this;

      for (let i = 0; i < scheduledUpdateModifierManagers.length; i++) {
        let modifier = scheduledUpdateModifiers[i];
        let manager = scheduledUpdateModifierManagers[i];
        manager.update(modifier);
      }
    }

  }

  class Environment {
    constructor({
      appendOperations,
      updateOperations
    }) {
      this._transaction = null;
      this.appendOperations = appendOperations;
      this.updateOperations = updateOperations;
    }

    toConditionalReference(reference) {
      return new ConditionalReference(reference);
    }

    getAppendOperations() {
      return this.appendOperations;
    }

    getDOM() {
      return this.updateOperations;
    }

    begin() {
      this._transaction = new Transaction();
    }

    get transaction() {
      return this._transaction;
    }

    didCreate(component, manager) {
      this.transaction.didCreate(component, manager);
    }

    didUpdate(component, manager) {
      this.transaction.didUpdate(component, manager);
    }

    scheduleInstallModifier(modifier, manager) {
      this.transaction.scheduleInstallModifier(modifier, manager);
    }

    scheduleUpdateModifier(modifier, manager) {
      this.transaction.scheduleUpdateModifier(modifier, manager);
    }

    didDestroy(d) {
      this.transaction.didDestroy(d);
    }

    commit() {
      let transaction = this.transaction;
      this._transaction = null;
      transaction.commit();
    }

    attributeFor(element, attr, _isTrusting, namespace = null) {
      return dynamicAttribute(element, attr, namespace);
    }

  }

  _exports.Environment = Environment;

  class DefaultEnvironment extends Environment {
    constructor(options) {
      if (!options) {
        let document = window.document;
        let appendOperations = new DOMTreeConstruction(document);
        let updateOperations = new DOMChanges(document);
        options = {
          appendOperations,
          updateOperations
        };
      }

      super(options);
    }

  }

  _exports.DefaultEnvironment = DefaultEnvironment;

  class LowLevelVM {
    constructor(stack, heap, program, externs, pc = -1, ra = -1) {
      this.stack = stack;
      this.heap = heap;
      this.program = program;
      this.externs = externs;
      this.pc = pc;
      this.ra = ra;
      this.currentOpSize = 0;
    } // Start a new frame and save $ra and $fp on the stack


    pushFrame() {
      this.stack.push(this.ra);
      this.stack.push(this.stack.fp);
      this.stack.fp = this.stack.sp - 1;
    } // Restore $ra, $sp and $fp


    popFrame() {
      this.stack.sp = this.stack.fp - 1;
      this.ra = this.stack.get(0);
      this.stack.fp = this.stack.get(1);
    }

    pushSmallFrame() {
      this.stack.push(this.ra);
    }

    popSmallFrame() {
      this.ra = this.stack.popSmi();
    } // Jump to an address in `program`


    goto(offset) {
      let addr = this.pc + offset - this.currentOpSize;
      this.pc = addr;
    } // Save $pc into $ra, then jump to a new address in `program` (jal in MIPS)


    call(handle) {
      this.ra = this.pc;
      this.pc = this.heap.getaddr(handle);
    } // Put a specific `program` address in $ra


    returnTo(offset) {
      let addr = this.pc + offset - this.currentOpSize;
      this.ra = addr;
    } // Return to the `program` address stored in $ra


    return() {
      this.pc = this.ra;
    }

    nextStatement() {
      let {
        pc,
        program
      } = this;

      if (pc === -1) {
        return null;
      } // We have to save off the current operations size so that
      // when we do a jump we can calculate the correct offset
      // to where we are going. We can't simply ask for the size
      // in a jump because we have have already incremented the
      // program counter to the next instruction prior to executing.


      let {
        size
      } = this.program.opcode(pc);
      let operationSize = this.currentOpSize = size;
      this.pc += operationSize;
      return program.opcode(pc);
    }

    evaluateOuter(opcode, vm) {
      {
        this.evaluateInner(opcode, vm);
      }
    }

    evaluateInner(opcode, vm) {
      if (opcode.isMachine) {
        this.evaluateMachine(opcode);
      } else {
        this.evaluateSyscall(opcode, vm);
      }
    }

    evaluateMachine(opcode) {
      switch (opcode.type) {
        case 57
        /* PushFrame */
        :
          return this.pushFrame();

        case 58
        /* PopFrame */
        :
          return this.popFrame();

        case 59
        /* PushSmallFrame */
        :
          return this.pushSmallFrame();

        case 60
        /* PopSmallFrame */
        :
          return this.popSmallFrame();

        case 50
        /* InvokeStatic */
        :
          return this.call(opcode.op1);

        case 49
        /* InvokeVirtual */
        :
          return this.call(this.stack.popSmi());

        case 52
        /* Jump */
        :
          return this.goto(opcode.op1);

        case 24
        /* Return */
        :
          return this.return();

        case 25
        /* ReturnTo */
        :
          return this.returnTo(opcode.op1);
      }
    }

    evaluateSyscall(opcode, vm) {
      APPEND_OPCODES.evaluate(vm, opcode, opcode.type);
    }

  }

  class First {
    constructor(node) {
      this.node = node;
    }

    firstNode() {
      return this.node;
    }

  }

  class Last {
    constructor(node) {
      this.node = node;
    }

    lastNode() {
      return this.node;
    }

  }

  class NewElementBuilder {
    constructor(env, parentNode, nextSibling) {
      this.constructing = null;
      this.operations = null;
      this.cursorStack = new _util.Stack();
      this.modifierStack = new _util.Stack();
      this.blockStack = new _util.Stack();
      this.pushElement(parentNode, nextSibling);
      this.env = env;
      this.dom = env.getAppendOperations();
      this.updateOperations = env.getDOM();
    }

    static forInitialRender(env, cursor) {
      let builder = new this(env, cursor.element, cursor.nextSibling);
      builder.pushSimpleBlock();
      return builder;
    }

    static resume(env, tracker, nextSibling) {
      let parentNode = tracker.parentElement();
      let stack = new this(env, parentNode, nextSibling);
      stack.pushSimpleBlock();
      stack.pushBlockTracker(tracker);
      return stack;
    }

    get element() {
      return this.cursorStack.current.element;
    }

    get nextSibling() {
      return this.cursorStack.current.nextSibling;
    }

    expectConstructing(method) {
      return this.constructing;
    }

    block() {
      return this.blockStack.current;
    }

    popElement() {
      this.cursorStack.pop();
      this.cursorStack.current;
    }

    pushSimpleBlock() {
      return this.pushBlockTracker(new SimpleBlockTracker(this.element));
    }

    pushUpdatableBlock() {
      return this.pushBlockTracker(new UpdatableBlockTracker(this.element));
    }

    pushBlockList(list) {
      return this.pushBlockTracker(new BlockListTracker(this.element, list));
    }

    pushBlockTracker(tracker, isRemote = false) {
      let current = this.blockStack.current;

      if (current !== null) {
        current.newDestroyable(tracker);

        if (!isRemote) {
          current.didAppendBounds(tracker);
        }
      }

      this.__openBlock();

      this.blockStack.push(tracker);
      return tracker;
    }

    popBlock() {
      this.block().finalize(this);

      this.__closeBlock();

      return this.blockStack.pop();
    }

    __openBlock() {}

    __closeBlock() {} // todo return seems unused


    openElement(tag) {
      let element = this.__openElement(tag);

      this.constructing = element;
      return element;
    }

    __openElement(tag) {
      return this.dom.createElement(tag, this.element);
    }

    flushElement(modifiers) {
      let parent = this.element;
      let element = this.constructing;

      this.__flushElement(parent, element);

      this.constructing = null;
      this.operations = null;
      this.pushModifiers(modifiers);
      this.pushElement(element, null);
      this.didOpenElement(element);
    }

    __flushElement(parent, constructing) {
      this.dom.insertBefore(parent, constructing, this.nextSibling);
    }

    closeElement() {
      this.willCloseElement();
      this.popElement();
      return this.popModifiers();
    }

    pushRemoteElement(element, guid, nextSibling = null) {
      this.__pushRemoteElement(element, guid, nextSibling);
    }

    __pushRemoteElement(element, _guid, nextSibling) {
      this.pushElement(element, nextSibling);
      let tracker = new RemoteBlockTracker(element);
      this.pushBlockTracker(tracker, true);
    }

    popRemoteElement() {
      this.popBlock();
      this.popElement();
    }

    pushElement(element, nextSibling) {
      this.cursorStack.push(new Cursor(element, nextSibling));
    }

    pushModifiers(modifiers) {
      this.modifierStack.push(modifiers);
    }

    popModifiers() {
      return this.modifierStack.pop();
    }

    didAddDestroyable(d) {
      this.block().newDestroyable(d);
    }

    didAppendBounds(bounds) {
      this.block().didAppendBounds(bounds);
      return bounds;
    }

    didAppendNode(node) {
      this.block().didAppendNode(node);
      return node;
    }

    didOpenElement(element) {
      this.block().openElement(element);
      return element;
    }

    willCloseElement() {
      this.block().closeElement();
    }

    appendText(string) {
      return this.didAppendNode(this.__appendText(string));
    }

    __appendText(text) {
      let {
        dom,
        element,
        nextSibling
      } = this;
      let node = dom.createTextNode(text);
      dom.insertBefore(element, node, nextSibling);
      return node;
    }

    __appendNode(node) {
      this.dom.insertBefore(this.element, node, this.nextSibling);
      return node;
    }

    __appendFragment(fragment) {
      let first = fragment.firstChild;

      if (first) {
        let ret = new ConcreteBounds(this.element, first, fragment.lastChild);
        this.dom.insertBefore(this.element, fragment, this.nextSibling);
        return ret;
      } else {
        return new SingleNodeBounds(this.element, this.__appendComment(''));
      }
    }

    __appendHTML(html) {
      return this.dom.insertHTMLBefore(this.element, this.nextSibling, html);
    }

    appendDynamicHTML(value) {
      let bounds = this.trustedContent(value);
      this.didAppendBounds(bounds);
    }

    appendDynamicText(value) {
      let node = this.untrustedContent(value);
      this.didAppendNode(node);
      return node;
    }

    appendDynamicFragment(value) {
      let bounds = this.__appendFragment(value);

      this.didAppendBounds(bounds);
    }

    appendDynamicNode(value) {
      let node = this.__appendNode(value);

      let bounds = new SingleNodeBounds(this.element, node);
      this.didAppendBounds(bounds);
    }

    trustedContent(value) {
      return this.__appendHTML(value);
    }

    untrustedContent(value) {
      return this.__appendText(value);
    }

    appendComment(string) {
      return this.didAppendNode(this.__appendComment(string));
    }

    __appendComment(string) {
      let {
        dom,
        element,
        nextSibling
      } = this;
      let node = dom.createComment(string);
      dom.insertBefore(element, node, nextSibling);
      return node;
    }

    __setAttribute(name, value, namespace) {
      this.dom.setAttribute(this.constructing, name, value, namespace);
    }

    __setProperty(name, value) {
      this.constructing[name] = value;
    }

    setStaticAttribute(name, value, namespace) {
      this.__setAttribute(name, value, namespace);
    }

    setDynamicAttribute(name, value, trusting, namespace) {
      let element = this.constructing;
      let attribute = this.env.attributeFor(element, name, trusting, namespace);
      attribute.set(this, value, this.env);
      return attribute;
    }

  }

  _exports.NewElementBuilder = NewElementBuilder;

  class SimpleBlockTracker {
    constructor(parent) {
      this.parent = parent;
      this.first = null;
      this.last = null;
      this.destroyables = null;
      this.nesting = 0;
    }

    destroy() {
      let {
        destroyables
      } = this;

      if (destroyables && destroyables.length) {
        for (let i = 0; i < destroyables.length; i++) {
          destroyables[i].destroy();
        }
      }
    }

    parentElement() {
      return this.parent;
    }

    firstNode() {
      let first = this.first;
      return first.firstNode();
    }

    lastNode() {
      let last = this.last;
      return last.lastNode();
    }

    openElement(element) {
      this.didAppendNode(element);
      this.nesting++;
    }

    closeElement() {
      this.nesting--;
    }

    didAppendNode(node) {
      if (this.nesting !== 0) return;

      if (!this.first) {
        this.first = new First(node);
      }

      this.last = new Last(node);
    }

    didAppendBounds(bounds) {
      if (this.nesting !== 0) return;

      if (!this.first) {
        this.first = bounds;
      }

      this.last = bounds;
    }

    newDestroyable(d) {
      this.destroyables = this.destroyables || [];
      this.destroyables.push(d);
    }

    finalize(stack) {
      if (this.first === null) {
        stack.appendComment('');
      }
    }

  }

  class RemoteBlockTracker extends SimpleBlockTracker {
    destroy() {
      super.destroy();
      clear(this);
    }

  }

  class UpdatableBlockTracker extends SimpleBlockTracker {
    reset(env) {
      let {
        destroyables
      } = this;

      if (destroyables && destroyables.length) {
        for (let i = 0; i < destroyables.length; i++) {
          env.didDestroy(destroyables[i]);
        }
      }

      let nextSibling = clear(this);
      this.first = null;
      this.last = null;
      this.destroyables = null;
      this.nesting = 0;
      return nextSibling;
    }

  }

  class BlockListTracker {
    constructor(parent, boundList) {
      this.parent = parent;
      this.boundList = boundList;
      this.parent = parent;
      this.boundList = boundList;
    }

    destroy() {
      this.boundList.forEachNode(node => node.destroy());
    }

    parentElement() {
      return this.parent;
    }

    firstNode() {
      let head = this.boundList.head();
      return head.firstNode();
    }

    lastNode() {
      let tail = this.boundList.tail();
      return tail.lastNode();
    }

    openElement(_element) {}

    closeElement() {}

    didAppendNode(_node) {}

    didAppendBounds(_bounds) {}

    newDestroyable(_d) {}

    finalize(_stack) {}

  }

  function clientBuilder(env, cursor) {
    return NewElementBuilder.forInitialRender(env, cursor);
  }

  const MAX_SMI = 0xfffffff;

  class InnerStack {
    constructor(inner = new _lowLevel.Stack(), js = []) {
      this.inner = inner;
      this.js = js;
    }

    slice(start, end) {
      let inner;

      if (typeof start === 'number' && typeof end === 'number') {
        inner = this.inner.slice(start, end);
      } else if (typeof start === 'number' && end === undefined) {
        inner = this.inner.sliceFrom(start);
      } else {
        inner = this.inner.clone();
      }

      return new InnerStack(inner, this.js.slice(start, end));
    }

    sliceInner(start, end) {
      let out = [];

      for (let i = start; i < end; i++) {
        out.push(this.get(i));
      }

      return out;
    }

    copy(from, to) {
      this.inner.copy(from, to);
    }

    write(pos, value) {
      if (isImmediate(value)) {
        this.inner.writeRaw(pos, encodeImmediate(value));
      } else {
        let idx = this.js.length;
        this.js.push(value);
        this.inner.writeRaw(pos, ~idx);
      }
    }

    writeRaw(pos, value) {
      this.inner.writeRaw(pos, value);
    }

    get(pos) {
      let value = this.inner.getRaw(pos);

      if (value < 0) {
        return this.js[~value];
      } else {
        return decodeImmediate(value);
      }
    }

    reset() {
      this.inner.reset();
      this.js.length = 0;
    }

    get length() {
      return this.inner.len();
    }

  }

  class EvaluationStack {
    constructor(stack, fp, sp) {
      this.stack = stack;
      this.fp = fp;
      this.sp = sp;
    }

    static empty() {
      return new this(new InnerStack(), 0, -1);
    }

    static restore(snapshot) {
      let stack = new InnerStack();

      for (let i = 0; i < snapshot.length; i++) {
        stack.write(i, snapshot[i]);
      }

      return new this(stack, 0, snapshot.length - 1);
    }

    push(value) {
      this.stack.write(++this.sp, value);
    }

    pushEncodedImmediate(value) {
      this.stack.writeRaw(++this.sp, value);
    }

    pushNull() {
      this.stack.write(++this.sp, null);
    }

    dup(position = this.sp) {
      this.stack.copy(position, ++this.sp);
    }

    copy(from, to) {
      this.stack.copy(from, to);
    }

    pop(n = 1) {
      let top = this.stack.get(this.sp);
      this.sp -= n;
      return top;
    }

    popSmi() {
      return this.stack.get(this.sp--);
    }

    peek(offset = 0) {
      return this.stack.get(this.sp - offset);
    }

    get(offset, base = this.fp) {
      return this.stack.get(base + offset);
    }

    set(value, offset, base = this.fp) {
      this.stack.write(base + offset, value);
    }

    slice(start, end) {
      return this.stack.slice(start, end);
    }

    sliceArray(start, end) {
      return this.stack.sliceInner(start, end);
    }

    capture(items) {
      let end = this.sp + 1;
      let start = end - items;
      return this.stack.sliceInner(start, end);
    }

    reset() {
      this.stack.reset();
    }

    toArray() {
      return this.stack.sliceInner(this.fp, this.sp + 1);
    }

  }

  function isImmediate(value) {
    let type = typeof value;
    if (value === null || value === undefined) return true;

    switch (type) {
      case 'boolean':
      case 'undefined':
        return true;

      case 'number':
        // not an integer
        if (value % 1 !== 0) return false;
        let abs = Math.abs(value);
        if (abs > MAX_SMI) return false;
        return true;

      default:
        return false;
    }
  }

  function encodeSmi(primitive) {
    if (primitive < 0) {
      let abs = Math.abs(primitive);
      if (abs > MAX_SMI) throw new Error('not smi');
      return Math.abs(primitive) << 3 | 4
      /* NEGATIVE */
      ;
    } else {
      if (primitive > MAX_SMI) throw new Error('not smi');
      return primitive << 3 | 0
      /* NUMBER */
      ;
    }
  }

  function encodeImmediate(primitive) {
    switch (typeof primitive) {
      case 'number':
        return encodeSmi(primitive);

      case 'boolean':
        return primitive ? 11
        /* True */
        : 3
        /* False */
        ;

      case 'object':
        // assume null
        return 19
        /* Null */
        ;

      case 'undefined':
        return 27
        /* Undef */
        ;

      default:
        throw (0, _util.unreachable)();
    }
  }

  function decodeSmi(smi) {
    switch (smi & 0b111) {
      case 0
      /* NUMBER */
      :
        return smi >> 3;

      case 4
      /* NEGATIVE */
      :
        return -(smi >> 3);

      default:
        throw (0, _util.unreachable)();
    }
  }

  function decodeImmediate(immediate) {
    switch (immediate) {
      case 3
      /* False */
      :
        return false;

      case 11
      /* True */
      :
        return true;

      case 19
      /* Null */
      :
        return null;

      case 27
      /* Undef */
      :
        return undefined;

      default:
        return decodeSmi(immediate);
    }
  }

  class UpdatingVM {
    constructor(env, program, {
      alwaysRevalidate = false
    }) {
      this.frameStack = new _util.Stack();
      this.env = env;
      this.constants = program.constants;
      this.dom = env.getDOM();
      this.alwaysRevalidate = alwaysRevalidate;
    }

    execute(opcodes, handler) {
      let {
        frameStack
      } = this;
      this.try(opcodes, handler);

      while (true) {
        if (frameStack.isEmpty()) break;
        let opcode = this.frame.nextStatement();

        if (opcode === null) {
          this.frameStack.pop();
          continue;
        }

        opcode.evaluate(this);
      }
    }

    get frame() {
      return this.frameStack.current;
    }

    goto(op) {
      this.frame.goto(op);
    }

    try(ops, handler) {
      this.frameStack.push(new UpdatingVMFrame(ops, handler));
    }

    throw() {
      this.frame.handleException();
      this.frameStack.pop();
    }

  }

  _exports.UpdatingVM = UpdatingVM;

  class BlockOpcode extends UpdatingOpcode {
    constructor(start, state, runtime, bounds, children) {
      super();
      this.start = start;
      this.state = state;
      this.runtime = runtime;
      this.type = 'block';
      this.next = null;
      this.prev = null;
      this.children = children;
      this.bounds = bounds;
    }

    parentElement() {
      return this.bounds.parentElement();
    }

    firstNode() {
      return this.bounds.firstNode();
    }

    lastNode() {
      return this.bounds.lastNode();
    }

    evaluate(vm) {
      vm.try(this.children, null);
    }

    destroy() {
      this.bounds.destroy();
    }

    didDestroy() {
      this.runtime.env.didDestroy(this.bounds);
    }

  }

  class TryOpcode extends BlockOpcode {
    constructor(start, state, runtime, bounds, children) {
      super(start, state, runtime, bounds, children);
      this.type = 'try';
      this.tag = this._tag = _reference.UpdatableTag.create(_reference.CONSTANT_TAG);
    }

    didInitializeChildren() {
      this._tag.inner.update((0, _reference.combineSlice)(this.children));
    }

    evaluate(vm) {
      vm.try(this.children, this);
    }

    handleException() {
      let {
        state,
        bounds,
        children,
        start,
        prev,
        next,
        runtime
      } = this;
      children.clear();
      let elementStack = NewElementBuilder.resume(runtime.env, bounds, bounds.reset(runtime.env));
      let vm = VM.resume(state, runtime, elementStack);
      let updating = new _util.LinkedList();
      vm.execute(start, vm => {
        vm.stack = EvaluationStack.restore(state.stack);
        vm.updatingOpcodeStack.push(updating);
        vm.updateWith(this);
        vm.updatingOpcodeStack.push(children);
      });
      this.prev = prev;
      this.next = next;
    }

  }

  class ListRevalidationDelegate {
    constructor(opcode, marker) {
      this.opcode = opcode;
      this.marker = marker;
      this.didInsert = false;
      this.didDelete = false;
      this.map = opcode.map;
      this.updating = opcode['children'];
    }

    insert(key, item, memo, before) {
      let {
        map,
        opcode,
        updating
      } = this;
      let nextSibling = null;
      let reference = null;

      if (typeof before === 'string') {
        reference = map[before];
        nextSibling = reference['bounds'].firstNode();
      } else {
        nextSibling = this.marker;
      }

      let vm = opcode.vmForInsertion(nextSibling);
      let tryOpcode = null;
      let {
        start
      } = opcode;
      vm.execute(start, vm => {
        map[key] = tryOpcode = vm.iterate(memo, item);
        vm.updatingOpcodeStack.push(new _util.LinkedList());
        vm.updateWith(tryOpcode);
        vm.updatingOpcodeStack.push(tryOpcode.children);
      });
      updating.insertBefore(tryOpcode, reference);
      this.didInsert = true;
    }

    retain(_key, _item, _memo) {}

    move(key, _item, _memo, before) {
      let {
        map,
        updating
      } = this;
      let entry = map[key];
      let reference = map[before] || null;

      if (typeof before === 'string') {
        move(entry, reference.firstNode());
      } else {
        move(entry, this.marker);
      }

      updating.remove(entry);
      updating.insertBefore(entry, reference);
    }

    delete(key) {
      let {
        map
      } = this;
      let opcode = map[key];
      opcode.didDestroy();
      clear(opcode);
      this.updating.remove(opcode);
      delete map[key];
      this.didDelete = true;
    }

    done() {
      this.opcode.didInitializeChildren(this.didInsert || this.didDelete);
    }

  }

  class ListBlockOpcode extends BlockOpcode {
    constructor(start, state, runtime, bounds, children, artifacts) {
      super(start, state, runtime, bounds, children);
      this.type = 'list-block';
      this.map = (0, _util.dict)();
      this.lastIterated = _reference.INITIAL;
      this.artifacts = artifacts;

      let _tag = this._tag = _reference.UpdatableTag.create(_reference.CONSTANT_TAG);

      this.tag = (0, _reference.combine)([artifacts.tag, _tag]);
    }

    didInitializeChildren(listDidChange = true) {
      this.lastIterated = this.artifacts.tag.value();

      if (listDidChange) {
        this._tag.inner.update((0, _reference.combineSlice)(this.children));
      }
    }

    evaluate(vm) {
      let {
        artifacts,
        lastIterated
      } = this;

      if (!artifacts.tag.validate(lastIterated)) {
        let {
          bounds
        } = this;
        let {
          dom
        } = vm;
        let marker = dom.createComment('');
        dom.insertAfter(bounds.parentElement(), marker, bounds.lastNode());
        let target = new ListRevalidationDelegate(this, marker);
        let synchronizer = new _reference.IteratorSynchronizer({
          target,
          artifacts
        });
        synchronizer.sync();
        this.parentElement().removeChild(marker);
      } // Run now-updated updating opcodes


      super.evaluate(vm);
    }

    vmForInsertion(nextSibling) {
      let {
        bounds,
        state,
        runtime
      } = this;
      let elementStack = NewElementBuilder.forInitialRender(runtime.env, {
        element: bounds.parentElement(),
        nextSibling
      });
      return VM.resume(state, runtime, elementStack);
    }

  }

  class UpdatingVMFrame {
    constructor(ops, exceptionHandler) {
      this.ops = ops;
      this.exceptionHandler = exceptionHandler;
      this.current = ops.head();
    }

    goto(op) {
      this.current = op;
    }

    nextStatement() {
      let {
        current,
        ops
      } = this;
      if (current) this.current = ops.nextNode(current);
      return current;
    }

    handleException() {
      if (this.exceptionHandler) {
        this.exceptionHandler.handleException();
      }
    }

  }

  class RenderResult {
    constructor(env, program, updating, bounds) {
      this.env = env;
      this.program = program;
      this.updating = updating;
      this.bounds = bounds;
    }

    rerender({
      alwaysRevalidate = false
    } = {
      alwaysRevalidate: false
    }) {
      let {
        env,
        program,
        updating
      } = this;
      let vm = new UpdatingVM(env, program, {
        alwaysRevalidate
      });
      vm.execute(updating, this);
    }

    parentElement() {
      return this.bounds.parentElement();
    }

    firstNode() {
      return this.bounds.firstNode();
    }

    lastNode() {
      return this.bounds.lastNode();
    }

    handleException() {
      throw 'this should never happen';
    }

    destroy() {
      this.bounds.destroy();
      clear(this.bounds);
    }

  }

  _exports.RenderResult = RenderResult;

  class Arguments {
    constructor() {
      this.stack = null;
      this.positional = new PositionalArguments();
      this.named = new NamedArguments();
      this.blocks = new BlockArguments();
    }

    empty(stack) {
      let base = stack.sp + 1;
      this.named.empty(stack, base);
      this.positional.empty(stack, base);
      this.blocks.empty(stack, base);
      return this;
    }

    setup(stack, names, blockNames, positionalCount, synthetic) {
      this.stack = stack;
      /*
             | ... | blocks      | positional  | named |
             | ... | b0    b1    | p0 p1 p2 p3 | n0 n1 |
       index | ... | 4/5/6 7/8/9 | 10 11 12 13 | 14 15 |
                     ^             ^             ^  ^
                   bbase         pbase       nbase  sp
      */

      let named = this.named;
      let namedCount = names.length;
      let namedBase = stack.sp - namedCount + 1;
      named.setup(stack, namedBase, namedCount, names, synthetic);
      let positional = this.positional;
      let positionalBase = namedBase - positionalCount;
      positional.setup(stack, positionalBase, positionalCount);
      let blocks = this.blocks;
      let blocksCount = blockNames.length;
      let blocksBase = positionalBase - blocksCount * 3;
      blocks.setup(stack, blocksBase, blocksCount, blockNames);
    }

    get tag() {
      return (0, _reference.combineTagged)([this.positional, this.named]);
    }

    get base() {
      return this.blocks.base;
    }

    get length() {
      return this.positional.length + this.named.length + this.blocks.length * 3;
    }

    at(pos) {
      return this.positional.at(pos);
    }

    realloc(offset) {
      let {
        stack
      } = this;

      if (offset > 0 && stack !== null) {
        let {
          positional,
          named
        } = this;
        let newBase = positional.base + offset;
        let length = positional.length + named.length;

        for (let i = length - 1; i >= 0; i--) {
          stack.copy(i + positional.base, i + newBase);
        }

        positional.base += offset;
        named.base += offset;
        stack.sp += offset;
      }
    }

    capture() {
      let positional = this.positional.length === 0 ? EMPTY_POSITIONAL : this.positional.capture();
      let named = this.named.length === 0 ? EMPTY_NAMED : this.named.capture();
      return new CapturedArguments(this.tag, positional, named, this.length);
    }

    clear() {
      let {
        stack,
        length
      } = this;
      if (length > 0 && stack !== null) stack.pop(length);
    }

  }

  class CapturedArguments {
    constructor(tag, positional, named, length) {
      this.tag = tag;
      this.positional = positional;
      this.named = named;
      this.length = length;
    }

    value() {
      return {
        named: this.named.value(),
        positional: this.positional.value()
      };
    }

  }

  class PositionalArguments {
    constructor() {
      this.base = 0;
      this.length = 0;
      this.stack = null;
      this._tag = null;
      this._references = null;
    }

    empty(stack, base) {
      this.stack = stack;
      this.base = base;
      this.length = 0;
      this._tag = _reference.CONSTANT_TAG;
      this._references = _util.EMPTY_ARRAY;
    }

    setup(stack, base, length) {
      this.stack = stack;
      this.base = base;
      this.length = length;

      if (length === 0) {
        this._tag = _reference.CONSTANT_TAG;
        this._references = _util.EMPTY_ARRAY;
      } else {
        this._tag = null;
        this._references = null;
      }
    }

    get tag() {
      let tag = this._tag;

      if (!tag) {
        tag = this._tag = (0, _reference.combineTagged)(this.references);
      }

      return tag;
    }

    at(position) {
      let {
        base,
        length,
        stack
      } = this;

      if (position < 0 || position >= length) {
        return UNDEFINED_REFERENCE;
      }

      return stack.get(position, base);
    }

    capture() {
      return new CapturedPositionalArguments(this.tag, this.references);
    }

    prepend(other) {
      let additions = other.length;

      if (additions > 0) {
        let {
          base,
          length,
          stack
        } = this;
        this.base = base = base - additions;
        this.length = length + additions;

        for (let i = 0; i < additions; i++) {
          stack.set(other.at(i), i, base);
        }

        this._tag = null;
        this._references = null;
      }
    }

    get references() {
      let references = this._references;

      if (!references) {
        let {
          stack,
          base,
          length
        } = this;
        references = this._references = stack.sliceArray(base, base + length);
      }

      return references;
    }

  }

  class CapturedPositionalArguments {
    constructor(tag, references, length = references.length) {
      this.tag = tag;
      this.references = references;
      this.length = length;
    }

    static empty() {
      return new CapturedPositionalArguments(_reference.CONSTANT_TAG, _util.EMPTY_ARRAY, 0);
    }

    at(position) {
      return this.references[position];
    }

    value() {
      return this.references.map(this.valueOf);
    }

    get(name) {
      let {
        references,
        length
      } = this;

      if (name === 'length') {
        return PrimitiveReference.create(length);
      } else {
        let idx = parseInt(name, 10);

        if (idx < 0 || idx >= length) {
          return UNDEFINED_REFERENCE;
        } else {
          return references[idx];
        }
      }
    }

    valueOf(reference) {
      return reference.value();
    }

  }

  class NamedArguments {
    constructor() {
      this.base = 0;
      this.length = 0;
      this._references = null;
      this._names = _util.EMPTY_ARRAY;
      this._atNames = _util.EMPTY_ARRAY;
    }

    empty(stack, base) {
      this.stack = stack;
      this.base = base;
      this.length = 0;
      this._references = _util.EMPTY_ARRAY;
      this._names = _util.EMPTY_ARRAY;
      this._atNames = _util.EMPTY_ARRAY;
    }

    setup(stack, base, length, names, synthetic) {
      this.stack = stack;
      this.base = base;
      this.length = length;

      if (length === 0) {
        this._references = _util.EMPTY_ARRAY;
        this._names = _util.EMPTY_ARRAY;
        this._atNames = _util.EMPTY_ARRAY;
      } else {
        this._references = null;

        if (synthetic) {
          this._names = names;
          this._atNames = null;
        } else {
          this._names = null;
          this._atNames = names;
        }
      }
    }

    get tag() {
      return (0, _reference.combineTagged)(this.references);
    }

    get names() {
      let names = this._names;

      if (!names) {
        names = this._names = this._atNames.map(this.toSyntheticName);
      }

      return names;
    }

    get atNames() {
      let atNames = this._atNames;

      if (!atNames) {
        atNames = this._atNames = this._names.map(this.toAtName);
      }

      return atNames;
    }

    has(name) {
      return this.names.indexOf(name) !== -1;
    }

    get(name, synthetic = true) {
      let {
        base,
        stack
      } = this;
      let names = synthetic ? this.names : this.atNames;
      let idx = names.indexOf(name);

      if (idx === -1) {
        return UNDEFINED_REFERENCE;
      }

      return stack.get(idx, base);
    }

    capture() {
      return new CapturedNamedArguments(this.tag, this.names, this.references);
    }

    merge(other) {
      let {
        length: extras
      } = other;

      if (extras > 0) {
        let {
          names,
          length,
          stack
        } = this;
        let {
          names: extraNames
        } = other;

        if (Object.isFrozen(names) && names.length === 0) {
          names = [];
        }

        for (let i = 0; i < extras; i++) {
          let name = extraNames[i];
          let idx = names.indexOf(name);

          if (idx === -1) {
            length = names.push(name);
            stack.push(other.references[i]);
          }
        }

        this.length = length;
        this._references = null;
        this._names = names;
        this._atNames = null;
      }
    }

    get references() {
      let references = this._references;

      if (!references) {
        let {
          base,
          length,
          stack
        } = this;
        references = this._references = stack.sliceArray(base, base + length);
      }

      return references;
    }

    toSyntheticName(name) {
      return name.slice(1);
    }

    toAtName(name) {
      return "@" + name;
    }

  }

  class CapturedNamedArguments {
    constructor(tag, names, references) {
      this.tag = tag;
      this.names = names;
      this.references = references;
      this.length = names.length;
      this._map = null;
    }

    get map() {
      let map = this._map;

      if (!map) {
        let {
          names,
          references
        } = this;
        map = this._map = (0, _util.dict)();

        for (let i = 0; i < names.length; i++) {
          let name = names[i];
          map[name] = references[i];
        }
      }

      return map;
    }

    has(name) {
      return this.names.indexOf(name) !== -1;
    }

    get(name) {
      let {
        names,
        references
      } = this;
      let idx = names.indexOf(name);

      if (idx === -1) {
        return UNDEFINED_REFERENCE;
      } else {
        return references[idx];
      }
    }

    value() {
      let {
        names,
        references
      } = this;
      let out = (0, _util.dict)();

      for (let i = 0; i < names.length; i++) {
        let name = names[i];
        out[name] = references[i].value();
      }

      return out;
    }

  }

  class BlockArguments {
    constructor() {
      this.internalValues = null;
      this.internalTag = null;
      this.names = _util.EMPTY_ARRAY;
      this.length = 0;
      this.base = 0;
    }

    empty(stack, base) {
      this.stack = stack;
      this.names = _util.EMPTY_ARRAY;
      this.base = base;
      this.length = 0;
      this.internalTag = _reference.CONSTANT_TAG;
      this.internalValues = _util.EMPTY_ARRAY;
    }

    setup(stack, base, length, names) {
      this.stack = stack;
      this.names = names;
      this.base = base;
      this.length = length;

      if (length === 0) {
        this.internalTag = _reference.CONSTANT_TAG;
        this.internalValues = _util.EMPTY_ARRAY;
      } else {
        this.internalTag = null;
        this.internalValues = null;
      }
    }

    get values() {
      let values = this.internalValues;

      if (!values) {
        let {
          base,
          length,
          stack
        } = this;
        values = this.internalValues = stack.sliceArray(base, base + length * 3);
      }

      return values;
    }

    has(name) {
      return this.names.indexOf(name) !== -1;
    }

    get(name) {
      let {
        base,
        stack,
        names
      } = this;
      let idx = names.indexOf(name);

      if (names.indexOf(name) === -1) {
        return null;
      }

      let table = stack.get(idx * 3, base);
      let scope = stack.get(idx * 3 + 1, base); // FIXME(mmun): shouldn't need to cast this

      let handle = stack.get(idx * 3 + 2, base);
      return handle === null ? null : [handle, scope, table];
    }

    capture() {
      return new CapturedBlockArguments(this.names, this.values);
    }

  }

  class CapturedBlockArguments {
    constructor(names, values) {
      this.names = names;
      this.values = values;
      this.length = names.length;
    }

    has(name) {
      return this.names.indexOf(name) !== -1;
    }

    get(name) {
      let idx = this.names.indexOf(name);
      if (idx === -1) return null;
      return [this.values[idx * 3 + 2], this.values[idx * 3 + 1], this.values[idx * 3]];
    }

  }

  const EMPTY_NAMED = new CapturedNamedArguments(_reference.CONSTANT_TAG, _util.EMPTY_ARRAY, _util.EMPTY_ARRAY);
  const EMPTY_POSITIONAL = new CapturedPositionalArguments(_reference.CONSTANT_TAG, _util.EMPTY_ARRAY);
  const EMPTY_ARGS = new CapturedArguments(_reference.CONSTANT_TAG, EMPTY_POSITIONAL, EMPTY_NAMED, 0);
  _exports.EMPTY_ARGS = EMPTY_ARGS;

  class VM {
    constructor(runtime, scope, dynamicScope, elementStack) {
      this.runtime = runtime;
      this.elementStack = elementStack;
      this.dynamicScopeStack = new _util.Stack();
      this.scopeStack = new _util.Stack();
      this.updatingOpcodeStack = new _util.Stack();
      this.cacheGroups = new _util.Stack();
      this.listBlockStack = new _util.Stack();
      this.s0 = null;
      this.s1 = null;
      this.t0 = null;
      this.t1 = null;
      this.v0 = null;
      this.heap = this.program.heap;
      this.constants = this.program.constants;
      this.elementStack = elementStack;
      this.scopeStack.push(scope);
      this.dynamicScopeStack.push(dynamicScope);
      this.args = new Arguments();
      this.inner = new LowLevelVM(EvaluationStack.empty(), this.heap, runtime.program, {
        debugBefore: opcode => {
          return APPEND_OPCODES.debugBefore(this, opcode, opcode.type);
        },
        debugAfter: (opcode, state) => {
          APPEND_OPCODES.debugAfter(this, opcode, opcode.type, state);
        }
      });
    }

    get stack() {
      return this.inner.stack;
    }

    set stack(value) {
      this.inner.stack = value;
    }
    /* Registers */


    set currentOpSize(value) {
      this.inner.currentOpSize = value;
    }

    get currentOpSize() {
      return this.inner.currentOpSize;
    }

    get pc() {
      return this.inner.pc;
    }

    set pc(value) {
      this.inner.pc = value;
    }

    get ra() {
      return this.inner.ra;
    }

    set ra(value) {
      this.inner.ra = value;
    }

    get fp() {
      return this.stack.fp;
    }

    set fp(fp) {
      this.stack.fp = fp;
    }

    get sp() {
      return this.stack.sp;
    }

    set sp(sp) {
      this.stack.sp = sp;
    } // Fetch a value from a register onto the stack


    fetch(register) {
      this.stack.push(this[_vm2.Register[register]]);
    } // Load a value from the stack into a register


    load(register) {
      this[_vm2.Register[register]] = this.stack.pop();
    } // Fetch a value from a register


    fetchValue(register) {
      return this[_vm2.Register[register]];
    } // Load a value into a register


    loadValue(register, value) {
      this[_vm2.Register[register]] = value;
    }
    /**
     * Migrated to Inner
     */
    // Start a new frame and save $ra and $fp on the stack


    pushFrame() {
      this.inner.pushFrame();
    } // Restore $ra, $sp and $fp


    popFrame() {
      this.inner.popFrame();
    } // Jump to an address in `program`


    goto(offset) {
      this.inner.goto(offset);
    } // Save $pc into $ra, then jump to a new address in `program` (jal in MIPS)


    call(handle) {
      this.inner.call(handle);
    } // Put a specific `program` address in $ra


    returnTo(offset) {
      this.inner.returnTo(offset);
    } // Return to the `program` address stored in $ra


    return() {
      this.inner.return();
    }
    /**
     * End of migrated.
     */


    static initial(program, env, self, dynamicScope, elementStack, handle) {
      let scopeSize = program.heap.scopesizeof(handle);
      let scope = Scope.root(self, scopeSize);
      let vm = new VM({
        program,
        env
      }, scope, dynamicScope, elementStack);
      vm.pc = vm.heap.getaddr(handle);
      vm.updatingOpcodeStack.push(new _util.LinkedList());
      return vm;
    }

    static empty(program, env, elementStack, handle) {
      let dynamicScope = {
        get() {
          return UNDEFINED_REFERENCE;
        },

        set() {
          return UNDEFINED_REFERENCE;
        },

        child() {
          return dynamicScope;
        }

      };
      let vm = new VM({
        program,
        env
      }, Scope.root(UNDEFINED_REFERENCE, 0), dynamicScope, elementStack);
      vm.updatingOpcodeStack.push(new _util.LinkedList());
      vm.pc = vm.heap.getaddr(handle);
      return vm;
    }

    static resume({
      scope,
      dynamicScope
    }, runtime, stack) {
      return new VM(runtime, scope, dynamicScope, stack);
    }

    get program() {
      return this.runtime.program;
    }

    get env() {
      return this.runtime.env;
    }

    capture(args) {
      return {
        dynamicScope: this.dynamicScope(),
        scope: this.scope(),
        stack: this.stack.capture(args)
      };
    }

    beginCacheGroup() {
      this.cacheGroups.push(this.updating().tail());
    }

    commitCacheGroup() {
      //        JumpIfNotModified(END)
      //        (head)
      //        (....)
      //        (tail)
      //        DidModify
      // END:   Noop
      let END = new LabelOpcode('END');
      let opcodes = this.updating();
      let marker = this.cacheGroups.pop();
      let head = marker ? opcodes.nextNode(marker) : opcodes.head();
      let tail = opcodes.tail();
      let tag = (0, _reference.combineSlice)(new _util.ListSlice(head, tail));
      let guard = new JumpIfNotModifiedOpcode(tag, END);
      opcodes.insertBefore(guard, head);
      opcodes.append(new DidModifyOpcode(guard));
      opcodes.append(END);
    }

    enter(args) {
      let updating = new _util.LinkedList();
      let state = this.capture(args);
      let tracker = this.elements().pushUpdatableBlock();
      let tryOpcode = new TryOpcode(this.heap.gethandle(this.pc), state, this.runtime, tracker, updating);
      this.didEnter(tryOpcode);
    }

    iterate(memo, value) {
      let stack = this.stack;
      stack.push(value);
      stack.push(memo);
      let state = this.capture(2);
      let tracker = this.elements().pushUpdatableBlock(); // let ip = this.ip;
      // this.ip = end + 4;
      // this.frames.push(ip);

      return new TryOpcode(this.heap.gethandle(this.pc), state, this.runtime, tracker, new _util.LinkedList());
    }

    enterItem(key, opcode) {
      this.listBlock().map[key] = opcode;
      this.didEnter(opcode);
    }

    enterList(relativeStart) {
      let updating = new _util.LinkedList();
      let state = this.capture(0);
      let tracker = this.elements().pushBlockList(updating);
      let artifacts = this.stack.peek().artifacts;
      let addr = this.pc + relativeStart - this.currentOpSize;
      let start = this.heap.gethandle(addr);
      let opcode = new ListBlockOpcode(start, state, this.runtime, tracker, updating, artifacts);
      this.listBlockStack.push(opcode);
      this.didEnter(opcode);
    }

    didEnter(opcode) {
      this.updateWith(opcode);
      this.updatingOpcodeStack.push(opcode.children);
    }

    exit() {
      this.elements().popBlock();
      this.updatingOpcodeStack.pop();
      let parent = this.updating().tail();
      parent.didInitializeChildren();
    }

    exitList() {
      this.exit();
      this.listBlockStack.pop();
    }

    updateWith(opcode) {
      this.updating().append(opcode);
    }

    listBlock() {
      return this.listBlockStack.current;
    }

    updating() {
      return this.updatingOpcodeStack.current;
    }

    elements() {
      return this.elementStack;
    }

    scope() {
      return this.scopeStack.current;
    }

    dynamicScope() {
      return this.dynamicScopeStack.current;
    }

    pushChildScope() {
      this.scopeStack.push(this.scope().child());
    }

    pushDynamicScope() {
      let child = this.dynamicScope().child();
      this.dynamicScopeStack.push(child);
      return child;
    }

    pushRootScope(size, bindCaller) {
      let scope = Scope.sized(size);
      if (bindCaller) scope.bindCallerScope(this.scope());
      this.scopeStack.push(scope);
      return scope;
    }

    pushScope(scope) {
      this.scopeStack.push(scope);
    }

    popScope() {
      this.scopeStack.pop();
    }

    popDynamicScope() {
      this.dynamicScopeStack.pop();
    }

    newDestroyable(d) {
      this.elements().didAddDestroyable(d);
    } /// SCOPE HELPERS


    getSelf() {
      return this.scope().getSelf();
    }

    referenceForSymbol(symbol) {
      return this.scope().getSymbol(symbol);
    } /// EXECUTION


    execute(start, initialize) {
      this.pc = this.heap.getaddr(start);
      if (initialize) initialize(this);
      let result;

      while (true) {
        result = this.next();
        if (result.done) break;
      }

      return result.value;
    }

    next() {
      let {
        env,
        program,
        updatingOpcodeStack,
        elementStack
      } = this;
      let opcode = this.inner.nextStatement();
      let result;

      if (opcode !== null) {
        this.inner.evaluateOuter(opcode, this);
        result = {
          done: false,
          value: null
        };
      } else {
        // Unload the stack
        this.stack.reset();
        result = {
          done: true,
          value: new RenderResult(env, program, updatingOpcodeStack.pop(), elementStack.popBlock())
        };
      }

      return result;
    }

    bindDynamicScope(names) {
      let scope = this.dynamicScope();

      for (let i = names.length - 1; i >= 0; i--) {
        let name = this.constants.getString(names[i]);
        scope.set(name, this.stack.pop());
      }
    }

  }

  _exports.LowLevelVM = VM;

  class TemplateIteratorImpl {
    constructor(vm) {
      this.vm = vm;
    }

    next() {
      return this.vm.next();
    }

  }

  function renderMain(program, env, self, dynamicScope, builder, handle) {
    let vm = VM.initial(program, env, self, dynamicScope, builder, handle);
    return new TemplateIteratorImpl(vm);
  }
  /**
   * Returns a TemplateIterator configured to render a root component.
   */


  function renderComponent(program, env, builder, main, name, args = {}) {
    const vm = VM.empty(program, env, builder, main);
    const {
      resolver
    } = vm.constants;
    const definition = resolveComponent(resolver, name, null);
    const {
      manager,
      state
    } = definition;
    const capabilities = capabilityFlagsFrom(manager.getCapabilities(state));
    let invocation;

    if (hasStaticLayoutCapability(capabilities, manager)) {
      invocation = manager.getLayout(state, resolver);
    } else {
      throw new Error('Cannot invoke components with dynamic layouts as a root component.');
    } // Get a list of tuples of argument names and references, like
    // [['title', reference], ['name', reference]]


    const argList = Object.keys(args).map(key => [key, args[key]]);
    const blockNames = ['main', 'else', 'attrs']; // Prefix argument names with `@` symbol

    const argNames = argList.map(([name]) => "@" + name);
    vm.pushFrame(); // Push blocks on to the stack, three stack values per block

    for (let i = 0; i < 3 * blockNames.length; i++) {
      vm.stack.push(null);
    }

    vm.stack.push(null); // For each argument, push its backing reference on to the stack

    argList.forEach(([, reference]) => {
      vm.stack.push(reference);
    }); // Configure VM based on blocks and args just pushed on to the stack.

    vm.args.setup(vm.stack, argNames, blockNames, 0, false); // Needed for the Op.Main opcode: arguments, component invocation object, and
    // component definition.

    vm.stack.push(vm.args);
    vm.stack.push(invocation);
    vm.stack.push(definition);
    return new TemplateIteratorImpl(vm);
  }

  class DynamicVarReference {
    constructor(scope, nameRef) {
      this.scope = scope;
      this.nameRef = nameRef;

      let varTag = this.varTag = _reference.UpdatableTag.create(_reference.CONSTANT_TAG);

      this.tag = (0, _reference.combine)([nameRef.tag, varTag]);
    }

    value() {
      return this.getVar().value();
    }

    get(key) {
      return this.getVar().get(key);
    }

    getVar() {
      let name = String(this.nameRef.value());
      let ref = this.scope.get(name);
      this.varTag.inner.update(ref.tag);
      return ref;
    }

  }

  function getDynamicVar(vm, args) {
    let scope = vm.dynamicScope();
    let nameRef = args.positional.at(0);
    return new DynamicVarReference(scope, nameRef);
  }
  /** @internal */


  const DEFAULT_CAPABILITIES = {
    dynamicLayout: true,
    dynamicTag: true,
    prepareArgs: true,
    createArgs: true,
    attributeHook: false,
    elementHook: false,
    dynamicScope: true,
    createCaller: false,
    updateHook: true,
    createInstance: true
  };
  _exports.DEFAULT_CAPABILITIES = DEFAULT_CAPABILITIES;
  const MINIMAL_CAPABILITIES = {
    dynamicLayout: false,
    dynamicTag: false,
    prepareArgs: false,
    createArgs: false,
    attributeHook: false,
    elementHook: false,
    dynamicScope: false,
    createCaller: false,
    updateHook: false,
    createInstance: false
  };
  _exports.MINIMAL_CAPABILITIES = MINIMAL_CAPABILITIES;
  const SERIALIZATION_FIRST_NODE_STRING = '%+b:0%';
  _exports.SERIALIZATION_FIRST_NODE_STRING = SERIALIZATION_FIRST_NODE_STRING;

  function isSerializationFirstNode(node) {
    return node.nodeValue === SERIALIZATION_FIRST_NODE_STRING;
  }

  class RehydratingCursor extends Cursor {
    constructor(element, nextSibling, startingBlockDepth) {
      super(element, nextSibling);
      this.startingBlockDepth = startingBlockDepth;
      this.candidate = null;
      this.injectedOmittedNode = false;
      this.openBlockDepth = startingBlockDepth - 1;
    }

  }

  class RehydrateBuilder extends NewElementBuilder {
    // private candidate: Option<Simple.Node> = null;
    constructor(env, parentNode, nextSibling) {
      super(env, parentNode, nextSibling);
      this.unmatchedAttributes = null;
      this.blockDepth = 0;
      if (nextSibling) throw new Error('Rehydration with nextSibling not supported');
      let node = this.currentCursor.element.firstChild;

      while (node !== null) {
        if (isComment(node) && isSerializationFirstNode(node)) {
          break;
        }

        node = node.nextSibling;
      }

      this.candidate = node;
    }

    get currentCursor() {
      return this.cursorStack.current;
    }

    get candidate() {
      if (this.currentCursor) {
        return this.currentCursor.candidate;
      }

      return null;
    }

    set candidate(node) {
      this.currentCursor.candidate = node;
    }

    pushElement(element, nextSibling) {
      let {
        blockDepth = 0
      } = this;
      let cursor = new RehydratingCursor(element, nextSibling, blockDepth);
      let currentCursor = this.currentCursor;

      if (currentCursor) {
        if (currentCursor.candidate) {
          /**
           * <div>   <---------------  currentCursor.element
           *   <!--%+b:1%-->
           *   <div> <---------------  currentCursor.candidate -> cursor.element
           *     <!--%+b:2%--> <-  currentCursor.candidate.firstChild -> cursor.candidate
           *     Foo
           *     <!--%-b:2%-->
           *   </div>
           *   <!--%-b:1%-->  <--  becomes currentCursor.candidate
           */
          // where to rehydrate from if we are in rehydration mode
          cursor.candidate = element.firstChild; // where to continue when we pop

          currentCursor.candidate = element.nextSibling;
        }
      }

      this.cursorStack.push(cursor);
    }

    clearMismatch(candidate) {
      let current = candidate;
      let currentCursor = this.currentCursor;

      if (currentCursor !== null) {
        let openBlockDepth = currentCursor.openBlockDepth;

        if (openBlockDepth >= currentCursor.startingBlockDepth) {
          while (current && !(isComment(current) && getCloseBlockDepth(current) === openBlockDepth)) {
            current = this.remove(current);
          }
        } else {
          while (current !== null) {
            current = this.remove(current);
          }
        } // current cursor parentNode should be openCandidate if element
        // or openCandidate.parentNode if comment


        currentCursor.nextSibling = current; // disable rehydration until we popElement or closeBlock for openBlockDepth

        currentCursor.candidate = null;
      }
    }

    __openBlock() {
      let {
        currentCursor
      } = this;
      if (currentCursor === null) return;
      let blockDepth = this.blockDepth;
      this.blockDepth++;
      let {
        candidate
      } = currentCursor;
      if (candidate === null) return;

      if (isComment(candidate) && getOpenBlockDepth(candidate) === blockDepth) {
        currentCursor.candidate = this.remove(candidate);
        currentCursor.openBlockDepth = blockDepth;
      } else {
        this.clearMismatch(candidate);
      }
    }

    __closeBlock() {
      let {
        currentCursor
      } = this;
      if (currentCursor === null) return; // openBlock is the last rehydrated open block

      let openBlockDepth = currentCursor.openBlockDepth; // this currently is the expected next open block depth

      this.blockDepth--;
      let {
        candidate
      } = currentCursor; // rehydrating

      if (candidate !== null) {
        if (isComment(candidate) && getCloseBlockDepth(candidate) === openBlockDepth) {
          currentCursor.candidate = this.remove(candidate);
          currentCursor.openBlockDepth--;
        } else {
          this.clearMismatch(candidate);
        } // if the openBlockDepth matches the blockDepth we just closed to
        // then restore rehydration

      }

      if (currentCursor.openBlockDepth === this.blockDepth) {
        currentCursor.candidate = this.remove(currentCursor.nextSibling);
        currentCursor.openBlockDepth--;
      }
    }

    __appendNode(node) {
      let {
        candidate
      } = this; // This code path is only used when inserting precisely one node. It needs more
      // comparison logic, but we can probably lean on the cases where this code path
      // is actually used.

      if (candidate) {
        return candidate;
      } else {
        return super.__appendNode(node);
      }
    }

    __appendHTML(html) {
      let candidateBounds = this.markerBounds();

      if (candidateBounds) {
        let first = candidateBounds.firstNode();
        let last = candidateBounds.lastNode();
        let newBounds = new ConcreteBounds(this.element, first.nextSibling, last.previousSibling);
        let possibleEmptyMarker = this.remove(first);
        this.remove(last);

        if (possibleEmptyMarker !== null && isEmpty$1(possibleEmptyMarker)) {
          this.candidate = this.remove(possibleEmptyMarker);

          if (this.candidate !== null) {
            this.clearMismatch(this.candidate);
          }
        }

        return newBounds;
      } else {
        return super.__appendHTML(html);
      }
    }

    remove(node) {
      let element = node.parentNode;
      let next = node.nextSibling;
      element.removeChild(node);
      return next;
    }

    markerBounds() {
      let _candidate = this.candidate;

      if (_candidate && isMarker(_candidate)) {
        let first = _candidate;
        let last = first.nextSibling;

        while (last && !isMarker(last)) {
          last = last.nextSibling;
        }

        return new ConcreteBounds(this.element, first, last);
      } else {
        return null;
      }
    }

    __appendText(string) {
      let {
        candidate
      } = this;

      if (candidate) {
        if (isTextNode(candidate)) {
          if (candidate.nodeValue !== string) {
            candidate.nodeValue = string;
          }

          this.candidate = candidate.nextSibling;
          return candidate;
        } else if (candidate && (isSeparator(candidate) || isEmpty$1(candidate))) {
          this.candidate = candidate.nextSibling;
          this.remove(candidate);
          return this.__appendText(string);
        } else if (isEmpty$1(candidate)) {
          let next = this.remove(candidate);
          this.candidate = next;
          let text = this.dom.createTextNode(string);
          this.dom.insertBefore(this.element, text, next);
          return text;
        } else {
          this.clearMismatch(candidate);
          return super.__appendText(string);
        }
      } else {
        return super.__appendText(string);
      }
    }

    __appendComment(string) {
      let _candidate = this.candidate;

      if (_candidate && isComment(_candidate)) {
        if (_candidate.nodeValue !== string) {
          _candidate.nodeValue = string;
        }

        this.candidate = _candidate.nextSibling;
        return _candidate;
      } else if (_candidate) {
        this.clearMismatch(_candidate);
      }

      return super.__appendComment(string);
    }

    __openElement(tag) {
      let _candidate = this.candidate;

      if (_candidate && isElement(_candidate) && isSameNodeType(_candidate, tag)) {
        this.unmatchedAttributes = [].slice.call(_candidate.attributes);
        return _candidate;
      } else if (_candidate) {
        if (isElement(_candidate) && _candidate.tagName === 'TBODY') {
          this.pushElement(_candidate, null);
          this.currentCursor.injectedOmittedNode = true;
          return this.__openElement(tag);
        }

        this.clearMismatch(_candidate);
      }

      return super.__openElement(tag);
    }

    __setAttribute(name, value, namespace) {
      let unmatched = this.unmatchedAttributes;

      if (unmatched) {
        let attr = findByName(unmatched, name);

        if (attr) {
          if (attr.value !== value) {
            attr.value = value;
          }

          unmatched.splice(unmatched.indexOf(attr), 1);
          return;
        }
      }

      return super.__setAttribute(name, value, namespace);
    }

    __setProperty(name, value) {
      let unmatched = this.unmatchedAttributes;

      if (unmatched) {
        let attr = findByName(unmatched, name);

        if (attr) {
          if (attr.value !== value) {
            attr.value = value;
          }

          unmatched.splice(unmatched.indexOf(attr), 1);
          return;
        }
      }

      return super.__setProperty(name, value);
    }

    __flushElement(parent, constructing) {
      let {
        unmatchedAttributes: unmatched
      } = this;

      if (unmatched) {
        for (let i = 0; i < unmatched.length; i++) {
          this.constructing.removeAttribute(unmatched[i].name);
        }

        this.unmatchedAttributes = null;
      } else {
        super.__flushElement(parent, constructing);
      }
    }

    willCloseElement() {
      let {
        candidate,
        currentCursor
      } = this;

      if (candidate !== null) {
        this.clearMismatch(candidate);
      }

      if (currentCursor && currentCursor.injectedOmittedNode) {
        this.popElement();
      }

      super.willCloseElement();
    }

    getMarker(element, guid) {
      let marker = element.querySelector("script[glmr=\"" + guid + "\"]");

      if (marker) {
        return marker;
      }

      throw new Error('Cannot find serialized cursor for `in-element`');
    }

    __pushRemoteElement(element, cursorId, nextSibling = null) {
      let marker = this.getMarker(element, cursorId);

      if (marker.parentNode === element) {
        let currentCursor = this.currentCursor;
        let candidate = currentCursor.candidate;
        this.pushElement(element, nextSibling);
        currentCursor.candidate = candidate;
        this.candidate = this.remove(marker);
        let tracker = new RemoteBlockTracker(element);
        this.pushBlockTracker(tracker, true);
      }
    }

    didAppendBounds(bounds) {
      super.didAppendBounds(bounds);

      if (this.candidate) {
        let last = bounds.lastNode();
        this.candidate = last && last.nextSibling;
      }

      return bounds;
    }

  }

  _exports.RehydrateBuilder = RehydrateBuilder;

  function isTextNode(node) {
    return node.nodeType === 3;
  }

  function isComment(node) {
    return node.nodeType === 8;
  }

  function getOpenBlockDepth(node) {
    let boundsDepth = node.nodeValue.match(/^%\+b:(\d+)%$/);

    if (boundsDepth && boundsDepth[1]) {
      return Number(boundsDepth[1]);
    } else {
      return null;
    }
  }

  function getCloseBlockDepth(node) {
    let boundsDepth = node.nodeValue.match(/^%\-b:(\d+)%$/);

    if (boundsDepth && boundsDepth[1]) {
      return Number(boundsDepth[1]);
    } else {
      return null;
    }
  }

  function isElement(node) {
    return node.nodeType === 1;
  }

  function isMarker(node) {
    return node.nodeType === 8 && node.nodeValue === '%glmr%';
  }

  function isSeparator(node) {
    return node.nodeType === 8 && node.nodeValue === '%|%';
  }

  function isEmpty$1(node) {
    return node.nodeType === 8 && node.nodeValue === '% %';
  }

  function isSameNodeType(candidate, tag) {
    if (candidate.namespaceURI === SVG_NAMESPACE) {
      return candidate.tagName === tag;
    }

    return candidate.tagName === tag.toUpperCase();
  }

  function findByName(array, name) {
    for (let i = 0; i < array.length; i++) {
      let attr = array[i];
      if (attr.name === name) return attr;
    }

    return undefined;
  }

  function rehydrationBuilder(env, cursor) {
    return RehydrateBuilder.forInitialRender(env, cursor);
  }
});
enifed("@glimmer/util", ["exports"], function (_exports) {
  "use strict";

  _exports.assert = debugAssert;
  _exports.assign = assign;
  _exports.fillNulls = fillNulls;
  _exports.ensureGuid = ensureGuid;
  _exports.initializeGuid = initializeGuid;
  _exports.dict = dict;
  _exports.unwrap = unwrap;
  _exports.expect = expect;
  _exports.unreachable = unreachable;
  _exports.EMPTY_ARRAY = _exports.ListSlice = _exports.ListNode = _exports.LinkedList = _exports.EMPTY_SLICE = _exports.DictSet = _exports.Stack = void 0;

  function unwrap(val) {
    if (val === null || val === undefined) throw new Error("Expected value to be present");
    return val;
  }

  function expect(val, message) {
    if (val === null || val === undefined) throw new Error(message);
    return val;
  }

  function unreachable(message = 'unreachable') {
    return new Error(message);
  } // import Logger from './logger';
  // let alreadyWarned = false;


  function debugAssert(test, msg) {
    // if (!alreadyWarned) {
    //   alreadyWarned = true;
    //   Logger.warn("Don't leave debug assertions on in public builds");
    // }
    if (!test) {
      throw new Error(msg || 'assertion failure');
    }
  }

  const {
    keys: objKeys
  } = Object;

  function assign(obj) {
    for (let i = 1; i < arguments.length; i++) {
      let assignment = arguments[i];
      if (assignment === null || typeof assignment !== 'object') continue;
      let keys = objKeys(assignment);

      for (let j = 0; j < keys.length; j++) {
        let key = keys[j];
        obj[key] = assignment[key];
      }
    }

    return obj;
  }

  function fillNulls(count) {
    let arr = new Array(count);

    for (let i = 0; i < count; i++) {
      arr[i] = null;
    }

    return arr;
  }

  let GUID = 0;

  function initializeGuid(object) {
    return object._guid = ++GUID;
  }

  function ensureGuid(object) {
    return object._guid || initializeGuid(object);
  }

  function dict() {
    return Object.create(null);
  }

  class DictSet {
    constructor() {
      this.dict = dict();
    }

    add(obj) {
      if (typeof obj === 'string') this.dict[obj] = obj;else this.dict[ensureGuid(obj)] = obj;
      return this;
    }

    delete(obj) {
      if (typeof obj === 'string') delete this.dict[obj];else if (obj._guid) delete this.dict[obj._guid];
    }

  }

  _exports.DictSet = DictSet;

  class Stack {
    constructor() {
      this.stack = [];
      this.current = null;
    }

    get size() {
      return this.stack.length;
    }

    push(item) {
      this.current = item;
      this.stack.push(item);
    }

    pop() {
      let item = this.stack.pop();
      let len = this.stack.length;
      this.current = len === 0 ? null : this.stack[len - 1];
      return item === undefined ? null : item;
    }

    isEmpty() {
      return this.stack.length === 0;
    }

  }

  _exports.Stack = Stack;

  class ListNode {
    constructor(value) {
      this.next = null;
      this.prev = null;
      this.value = value;
    }

  }

  _exports.ListNode = ListNode;

  class LinkedList {
    constructor() {
      this.clear();
    }

    head() {
      return this._head;
    }

    tail() {
      return this._tail;
    }

    clear() {
      this._head = this._tail = null;
    }

    toArray() {
      let out = [];
      this.forEachNode(n => out.push(n));
      return out;
    }

    nextNode(node) {
      return node.next;
    }

    forEachNode(callback) {
      let node = this._head;

      while (node !== null) {
        callback(node);
        node = node.next;
      }
    }

    insertBefore(node, reference = null) {
      if (reference === null) return this.append(node);
      if (reference.prev) reference.prev.next = node;else this._head = node;
      node.prev = reference.prev;
      node.next = reference;
      reference.prev = node;
      return node;
    }

    append(node) {
      let tail = this._tail;

      if (tail) {
        tail.next = node;
        node.prev = tail;
        node.next = null;
      } else {
        this._head = node;
      }

      return this._tail = node;
    }

    remove(node) {
      if (node.prev) node.prev.next = node.next;else this._head = node.next;
      if (node.next) node.next.prev = node.prev;else this._tail = node.prev;
      return node;
    }

  }

  _exports.LinkedList = LinkedList;

  class ListSlice {
    constructor(head, tail) {
      this._head = head;
      this._tail = tail;
    }

    forEachNode(callback) {
      let node = this._head;

      while (node !== null) {
        callback(node);
        node = this.nextNode(node);
      }
    }

    head() {
      return this._head;
    }

    tail() {
      return this._tail;
    }

    toArray() {
      let out = [];
      this.forEachNode(n => out.push(n));
      return out;
    }

    nextNode(node) {
      if (node === this._tail) return null;
      return node.next;
    }

  }

  _exports.ListSlice = ListSlice;
  const EMPTY_SLICE = new ListSlice(null, null);
  _exports.EMPTY_SLICE = EMPTY_SLICE;
  const EMPTY_ARRAY = Object.freeze([]);
  _exports.EMPTY_ARRAY = EMPTY_ARRAY;
});
enifed("@glimmer/vm", ["exports"], function (_exports) {
  "use strict";

  _exports.Register = void 0;

  /**
   * Registers
   *
   * For the most part, these follows MIPS naming conventions, however the
   * register numbers are different.
   */
  var Register;
  _exports.Register = Register;

  (function (Register) {
    // $0 or $pc (program counter): pointer into `program` for the next insturction; -1 means exit
    Register[Register["pc"] = 0] = "pc"; // $1 or $ra (return address): pointer into `program` for the return

    Register[Register["ra"] = 1] = "ra"; // $2 or $fp (frame pointer): pointer into the `evalStack` for the base of the stack

    Register[Register["fp"] = 2] = "fp"; // $3 or $sp (stack pointer): pointer into the `evalStack` for the top of the stack

    Register[Register["sp"] = 3] = "sp"; // $4-$5 or $s0-$s1 (saved): callee saved general-purpose registers

    Register[Register["s0"] = 4] = "s0";
    Register[Register["s1"] = 5] = "s1"; // $6-$7 or $t0-$t1 (temporaries): caller saved general-purpose registers

    Register[Register["t0"] = 6] = "t0";
    Register[Register["t1"] = 7] = "t1"; // $8 or $v0 (return value)

    Register[Register["v0"] = 8] = "v0";
  })(Register || (_exports.Register = Register = {}));
});
enifed("@glimmer/wire-format", ["exports"], function (_exports) {
  "use strict";

  _exports.is = is;
  _exports.isAttribute = isAttribute;
  _exports.isArgument = isArgument;
  _exports.isMaybeLocal = _exports.isGet = _exports.isFlushElement = _exports.Ops = void 0;
  var Opcodes;
  _exports.Ops = Opcodes;

  (function (Opcodes) {
    // Statements
    Opcodes[Opcodes["Text"] = 0] = "Text";
    Opcodes[Opcodes["Append"] = 1] = "Append";
    Opcodes[Opcodes["Comment"] = 2] = "Comment";
    Opcodes[Opcodes["Modifier"] = 3] = "Modifier";
    Opcodes[Opcodes["Block"] = 4] = "Block";
    Opcodes[Opcodes["Component"] = 5] = "Component";
    Opcodes[Opcodes["DynamicComponent"] = 6] = "DynamicComponent";
    Opcodes[Opcodes["OpenElement"] = 7] = "OpenElement";
    Opcodes[Opcodes["FlushElement"] = 8] = "FlushElement";
    Opcodes[Opcodes["CloseElement"] = 9] = "CloseElement";
    Opcodes[Opcodes["StaticAttr"] = 10] = "StaticAttr";
    Opcodes[Opcodes["DynamicAttr"] = 11] = "DynamicAttr";
    Opcodes[Opcodes["ComponentAttr"] = 12] = "ComponentAttr";
    Opcodes[Opcodes["AttrSplat"] = 13] = "AttrSplat";
    Opcodes[Opcodes["Yield"] = 14] = "Yield";
    Opcodes[Opcodes["Partial"] = 15] = "Partial";
    Opcodes[Opcodes["DynamicArg"] = 16] = "DynamicArg";
    Opcodes[Opcodes["StaticArg"] = 17] = "StaticArg";
    Opcodes[Opcodes["TrustingAttr"] = 18] = "TrustingAttr";
    Opcodes[Opcodes["TrustingComponentAttr"] = 19] = "TrustingComponentAttr";
    Opcodes[Opcodes["Debugger"] = 20] = "Debugger";
    Opcodes[Opcodes["ClientSideStatement"] = 21] = "ClientSideStatement"; // Expressions

    Opcodes[Opcodes["Unknown"] = 22] = "Unknown";
    Opcodes[Opcodes["Get"] = 23] = "Get";
    Opcodes[Opcodes["MaybeLocal"] = 24] = "MaybeLocal";
    Opcodes[Opcodes["HasBlock"] = 25] = "HasBlock";
    Opcodes[Opcodes["HasBlockParams"] = 26] = "HasBlockParams";
    Opcodes[Opcodes["Undefined"] = 27] = "Undefined";
    Opcodes[Opcodes["Helper"] = 28] = "Helper";
    Opcodes[Opcodes["Concat"] = 29] = "Concat";
    Opcodes[Opcodes["ClientSideExpression"] = 30] = "ClientSideExpression";
  })(Opcodes || (_exports.Ops = Opcodes = {}));

  function is(variant) {
    return function (value) {
      return Array.isArray(value) && value[0] === variant;
    };
  } // Statements


  const isFlushElement = is(Opcodes.FlushElement);
  _exports.isFlushElement = isFlushElement;

  function isAttribute(val) {
    return val[0] === Opcodes.StaticAttr || val[0] === Opcodes.DynamicAttr || val[0] === Opcodes.ComponentAttr || val[0] === Opcodes.TrustingAttr || val[0] === Opcodes.TrustingComponentAttr || val[0] === Opcodes.AttrSplat || val[0] === Opcodes.Modifier;
  }

  function isArgument(val) {
    return val[0] === Opcodes.StaticArg || val[0] === Opcodes.DynamicArg;
  } // Expressions


  const isGet = is(Opcodes.Get);
  _exports.isGet = isGet;
  const isMaybeLocal = is(Opcodes.MaybeLocal);
  _exports.isMaybeLocal = isMaybeLocal;
});
enifed("backburner", ["exports"], function (_exports) {
  "use strict";

  _exports.buildPlatform = buildPlatform;
  _exports.default = void 0;
  const SET_TIMEOUT = setTimeout;

  const NOOP = () => {};

  function buildNext(flush) {
    // Using "promises first" here to:
    //
    // 1) Ensure more consistent experience on browsers that
    //    have differently queued microtasks (separate queues for
    //    MutationObserver vs Promises).
    // 2) Ensure better debugging experiences (it shows up in Chrome
    //    call stack as "Promise.then (async)") which is more consistent
    //    with user expectations
    //
    // When Promise is unavailable use MutationObserver (mostly so that we
    // still get microtasks on IE11), and when neither MutationObserver and
    // Promise are present use a plain old setTimeout.
    if (typeof Promise === 'function') {
      const autorunPromise = Promise.resolve();
      return () => autorunPromise.then(flush);
    } else if (typeof MutationObserver === 'function') {
      let iterations = 0;
      let observer = new MutationObserver(flush);
      let node = document.createTextNode('');
      observer.observe(node, {
        characterData: true
      });
      return () => {
        iterations = ++iterations % 2;
        node.data = '' + iterations;
        return iterations;
      };
    } else {
      return () => SET_TIMEOUT(flush, 0);
    }
  }

  function buildPlatform(flush) {
    let clearNext = NOOP;
    return {
      setTimeout(fn, ms) {
        return setTimeout(fn, ms);
      },

      clearTimeout(timerId) {
        return clearTimeout(timerId);
      },

      now() {
        return Date.now();
      },

      next: buildNext(flush),
      clearNext
    };
  }

  const NUMBER = /\d+/;
  const TIMERS_OFFSET = 6;

  function isCoercableNumber(suspect) {
    let type = typeof suspect;
    return type === 'number' && suspect === suspect || type === 'string' && NUMBER.test(suspect);
  }

  function getOnError(options) {
    return options.onError || options.onErrorTarget && options.onErrorTarget[options.onErrorMethod];
  }

  function findItem(target, method, collection) {
    let index = -1;

    for (let i = 0, l = collection.length; i < l; i += 4) {
      if (collection[i] === target && collection[i + 1] === method) {
        index = i;
        break;
      }
    }

    return index;
  }

  function findTimerItem(target, method, collection) {
    let index = -1;

    for (let i = 2, l = collection.length; i < l; i += 6) {
      if (collection[i] === target && collection[i + 1] === method) {
        index = i - 2;
        break;
      }
    }

    return index;
  }

  function getQueueItems(items, queueItemLength, queueItemPositionOffset = 0) {
    let queueItems = [];

    for (let i = 0; i < items.length; i += queueItemLength) {
      let maybeError = items[i + 3
      /* stack */
      + queueItemPositionOffset];
      let queueItem = {
        target: items[i + 0
        /* target */
        + queueItemPositionOffset],
        method: items[i + 1
        /* method */
        + queueItemPositionOffset],
        args: items[i + 2
        /* args */
        + queueItemPositionOffset],
        stack: maybeError !== undefined && 'stack' in maybeError ? maybeError.stack : ''
      };
      queueItems.push(queueItem);
    }

    return queueItems;
  }

  function binarySearch(time, timers) {
    let start = 0;
    let end = timers.length - TIMERS_OFFSET;
    let middle;
    let l;

    while (start < end) {
      // since timers is an array of pairs 'l' will always
      // be an integer
      l = (end - start) / TIMERS_OFFSET; // compensate for the index in case even number
      // of pairs inside timers

      middle = start + l - l % TIMERS_OFFSET;

      if (time >= timers[middle]) {
        start = middle + TIMERS_OFFSET;
      } else {
        end = middle;
      }
    }

    return time >= timers[start] ? start + TIMERS_OFFSET : start;
  }

  const QUEUE_ITEM_LENGTH = 4;

  class Queue {
    constructor(name, options = {}, globalOptions = {}) {
      this._queueBeingFlushed = [];
      this.targetQueues = new Map();
      this.index = 0;
      this._queue = [];
      this.name = name;
      this.options = options;
      this.globalOptions = globalOptions;
    }

    stackFor(index) {
      if (index < this._queue.length) {
        let entry = this._queue[index * 3 + QUEUE_ITEM_LENGTH];

        if (entry) {
          return entry.stack;
        } else {
          return null;
        }
      }
    }

    flush(sync) {
      let {
        before,
        after
      } = this.options;
      let target;
      let method;
      let args;
      let errorRecordedForStack;
      this.targetQueues.clear();

      if (this._queueBeingFlushed.length === 0) {
        this._queueBeingFlushed = this._queue;
        this._queue = [];
      }

      if (before !== undefined) {
        before();
      }

      let invoke;
      let queueItems = this._queueBeingFlushed;

      if (queueItems.length > 0) {
        let onError = getOnError(this.globalOptions);
        invoke = onError ? this.invokeWithOnError : this.invoke;

        for (let i = this.index; i < queueItems.length; i += QUEUE_ITEM_LENGTH) {
          this.index += QUEUE_ITEM_LENGTH;
          method = queueItems[i + 1]; // method could have been nullified / canceled during flush

          if (method !== null) {
            //
            //    ** Attention intrepid developer **
            //
            //    To find out the stack of this task when it was scheduled onto
            //    the run loop, add the following to your app.js:
            //
            //    Ember.run.backburner.DEBUG = true; // NOTE: This slows your app, don't leave it on in production.
            //
            //    Once that is in place, when you are at a breakpoint and navigate
            //    here in the stack explorer, you can look at `errorRecordedForStack.stack`,
            //    which will be the captured stack when this job was scheduled.
            //
            //    One possible long-term solution is the following Chrome issue:
            //       https://bugs.chromium.org/p/chromium/issues/detail?id=332624
            //
            target = queueItems[i];
            args = queueItems[i + 2];
            errorRecordedForStack = queueItems[i + 3]; // Debugging assistance

            invoke(target, method, args, onError, errorRecordedForStack);
          }

          if (this.index !== this._queueBeingFlushed.length && this.globalOptions.mustYield && this.globalOptions.mustYield()) {
            return 1
            /* Pause */
            ;
          }
        }
      }

      if (after !== undefined) {
        after();
      }

      this._queueBeingFlushed.length = 0;
      this.index = 0;

      if (sync !== false && this._queue.length > 0) {
        // check if new items have been added
        this.flush(true);
      }
    }

    hasWork() {
      return this._queueBeingFlushed.length > 0 || this._queue.length > 0;
    }

    cancel({
      target,
      method
    }) {
      let queue = this._queue;
      let targetQueueMap = this.targetQueues.get(target);

      if (targetQueueMap !== undefined) {
        targetQueueMap.delete(method);
      }

      let index = findItem(target, method, queue);

      if (index > -1) {
        queue.splice(index, QUEUE_ITEM_LENGTH);
        return true;
      } // if not found in current queue
      // could be in the queue that is being flushed


      queue = this._queueBeingFlushed;
      index = findItem(target, method, queue);

      if (index > -1) {
        queue[index + 1] = null;
        return true;
      }

      return false;
    }

    push(target, method, args, stack) {
      this._queue.push(target, method, args, stack);

      return {
        queue: this,
        target,
        method
      };
    }

    pushUnique(target, method, args, stack) {
      let localQueueMap = this.targetQueues.get(target);

      if (localQueueMap === undefined) {
        localQueueMap = new Map();
        this.targetQueues.set(target, localQueueMap);
      }

      let index = localQueueMap.get(method);

      if (index === undefined) {
        let queueIndex = this._queue.push(target, method, args, stack) - QUEUE_ITEM_LENGTH;
        localQueueMap.set(method, queueIndex);
      } else {
        let queue = this._queue;
        queue[index + 2] = args; // replace args

        queue[index + 3] = stack; // replace stack
      }

      return {
        queue: this,
        target,
        method
      };
    }

    _getDebugInfo(debugEnabled) {
      if (debugEnabled) {
        let debugInfo = getQueueItems(this._queue, QUEUE_ITEM_LENGTH);
        return debugInfo;
      }

      return undefined;
    }

    invoke(target, method, args
    /*, onError, errorRecordedForStack */
    ) {
      if (args === undefined) {
        method.call(target);
      } else {
        method.apply(target, args);
      }
    }

    invokeWithOnError(target, method, args, onError, errorRecordedForStack) {
      try {
        if (args === undefined) {
          method.call(target);
        } else {
          method.apply(target, args);
        }
      } catch (error) {
        onError(error, errorRecordedForStack);
      }
    }

  }

  class DeferredActionQueues {
    constructor(queueNames = [], options) {
      this.queues = {};
      this.queueNameIndex = 0;
      this.queueNames = queueNames;
      queueNames.reduce(function (queues, queueName) {
        queues[queueName] = new Queue(queueName, options[queueName], options);
        return queues;
      }, this.queues);
    }
    /**
     * @method schedule
     * @param {String} queueName
     * @param {Any} target
     * @param {Any} method
     * @param {Any} args
     * @param {Boolean} onceFlag
     * @param {Any} stack
     * @return queue
     */


    schedule(queueName, target, method, args, onceFlag, stack) {
      let queues = this.queues;
      let queue = queues[queueName];

      if (queue === undefined) {
        throw new Error("You attempted to schedule an action in a queue (" + queueName + ") that doesn't exist");
      }

      if (method === undefined || method === null) {
        throw new Error("You attempted to schedule an action in a queue (" + queueName + ") for a method that doesn't exist");
      }

      this.queueNameIndex = 0;

      if (onceFlag) {
        return queue.pushUnique(target, method, args, stack);
      } else {
        return queue.push(target, method, args, stack);
      }
    }
    /**
     * DeferredActionQueues.flush() calls Queue.flush()
     *
     * @method flush
     * @param {Boolean} fromAutorun
     */


    flush(fromAutorun = false) {
      let queue;
      let queueName;
      let numberOfQueues = this.queueNames.length;

      while (this.queueNameIndex < numberOfQueues) {
        queueName = this.queueNames[this.queueNameIndex];
        queue = this.queues[queueName];

        if (queue.hasWork() === false) {
          this.queueNameIndex++;

          if (fromAutorun && this.queueNameIndex < numberOfQueues) {
            return 1
            /* Pause */
            ;
          }
        } else {
          if (queue.flush(false
          /* async */
          ) === 1
          /* Pause */
          ) {
              return 1
              /* Pause */
              ;
            }
        }
      }
    }
    /**
     * Returns debug information for the current queues.
     *
     * @method _getDebugInfo
     * @param {Boolean} debugEnabled
     * @returns {IDebugInfo | undefined}
     */


    _getDebugInfo(debugEnabled) {
      if (debugEnabled) {
        let debugInfo = {};
        let queue;
        let queueName;
        let numberOfQueues = this.queueNames.length;
        let i = 0;

        while (i < numberOfQueues) {
          queueName = this.queueNames[i];
          queue = this.queues[queueName];
          debugInfo[queueName] = queue._getDebugInfo(debugEnabled);
          i++;
        }

        return debugInfo;
      }

      return;
    }

  }

  function iteratorDrain(fn) {
    let iterator = fn();
    let result = iterator.next();

    while (result.done === false) {
      result.value();
      result = iterator.next();
    }
  }

  const noop = function () {};

  const DISABLE_SCHEDULE = Object.freeze([]);

  function parseArgs() {
    let length = arguments.length;
    let args;
    let method;
    let target;

    if (length === 0) {} else if (length === 1) {
      target = null;
      method = arguments[0];
    } else {
      let argsIndex = 2;
      let methodOrTarget = arguments[0];
      let methodOrArgs = arguments[1];
      let type = typeof methodOrArgs;

      if (type === 'function') {
        target = methodOrTarget;
        method = methodOrArgs;
      } else if (methodOrTarget !== null && type === 'string' && methodOrArgs in methodOrTarget) {
        target = methodOrTarget;
        method = target[methodOrArgs];
      } else if (typeof methodOrTarget === 'function') {
        argsIndex = 1;
        target = null;
        method = methodOrTarget;
      }

      if (length > argsIndex) {
        let len = length - argsIndex;
        args = new Array(len);

        for (let i = 0; i < len; i++) {
          args[i] = arguments[i + argsIndex];
        }
      }
    }

    return [target, method, args];
  }

  function parseTimerArgs() {
    let [target, method, args] = parseArgs(...arguments);
    let wait = 0;
    let length = args !== undefined ? args.length : 0;

    if (length > 0) {
      let last = args[length - 1];

      if (isCoercableNumber(last)) {
        wait = parseInt(args.pop(), 10);
      }
    }

    return [target, method, args, wait];
  }

  function parseDebounceArgs() {
    let target;
    let method;
    let isImmediate;
    let args;
    let wait;

    if (arguments.length === 2) {
      method = arguments[0];
      wait = arguments[1];
      target = null;
    } else {
      [target, method, args] = parseArgs(...arguments);

      if (args === undefined) {
        wait = 0;
      } else {
        wait = args.pop();

        if (!isCoercableNumber(wait)) {
          isImmediate = wait === true;
          wait = args.pop();
        }
      }
    }

    wait = parseInt(wait, 10);
    return [target, method, args, wait, isImmediate];
  }

  let UUID = 0;
  let beginCount = 0;
  let endCount = 0;
  let beginEventCount = 0;
  let endEventCount = 0;
  let runCount = 0;
  let joinCount = 0;
  let deferCount = 0;
  let scheduleCount = 0;
  let scheduleIterableCount = 0;
  let deferOnceCount = 0;
  let scheduleOnceCount = 0;
  let setTimeoutCount = 0;
  let laterCount = 0;
  let throttleCount = 0;
  let debounceCount = 0;
  let cancelTimersCount = 0;
  let cancelCount = 0;
  let autorunsCreatedCount = 0;
  let autorunsCompletedCount = 0;
  let deferredActionQueuesCreatedCount = 0;
  let nestedDeferredActionQueuesCreated = 0;

  class Backburner {
    constructor(queueNames, options) {
      this.DEBUG = false;
      this.currentInstance = null;
      this.instanceStack = [];
      this._eventCallbacks = {
        end: [],
        begin: []
      };
      this._timerTimeoutId = null;
      this._timers = [];
      this._autorun = false;
      this._autorunStack = null;
      this.queueNames = queueNames;
      this.options = options || {};

      if (typeof this.options.defaultQueue === 'string') {
        this._defaultQueue = this.options.defaultQueue;
      } else {
        this._defaultQueue = this.queueNames[0];
      }

      this._onBegin = this.options.onBegin || noop;
      this._onEnd = this.options.onEnd || noop;
      this._boundRunExpiredTimers = this._runExpiredTimers.bind(this);

      this._boundAutorunEnd = () => {
        autorunsCompletedCount++; // if the autorun was already flushed, do nothing

        if (this._autorun === false) {
          return;
        }

        this._autorun = false;
        this._autorunStack = null;

        this._end(true
        /* fromAutorun */
        );
      };

      let builder = this.options._buildPlatform || buildPlatform;
      this._platform = builder(this._boundAutorunEnd);
    }

    get counters() {
      return {
        begin: beginCount,
        end: endCount,
        events: {
          begin: beginEventCount,
          end: endEventCount
        },
        autoruns: {
          created: autorunsCreatedCount,
          completed: autorunsCompletedCount
        },
        run: runCount,
        join: joinCount,
        defer: deferCount,
        schedule: scheduleCount,
        scheduleIterable: scheduleIterableCount,
        deferOnce: deferOnceCount,
        scheduleOnce: scheduleOnceCount,
        setTimeout: setTimeoutCount,
        later: laterCount,
        throttle: throttleCount,
        debounce: debounceCount,
        cancelTimers: cancelTimersCount,
        cancel: cancelCount,
        loops: {
          total: deferredActionQueuesCreatedCount,
          nested: nestedDeferredActionQueuesCreated
        }
      };
    }

    get defaultQueue() {
      return this._defaultQueue;
    }
    /*
      @method begin
      @return instantiated class DeferredActionQueues
    */


    begin() {
      beginCount++;
      let options = this.options;
      let previousInstance = this.currentInstance;
      let current;

      if (this._autorun !== false) {
        current = previousInstance;

        this._cancelAutorun();
      } else {
        if (previousInstance !== null) {
          nestedDeferredActionQueuesCreated++;
          this.instanceStack.push(previousInstance);
        }

        deferredActionQueuesCreatedCount++;
        current = this.currentInstance = new DeferredActionQueues(this.queueNames, options);
        beginEventCount++;

        this._trigger('begin', current, previousInstance);
      }

      this._onBegin(current, previousInstance);

      return current;
    }

    end() {
      endCount++;

      this._end(false);
    }

    on(eventName, callback) {
      if (typeof callback !== 'function') {
        throw new TypeError("Callback must be a function");
      }

      let callbacks = this._eventCallbacks[eventName];

      if (callbacks !== undefined) {
        callbacks.push(callback);
      } else {
        throw new TypeError("Cannot on() event " + eventName + " because it does not exist");
      }
    }

    off(eventName, callback) {
      let callbacks = this._eventCallbacks[eventName];

      if (!eventName || callbacks === undefined) {
        throw new TypeError("Cannot off() event " + eventName + " because it does not exist");
      }

      let callbackFound = false;

      if (callback) {
        for (let i = 0; i < callbacks.length; i++) {
          if (callbacks[i] === callback) {
            callbackFound = true;
            callbacks.splice(i, 1);
            i--;
          }
        }
      }

      if (!callbackFound) {
        throw new TypeError("Cannot off() callback that does not exist");
      }
    }

    run() {
      runCount++;
      let [target, method, args] = parseArgs(...arguments);
      return this._run(target, method, args);
    }

    join() {
      joinCount++;
      let [target, method, args] = parseArgs(...arguments);
      return this._join(target, method, args);
    }
    /**
     * @deprecated please use schedule instead.
     */


    defer(queueName, target, method, ...args) {
      deferCount++;
      return this.schedule(queueName, target, method, ...args);
    }

    schedule(queueName, ..._args) {
      scheduleCount++;
      let [target, method, args] = parseArgs(..._args);
      let stack = this.DEBUG ? new Error() : undefined;
      return this._ensureInstance().schedule(queueName, target, method, args, false, stack);
    }
    /*
      Defer the passed iterable of functions to run inside the specified queue.
         @method scheduleIterable
      @param {String} queueName
      @param {Iterable} an iterable of functions to execute
      @return method result
    */


    scheduleIterable(queueName, iterable) {
      scheduleIterableCount++;
      let stack = this.DEBUG ? new Error() : undefined;
      return this._ensureInstance().schedule(queueName, null, iteratorDrain, [iterable], false, stack);
    }
    /**
     * @deprecated please use scheduleOnce instead.
     */


    deferOnce(queueName, target, method, ...args) {
      deferOnceCount++;
      return this.scheduleOnce(queueName, target, method, ...args);
    }

    scheduleOnce(queueName, ..._args) {
      scheduleOnceCount++;
      let [target, method, args] = parseArgs(..._args);
      let stack = this.DEBUG ? new Error() : undefined;
      return this._ensureInstance().schedule(queueName, target, method, args, true, stack);
    }

    setTimeout() {
      setTimeoutCount++;
      return this.later(...arguments);
    }

    later() {
      laterCount++;
      let [target, method, args, wait] = parseTimerArgs(...arguments);
      return this._later(target, method, args, wait);
    }

    throttle() {
      throttleCount++;
      let [target, method, args, wait, isImmediate = true] = parseDebounceArgs(...arguments);
      let index = findTimerItem(target, method, this._timers);
      let timerId;

      if (index === -1) {
        timerId = this._later(target, method, isImmediate ? DISABLE_SCHEDULE : args, wait);

        if (isImmediate) {
          this._join(target, method, args);
        }
      } else {
        timerId = this._timers[index + 1];
        let argIndex = index + 4;

        if (this._timers[argIndex] !== DISABLE_SCHEDULE) {
          this._timers[argIndex] = args;
        }
      }

      return timerId;
    }

    debounce() {
      debounceCount++;
      let [target, method, args, wait, isImmediate = false] = parseDebounceArgs(...arguments);
      let _timers = this._timers;
      let index = findTimerItem(target, method, _timers);
      let timerId;

      if (index === -1) {
        timerId = this._later(target, method, isImmediate ? DISABLE_SCHEDULE : args, wait);

        if (isImmediate) {
          this._join(target, method, args);
        }
      } else {
        let executeAt = this._platform.now() + wait;
        let argIndex = index + 4;

        if (_timers[argIndex] === DISABLE_SCHEDULE) {
          args = DISABLE_SCHEDULE;
        }

        timerId = _timers[index + 1];
        let i = binarySearch(executeAt, _timers);

        if (index + TIMERS_OFFSET === i) {
          _timers[index] = executeAt;
          _timers[argIndex] = args;
        } else {
          let stack = this._timers[index + 5];

          this._timers.splice(i, 0, executeAt, timerId, target, method, args, stack);

          this._timers.splice(index, TIMERS_OFFSET);
        }

        if (index === 0) {
          this._reinstallTimerTimeout();
        }
      }

      return timerId;
    }

    cancelTimers() {
      cancelTimersCount++;

      this._clearTimerTimeout();

      this._timers = [];

      this._cancelAutorun();
    }

    hasTimers() {
      return this._timers.length > 0 || this._autorun;
    }

    cancel(timer) {
      cancelCount++;

      if (timer === null || timer === undefined) {
        return false;
      }

      let timerType = typeof timer;

      if (timerType === 'number') {
        // we're cancelling a setTimeout or throttle or debounce
        return this._cancelLaterTimer(timer);
      } else if (timerType === 'object' && timer.queue && timer.method) {
        // we're cancelling a deferOnce
        return timer.queue.cancel(timer);
      }

      return false;
    }

    ensureInstance() {
      this._ensureInstance();
    }
    /**
     * Returns debug information related to the current instance of Backburner
     *
     * @method getDebugInfo
     * @returns {Object | undefined} Will return and Object containing debug information if
     * the DEBUG flag is set to true on the current instance of Backburner, else undefined.
     */


    getDebugInfo() {
      if (this.DEBUG) {
        return {
          autorun: this._autorunStack,
          counters: this.counters,
          timers: getQueueItems(this._timers, TIMERS_OFFSET, 2),
          instanceStack: [this.currentInstance, ...this.instanceStack].map(deferredActionQueue => deferredActionQueue && deferredActionQueue._getDebugInfo(this.DEBUG))
        };
      }

      return undefined;
    }

    _end(fromAutorun) {
      let currentInstance = this.currentInstance;
      let nextInstance = null;

      if (currentInstance === null) {
        throw new Error("end called without begin");
      } // Prevent double-finally bug in Safari 6.0.2 and iOS 6
      // This bug appears to be resolved in Safari 6.0.5 and iOS 7


      let finallyAlreadyCalled = false;
      let result;

      try {
        result = currentInstance.flush(fromAutorun);
      } finally {
        if (!finallyAlreadyCalled) {
          finallyAlreadyCalled = true;

          if (result === 1
          /* Pause */
          ) {
              const plannedNextQueue = this.queueNames[currentInstance.queueNameIndex];

              this._scheduleAutorun(plannedNextQueue);
            } else {
            this.currentInstance = null;

            if (this.instanceStack.length > 0) {
              nextInstance = this.instanceStack.pop();
              this.currentInstance = nextInstance;
            }

            this._trigger('end', currentInstance, nextInstance);

            this._onEnd(currentInstance, nextInstance);
          }
        }
      }
    }

    _join(target, method, args) {
      if (this.currentInstance === null) {
        return this._run(target, method, args);
      }

      if (target === undefined && args === undefined) {
        return method();
      } else {
        return method.apply(target, args);
      }
    }

    _run(target, method, args) {
      let onError = getOnError(this.options);
      this.begin();

      if (onError) {
        try {
          return method.apply(target, args);
        } catch (error) {
          onError(error);
        } finally {
          this.end();
        }
      } else {
        try {
          return method.apply(target, args);
        } finally {
          this.end();
        }
      }
    }

    _cancelAutorun() {
      if (this._autorun) {
        this._platform.clearNext();

        this._autorun = false;
        this._autorunStack = null;
      }
    }

    _later(target, method, args, wait) {
      let stack = this.DEBUG ? new Error() : undefined;
      let executeAt = this._platform.now() + wait;
      let id = UUID++;

      if (this._timers.length === 0) {
        this._timers.push(executeAt, id, target, method, args, stack);

        this._installTimerTimeout();
      } else {
        // find position to insert
        let i = binarySearch(executeAt, this._timers);

        this._timers.splice(i, 0, executeAt, id, target, method, args, stack); // always reinstall since it could be out of sync


        this._reinstallTimerTimeout();
      }

      return id;
    }

    _cancelLaterTimer(timer) {
      for (let i = 1; i < this._timers.length; i += TIMERS_OFFSET) {
        if (this._timers[i] === timer) {
          this._timers.splice(i - 1, TIMERS_OFFSET);

          if (i === 1) {
            this._reinstallTimerTimeout();
          }

          return true;
        }
      }

      return false;
    }
    /**
     Trigger an event. Supports up to two arguments. Designed around
     triggering transition events from one run loop instance to the
     next, which requires an argument for the  instance and then
     an argument for the next instance.
        @private
     @method _trigger
     @param {String} eventName
     @param {any} arg1
     @param {any} arg2
     */


    _trigger(eventName, arg1, arg2) {
      let callbacks = this._eventCallbacks[eventName];

      if (callbacks !== undefined) {
        for (let i = 0; i < callbacks.length; i++) {
          callbacks[i](arg1, arg2);
        }
      }
    }

    _runExpiredTimers() {
      this._timerTimeoutId = null;

      if (this._timers.length > 0) {
        this.begin();

        this._scheduleExpiredTimers();

        this.end();
      }
    }

    _scheduleExpiredTimers() {
      let timers = this._timers;
      let i = 0;
      let l = timers.length;
      let defaultQueue = this._defaultQueue;

      let n = this._platform.now();

      for (; i < l; i += TIMERS_OFFSET) {
        let executeAt = timers[i];

        if (executeAt > n) {
          break;
        }

        let args = timers[i + 4];

        if (args !== DISABLE_SCHEDULE) {
          let target = timers[i + 2];
          let method = timers[i + 3];
          let stack = timers[i + 5];
          this.currentInstance.schedule(defaultQueue, target, method, args, false, stack);
        }
      }

      timers.splice(0, i);

      this._installTimerTimeout();
    }

    _reinstallTimerTimeout() {
      this._clearTimerTimeout();

      this._installTimerTimeout();
    }

    _clearTimerTimeout() {
      if (this._timerTimeoutId === null) {
        return;
      }

      this._platform.clearTimeout(this._timerTimeoutId);

      this._timerTimeoutId = null;
    }

    _installTimerTimeout() {
      if (this._timers.length === 0) {
        return;
      }

      let minExpiresAt = this._timers[0];

      let n = this._platform.now();

      let wait = Math.max(0, minExpiresAt - n);
      this._timerTimeoutId = this._platform.setTimeout(this._boundRunExpiredTimers, wait);
    }

    _ensureInstance() {
      let currentInstance = this.currentInstance;

      if (currentInstance === null) {
        this._autorunStack = this.DEBUG ? new Error() : undefined;
        currentInstance = this.begin();

        this._scheduleAutorun(this.queueNames[0]);
      }

      return currentInstance;
    }

    _scheduleAutorun(plannedNextQueue) {
      autorunsCreatedCount++;
      const next = this._platform.next;
      const flush = this.options.flush;

      if (flush) {
        flush(plannedNextQueue, next);
      } else {
        next();
      }

      this._autorun = true;
    }

  }

  Backburner.Queue = Queue;
  Backburner.buildPlatform = buildPlatform;
  Backburner.buildNext = buildNext;
  var _default = Backburner;
  _exports.default = _default;
});
enifed("dag-map", ["exports"], function (_exports) {
  "use strict";

  _exports.default = void 0;

  /**
   * A topologically ordered map of key/value pairs with a simple API for adding constraints.
   *
   * Edges can forward reference keys that have not been added yet (the forward reference will
   * map the key to undefined).
   */
  var DAG = function () {
    function DAG() {
      this._vertices = new Vertices();
    }
    /**
     * Adds a key/value pair with dependencies on other key/value pairs.
     *
     * @public
     * @param key    The key of the vertex to be added.
     * @param value  The value of that vertex.
     * @param before A key or array of keys of the vertices that must
     *               be visited before this vertex.
     * @param after  An string or array of strings with the keys of the
     *               vertices that must be after this vertex is visited.
     */


    DAG.prototype.add = function (key, value, before, after) {
      if (!key) throw new Error('argument `key` is required');
      var vertices = this._vertices;
      var v = vertices.add(key);
      v.val = value;

      if (before) {
        if (typeof before === "string") {
          vertices.addEdge(v, vertices.add(before));
        } else {
          for (var i = 0; i < before.length; i++) {
            vertices.addEdge(v, vertices.add(before[i]));
          }
        }
      }

      if (after) {
        if (typeof after === "string") {
          vertices.addEdge(vertices.add(after), v);
        } else {
          for (var i = 0; i < after.length; i++) {
            vertices.addEdge(vertices.add(after[i]), v);
          }
        }
      }
    };
    /**
     * @deprecated please use add.
     */


    DAG.prototype.addEdges = function (key, value, before, after) {
      this.add(key, value, before, after);
    };
    /**
     * Visits key/value pairs in topological order.
     *
     * @public
     * @param callback The function to be invoked with each key/value.
     */


    DAG.prototype.each = function (callback) {
      this._vertices.walk(callback);
    };
    /**
     * @deprecated please use each.
     */


    DAG.prototype.topsort = function (callback) {
      this.each(callback);
    };

    return DAG;
  }();

  var _default = DAG;
  /** @private */

  _exports.default = _default;

  var Vertices = function () {
    function Vertices() {
      this.length = 0;
      this.stack = new IntStack();
      this.path = new IntStack();
      this.result = new IntStack();
    }

    Vertices.prototype.add = function (key) {
      if (!key) throw new Error("missing key");
      var l = this.length | 0;
      var vertex;

      for (var i = 0; i < l; i++) {
        vertex = this[i];
        if (vertex.key === key) return vertex;
      }

      this.length = l + 1;
      return this[l] = {
        idx: l,
        key: key,
        val: undefined,
        out: false,
        flag: false,
        length: 0
      };
    };

    Vertices.prototype.addEdge = function (v, w) {
      this.check(v, w.key);
      var l = w.length | 0;

      for (var i = 0; i < l; i++) {
        if (w[i] === v.idx) return;
      }

      w.length = l + 1;
      w[l] = v.idx;
      v.out = true;
    };

    Vertices.prototype.walk = function (cb) {
      this.reset();

      for (var i = 0; i < this.length; i++) {
        var vertex = this[i];
        if (vertex.out) continue;
        this.visit(vertex, "");
      }

      this.each(this.result, cb);
    };

    Vertices.prototype.check = function (v, w) {
      if (v.key === w) {
        throw new Error("cycle detected: " + w + " <- " + w);
      } // quick check


      if (v.length === 0) return; // shallow check

      for (var i = 0; i < v.length; i++) {
        var key = this[v[i]].key;

        if (key === w) {
          throw new Error("cycle detected: " + w + " <- " + v.key + " <- " + w);
        }
      } // deep check


      this.reset();
      this.visit(v, w);

      if (this.path.length > 0) {
        var msg_1 = "cycle detected: " + w;
        this.each(this.path, function (key) {
          msg_1 += " <- " + key;
        });
        throw new Error(msg_1);
      }
    };

    Vertices.prototype.reset = function () {
      this.stack.length = 0;
      this.path.length = 0;
      this.result.length = 0;

      for (var i = 0, l = this.length; i < l; i++) {
        this[i].flag = false;
      }
    };

    Vertices.prototype.visit = function (start, search) {
      var _a = this,
          stack = _a.stack,
          path = _a.path,
          result = _a.result;

      stack.push(start.idx);

      while (stack.length) {
        var index = stack.pop() | 0;

        if (index >= 0) {
          // enter
          var vertex = this[index];
          if (vertex.flag) continue;
          vertex.flag = true;
          path.push(index);
          if (search === vertex.key) break; // push exit

          stack.push(~index);
          this.pushIncoming(vertex);
        } else {
          // exit
          path.pop();
          result.push(~index);
        }
      }
    };

    Vertices.prototype.pushIncoming = function (incomming) {
      var stack = this.stack;

      for (var i = incomming.length - 1; i >= 0; i--) {
        var index = incomming[i];

        if (!this[index].flag) {
          stack.push(index);
        }
      }
    };

    Vertices.prototype.each = function (indices, cb) {
      for (var i = 0, l = indices.length; i < l; i++) {
        var vertex = this[indices[i]];
        cb(vertex.key, vertex.val);
      }
    };

    return Vertices;
  }();
  /** @private */


  var IntStack = function () {
    function IntStack() {
      this.length = 0;
    }

    IntStack.prototype.push = function (n) {
      this[this.length++] = n | 0;
    };

    IntStack.prototype.pop = function () {
      return this[--this.length] | 0;
    };

    return IntStack;
  }();
});
enifed("ember-babel", ["exports"], function (_exports) {
  "use strict";

  _exports.wrapNativeSuper = wrapNativeSuper;
  _exports.classCallCheck = classCallCheck;
  _exports.inheritsLoose = inheritsLoose;
  _exports.taggedTemplateLiteralLoose = taggedTemplateLiteralLoose;
  _exports.createClass = createClass;
  _exports.assertThisInitialized = assertThisInitialized;
  _exports.possibleConstructorReturn = possibleConstructorReturn;
  _exports.objectDestructuringEmpty = objectDestructuringEmpty;
  const setPrototypeOf = Object.setPrototypeOf;
  var nativeWrapperCache = new Map(); // Super minimal version of Babel's wrapNativeSuper. We only use this for
  // extending Function, for ComputedDecoratorImpl and AliasDecoratorImpl. We know
  // we will never directly create an instance of these classes so no need to
  // include `construct` code or other helpers.

  function wrapNativeSuper(Class) {
    if (nativeWrapperCache.has(Class)) {
      return nativeWrapperCache.get(Class);
    }

    function Wrapper() {}

    Wrapper.prototype = Object.create(Class.prototype, {
      constructor: {
        value: Wrapper,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    nativeWrapperCache.set(Class, Wrapper);
    return setPrototypeOf(Wrapper, Class);
  }

  function classCallCheck(instance, Constructor) {
    if (false
    /* DEBUG */
    ) {
        if (!(instance instanceof Constructor)) {
          throw new TypeError('Cannot call a class as a function');
        }
      }
  }
  /*
    Overrides default `inheritsLoose` to _also_ call `Object.setPrototypeOf`.
    This is needed so that we can use `loose` option with the
    `@babel/plugin-transform-classes` (because we want simple assignment to the
    prototype whereever possible) but also keep our constructor based prototypal
    inheritance working properly
  */


  function inheritsLoose(subClass, superClass) {
    if (false
    /* DEBUG */
    ) {
        if (typeof superClass !== 'function' && superClass !== null) {
          throw new TypeError('Super expression must either be null or a function');
        }
      }

    subClass.prototype = Object.create(superClass === null ? null : superClass.prototype, {
      constructor: {
        value: subClass,
        writable: true,
        configurable: true
      }
    });

    if (superClass !== null) {
      setPrototypeOf(subClass, superClass);
    }
  }

  function taggedTemplateLiteralLoose(strings, raw) {
    if (!raw) {
      raw = strings.slice(0);
    }

    strings.raw = raw;
    return strings;
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ('value' in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }
  /*
    Differs from default implementation by avoiding boolean coercion of
    `protoProps` and `staticProps`.
  */


  function createClass(Constructor, protoProps, staticProps) {
    if (protoProps !== null && protoProps !== undefined) {
      _defineProperties(Constructor.prototype, protoProps);
    }

    if (staticProps !== null && staticProps !== undefined) {
      _defineProperties(Constructor, staticProps);
    }

    return Constructor;
  }

  function assertThisInitialized(self) {
    if (false
    /* DEBUG */
    && self === void 0) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return self;
  }
  /*
    Adds `DEBUG` guard to error being thrown, and avoids boolean coercion of `call`.
  */


  function possibleConstructorReturn(self, call) {
    if (typeof call === 'object' && call !== null || typeof call === 'function') {
      return call;
    }

    return assertThisInitialized(self);
  }

  function objectDestructuringEmpty(obj) {
    if (false
    /* DEBUG */
    && (obj === null || obj === undefined)) {
      throw new TypeError('Cannot destructure undefined');
    }
  }
});
enifed("ember/version", ["exports"], function (_exports) {
  "use strict";

  _exports.default = void 0;
  var _default = "3.13.0-enable-tracked-properties+42d8229a";
  _exports.default = _default;
});
/*global enifed, module */
enifed('node-module', ['exports'], function(_exports) {
  var IS_NODE = typeof module === 'object' && typeof module.require === 'function';
  if (IS_NODE) {
    _exports.require = module.require;
    _exports.module = module;
    _exports.IS_NODE = IS_NODE;
  } else {
    _exports.require = null;
    _exports.module = null;
    _exports.IS_NODE = IS_NODE;
  }
});

enifed("route-recognizer", ["exports"], function (_exports) {
  "use strict";

  _exports.default = void 0;
  var createObject = Object.create;

  function createMap() {
    var map = createObject(null);
    map["__"] = undefined;
    delete map["__"];
    return map;
  }

  var Target = function Target(path, matcher, delegate) {
    this.path = path;
    this.matcher = matcher;
    this.delegate = delegate;
  };

  Target.prototype.to = function to(target, callback) {
    var delegate = this.delegate;

    if (delegate && delegate.willAddRoute) {
      target = delegate.willAddRoute(this.matcher.target, target);
    }

    this.matcher.add(this.path, target);

    if (callback) {
      if (callback.length === 0) {
        throw new Error("You must have an argument in the function passed to `to`");
      }

      this.matcher.addChild(this.path, target, callback, this.delegate);
    }
  };

  var Matcher = function Matcher(target) {
    this.routes = createMap();
    this.children = createMap();
    this.target = target;
  };

  Matcher.prototype.add = function add(path, target) {
    this.routes[path] = target;
  };

  Matcher.prototype.addChild = function addChild(path, target, callback, delegate) {
    var matcher = new Matcher(target);
    this.children[path] = matcher;
    var match = generateMatch(path, matcher, delegate);

    if (delegate && delegate.contextEntered) {
      delegate.contextEntered(target, match);
    }

    callback(match);
  };

  function generateMatch(startingPath, matcher, delegate) {
    function match(path, callback) {
      var fullPath = startingPath + path;

      if (callback) {
        callback(generateMatch(fullPath, matcher, delegate));
      } else {
        return new Target(fullPath, matcher, delegate);
      }
    }

    return match;
  }

  function addRoute(routeArray, path, handler) {
    var len = 0;

    for (var i = 0; i < routeArray.length; i++) {
      len += routeArray[i].path.length;
    }

    path = path.substr(len);
    var route = {
      path: path,
      handler: handler
    };
    routeArray.push(route);
  }

  function eachRoute(baseRoute, matcher, callback, binding) {
    var routes = matcher.routes;
    var paths = Object.keys(routes);

    for (var i = 0; i < paths.length; i++) {
      var path = paths[i];
      var routeArray = baseRoute.slice();
      addRoute(routeArray, path, routes[path]);
      var nested = matcher.children[path];

      if (nested) {
        eachRoute(routeArray, nested, callback, binding);
      } else {
        callback.call(binding, routeArray);
      }
    }
  }

  var map = function (callback, addRouteCallback) {
    var matcher = new Matcher();
    callback(generateMatch("", matcher, this.delegate));
    eachRoute([], matcher, function (routes) {
      if (addRouteCallback) {
        addRouteCallback(this, routes);
      } else {
        this.add(routes);
      }
    }, this);
  }; // Normalizes percent-encoded values in `path` to upper-case and decodes percent-encoded
  // values that are not reserved (i.e., unicode characters, emoji, etc). The reserved
  // chars are "/" and "%".
  // Safe to call multiple times on the same path.
  // Normalizes percent-encoded values in `path` to upper-case and decodes percent-encoded


  function normalizePath(path) {
    return path.split("/").map(normalizeSegment).join("/");
  } // We want to ensure the characters "%" and "/" remain in percent-encoded
  // form when normalizing paths, so replace them with their encoded form after
  // decoding the rest of the path


  var SEGMENT_RESERVED_CHARS = /%|\//g;

  function normalizeSegment(segment) {
    if (segment.length < 3 || segment.indexOf("%") === -1) {
      return segment;
    }

    return decodeURIComponent(segment).replace(SEGMENT_RESERVED_CHARS, encodeURIComponent);
  } // We do not want to encode these characters when generating dynamic path segments
  // See https://tools.ietf.org/html/rfc3986#section-3.3
  // sub-delims: "!", "$", "&", "'", "(", ")", "*", "+", ",", ";", "="
  // others allowed by RFC 3986: ":", "@"
  //
  // First encode the entire path segment, then decode any of the encoded special chars.
  //
  // The chars "!", "'", "(", ")", "*" do not get changed by `encodeURIComponent`,
  // so the possible encoded chars are:
  // ['%24', '%26', '%2B', '%2C', '%3B', '%3D', '%3A', '%40'].


  var PATH_SEGMENT_ENCODINGS = /%(?:2(?:4|6|B|C)|3(?:B|D|A)|40)/g;

  function encodePathSegment(str) {
    return encodeURIComponent(str).replace(PATH_SEGMENT_ENCODINGS, decodeURIComponent);
  }

  var escapeRegex = /(\/|\.|\*|\+|\?|\||\(|\)|\[|\]|\{|\}|\\)/g;
  var isArray = Array.isArray;
  var hasOwnProperty = Object.prototype.hasOwnProperty;

  function getParam(params, key) {
    if (typeof params !== "object" || params === null) {
      throw new Error("You must pass an object as the second argument to `generate`.");
    }

    if (!hasOwnProperty.call(params, key)) {
      throw new Error("You must provide param `" + key + "` to `generate`.");
    }

    var value = params[key];
    var str = typeof value === "string" ? value : "" + value;

    if (str.length === 0) {
      throw new Error("You must provide a param `" + key + "`.");
    }

    return str;
  }

  var eachChar = [];

  eachChar[0
  /* Static */
  ] = function (segment, currentState) {
    var state = currentState;
    var value = segment.value;

    for (var i = 0; i < value.length; i++) {
      var ch = value.charCodeAt(i);
      state = state.put(ch, false, false);
    }

    return state;
  };

  eachChar[1
  /* Dynamic */
  ] = function (_, currentState) {
    return currentState.put(47
    /* SLASH */
    , true, true);
  };

  eachChar[2
  /* Star */
  ] = function (_, currentState) {
    return currentState.put(-1
    /* ANY */
    , false, true);
  };

  eachChar[4
  /* Epsilon */
  ] = function (_, currentState) {
    return currentState;
  };

  var regex = [];

  regex[0
  /* Static */
  ] = function (segment) {
    return segment.value.replace(escapeRegex, "\\$1");
  };

  regex[1
  /* Dynamic */
  ] = function () {
    return "([^/]+)";
  };

  regex[2
  /* Star */
  ] = function () {
    return "(.+)";
  };

  regex[4
  /* Epsilon */
  ] = function () {
    return "";
  };

  var generate = [];

  generate[0
  /* Static */
  ] = function (segment) {
    return segment.value;
  };

  generate[1
  /* Dynamic */
  ] = function (segment, params) {
    var value = getParam(params, segment.value);

    if (RouteRecognizer.ENCODE_AND_DECODE_PATH_SEGMENTS) {
      return encodePathSegment(value);
    } else {
      return value;
    }
  };

  generate[2
  /* Star */
  ] = function (segment, params) {
    return getParam(params, segment.value);
  };

  generate[4
  /* Epsilon */
  ] = function () {
    return "";
  };

  var EmptyObject = Object.freeze({});
  var EmptyArray = Object.freeze([]); // The `names` will be populated with the paramter name for each dynamic/star
  // segment. `shouldDecodes` will be populated with a boolean for each dyanamic/star
  // segment, indicating whether it should be decoded during recognition.

  function parse(segments, route, types) {
    // normalize route as not starting with a "/". Recognition will
    // also normalize.
    if (route.length > 0 && route.charCodeAt(0) === 47
    /* SLASH */
    ) {
        route = route.substr(1);
      }

    var parts = route.split("/");
    var names = undefined;
    var shouldDecodes = undefined;

    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      var flags = 0;
      var type = 0;

      if (part === "") {
        type = 4
        /* Epsilon */
        ;
      } else if (part.charCodeAt(0) === 58
      /* COLON */
      ) {
          type = 1
          /* Dynamic */
          ;
        } else if (part.charCodeAt(0) === 42
      /* STAR */
      ) {
          type = 2
          /* Star */
          ;
        } else {
        type = 0
        /* Static */
        ;
      }

      flags = 2 << type;

      if (flags & 12
      /* Named */
      ) {
          part = part.slice(1);
          names = names || [];
          names.push(part);
          shouldDecodes = shouldDecodes || [];
          shouldDecodes.push((flags & 4
          /* Decoded */
          ) !== 0);
        }

      if (flags & 14
      /* Counted */
      ) {
          types[type]++;
        }

      segments.push({
        type: type,
        value: normalizeSegment(part)
      });
    }

    return {
      names: names || EmptyArray,
      shouldDecodes: shouldDecodes || EmptyArray
    };
  }

  function isEqualCharSpec(spec, char, negate) {
    return spec.char === char && spec.negate === negate;
  } // A State has a character specification and (`charSpec`) and a list of possible
  // subsequent states (`nextStates`).
  //
  // If a State is an accepting state, it will also have several additional
  // properties:
  //
  // * `regex`: A regular expression that is used to extract parameters from paths
  //   that reached this accepting state.
  // * `handlers`: Information on how to convert the list of captures into calls
  //   to registered handlers with the specified parameters
  // * `types`: How many static, dynamic or star segments in this route. Used to
  //   decide which route to use if multiple registered routes match a path.
  //
  // Currently, State is implemented naively by looping over `nextStates` and
  // comparing a character specification against a character. A more efficient
  // implementation would use a hash of keys pointing at one or more next states.


  var State = function State(states, id, char, negate, repeat) {
    this.states = states;
    this.id = id;
    this.char = char;
    this.negate = negate;
    this.nextStates = repeat ? id : null;
    this.pattern = "";
    this._regex = undefined;
    this.handlers = undefined;
    this.types = undefined;
  };

  State.prototype.regex = function regex$1() {
    if (!this._regex) {
      this._regex = new RegExp(this.pattern);
    }

    return this._regex;
  };

  State.prototype.get = function get(char, negate) {
    var this$1 = this;
    var nextStates = this.nextStates;

    if (nextStates === null) {
      return;
    }

    if (isArray(nextStates)) {
      for (var i = 0; i < nextStates.length; i++) {
        var child = this$1.states[nextStates[i]];

        if (isEqualCharSpec(child, char, negate)) {
          return child;
        }
      }
    } else {
      var child$1 = this.states[nextStates];

      if (isEqualCharSpec(child$1, char, negate)) {
        return child$1;
      }
    }
  };

  State.prototype.put = function put(char, negate, repeat) {
    var state; // If the character specification already exists in a child of the current
    // state, just return that state.

    if (state = this.get(char, negate)) {
      return state;
    } // Make a new state for the character spec


    var states = this.states;
    state = new State(states, states.length, char, negate, repeat);
    states[states.length] = state; // Insert the new state as a child of the current state

    if (this.nextStates == null) {
      this.nextStates = state.id;
    } else if (isArray(this.nextStates)) {
      this.nextStates.push(state.id);
    } else {
      this.nextStates = [this.nextStates, state.id];
    } // Return the new state


    return state;
  }; // Find a list of child states matching the next character


  State.prototype.match = function match(ch) {
    var this$1 = this;
    var nextStates = this.nextStates;

    if (!nextStates) {
      return [];
    }

    var returned = [];

    if (isArray(nextStates)) {
      for (var i = 0; i < nextStates.length; i++) {
        var child = this$1.states[nextStates[i]];

        if (isMatch(child, ch)) {
          returned.push(child);
        }
      }
    } else {
      var child$1 = this.states[nextStates];

      if (isMatch(child$1, ch)) {
        returned.push(child$1);
      }
    }

    return returned;
  };

  function isMatch(spec, char) {
    return spec.negate ? spec.char !== char && spec.char !== -1
    /* ANY */
    : spec.char === char || spec.char === -1
    /* ANY */
    ;
  } // This is a somewhat naive strategy, but should work in a lot of cases
  // A better strategy would properly resolve /posts/:id/new and /posts/edit/:id.
  //
  // This strategy generally prefers more static and less dynamic matching.
  // Specifically, it
  //
  //  * prefers fewer stars to more, then
  //  * prefers using stars for less of the match to more, then
  //  * prefers fewer dynamic segments to more, then
  //  * prefers more static segments to more


  function sortSolutions(states) {
    return states.sort(function (a, b) {
      var ref = a.types || [0, 0, 0];
      var astatics = ref[0];
      var adynamics = ref[1];
      var astars = ref[2];
      var ref$1 = b.types || [0, 0, 0];
      var bstatics = ref$1[0];
      var bdynamics = ref$1[1];
      var bstars = ref$1[2];

      if (astars !== bstars) {
        return astars - bstars;
      }

      if (astars) {
        if (astatics !== bstatics) {
          return bstatics - astatics;
        }

        if (adynamics !== bdynamics) {
          return bdynamics - adynamics;
        }
      }

      if (adynamics !== bdynamics) {
        return adynamics - bdynamics;
      }

      if (astatics !== bstatics) {
        return bstatics - astatics;
      }

      return 0;
    });
  }

  function recognizeChar(states, ch) {
    var nextStates = [];

    for (var i = 0, l = states.length; i < l; i++) {
      var state = states[i];
      nextStates = nextStates.concat(state.match(ch));
    }

    return nextStates;
  }

  var RecognizeResults = function RecognizeResults(queryParams) {
    this.length = 0;
    this.queryParams = queryParams || {};
  };

  RecognizeResults.prototype.splice = Array.prototype.splice;
  RecognizeResults.prototype.slice = Array.prototype.slice;
  RecognizeResults.prototype.push = Array.prototype.push;

  function findHandler(state, originalPath, queryParams) {
    var handlers = state.handlers;
    var regex = state.regex();

    if (!regex || !handlers) {
      throw new Error("state not initialized");
    }

    var captures = originalPath.match(regex);
    var currentCapture = 1;
    var result = new RecognizeResults(queryParams);
    result.length = handlers.length;

    for (var i = 0; i < handlers.length; i++) {
      var handler = handlers[i];
      var names = handler.names;
      var shouldDecodes = handler.shouldDecodes;
      var params = EmptyObject;
      var isDynamic = false;

      if (names !== EmptyArray && shouldDecodes !== EmptyArray) {
        for (var j = 0; j < names.length; j++) {
          isDynamic = true;
          var name = names[j];
          var capture = captures && captures[currentCapture++];

          if (params === EmptyObject) {
            params = {};
          }

          if (RouteRecognizer.ENCODE_AND_DECODE_PATH_SEGMENTS && shouldDecodes[j]) {
            params[name] = capture && decodeURIComponent(capture);
          } else {
            params[name] = capture;
          }
        }
      }

      result[i] = {
        handler: handler.handler,
        params: params,
        isDynamic: isDynamic
      };
    }

    return result;
  }

  function decodeQueryParamPart(part) {
    // http://www.w3.org/TR/html401/interact/forms.html#h-17.13.4.1
    part = part.replace(/\+/gm, "%20");
    var result;

    try {
      result = decodeURIComponent(part);
    } catch (error) {
      result = "";
    }

    return result;
  }

  var RouteRecognizer = function RouteRecognizer() {
    this.names = createMap();
    var states = [];
    var state = new State(states, 0, -1
    /* ANY */
    , true, false);
    states[0] = state;
    this.states = states;
    this.rootState = state;
  };

  RouteRecognizer.prototype.add = function add(routes, options) {
    var currentState = this.rootState;
    var pattern = "^";
    var types = [0, 0, 0];
    var handlers = new Array(routes.length);
    var allSegments = [];
    var isEmpty = true;
    var j = 0;

    for (var i = 0; i < routes.length; i++) {
      var route = routes[i];
      var ref = parse(allSegments, route.path, types);
      var names = ref.names;
      var shouldDecodes = ref.shouldDecodes; // preserve j so it points to the start of newly added segments

      for (; j < allSegments.length; j++) {
        var segment = allSegments[j];

        if (segment.type === 4
        /* Epsilon */
        ) {
            continue;
          }

        isEmpty = false; // Add a "/" for the new segment

        currentState = currentState.put(47
        /* SLASH */
        , false, false);
        pattern += "/"; // Add a representation of the segment to the NFA and regex

        currentState = eachChar[segment.type](segment, currentState);
        pattern += regex[segment.type](segment);
      }

      handlers[i] = {
        handler: route.handler,
        names: names,
        shouldDecodes: shouldDecodes
      };
    }

    if (isEmpty) {
      currentState = currentState.put(47
      /* SLASH */
      , false, false);
      pattern += "/";
    }

    currentState.handlers = handlers;
    currentState.pattern = pattern + "$";
    currentState.types = types;
    var name;

    if (typeof options === "object" && options !== null && options.as) {
      name = options.as;
    }

    if (name) {
      // if (this.names[name]) {
      //   throw new Error("You may not add a duplicate route named `" + name + "`.");
      // }
      this.names[name] = {
        segments: allSegments,
        handlers: handlers
      };
    }
  };

  RouteRecognizer.prototype.handlersFor = function handlersFor(name) {
    var route = this.names[name];

    if (!route) {
      throw new Error("There is no route named " + name);
    }

    var result = new Array(route.handlers.length);

    for (var i = 0; i < route.handlers.length; i++) {
      var handler = route.handlers[i];
      result[i] = handler;
    }

    return result;
  };

  RouteRecognizer.prototype.hasRoute = function hasRoute(name) {
    return !!this.names[name];
  };

  RouteRecognizer.prototype.generate = function generate$1(name, params) {
    var route = this.names[name];
    var output = "";

    if (!route) {
      throw new Error("There is no route named " + name);
    }

    var segments = route.segments;

    for (var i = 0; i < segments.length; i++) {
      var segment = segments[i];

      if (segment.type === 4
      /* Epsilon */
      ) {
          continue;
        }

      output += "/";
      output += generate[segment.type](segment, params);
    }

    if (output.charAt(0) !== "/") {
      output = "/" + output;
    }

    if (params && params.queryParams) {
      output += this.generateQueryString(params.queryParams);
    }

    return output;
  };

  RouteRecognizer.prototype.generateQueryString = function generateQueryString(params) {
    var pairs = [];
    var keys = Object.keys(params);
    keys.sort();

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var value = params[key];

      if (value == null) {
        continue;
      }

      var pair = encodeURIComponent(key);

      if (isArray(value)) {
        for (var j = 0; j < value.length; j++) {
          var arrayPair = key + "[]" + "=" + encodeURIComponent(value[j]);
          pairs.push(arrayPair);
        }
      } else {
        pair += "=" + encodeURIComponent(value);
        pairs.push(pair);
      }
    }

    if (pairs.length === 0) {
      return "";
    }

    return "?" + pairs.join("&");
  };

  RouteRecognizer.prototype.parseQueryString = function parseQueryString(queryString) {
    var pairs = queryString.split("&");
    var queryParams = {};

    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i].split("="),
          key = decodeQueryParamPart(pair[0]),
          keyLength = key.length,
          isArray = false,
          value = void 0;

      if (pair.length === 1) {
        value = "true";
      } else {
        // Handle arrays
        if (keyLength > 2 && key.slice(keyLength - 2) === "[]") {
          isArray = true;
          key = key.slice(0, keyLength - 2);

          if (!queryParams[key]) {
            queryParams[key] = [];
          }
        }

        value = pair[1] ? decodeQueryParamPart(pair[1]) : "";
      }

      if (isArray) {
        queryParams[key].push(value);
      } else {
        queryParams[key] = value;
      }
    }

    return queryParams;
  };

  RouteRecognizer.prototype.recognize = function recognize(path) {
    var results;
    var states = [this.rootState];
    var queryParams = {};
    var isSlashDropped = false;
    var hashStart = path.indexOf("#");

    if (hashStart !== -1) {
      path = path.substr(0, hashStart);
    }

    var queryStart = path.indexOf("?");

    if (queryStart !== -1) {
      var queryString = path.substr(queryStart + 1, path.length);
      path = path.substr(0, queryStart);
      queryParams = this.parseQueryString(queryString);
    }

    if (path.charAt(0) !== "/") {
      path = "/" + path;
    }

    var originalPath = path;

    if (RouteRecognizer.ENCODE_AND_DECODE_PATH_SEGMENTS) {
      path = normalizePath(path);
    } else {
      path = decodeURI(path);
      originalPath = decodeURI(originalPath);
    }

    var pathLen = path.length;

    if (pathLen > 1 && path.charAt(pathLen - 1) === "/") {
      path = path.substr(0, pathLen - 1);
      originalPath = originalPath.substr(0, originalPath.length - 1);
      isSlashDropped = true;
    }

    for (var i = 0; i < path.length; i++) {
      states = recognizeChar(states, path.charCodeAt(i));

      if (!states.length) {
        break;
      }
    }

    var solutions = [];

    for (var i$1 = 0; i$1 < states.length; i$1++) {
      if (states[i$1].handlers) {
        solutions.push(states[i$1]);
      }
    }

    states = sortSolutions(solutions);
    var state = solutions[0];

    if (state && state.handlers) {
      // if a trailing slash was dropped and a star segment is the last segment
      // specified, put the trailing slash back
      if (isSlashDropped && state.pattern && state.pattern.slice(-5) === "(.+)$") {
        originalPath = originalPath + "/";
      }

      results = findHandler(state, originalPath, queryParams);
    }

    return results;
  };

  RouteRecognizer.VERSION = "0.3.4"; // Set to false to opt-out of encoding and decoding path segments.
  // See https://github.com/tildeio/route-recognizer/pull/55

  RouteRecognizer.ENCODE_AND_DECODE_PATH_SEGMENTS = true;
  RouteRecognizer.Normalizer = {
    normalizeSegment: normalizeSegment,
    normalizePath: normalizePath,
    encodePathSegment: encodePathSegment
  };
  RouteRecognizer.prototype.map = map;
  var _default = RouteRecognizer;
  _exports.default = _default;
});
enifed("router_js", ["exports", "rsvp", "route-recognizer"], function (_exports, _rsvp, _routeRecognizer) {
  "use strict";

  _exports.logAbort = logAbort;
  _exports.InternalRouteInfo = _exports.TransitionError = _exports.TransitionState = _exports.QUERY_PARAMS_SYMBOL = _exports.PARAMS_SYMBOL = _exports.STATE_SYMBOL = _exports.InternalTransition = _exports.default = void 0;

  const TransitionAbortedError = function () {
    TransitionAbortedError.prototype = Object.create(Error.prototype);
    TransitionAbortedError.prototype.constructor = TransitionAbortedError;

    function TransitionAbortedError(message) {
      let error = Error.call(this, message);
      this.name = 'TransitionAborted';
      this.message = message || 'TransitionAborted';

      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, TransitionAbortedError);
      } else {
        this.stack = error.stack;
      }
    }

    return TransitionAbortedError;
  }();

  const slice = Array.prototype.slice;
  const hasOwnProperty = Object.prototype.hasOwnProperty;
  /**
    Determines if an object is Promise by checking if it is "thenable".
  **/

  function isPromise(p) {
    return p !== null && typeof p === 'object' && typeof p.then === 'function';
  }

  function merge(hash, other) {
    for (let prop in other) {
      if (hasOwnProperty.call(other, prop)) {
        hash[prop] = other[prop];
      }
    }
  }
  /**
    @private
  
    Extracts query params from the end of an array
  **/


  function extractQueryParams(array) {
    let len = array && array.length,
        head,
        queryParams;

    if (len && len > 0) {
      let obj = array[len - 1];

      if (isQueryParams(obj)) {
        queryParams = obj.queryParams;
        head = slice.call(array, 0, len - 1);
        return [head, queryParams];
      }
    }

    return [array, null];
  }

  function isQueryParams(obj) {
    return obj && hasOwnProperty.call(obj, 'queryParams');
  }
  /**
    @private
  
    Coerces query param properties and array elements into strings.
  **/


  function coerceQueryParamsToString(queryParams) {
    for (let key in queryParams) {
      let val = queryParams[key];

      if (typeof val === 'number') {
        queryParams[key] = '' + val;
      } else if (Array.isArray(val)) {
        for (let i = 0, l = val.length; i < l; i++) {
          val[i] = '' + val[i];
        }
      }
    }
  }
  /**
    @private
   */


  function log(router, ...args) {
    if (!router.log) {
      return;
    }

    if (args.length === 2) {
      let [sequence, msg] = args;
      router.log('Transition #' + sequence + ': ' + msg);
    } else {
      let [msg] = args;
      router.log(msg);
    }
  }

  function isParam(object) {
    return typeof object === 'string' || object instanceof String || typeof object === 'number' || object instanceof Number;
  }

  function forEach(array, callback) {
    for (let i = 0, l = array.length; i < l && callback(array[i]) !== false; i++) {// empty intentionally
    }
  }

  function getChangelist(oldObject, newObject) {
    let key;
    let results = {
      all: {},
      changed: {},
      removed: {}
    };
    merge(results.all, newObject);
    let didChange = false;
    coerceQueryParamsToString(oldObject);
    coerceQueryParamsToString(newObject); // Calculate removals

    for (key in oldObject) {
      if (hasOwnProperty.call(oldObject, key)) {
        if (!hasOwnProperty.call(newObject, key)) {
          didChange = true;
          results.removed[key] = oldObject[key];
        }
      }
    } // Calculate changes


    for (key in newObject) {
      if (hasOwnProperty.call(newObject, key)) {
        let oldElement = oldObject[key];
        let newElement = newObject[key];

        if (isArray(oldElement) && isArray(newElement)) {
          if (oldElement.length !== newElement.length) {
            results.changed[key] = newObject[key];
            didChange = true;
          } else {
            for (let i = 0, l = oldElement.length; i < l; i++) {
              if (oldElement[i] !== newElement[i]) {
                results.changed[key] = newObject[key];
                didChange = true;
              }
            }
          }
        } else if (oldObject[key] !== newObject[key]) {
          results.changed[key] = newObject[key];
          didChange = true;
        }
      }
    }

    return didChange ? results : undefined;
  }

  function isArray(obj) {
    return Array.isArray(obj);
  }

  function promiseLabel(label) {
    return 'Router: ' + label;
  }

  const STATE_SYMBOL = "__STATE__-2619860001345920-3322w3";
  _exports.STATE_SYMBOL = STATE_SYMBOL;
  const PARAMS_SYMBOL = "__PARAMS__-261986232992830203-23323";
  _exports.PARAMS_SYMBOL = PARAMS_SYMBOL;
  const QUERY_PARAMS_SYMBOL = "__QPS__-2619863929824844-32323";
  /**
    A Transition is a thennable (a promise-like object) that represents
    an attempt to transition to another route. It can be aborted, either
    explicitly via `abort` or by attempting another transition while a
    previous one is still underway. An aborted transition can also
    be `retry()`d later.
  
    @class Transition
    @constructor
    @param {Object} router
    @param {Object} intent
    @param {Object} state
    @param {Object} error
    @private
   */

  _exports.QUERY_PARAMS_SYMBOL = QUERY_PARAMS_SYMBOL;

  class Transition {
    constructor(router, intent, state, error = undefined, previousTransition = undefined) {
      this.from = null;
      this.to = undefined;
      this.isAborted = false;
      this.isActive = true;
      this.urlMethod = 'update';
      this.resolveIndex = 0;
      this.queryParamsOnly = false;
      this.isTransition = true;
      this.isCausedByAbortingTransition = false;
      this.isCausedByInitialTransition = false;
      this.isCausedByAbortingReplaceTransition = false;
      this._visibleQueryParams = {};
      this[STATE_SYMBOL] = state || router.state;
      this.intent = intent;
      this.router = router;
      this.data = intent && intent.data || {};
      this.resolvedModels = {};
      this[QUERY_PARAMS_SYMBOL] = {};
      this.promise = undefined;
      this.error = undefined;
      this[PARAMS_SYMBOL] = {};
      this.routeInfos = [];
      this.targetName = undefined;
      this.pivotHandler = undefined;
      this.sequence = -1;

      if (error) {
        this.promise = _rsvp.Promise.reject(error);
        this.error = error;
        return;
      } // if you're doing multiple redirects, need the new transition to know if it
      // is actually part of the first transition or not. Any further redirects
      // in the initial transition also need to know if they are part of the
      // initial transition


      this.isCausedByAbortingTransition = !!previousTransition;
      this.isCausedByInitialTransition = !!previousTransition && (previousTransition.isCausedByInitialTransition || previousTransition.sequence === 0); // Every transition in the chain is a replace

      this.isCausedByAbortingReplaceTransition = !!previousTransition && previousTransition.urlMethod === 'replace' && (!previousTransition.isCausedByAbortingTransition || previousTransition.isCausedByAbortingReplaceTransition);

      if (state) {
        this[PARAMS_SYMBOL] = state.params;
        this[QUERY_PARAMS_SYMBOL] = state.queryParams;
        this.routeInfos = state.routeInfos;
        let len = state.routeInfos.length;

        if (len) {
          this.targetName = state.routeInfos[len - 1].name;
        }

        for (let i = 0; i < len; ++i) {
          let handlerInfo = state.routeInfos[i]; // TODO: this all seems hacky

          if (!handlerInfo.isResolved) {
            break;
          }

          this.pivotHandler = handlerInfo.route;
        }

        this.sequence = router.currentSequence++;
        this.promise = state.resolve(() => {
          if (this.isAborted) {
            return _rsvp.Promise.reject(false, promiseLabel('Transition aborted - reject'));
          }

          return _rsvp.Promise.resolve(true);
        }, this).catch(result => {
          return _rsvp.Promise.reject(this.router.transitionDidError(result, this));
        }, promiseLabel('Handle Abort'));
      } else {
        this.promise = _rsvp.Promise.resolve(this[STATE_SYMBOL]);
        this[PARAMS_SYMBOL] = {};
      }
    }
    /**
      The Transition's internal promise. Calling `.then` on this property
      is that same as calling `.then` on the Transition object itself, but
      this property is exposed for when you want to pass around a
      Transition's promise, but not the Transition object itself, since
      Transition object can be externally `abort`ed, while the promise
      cannot.
         @property promise
      @type {Object}
      @public
     */

    /**
      Custom state can be stored on a Transition's `data` object.
      This can be useful for decorating a Transition within an earlier
      hook and shared with a later hook. Properties set on `data` will
      be copied to new transitions generated by calling `retry` on this
      transition.
         @property data
      @type {Object}
      @public
     */

    /**
      A standard promise hook that resolves if the transition
      succeeds and rejects if it fails/redirects/aborts.
         Forwards to the internal `promise` property which you can
      use in situations where you want to pass around a thennable,
      but not the Transition itself.
         @method then
      @param {Function} onFulfilled
      @param {Function} onRejected
      @param {String} label optional string for labeling the promise.
      Useful for tooling.
      @return {Promise}
      @public
     */


    then(onFulfilled, onRejected, label) {
      return this.promise.then(onFulfilled, onRejected, label);
    }
    /**
         Forwards to the internal `promise` property which you can
      use in situations where you want to pass around a thennable,
      but not the Transition itself.
         @method catch
      @param {Function} onRejection
      @param {String} label optional string for labeling the promise.
      Useful for tooling.
      @return {Promise}
      @public
     */


    catch(onRejection, label) {
      return this.promise.catch(onRejection, label);
    }
    /**
         Forwards to the internal `promise` property which you can
      use in situations where you want to pass around a thennable,
      but not the Transition itself.
         @method finally
      @param {Function} callback
      @param {String} label optional string for labeling the promise.
      Useful for tooling.
      @return {Promise}
      @public
     */


    finally(callback, label) {
      return this.promise.finally(callback, label);
    }
    /**
      Aborts the Transition. Note you can also implicitly abort a transition
      by initiating another transition while a previous one is underway.
         @method abort
      @return {Transition} this transition
      @public
     */


    abort() {
      this.rollback();
      let transition = new Transition(this.router, undefined, undefined, undefined);
      transition.to = this.from;
      transition.from = this.from;
      transition.isAborted = true;
      this.router.routeWillChange(transition);
      this.router.routeDidChange(transition);
      return this;
    }

    rollback() {
      if (!this.isAborted) {
        log(this.router, this.sequence, this.targetName + ': transition was aborted');

        if (this.intent !== undefined && this.intent !== null) {
          this.intent.preTransitionState = this.router.state;
        }

        this.isAborted = true;
        this.isActive = false;
        this.router.activeTransition = undefined;
      }
    }

    redirect(newTransition) {
      this.rollback();
      this.router.routeWillChange(newTransition);
    }
    /**
         Retries a previously-aborted transition (making sure to abort the
      transition if it's still active). Returns a new transition that
      represents the new attempt to transition.
         @method retry
      @return {Transition} new transition
      @public
     */


    retry() {
      // TODO: add tests for merged state retry()s
      this.abort();
      let newTransition = this.router.transitionByIntent(this.intent, false); // inheriting a `null` urlMethod is not valid
      // the urlMethod is only set to `null` when
      // the transition is initiated *after* the url
      // has been updated (i.e. `router.handleURL`)
      //
      // in that scenario, the url method cannot be
      // inherited for a new transition because then
      // the url would not update even though it should

      if (this.urlMethod !== null) {
        newTransition.method(this.urlMethod);
      }

      return newTransition;
    }
    /**
         Sets the URL-changing method to be employed at the end of a
      successful transition. By default, a new Transition will just
      use `updateURL`, but passing 'replace' to this method will
      cause the URL to update using 'replaceWith' instead. Omitting
      a parameter will disable the URL change, allowing for transitions
      that don't update the URL at completion (this is also used for
      handleURL, since the URL has already changed before the
      transition took place).
         @method method
      @param {String} method the type of URL-changing method to use
        at the end of a transition. Accepted values are 'replace',
        falsy values, or any other non-falsy value (which is
        interpreted as an updateURL transition).
         @return {Transition} this transition
      @public
     */


    method(method) {
      this.urlMethod = method;
      return this;
    } // Alias 'trigger' as 'send'


    send(ignoreFailure = false, _name, err, transition, handler) {
      this.trigger(ignoreFailure, _name, err, transition, handler);
    }
    /**
         Fires an event on the current list of resolved/resolving
      handlers within this transition. Useful for firing events
      on route hierarchies that haven't fully been entered yet.
         Note: This method is also aliased as `send`
         @method trigger
      @param {Boolean} [ignoreFailure=false] a boolean specifying whether unhandled events throw an error
      @param {String} name the name of the event to fire
      @public
     */


    trigger(ignoreFailure = false, name, ...args) {
      // TODO: Deprecate the current signature
      if (typeof ignoreFailure === 'string') {
        name = ignoreFailure;
        ignoreFailure = false;
      }

      this.router.triggerEvent(this[STATE_SYMBOL].routeInfos.slice(0, this.resolveIndex + 1), ignoreFailure, name, args);
    }
    /**
      Transitions are aborted and their promises rejected
      when redirects occur; this method returns a promise
      that will follow any redirects that occur and fulfill
      with the value fulfilled by any redirecting transitions
      that occur.
         @method followRedirects
      @return {Promise} a promise that fulfills with the same
        value that the final redirecting transition fulfills with
      @public
     */


    followRedirects() {
      let router = this.router;
      return this.promise.catch(function (reason) {
        if (router.activeTransition) {
          return router.activeTransition.followRedirects();
        }

        return _rsvp.Promise.reject(reason);
      });
    }

    toString() {
      return 'Transition (sequence ' + this.sequence + ')';
    }
    /**
      @private
     */


    log(message) {
      log(this.router, this.sequence, message);
    }

  }
  /**
    @private
  
    Logs and returns an instance of TransitionAborted.
   */


  _exports.InternalTransition = Transition;

  function logAbort(transition) {
    log(transition.router, transition.sequence, 'detected abort.');
    return new TransitionAbortedError();
  }

  function isTransition(obj) {
    return typeof obj === 'object' && obj instanceof Transition && obj.isTransition;
  }

  function prepareResult(obj) {
    if (isTransition(obj)) {
      return null;
    }

    return obj;
  }

  let ROUTE_INFOS = new WeakMap();

  function toReadOnlyRouteInfo(routeInfos, queryParams = {}, includeAttributes = false) {
    return routeInfos.map((info, i) => {
      let {
        name,
        params,
        paramNames,
        context,
        route
      } = info;

      if (ROUTE_INFOS.has(info) && includeAttributes) {
        let routeInfo = ROUTE_INFOS.get(info);
        routeInfo = attachMetadata(route, routeInfo);
        let routeInfoWithAttribute = createRouteInfoWithAttributes(routeInfo, context);
        ROUTE_INFOS.set(info, routeInfoWithAttribute);
        return routeInfoWithAttribute;
      }

      let routeInfo = {
        find(predicate, thisArg) {
          let publicInfo;
          let arr = [];

          if (predicate.length === 3) {
            arr = routeInfos.map(info => ROUTE_INFOS.get(info));
          }

          for (let i = 0; routeInfos.length > i; i++) {
            publicInfo = ROUTE_INFOS.get(routeInfos[i]);

            if (predicate.call(thisArg, publicInfo, i, arr)) {
              return publicInfo;
            }
          }

          return undefined;
        },

        get name() {
          return name;
        },

        get paramNames() {
          return paramNames;
        },

        get metadata() {
          return buildRouteInfoMetadata(info.route);
        },

        get parent() {
          let parent = routeInfos[i - 1];

          if (parent === undefined) {
            return null;
          }

          return ROUTE_INFOS.get(parent);
        },

        get child() {
          let child = routeInfos[i + 1];

          if (child === undefined) {
            return null;
          }

          return ROUTE_INFOS.get(child);
        },

        get localName() {
          let parts = this.name.split('.');
          return parts[parts.length - 1];
        },

        get params() {
          return params;
        },

        get queryParams() {
          return queryParams;
        }

      };

      if (includeAttributes) {
        routeInfo = createRouteInfoWithAttributes(routeInfo, context);
      }

      ROUTE_INFOS.set(info, routeInfo);
      return routeInfo;
    });
  }

  function createRouteInfoWithAttributes(routeInfo, context) {
    let attributes = {
      get attributes() {
        return context;
      }

    };

    if (Object.isFrozen(routeInfo) || routeInfo.hasOwnProperty('attributes')) {
      return Object.freeze(Object.assign({}, routeInfo, attributes));
    }

    return Object.assign(routeInfo, attributes);
  }

  function buildRouteInfoMetadata(route) {
    if (route !== undefined && route !== null && route.buildRouteInfoMetadata !== undefined) {
      return route.buildRouteInfoMetadata();
    }

    return null;
  }

  function attachMetadata(route, routeInfo) {
    let metadata = {
      get metadata() {
        return buildRouteInfoMetadata(route);
      }

    };

    if (Object.isFrozen(routeInfo) || routeInfo.hasOwnProperty('metadata')) {
      return Object.freeze(Object.assign({}, routeInfo, metadata));
    }

    return Object.assign(routeInfo, metadata);
  }

  class InternalRouteInfo {
    constructor(router, name, paramNames, route) {
      this._routePromise = undefined;
      this._route = null;
      this.params = {};
      this.isResolved = false;
      this.name = name;
      this.paramNames = paramNames;
      this.router = router;

      if (route) {
        this._processRoute(route);
      }
    }

    getModel(_transition) {
      return _rsvp.Promise.resolve(this.context);
    }

    serialize(_context) {
      return this.params || {};
    }

    resolve(shouldContinue, transition) {
      return _rsvp.Promise.resolve(this.routePromise).then(route => this.checkForAbort(shouldContinue, route)).then(() => this.runBeforeModelHook(transition)).then(() => this.checkForAbort(shouldContinue, null)).then(() => this.getModel(transition)).then(resolvedModel => this.checkForAbort(shouldContinue, resolvedModel)).then(resolvedModel => this.runAfterModelHook(transition, resolvedModel)).then(resolvedModel => this.becomeResolved(transition, resolvedModel));
    }

    becomeResolved(transition, resolvedContext) {
      let params = this.serialize(resolvedContext);

      if (transition) {
        this.stashResolvedModel(transition, resolvedContext);
        transition[PARAMS_SYMBOL] = transition[PARAMS_SYMBOL] || {};
        transition[PARAMS_SYMBOL][this.name] = params;
      }

      let context;
      let contextsMatch = resolvedContext === this.context;

      if ('context' in this || !contextsMatch) {
        context = resolvedContext;
      }

      let cached = ROUTE_INFOS.get(this);
      let resolved = new ResolvedRouteInfo(this.router, this.name, this.paramNames, params, this.route, context);

      if (cached !== undefined) {
        ROUTE_INFOS.set(resolved, cached);
      }

      return resolved;
    }

    shouldSupercede(routeInfo) {
      // Prefer this newer routeInfo over `other` if:
      // 1) The other one doesn't exist
      // 2) The names don't match
      // 3) This route has a context that doesn't match
      //    the other one (or the other one doesn't have one).
      // 4) This route has parameters that don't match the other.
      if (!routeInfo) {
        return true;
      }

      let contextsMatch = routeInfo.context === this.context;
      return routeInfo.name !== this.name || 'context' in this && !contextsMatch || this.hasOwnProperty('params') && !paramsMatch(this.params, routeInfo.params);
    }

    get route() {
      // _route could be set to either a route object or undefined, so we
      // compare against null to know when it's been set
      if (this._route !== null) {
        return this._route;
      }

      return this.fetchRoute();
    }

    set route(route) {
      this._route = route;
    }

    get routePromise() {
      if (this._routePromise) {
        return this._routePromise;
      }

      this.fetchRoute();
      return this._routePromise;
    }

    set routePromise(routePromise) {
      this._routePromise = routePromise;
    }

    log(transition, message) {
      if (transition.log) {
        transition.log(this.name + ': ' + message);
      }
    }

    updateRoute(route) {
      route._internalName = this.name;
      return this.route = route;
    }

    runBeforeModelHook(transition) {
      if (transition.trigger) {
        transition.trigger(true, 'willResolveModel', transition, this.route);
      }

      let result;

      if (this.route) {
        if (this.route.beforeModel !== undefined) {
          result = this.route.beforeModel(transition);
        }
      }

      if (isTransition(result)) {
        result = null;
      }

      return _rsvp.Promise.resolve(result);
    }

    runAfterModelHook(transition, resolvedModel) {
      // Stash the resolved model on the payload.
      // This makes it possible for users to swap out
      // the resolved model in afterModel.
      let name = this.name;
      this.stashResolvedModel(transition, resolvedModel);
      let result;

      if (this.route !== undefined) {
        if (this.route.afterModel !== undefined) {
          result = this.route.afterModel(resolvedModel, transition);
        }
      }

      result = prepareResult(result);
      return _rsvp.Promise.resolve(result).then(() => {
        // Ignore the fulfilled value returned from afterModel.
        // Return the value stashed in resolvedModels, which
        // might have been swapped out in afterModel.
        return transition.resolvedModels[name];
      });
    }

    checkForAbort(shouldContinue, value) {
      return _rsvp.Promise.resolve(shouldContinue()).then(function () {
        // We don't care about shouldContinue's resolve value;
        // pass along the original value passed to this fn.
        return value;
      }, null);
    }

    stashResolvedModel(transition, resolvedModel) {
      transition.resolvedModels = transition.resolvedModels || {};
      transition.resolvedModels[this.name] = resolvedModel;
    }

    fetchRoute() {
      let route = this.router.getRoute(this.name);
      return this._processRoute(route);
    }

    _processRoute(route) {
      // Setup a routePromise so that we can wait for asynchronously loaded routes
      this.routePromise = _rsvp.Promise.resolve(route); // Wait until the 'route' property has been updated when chaining to a route
      // that is a promise

      if (isPromise(route)) {
        this.routePromise = this.routePromise.then(r => {
          return this.updateRoute(r);
        }); // set to undefined to avoid recursive loop in the route getter

        return this.route = undefined;
      } else if (route) {
        return this.updateRoute(route);
      }

      return undefined;
    }

  }

  _exports.InternalRouteInfo = InternalRouteInfo;

  class ResolvedRouteInfo extends InternalRouteInfo {
    constructor(router, name, paramNames, params, route, context) {
      super(router, name, paramNames, route);
      this.params = params;
      this.isResolved = true;
      this.context = context;
    }

    resolve(_shouldContinue, transition) {
      // A ResolvedRouteInfo just resolved with itself.
      if (transition && transition.resolvedModels) {
        transition.resolvedModels[this.name] = this.context;
      }

      return _rsvp.Promise.resolve(this);
    }

  }

  class UnresolvedRouteInfoByParam extends InternalRouteInfo {
    constructor(router, name, paramNames, params, route) {
      super(router, name, paramNames, route);
      this.params = {};
      this.params = params;
    }

    getModel(transition) {
      let fullParams = this.params;

      if (transition && transition[QUERY_PARAMS_SYMBOL]) {
        fullParams = {};
        merge(fullParams, this.params);
        fullParams.queryParams = transition[QUERY_PARAMS_SYMBOL];
      }

      let route = this.route;
      let result = undefined;

      if (route.deserialize) {
        result = route.deserialize(fullParams, transition);
      } else if (route.model) {
        result = route.model(fullParams, transition);
      }

      if (result && isTransition(result)) {
        result = undefined;
      }

      return _rsvp.Promise.resolve(result);
    }

  }

  class UnresolvedRouteInfoByObject extends InternalRouteInfo {
    constructor(router, name, paramNames, context) {
      super(router, name, paramNames);
      this.context = context;
      this.serializer = this.router.getSerializer(name);
    }

    getModel(transition) {
      if (this.router.log !== undefined) {
        this.router.log(this.name + ': resolving provided model');
      }

      return super.getModel(transition);
    }
    /**
      @private
         Serializes a route using its custom `serialize` method or
      by a default that looks up the expected property name from
      the dynamic segment.
         @param {Object} model the model to be serialized for this route
    */


    serialize(model) {
      let {
        paramNames,
        context
      } = this;

      if (!model) {
        model = context;
      }

      let object = {};

      if (isParam(model)) {
        object[paramNames[0]] = model;
        return object;
      } // Use custom serialize if it exists.


      if (this.serializer) {
        // invoke this.serializer unbound (getSerializer returns a stateless function)
        return this.serializer.call(null, model, paramNames);
      } else if (this.route !== undefined) {
        if (this.route.serialize) {
          return this.route.serialize(model, paramNames);
        }
      }

      if (paramNames.length !== 1) {
        return;
      }

      let name = paramNames[0];

      if (/_id$/.test(name)) {
        object[name] = model.id;
      } else {
        object[name] = model;
      }

      return object;
    }

  }

  function paramsMatch(a, b) {
    if (!a !== !b) {
      // Only one is null.
      return false;
    }

    if (!a) {
      // Both must be null.
      return true;
    } // Note: this assumes that both params have the same
    // number of keys, but since we're comparing the
    // same routes, they should.


    for (let k in a) {
      if (a.hasOwnProperty(k) && a[k] !== b[k]) {
        return false;
      }
    }

    return true;
  }

  class TransitionIntent {
    constructor(router, data = {}) {
      this.router = router;
      this.data = data;
    }

  }

  class TransitionState {
    constructor() {
      this.routeInfos = [];
      this.queryParams = {};
      this.params = {};
    }

    promiseLabel(label) {
      let targetName = '';
      forEach(this.routeInfos, function (routeInfo) {
        if (targetName !== '') {
          targetName += '.';
        }

        targetName += routeInfo.name;
        return true;
      });
      return promiseLabel("'" + targetName + "': " + label);
    }

    resolve(shouldContinue, transition) {
      // First, calculate params for this state. This is useful
      // information to provide to the various route hooks.
      let params = this.params;
      forEach(this.routeInfos, routeInfo => {
        params[routeInfo.name] = routeInfo.params || {};
        return true;
      });
      transition.resolveIndex = 0;
      let currentState = this;
      let wasAborted = false; // The prelude RSVP.resolve() asyncs us into the promise land.

      return _rsvp.Promise.resolve(null, this.promiseLabel('Start transition')).then(resolveOneRouteInfo, null, this.promiseLabel('Resolve route')).catch(handleError, this.promiseLabel('Handle error'));

      function innerShouldContinue() {
        return _rsvp.Promise.resolve(shouldContinue(), currentState.promiseLabel('Check if should continue')).catch(function (reason) {
          // We distinguish between errors that occurred
          // during resolution (e.g. before"Model/model/afterModel),
          // and aborts due to a rejecting promise from shouldContinue().
          wasAborted = true;
          return _rsvp.Promise.reject(reason);
        }, currentState.promiseLabel('Handle abort'));
      }

      function handleError(error) {
        // This is the only possible
        // reject value of TransitionState#resolve
        let routeInfos = currentState.routeInfos;
        let errorHandlerIndex = transition.resolveIndex >= routeInfos.length ? routeInfos.length - 1 : transition.resolveIndex;
        return _rsvp.Promise.reject(new TransitionError(error, currentState.routeInfos[errorHandlerIndex].route, wasAborted, currentState));
      }

      function proceed(resolvedRouteInfo) {
        let wasAlreadyResolved = currentState.routeInfos[transition.resolveIndex].isResolved; // Swap the previously unresolved routeInfo with
        // the resolved routeInfo

        currentState.routeInfos[transition.resolveIndex++] = resolvedRouteInfo;

        if (!wasAlreadyResolved) {
          // Call the redirect hook. The reason we call it here
          // vs. afterModel is so that redirects into child
          // routes don't re-run the model hooks for this
          // already-resolved route.
          let {
            route
          } = resolvedRouteInfo;

          if (route !== undefined) {
            if (route.redirect) {
              route.redirect(resolvedRouteInfo.context, transition);
            }
          }
        } // Proceed after ensuring that the redirect hook
        // didn't abort this transition by transitioning elsewhere.


        return innerShouldContinue().then(resolveOneRouteInfo, null, currentState.promiseLabel('Resolve route'));
      }

      function resolveOneRouteInfo() {
        if (transition.resolveIndex === currentState.routeInfos.length) {
          // This is is the only possible
          // fulfill value of TransitionState#resolve
          return currentState;
        }

        let routeInfo = currentState.routeInfos[transition.resolveIndex];
        return routeInfo.resolve(innerShouldContinue, transition).then(proceed, null, currentState.promiseLabel('Proceed'));
      }
    }

  }

  _exports.TransitionState = TransitionState;

  class TransitionError {
    constructor(error, route, wasAborted, state) {
      this.error = error;
      this.route = route;
      this.wasAborted = wasAborted;
      this.state = state;
    }

  }

  _exports.TransitionError = TransitionError;

  class NamedTransitionIntent extends TransitionIntent {
    constructor(router, name, pivotHandler, contexts = [], queryParams = {}, data) {
      super(router, data);
      this.preTransitionState = undefined;
      this.name = name;
      this.pivotHandler = pivotHandler;
      this.contexts = contexts;
      this.queryParams = queryParams;
    }

    applyToState(oldState, isIntermediate) {
      // TODO: WTF fix me
      let partitionedArgs = extractQueryParams([this.name].concat(this.contexts)),
          pureArgs = partitionedArgs[0],
          handlers = this.router.recognizer.handlersFor(pureArgs[0]);
      let targetRouteName = handlers[handlers.length - 1].handler;
      return this.applyToHandlers(oldState, handlers, targetRouteName, isIntermediate, false);
    }

    applyToHandlers(oldState, parsedHandlers, targetRouteName, isIntermediate, checkingIfActive) {
      let i, len;
      let newState = new TransitionState();
      let objects = this.contexts.slice(0);
      let invalidateIndex = parsedHandlers.length; // Pivot handlers are provided for refresh transitions

      if (this.pivotHandler) {
        for (i = 0, len = parsedHandlers.length; i < len; ++i) {
          if (parsedHandlers[i].handler === this.pivotHandler._internalName) {
            invalidateIndex = i;
            break;
          }
        }
      }

      for (i = parsedHandlers.length - 1; i >= 0; --i) {
        let result = parsedHandlers[i];
        let name = result.handler;
        let oldHandlerInfo = oldState.routeInfos[i];
        let newHandlerInfo = null;

        if (result.names.length > 0) {
          if (i >= invalidateIndex) {
            newHandlerInfo = this.createParamHandlerInfo(name, result.names, objects, oldHandlerInfo);
          } else {
            newHandlerInfo = this.getHandlerInfoForDynamicSegment(name, result.names, objects, oldHandlerInfo, targetRouteName, i);
          }
        } else {
          // This route has no dynamic segment.
          // Therefore treat as a param-based handlerInfo
          // with empty params. This will cause the `model`
          // hook to be called with empty params, which is desirable.
          newHandlerInfo = this.createParamHandlerInfo(name, result.names, objects, oldHandlerInfo);
        }

        if (checkingIfActive) {
          // If we're performing an isActive check, we want to
          // serialize URL params with the provided context, but
          // ignore mismatches between old and new context.
          newHandlerInfo = newHandlerInfo.becomeResolved(null, newHandlerInfo.context);
          let oldContext = oldHandlerInfo && oldHandlerInfo.context;

          if (result.names.length > 0 && oldHandlerInfo.context !== undefined && newHandlerInfo.context === oldContext) {
            // If contexts match in isActive test, assume params also match.
            // This allows for flexibility in not requiring that every last
            // handler provide a `serialize` method
            newHandlerInfo.params = oldHandlerInfo && oldHandlerInfo.params;
          }

          newHandlerInfo.context = oldContext;
        }

        let handlerToUse = oldHandlerInfo;

        if (i >= invalidateIndex || newHandlerInfo.shouldSupercede(oldHandlerInfo)) {
          invalidateIndex = Math.min(i, invalidateIndex);
          handlerToUse = newHandlerInfo;
        }

        if (isIntermediate && !checkingIfActive) {
          handlerToUse = handlerToUse.becomeResolved(null, handlerToUse.context);
        }

        newState.routeInfos.unshift(handlerToUse);
      }

      if (objects.length > 0) {
        throw new Error('More context objects were passed than there are dynamic segments for the route: ' + targetRouteName);
      }

      if (!isIntermediate) {
        this.invalidateChildren(newState.routeInfos, invalidateIndex);
      }

      merge(newState.queryParams, this.queryParams || {});
      return newState;
    }

    invalidateChildren(handlerInfos, invalidateIndex) {
      for (let i = invalidateIndex, l = handlerInfos.length; i < l; ++i) {
        let handlerInfo = handlerInfos[i];

        if (handlerInfo.isResolved) {
          let {
            name,
            params,
            route,
            paramNames
          } = handlerInfos[i];
          handlerInfos[i] = new UnresolvedRouteInfoByParam(this.router, name, paramNames, params, route);
        }
      }
    }

    getHandlerInfoForDynamicSegment(name, names, objects, oldHandlerInfo, _targetRouteName, i) {
      let objectToUse;

      if (objects.length > 0) {
        // Use the objects provided for this transition.
        objectToUse = objects[objects.length - 1];

        if (isParam(objectToUse)) {
          return this.createParamHandlerInfo(name, names, objects, oldHandlerInfo);
        } else {
          objects.pop();
        }
      } else if (oldHandlerInfo && oldHandlerInfo.name === name) {
        // Reuse the matching oldHandlerInfo
        return oldHandlerInfo;
      } else {
        if (this.preTransitionState) {
          let preTransitionHandlerInfo = this.preTransitionState.routeInfos[i];
          objectToUse = preTransitionHandlerInfo && preTransitionHandlerInfo.context;
        } else {
          // Ideally we should throw this error to provide maximal
          // information to the user that not enough context objects
          // were provided, but this proves too cumbersome in Ember
          // in cases where inner template helpers are evaluated
          // before parent helpers un-render, in which cases this
          // error somewhat prematurely fires.
          //throw new Error("Not enough context objects were provided to complete a transition to " + targetRouteName + ". Specifically, the " + name + " route needs an object that can be serialized into its dynamic URL segments [" + names.join(', ') + "]");
          return oldHandlerInfo;
        }
      }

      return new UnresolvedRouteInfoByObject(this.router, name, names, objectToUse);
    }

    createParamHandlerInfo(name, names, objects, oldHandlerInfo) {
      let params = {}; // Soak up all the provided string/numbers

      let numNames = names.length;
      let missingParams = [];

      while (numNames--) {
        // Only use old params if the names match with the new handler
        let oldParams = oldHandlerInfo && name === oldHandlerInfo.name && oldHandlerInfo.params || {};
        let peek = objects[objects.length - 1];
        let paramName = names[numNames];

        if (isParam(peek)) {
          params[paramName] = '' + objects.pop();
        } else {
          // If we're here, this means only some of the params
          // were string/number params, so try and use a param
          // value from a previous handler.
          if (oldParams.hasOwnProperty(paramName)) {
            params[paramName] = oldParams[paramName];
          } else {
            missingParams.push(paramName);
          }
        }
      }

      if (missingParams.length > 0) {
        throw new Error("You didn't provide enough string/numeric parameters to satisfy all of the dynamic segments for route " + name + "." + (" Missing params: " + missingParams));
      }

      return new UnresolvedRouteInfoByParam(this.router, name, names, params);
    }

  }

  const UnrecognizedURLError = function () {
    UnrecognizedURLError.prototype = Object.create(Error.prototype);
    UnrecognizedURLError.prototype.constructor = UnrecognizedURLError;

    function UnrecognizedURLError(message) {
      let error = Error.call(this, message);
      this.name = 'UnrecognizedURLError';
      this.message = message || 'UnrecognizedURL';

      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, UnrecognizedURLError);
      } else {
        this.stack = error.stack;
      }
    }

    return UnrecognizedURLError;
  }();

  class URLTransitionIntent extends TransitionIntent {
    constructor(router, url, data) {
      super(router, data);
      this.url = url;
      this.preTransitionState = undefined;
    }

    applyToState(oldState) {
      let newState = new TransitionState();
      let results = this.router.recognizer.recognize(this.url),
          i,
          len;

      if (!results) {
        throw new UnrecognizedURLError(this.url);
      }

      let statesDiffer = false;
      let _url = this.url; // Checks if a handler is accessible by URL. If it is not, an error is thrown.
      // For the case where the handler is loaded asynchronously, the error will be
      // thrown once it is loaded.

      function checkHandlerAccessibility(handler) {
        if (handler && handler.inaccessibleByURL) {
          throw new UnrecognizedURLError(_url);
        }

        return handler;
      }

      for (i = 0, len = results.length; i < len; ++i) {
        let result = results[i];
        let name = result.handler;
        let paramNames = [];

        if (this.router.recognizer.hasRoute(name)) {
          paramNames = this.router.recognizer.handlersFor(name)[i].names;
        }

        let newRouteInfo = new UnresolvedRouteInfoByParam(this.router, name, paramNames, result.params);
        let route = newRouteInfo.route;

        if (route) {
          checkHandlerAccessibility(route);
        } else {
          // If the hanlder is being loaded asynchronously, check if we can
          // access it after it has resolved
          newRouteInfo.routePromise = newRouteInfo.routePromise.then(checkHandlerAccessibility);
        }

        let oldRouteInfo = oldState.routeInfos[i];

        if (statesDiffer || newRouteInfo.shouldSupercede(oldRouteInfo)) {
          statesDiffer = true;
          newState.routeInfos[i] = newRouteInfo;
        } else {
          newState.routeInfos[i] = oldRouteInfo;
        }
      }

      merge(newState.queryParams, results.queryParams);
      return newState;
    }

  }

  class Router {
    constructor(logger) {
      this._lastQueryParams = {};
      this.state = undefined;
      this.oldState = undefined;
      this.activeTransition = undefined;
      this.currentRouteInfos = undefined;
      this._changedQueryParams = undefined;
      this.currentSequence = 0;
      this.log = logger;
      this.recognizer = new _routeRecognizer.default();
      this.reset();
    }
    /**
      The main entry point into the router. The API is essentially
      the same as the `map` method in `route-recognizer`.
         This method extracts the String handler at the last `.to()`
      call and uses it as the name of the whole route.
         @param {Function} callback
    */


    map(callback) {
      this.recognizer.map(callback, function (recognizer, routes) {
        for (let i = routes.length - 1, proceed = true; i >= 0 && proceed; --i) {
          let route = routes[i];
          let handler = route.handler;
          recognizer.add(routes, {
            as: handler
          });
          proceed = route.path === '/' || route.path === '' || handler.slice(-6) === '.index';
        }
      });
    }

    hasRoute(route) {
      return this.recognizer.hasRoute(route);
    }

    queryParamsTransition(changelist, wasTransitioning, oldState, newState) {
      this.fireQueryParamDidChange(newState, changelist);

      if (!wasTransitioning && this.activeTransition) {
        // One of the routes in queryParamsDidChange
        // caused a transition. Just return that transition.
        return this.activeTransition;
      } else {
        // Running queryParamsDidChange didn't change anything.
        // Just update query params and be on our way.
        // We have to return a noop transition that will
        // perform a URL update at the end. This gives
        // the user the ability to set the url update
        // method (default is replaceState).
        let newTransition = new Transition(this, undefined, undefined);
        newTransition.queryParamsOnly = true;
        oldState.queryParams = this.finalizeQueryParamChange(newState.routeInfos, newState.queryParams, newTransition);
        newTransition[QUERY_PARAMS_SYMBOL] = newState.queryParams;
        this.toReadOnlyInfos(newTransition, newState);
        this.routeWillChange(newTransition);
        newTransition.promise = newTransition.promise.then(result => {
          this._updateURL(newTransition, oldState);

          this.didTransition(this.currentRouteInfos);
          this.toInfos(newTransition, newState.routeInfos, true);
          this.routeDidChange(newTransition);
          return result;
        }, null, promiseLabel('Transition complete'));
        return newTransition;
      }
    }

    transitionByIntent(intent, isIntermediate) {
      try {
        return this.getTransitionByIntent(intent, isIntermediate);
      } catch (e) {
        return new Transition(this, intent, undefined, e, undefined);
      }
    }

    recognize(url) {
      let intent = new URLTransitionIntent(this, url);
      let newState = this.generateNewState(intent);

      if (newState === null) {
        return newState;
      }

      let readonlyInfos = toReadOnlyRouteInfo(newState.routeInfos, newState.queryParams);
      return readonlyInfos[readonlyInfos.length - 1];
    }

    recognizeAndLoad(url) {
      let intent = new URLTransitionIntent(this, url);
      let newState = this.generateNewState(intent);

      if (newState === null) {
        return _rsvp.Promise.reject("URL " + url + " was not recognized");
      }

      let newTransition = new Transition(this, intent, newState, undefined);
      return newTransition.then(() => {
        let routeInfosWithAttributes = toReadOnlyRouteInfo(newState.routeInfos, newTransition[QUERY_PARAMS_SYMBOL], true);
        return routeInfosWithAttributes[routeInfosWithAttributes.length - 1];
      });
    }

    generateNewState(intent) {
      try {
        return intent.applyToState(this.state, false);
      } catch (e) {
        return null;
      }
    }

    getTransitionByIntent(intent, isIntermediate) {
      let wasTransitioning = !!this.activeTransition;
      let oldState = wasTransitioning ? this.activeTransition[STATE_SYMBOL] : this.state;
      let newTransition;
      let newState = intent.applyToState(oldState, isIntermediate);
      let queryParamChangelist = getChangelist(oldState.queryParams, newState.queryParams);

      if (routeInfosEqual(newState.routeInfos, oldState.routeInfos)) {
        // This is a no-op transition. See if query params changed.
        if (queryParamChangelist) {
          let newTransition = this.queryParamsTransition(queryParamChangelist, wasTransitioning, oldState, newState);
          newTransition.queryParamsOnly = true;
          return newTransition;
        } // No-op. No need to create a new transition.


        return this.activeTransition || new Transition(this, undefined, undefined);
      }

      if (isIntermediate) {
        let transition = new Transition(this, undefined, undefined);
        this.toReadOnlyInfos(transition, newState);
        this.setupContexts(newState);
        this.routeWillChange(transition);
        return this.activeTransition;
      } // Create a new transition to the destination route.


      newTransition = new Transition(this, intent, newState, undefined, this.activeTransition); // transition is to same route with same params, only query params differ.
      // not caught above probably because refresh() has been used

      if (routeInfosSameExceptQueryParams(newState.routeInfos, oldState.routeInfos)) {
        newTransition.queryParamsOnly = true;
      }

      this.toReadOnlyInfos(newTransition, newState); // Abort and usurp any previously active transition.

      if (this.activeTransition) {
        this.activeTransition.redirect(newTransition);
      }

      this.activeTransition = newTransition; // Transition promises by default resolve with resolved state.
      // For our purposes, swap out the promise to resolve
      // after the transition has been finalized.

      newTransition.promise = newTransition.promise.then(result => {
        return this.finalizeTransition(newTransition, result);
      }, null, promiseLabel('Settle transition promise when transition is finalized'));

      if (!wasTransitioning) {
        this.notifyExistingHandlers(newState, newTransition);
      }

      this.fireQueryParamDidChange(newState, queryParamChangelist);
      return newTransition;
    }
    /**
    @private
       Begins and returns a Transition based on the provided
    arguments. Accepts arguments in the form of both URL
    transitions and named transitions.
       @param {Router} router
    @param {Array[Object]} args arguments passed to transitionTo,
      replaceWith, or handleURL
    */


    doTransition(name, modelsArray = [], isIntermediate = false) {
      let lastArg = modelsArray[modelsArray.length - 1];
      let queryParams = {};

      if (lastArg !== undefined && lastArg.hasOwnProperty('queryParams')) {
        queryParams = modelsArray.pop().queryParams;
      }

      let intent;

      if (name === undefined) {
        log(this, 'Updating query params'); // A query param update is really just a transition
        // into the route you're already on.

        let {
          routeInfos
        } = this.state;
        intent = new NamedTransitionIntent(this, routeInfos[routeInfos.length - 1].name, undefined, [], queryParams);
      } else if (name.charAt(0) === '/') {
        log(this, 'Attempting URL transition to ' + name);
        intent = new URLTransitionIntent(this, name);
      } else {
        log(this, 'Attempting transition to ' + name);
        intent = new NamedTransitionIntent(this, name, undefined, modelsArray, queryParams);
      }

      return this.transitionByIntent(intent, isIntermediate);
    }
    /**
    @private
       Updates the URL (if necessary) and calls `setupContexts`
    to update the router's array of `currentRouteInfos`.
    */


    finalizeTransition(transition, newState) {
      try {
        log(transition.router, transition.sequence, 'Resolved all models on destination route; finalizing transition.');
        let routeInfos = newState.routeInfos; // Run all the necessary enter/setup/exit hooks

        this.setupContexts(newState, transition); // Check if a redirect occurred in enter/setup

        if (transition.isAborted) {
          // TODO: cleaner way? distinguish b/w targetRouteInfos?
          this.state.routeInfos = this.currentRouteInfos;
          return _rsvp.Promise.reject(logAbort(transition));
        }

        this._updateURL(transition, newState);

        transition.isActive = false;
        this.activeTransition = undefined;
        this.triggerEvent(this.currentRouteInfos, true, 'didTransition', []);
        this.didTransition(this.currentRouteInfos);
        this.toInfos(transition, newState.routeInfos, true);
        this.routeDidChange(transition);
        log(this, transition.sequence, 'TRANSITION COMPLETE.'); // Resolve with the final route.

        return routeInfos[routeInfos.length - 1].route;
      } catch (e) {
        if (!(e instanceof TransitionAbortedError)) {
          let infos = transition[STATE_SYMBOL].routeInfos;
          transition.trigger(true, 'error', e, transition, infos[infos.length - 1].route);
          transition.abort();
        }

        throw e;
      }
    }
    /**
    @private
       Takes an Array of `RouteInfo`s, figures out which ones are
    exiting, entering, or changing contexts, and calls the
    proper route hooks.
       For example, consider the following tree of routes. Each route is
    followed by the URL segment it handles.
       ```
    |~index ("/")
    | |~posts ("/posts")
    | | |-showPost ("/:id")
    | | |-newPost ("/new")
    | | |-editPost ("/edit")
    | |~about ("/about/:id")
    ```
       Consider the following transitions:
       1. A URL transition to `/posts/1`.
       1. Triggers the `*model` callbacks on the
          `index`, `posts`, and `showPost` routes
       2. Triggers the `enter` callback on the same
       3. Triggers the `setup` callback on the same
    2. A direct transition to `newPost`
       1. Triggers the `exit` callback on `showPost`
       2. Triggers the `enter` callback on `newPost`
       3. Triggers the `setup` callback on `newPost`
    3. A direct transition to `about` with a specified
       context object
       1. Triggers the `exit` callback on `newPost`
          and `posts`
       2. Triggers the `serialize` callback on `about`
       3. Triggers the `enter` callback on `about`
       4. Triggers the `setup` callback on `about`
       @param {Router} transition
    @param {TransitionState} newState
    */


    setupContexts(newState, transition) {
      let partition = this.partitionRoutes(this.state, newState);
      let i, l, route;

      for (i = 0, l = partition.exited.length; i < l; i++) {
        route = partition.exited[i].route;
        delete route.context;

        if (route !== undefined) {
          if (route._internalReset !== undefined) {
            route._internalReset(true, transition);
          }

          if (route.exit !== undefined) {
            route.exit(transition);
          }
        }
      }

      let oldState = this.oldState = this.state;
      this.state = newState;
      let currentRouteInfos = this.currentRouteInfos = partition.unchanged.slice();

      try {
        for (i = 0, l = partition.reset.length; i < l; i++) {
          route = partition.reset[i].route;

          if (route !== undefined) {
            if (route._internalReset !== undefined) {
              route._internalReset(false, transition);
            }
          }
        }

        for (i = 0, l = partition.updatedContext.length; i < l; i++) {
          this.routeEnteredOrUpdated(currentRouteInfos, partition.updatedContext[i], false, transition);
        }

        for (i = 0, l = partition.entered.length; i < l; i++) {
          this.routeEnteredOrUpdated(currentRouteInfos, partition.entered[i], true, transition);
        }
      } catch (e) {
        this.state = oldState;
        this.currentRouteInfos = oldState.routeInfos;
        throw e;
      }

      this.state.queryParams = this.finalizeQueryParamChange(currentRouteInfos, newState.queryParams, transition);
    }
    /**
    @private
       Fires queryParamsDidChange event
    */


    fireQueryParamDidChange(newState, queryParamChangelist) {
      // If queryParams changed trigger event
      if (queryParamChangelist) {
        // This is a little hacky but we need some way of storing
        // changed query params given that no activeTransition
        // is guaranteed to have occurred.
        this._changedQueryParams = queryParamChangelist.all;
        this.triggerEvent(newState.routeInfos, true, 'queryParamsDidChange', [queryParamChangelist.changed, queryParamChangelist.all, queryParamChangelist.removed]);
        this._changedQueryParams = undefined;
      }
    }
    /**
    @private
       Helper method used by setupContexts. Handles errors or redirects
    that may happen in enter/setup.
    */


    routeEnteredOrUpdated(currentRouteInfos, routeInfo, enter, transition) {
      let route = routeInfo.route,
          context = routeInfo.context;

      function _routeEnteredOrUpdated(route) {
        if (enter) {
          if (route.enter !== undefined) {
            route.enter(transition);
          }
        }

        if (transition && transition.isAborted) {
          throw new TransitionAbortedError();
        }

        route.context = context;

        if (route.contextDidChange !== undefined) {
          route.contextDidChange();
        }

        if (route.setup !== undefined) {
          route.setup(context, transition);
        }

        if (transition && transition.isAborted) {
          throw new TransitionAbortedError();
        }

        currentRouteInfos.push(routeInfo);
        return route;
      } // If the route doesn't exist, it means we haven't resolved the route promise yet


      if (route === undefined) {
        routeInfo.routePromise = routeInfo.routePromise.then(_routeEnteredOrUpdated);
      } else {
        _routeEnteredOrUpdated(route);
      }

      return true;
    }
    /**
    @private
       This function is called when transitioning from one URL to
    another to determine which routes are no longer active,
    which routes are newly active, and which routes remain
    active but have their context changed.
       Take a list of old routes and new routes and partition
    them into four buckets:
       * unchanged: the route was active in both the old and
      new URL, and its context remains the same
    * updated context: the route was active in both the
      old and new URL, but its context changed. The route's
      `setup` method, if any, will be called with the new
      context.
    * exited: the route was active in the old URL, but is
      no longer active.
    * entered: the route was not active in the old URL, but
      is now active.
       The PartitionedRoutes structure has four fields:
       * `updatedContext`: a list of `RouteInfo` objects that
      represent routes that remain active but have a changed
      context
    * `entered`: a list of `RouteInfo` objects that represent
      routes that are newly active
    * `exited`: a list of `RouteInfo` objects that are no
      longer active.
    * `unchanged`: a list of `RouteInfo` objects that remain active.
       @param {Array[InternalRouteInfo]} oldRoutes a list of the route
      information for the previous URL (or `[]` if this is the
      first handled transition)
    @param {Array[InternalRouteInfo]} newRoutes a list of the route
      information for the new URL
       @return {Partition}
    */


    partitionRoutes(oldState, newState) {
      let oldRouteInfos = oldState.routeInfos;
      let newRouteInfos = newState.routeInfos;
      let routes = {
        updatedContext: [],
        exited: [],
        entered: [],
        unchanged: [],
        reset: []
      };
      let routeChanged,
          contextChanged = false,
          i,
          l;

      for (i = 0, l = newRouteInfos.length; i < l; i++) {
        let oldRouteInfo = oldRouteInfos[i],
            newRouteInfo = newRouteInfos[i];

        if (!oldRouteInfo || oldRouteInfo.route !== newRouteInfo.route) {
          routeChanged = true;
        }

        if (routeChanged) {
          routes.entered.push(newRouteInfo);

          if (oldRouteInfo) {
            routes.exited.unshift(oldRouteInfo);
          }
        } else if (contextChanged || oldRouteInfo.context !== newRouteInfo.context) {
          contextChanged = true;
          routes.updatedContext.push(newRouteInfo);
        } else {
          routes.unchanged.push(oldRouteInfo);
        }
      }

      for (i = newRouteInfos.length, l = oldRouteInfos.length; i < l; i++) {
        routes.exited.unshift(oldRouteInfos[i]);
      }

      routes.reset = routes.updatedContext.slice();
      routes.reset.reverse();
      return routes;
    }

    _updateURL(transition, state) {
      let urlMethod = transition.urlMethod;

      if (!urlMethod) {
        return;
      }

      let {
        routeInfos
      } = state;
      let {
        name: routeName
      } = routeInfos[routeInfos.length - 1];
      let params = {};

      for (let i = routeInfos.length - 1; i >= 0; --i) {
        let routeInfo = routeInfos[i];
        merge(params, routeInfo.params);

        if (routeInfo.route.inaccessibleByURL) {
          urlMethod = null;
        }
      }

      if (urlMethod) {
        params.queryParams = transition._visibleQueryParams || state.queryParams;
        let url = this.recognizer.generate(routeName, params); // transitions during the initial transition must always use replaceURL.
        // When the app boots, you are at a url, e.g. /foo. If some route
        // redirects to bar as part of the initial transition, you don't want to
        // add a history entry for /foo. If you do, pressing back will immediately
        // hit the redirect again and take you back to /bar, thus killing the back
        // button

        let initial = transition.isCausedByInitialTransition; // say you are at / and you click a link to route /foo. In /foo's
        // route, the transition is aborted using replacewith('/bar').
        // Because the current url is still /, the history entry for / is
        // removed from the history. Clicking back will take you to the page
        // you were on before /, which is often not even the app, thus killing
        // the back button. That's why updateURL is always correct for an
        // aborting transition that's not the initial transition

        let replaceAndNotAborting = urlMethod === 'replace' && !transition.isCausedByAbortingTransition; // because calling refresh causes an aborted transition, this needs to be
        // special cased - if the initial transition is a replace transition, the
        // urlMethod should be honored here.

        let isQueryParamsRefreshTransition = transition.queryParamsOnly && urlMethod === 'replace'; // say you are at / and you a `replaceWith(/foo)` is called. Then, that
        // transition is aborted with `replaceWith(/bar)`. At the end, we should
        // end up with /bar replacing /. We are replacing the replace. We only
        // will replace the initial route if all subsequent aborts are also
        // replaces. However, there is some ambiguity around the correct behavior
        // here.

        let replacingReplace = urlMethod === 'replace' && transition.isCausedByAbortingReplaceTransition;

        if (initial || replaceAndNotAborting || isQueryParamsRefreshTransition || replacingReplace) {
          this.replaceURL(url);
        } else {
          this.updateURL(url);
        }
      }
    }

    finalizeQueryParamChange(resolvedHandlers, newQueryParams, transition) {
      // We fire a finalizeQueryParamChange event which
      // gives the new route hierarchy a chance to tell
      // us which query params it's consuming and what
      // their final values are. If a query param is
      // no longer consumed in the final route hierarchy,
      // its serialized segment will be removed
      // from the URL.
      for (let k in newQueryParams) {
        if (newQueryParams.hasOwnProperty(k) && newQueryParams[k] === null) {
          delete newQueryParams[k];
        }
      }

      let finalQueryParamsArray = [];
      this.triggerEvent(resolvedHandlers, true, 'finalizeQueryParamChange', [newQueryParams, finalQueryParamsArray, transition]);

      if (transition) {
        transition._visibleQueryParams = {};
      }

      let finalQueryParams = {};

      for (let i = 0, len = finalQueryParamsArray.length; i < len; ++i) {
        let qp = finalQueryParamsArray[i];
        finalQueryParams[qp.key] = qp.value;

        if (transition && qp.visible !== false) {
          transition._visibleQueryParams[qp.key] = qp.value;
        }
      }

      return finalQueryParams;
    }

    toReadOnlyInfos(newTransition, newState) {
      let oldRouteInfos = this.state.routeInfos;
      this.fromInfos(newTransition, oldRouteInfos);
      this.toInfos(newTransition, newState.routeInfos);
      this._lastQueryParams = newState.queryParams;
    }

    fromInfos(newTransition, oldRouteInfos) {
      if (newTransition !== undefined && oldRouteInfos.length > 0) {
        let fromInfos = toReadOnlyRouteInfo(oldRouteInfos, Object.assign({}, this._lastQueryParams), true);
        newTransition.from = fromInfos[fromInfos.length - 1] || null;
      }
    }

    toInfos(newTransition, newRouteInfos, includeAttributes = false) {
      if (newTransition !== undefined && newRouteInfos.length > 0) {
        let toInfos = toReadOnlyRouteInfo(newRouteInfos, Object.assign({}, newTransition[QUERY_PARAMS_SYMBOL]), includeAttributes);
        newTransition.to = toInfos[toInfos.length - 1] || null;
      }
    }

    notifyExistingHandlers(newState, newTransition) {
      let oldRouteInfos = this.state.routeInfos,
          i,
          oldRouteInfoLen,
          oldHandler,
          newRouteInfo;
      oldRouteInfoLen = oldRouteInfos.length;

      for (i = 0; i < oldRouteInfoLen; i++) {
        oldHandler = oldRouteInfos[i];
        newRouteInfo = newState.routeInfos[i];

        if (!newRouteInfo || oldHandler.name !== newRouteInfo.name) {
          break;
        }

        if (!newRouteInfo.isResolved) {}
      }

      this.triggerEvent(oldRouteInfos, true, 'willTransition', [newTransition]);
      this.routeWillChange(newTransition);
      this.willTransition(oldRouteInfos, newState.routeInfos, newTransition);
    }
    /**
      Clears the current and target route routes and triggers exit
      on each of them starting at the leaf and traversing up through
      its ancestors.
    */


    reset() {
      if (this.state) {
        forEach(this.state.routeInfos.slice().reverse(), function (routeInfo) {
          let route = routeInfo.route;

          if (route !== undefined) {
            if (route.exit !== undefined) {
              route.exit();
            }
          }

          return true;
        });
      }

      this.oldState = undefined;
      this.state = new TransitionState();
      this.currentRouteInfos = undefined;
    }
    /**
      let handler = routeInfo.handler;
      The entry point for handling a change to the URL (usually
      via the back and forward button).
         Returns an Array of handlers and the parameters associated
      with those parameters.
         @param {String} url a URL to process
         @return {Array} an Array of `[handler, parameter]` tuples
    */


    handleURL(url) {
      // Perform a URL-based transition, but don't change
      // the URL afterward, since it already happened.
      if (url.charAt(0) !== '/') {
        url = '/' + url;
      }

      return this.doTransition(url).method(null);
    }
    /**
      Transition into the specified named route.
         If necessary, trigger the exit callback on any routes
      that are no longer represented by the target route.
         @param {String} name the name of the route
    */


    transitionTo(name, ...contexts) {
      if (typeof name === 'object') {
        contexts.push(name);
        return this.doTransition(undefined, contexts, false);
      }

      return this.doTransition(name, contexts);
    }

    intermediateTransitionTo(name, ...args) {
      return this.doTransition(name, args, true);
    }

    refresh(pivotRoute) {
      let previousTransition = this.activeTransition;
      let state = previousTransition ? previousTransition[STATE_SYMBOL] : this.state;
      let routeInfos = state.routeInfos;

      if (pivotRoute === undefined) {
        pivotRoute = routeInfos[0].route;
      }

      log(this, 'Starting a refresh transition');
      let name = routeInfos[routeInfos.length - 1].name;
      let intent = new NamedTransitionIntent(this, name, pivotRoute, [], this._changedQueryParams || state.queryParams);
      let newTransition = this.transitionByIntent(intent, false); // if the previous transition is a replace transition, that needs to be preserved

      if (previousTransition && previousTransition.urlMethod === 'replace') {
        newTransition.method(previousTransition.urlMethod);
      }

      return newTransition;
    }
    /**
      Identical to `transitionTo` except that the current URL will be replaced
      if possible.
         This method is intended primarily for use with `replaceState`.
         @param {String} name the name of the route
    */


    replaceWith(name) {
      return this.doTransition(name).method('replace');
    }
    /**
      Take a named route and context objects and generate a
      URL.
         @param {String} name the name of the route to generate
        a URL for
      @param {...Object} objects a list of objects to serialize
         @return {String} a URL
    */


    generate(routeName, ...args) {
      let partitionedArgs = extractQueryParams(args),
          suppliedParams = partitionedArgs[0],
          queryParams = partitionedArgs[1]; // Construct a TransitionIntent with the provided params
      // and apply it to the present state of the router.

      let intent = new NamedTransitionIntent(this, routeName, undefined, suppliedParams);
      let state = intent.applyToState(this.state, false);
      let params = {};

      for (let i = 0, len = state.routeInfos.length; i < len; ++i) {
        let routeInfo = state.routeInfos[i];
        let routeParams = routeInfo.serialize();
        merge(params, routeParams);
      }

      params.queryParams = queryParams;
      return this.recognizer.generate(routeName, params);
    }

    applyIntent(routeName, contexts) {
      let intent = new NamedTransitionIntent(this, routeName, undefined, contexts);
      let state = this.activeTransition && this.activeTransition[STATE_SYMBOL] || this.state;
      return intent.applyToState(state, false);
    }

    isActiveIntent(routeName, contexts, queryParams, _state) {
      let state = _state || this.state,
          targetRouteInfos = state.routeInfos,
          routeInfo,
          len;

      if (!targetRouteInfos.length) {
        return false;
      }

      let targetHandler = targetRouteInfos[targetRouteInfos.length - 1].name;
      let recogHandlers = this.recognizer.handlersFor(targetHandler);
      let index = 0;

      for (len = recogHandlers.length; index < len; ++index) {
        routeInfo = targetRouteInfos[index];

        if (routeInfo.name === routeName) {
          break;
        }
      }

      if (index === recogHandlers.length) {
        // The provided route name isn't even in the route hierarchy.
        return false;
      }

      let testState = new TransitionState();
      testState.routeInfos = targetRouteInfos.slice(0, index + 1);
      recogHandlers = recogHandlers.slice(0, index + 1);
      let intent = new NamedTransitionIntent(this, targetHandler, undefined, contexts);
      let newState = intent.applyToHandlers(testState, recogHandlers, targetHandler, true, true);
      let routesEqual = routeInfosEqual(newState.routeInfos, testState.routeInfos);

      if (!queryParams || !routesEqual) {
        return routesEqual;
      } // Get a hash of QPs that will still be active on new route


      let activeQPsOnNewHandler = {};
      merge(activeQPsOnNewHandler, queryParams);
      let activeQueryParams = state.queryParams;

      for (let key in activeQueryParams) {
        if (activeQueryParams.hasOwnProperty(key) && activeQPsOnNewHandler.hasOwnProperty(key)) {
          activeQPsOnNewHandler[key] = activeQueryParams[key];
        }
      }

      return routesEqual && !getChangelist(activeQPsOnNewHandler, queryParams);
    }

    isActive(routeName, ...args) {
      let partitionedArgs = extractQueryParams(args);
      return this.isActiveIntent(routeName, partitionedArgs[0], partitionedArgs[1]);
    }

    trigger(name, ...args) {
      this.triggerEvent(this.currentRouteInfos, false, name, args);
    }

  }

  function routeInfosEqual(routeInfos, otherRouteInfos) {
    if (routeInfos.length !== otherRouteInfos.length) {
      return false;
    }

    for (let i = 0, len = routeInfos.length; i < len; ++i) {
      if (routeInfos[i] !== otherRouteInfos[i]) {
        return false;
      }
    }

    return true;
  }

  function routeInfosSameExceptQueryParams(routeInfos, otherRouteInfos) {
    if (routeInfos.length !== otherRouteInfos.length) {
      return false;
    }

    for (let i = 0, len = routeInfos.length; i < len; ++i) {
      if (routeInfos[i].name !== otherRouteInfos[i].name) {
        return false;
      }

      if (!paramsEqual(routeInfos[i].params, otherRouteInfos[i].params)) {
        return false;
      }
    }

    return true;
  }

  function paramsEqual(params, otherParams) {
    if (!params && !otherParams) {
      return true;
    } else if (!params && !!otherParams || !!params && !otherParams) {
      // one is falsy but other is not;
      return false;
    }

    let keys = Object.keys(params);
    let otherKeys = Object.keys(otherParams);

    if (keys.length !== otherKeys.length) {
      return false;
    }

    for (let i = 0, len = keys.length; i < len; ++i) {
      let key = keys[i];

      if (params[key] !== otherParams[key]) {
        return false;
      }
    }

    return true;
  }

  var _default = Router;
  _exports.default = _default;
});
requireModule('ember')

}());
//# sourceMappingURL=ember.prod.map
