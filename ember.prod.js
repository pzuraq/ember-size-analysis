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
enifed("@ember/-internals/glimmer", ["exports", "node-module", "@ember/-internals/container", "@glimmer/opcode-compiler", "@ember/-internals/runtime", "@ember/-internals/utils", "@ember/canary-features", "@ember/runloop", "@glimmer/reference", "@ember/-internals/metal", "@ember/debug", "@glimmer/runtime", "@glimmer/util", "@ember/-internals/owner", "@ember/-internals/views", "@ember/-internals/browser-environment", "@ember/instrumentation", "@ember/polyfills", "@ember/service", "@ember/-internals/environment", "@ember/string", "@glimmer/wire-format", "rsvp", "@glimmer/node", "@ember/-internals/routing", "@ember/deprecated-features"], function (_exports, _nodeModule, _container, _opcodeCompiler, _runtime, _utils, _canaryFeatures, _runloop, _reference, _metal, _debug, _runtime2, _util, _owner, _views, _browserEnvironment, _instrumentation, _polyfills, _service, _environment2, _string, _wireFormat, _rsvp, _node, _routing, _deprecatedFeatures) {
  "use strict";

  _exports.template = template;
  _exports.helper = helper;
  _exports.escapeExpression = escapeExpression;
  _exports.htmlSafe = htmlSafe;
  _exports.isHTMLSafe = isHTMLSafe;
  _exports._resetRenderers = _resetRenderers;
  _exports.renderSettled = renderSettled;
  _exports.getTemplate = getTemplate;
  _exports.setTemplate = setTemplate;
  _exports.hasTemplate = hasTemplate;
  _exports.getTemplates = getTemplates;
  _exports.setTemplates = setTemplates;
  _exports.setupEngineRegistry = setupEngineRegistry;
  _exports.setupApplicationRegistry = setupApplicationRegistry;
  _exports._registerMacros = registerMacros;
  _exports.iterableFor = iterableFor;
  _exports.capabilities = capabilities;
  _exports.setComponentManager = setComponentManager;
  _exports.getComponentManager = getComponentManager;
  _exports.setModifierManager = setModifierManager;
  _exports.getModifierManager = getModifierManager;
  _exports.modifierCapabilties = capabilities$1;
  _exports.setComponentTemplate = setComponentTemplate;
  _exports.getComponentTemplate = getComponentTemplate;
  Object.defineProperty(_exports, "DOMChanges", {
    enumerable: true,
    get: function () {
      return _runtime2.DOMChanges;
    }
  });
  Object.defineProperty(_exports, "DOMTreeConstruction", {
    enumerable: true,
    get: function () {
      return _runtime2.DOMTreeConstruction;
    }
  });
  Object.defineProperty(_exports, "isSerializationFirstNode", {
    enumerable: true,
    get: function () {
      return _runtime2.isSerializationFirstNode;
    }
  });
  Object.defineProperty(_exports, "NodeDOMTreeConstruction", {
    enumerable: true,
    get: function () {
      return _node.NodeDOMTreeConstruction;
    }
  });
  _exports.OutletView = _exports.DebugStack = _exports.INVOKE = _exports.UpdatableReference = _exports.AbstractComponentManager = _exports._experimentalMacros = _exports.InteractiveRenderer = _exports.InertRenderer = _exports.Renderer = _exports.SafeString = _exports.Environment = _exports.Helper = _exports.ROOT_REF = _exports.Component = _exports.LinkComponent = _exports.TextArea = _exports.TextField = _exports.Checkbox = _exports.templateCacheCounters = _exports.RootTemplate = void 0;

  function _templateObject10() {
    const data = _taggedTemplateLiteralLoose(["component:-default"]);

    _templateObject10 = function () {
      return data;
    };

    return data;
  }

  function _templateObject9() {
    const data = _taggedTemplateLiteralLoose(["template-compiler:main"]);

    _templateObject9 = function () {
      return data;
    };

    return data;
  }

  function _templateObject8() {
    const data = _taggedTemplateLiteralLoose(["template-compiler:main"]);

    _templateObject8 = function () {
      return data;
    };

    return data;
  }

  function _templateObject7() {
    const data = _taggedTemplateLiteralLoose(["template:components/-default"]);

    _templateObject7 = function () {
      return data;
    };

    return data;
  }

  function _templateObject6() {
    const data = _taggedTemplateLiteralLoose(["template:-root"]);

    _templateObject6 = function () {
      return data;
    };

    return data;
  }

  function _templateObject5() {
    const data = _taggedTemplateLiteralLoose(["template:-root"]);

    _templateObject5 = function () {
      return data;
    };

    return data;
  }

  function _templateObject4() {
    const data = _taggedTemplateLiteralLoose(["component:-default"]);

    _templateObject4 = function () {
      return data;
    };

    return data;
  }

  function _templateObject3() {
    const data = _taggedTemplateLiteralLoose(["template:components/-default"]);

    _templateObject3 = function () {
      return data;
    };

    return data;
  }

  function _templateObject2() {
    const data = _taggedTemplateLiteralLoose(["template:components/-default"]);

    _templateObject2 = function () {
      return data;
    };

    return data;
  }

  function _templateObject() {
    const data = _taggedTemplateLiteralLoose(["template-compiler:main"]);

    _templateObject = function () {
      return data;
    };

    return data;
  }

  function _taggedTemplateLiteralLoose(strings, raw) { if (!raw) { raw = strings.slice(0); } strings.raw = raw; return strings; }

  function isTemplateFactory(template) {
    return typeof template === 'function';
  }

  let counters = {
    cacheHit: 0,
    cacheMiss: 0
  };
  _exports.templateCacheCounters = counters;
  const TEMPLATE_COMPILER_MAIN = (0, _container.privatize)(_templateObject());

  function template(json) {
    let glimmerFactory = (0, _opcodeCompiler.templateFactory)(json);
    let cache = new WeakMap();

    let factory = owner => {
      let result = cache.get(owner);

      if (result === undefined) {
        counters.cacheMiss++;
        let compiler = owner.lookup(TEMPLATE_COMPILER_MAIN);
        result = glimmerFactory.create(compiler, {
          owner
        });
        cache.set(owner, result);
      } else {
        counters.cacheHit++;
      }

      return result;
    };

    factory.__id = glimmerFactory.id;
    factory.__meta = glimmerFactory.meta;
    return factory;
  }

  var RootTemplate = template({
    "id": "hjhxUoru",
    "block": "{\"symbols\":[],\"statements\":[[1,[28,\"component\",[[23,0,[]]],null],false]],\"hasEval\":false}",
    "meta": {
      "moduleName": "packages/@ember/-internals/glimmer/lib/templates/root.hbs"
    }
  });
  /**
  @module @ember/component
  */

  _exports.RootTemplate = RootTemplate;
  const RECOMPUTE_TAG = (0, _utils.symbol)('RECOMPUTE_TAG');

  function isHelperFactory(helper) {
    return typeof helper === 'object' && helper !== null && helper.class && helper.class.isHelperFactory;
  }

  function isSimpleHelper(helper) {
    return helper.destroy === undefined;
  }
  /**
    Ember Helpers are functions that can compute values, and are used in templates.
    For example, this code calls a helper named `format-currency`:
  
    ```handlebars
    <div>{{format-currency cents currency="$"}}</div>
    ```
  
    Additionally a helper can be called as a nested helper (sometimes called a
    subexpression). In this example, the computed value of a helper is passed
    to a component named `show-money`:
  
    ```handlebars
    {{show-money amount=(format-currency cents currency="$")}}
    ```
  
    Helpers defined using a class must provide a `compute` function. For example:
  
    ```app/helpers/format-currency.js
    import Helper from '@ember/component/helper';
  
    export default Helper.extend({
      compute([cents], { currency }) {
        return `${currency}${cents * 0.01}`;
      }
    });
    ```
  
    Each time the input to a helper changes, the `compute` function will be
    called again.
  
    As instances, these helpers also have access to the container and will accept
    injected dependencies.
  
    Additionally, class helpers can call `recompute` to force a new computation.
  
    @class Helper
    @public
    @since 1.13.0
  */


  let Helper = _runtime.FrameworkObject.extend({
    init() {
      this._super(...arguments);

      this[RECOMPUTE_TAG] = _reference.DirtyableTag.create();
    },

    /**
      On a class-based helper, it may be useful to force a recomputation of that
      helpers value. This is akin to `rerender` on a component.
         For example, this component will rerender when the `currentUser` on a
      session service changes:
         ```app/helpers/current-user-email.js
      import Helper from '@ember/component/helper'
      import { inject as service } from '@ember/service'
      import { observer } from '@ember/object'
         export default Helper.extend({
        session: service(),
        onNewUser: observer('session.currentUser', function() {
          this.recompute();
        }),
        compute() {
          return this.get('session.currentUser.email');
        }
      });
      ```
         @method recompute
      @public
      @since 1.13.0
    */
    recompute() {
      (0, _runloop.join)(() => this[RECOMPUTE_TAG].inner.dirty());
    }

  });

  _exports.Helper = Helper;
  Helper.isHelperFactory = true;

  if (true
  /* EMBER_FRAMEWORK_OBJECT_OWNER_ARGUMENT */
  ) {
      (0, _runtime.setFrameworkClass)(Helper);
    }

  class Wrapper {
    constructor(compute) {
      this.compute = compute;
      this.isHelperFactory = true;
    }

    create() {
      // needs new instance or will leak containers
      return {
        compute: this.compute
      };
    }

  }
  /**
    In many cases, the ceremony of a full `Helper` class is not required.
    The `helper` method create pure-function helpers without instances. For
    example:
  
    ```app/helpers/format-currency.js
    import { helper } from '@ember/component/helper';
  
    export default helper(function(params, hash) {
      let cents = params[0];
      let currency = hash.currency;
      return `${currency}${cents * 0.01}`;
    });
    ```
  
    @static
    @param {Function} helper The helper function
    @method helper
    @for @ember/component/helper
    @public
    @since 1.13.0
  */


  function helper(helperFn) {
    return new Wrapper(helperFn);
  }

  function toBool(predicate) {
    if ((0, _runtime.isArray)(predicate)) {
      return predicate.length !== 0;
    } else {
      return Boolean(predicate);
    }
  }

  const UPDATE = (0, _utils.symbol)('UPDATE');
  const INVOKE = (0, _utils.symbol)('INVOKE');
  _exports.INVOKE = INVOKE;
  const ACTION = (0, _utils.symbol)('ACTION');

  class EmberPathReference {
    get(key) {
      return PropertyReference.create(this, key);
    }

  }

  class CachedReference$1 extends EmberPathReference {
    constructor() {
      super();
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

  }

  class RootReference extends _reference.ConstReference {
    constructor(value) {
      super(value);
      this.children = Object.create(null);
    }

    static create(value) {
      return valueToRef(value);
    }

    get(propertyKey) {
      let ref = this.children[propertyKey];

      if (ref === undefined) {
        ref = this.children[propertyKey] = new RootPropertyReference(this.inner, propertyKey);
      }

      return ref;
    }

  }

  let TwoWayFlushDetectionTag;

  if (false
  /* DEBUG */
  ) {
      TwoWayFlushDetectionTag = class TwoWayFlushDetectionTag {
        constructor(tag, key, ref) {
          this.tag = tag;
          this.key = key;
          this.ref = ref;
          this.parent = null;
        }

        static create(tag, key, ref) {
          return new _reference.TagWrapper(tag.type, new TwoWayFlushDetectionTag(tag, key, ref));
        }

        value() {
          return this.tag.value();
        }

        validate(ticket) {
          let {
            parent,
            key,
            ref
          } = this;
          let isValid = this.tag.validate(ticket);

          if (isValid && parent) {
            (0, _metal.didRender)(parent, key, ref);
          }

          return isValid;
        }

        didCompute(parent) {
          this.parent = parent;
          (0, _metal.didRender)(parent, this.key, this.ref);
        }

      };
    }

  class PropertyReference extends CachedReference$1 {
    static create(parentReference, propertyKey) {
      if ((0, _reference.isConst)(parentReference)) {
        return valueKeyToRef(parentReference.value(), propertyKey);
      } else {
        return new NestedPropertyReference(parentReference, propertyKey);
      }
    }

    get(key) {
      return new NestedPropertyReference(this, key);
    }

  }

  class RootPropertyReference extends PropertyReference {
    constructor(parentValue, propertyKey) {
      super();
      this.parentValue = parentValue;
      this.propertyKey = propertyKey;

      if (true
      /* EMBER_METAL_TRACKED_PROPERTIES */
      ) {
          this.propertyTag = _reference.UpdatableTag.create(_reference.CONSTANT_TAG);
        } else {
        this.propertyTag = _reference.UpdatableTag.create((0, _metal.tagForProperty)(parentValue, propertyKey));
      }

      if (false
      /* DEBUG */
      ) {
          this.tag = TwoWayFlushDetectionTag.create(this.propertyTag, propertyKey, this);
        } else {
        this.tag = this.propertyTag;
      }

      if (false
      /* DEBUG */
      && !true
      /* EMBER_METAL_TRACKED_PROPERTIES */
      ) {
          (0, _metal.watchKey)(parentValue, propertyKey);
        }
    }

    compute() {
      let {
        parentValue,
        propertyKey
      } = this;

      if (false
      /* DEBUG */
      ) {
          this.tag.inner.didCompute(parentValue);
        }

      let ret;

      if (true
      /* EMBER_METAL_TRACKED_PROPERTIES */
      ) {
          let tag = (0, _metal.track)(() => {
            ret = (0, _metal.get)(parentValue, propertyKey);
          });
          (0, _metal.consume)(tag);
          this.propertyTag.inner.update(tag);
        } else {
        ret = (0, _metal.get)(parentValue, propertyKey);
      }

      return ret;
    }

    [UPDATE](value) {
      (0, _metal.set)(this.parentValue, this.propertyKey, value);
    }

  }

  class NestedPropertyReference extends PropertyReference {
    constructor(parentReference, propertyKey) {
      super();
      this.parentReference = parentReference;
      this.propertyKey = propertyKey;
      let parentReferenceTag = parentReference.tag;

      let propertyTag = this.propertyTag = _reference.UpdatableTag.create(_reference.CONSTANT_TAG);

      if (false
      /* DEBUG */
      ) {
          let tag = (0, _reference.combine)([parentReferenceTag, propertyTag]);
          this.tag = TwoWayFlushDetectionTag.create(tag, propertyKey, this);
        } else {
        this.tag = (0, _reference.combine)([parentReferenceTag, propertyTag]);
      }
    }

    compute() {
      let {
        parentReference,
        propertyTag,
        propertyKey
      } = this;

      let _parentValue = parentReference.value();

      let parentValueType = typeof _parentValue;

      if (parentValueType === 'string' && propertyKey === 'length') {
        return _parentValue.length;
      }

      if (parentValueType === 'object' && _parentValue !== null || parentValueType === 'function') {
        let parentValue = _parentValue;

        if (false
        /* DEBUG */
        && !true
        /* EMBER_METAL_TRACKED_PROPERTIES */
        ) {
            (0, _metal.watchKey)(parentValue, propertyKey);
          }

        if (false
        /* DEBUG */
        ) {
            this.tag.inner.didCompute(parentValue);
          }

        let ret;

        if (true
        /* EMBER_METAL_TRACKED_PROPERTIES */
        ) {
            let tag = (0, _metal.track)(() => {
              ret = (0, _metal.get)(parentValue, propertyKey);
            });
            (0, _metal.consume)(tag);
            propertyTag.inner.update(tag);
          } else {
          ret = (0, _metal.get)(parentValue, propertyKey);
          propertyTag.inner.update((0, _metal.tagForProperty)(parentValue, propertyKey));
        }

        return ret;
      } else {
        return undefined;
      }
    }

    [UPDATE](value) {
      (0, _metal.set)(this.parentReference.value()
      /* let the other side handle the error */
      , this.propertyKey, value);
    }

  }

  class UpdatableReference extends EmberPathReference {
    constructor(value) {
      super();
      this.tag = _reference.DirtyableTag.create();
      this._value = value;
    }

    value() {
      return this._value;
    }

    update(value) {
      let {
        _value
      } = this;

      if (value !== _value) {
        this.tag.inner.dirty();
        this._value = value;
      }
    }

  }

  _exports.UpdatableReference = UpdatableReference;

  class ConditionalReference$1 extends _runtime2.ConditionalReference {
    static create(reference) {
      if ((0, _reference.isConst)(reference)) {
        let value = reference.value();

        if (!(0, _utils.isProxy)(value)) {
          return _runtime2.PrimitiveReference.create(toBool(value));
        }
      }

      return new ConditionalReference$1(reference);
    }

    constructor(reference) {
      super(reference);
      this.objectTag = _reference.UpdatableTag.create(_reference.CONSTANT_TAG);
      this.tag = (0, _reference.combine)([reference.tag, this.objectTag]);
    }

    toBool(predicate) {
      if ((0, _utils.isProxy)(predicate)) {
        this.objectTag.inner.update((0, _metal.tagForProperty)(predicate, 'isTruthy'));
        return Boolean((0, _metal.get)(predicate, 'isTruthy'));
      } else {
        this.objectTag.inner.update((0, _metal.tagFor)(predicate));
        return toBool(predicate);
      }
    }

  }

  class SimpleHelperReference extends CachedReference$1 {
    constructor(helper$$1, args) {
      super();
      this.helper = helper$$1;
      this.args = args;
      this.tag = args.tag;
    }

    static create(helper$$1, args) {
      if ((0, _reference.isConst)(args)) {
        let {
          positional,
          named
        } = args;
        let positionalValue = positional.value();
        let namedValue = named.value();

        if (false
        /* DEBUG */
        ) {
            (0, _debug.debugFreeze)(positionalValue);
            (0, _debug.debugFreeze)(namedValue);
          }

        let result = helper$$1(positionalValue, namedValue);
        return valueToRef(result);
      } else {
        return new SimpleHelperReference(helper$$1, args);
      }
    }

    compute() {
      let {
        helper: helper$$1,
        args: {
          positional,
          named
        }
      } = this;
      let positionalValue = positional.value();
      let namedValue = named.value();

      if (false
      /* DEBUG */
      ) {
          (0, _debug.debugFreeze)(positionalValue);
          (0, _debug.debugFreeze)(namedValue);
        }

      return helper$$1(positionalValue, namedValue);
    }

  }

  class ClassBasedHelperReference extends CachedReference$1 {
    constructor(instance, args) {
      super();
      this.instance = instance;
      this.args = args;
      this.tag = (0, _reference.combine)([instance[RECOMPUTE_TAG], args.tag]);
    }

    static create(instance, args) {
      return new ClassBasedHelperReference(instance, args);
    }

    compute() {
      let {
        instance,
        args: {
          positional,
          named
        }
      } = this;
      let positionalValue = positional.value();
      let namedValue = named.value();

      if (false
      /* DEBUG */
      ) {
          (0, _debug.debugFreeze)(positionalValue);
          (0, _debug.debugFreeze)(namedValue);
        }

      return instance.compute(positionalValue, namedValue);
    }

  }

  class InternalHelperReference extends CachedReference$1 {
    constructor(helper$$1, args) {
      super();
      this.helper = helper$$1;
      this.args = args;
      this.tag = args.tag;
    }

    compute() {
      let {
        helper: helper$$1,
        args
      } = this;
      return helper$$1(args);
    }

  }

  class UnboundReference extends _reference.ConstReference {
    static create(value) {
      return valueToRef(value, false);
    }

    get(key) {
      return valueToRef(this.inner[key], false);
    }

  }

  class ReadonlyReference extends CachedReference$1 {
    constructor(inner) {
      super();
      this.inner = inner;
      this.tag = inner.tag;
    }

    get [INVOKE]() {
      return this.inner[INVOKE];
    }

    compute() {
      return this.inner.value();
    }

    get(key) {
      return this.inner.get(key);
    }

  }

  function referenceFromParts(root, parts) {
    let reference = root;

    for (let i = 0; i < parts.length; i++) {
      reference = reference.get(parts[i]);
    }

    return reference;
  }

  function isObject(value) {
    return value !== null && typeof value === 'object';
  }

  function isFunction(value) {
    return typeof value === 'function';
  }

  function isPrimitive(value) {
    if (false
    /* DEBUG */
    ) {
        let type = typeof value;
        return value === undefined || value === null || type === 'boolean' || type === 'number' || type === 'string';
      } else {
      return true;
    }
  }

  function valueToRef(value, bound = true) {
    if (isObject(value)) {
      // root of interop with ember objects
      return bound ? new RootReference(value) : new UnboundReference(value);
    } else if (isFunction(value)) {
      // ember doesn't do observing with functions
      return new UnboundReference(value);
    } else if (isPrimitive(value)) {
      return _runtime2.PrimitiveReference.create(value);
    } else if (false
    /* DEBUG */
    ) {
        let type = typeof value;
        let output;

        try {
          output = String(value);
        } catch (e) {
          output = null;
        }

        if (output) {
          throw (0, _util.unreachable)("[BUG] Unexpected " + type + " (" + output + ")");
        } else {
          throw (0, _util.unreachable)("[BUG] Unexpected " + type);
        }
      } else {
      throw (0, _util.unreachable)();
    }
  }

  function valueKeyToRef(value, key) {
    if (isObject(value)) {
      // root of interop with ember objects
      return new RootPropertyReference(value, key);
    } else if (isFunction(value)) {
      // ember doesn't do observing with functions
      return new UnboundReference(value[key]);
    } else if (isPrimitive(value)) {
      return _runtime2.UNDEFINED_REFERENCE;
    } else if (false
    /* DEBUG */
    ) {
        let type = typeof value;
        let output;

        try {
          output = String(value);
        } catch (e) {
          output = null;
        }

        if (output) {
          throw (0, _util.unreachable)("[BUG] Unexpected " + type + " (" + output + ")");
        } else {
          throw (0, _util.unreachable)("[BUG] Unexpected " + type);
        }
      } else {
      throw (0, _util.unreachable)();
    }
  }

  const DIRTY_TAG = (0, _utils.symbol)('DIRTY_TAG');
  const ARGS = (0, _utils.symbol)('ARGS');
  const ROOT_REF = (0, _utils.symbol)('ROOT_REF');
  _exports.ROOT_REF = ROOT_REF;
  const IS_DISPATCHING_ATTRS = (0, _utils.symbol)('IS_DISPATCHING_ATTRS');
  const HAS_BLOCK = (0, _utils.symbol)('HAS_BLOCK');
  const BOUNDS = (0, _utils.symbol)('BOUNDS');

  var layout = template({
    "id": "hvtsz7RF",
    "block": "{\"symbols\":[],\"statements\":[],\"hasEval\":false}",
    "meta": {
      "moduleName": "packages/@ember/-internals/glimmer/lib/templates/empty.hbs"
    }
  });

  let DebugStack;

  if (false
  /* DEBUG */
  ) {
      class Element {
        constructor(name) {
          this.name = name;
        }

      }

      class TemplateElement extends Element {}

      class EngineElement extends Element {} // tslint:disable-next-line:no-shadowed-variable


      DebugStack = class DebugStack {
        constructor() {
          this._stack = [];
        }

        push(name) {
          this._stack.push(new TemplateElement(name));
        }

        pushEngine(name) {
          this._stack.push(new EngineElement(name));
        }

        pop() {
          let element = this._stack.pop();

          if (element) {
            return element.name;
          }
        }

        peek() {
          let template = this._currentTemplate();

          let engine = this._currentEngine();

          if (engine) {
            return "\"" + template + "\" (in \"" + engine + "\")";
          } else if (template) {
            return "\"" + template + "\"";
          }
        }

        _currentTemplate() {
          return this._getCurrentByType(TemplateElement);
        }

        _currentEngine() {
          return this._getCurrentByType(EngineElement);
        }

        _getCurrentByType(type) {
          for (let i = this._stack.length; i >= 0; i--) {
            let element = this._stack[i];

            if (element instanceof type) {
              return element.name;
            }
          }
        }

      };
    }

  var DebugStack$1 = DebugStack;
  /**
  @module ember
  */

  /**
    The `{{#each}}` helper loops over elements in a collection. It is an extension
    of the base Handlebars `{{#each}}` helper.
    The default behavior of `{{#each}}` is to yield its inner block once for every
    item in an array passing the item as the first block parameter.
  
    ```javascript
    var developers = [{ name: 'Yehuda' },{ name: 'Tom' }, { name: 'Paul' }];
    ```
  
    ```handlebars
    {{#each developers key="name" as |person|}}
      {{person.name}}
      {{! `this` is whatever it was outside the #each }}
    {{/each}}
    ```
  
    The same rules apply to arrays of primitives.
  
    ```javascript
    var developerNames = ['Yehuda', 'Tom', 'Paul']
    ```
  
    ```handlebars
    {{#each developerNames key="@index" as |name|}}
      {{name}}
    {{/each}}
    ```
  
    During iteration, the index of each item in the array is provided as a second block parameter.
  
    ```handlebars
    <ul>
      {{#each people as |person index|}}
        <li>Hello, {{person.name}}! You're number {{index}} in line</li>
      {{/each}}
    </ul>
    ```
  
    ### Specifying Keys
  
    The `key` option is used to tell Ember how to determine if the array being
    iterated over with `{{#each}}` has changed between renders. By helping Ember
    detect that some elements in the array are the same, DOM elements can be
    re-used, significantly improving rendering speed.
  
    For example, here's the `{{#each}}` helper with its `key` set to `id`:
  
    ```handlebars
    {{#each model key="id" as |item|}}
    {{/each}}
    ```
  
    When this `{{#each}}` re-renders, Ember will match up the previously rendered
    items (and reorder the generated DOM elements) based on each item's `id`
    property.
    By default the item's own reference is used.
  
    ### {{else}} condition
  
    `{{#each}}` can have a matching `{{else}}`. The contents of this block will render
    if the collection is empty.
  
    ```handlebars
    {{#each developers as |person|}}
      {{person.name}}
    {{else}}
      <p>Sorry, nobody is available for this task.</p>
    {{/each}}
    ```
  
    @method each
    @for Ember.Templates.helpers
    @public
   */

  /**
    The `{{each-in}}` helper loops over properties on an object.
  
    For example, given a `user` object that looks like:
  
    ```javascript
    {
      "name": "Shelly Sails",
      "age": 42
    }
    ```
  
    This template would display all properties on the `user`
    object in a list:
  
    ```handlebars
    <ul>
    {{#each-in user as |key value|}}
      <li>{{key}}: {{value}}</li>
    {{/each-in}}
    </ul>
    ```
  
    Outputting their name and age.
  
    @method each-in
    @for Ember.Templates.helpers
    @public
    @since 2.1.0
  */

  _exports.DebugStack = DebugStack$1;
  const EACH_IN_REFERENCE = (0, _utils.symbol)('EACH_IN');

  class EachInReference {
    constructor(inner) {
      this.inner = inner;
      this.tag = inner.tag;
      this[EACH_IN_REFERENCE] = true;
    }

    value() {
      return this.inner.value();
    }

    get(key) {
      return this.inner.get(key);
    }

  }

  function isEachIn(ref) {
    return ref !== null && typeof ref === 'object' && ref[EACH_IN_REFERENCE];
  }

  function eachIn(_vm, args) {
    return new EachInReference(args.positional.at(0));
  }

  const ITERATOR_KEY_GUID = 'be277757-bbbe-4620-9fcb-213ef433cca2';

  function iterableFor(ref, keyPath) {
    if (isEachIn(ref)) {
      return new EachInIterable(ref, keyPath || '@key');
    } else {
      return new EachIterable(ref, keyPath || '@identity');
    }
  }

  class BoundedIterator {
    constructor(length, keyFor) {
      this.length = length;
      this.keyFor = keyFor;
      this.position = 0;
    }

    isEmpty() {
      return false;
    }

    memoFor(position) {
      return position;
    }

    next() {
      let {
        length,
        keyFor,
        position
      } = this;

      if (position >= length) {
        return null;
      }

      let value = this.valueFor(position);
      let memo = this.memoFor(position);
      let key = keyFor(value, memo, position);
      this.position++;
      return {
        key,
        value,
        memo
      };
    }

  }

  class ArrayIterator extends BoundedIterator {
    constructor(array, length, keyFor) {
      super(length, keyFor);
      this.array = array;
    }

    static from(array, keyFor) {
      let {
        length
      } = array;

      if (length === 0) {
        return EMPTY_ITERATOR;
      } else {
        return new this(array, length, keyFor);
      }
    }

    static fromForEachable(object, keyFor) {
      let array = [];
      object.forEach(item => array.push(item));
      return this.from(array, keyFor);
    }

    valueFor(position) {
      return this.array[position];
    }

  }

  class EmberArrayIterator extends BoundedIterator {
    constructor(array, length, keyFor) {
      super(length, keyFor);
      this.array = array;
    }

    static from(array, keyFor) {
      let {
        length
      } = array;

      if (length === 0) {
        return EMPTY_ITERATOR;
      } else {
        return new this(array, length, keyFor);
      }
    }

    valueFor(position) {
      return (0, _metal.objectAt)(this.array, position);
    }

  }

  class ObjectIterator extends BoundedIterator {
    constructor(keys, values, length, keyFor) {
      super(length, keyFor);
      this.keys = keys;
      this.values = values;
    }

    static fromIndexable(obj, keyFor) {
      let keys = Object.keys(obj);
      let {
        length
      } = keys;

      if (length === 0) {
        return EMPTY_ITERATOR;
      } else {
        let values = [];

        for (let i = 0; i < length; i++) {
          values.push((0, _metal.get)(obj, keys[i]));
        }

        return new this(keys, values, length, keyFor);
      }
    }

    static fromForEachable(obj, keyFor) {
      let keys = [];
      let values = [];
      let length = 0;
      let isMapLike = false;
      obj.forEach((value, key) => {
        isMapLike = isMapLike || arguments.length >= 2;

        if (isMapLike) {
          keys.push(key);
        }

        values.push(value);
        length++;
      });

      if (length === 0) {
        return EMPTY_ITERATOR;
      } else if (isMapLike) {
        return new this(keys, values, length, keyFor);
      } else {
        return new ArrayIterator(values, length, keyFor);
      }
    }

    valueFor(position) {
      return this.values[position];
    }

    memoFor(position) {
      return this.keys[position];
    }

  }

  class NativeIterator {
    constructor(iterable, result, keyFor) {
      this.iterable = iterable;
      this.result = result;
      this.keyFor = keyFor;
      this.position = 0;
    }

    static from(iterable, keyFor) {
      let iterator = iterable[Symbol.iterator]();
      let result = iterator.next();
      let {
        value,
        done
      } = result;

      if (done) {
        return EMPTY_ITERATOR;
      } else if (Array.isArray(value) && value.length === 2) {
        return new this(iterator, result, keyFor);
      } else {
        return new ArrayLikeNativeIterator(iterator, result, keyFor);
      }
    }

    isEmpty() {
      return false;
    }

    next() {
      let {
        iterable,
        result,
        position,
        keyFor
      } = this;

      if (result.done) {
        return null;
      }

      let value = this.valueFor(result, position);
      let memo = this.memoFor(result, position);
      let key = keyFor(value, memo, position);
      this.position++;
      this.result = iterable.next();
      return {
        key,
        value,
        memo
      };
    }

  }

  class ArrayLikeNativeIterator extends NativeIterator {
    valueFor(result) {
      return result.value;
    }

    memoFor(_result, position) {
      return position;
    }

  }

  class MapLikeNativeIterator extends NativeIterator {
    valueFor(result) {
      return result.value[1];
    }

    memoFor(result) {
      return result.value[0];
    }

  }

  const EMPTY_ITERATOR = {
    isEmpty() {
      return true;
    },

    next() {
      false && !false && (0, _debug.assert)('Cannot call next() on an empty iterator');
      return null;
    }

  };

  class EachInIterable {
    constructor(ref, keyPath) {
      this.ref = ref;
      this.keyPath = keyPath;
      this.valueTag = _reference.UpdatableTag.create(_reference.CONSTANT_TAG);
      this.tag = (0, _reference.combine)([ref.tag, this.valueTag]);
    }

    iterate() {
      let {
        ref,
        valueTag
      } = this;
      let iterable = ref.value();
      let tag = (0, _metal.tagFor)(iterable);

      if ((0, _utils.isProxy)(iterable)) {
        // this is because the each-in doesn't actually get(proxy, 'key') but bypasses it
        // and the proxy's tag is lazy updated on access
        iterable = (0, _runtime._contentFor)(iterable);
      }

      valueTag.inner.update(tag);

      if (!isIndexable(iterable)) {
        return EMPTY_ITERATOR;
      }

      if (Array.isArray(iterable) || (0, _utils.isEmberArray)(iterable)) {
        return ObjectIterator.fromIndexable(iterable, this.keyFor(true));
      } else if (_utils.HAS_NATIVE_SYMBOL && isNativeIterable(iterable)) {
        return MapLikeNativeIterator.from(iterable, this.keyFor());
      } else if (hasForEach(iterable)) {
        return ObjectIterator.fromForEachable(iterable, this.keyFor());
      } else {
        return ObjectIterator.fromIndexable(iterable, this.keyFor(true));
      }
    }

    valueReferenceFor(item) {
      return new UpdatableReference(item.value);
    }

    updateValueReference(ref, item) {
      ref.update(item.value);
    }

    memoReferenceFor(item) {
      return new UpdatableReference(item.memo);
    }

    updateMemoReference(ref, item) {
      ref.update(item.memo);
    }

    keyFor(hasUniqueKeys = false) {
      let {
        keyPath
      } = this;

      switch (keyPath) {
        case '@key':
          return hasUniqueKeys ? ObjectKey : Unique(MapKey);

        case '@index':
          return Index;

        case '@identity':
          return Unique(Identity);

        default:
          false && !(keyPath[0] !== '@') && (0, _debug.assert)("Invalid key: " + keyPath, keyPath[0] !== '@');
          return Unique(KeyPath(keyPath));
      }
    }

  }

  class EachIterable {
    constructor(ref, keyPath) {
      this.ref = ref;
      this.keyPath = keyPath;
      this.valueTag = _reference.UpdatableTag.create(_reference.CONSTANT_TAG);
      this.tag = (0, _reference.combine)([ref.tag, this.valueTag]);
    }

    iterate() {
      let {
        ref,
        valueTag
      } = this;
      let iterable = ref.value();
      valueTag.inner.update((0, _metal.tagForProperty)(iterable, '[]'));

      if (iterable === null || typeof iterable !== 'object') {
        return EMPTY_ITERATOR;
      }

      let keyFor = this.keyFor();

      if (Array.isArray(iterable)) {
        return ArrayIterator.from(iterable, keyFor);
      } else if ((0, _utils.isEmberArray)(iterable)) {
        return EmberArrayIterator.from(iterable, keyFor);
      } else if (_utils.HAS_NATIVE_SYMBOL && isNativeIterable(iterable)) {
        return ArrayLikeNativeIterator.from(iterable, keyFor);
      } else if (hasForEach(iterable)) {
        return ArrayIterator.fromForEachable(iterable, keyFor);
      } else {
        return EMPTY_ITERATOR;
      }
    }

    valueReferenceFor(item) {
      return new UpdatableReference(item.value);
    }

    updateValueReference(ref, item) {
      ref.update(item.value);
    }

    memoReferenceFor(item) {
      return new UpdatableReference(item.memo);
    }

    updateMemoReference(ref, item) {
      ref.update(item.memo);
    }

    keyFor() {
      let {
        keyPath
      } = this;

      switch (keyPath) {
        case '@index':
          return Index;

        case '@identity':
          return Unique(Identity);

        default:
          false && !(keyPath[0] !== '@') && (0, _debug.assert)("Invalid key: " + keyPath, keyPath[0] !== '@');
          return Unique(KeyPath(keyPath));
      }
    }

  }

  function hasForEach(value) {
    return typeof value['forEach'] === 'function';
  }

  function isNativeIterable(value) {
    return typeof value[Symbol.iterator] === 'function';
  }

  function isIndexable(value) {
    return value !== null && (typeof value === 'object' || typeof value === 'function');
  } // Position in an array is guarenteed to be unique


  function Index(_value, _memo, position) {
    return String(position);
  } // Object.keys(...) is guarenteed to be strings and unique


  function ObjectKey(_value, memo) {
    return memo;
  } // Map keys can be any objects


  function MapKey(_value, memo) {
    return Identity(memo);
  }

  function Identity(value) {
    switch (typeof value) {
      case 'string':
        return value;

      case 'number':
        return String(value);

      default:
        return (0, _utils.guidFor)(value);
    }
  }

  function KeyPath(keyPath) {
    return value => String((0, _metal.get)(value, keyPath));
  }

  function Unique(func) {
    let seen = {};
    return (value, memo, position) => {
      let key = func(value, memo, position);
      let count = seen[key];

      if (count === undefined) {
        seen[key] = 0;
        return key;
      } else {
        seen[key] = ++count;
        return "" + key + ITERATOR_KEY_GUID + count;
      }
    };
  }
  /**
  @module @ember/template
  */


  class SafeString {
    constructor(string) {
      this.string = string;
    }

    toString() {
      return "" + this.string;
    }

    toHTML() {
      return this.toString();
    }

  }

  _exports.SafeString = SafeString;
  const escape = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  const possible = /[&<>"'`=]/;
  const badChars = /[&<>"'`=]/g;

  function escapeChar(chr) {
    return escape[chr];
  }

  function escapeExpression(string) {
    if (typeof string !== 'string') {
      // don't escape SafeStrings, since they're already safe
      if (string && string.toHTML) {
        return string.toHTML();
      } else if (string === null || string === undefined) {
        return '';
      } else if (!string) {
        return String(string);
      } // Force a string conversion as this will be done by the append regardless and
      // the regex test will do this transparently behind the scenes, causing issues if
      // an object's to string has escaped characters in it.


      string = String(string);
    }

    if (!possible.test(string)) {
      return string;
    }

    return string.replace(badChars, escapeChar);
  }
  /**
    Mark a string as safe for unescaped output with Ember templates. If you
    return HTML from a helper, use this function to
    ensure Ember's rendering layer does not escape the HTML.
  
    ```javascript
    import { htmlSafe } from '@ember/template';
  
    htmlSafe('<div>someString</div>')
    ```
  
    @method htmlSafe
    @for @ember/template
    @static
    @return {SafeString} A string that will not be HTML escaped by Handlebars.
    @public
  */


  function htmlSafe(str) {
    if (str === null || str === undefined) {
      str = '';
    } else if (typeof str !== 'string') {
      str = String(str);
    }

    return new SafeString(str);
  }
  /**
    Detects if a string was decorated using `htmlSafe`.
  
    ```javascript
    import { htmlSafe, isHTMLSafe } from '@ember/template';
  
    var plainString = 'plain string',
        safeString = htmlSafe('<div>someValue</div>');
  
    isHTMLSafe(plainString); // false
    isHTMLSafe(safeString);  // true
    ```
  
    @method isHTMLSafe
    @for @ember/template
    @static
    @return {Boolean} `true` if the string was decorated with `htmlSafe`, `false` otherwise.
    @public
  */


  function isHTMLSafe(str) {
    return str !== null && typeof str === 'object' && typeof str.toHTML === 'function';
  }
  /* globals module, URL */


  let nodeURL;
  let parsingNode;

  function installProtocolForURL(environment) {
    let protocol;

    if (_browserEnvironment.hasDOM) {
      protocol = browserProtocolForURL.call(environment, 'foobar:baz');
    } // Test to see if our DOM implementation parses
    // and normalizes URLs.


    if (protocol === 'foobar:') {
      // Swap in the method that doesn't do this test now that
      // we know it works.
      environment.protocolForURL = browserProtocolForURL;
    } else if (typeof URL === 'object') {
      // URL globally provided, likely from FastBoot's sandbox
      nodeURL = URL;
      environment.protocolForURL = nodeProtocolForURL;
    } else if (typeof _nodeModule.require === 'function') {
      // Otherwise, we need to fall back to our own URL parsing.
      // Global `require` is shadowed by Ember's loader so we have to use the fully
      // qualified `module.require`.
      // tslint:disable-next-line:no-require-imports
      nodeURL = (0, _nodeModule.require)("url");
      environment.protocolForURL = nodeProtocolForURL;
    } else {
      throw new Error('Could not find valid URL parsing mechanism for URL Sanitization');
    }
  }

  function browserProtocolForURL(url) {
    if (!parsingNode) {
      parsingNode = document.createElement('a');
    }

    parsingNode.href = url;
    return parsingNode.protocol;
  }

  function nodeProtocolForURL(url) {
    let protocol = null;

    if (typeof url === 'string') {
      protocol = nodeURL.parse(url).protocol;
    }

    return protocol === null ? ':' : protocol;
  }

  class Environment$1 extends _runtime2.Environment {
    constructor(injections) {
      super(injections);
      this.inTransaction = false;
      this.owner = injections[_owner.OWNER];
      this.isInteractive = this.owner.lookup('-environment:main').isInteractive; // can be removed once https://github.com/tildeio/glimmer/pull/305 lands

      this.destroyedComponents = [];
      installProtocolForURL(this);

      if (false
      /* DEBUG */
      ) {
          this.debugStack = new DebugStack$1();
        }
    }

    static create(options) {
      return new this(options);
    } // this gets clobbered by installPlatformSpecificProtocolForURL
    // it really should just delegate to a platform specific injection


    protocolForURL(s) {
      return s;
    }

    toConditionalReference(reference) {
      return ConditionalReference$1.create(reference);
    }

    iterableFor(ref, key) {
      return iterableFor(ref, key);
    }

    scheduleInstallModifier(modifier, manager) {
      if (this.isInteractive) {
        super.scheduleInstallModifier(modifier, manager);
      }
    }

    scheduleUpdateModifier(modifier, manager) {
      if (this.isInteractive) {
        super.scheduleUpdateModifier(modifier, manager);
      }
    }

    didDestroy(destroyable) {
      destroyable.destroy();
    }

    begin() {
      this.inTransaction = true;
      super.begin();
    }

    commit() {
      let destroyedComponents = this.destroyedComponents;
      this.destroyedComponents = []; // components queued for destruction must be destroyed before firing
      // `didCreate` to prevent errors when removing and adding a component
      // with the same name (would throw an error when added to view registry)

      for (let i = 0; i < destroyedComponents.length; i++) {
        destroyedComponents[i].destroy();
      }

      try {
        super.commit();
      } finally {
        this.inTransaction = false;
      }
    }

  }

  _exports.Environment = Environment$1;

  if (false
  /* DEBUG */
  ) {
      class StyleAttributeManager extends _runtime2.SimpleDynamicAttribute {
        set(dom, value, env) {
          false && (0, _debug.warn)((0, _views.constructStyleDeprecationMessage)(value), (() => {
            if (value === null || value === undefined || isHTMLSafe(value)) {
              return true;
            }

            return false;
          })(), {
            id: 'ember-htmlbars.style-xss-warning'
          });
          super.set(dom, value, env);
        }

        update(value, env) {
          false && (0, _debug.warn)((0, _views.constructStyleDeprecationMessage)(value), (() => {
            if (value === null || value === undefined || isHTMLSafe(value)) {
              return true;
            }

            return false;
          })(), {
            id: 'ember-htmlbars.style-xss-warning'
          });
          super.update(value, env);
        }

      }

      Environment$1.prototype.attributeFor = function (element, attribute, isTrusting, namespace) {
        if (attribute === 'style' && !isTrusting) {
          return new StyleAttributeManager({
            element,
            name: attribute,
            namespace
          });
        }

        return _runtime2.Environment.prototype.attributeFor.call(this, element, attribute, isTrusting, namespace);
      };
    } // implements the ComponentManager interface as defined in glimmer:
  // tslint:disable-next-line:max-line-length
  // https://github.com/glimmerjs/glimmer-vm/blob/v0.24.0-beta.4/packages/%40glimmer/runtime/lib/component/interfaces.ts#L21


  class AbstractManager {
    constructor() {
      this.debugStack = undefined;
    }

    prepareArgs(_state, _args) {
      return null;
    }

    didCreateElement(_component, _element, _operations) {} // noop
    // inheritors should also call `this.debugStack.pop()` to
    // ensure the rerendering assertion messages are properly
    // maintained


    didRenderLayout(_component, _bounds) {// noop
    }

    didCreate(_bucket) {} // noop
    // inheritors should also call `this._pushToDebugStack`
    // to ensure the rerendering assertion messages are
    // properly maintained


    update(_bucket, _dynamicScope) {} // noop
    // inheritors should also call `this.debugStack.pop()` to
    // ensure the rerendering assertion messages are properly
    // maintained


    didUpdateLayout(_bucket, _bounds) {// noop
    }

    didUpdate(_bucket) {// noop
    }

  }

  _exports.AbstractComponentManager = AbstractManager;

  if (false
  /* DEBUG */
  ) {
      AbstractManager.prototype._pushToDebugStack = function (name, environment) {
        this.debugStack = environment.debugStack;
        this.debugStack.push(name);
      };

      AbstractManager.prototype._pushEngineToDebugStack = function (name, environment) {
        this.debugStack = environment.debugStack;
        this.debugStack.pushEngine(name);
      };
    }

  function instrumentationPayload(def) {
    return {
      object: def.name + ":" + def.outlet
    };
  }

  const CAPABILITIES = {
    dynamicLayout: false,
    dynamicTag: false,
    prepareArgs: false,
    createArgs: false,
    attributeHook: false,
    elementHook: false,
    createCaller: true,
    dynamicScope: true,
    updateHook: false,
    createInstance: true
  };

  class OutletComponentManager extends AbstractManager {
    create(environment, definition, _args, dynamicScope) {
      if (false
      /* DEBUG */
      ) {
          this._pushToDebugStack("template:" + definition.template.referrer.moduleName, environment);
        }

      dynamicScope.outletState = definition.ref;
      let controller = definition.controller;
      let self = controller === undefined ? _runtime2.UNDEFINED_REFERENCE : new RootReference(controller);
      return {
        self,
        finalize: (0, _instrumentation._instrumentStart)('render.outlet', instrumentationPayload, definition)
      };
    }

    getLayout({
      template
    }, _resolver) {
      // The router has already resolved the template
      const layout = template.asLayout();
      return {
        handle: layout.compile(),
        symbolTable: layout.symbolTable
      };
    }

    getCapabilities() {
      return CAPABILITIES;
    }

    getSelf({
      self
    }) {
      return self;
    }

    getTag() {
      // an outlet has no hooks
      return _reference.CONSTANT_TAG;
    }

    didRenderLayout(state) {
      state.finalize();

      if (false
      /* DEBUG */
      ) {
          this.debugStack.pop();
        }
    }

    getDestructor() {
      return null;
    }

  }

  const OUTLET_MANAGER = new OutletComponentManager();

  class OutletComponentDefinition {
    constructor(state, manager = OUTLET_MANAGER) {
      this.state = state;
      this.manager = manager;
    }

  }

  function createRootOutlet(outletView) {
    if (_environment2.ENV._APPLICATION_TEMPLATE_WRAPPER) {
      const WRAPPED_CAPABILITIES = (0, _polyfills.assign)({}, CAPABILITIES, {
        dynamicTag: true,
        elementHook: true
      });
      const WrappedOutletComponentManager = class extends OutletComponentManager {
        getTagName(_component) {
          return 'div';
        }

        getLayout(state) {
          // The router has already resolved the template
          const template = state.template;
          const layout = template.asWrappedLayout();
          return {
            handle: layout.compile(),
            symbolTable: layout.symbolTable
          };
        }

        getCapabilities() {
          return WRAPPED_CAPABILITIES;
        }

        didCreateElement(component, element, _operations) {
          // to add GUID id and class
          element.setAttribute('class', 'ember-view');
          element.setAttribute('id', (0, _utils.guidFor)(component));
        }

      };
      const WRAPPED_OUTLET_MANAGER = new WrappedOutletComponentManager();
      return new OutletComponentDefinition(outletView.state, WRAPPED_OUTLET_MANAGER);
    } else {
      return new OutletComponentDefinition(outletView.state);
    }
  } // tslint:disable-next-line:no-empty

  class RootComponentManager extends CurlyComponentManager {
    constructor(component) {
      super();
      this.component = component;
    }

    getLayout(_state) {
      const template = this.templateFor(this.component);
      const layout = template.asWrappedLayout();
      return {
        handle: layout.compile(),
        symbolTable: layout.symbolTable
      };
    }

    create(environment, _state, _args, dynamicScope) {
      let component = this.component;

      if (false
      /* DEBUG */
      ) {
          this._pushToDebugStack(component._debugContainerKey, environment);
        }

      let finalizer = (0, _instrumentation._instrumentStart)('render.component', initialRenderInstrumentDetails, component);
      dynamicScope.view = component;
      let hasWrappedElement = component.tagName !== ''; // We usually do this in the `didCreateElement`, but that hook doesn't fire for tagless components

      if (!hasWrappedElement) {
        if (environment.isInteractive) {
          component.trigger('willRender');
        }

        component._transitionTo('hasElement');

        if (environment.isInteractive) {
          component.trigger('willInsertElement');
        }
      }

      if (false
      /* DEBUG */
      ) {
          processComponentInitializationAssertions(component, {});
        }

      return new ComponentStateBucket(environment, component, null, finalizer, hasWrappedElement);
    }

  } // ROOT is the top-level template it has nothing but one yield.
  // it is supposed to have a dummy element


  const ROOT_CAPABILITIES = {
    dynamicLayout: false,
    dynamicTag: true,
    prepareArgs: false,
    createArgs: false,
    attributeHook: true,
    elementHook: true,
    createCaller: true,
    dynamicScope: true,
    updateHook: true,
    createInstance: true
  };

  class RootComponentDefinition {
    constructor(component) {
      this.component = component;
      let manager = new RootComponentManager(component);
      this.manager = manager;

      let factory = _container.FACTORY_FOR.get(component);

      this.state = {
        name: factory.fullName.slice(10),
        capabilities: ROOT_CAPABILITIES,
        ComponentClass: factory,
        handle: null
      };
    }

    getTag({
      component
    }) {
      return component[DIRTY_TAG];
    }

  }

  class DynamicScope {
    constructor(view, outletState) {
      this.view = view;
      this.outletState = outletState;
    }

    child() {
      return new DynamicScope(this.view, this.outletState);
    }

    get(key) {
      // tslint:disable-next-line:max-line-length
      false && !(key === 'outletState') && (0, _debug.assert)("Using `-get-dynamic-scope` is only supported for `outletState` (you used `" + key + "`).", key === 'outletState');
      return this.outletState;
    }

    set(key, value) {
      // tslint:disable-next-line:max-line-length
      false && !(key === 'outletState') && (0, _debug.assert)("Using `-with-dynamic-scope` is only supported for `outletState` (you used `" + key + "`).", key === 'outletState');
      this.outletState = value;
      return value;
    }

  }

  class RootState {
    constructor(root, env, template, self, parentElement, dynamicScope, builder) {
      false && !(template !== undefined) && (0, _debug.assert)("You cannot render `" + self.value() + "` without a template.", template !== undefined);
      this.id = (0, _views.getViewId)(root);
      this.env = env;
      this.root = root;
      this.result = undefined;
      this.shouldReflush = false;
      this.destroyed = false;
      let options = this.options = {
        alwaysRevalidate: false
      };

      this.render = () => {
        let layout = template.asLayout();
        let handle = layout.compile();
        let iterator = (0, _runtime2.renderMain)(layout['compiler'].program, env, self, dynamicScope, builder(env, {
          element: parentElement,
          nextSibling: null
        }), handle);
        let iteratorResult;

        do {
          iteratorResult = iterator.next();
        } while (!iteratorResult.done);

        let result = this.result = iteratorResult.value; // override .render function after initial render

        this.render = () => result.rerender(options);
      };
    }

    isFor(possibleRoot) {
      return this.root === possibleRoot;
    }

    destroy() {
      let {
        result,
        env
      } = this;
      this.destroyed = true;
      this.env = undefined;
      this.root = null;
      this.result = undefined;
      this.render = undefined;

      if (result) {
        /*
         Handles these scenarios:
                * When roots are removed during standard rendering process, a transaction exists already
           `.begin()` / `.commit()` are not needed.
         * When roots are being destroyed manually (`component.append(); component.destroy() case), no
           transaction exists already.
         * When roots are being destroyed during `Renderer#destroy`, no transaction exists
                */
        let needsTransaction = !env.inTransaction;

        if (needsTransaction) {
          env.begin();
        }

        try {
          result.destroy();
        } finally {
          if (needsTransaction) {
            env.commit();
          }
        }
      }
    }

  }

  const renderers = [];

  function _resetRenderers() {
    renderers.length = 0;
  }

  function register(renderer) {
    false && !(renderers.indexOf(renderer) === -1) && (0, _debug.assert)('Cannot register the same renderer twice', renderers.indexOf(renderer) === -1);
    renderers.push(renderer);
  }

  function deregister(renderer) {
    let index = renderers.indexOf(renderer);
    false && !(index !== -1) && (0, _debug.assert)('Cannot deregister unknown unregistered renderer', index !== -1);
    renderers.splice(index, 1);
  }

  function loopBegin() {
    for (let i = 0; i < renderers.length; i++) {
      renderers[i]._scheduleRevalidate();
    }
  }

  function K() {
    /* noop */
  }

  let renderSettledDeferred = null;
  /*
    Returns a promise which will resolve when rendering has settled. Settled in
    this context is defined as when all of the tags in use are "current" (e.g.
    `renderers.every(r => r._isValid())`). When this is checked at the _end_ of
    the run loop, this essentially guarantees that all rendering is completed.
  
    @method renderSettled
    @returns {Promise<void>} a promise which fulfills when rendering has settled
  */

  function renderSettled() {
    if (renderSettledDeferred === null) {
      renderSettledDeferred = _rsvp.default.defer(); // if there is no current runloop, the promise created above will not have
      // a chance to resolve (because its resolved in backburner's "end" event)

      if (!(0, _runloop.getCurrentRunLoop)()) {
        // ensure a runloop has been kicked off
        _runloop.backburner.schedule('actions', null, K);
      }
    }

    return renderSettledDeferred.promise;
  }

  function resolveRenderPromise() {
    if (renderSettledDeferred !== null) {
      let resolve = renderSettledDeferred.resolve;
      renderSettledDeferred = null;

      _runloop.backburner.join(null, resolve);
    }
  }

  let loops = 0;

  function loopEnd() {
    for (let i = 0; i < renderers.length; i++) {
      if (!renderers[i]._isValid()) {
        if (loops > _environment2.ENV._RERENDER_LOOP_LIMIT) {
          loops = 0; // TODO: do something better

          renderers[i].destroy();
          throw new Error('infinite rendering invalidation detected');
        }

        loops++;
        return _runloop.backburner.join(null, K);
      }
    }

    loops = 0;
    resolveRenderPromise();
  }

  _runloop.backburner.on('begin', loopBegin);

  _runloop.backburner.on('end', loopEnd);

  class Renderer {
    constructor(env, rootTemplate, viewRegistry, destinedForDOM = false, builder = _runtime2.clientBuilder) {
      this._env = env;
      this._rootTemplate = rootTemplate(env.owner);
      this._viewRegistry = viewRegistry;
      this._destinedForDOM = destinedForDOM;
      this._destroyed = false;
      this._roots = [];
      this._lastRevision = -1;
      this._isRenderingRoots = false;
      this._removedRoots = [];
      this._builder = builder;
    } // renderer HOOKS


    appendOutletView(view, target) {
      let definition = createRootOutlet(view);

      this._appendDefinition(view, (0, _runtime2.curry)(definition), target);
    }

    appendTo(view, target) {
      let definition = new RootComponentDefinition(view);

      this._appendDefinition(view, (0, _runtime2.curry)(definition), target);
    }

    _appendDefinition(root, definition, target) {
      let self = new UnboundReference(definition);
      let dynamicScope = new DynamicScope(null, _runtime2.UNDEFINED_REFERENCE);
      let rootState = new RootState(root, this._env, this._rootTemplate, self, target, dynamicScope, this._builder);

      this._renderRoot(rootState);
    }

    rerender() {
      this._scheduleRevalidate();
    }

    register(view) {
      let id = (0, _views.getViewId)(view);
      false && !!this._viewRegistry[id] && (0, _debug.assert)('Attempted to register a view with an id already in use: ' + id, !this._viewRegistry[id]);
      this._viewRegistry[id] = view;
    }

    unregister(view) {
      delete this._viewRegistry[(0, _views.getViewId)(view)];
    }

    remove(view) {
      view._transitionTo('destroying');

      this.cleanupRootFor(view);

      if (this._destinedForDOM) {
        view.trigger('didDestroyElement');
      }
    }

    cleanupRootFor(view) {
      // no need to cleanup roots if we have already been destroyed
      if (this._destroyed) {
        return;
      }

      let roots = this._roots; // traverse in reverse so we can remove items
      // without mucking up the index

      let i = this._roots.length;

      while (i--) {
        let root = roots[i];

        if (root.isFor(view)) {
          root.destroy();
          roots.splice(i, 1);
        }
      }
    }

    destroy() {
      if (this._destroyed) {
        return;
      }

      this._destroyed = true;

      this._clearAllRoots();
    }

    getBounds(view) {
      let bounds = view[BOUNDS];
      let parentElement = bounds.parentElement();
      let firstNode = bounds.firstNode();
      let lastNode = bounds.lastNode();
      return {
        parentElement,
        firstNode,
        lastNode
      };
    }

    createElement(tagName) {
      return this._env.getAppendOperations().createElement(tagName);
    }

    _renderRoot(root) {
      let {
        _roots: roots
      } = this;
      roots.push(root);

      if (roots.length === 1) {
        register(this);
      }

      this._renderRootsTransaction();
    }

    _renderRoots() {
      let {
        _roots: roots,
        _env: env,
        _removedRoots: removedRoots
      } = this;
      let globalShouldReflush = false;
      let initialRootsLength;

      do {
        env.begin();

        try {
          // ensure that for the first iteration of the loop
          // each root is processed
          initialRootsLength = roots.length;
          globalShouldReflush = false;

          for (let i = 0; i < roots.length; i++) {
            let root = roots[i];

            if (root.destroyed) {
              // add to the list of roots to be removed
              // they will be removed from `this._roots` later
              removedRoots.push(root); // skip over roots that have been marked as destroyed

              continue;
            }

            let {
              shouldReflush
            } = root; // when processing non-initial reflush loops,
            // do not process more roots than needed

            if (i >= initialRootsLength && !shouldReflush) {
              continue;
            }

            root.options.alwaysRevalidate = shouldReflush; // track shouldReflush based on this roots render result

            shouldReflush = root.shouldReflush = (0, _metal.runInTransaction)(root, 'render'); // globalShouldReflush should be `true` if *any* of
            // the roots need to reflush

            globalShouldReflush = globalShouldReflush || shouldReflush;
          }

          this._lastRevision = _reference.CURRENT_TAG.value();
        } finally {
          env.commit();
        }
      } while (globalShouldReflush || roots.length > initialRootsLength); // remove any roots that were destroyed during this transaction


      while (removedRoots.length) {
        let root = removedRoots.pop();
        let rootIndex = roots.indexOf(root);
        roots.splice(rootIndex, 1);
      }

      if (this._roots.length === 0) {
        deregister(this);
      }
    }

    _renderRootsTransaction() {
      if (this._isRenderingRoots) {
        // currently rendering roots, a new root was added and will
        // be processed by the existing _renderRoots invocation
        return;
      } // used to prevent calling _renderRoots again (see above)
      // while we are actively rendering roots


      this._isRenderingRoots = true;
      let completedWithoutError = false;

      try {
        this._renderRoots();

        completedWithoutError = true;
      } finally {
        if (!completedWithoutError) {
          this._lastRevision = _reference.CURRENT_TAG.value();

          if (this._env.inTransaction === true) {
            this._env.commit();
          }
        }

        this._isRenderingRoots = false;
      }
    }

    _clearAllRoots() {
      let roots = this._roots;

      for (let i = 0; i < roots.length; i++) {
        let root = roots[i];
        root.destroy();
      }

      this._removedRoots.length = 0;
      this._roots = []; // if roots were present before destroying
      // deregister this renderer instance

      if (roots.length) {
        deregister(this);
      }
    }

    _scheduleRevalidate() {
      _runloop.backburner.scheduleOnce('render', this, this._revalidate);
    }

    _isValid() {
      return this._destroyed || this._roots.length === 0 || _reference.CURRENT_TAG.validate(this._lastRevision);
    }

    _revalidate() {
      if (this._isValid()) {
        return;
      }

      this._renderRootsTransaction();
    }

  }

  _exports.Renderer = Renderer;

  class InertRenderer extends Renderer {
    static create({
      env,
      rootTemplate,
      _viewRegistry,
      builder
    }) {
      return new this(env, rootTemplate, _viewRegistry, false, builder);
    }

    getElement(_view) {
      throw new Error('Accessing `this.element` is not allowed in non-interactive environments (such as FastBoot).');
    }

  }

  _exports.InertRenderer = InertRenderer;

  class InteractiveRenderer extends Renderer {
    static create({
      env,
      rootTemplate,
      _viewRegistry,
      builder
    }) {
      return new this(env, rootTemplate, _viewRegistry, true, builder);
    }

    getElement(view) {
      return (0, _views.getViewElement)(view);
    }

  }

  _exports.InteractiveRenderer = InteractiveRenderer;
  let TEMPLATES = {};

  function setTemplates(templates) {
    TEMPLATES = templates;
  }

  function getTemplates() {
    return TEMPLATES;
  }

  function getTemplate(name) {
    if (TEMPLATES.hasOwnProperty(name)) {
      return TEMPLATES[name];
    }
  }

  function hasTemplate(name) {
    return TEMPLATES.hasOwnProperty(name);
  }

  function setTemplate(name, template) {
    return TEMPLATES[name] = template;
  }

  class InternalComponentDefinition {
    constructor(manager, ComponentClass, layout) {
      this.manager = manager;
      this.state = {
        ComponentClass,
        layout
      };
    }

  }

  class InternalManager extends AbstractManager {
    constructor(owner) {
      super();
      this.owner = owner;
    }

    getLayout({
      layout: _layout
    }) {
      let layout = _layout.asLayout();

      return {
        handle: layout.compile(),
        symbolTable: layout.symbolTable
      };
    }

  }

  const CAPABILITIES$1 = {
    dynamicLayout: false,
    dynamicTag: false,
    prepareArgs: true,
    createArgs: true,
    attributeHook: false,
    elementHook: false,
    createCaller: true,
    dynamicScope: false,
    updateHook: true,
    createInstance: true
  };
  const EMPTY_POSITIONAL_ARGS$1 = [];
  (0, _debug.debugFreeze)(EMPTY_POSITIONAL_ARGS$1);

  class InputComponentManager extends InternalManager {
    getCapabilities() {
      return CAPABILITIES$1;
    }

    prepareArgs(_state, args) {
      false && !(args.positional.length === 0) && (0, _debug.assert)('The `<Input />` component does not take any positional arguments', args.positional.length === 0);
      let __ARGS__ = args.named.capture().map;
      return {
        positional: EMPTY_POSITIONAL_ARGS$1,
        named: {
          __ARGS__: new RootReference(__ARGS__),
          type: args.named.get('type')
        }
      };
    }

    create(_env, {
      ComponentClass
    }, args, _dynamicScope, caller) {
      false && !(0, _reference.isConst)(caller) && (0, _debug.assert)('caller must be const', (0, _reference.isConst)(caller));
      let type = args.named.get('type');
      let instance = ComponentClass.create({
        caller: caller.value(),
        type: type.value()
      });
      return {
        type,
        instance
      };
    }

    getSelf({
      instance
    }) {
      return new RootReference(instance);
    }

    getTag() {
      return _reference.CONSTANT_TAG;
    }

    update({
      type,
      instance
    }) {
      (0, _metal.set)(instance, 'type', type.value());
    }

    getDestructor({
      instance
    }) {
      return instance;
    }

  }

  const InputComponentManagerFactory = owner => {
    return new InputComponentManager(owner);
  };

  const MANAGERS = new WeakMap();
  const getPrototypeOf = Object.getPrototypeOf;

  function setManager(wrapper, obj) {
    MANAGERS.set(obj, wrapper);
    return obj;
  }

  function getManager(obj) {
    let pointer = obj;

    while (pointer !== undefined && pointer !== null) {
      let manager = MANAGERS.get(pointer);

      if (manager !== undefined) {
        return manager;
      }

      pointer = getPrototypeOf(pointer);
    }

    return null;
  }
  /**
  @module @ember/component
  */


  let Input;

  if (true
  /* EMBER_GLIMMER_ANGLE_BRACKET_BUILT_INS */
  ) {
      /**
        See [Ember.Templates.components.Input](/ember/release/classes/Ember.Templates.components/methods/Input?anchor=Input).
           @method input
        @for Ember.Templates.helpers
        @param {Hash} options
        @public
       */

      /**
        The `Input` component lets you create an HTML `<input>` element.
           ```handlebars
        <Input @value="987" />
        ```
           creates an `<input>` element with `type="text"` and value set to 987.
           ### Text field
           If no `type` argument is specified, a default of type 'text' is used.
           ```handlebars
        Search:
        <Input @value={{this.searchWord}}>
        ```
           In this example, the initial value in the `<input>` will be set to the value of
        `this.searchWord`. If the user changes the text, the value of `this.searchWord` will also be
        updated.
           ### Actions
           The `Input` component takes a number of arguments with callbacks that are invoked in response to
        user events.
           * `enter`
        * `insert-newline`
        * `escape-press`
        * `focus-in`
        * `focus-out`
        * `key-press`
        * `key-up`
           These callbacks are passed to `Input` like this:
           ```handlebars
        <Input @value={{this.searchWord}} @enter={{this.query}} />
        ```
           ### `<input>` HTML Attributes to Avoid
           In most cases, if you want to pass an attribute to the underlying HTML `<input>` element, you
        can pass the attribute directly, just like any other Ember component.
           ```handlebars
        <Input @type="text" size="10" />
        ```
           In this example, the `size` attribute will be applied to the underlying `<input>` element in the
        outputted HTML.
           However, there are a few attributes where you **must** use the `@` version.
           * `@type`: This argument is used to control which Ember component is used under the hood
        * `@value`: The `@value` argument installs a two-way binding onto the element. If you wanted a
          one-way binding, use `<input>` with the `value` property and the `input` event instead.
        * `@checked` (for checkboxes): like `@value`, the `@checked` argument installs a two-way binding
          onto the element. If you wanted a one-way binding, use `<input type="checkbox">` with
          `checked` and the `input` event instead.
           ### Extending `TextField`
           Internally, `<Input @type="text" />` creates an instance of `TextField`, passing arguments from
        the helper to `TextField`'s `create` method. Subclassing `TextField` is supported but not
        recommended.
           See [TextField](/ember/release/classes/TextField)
           ### Checkbox
           To create an `<input type="checkbox">`:
           ```handlebars
        Emberize Everything:
        <Input @type="checkbox" @checked={{this.isEmberized}} name="isEmberized" />
        ```
           This will bind the checked state of this checkbox to the value of `isEmberized` -- if either one
        changes, it will be reflected in the other.
           ### Extending `Checkbox`
           Internally, `<Input @type="checkbox" />` creates an instance of `Checkbox`. Subclassing
        `TextField` is supported but not recommended.
           See [Checkbox](/api/ember/release/classes/Checkbox)
           @method Input
        @for Ember.Templates.components
        @see {TextField}
        @see {Checkbox}
        @param {Hash} options
        @public
      */
      Input = _runtime.Object.extend({
        isCheckbox: (0, _metal.computed)('type', function () {
          return this.type === 'checkbox';
        })
      });
      setManager({
        factory: InputComponentManagerFactory,
        internal: true,
        type: 'component'
      }, Input);

      Input.toString = () => '@ember/component/input';
    }

  var Input$1 = Input; ///<reference path="./simple-dom.d.ts" />

  /**
  @module ember
  */

  /**
    Calls [String.loc](/ember/release/classes/String/methods/loc?anchor=loc) with the
    provided string. This is a convenient way to localize text within a template.
    For example:
  
    ```javascript
    Ember.STRINGS = {
      '_welcome_': 'Bonjour'
    };
    ```
  
    ```handlebars
    <div class='message'>
      {{loc '_welcome_'}}
    </div>
    ```
  
    ```html
    <div class='message'>
      Bonjour
    </div>
    ```
  
    See [String.loc](/ember/release/classes/String/methods/loc?anchor=loc) for how to
    set up localized string references.
  
    @method loc
    @for Ember.Templates.helpers
    @param {String} str The string to format.
    @see {String#loc}
    @public
  */

  var loc$1 = helper(function (params) {
    return _string.loc.apply(null, params
    /* let the other side handle errors */
    );
  });

  class CompileTimeLookup {
    constructor(resolver) {
      this.resolver = resolver;
    }

    getCapabilities(handle) {
      let definition = this.resolver.resolve(handle);
      let {
        manager,
        state
      } = definition;
      return manager.getCapabilities(state);
    }

    getLayout(handle) {
      const {
        manager,
        state
      } = this.resolver.resolve(handle);
      const capabilities = manager.getCapabilities(state);

      if (capabilities.dynamicLayout) {
        return null;
      }

      const invocation = manager.getLayout(state, this.resolver);
      return {
        // TODO: this seems weird, it already is compiled
        compile() {
          return invocation.handle;
        },

        symbolTable: invocation.symbolTable
      };
    }

    lookupHelper(name, referrer) {
      return this.resolver.lookupHelper(name, referrer);
    }

    lookupModifier(name, referrer) {
      return this.resolver.lookupModifier(name, referrer);
    }

    lookupComponentDefinition(name, referrer) {
      return this.resolver.lookupComponentHandle(name, referrer);
    }

    lookupPartial(name, referrer) {
      return this.resolver.lookupPartial(name, referrer);
    }

  }

  const CAPABILITIES$2 = {
    dynamicLayout: false,
    dynamicTag: false,
    prepareArgs: false,
    createArgs: true,
    attributeHook: false,
    elementHook: false,
    createCaller: false,
    dynamicScope: true,
    updateHook: true,
    createInstance: true
  };

  function capabilities(managerAPI, options = {}) {
    false && !(managerAPI === '3.4') && (0, _debug.assert)('Invalid component manager compatibility specified', managerAPI === '3.4');
    let updateHook = true;

    if (true
    /* EMBER_CUSTOM_COMPONENT_ARG_PROXY */
    ) {
        updateHook = 'updateHook' in options ? Boolean(options.updateHook) : true;
      }

    return {
      asyncLifeCycleCallbacks: Boolean(options.asyncLifecycleCallbacks),
      destructor: Boolean(options.destructor),
      updateHook
    };
  }

  function hasAsyncLifeCycleCallbacks(delegate) {
    return delegate.capabilities.asyncLifeCycleCallbacks;
  }

  function hasDestructors(delegate) {
    return delegate.capabilities.destructor;
  }
  /**
    The CustomComponentManager allows addons to provide custom component
    implementations that integrate seamlessly into Ember. This is accomplished
    through a delegate, registered with the custom component manager, which
    implements a set of hooks that determine component behavior.
  
    To create a custom component manager, instantiate a new CustomComponentManager
    class and pass the delegate as the first argument:
  
    ```js
    let manager = new CustomComponentManager({
      // ...delegate implementation...
    });
    ```
  
    ## Delegate Hooks
  
    Throughout the lifecycle of a component, the component manager will invoke
    delegate hooks that are responsible for surfacing those lifecycle changes to
    the end developer.
  
    * `create()` - invoked when a new instance of a component should be created
    * `update()` - invoked when the arguments passed to a component change
    * `getContext()` - returns the object that should be
  */


  class CustomComponentManager extends AbstractManager {
    create(_env, definition, args) {
      const {
        delegate
      } = definition;
      const capturedArgs = args.capture();
      let value;
      let namedArgsProxy = {};

      if (true
      /* EMBER_CUSTOM_COMPONENT_ARG_PROXY */
      ) {
          if (_utils.HAS_NATIVE_PROXY) {
            let handler = {
              get(_target, prop) {
                false && !(typeof prop === 'string') && (0, _debug.assert)('args can only be strings', typeof prop === 'string');
                let ref = capturedArgs.named.get(prop);
                (0, _metal.consume)(ref.tag);
                return ref.value();
              }

            };

            if (false
            /* DEBUG */
            ) {
                handler.set = function (_target, prop) {
                  false && !false && (0, _debug.assert)("You attempted to set " + definition.ComponentClass.class + "#" + String(prop) + " on a components arguments. Component arguments are immutable and cannot be updated directly, they always represent the values that are passed to your component. If you want to set default values, you should use a getter instead");
                  return false;
                };
              }

            namedArgsProxy = new Proxy(namedArgsProxy, handler);
          } else {
            capturedArgs.named.names.forEach(name => {
              Object.defineProperty(namedArgsProxy, name, {
                get() {
                  let ref = capturedArgs.named.get(name);
                  (0, _metal.consume)(ref.tag);
                  return ref.value();
                }

              });
            });
          }

          value = {
            named: namedArgsProxy,
            positional: capturedArgs.positional.value()
          };
        } else {
        value = capturedArgs.value();
      }

      const component = delegate.createComponent(definition.ComponentClass.class, value);
      return new CustomComponentState(delegate, component, capturedArgs, namedArgsProxy);
    }

    update({
      delegate,
      component,
      args,
      namedArgsProxy
    }) {
      let value;

      if (true
      /* EMBER_CUSTOM_COMPONENT_ARG_PROXY */
      ) {
          value = {
            named: namedArgsProxy,
            positional: args.positional.value()
          };
        } else {
        value = args.value();
      }

      delegate.updateComponent(component, value);
    }

    didCreate({
      delegate,
      component
    }) {
      if (hasAsyncLifeCycleCallbacks(delegate)) {
        delegate.didCreateComponent(component);
      }
    }

    didUpdate({
      delegate,
      component
    }) {
      if (hasAsyncLifeCycleCallbacks(delegate)) {
        delegate.didUpdateComponent(component);
      }
    }

    getContext({
      delegate,
      component
    }) {
      delegate.getContext(component);
    }

    getSelf({
      delegate,
      component
    }) {
      return RootReference.create(delegate.getContext(component));
    }

    getDestructor(state) {
      if (hasDestructors(state.delegate)) {
        return state;
      } else {
        return null;
      }
    }

    getCapabilities({
      delegate
    }) {
      return Object.assign({}, CAPABILITIES$2, {
        updateHook: delegate.capabilities.updateHook
      });
    }

    getTag({
      args
    }) {
      return args.tag;
    }

    didRenderLayout() {}

    getLayout(state) {
      return {
        handle: state.template.asLayout().compile(),
        symbolTable: state.symbolTable
      };
    }

  }

  const CUSTOM_COMPONENT_MANAGER = new CustomComponentManager();
  /**
   * Stores internal state about a component instance after it's been created.
   */

  class CustomComponentState {
    constructor(delegate, component, args, namedArgsProxy) {
      this.delegate = delegate;
      this.component = component;
      this.args = args;
      this.namedArgsProxy = namedArgsProxy;
    }

    destroy() {
      const {
        delegate,
        component
      } = this;

      if (hasDestructors(delegate)) {
        delegate.destroyComponent(component);
      }
    }

  }

  class CustomManagerDefinition {
    constructor(name, ComponentClass, delegate, template) {
      this.name = name;
      this.ComponentClass = ComponentClass;
      this.delegate = delegate;
      this.template = template;
      this.manager = CUSTOM_COMPONENT_MANAGER;
      const layout = template.asLayout();
      const symbolTable = layout.symbolTable;
      this.symbolTable = symbolTable;
      this.state = {
        name,
        ComponentClass,
        template,
        symbolTable,
        delegate
      };
    }

  }

  const CAPABILITIES$3 = {
    dynamicLayout: false,
    dynamicTag: false,
    prepareArgs: false,
    createArgs: false,
    attributeHook: false,
    elementHook: false,
    createCaller: false,
    dynamicScope: false,
    updateHook: false,
    createInstance: true
  };

  class TemplateOnlyComponentManager extends AbstractManager {
    getLayout(template) {
      const layout = template.asLayout();
      return {
        handle: layout.compile(),
        symbolTable: layout.symbolTable
      };
    }

    getCapabilities() {
      return CAPABILITIES$3;
    }

    create() {
      return null;
    }

    getSelf() {
      return _runtime2.NULL_REFERENCE;
    }

    getTag() {
      return _reference.CONSTANT_TAG;
    }

    getDestructor() {
      return null;
    }

  }

  const MANAGER = new TemplateOnlyComponentManager();

  class TemplateOnlyComponentDefinition {
    constructor(state) {
      this.state = state;
      this.manager = MANAGER;
    }

  }

  let helper$1;

  if (false
  /* DEBUG */
  ) {
      class ComponentAssertionReference {
        constructor(component, message) {
          this.component = component;
          this.message = message;
          this.tag = component.tag;
        }

        value() {
          let value = this.component.value();
          false && !(typeof value !== 'string') && (0, _debug.assert)(this.message, typeof value !== 'string');
          return value;
        }

        get(property) {
          return this.component.get(property);
        }

      }

      helper$1 = (_vm, args) => new ComponentAssertionReference(args.positional.at(0), args.positional.at(1).value());
    } else {
    helper$1 = (_vm, args) => args.positional.at(0);
  }

  var componentAssertionHelper = helper$1;

  function classHelper({
    positional
  }) {
    let path = positional.at(0);
    let args = positional.length;
    let value = path.value();

    if (value === true) {
      if (args > 1) {
        return (0, _string.dasherize)(positional.at(1).value());
      }

      return null;
    }

    if (value === false) {
      if (args > 2) {
        return (0, _string.dasherize)(positional.at(2).value());
      }

      return null;
    }

    return value;
  }

  function classHelper$1(_vm, args) {
    return new InternalHelperReference(classHelper, args.capture());
  }

  function inputTypeHelper({
    positional
  }) {
    let type = positional.at(0).value();

    if (type === 'checkbox') {
      return '-checkbox';
    }

    return '-text-field';
  }

  function inputTypeHelper$1(_vm, args) {
    return new InternalHelperReference(inputTypeHelper, args.capture());
  }

  function normalizeClass({
    positional
  }) {
    let classNameParts = positional.at(0).value().split('.');
    let className = classNameParts[classNameParts.length - 1];
    let value = positional.at(1).value();

    if (value === true) {
      return (0, _string.dasherize)(className);
    } else if (!value && value !== 0) {
      return '';
    } else {
      return String(value);
    }
  }

  function normalizeClassHelper(_vm, args) {
    return new InternalHelperReference(normalizeClass, args.capture());
  }
  /**
  @module ember
  */

  /**
  @module ember
  */

  /**
     Use the `{{array}}` helper to create an array to pass as an option to your
     components.
  
     ```handlebars
     <MyComponent @people={{array
       'Tom Dade'
       'Yehuda Katz'
       this.myOtherPerson}}
     />
     ```
      or
     ```handlebars
     {{my-component people=(array
       'Tom Dade'
       'Yehuda Katz'
       this.myOtherPerson)
     }}
     ```
  
     Would result in an object such as:
  
     ```js
     ['Tom Date', 'Yehuda Katz', this.get('myOtherPerson')]
     ```
  
     Where the 3rd item in the array is bound to updates of the `myOtherPerson` property.
  
     @method array
     @for Ember.Templates.helpers
     @param {Array} options
     @return {Array} Array
     @since 3.8.0
     @public
   */


  function array(_vm, args) {
    return args.positional.capture();
  }

  const isEmpty = value => {
    return value === null || value === undefined || typeof value.toString !== 'function';
  };

  const normalizeTextValue = value => {
    if (isEmpty(value)) {
      return '';
    }

    return String(value);
  };
  /**
  @module ember
  */

  /**
    Concatenates the given arguments into a string.
  
    Example:
  
    ```handlebars
    {{some-component name=(concat firstName " " lastName)}}
  
    {{! would pass name="<first name value> <last name value>" to the component}}
    ```
  
    or for angle bracket invocation, you actually don't need concat at all.
  
    ```handlebars
    <SomeComponent @name="{{firstName}} {{lastName}}" />
    ```
  
    @public
    @method concat
    @for Ember.Templates.helpers
    @since 1.13.0
  */


  function concat({
    positional
  }) {
    return positional.value().map(normalizeTextValue).join('');
  }

  function concat$1(_vm, args) {
    return new InternalHelperReference(concat, args.capture());
  }

  function buildUntouchableThis(source) {
    let context = null;

    if (false
    /* DEBUG */
    && _utils.HAS_NATIVE_PROXY) {
      let assertOnProperty = property => {
        false && !false && (0, _debug.assert)("You accessed `this." + String(property) + "` from a function passed to the " + source + ", but the function itself was not bound to a valid `this` context. Consider updating to usage of `@action`.");
      };

      context = new Proxy({}, {
        get(_target, property) {
          assertOnProperty(property);
        },

        set(_target, property) {
          assertOnProperty(property);
          return false;
        },

        has(_target, property) {
          assertOnProperty(property);
          return false;
        }

      });
    }

    return context;
  }

  const context = buildUntouchableThis('`fn` helper');
  /**
  @module ember
  */

  /**
    The `fn` helper allows you to ensure a function that you are passing off
    to another component, helper, or modifier has access to arguments that are
    available in the template.
  
    For example, if you have an `each` helper looping over a number of items, you
    may need to pass a function that expects to receive the item as an argument
    to a component invoked within the loop. Here's how you could use the `fn`
    helper to pass both the function and its arguments together:
  
      ```app/templates/components/items-listing.hbs
    {{#each @items as |item|}}
      <DisplayItem @item=item @select={{fn this.handleSelected item}} />
    {{/each}}
    ```
  
    ```app/components/items-list.js
    import Component from '@glimmer/component';
    import { action } from '@ember/object';
  
    export default class ItemsList extends Component {
      @action
      handleSelected(item) {
        // ...snip...
      }
    }
    ```
  
    In this case the `display-item` component will receive a normal function
    that it can invoke. When it invokes the function, the `handleSelected`
    function will receive the `item` and any arguments passed, thanks to the
    `fn` helper.
  
    Let's take look at what that means in a couple circumstances:
  
    - When invoked as `this.args.select()` the `handleSelected` function will
      receive the `item` from the loop as its first and only argument.
    - When invoked as `this.args.select('foo')` the `handleSelected` function
      will receive the `item` from the loop as its first argument and the
      string `'foo'` as its second argument.
  
    In the example above, we used `@action` to ensure that `handleSelected` is
    properly bound to the `items-list`, but let's explore what happens if we
    left out `@action`:
  
    ```app/components/items-list.js
    import Component from '@glimmer/component';
  
    export default class ItemsList extends Component {
      handleSelected(item) {
        // ...snip...
      }
    }
    ```
  
    In this example, when `handleSelected` is invoked inside the `display-item`
    component, it will **not** have access to the component instance. In other
    words, it will have no `this` context, so please make sure your functions
    are bound (via `@action` or other means) before passing into `fn`!
  
    See also [partial application](https://en.wikipedia.org/wiki/Partial_application).
  
    @method fn
    @for Ember.Templates.helpers
    @public
    @since 3.11.0
  */

  function fnHelper({
    positional
  }) {
    let callbackRef = positional.at(0);

    if (false
    /* DEBUG */
    && typeof callbackRef[INVOKE] !== 'function') {
      let callback = callbackRef.value();
      false && !(typeof callback === 'function') && (0, _debug.assert)("You must pass a function as the `fn` helpers first argument, you passed " + callback, typeof callback === 'function');
    }

    return (...invocationArgs) => {
      let [fn, ...args] = positional.value();

      if (typeof callbackRef[INVOKE] === 'function') {
        // references with the INVOKE symbol expect the function behind
        // the symbol to be bound to the reference
        return callbackRef[INVOKE](...args, ...invocationArgs);
      } else {
        return fn['call'](context, ...args, ...invocationArgs);
      }
    };
  }

  function fn(_vm, args) {
    return new InternalHelperReference(fnHelper, args.capture());
  }
  /**
  @module ember
  */

  /**
    Dynamically look up a property on an object. The second argument to `{{get}}`
    should have a string value, although it can be bound.
  
    For example, these two usages are equivalent:
  
    ```handlebars
    {{person.height}}
    {{get person "height"}}
    ```
  
    If there were several facts about a person, the `{{get}}` helper can dynamically
    pick one:
  
    ```handlebars
    {{get person factName}}
    ```
  
    For a more complex example, this template would allow the user to switch
    between showing the user's height and weight with a click:
  
    ```handlebars
    {{get person factName}}
    <button {{action (fn (mut factName)) "height"}}>Show height</button>
    <button {{action (fn (mut factName)) "weight"}}>Show weight</button>
    ```
  
    The `{{get}}` helper can also respect mutable values itself. For example:
  
    ```handlebars
    {{input value=(mut (get person factName)) type="text"}}
    <button {{action (fn (mut factName)) "height"}}>Show height</button>
    <button {{action (fn (mut factName)) "weight"}}>Show weight</button>
    ```
  
    Would allow the user to swap what fact is being displayed, and also edit
    that fact via a two-way mutable binding.
  
    @public
    @method get
    @for Ember.Templates.helpers
    @since 2.1.0
   */


  function get$1(_vm, args) {
    return GetHelperReference.create(args.positional.at(0), args.positional.at(1));
  }

  function referenceFromPath(source, path) {
    let innerReference;

    if (path === undefined || path === null || path === '') {
      innerReference = _runtime2.NULL_REFERENCE;
    } else if (typeof path === 'string' && path.indexOf('.') > -1) {
      innerReference = referenceFromParts(source, path.split('.'));
    } else {
      innerReference = source.get(path);
    }

    return innerReference;
  }

  class GetHelperReference extends CachedReference$1 {
    static create(sourceReference, pathReference) {
      if ((0, _reference.isConst)(pathReference)) {
        let path = pathReference.value();
        return referenceFromPath(sourceReference, path);
      } else {
        return new GetHelperReference(sourceReference, pathReference);
      }
    }

    constructor(sourceReference, pathReference) {
      super();
      this.sourceReference = sourceReference;
      this.pathReference = pathReference;
      this.lastPath = null;
      this.innerReference = _runtime2.NULL_REFERENCE;

      let innerTag = this.innerTag = _reference.UpdatableTag.create(_reference.CONSTANT_TAG);

      this.tag = (0, _reference.combine)([sourceReference.tag, pathReference.tag, innerTag]);
    }

    compute() {
      let {
        lastPath,
        innerReference,
        innerTag
      } = this;
      let path = this.pathReference.value();

      if (path !== lastPath) {
        innerReference = referenceFromPath(this.sourceReference, path);
        innerTag.inner.update(innerReference.tag);
        this.innerReference = innerReference;
        this.lastPath = path;
      }

      return innerReference.value();
    }

    [UPDATE](value) {
      (0, _metal.set)(this.sourceReference.value(), this.pathReference.value(), value);
    }

  }
  /**
  @module ember
  */

  /**
     Use the `{{hash}}` helper to create a hash to pass as an option to your
     components. This is specially useful for contextual components where you can
     just yield a hash:
  
     ```handlebars
     {{yield (hash
        name='Sarah'
        title=office
     )}}
     ```
  
     Would result in an object such as:
  
     ```js
     { name: 'Sarah', title: this.get('office') }
     ```
  
     Where the `title` is bound to updates of the `office` property.
  
     Note that the hash is an empty object with no prototype chain, therefore
     common methods like `toString` are not available in the resulting hash.
     If you need to use such a method, you can use the `call` or `apply`
     approach:
  
     ```js
     function toString(obj) {
       return Object.prototype.toString.apply(obj);
     }
     ```
  
     @method hash
     @for Ember.Templates.helpers
     @param {Object} options
     @return {Object} Hash
     @since 2.3.0
     @public
   */


  function hash(_vm, args) {
    return args.named.capture();
  }
  /**
  @module ember
  */


  class ConditionalHelperReference extends CachedReference$1 {
    static create(_condRef, truthyRef, falsyRef) {
      let condRef = ConditionalReference$1.create(_condRef);

      if ((0, _reference.isConst)(condRef)) {
        return condRef.value() ? truthyRef : falsyRef;
      } else {
        return new ConditionalHelperReference(condRef, truthyRef, falsyRef);
      }
    }

    constructor(cond, truthy, falsy) {
      super();
      this.branchTag = _reference.UpdatableTag.create(_reference.CONSTANT_TAG);
      this.tag = (0, _reference.combine)([cond.tag, this.branchTag]);
      this.cond = cond;
      this.truthy = truthy;
      this.falsy = falsy;
    }

    compute() {
      let branch = this.cond.value() ? this.truthy : this.falsy;
      this.branchTag.inner.update(branch.tag);
      return branch.value();
    }

  }
  /**
    The `if` helper allows you to conditionally render one of two branches,
    depending on the "truthiness" of a property.
    For example the following values are all falsey: `false`, `undefined`, `null`, `""`, `0`, `NaN` or an empty array.
  
    This helper has two forms, block and inline.
  
    ## Block form
  
    You can use the block form of `if` to conditionally render a section of the template.
  
    To use it, pass the conditional value to the `if` helper,
    using the block form to wrap the section of template you want to conditionally render.
    Like so:
  
    ```handlebars
    {{! will not render if foo is falsey}}
    {{#if foo}}
      Welcome to the {{foo.bar}}
    {{/if}}
    ```
  
    You can also specify a template to show if the property is falsey by using
    the `else` helper.
  
    ```handlebars
    {{! is it raining outside?}}
    {{#if isRaining}}
      Yes, grab an umbrella!
    {{else}}
      No, it's lovely outside!
    {{/if}}
    ```
  
    You are also able to combine `else` and `if` helpers to create more complex
    conditional logic.
  
    ```handlebars
    {{#if isMorning}}
      Good morning
    {{else if isAfternoon}}
      Good afternoon
    {{else}}
      Good night
    {{/if}}
    ```
  
    ## Inline form
  
    The inline `if` helper conditionally renders a single property or string.
  
    In this form, the `if` helper receives three arguments, the conditional value,
    the value to render when truthy, and the value to render when falsey.
  
    For example, if `useLongGreeting` is truthy, the following:
  
    ```handlebars
    {{if useLongGreeting "Hello" "Hi"}} Alex
    ```
  
    Will render:
  
    ```html
    Hello Alex
    ```
  
    ### Nested `if`
  
    You can use the `if` helper inside another helper as a nested helper:
  
    ```handlebars
    <SomeComponent @height={{if isBig "100" "10"}} />
    ```
  
    or
  
    ```handlebars
    {{some-component height=(if isBig "100" "10")}}
    ```
  
    One detail to keep in mind is that both branches of the `if` helper will be evaluated,
    so if you have `{{if condition "foo" (expensive-operation "bar")`,
    `expensive-operation` will always calculate.
  
    @method if
    @for Ember.Templates.helpers
    @public
  */


  function inlineIf(_vm, {
    positional
  }) {
    false && !(positional.length === 3 || positional.length === 2) && (0, _debug.assert)('The inline form of the `if` helper expects two or three arguments, e.g. ' + '`{{if trialExpired "Expired" expiryDate}}`.', positional.length === 3 || positional.length === 2);
    return ConditionalHelperReference.create(positional.at(0), positional.at(1), positional.at(2));
  }
  /**
    The `unless` helper is the inverse of the `if` helper. It displays if a value
    is falsey ("not true" or "is false"). Example values that will display with
    `unless`: `false`, `undefined`, `null`, `""`, `0`, `NaN` or an empty array.
  
    ## Inline form
  
    The inline `unless` helper conditionally renders a single property or string.
    This helper acts like a ternary operator. If the first property is falsy,
    the second argument will be displayed, otherwise, the third argument will be
    displayed
  
    For example, if `useLongGreeting` is false below:
  
    ```handlebars
    {{unless useLongGreeting "Hi" "Hello"}} Ben
    ```
  
    Then it will display:
  
    ```html
    Hi
    ```
  
    You can use the `unless` helper inside another helper as a subexpression.
    If isBig is not true, it will set the height to 10:
  
    ```handlebars
    {{! If isBig is not true, it will set the height to 10.}}
    <SomeComponent @height={{unless isBig "10" "100"}} />
    ```
  
    or
  
    ```handlebars
    {{some-component height=(unless isBig "10" "100")}}
    ```
  
    ## Block form
  
    Like the `if` helper, `unless` helper also has a block form.
  
    ```handlebars
    {{! If greetings are found, the text below will not render.}}
    {{#unless greetings}}
      No greetings were found. Why not set one?
    {{/unless}}
    ```
  
    You can also use an `else` helper with the `unless` block. The
    `else` will display if the value is truthy.
  
    ```handlebars
    {{! Is the user logged in?}}
    {{#unless userData}}
      Please login.
    {{else}}
      Welcome back!
    {{/unless}}
    ```
  
    If `userData` is false, undefined, null, or empty in the above example,
    then it will render:
  
    ```html
    Please login.
    ```
  
    @method unless
    @for Ember.Templates.helpers
    @public
  */


  function inlineUnless(_vm, {
    positional
  }) {
    false && !(positional.length === 3 || positional.length === 2) && (0, _debug.assert)('The inline form of the `unless` helper expects two or three arguments, e.g. ' + '`{{unless isFirstLogin "Welcome back!"}}`.', positional.length === 3 || positional.length === 2);
    return ConditionalHelperReference.create(positional.at(0), positional.at(2), positional.at(1));
  }
  /**
  @module ember
  */

  /**
    `log` allows you to output the value of variables in the current rendering
    context. `log` also accepts primitive types such as strings or numbers.
  
    ```handlebars
    {{log "myVariable:" myVariable }}
    ```
  
    @method log
    @for Ember.Templates.helpers
    @param {Array} params
    @public
  */


  function log({
    positional
  }) {
    /* eslint-disable no-console */
    console.log(...positional.value());
    /* eslint-enable no-console */
  }

  function log$1(_vm, args) {
    return new InternalHelperReference(log, args.capture());
  }
  /**
  @module ember
  */

  /**
    The `mut` helper lets you __clearly specify__ that a child `Component` can update the
    (mutable) value passed to it, which will __change the value of the parent component__.
  
    To specify that a parameter is mutable, when invoking the child `Component`:
  
    ```handlebars
    <MyChild @childClickCount={{fn (mut totalClicks)}} />
    ```
  
     or
  
    ```handlebars
    {{my-child childClickCount=(mut totalClicks)}}
    ```
  
    The child `Component` can then modify the parent's value just by modifying its own
    property:
  
    ```javascript
    // my-child.js
    export default Component.extend({
      click() {
        this.incrementProperty('childClickCount');
      }
    });
    ```
  
    Note that for curly components (`{{my-component}}`) the bindings are already mutable,
    making the `mut` unnecessary.
  
    Additionally, the `mut` helper can be combined with the `fn` helper to
    mutate a value. For example:
  
    ```handlebars
    <MyChild @childClickCount={{this.totalClicks}} @click-count-change={{fn (mut totalClicks))}} />
    ```
  
    or
  
    ```handlebars
    {{my-child childClickCount=totalClicks click-count-change=(fn (mut totalClicks))}}
    ```
  
    The child `Component` would invoke the function with the new click value:
  
    ```javascript
    // my-child.js
    export default Component.extend({
      click() {
        this.get('click-count-change')(this.get('childClickCount') + 1);
      }
    });
    ```
  
    The `mut` helper changes the `totalClicks` value to what was provided as the `fn` argument.
  
    The `mut` helper, when used with `fn`, will return a function that
    sets the value passed to `mut` to its first argument. As an example, we can create a
    button that increments a value passing the value directly to the `fn`:
  
    ```handlebars
    {{! inc helper is not provided by Ember }}
    <button onclick={{fn (mut count) (inc count)}}>
      Increment count
    </button>
    ```
  
    You can also use the `value` option:
  
    ```handlebars
    <input value={{name}} oninput={{fn (mut name) value="target.value"}}>
    ```
  
    @method mut
    @param {Object} [attr] the "two-way" attribute that can be modified.
    @for Ember.Templates.helpers
    @public
  */


  const MUT_REFERENCE = (0, _utils.symbol)('MUT');
  const SOURCE = (0, _utils.symbol)('SOURCE');

  function isMut(ref) {
    return ref && ref[MUT_REFERENCE];
  }

  function unMut(ref) {
    return ref[SOURCE] || ref;
  }

  function mut(_vm, args) {
    let rawRef = args.positional.at(0);

    if (isMut(rawRef)) {
      return rawRef;
    } // TODO: Improve this error message. This covers at least two distinct
    // cases:
    //
    // 1. (mut "not a path") – passing a literal, result from a helper
    //    invocation, etc
    //
    // 2. (mut receivedValue) – passing a value received from the caller
    //    that was originally derived from a literal, result from a helper
    //    invocation, etc
    //
    // This message is alright for the first case, but could be quite
    // confusing for the second case.


    false && !rawRef[UPDATE] && (0, _debug.assert)('You can only pass a path to mut', rawRef[UPDATE]);
    let wrappedRef = Object.create(rawRef);
    wrappedRef[SOURCE] = rawRef;
    wrappedRef[INVOKE] = rawRef[UPDATE];
    wrappedRef[MUT_REFERENCE] = true;
    return wrappedRef;
  }
  /**
  @module ember
  */

  /**
    This is a helper to be used in conjunction with the link-to helper.
    It will supply url query parameters to the target route.
  
    Example
  
    ```handlebars
    {{#link-to 'posts' (query-params direction="asc")}}Sort{{/link-to}}
    ```
  
    @method query-params
    @for Ember.Templates.helpers
    @param {Object} hash takes a hash of query parameters
    @return {Object} A `QueryParams` object for `{{link-to}}`
    @public
  */


  function queryParams({
    positional,
    named
  }) {
    // tslint:disable-next-line:max-line-length
    false && !(positional.value().length === 0) && (0, _debug.assert)("The `query-params` helper only accepts hash parameters, e.g. (query-params queryParamPropertyName='foo') as opposed to just (query-params 'foo')", positional.value().length === 0);
    return new _routing.QueryParams((0, _polyfills.assign)({}, named.value()));
  }

  function queryParams$1(_vm, args) {
    return new InternalHelperReference(queryParams, args.capture());
  }
  /**
    The `readonly` helper let's you specify that a binding is one-way only,
    instead of two-way.
    When you pass a `readonly` binding from an outer context (e.g. parent component),
    to to an inner context (e.g. child component), you are saying that changing that
    property in the inner context does not change the value in the outer context.
  
    To specify that a binding is read-only, when invoking the child `Component`:
  
    ```app/components/my-parent.js
    export default Component.extend({
      totalClicks: 3
    });
    ```
  
    ```app/templates/components/my-parent.hbs
    {{log totalClicks}} // -> 3
    <MyChild @childClickCount={{readonly totalClicks}} />
    ```
    ```
    {{my-child childClickCount=(readonly totalClicks)}}
    ```
  
    Now, when you update `childClickCount`:
  
    ```app/components/my-child.js
    export default Component.extend({
      click() {
        this.incrementProperty('childClickCount');
      }
    });
    ```
  
    The value updates in the child component, but not the parent component:
  
    ```app/templates/components/my-child.hbs
    {{log childClickCount}} //-> 4
    ```
  
    ```app/templates/components/my-parent.hbs
    {{log totalClicks}} //-> 3
    <MyChild @childClickCount={{readonly totalClicks}} />
    ```
    or
    ```app/templates/components/my-parent.hbs
    {{log totalClicks}} //-> 3
    {{my-child childClickCount=(readonly totalClicks)}}
    ```
  
    ### Objects and Arrays
  
    When passing a property that is a complex object (e.g. object, array) instead of a primitive object (e.g. number, string),
    only the reference to the object is protected using the readonly helper.
    This means that you can change properties of the object both on the parent component, as well as the child component.
    The `readonly` binding behaves similar to the `const` keyword in JavaScript.
  
    Let's look at an example:
  
    First let's set up the parent component:
  
    ```app/components/my-parent.js
    import Component from '@ember/component';
  
    export default Component.extend({
      clicks: null,
  
      init() {
        this._super(...arguments);
        this.set('clicks', { total: 3 });
      }
    });
    ```
  
    ```app/templates/components/my-parent.hbs
    {{log clicks.total}} //-> 3
    <MyChild @childClicks={{readonly clicks}} />
    ```
    ```app/templates/components/my-parent.hbs
    {{log clicks.total}} //-> 3
    {{my-child childClicks=(readonly clicks)}}
    ```
  
    Now, if you update the `total` property of `childClicks`:
  
    ```app/components/my-child.js
    import Component from '@ember/component';
  
    export default Component.extend({
      click() {
        this.get('clicks').incrementProperty('total');
      }
    });
    ```
  
    You will see the following happen:
  
    ```app/templates/components/my-parent.hbs
    {{log clicks.total}} //-> 4
    <MyChild @childClicks={{readonly clicks}} />
    ```
    or
    ```app/templates/components/my-parent.hbs
    {{log clicks.total}} //-> 4
    {{my-child childClicks=(readonly clicks)}}
    ```
  
    ```app/templates/components/my-child.hbs
    {{log childClicks.total}} //-> 4
    ```
  
    @method readonly
    @param {Object} [attr] the read-only attribute.
    @for Ember.Templates.helpers
    @private
  */


  function readonly(_vm, args) {
    let ref = unMut(args.positional.at(0));
    return new ReadonlyReference(ref);
  }
  /**
  @module ember
  */

  /**
    The `{{unbound}}` helper disconnects the one-way binding of a property,
    essentially freezing its value at the moment of rendering. For example,
    in this example the display of the variable `name` will not change even
    if it is set with a new value:
  
    ```handlebars
    {{unbound name}}
    ```
  
    Like any helper, the `unbound` helper can accept a nested helper expression.
    This allows for custom helpers to be rendered unbound:
  
    ```handlebars
    {{unbound (some-custom-helper)}}
    {{unbound (capitalize name)}}
    {{! You can use any helper, including unbound, in a nested expression }}
    {{capitalize (unbound name)}}
    ```
  
    The `unbound` helper only accepts a single argument, and it return an
    unbound value.
  
    @method unbound
    @for Ember.Templates.helpers
    @public
  */


  function unbound(_vm, args) {
    false && !(args.positional.length === 1 && args.named.length === 0) && (0, _debug.assert)('unbound helper cannot be called with multiple params or hash params', args.positional.length === 1 && args.named.length === 0);
    return UnboundReference.create(args.positional.at(0).value());
  }

  function capabilities$1(_managerAPI, _optionalFeatures) {
    return {};
  }

  class CustomModifierDefinition {
    constructor(name, ModifierClass, delegate, isInteractive) {
      this.name = name;
      this.ModifierClass = ModifierClass;
      this.delegate = delegate;
      this.state = {
        ModifierClass,
        name,
        delegate
      };
      this.manager = isInteractive ? CUSTOM_INTERACTIVE_MODIFIER_MANAGER : CUSTOM_NON_INTERACTIVE_MODIFIER_MANAGER;
    }

  }

  class CustomModifierState {
    constructor(element, delegate, modifier, args) {
      this.element = element;
      this.delegate = delegate;
      this.modifier = modifier;
      this.args = args;
    }

    destroy() {
      const {
        delegate,
        modifier,
        args
      } = this;
      delegate.destroyModifier(modifier, args.value());
    }

  }
  /**
    The CustomModifierManager allows addons to provide custom modifier
    implementations that integrate seamlessly into Ember. This is accomplished
    through a delegate, registered with the custom modifier manager, which
    implements a set of hooks that determine modifier behavior.
    To create a custom modifier manager, instantiate a new CustomModifierManager
    class and pass the delegate as the first argument:
  
    ```js
    let manager = new CustomModifierManager({
      // ...delegate implementation...
    });
    ```
  
    ## Delegate Hooks
  
    Throughout the lifecycle of a modifier, the modifier manager will invoke
    delegate hooks that are responsible for surfacing those lifecycle changes to
    the end developer.
    * `createModifier()` - invoked when a new instance of a modifier should be created
    * `installModifier()` - invoked when the modifier is installed on the element
    * `updateModifier()` - invoked when the arguments passed to a modifier change
    * `destroyModifier()` - invoked when the modifier is about to be destroyed
  */


  class InteractiveCustomModifierManager {
    create(element, definition, args) {
      const capturedArgs = args.capture();
      let instance = definition.delegate.createModifier(definition.ModifierClass, capturedArgs.value());
      return new CustomModifierState(element, definition.delegate, instance, capturedArgs);
    }

    getTag({
      args
    }) {
      return args.tag;
    }

    install(state) {
      let {
        element,
        args,
        delegate,
        modifier
      } = state;
      delegate.installModifier(modifier, element, args.value());
    }

    update(state) {
      let {
        args,
        delegate,
        modifier
      } = state;
      delegate.updateModifier(modifier, args.value());
    }

    getDestructor(state) {
      return state;
    }

  }

  class NonInteractiveCustomModifierManager {
    create() {
      return null;
    }

    getTag() {
      return _reference.CONSTANT_TAG;
    }

    install() {}

    update() {}

    getDestructor() {
      return null;
    }

  }

  const CUSTOM_INTERACTIVE_MODIFIER_MANAGER = new InteractiveCustomModifierManager();
  const CUSTOM_NON_INTERACTIVE_MODIFIER_MANAGER = new NonInteractiveCustomModifierManager();
  const untouchableContext = buildUntouchableThis('`on` modifier');
  /**
  @module ember
  */

  /*
    Internet Explorer 11 does not support `once` and also does not support
    passing `eventOptions`. In some situations it then throws a weird script
    error, like:
  
    ```
    Could not complete the operation due to error 80020101
    ```
  
    This flag determines, whether `{ once: true }` and thus also event options in
    general are supported.
  */

  const SUPPORTS_EVENT_OPTIONS = (() => {
    try {
      const div = document.createElement('div');
      let counter = 0;
      div.addEventListener('click', () => counter++, {
        once: true
      });
      let event;

      if (typeof Event === 'function') {
        event = new Event('click');
      } else {
        event = document.createEvent('Event');
        event.initEvent('click', true, true);
      }

      div.dispatchEvent(event);
      div.dispatchEvent(event);
      return counter === 1;
    } catch (error) {
      return false;
    }
  })();

  class OnModifierState {
    constructor(element, args) {
      this.shouldUpdate = true;
      this.element = element;
      this.args = args;
      this.tag = args.tag;
    }

    updateFromArgs() {
      let {
        args
      } = this;
      let {
        once,
        passive,
        capture
      } = args.named.value();

      if (once !== this.once) {
        this.once = once;
        this.shouldUpdate = true;
      }

      if (passive !== this.passive) {
        this.passive = passive;
        this.shouldUpdate = true;
      }

      if (capture !== this.capture) {
        this.capture = capture;
        this.shouldUpdate = true;
      }

      let options;

      if (once || passive || capture) {
        options = this.options = {
          once,
          passive,
          capture
        };
      } else {
        this.options = undefined;
      }

      false && !(args.positional.at(0) !== undefined && typeof args.positional.at(0).value() === 'string') && (0, _debug.assert)('You must pass a valid DOM event name as the first argument to the `on` modifier', args.positional.at(0) !== undefined && typeof args.positional.at(0).value() === 'string');
      let eventName = args.positional.at(0).value();

      if (eventName !== this.eventName) {
        this.eventName = eventName;
        this.shouldUpdate = true;
      }

      false && !(args.positional.at(1) !== undefined && typeof args.positional.at(1).value() === 'function') && (0, _debug.assert)('You must pass a function as the second argument to the `on` modifier', args.positional.at(1) !== undefined && typeof args.positional.at(1).value() === 'function');
      let userProvidedCallback = args.positional.at(1).value();

      if (userProvidedCallback !== this.userProvidedCallback) {
        this.userProvidedCallback = userProvidedCallback;
        this.shouldUpdate = true;
      }

      false && !(args.positional.length === 2) && (0, _debug.assert)("You can only pass two positional arguments (event name and callback) to the `on` modifier, but you provided " + args.positional.length + ". Consider using the `fn` helper to provide additional arguments to the `on` callback.", args.positional.length === 2);
      let needsCustomCallback = SUPPORTS_EVENT_OPTIONS === false && once ||
      /* needs manual once implementation */
      false
      /* DEBUG */
      && passive
      /* needs passive enforcement */
      ;

      if (this.shouldUpdate) {
        if (needsCustomCallback) {
          let callback = this.callback = function (event) {
            if (false
            /* DEBUG */
            && passive) {
              event.preventDefault = () => {
                false && !false && (0, _debug.assert)("You marked this listener as 'passive', meaning that you must not call 'event.preventDefault()': \n\n" + userProvidedCallback);
              };
            }

            if (!SUPPORTS_EVENT_OPTIONS && once) {
              removeEventListener(this, eventName, callback, options);
            }

            return userProvidedCallback.call(untouchableContext, event);
          };
        } else if (false
        /* DEBUG */
        ) {
            // prevent the callback from being bound to the element
            this.callback = userProvidedCallback.bind(untouchableContext);
          } else {
          this.callback = userProvidedCallback;
        }
      }
    }

    destroy() {
      let {
        element,
        eventName,
        callback,
        options
      } = this;
      removeEventListener(element, eventName, callback, options);
    }

  }

  let adds = 0;
  let removes = 0;

  function removeEventListener(element, eventName, callback, options) {
    removes++;

    if (SUPPORTS_EVENT_OPTIONS) {
      // when options are supported, use them across the board
      element.removeEventListener(eventName, callback, options);
    } else if (options !== undefined && options.capture) {
      // used only in the following case:
      //
      // `{ once: true | false, passive: true | false, capture: true }
      //
      // `once` is handled via a custom callback that removes after first
      // invocation so we only care about capture here as a boolean
      element.removeEventListener(eventName, callback, true);
    } else {
      // used only in the following cases:
      //
      // * where there is no options
      // * `{ once: true | false, passive: true | false, capture: false }
      element.removeEventListener(eventName, callback);
    }
  }

  function addEventListener(element, eventName, callback, options) {
    adds++;

    if (SUPPORTS_EVENT_OPTIONS) {
      // when options are supported, use them across the board
      element.addEventListener(eventName, callback, options);
    } else if (options !== undefined && options.capture) {
      // used only in the following case:
      //
      // `{ once: true | false, passive: true | false, capture: true }
      //
      // `once` is handled via a custom callback that removes after first
      // invocation so we only care about capture here as a boolean
      element.addEventListener(eventName, callback, true);
    } else {
      // used only in the following cases:
      //
      // * where there is no options
      // * `{ once: true | false, passive: true | false, capture: false }
      element.addEventListener(eventName, callback);
    }
  }
  /**
    The `{{on}}` modifier lets you easily add event listeners (it uses
    [EventTarget.addEventListener](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
    internally).
  
    For example, if you'd like to run a function on your component when a `<button>`
    in the components template is clicked you might do something like:
  
    ```app/templates/components/like-post.hbs
    <button {{on 'click' this.saveLike}}>Like this post!</button>
    ```
  
    ```app/components/like-post.js
    import Component from '@glimmer/component';
    import { action } from '@ember/object';
  
    export default class LikePostComponent extends Component {
      @action
      saveLike() {
        // someone likes your post!
        // better send a request off to your server...
      }
    }
    ```
  
    ### Arguments
  
    `{{on}}` accepts two positional arguments, and a few named arguments.
  
    The positional arguments are:
  
    - `event` -- the name to use when calling `addEventListener`
    - `callback` -- the function to be passed to `addEventListener`
  
    The named arguments are:
  
    - capture -- a `true` value indicates that events of this type will be dispatched
      to the registered listener before being dispatched to any EventTarget beneath it
      in the DOM tree.
    - once -- indicates that the listener should be invoked at most once after being
      added. If true, the listener would be automatically removed when invoked.
    - passive -- if `true`, indicates that the function specified by listener will never
      call preventDefault(). If a passive listener does call preventDefault(), the user
      agent will do nothing other than generate a console warning. See
      [Improving scrolling performance with passive listeners](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#Improving_scrolling_performance_with_passive_listeners)
      to learn more.
  
    The callback function passed to `{{on}}` will receive any arguments that are passed
    to the event handler. Most commonly this would be the `event` itself.
  
    If you would like to pass additional arguments to the function you should use
    the `{{fn}}` helper.
  
    For example, in our example case above if you'd like to pass in the post that
    was being liked when the button is clicked you could do something like:
  
    ```app/templates/components/like-post.js
    <button {{on 'click' (fn this.saveLike @post)}}>Like this post!</button>
    ```
  
    In this case, the `saveLike` function will receive two arguments: the click event
    and the value of `@post`.
  
    ### Function Context
  
    In the example above, we used `@action` to ensure that `likePost` is
    properly bound to the `items-list`, but let's explore what happens if we
    left out `@action`:
  
    ```app/components/like-post.js
    import Component from '@glimmer/component';
  
    export default class LikePostComponent extends Component {
      saveLike() {
        // ...snip...
      }
    }
    ```
  
    In this example, when the button is clicked `saveLike` will be invoked,
    it will **not** have access to the component instance. In other
    words, it will have no `this` context, so please make sure your functions
    are bound (via `@action` or other means) before passing into `on`!
  
    @method on
    @for Ember.Templates.helpers
    @public
    @since 3.11.0
  */


  class OnModifierManager {
    constructor(isInteractive) {
      this.SUPPORTS_EVENT_OPTIONS = SUPPORTS_EVENT_OPTIONS;
      this.isInteractive = isInteractive;
    }

    get counters() {
      return {
        adds,
        removes
      };
    }

    create(element, _state, args) {
      if (!this.isInteractive) {
        return null;
      }

      const capturedArgs = args.capture();
      return new OnModifierState(element, capturedArgs);
    }

    getTag(state) {
      if (state === null) {
        return _reference.CONSTANT_TAG;
      }

      return state.tag;
    }

    install(state) {
      if (state === null) {
        return;
      }

      state.updateFromArgs();
      let {
        element,
        eventName,
        callback,
        options
      } = state;
      addEventListener(element, eventName, callback, options);
      state.shouldUpdate = false;
    }

    update(state) {
      if (state === null) {
        return;
      } // stash prior state for el.removeEventListener


      let {
        element,
        eventName,
        callback,
        options
      } = state;
      state.updateFromArgs();

      if (!state.shouldUpdate) {
        return;
      } // use prior state values for removal


      removeEventListener(element, eventName, callback, options); // read updated values from the state object

      addEventListener(state.element, state.eventName, state.callback, state.options);
      state.shouldUpdate = false;
    }

    getDestructor(state) {
      return state;
    }

  }

  function hashToArgs(hash) {
    if (hash === null) return null;
    let names = hash[0].map(key => "@" + key);
    return [names, hash[1]];
  }

  let inputMacro;

  if (true
  /* EMBER_GLIMMER_ANGLE_BRACKET_BUILT_INS */
  ) {
      if (false
      /* DEBUG */
      ) {
          inputMacro = () => {
            throw (0, _util.unreachable)();
          };
        }
    } else {
    /**
      The `{{input}}` helper lets you create an HTML `<input />` component.
      It causes a `TextField` component to be rendered.  For more info,
      see the [TextField](/ember/release/classes/TextField) docs and
      the [templates guide](https://guides.emberjs.com/release/templates/input-helpers/).
         ```handlebars
      {{input value="987"}}
      ```
         renders as:
         ```HTML
      <input type="text" value="987" />
      ```
         ### Text field
         If no `type` option is specified, a default of type 'text' is used.
      Many of the standard HTML attributes may be passed to this helper.
      <table>
        <tr><td>`readonly`</td><td>`required`</td><td>`autofocus`</td></tr>
        <tr><td>`value`</td><td>`placeholder`</td><td>`disabled`</td></tr>
        <tr><td>`size`</td><td>`tabindex`</td><td>`maxlength`</td></tr>
        <tr><td>`name`</td><td>`min`</td><td>`max`</td></tr>
        <tr><td>`pattern`</td><td>`accept`</td><td>`autocomplete`</td></tr>
        <tr><td>`autosave`</td><td>`formaction`</td><td>`formenctype`</td></tr>
        <tr><td>`formmethod`</td><td>`formnovalidate`</td><td>`formtarget`</td></tr>
        <tr><td>`height`</td><td>`inputmode`</td><td>`multiple`</td></tr>
        <tr><td>`step`</td><td>`width`</td><td>`form`</td></tr>
        <tr><td>`selectionDirection`</td><td>`spellcheck`</td><td>&nbsp;</td></tr>
      </table>
      When set to a quoted string, these values will be directly applied to the HTML
      element. When left unquoted, these values will be bound to a property on the
      template's current rendering context (most typically a controller instance).
      A very common use of this helper is to bind the `value` of an input to an Object's attribute:
         ```handlebars
      Search:
      {{input value=searchWord}}
      ```
         In this example, the initial value in the `<input />` will be set to the value of `searchWord`.
      If the user changes the text, the value of `searchWord` will also be updated.
         ### Actions
         The helper can send multiple actions based on user events.
      The action property defines the action which is sent when
      the user presses the return key.
         ```handlebars
      {{input action="submit"}}
      ```
         The helper allows some user events to send actions.
         * `enter`
      * `insert-newline`
      * `escape-press`
      * `focus-in`
      * `focus-out`
      * `key-press`
      * `key-up`
         For example, if you desire an action to be sent when the input is blurred,
      you only need to setup the action name to the event name property.
         ```handlebars
      {{input focus-out="alertMessage"}}
      ```
      See more about [Text Support Actions](/ember/release/classes/TextField)
         ### Extending `TextField`
         Internally, `{{input type="text"}}` creates an instance of `TextField`, passing
      arguments from the helper to `TextField`'s `create` method. You can extend the
      capabilities of text inputs in your applications by reopening this class. For example,
      if you are building a Bootstrap project where `data-*` attributes are used, you
      can add one to the `TextField`'s `attributeBindings` property:
         ```javascript
      import TextField from '@ember/component/text-field';
      TextField.reopen({
        attributeBindings: ['data-error']
      });
      ```
         Keep in mind when writing `TextField` subclasses that `TextField`
      itself extends `Component`. Expect isolated component semantics, not
      legacy 1.x view semantics (like `controller` being present).
      See more about [Ember components](/ember/release/classes/Component)
         ### Checkbox
         Checkboxes are special forms of the `{{input}}` helper.  To create a `<checkbox />`:
         ```handlebars
      Emberize Everything:
      {{input type="checkbox" name="isEmberized" checked=isEmberized}}
      ```
         This will bind checked state of this checkbox to the value of `isEmberized`  -- if either one changes,
      it will be reflected in the other.
         The following HTML attributes can be set via the helper:
         * `checked`
      * `disabled`
      * `tabindex`
      * `indeterminate`
      * `name`
      * `autofocus`
      * `form`
         ### Extending `Checkbox`
         Internally, `{{input type="checkbox"}}` creates an instance of `Checkbox`, passing
      arguments from the helper to `Checkbox`'s `create` method. You can extend the
      capablilties of checkbox inputs in your applications by reopening this class. For example,
      if you wanted to add a css class to all checkboxes in your application:
         ```javascript
      import Checkbox from '@ember/component/checkbox';
         Checkbox.reopen({
        classNames: ['my-app-checkbox']
      });
      ```
         @method input
      @for Ember.Templates.helpers
      @param {Hash} options
      @public
    */
    let buildSyntax = function buildSyntax(type, params, hash, builder) {
      let definition = builder.compiler['resolver'].lookupComponentDefinition(type, builder.referrer);
      builder.component.static(definition, [params, hashToArgs(hash), null, null]);
      return true;
    };

    inputMacro = function inputMacro(_name, params, hash, builder) {
      if (params === null) {
        params = [];
      }

      if (hash !== null) {
        let keys = hash[0];
        let values = hash[1];
        let typeIndex = keys.indexOf('type');

        if (typeIndex > -1) {
          let typeArg = values[typeIndex];

          if (Array.isArray(typeArg)) {
            // there is an AST plugin that converts this to an expression
            // it really should just compile in the component call too.
            let inputTypeExpr = params[0];
            builder.dynamicComponent(inputTypeExpr, null, params.slice(1), hash, true, null, null);
            return true;
          }

          if (typeArg === 'checkbox') {
            false && !(keys.indexOf('value') === -1) && (0, _debug.assert)("`{{input type='checkbox' value=...}}` is not supported; " + "please use `{{input type='checkbox' checked=...}}` instead.", keys.indexOf('value') === -1);
            wrapComponentClassAttribute(hash);
            return buildSyntax('-checkbox', params, hash, builder);
          }
        }
      }

      return buildSyntax('-text-field', params, hash, builder);
    };
  }
  /**
  @module ember
  */

  /**
      The `let` helper receives one or more positional arguments and yields
      them out as block params.
  
      This allows the developer to introduce shorter names for certain computations
      in the template.
  
      This is especially useful if you are passing properties to a component
      that receives a lot of options and you want to clean up the invocation.
  
      For the following example, the template receives a `post` object with
      `content` and `title` properties.
  
      We are going to call the `my-post` component, passing a title which is
      the title of the post suffixed with the name of the blog, the content
      of the post, and a series of options defined in-place.
  
      ```handlebars
      {{#let
          (concat post.title ' | The Ember.js Blog')
          post.content
          (hash
            theme="high-contrast"
            enableComments=true
          )
          as |title content options|
      }}
        <MyPost @title={{title}} @content={{content}} @options={{options}} />
      {{/let}}
    ```
   or
    ```handlebars
      {{#let
          (concat post.title ' | The Ember.js Blog')
          post.content
          (hash
            theme="high-contrast"
            enableComments=true
          )
          as |title content options|
      }}
        {{my-post title=title content=content options=options}}
      {{/let}}
    ```
  
    @method let
    @for Ember.Templates.helpers
    @public
  */


  function blockLetMacro(params, _hash, template, _inverse, builder) {
    if (template !== null) {
      if (params !== null) {
        builder.compileParams(params);
        builder.invokeStaticBlock(template, params.length);
      } else {
        builder.invokeStatic(template);
      }
    }

    return true;
  }

  const CAPABILITIES$4 = {
    dynamicLayout: true,
    dynamicTag: false,
    prepareArgs: false,
    createArgs: false,
    attributeHook: false,
    elementHook: false,
    createCaller: true,
    dynamicScope: true,
    updateHook: true,
    createInstance: true
  };

  class MountManager extends AbstractManager {
    getDynamicLayout(state, _) {
      let templateFactory$$1 = state.engine.lookup('template:application');
      let template = templateFactory$$1(state.engine);
      let layout = template.asLayout();
      return {
        handle: layout.compile(),
        symbolTable: layout.symbolTable
      };
    }

    getCapabilities() {
      return CAPABILITIES$4;
    }

    create(environment, state) {
      if (false
      /* DEBUG */
      ) {
          this._pushEngineToDebugStack("engine:" + state.name, environment);
        } // TODO
      // mount is a runtime helper, this shouldn't use dynamic layout
      // we should resolve the engine app template in the helper
      // it also should use the owner that looked up the mount helper.


      let engine = environment.owner.buildChildEngineInstance(state.name);
      engine.boot();
      let applicationFactory = engine.factoryFor("controller:application");
      let controllerFactory = applicationFactory || (0, _routing.generateControllerFactory)(engine, 'application');
      let controller;
      let self;
      let bucket;
      let tag;
      let modelRef = state.modelRef;

      if (modelRef === undefined) {
        controller = controllerFactory.create();
        self = new RootReference(controller);
        tag = _reference.CONSTANT_TAG;
        bucket = {
          engine,
          controller,
          self,
          tag
        };
      } else {
        let model = modelRef.value();
        let modelRev = modelRef.tag.value();
        controller = controllerFactory.create({
          model
        });
        self = new RootReference(controller);
        tag = modelRef.tag;
        bucket = {
          engine,
          controller,
          self,
          tag,
          modelRef,
          modelRev
        };
      }

      return bucket;
    }

    getSelf({
      self
    }) {
      return self;
    }

    getTag(state) {
      return state.tag;
    }

    getDestructor({
      engine
    }) {
      return engine;
    }

    didRenderLayout() {
      if (false
      /* DEBUG */
      ) {
          this.debugStack.pop();
        }
    }

    update(bucket) {
      let {
        controller,
        modelRef,
        modelRev
      } = bucket;

      if (!modelRef.tag.validate(modelRev)) {
        let model = modelRef.value();
        bucket.modelRev = modelRef.tag.value();
        controller.set('model', model);
      }
    }

  }

  const MOUNT_MANAGER = new MountManager();

  class MountDefinition {
    constructor(name, modelRef) {
      this.manager = MOUNT_MANAGER;
      this.state = {
        name,
        modelRef
      };
    }

  }

  function mountHelper(vm, args) {
    let env = vm.env;
    let nameRef = args.positional.at(0);
    let modelRef = args.named.has('model') ? args.named.get('model') : undefined;
    return new DynamicEngineReference(nameRef, env, modelRef);
  }
  /**
    The `{{mount}}` helper lets you embed a routeless engine in a template.
    Mounting an engine will cause an instance to be booted and its `application`
    template to be rendered.
  
    For example, the following template mounts the `ember-chat` engine:
  
    ```handlebars
    {{! application.hbs }}
    {{mount "ember-chat"}}
    ```
  
    Additionally, you can also pass in a `model` argument that will be
    set as the engines model. This can be an existing object:
  
    ```
    <div>
      {{mount 'admin' model=userSettings}}
    </div>
    ```
  
    Or an inline `hash`, and you can even pass components:
  
    ```
    <div>
      <h1>Application template!</h1>
      {{mount 'admin' model=(hash
          title='Secret Admin'
          signInButton=(component 'sign-in-button')
      )}}
    </div>
    ```
  
    @method mount
    @param {String} name Name of the engine to mount.
    @param {Object} [model] Object that will be set as
                            the model of the engine.
    @for Ember.Templates.helpers
    @public
  */


  function mountMacro(_name, params, hash, builder) {
    false && !(params.length === 1) && (0, _debug.assert)('You can only pass a single positional argument to the {{mount}} helper, e.g. {{mount "chat-engine"}}.', params.length === 1);
    let expr = [_wireFormat.Ops.Helper, '-mount', params || [], hash];
    builder.dynamicComponent(expr, null, [], null, false, null, null);
    return true;
  }

  class DynamicEngineReference {
    constructor(nameRef, env, modelRef) {
      this.tag = nameRef.tag;
      this.nameRef = nameRef;
      this.modelRef = modelRef;
      this.env = env;
      this._lastName = null;
      this._lastDef = null;
    }

    value() {
      let {
        env,
        nameRef,
        modelRef
      } = this;
      let name = nameRef.value();

      if (typeof name === 'string') {
        if (this._lastName === name) {
          return this._lastDef;
        }

        false && !env.owner.hasRegistration("engine:" + name) && (0, _debug.assert)("You used `{{mount '" + name + "'}}`, but the engine '" + name + "' can not be found.", env.owner.hasRegistration("engine:" + name));

        if (!env.owner.hasRegistration("engine:" + name)) {
          return null;
        }

        this._lastName = name;
        this._lastDef = (0, _runtime2.curry)(new MountDefinition(name, modelRef));
        return this._lastDef;
      } else {
        false && !(name === null || name === undefined) && (0, _debug.assert)("Invalid engine name '" + name + "' specified, engine name must be either a string, null or undefined.", name === null || name === undefined);
        this._lastDef = null;
        this._lastName = null;
        return null;
      }
    }

    get() {
      return _runtime2.UNDEFINED_REFERENCE;
    }

  }
  /**
   * Represents the root outlet.
   */


  class RootOutletReference {
    constructor(outletState) {
      this.outletState = outletState;
      this.tag = _reference.DirtyableTag.create();
    }

    get(key) {
      return new PathReference(this, key);
    }

    value() {
      return this.outletState;
    }

    update(state) {
      this.outletState.outlets.main = state;
      this.tag.inner.dirty();
    }

  }
  /**
   * Represents the connected outlet.
   */


  class OutletReference {
    constructor(parentStateRef, outletNameRef) {
      this.parentStateRef = parentStateRef;
      this.outletNameRef = outletNameRef;
      this.tag = (0, _reference.combine)([parentStateRef.tag, outletNameRef.tag]);
    }

    value() {
      let outletState = this.parentStateRef.value();
      let outlets = outletState === undefined ? undefined : outletState.outlets;
      return outlets === undefined ? undefined : outlets[this.outletNameRef.value()];
    }

    get(key) {
      return new PathReference(this, key);
    }

  }
  /**
   * Outlet state is dirtied from root.
   * This just using the parent tag for dirtiness.
   */


  class PathReference {
    constructor(parent, key) {
      this.parent = parent;
      this.key = key;
      this.tag = parent.tag;
    }

    get(key) {
      return new PathReference(this, key);
    }

    value() {
      let parent = this.parent.value();
      return parent && parent[this.key];
    }

  }
  /**
    The `{{outlet}}` helper lets you specify where a child route will render in
    your template. An important use of the `{{outlet}}` helper is in your
    application's `application.hbs` file:
  
    ```handlebars
    {{! app/templates/application.hbs }}
    <!-- header content goes here, and will always display -->
    <MyHeader />
    <div class="my-dynamic-content">
      <!-- this content will change based on the current route, which depends on the current URL -->
      {{outlet}}
    </div>
    <!-- footer content goes here, and will always display -->
    <MyFooter />
    ```
  
    You may also specify a name for the `{{outlet}}`, which is useful when using more than one
    `{{outlet}}` in a template:
  
    ```handlebars
    {{outlet "menu"}}
    {{outlet "sidebar"}}
    {{outlet "main"}}
    ```
  
    Your routes can then render into a specific one of these `outlet`s by specifying the `outlet`
    attribute in your `renderTemplate` function:
  
    ```app/routes/menu.js
    import Route from '@ember/routing/route';
  
    export default Route.extend({
      renderTemplate() {
        this.render({ outlet: 'menu' });
      }
    });
    ```
  
    See the [routing guide](https://guides.emberjs.com/release/routing/rendering-a-template/) for more
    information on how your `route` interacts with the `{{outlet}}` helper.
    Note: Your content __will not render__ if there isn't an `{{outlet}}` for it.
  
    @method outlet
    @param {String} [name]
    @for Ember.Templates.helpers
    @public
  */


  function outletHelper(vm, args) {
    let scope = vm.dynamicScope();
    let nameRef;

    if (args.positional.length === 0) {
      nameRef = new _reference.ConstReference('main');
    } else {
      nameRef = args.positional.at(0);
    }

    return new OutletComponentReference(new OutletReference(scope.outletState, nameRef));
  }

  function outletMacro(_name, params, hash, builder) {
    let expr = [_wireFormat.Ops.Helper, '-outlet', params || [], hash];
    builder.dynamicComponent(expr, null, [], null, false, null, null);
    return true;
  }

  class OutletComponentReference {
    constructor(outletRef) {
      this.outletRef = outletRef;
      this.definition = null;
      this.lastState = null; // The router always dirties the root state.

      this.tag = outletRef.tag;
    }

    value() {
      let state = stateFor(this.outletRef);

      if (validate(state, this.lastState)) {
        return this.definition;
      }

      this.lastState = state;
      let definition = null;

      if (state !== null) {
        definition = (0, _runtime2.curry)(new OutletComponentDefinition(state));
      }

      return this.definition = definition;
    }

    get(_key) {
      return _runtime2.UNDEFINED_REFERENCE;
    }

  }

  function stateFor(ref) {
    let outlet = ref.value();
    if (outlet === undefined) return null;
    let render = outlet.render;
    if (render === undefined) return null;
    let template$$1 = render.template;
    if (template$$1 === undefined) return null; // this guard can be removed once @ember/test-helpers@1.6.0 has "aged out"
    // and is no longer considered supported

    if (isTemplateFactory(template$$1)) {
      template$$1 = template$$1(render.owner);
    }

    return {
      ref,
      name: render.name,
      outlet: render.outlet,
      template: template$$1,
      controller: render.controller
    };
  }

  function validate(state, lastState) {
    if (state === null) {
      return lastState === null;
    }

    if (lastState === null) {
      return false;
    }

    return state.template === lastState.template && state.controller === lastState.controller;
  }

  let textAreaMacro;

  if (true
  /* EMBER_GLIMMER_ANGLE_BRACKET_BUILT_INS */
  ) {
      if (false
      /* DEBUG */
      ) {
          textAreaMacro = () => {
            throw (0, _util.unreachable)();
          };
        }
    } else {
    textAreaMacro = function textAreaMacro(_name, params, hash, builder) {
      let definition = builder.compiler['resolver'].lookupComponentDefinition('-text-area', builder.referrer);
      wrapComponentClassAttribute(hash);
      builder.component.static(definition, [params || [], hashToArgs(hash), null, null]);
      return true;
    };
  }

  function refineInlineSyntax(name, params, hash, builder) {
    false && !!(builder.compiler['resolver']['resolver']['builtInHelpers'][name] && builder.referrer.owner.hasRegistration("helper:" + name)) && (0, _debug.assert)("You attempted to overwrite the built-in helper \"" + name + "\" which is not allowed. Please rename the helper.", !(builder.compiler['resolver']['resolver']['builtInHelpers'][name] && builder.referrer.owner.hasRegistration("helper:" + name)));

    if (!true
    /* EMBER_GLIMMER_ANGLE_BRACKET_BUILT_INS */
    && name.indexOf('-') === -1) {
      return false;
    }

    let handle = builder.compiler['resolver'].lookupComponentDefinition(name, builder.referrer);

    if (handle !== null) {
      builder.component.static(handle, [params === null ? [] : params, hashToArgs(hash), null, null]);
      return true;
    }

    return false;
  }

  function refineBlockSyntax(name, params, hash, template, inverse, builder) {
    if (!true
    /* EMBER_GLIMMER_ANGLE_BRACKET_BUILT_INS */
    && name.indexOf('-') === -1) {
      return false;
    }

    let handle = builder.compiler['resolver'].lookupComponentDefinition(name, builder.referrer);

    if (handle !== null) {
      wrapComponentClassAttribute(hash);
      builder.component.static(handle, [params, hashToArgs(hash), template, inverse]);
      return true;
    }

    false && !builder.referrer.owner.hasRegistration("helper:" + name) && (0, _debug.assert)("A component or helper named \"" + name + "\" could not be found", builder.referrer.owner.hasRegistration("helper:" + name));
    false && !!(() => {
      const resolver = builder.compiler['resolver']['resolver'];
      const {
        owner,
        moduleName
      } = builder.referrer;

      if (name === 'component' || resolver['builtInHelpers'][name]) {
        return true;
      }

      let options = {
        source: "template:" + moduleName
      };
      return owner.hasRegistration("helper:" + name, options) || owner.hasRegistration("helper:" + name);
    })() && (0, _debug.assert)("Helpers may not be used in the block form, for example {{#" + name + "}}{{/" + name + "}}. Please use a component, or alternatively use the helper in combination with a built-in Ember helper, for example {{#if (" + name + ")}}{{/if}}.", !(() => {
      const resolver = builder.compiler['resolver']['resolver'];
      const {
        owner,
        moduleName
      } = builder.referrer;

      if (name === 'component' || resolver['builtInHelpers'][name]) {
        return true;
      }

      let options = {
        source: "template:" + moduleName
      };
      return owner.hasRegistration("helper:" + name, options) || owner.hasRegistration("helper:" + name);
    })());
    return false;
  }

  const experimentalMacros = []; // This is a private API to allow for experimental macros
  // to be created in user space. Registering a macro should
  // should be done in an initializer.

  _exports._experimentalMacros = experimentalMacros;

  function registerMacros(macro) {
    experimentalMacros.push(macro);
  }

  function populateMacros(macros) {
    let {
      inlines,
      blocks
    } = macros;
    inlines.add('outlet', outletMacro);
    inlines.add('mount', mountMacro);

    if (!true
    /* EMBER_GLIMMER_ANGLE_BRACKET_BUILT_INS */
    ) {
        inlines.add('input', inputMacro);
        inlines.add('textarea', textAreaMacro);
      }

    inlines.addMissing(refineInlineSyntax);
    blocks.add('let', blockLetMacro);
    blocks.addMissing(refineBlockSyntax);

    for (let i = 0; i < experimentalMacros.length; i++) {
      let macro = experimentalMacros[i];
      macro(blocks, inlines);
    }

    return {
      blocks,
      inlines
    };
  }

  const TEMPLATES$1 = new WeakMap();
  const getPrototypeOf$1 = Object.getPrototypeOf;

  function setComponentTemplate(factory, obj) {
    false && !(obj !== null && (typeof obj === 'object' || typeof obj === 'function')) && (0, _debug.assert)("Cannot call `setComponentTemplate` on `" + (0, _utils.toString)(obj) + "`", obj !== null && (typeof obj === 'object' || typeof obj === 'function'));
    false && !!TEMPLATES$1.has(obj) && (0, _debug.assert)("Cannot call `setComponentTemplate` multiple times on the same class (`" + obj + "`)", !TEMPLATES$1.has(obj));
    TEMPLATES$1.set(obj, factory);
    return obj;
  }

  function getComponentTemplate(obj) {
    let pointer = obj;

    while (pointer !== undefined && pointer !== null) {
      let template = TEMPLATES$1.get(pointer);

      if (template !== undefined) {
        return template;
      }

      pointer = getPrototypeOf$1(pointer);
    }

    return null;
  }

  function setModifierManager(factory, obj) {
    return setManager({
      factory,
      internal: false,
      type: 'modifier'
    }, obj);
  }

  function getModifierManager(obj) {
    let wrapper = getManager(obj);

    if (wrapper && !wrapper.internal && wrapper.type === 'modifier') {
      return wrapper.factory;
    } else {
      return undefined;
    }
  }

  function instrumentationPayload$1(name) {
    return {
      object: "component:" + name
    };
  }

  function makeOptions(moduleName, namespace) {
    return {
      source: moduleName !== undefined ? "template:" + moduleName : undefined,
      namespace
    };
  }

  function componentFor(name, owner, options) {
    let fullName = "component:" + name;
    return owner.factoryFor(fullName, options) || null;
  }

  function layoutFor(name, owner, options) {
    let templateFullName = "template:components/" + name;
    return owner.lookup(templateFullName, options) || null;
  }

  function lookupModuleUnificationComponentPair(owner, name, options) {
    let localComponent = componentFor(name, owner, options);
    let localLayout = layoutFor(name, owner, options);
    let globalComponent = componentFor(name, owner);
    let globalLayout = layoutFor(name, owner); // TODO: we shouldn't have to recheck fallback, we should have a lookup that doesn't fallback

    if (localComponent !== null && globalComponent !== null && globalComponent.class === localComponent.class) {
      localComponent = null;
    }

    if (localLayout !== null && globalLayout !== null && localLayout.referrer.moduleName === globalLayout.referrer.moduleName) {
      localLayout = null;
    }

    if (localComponent !== null || localLayout !== null) {
      return {
        component: localComponent,
        layout: localLayout
      };
    } else if (globalComponent !== null || globalLayout !== null) {
      return {
        component: globalComponent,
        layout: globalLayout
      };
    } else {
      return null;
    }
  }

  function lookupComponentPair(owner, name, options) {
    let component = componentFor(name, owner, options);

    if (_canaryFeatures.EMBER_GLIMMER_SET_COMPONENT_TEMPLATE) {
      if (component !== null && component.class !== undefined) {
        let layout = getComponentTemplate(component.class);

        if (layout !== null) {
          return {
            component,
            layout
          };
        }
      }
    }

    let layout = layoutFor(name, owner, options);

    if (component === null && layout === null) {
      return null;
    } else {
      return {
        component,
        layout
      };
    }
  }

  function lookupComponent(owner, name, options) {
    if (options.source || options.namespace) {
      if (false
      /* EMBER_MODULE_UNIFICATION */
      ) {
          return lookupModuleUnificationComponentPair(owner, name, options);
        }

      let pair = lookupComponentPair(owner, name, options);

      if (pair !== null) {
        return pair;
      }
    }

    if (false
    /* EMBER_MODULE_UNIFICATION */
    ) {
        return lookupModuleUnificationComponentPair(owner, name);
      }

    return lookupComponentPair(owner, name);
  }

  const BUILTINS_HELPERS = {
    if: inlineIf,
    action,
    array,
    concat: concat$1,
    get: get$1,
    hash,
    log: log$1,
    mut,
    'query-params': queryParams$1,
    readonly,
    unbound,
    unless: inlineUnless,
    '-class': classHelper$1,
    '-each-in': eachIn,
    '-input-type': inputTypeHelper$1,
    '-normalize-class': normalizeClassHelper,
    '-get-dynamic-var': _runtime2.getDynamicVar,
    '-mount': mountHelper,
    '-outlet': outletHelper,
    '-assert-implicit-component-helper-argument': componentAssertionHelper,
    fn: undefined
  };

  if (true
  /* EMBER_GLIMMER_FN_HELPER */
  ) {
      BUILTINS_HELPERS.fn = fn;
    }

  class RuntimeResolver {
    constructor(isInteractive) {
      this.handles = [undefined];
      this.objToHandle = new WeakMap();
      this.builtInHelpers = BUILTINS_HELPERS;
      this.componentDefinitionCache = new Map();
      this.componentDefinitionCount = 0;
      this.helperDefinitionCount = 0;
      let macros = new _opcodeCompiler.Macros();
      populateMacros(macros);
      this.compiler = new _opcodeCompiler.LazyCompiler(new CompileTimeLookup(this), this, macros);
      this.isInteractive = isInteractive;
      this.builtInModifiers = {
        action: {
          manager: new ActionModifierManager(),
          state: null
        },
        on: {
          manager: new OnModifierManager(isInteractive),
          state: null
        }
      };
    }
    /***  IRuntimeResolver ***/

    /**
     * public componentDefHandleCount = 0;
     * Called while executing Append Op.PushDynamicComponentManager if string
     */


    lookupComponentDefinition(name, meta) {
      let handle = this.lookupComponentHandle(name, meta);

      if (handle === null) {
        false && !false && (0, _debug.assert)("Could not find component named \"" + name + "\" (no component or template with that name was found)");
        return null;
      }

      return this.resolve(handle);
    }

    lookupComponentHandle(name, meta) {
      let nextHandle = this.handles.length;
      let handle = this.handle(this._lookupComponentDefinition(name, meta));
      false && !!(true
      /* EMBER_GLIMMER_ANGLE_BRACKET_BUILT_INS */
      && name === 'text-area' && handle === null) && (0, _debug.assert)('Could not find component `<TextArea />` (did you mean `<Textarea />`?)', !(true && name === 'text-area' && handle === null));

      if (nextHandle === handle) {
        this.componentDefinitionCount++;
      }

      return handle;
    }
    /**
     * Called by RuntimeConstants to lookup unresolved handles.
     */


    resolve(handle) {
      return this.handles[handle];
    } // End IRuntimeResolver

    /**
     * Called by CompileTimeLookup compiling Unknown or Helper OpCode
     */


    lookupHelper(name, meta) {
      let nextHandle = this.handles.length;

      let helper$$1 = this._lookupHelper(name, meta);

      if (helper$$1 !== null) {
        let handle = this.handle(helper$$1);

        if (nextHandle === handle) {
          this.helperDefinitionCount++;
        }

        return handle;
      }

      return null;
    }
    /**
     * Called by CompileTimeLookup compiling the
     */


    lookupModifier(name, meta) {
      return this.handle(this._lookupModifier(name, meta));
    }
    /**
     * Called by CompileTimeLookup to lookup partial
     */


    lookupPartial(name, meta) {
      let partial = this._lookupPartial(name, meta);

      return this.handle(partial);
    } // end CompileTimeLookup
    // needed for lazy compile time lookup


    handle(obj) {
      if (obj === undefined || obj === null) {
        return null;
      }

      let handle = this.objToHandle.get(obj);

      if (handle === undefined) {
        handle = this.handles.push(obj) - 1;
        this.objToHandle.set(obj, handle);
      }

      return handle;
    }

    _lookupHelper(_name, meta) {
      const helper$$1 = this.builtInHelpers[_name];

      if (helper$$1 !== undefined) {
        return helper$$1;
      }

      const {
        owner,
        moduleName
      } = meta;
      let name = _name;
      let namespace = undefined;

      if (false
      /* EMBER_MODULE_UNIFICATION */
      ) {
          const parsed = this._parseNameForNamespace(_name);

          name = parsed.name;
          namespace = parsed.namespace;
        }

      const options = makeOptions(moduleName, namespace);
      const factory = owner.factoryFor("helper:" + name, options) || owner.factoryFor("helper:" + name);

      if (!isHelperFactory(factory)) {
        return null;
      }

      return (vm, args) => {
        const helper$$1 = factory.create();

        if (isSimpleHelper(helper$$1)) {
          return SimpleHelperReference.create(helper$$1.compute, args.capture());
        }

        vm.newDestroyable(helper$$1);
        return ClassBasedHelperReference.create(helper$$1, args.capture());
      };
    }

    _lookupPartial(name, meta) {
      let templateFactory$$1 = (0, _views.lookupPartial)(name, meta.owner);
      let template = templateFactory$$1(meta.owner);
      return new _opcodeCompiler.PartialDefinition(name, template);
    }

    _lookupModifier(name, meta) {
      let builtin = this.builtInModifiers[name];

      if (builtin === undefined) {
        let {
          owner
        } = meta;
        let modifier = owner.factoryFor("modifier:" + name);

        if (modifier !== undefined) {
          let managerFactory = getModifierManager(modifier.class);
          let manager = managerFactory(owner);
          return new CustomModifierDefinition(name, modifier, manager, this.isInteractive);
        }
      }

      return builtin;
    }

    _parseNameForNamespace(_name) {
      let name = _name;
      let namespace = undefined;

      let namespaceDelimiterOffset = _name.indexOf('::');

      if (namespaceDelimiterOffset !== -1) {
        name = _name.slice(namespaceDelimiterOffset + 2);
        namespace = _name.slice(0, namespaceDelimiterOffset);
      }

      return {
        name,
        namespace
      };
    }

    _lookupComponentDefinition(_name, {
      moduleName,
      owner
    }) {
      false && !(true
      /* EMBER_GLIMMER_ANGLE_BRACKET_BUILT_INS */
      || _name !== 'textarea') && (0, _debug.assert)('Invoking `{{textarea}}` using angle bracket syntax or `component` helper is not yet supported.', true || _name !== 'textarea');
      false && !(true
      /* EMBER_GLIMMER_ANGLE_BRACKET_BUILT_INS */
      || _name !== 'input') && (0, _debug.assert)('Invoking `{{input}}` using angle bracket syntax or `component` helper is not yet supported.', true || _name !== 'input');
      let name = _name;
      let namespace = undefined;

      if (false
      /* EMBER_MODULE_UNIFICATION */
      ) {
          const parsed = this._parseNameForNamespace(_name);

          name = parsed.name;
          namespace = parsed.namespace;
        }

      let pair = lookupComponent(owner, name, makeOptions(moduleName, namespace));

      if (pair === null) {
        return null;
      }

      let layout = null;
      let key;

      if (pair.component === null) {
        key = layout = pair.layout(owner);
      } else {
        key = pair.component;
      }

      let cachedComponentDefinition = this.componentDefinitionCache.get(key);

      if (cachedComponentDefinition !== undefined) {
        return cachedComponentDefinition;
      }

      if (layout === null && pair.layout !== null) {
        layout = pair.layout(owner);
      }

      let finalizer = (0, _instrumentation._instrumentStart)('render.getComponentDefinition', instrumentationPayload$1, name);
      let definition = null;

      if (pair.component === null && _environment2.ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS) {
        definition = new TemplateOnlyComponentDefinition(layout);
      }

      if (pair.component !== null) {
        false && !(pair.component.class !== undefined) && (0, _debug.assert)("missing component class " + name, pair.component.class !== undefined);
        let ComponentClass = pair.component.class;
        let wrapper = getManager(ComponentClass);

        if (wrapper !== null && wrapper.type === 'component') {
          let {
            factory
          } = wrapper;

          if (wrapper.internal) {
            false && !(pair.layout !== null) && (0, _debug.assert)("missing layout for internal component " + name, pair.layout !== null);
            definition = new InternalComponentDefinition(factory(owner), ComponentClass, layout);
          } else {
            definition = new CustomManagerDefinition(name, pair.component, factory(owner), layout !== null ? layout : owner.lookup((0, _container.privatize)(_templateObject3()))(owner));
          }
        }
      }

      if (definition === null) {
        definition = new CurlyComponentDefinition(name, pair.component || owner.factoryFor((0, _container.privatize)(_templateObject4())), null, layout);
      }

      finalizer();
      this.componentDefinitionCache.set(key, definition);
      return definition;
    }

  } // factory for DI


  var TemplateCompiler = {
    create({
      environment
    }) {
      return new RuntimeResolver(environment.isInteractive).compiler;
    }

  };
  var ComponentTemplate = template({
    "id": "chfQcH83",
    "block": "{\"symbols\":[\"&default\"],\"statements\":[[14,1]],\"hasEval\":false}",
    "meta": {
      "moduleName": "packages/@ember/-internals/glimmer/lib/templates/component.hbs"
    }
  });
  var InputTemplate = template({
    "id": "NWZzLSII",
    "block": "{\"symbols\":[\"Checkbox\",\"TextField\",\"@__ARGS__\",\"&attrs\"],\"statements\":[[4,\"let\",[[28,\"component\",[\"-checkbox\"],null],[28,\"component\",[\"-text-field\"],null]],null,{\"statements\":[[4,\"if\",[[23,0,[\"isCheckbox\"]]],null,{\"statements\":[[6,[23,1,[]],[[13,4]],[[\"@target\",\"@__ARGS__\"],[[23,0,[\"caller\"]],[23,3,[]]]]]],\"parameters\":[]},{\"statements\":[[6,[23,2,[]],[[13,4]],[[\"@target\",\"@__ARGS__\"],[[23,0,[\"caller\"]],[23,3,[]]]]]],\"parameters\":[]}]],\"parameters\":[1,2]},null]],\"hasEval\":false}",
    "meta": {
      "moduleName": "packages/@ember/-internals/glimmer/lib/templates/input.hbs"
    }
  });
  var OutletTemplate = template({
    "id": "ffAL6HDl",
    "block": "{\"symbols\":[],\"statements\":[[1,[22,\"outlet\"],false]],\"hasEval\":false}",
    "meta": {
      "moduleName": "packages/@ember/-internals/glimmer/lib/templates/outlet.hbs"
    }
  });
  const TOP_LEVEL_NAME = '-top-level';
  const TOP_LEVEL_OUTLET = 'main';

  class OutletView {
    constructor(_environment, renderer, owner, template) {
      this._environment = _environment;
      this.renderer = renderer;
      this.owner = owner;
      this.template = template;
      let ref = this.ref = new RootOutletReference({
        outlets: {
          main: undefined
        },
        render: {
          owner: owner,
          into: undefined,
          outlet: TOP_LEVEL_OUTLET,
          name: TOP_LEVEL_NAME,
          controller: undefined,
          template
        }
      });
      this.state = {
        ref,
        name: TOP_LEVEL_NAME,
        outlet: TOP_LEVEL_OUTLET,
        template,
        controller: undefined
      };
    }

    static extend(injections) {
      return class extends OutletView {
        static create(options) {
          if (options) {
            return super.create((0, _polyfills.assign)({}, injections, options));
          } else {
            return super.create(injections);
          }
        }

      };
    }

    static reopenClass(injections) {
      (0, _polyfills.assign)(this, injections);
    }

    static create(options) {
      let {
        _environment,
        renderer,
        template: templateFactory$$1
      } = options;
      let owner = options[_owner.OWNER];
      let template = templateFactory$$1(owner);
      return new OutletView(_environment, renderer, owner, template);
    }

    appendTo(selector) {
      let target;

      if (this._environment.hasDOM) {
        target = typeof selector === 'string' ? document.querySelector(selector) : selector;
      } else {
        target = selector;
      }

      (0, _runloop.schedule)('render', this.renderer, 'appendOutletView', this, target);
    }

    rerender() {
      /**/
    }

    setOutletState(state) {
      this.ref.update(state);
    }

    destroy() {
      /**/
    }

  }

  _exports.OutletView = OutletView;

  function setupApplicationRegistry(registry) {
    registry.injection('service:-glimmer-environment', 'appendOperations', 'service:-dom-tree-construction');
    registry.injection('renderer', 'env', 'service:-glimmer-environment'); // because we are using injections we can't use instantiate false
    // we need to use bind() to copy the function so factory for
    // association won't leak

    registry.register('service:-dom-builder', {
      create({
        bootOptions
      }) {
        let {
          _renderMode
        } = bootOptions;

        switch (_renderMode) {
          case 'serialize':
            return _node.serializeBuilder.bind(null);

          case 'rehydrate':
            return _runtime2.rehydrationBuilder.bind(null);

          default:
            return _runtime2.clientBuilder.bind(null);
        }
      }

    });
    registry.injection('service:-dom-builder', 'bootOptions', '-environment:main');
    registry.injection('renderer', 'builder', 'service:-dom-builder');
    registry.register((0, _container.privatize)(_templateObject5()), RootTemplate);
    registry.injection('renderer', 'rootTemplate', (0, _container.privatize)(_templateObject6()));
    registry.register('renderer:-dom', InteractiveRenderer);
    registry.register('renderer:-inert', InertRenderer);

    if (_browserEnvironment.hasDOM) {
      registry.injection('service:-glimmer-environment', 'updateOperations', 'service:-dom-changes');
    }

    registry.register('service:-dom-changes', {
      create({
        document
      }) {
        return new _runtime2.DOMChanges(document);
      }

    });
    registry.register('service:-dom-tree-construction', {
      create({
        document
      }) {
        let Implementation = _browserEnvironment.hasDOM ? _runtime2.DOMTreeConstruction : _node.NodeDOMTreeConstruction;
        return new Implementation(document);
      }

    });
  }

  function setupEngineRegistry(registry) {
    registry.optionsForType('template', {
      instantiate: false
    });
    registry.register('view:-outlet', OutletView);
    registry.register('template:-outlet', OutletTemplate);
    registry.injection('view:-outlet', 'template', 'template:-outlet');
    registry.injection('service:-dom-changes', 'document', 'service:-document');
    registry.injection('service:-dom-tree-construction', 'document', 'service:-document');
    registry.register((0, _container.privatize)(_templateObject7()), ComponentTemplate);
    registry.register('service:-glimmer-environment', Environment$1);
    registry.register((0, _container.privatize)(_templateObject8()), TemplateCompiler);
    registry.injection((0, _container.privatize)(_templateObject9()), 'environment', '-environment:main');
    registry.optionsForType('helper', {
      instantiate: false
    });
    registry.register('helper:loc', loc$1);
    registry.register('component:-text-field', TextField);
    registry.register('component:-checkbox', Checkbox);
    registry.register('component:link-to', LinkToComponent);

    if (true
    /* EMBER_GLIMMER_ANGLE_BRACKET_BUILT_INS */
    ) {
        registry.register('component:input', Input$1);
        registry.register('template:components/input', InputTemplate);
        registry.register('component:textarea', TextArea);
      } else {
      registry.register('component:-text-area', TextArea);
    }

    if (!_environment2.ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS) {
      registry.register((0, _container.privatize)(_templateObject10()), Component);
    }
  }

  function setComponentManager(stringOrFunction, obj) {
    let factory;

    if (_deprecatedFeatures.COMPONENT_MANAGER_STRING_LOOKUP && typeof stringOrFunction === 'string') {
      false && !false && (0, _debug.deprecate)('Passing the name of the component manager to "setupComponentManager" is deprecated. Please pass a function that produces an instance of the manager.', false, {
        id: 'deprecate-string-based-component-manager',
        until: '4.0.0',
        url: 'https://emberjs.com/deprecations/v3.x/#toc_component-manager-string-lookup'
      });

      factory = function (owner) {
        return owner.lookup("component-manager:" + stringOrFunction);
      };
    } else {
      factory = stringOrFunction;
    }

    return setManager({
      factory,
      internal: false,
      type: 'component'
    }, obj);
  }

  function getComponentManager(obj) {
    let wrapper = getManager(obj);

    if (wrapper && !wrapper.internal && wrapper.type === 'component') {
      return wrapper.factory;
    } else {
      return undefined;
    }
  }
  /**
    [Glimmer](https://github.com/tildeio/glimmer) is a templating engine used by Ember.js that is compatible with a subset of the [Handlebars](http://handlebarsjs.com/) syntax.
  
    ### Showing a property
  
    Templates manage the flow of an application's UI, and display state (through
    the DOM) to a user. For example, given a component with the property "name",
    that component's template can use the name in several ways:
  
    ```app/components/person-profile.js
    import Component from '@ember/component';
  
    export default Component.extend({
      name: 'Jill'
    });
    ```
  
    ```app/templates/components/person-profile.hbs
    {{name}}
    <div>{{name}}</div>
    <span data-name={{name}}></span>
    ```
  
    Any time the "name" property on the component changes, the DOM will be
    updated.
  
    Properties can be chained as well:
  
    ```handlebars
    {{aUserModel.name}}
    <div>{{listOfUsers.firstObject.name}}</div>
    ```
  
    ### Using Ember helpers
  
    When content is passed in mustaches `{{}}`, Ember will first try to find a helper
    or component with that name. For example, the `if` helper:
  
    ```handlebars
    {{if name "I have a name" "I have no name"}}
    <span data-has-name={{if name true}}></span>
    ```
  
    The returned value is placed where the `{{}}` is called. The above style is
    called "inline". A second style of helper usage is called "block". For example:
  
    ```handlebars
    {{#if name}}
    I have a name
    {{else}}
    I have no name
    {{/if}}
    ```
  
    The block form of helpers allows you to control how the UI is created based
    on the values of properties.
    A third form of helper is called "nested". For example here the concat
    helper will add " Doe" to a displayed name if the person has no last name:
  
    ```handlebars
    <span data-name={{concat firstName (
    if lastName (concat " " lastName) "Doe"
    )}}></span>
    ```
  
    Ember's built-in helpers are described under the [Ember.Templates.helpers](/ember/release/classes/Ember.Templates.helpers)
    namespace. Documentation on creating custom helpers can be found under
    [helper](/ember/release/functions/@ember%2Fcomponent%2Fhelper/helper) (or
    under [Helper](/ember/release/classes/Helper) if a helper requires access to
    dependency injection).
  
    ### Invoking a Component
  
    Ember components represent state to the UI of an application. Further
    reading on components can be found under [Component](/ember/release/classes/Component).
  
    @module @ember/component
    @main @ember/component
    @public
   */

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
enifed("@ember/-internals/routing/index", ["exports", "@ember/-internals/routing/lib/ext/controller", "@ember/-internals/routing/lib/location/api", "@ember/-internals/routing/lib/location/none_location", "@ember/-internals/routing/lib/location/hash_location", "@ember/-internals/routing/lib/location/history_location", "@ember/-internals/routing/lib/location/auto_location", "@ember/-internals/routing/lib/system/generate_controller", "@ember/-internals/routing/lib/system/controller_for", "@ember/-internals/routing/lib/system/dsl", "@ember/-internals/routing/lib/system/router", "@ember/-internals/routing/lib/system/route", "@ember/-internals/routing/lib/system/query_params", "@ember/-internals/routing/lib/services/routing", "@ember/-internals/routing/lib/services/router", "@ember/-internals/routing/lib/system/cache"], function (_exports, _controller, _api, _none_location, _hash_location, _history_location, _auto_location, _generate_controller, _controller_for, _dsl, _router, _route, _query_params, _routing, _router2, _cache) {
  "use strict";

  Object.defineProperty(_exports, "Location", {
    enumerable: true,
    get: function () {
      return _api.default;
    }
  });
  Object.defineProperty(_exports, "NoneLocation", {
    enumerable: true,
    get: function () {
      return _none_location.default;
    }
  });
  Object.defineProperty(_exports, "HashLocation", {
    enumerable: true,
    get: function () {
      return _hash_location.default;
    }
  });
  Object.defineProperty(_exports, "HistoryLocation", {
    enumerable: true,
    get: function () {
      return _history_location.default;
    }
  });
  Object.defineProperty(_exports, "AutoLocation", {
    enumerable: true,
    get: function () {
      return _auto_location.default;
    }
  });
  Object.defineProperty(_exports, "generateController", {
    enumerable: true,
    get: function () {
      return _generate_controller.default;
    }
  });
  Object.defineProperty(_exports, "generateControllerFactory", {
    enumerable: true,
    get: function () {
      return _generate_controller.generateControllerFactory;
    }
  });
  Object.defineProperty(_exports, "controllerFor", {
    enumerable: true,
    get: function () {
      return _controller_for.default;
    }
  });
  Object.defineProperty(_exports, "RouterDSL", {
    enumerable: true,
    get: function () {
      return _dsl.default;
    }
  });
  Object.defineProperty(_exports, "Router", {
    enumerable: true,
    get: function () {
      return _router.default;
    }
  });
  Object.defineProperty(_exports, "Route", {
    enumerable: true,
    get: function () {
      return _route.default;
    }
  });
  Object.defineProperty(_exports, "QueryParams", {
    enumerable: true,
    get: function () {
      return _query_params.default;
    }
  });
  Object.defineProperty(_exports, "RoutingService", {
    enumerable: true,
    get: function () {
      return _routing.default;
    }
  });
  Object.defineProperty(_exports, "RouterService", {
    enumerable: true,
    get: function () {
      return _router2.default;
    }
  });
  Object.defineProperty(_exports, "BucketCache", {
    enumerable: true,
    get: function () {
      return _cache.default;
    }
  });
});
enifed("@ember/-internals/routing/lib/ext/controller", ["exports", "@ember/-internals/metal", "@ember/controller/lib/controller_mixin", "@ember/-internals/routing/lib/utils"], function (_exports, _metal, _controller_mixin, _utils) {
  "use strict";

  _exports.default = void 0;

  /**
  @module ember
  */
  _controller_mixin.default.reopen({
    concatenatedProperties: ['queryParams'],

    /**
      Defines which query parameters the controller accepts.
      If you give the names `['category','page']` it will bind
      the values of these query parameters to the variables
      `this.category` and `this.page`.
      By default, Ember coerces query parameter values using `toggleProperty`.
      This behavior may lead to unexpected results.
      Available queryParam types: `boolean`, `number`, `array`.
      If query param type not specified, it will be `string`.
      To explicitly configure a query parameter property so it coerces as expected, you must define a type property:
      ```javascript
        queryParams: [{
          category: {
            type: 'boolean'
          }
        }]
      ```
      @for Ember.ControllerMixin
      @property queryParams
      @public
    */
    queryParams: null,

    /**
     This property is updated to various different callback functions depending on
     the current "state" of the backing route. It is used by
     `Controller.prototype._qpChanged`.
        The methods backing each state can be found in the `Route.prototype._qp` computed
     property return value (the `.states` property). The current values are listed here for
     the sanity of future travelers:
        * `inactive` - This state is used when this controller instance is not part of the active
       route hierarchy. Set in `Route.prototype._reset` (a `router.js` microlib hook) and
       `Route.prototype.actions.finalizeQueryParamChange`.
     * `active` - This state is used when this controller instance is part of the active
       route hierarchy. Set in `Route.prototype.actions.finalizeQueryParamChange`.
     * `allowOverrides` - This state is used in `Route.prototype.setup` (`route.js` microlib hook).
         @method _qpDelegate
      @private
    */
    _qpDelegate: null,

    /**
     During `Route#setup` observers are created to invoke this method
     when any of the query params declared in `Controller#queryParams` property
     are changed.
        When invoked this method uses the currently active query param update delegate
     (see `Controller.prototype._qpDelegate` for details) and invokes it with
     the QP key/value being changed.
         @method _qpChanged
      @private
    */
    _qpChanged(controller, _prop) {
      let dotIndex = _prop.indexOf('.[]');

      let prop = dotIndex === -1 ? _prop : _prop.slice(0, dotIndex);
      let delegate = controller._qpDelegate;
      let value = (0, _metal.get)(controller, prop);
      delegate(prop, value);
    },

    /**
      Transition the application into another route. The route may
      be either a single route or route path:
         ```javascript
      aController.transitionToRoute('blogPosts');
      aController.transitionToRoute('blogPosts.recentEntries');
      ```
         Optionally supply a model for the route in question. The model
      will be serialized into the URL using the `serialize` hook of
      the route:
         ```javascript
      aController.transitionToRoute('blogPost', aPost);
      ```
         If a literal is passed (such as a number or a string), it will
      be treated as an identifier instead. In this case, the `model`
      hook of the route will be triggered:
         ```javascript
      aController.transitionToRoute('blogPost', 1);
      ```
         Multiple models will be applied last to first recursively up the
      route tree.
         ```app/router.js
      Router.map(function() {
        this.route('blogPost', { path: ':blogPostId' }, function() {
          this.route('blogComment', { path: ':blogCommentId', resetNamespace: true });
        });
      });
      ```
         ```javascript
      aController.transitionToRoute('blogComment', aPost, aComment);
      aController.transitionToRoute('blogComment', 1, 13);
      ```
         It is also possible to pass a URL (a string that starts with a
      `/`).
         ```javascript
      aController.transitionToRoute('/');
      aController.transitionToRoute('/blog/post/1/comment/13');
      aController.transitionToRoute('/blog/posts?sort=title');
      ```
         An options hash with a `queryParams` property may be provided as
      the final argument to add query parameters to the destination URL.
         ```javascript
      aController.transitionToRoute('blogPost', 1, {
        queryParams: { showComments: 'true' }
      });
         // if you just want to transition the query parameters without changing the route
      aController.transitionToRoute({ queryParams: { sort: 'date' } });
      ```
         See also [replaceRoute](/ember/release/classes/Ember.ControllerMixin/methods/replaceRoute?anchor=replaceRoute).
         @param {String} name the name of the route or a URL
      @param {...Object} models the model(s) or identifier(s) to be used
        while transitioning to the route.
      @param {Object} [options] optional hash with a queryParams property
        containing a mapping of query parameters
      @for Ember.ControllerMixin
      @method transitionToRoute
      @public
    */
    transitionToRoute(...args) {
      // target may be either another controller or a router
      let target = (0, _metal.get)(this, 'target');
      let method = target.transitionToRoute || target.transitionTo;
      return method.apply(target, (0, _utils.prefixRouteNameArg)(this, args));
    },

    /**
      Transition into another route while replacing the current URL, if possible.
      This will replace the current history entry instead of adding a new one.
      Beside that, it is identical to `transitionToRoute` in all other respects.
         ```javascript
      aController.replaceRoute('blogPosts');
      aController.replaceRoute('blogPosts.recentEntries');
      ```
         Optionally supply a model for the route in question. The model
      will be serialized into the URL using the `serialize` hook of
      the route:
         ```javascript
      aController.replaceRoute('blogPost', aPost);
      ```
         If a literal is passed (such as a number or a string), it will
      be treated as an identifier instead. In this case, the `model`
      hook of the route will be triggered:
         ```javascript
      aController.replaceRoute('blogPost', 1);
      ```
         Multiple models will be applied last to first recursively up the
      route tree.
         ```app/router.js
      Router.map(function() {
        this.route('blogPost', { path: ':blogPostId' }, function() {
          this.route('blogComment', { path: ':blogCommentId', resetNamespace: true });
        });
      });
      ```
         ```
      aController.replaceRoute('blogComment', aPost, aComment);
      aController.replaceRoute('blogComment', 1, 13);
      ```
         It is also possible to pass a URL (a string that starts with a
      `/`).
         ```javascript
      aController.replaceRoute('/');
      aController.replaceRoute('/blog/post/1/comment/13');
      ```
         @param {String} name the name of the route or a URL
      @param {...Object} models the model(s) or identifier(s) to be used
      while transitioning to the route.
      @for Ember.ControllerMixin
      @method replaceRoute
      @public
    */
    replaceRoute(...args) {
      // target may be either another controller or a router
      let target = (0, _metal.get)(this, 'target');
      let method = target.replaceRoute || target.replaceWith;
      return method.apply(target, (0, _utils.prefixRouteNameArg)(this, args));
    }

  });

  var _default = _controller_mixin.default;
  _exports.default = _default;
});
enifed("@ember/-internals/routing/lib/location/api", ["exports", "@ember/debug"], function (_exports, _debug) {
  "use strict";

  _exports.default = void 0;

  /**
  @module @ember/routing
  */

  /**
    Location returns an instance of the correct implementation of
    the `location` API.
  
    ## Implementations
  
    You can pass an implementation name (`hash`, `history`, `none`, `auto`) to force a
    particular implementation to be used in your application.
  
    See [HashLocation](/ember/release/classes/HashLocation).
    See [HistoryLocation](/ember/release/classes/HistoryLocation).
    See [NoneLocation](/ember/release/classes/NoneLocation).
    See [AutoLocation](/ember/release/classes/AutoLocation).
  
    ## Location API
  
    Each location implementation must provide the following methods:
  
    * implementation: returns the string name used to reference the implementation.
    * getURL: returns the current URL.
    * setURL(path): sets the current URL.
    * replaceURL(path): replace the current URL (optional).
    * onUpdateURL(callback): triggers the callback when the URL changes.
    * formatURL(url): formats `url` to be placed into `href` attribute.
    * detect() (optional): instructs the location to do any feature detection
        necessary. If the location needs to redirect to a different URL, it
        can cancel routing by setting the `cancelRouterSetup` property on itself
        to `false`.
  
    Calling setURL or replaceURL will not trigger onUpdateURL callbacks.
  
    ## Custom implementation
  
    Ember scans `app/locations/*` for extending the Location API.
  
    Example:
  
    ```javascript
    import HistoryLocation from '@ember/routing/history-location';
  
    export default class MyHistory {
      implementation: 'my-custom-history',
      constructor() {
        this._history = HistoryLocation.create(...arguments);
      }
      create() {
        return new this(...arguments);
      }
      pushState(path) {
         this._history.pushState(path);
      }
    }
    ```
  
    @class Location
    @private
  */
  var _default = {
    /**
     This is deprecated in favor of using the container to lookup the location
     implementation as desired.
        For example:
        ```javascript
     // Given a location registered as follows:
     container.register('location:history-test', HistoryTestLocation);
        // You could create a new instance via:
     container.lookup('location:history-test');
     ```
         @method create
      @param {Object} options
      @return {Object} an instance of an implementation of the `location` API
      @deprecated Use the container to lookup the location implementation that you
      need.
      @private
    */
    create(options) {
      let implementation = options && options.implementation;
      false && !Boolean(implementation) && (0, _debug.assert)("Location.create: you must specify a 'implementation' option", Boolean(implementation));
      let implementationClass = this.implementations[implementation];
      false && !Boolean(implementationClass) && (0, _debug.assert)("Location.create: " + implementation + " is not a valid implementation", Boolean(implementationClass));
      return implementationClass.create(...arguments);
    },

    implementations: {}
  };
  _exports.default = _default;
});
enifed("@ember/-internals/routing/lib/location/history_location", ["exports", "@ember/-internals/metal", "@ember/-internals/runtime", "@ember/-internals/routing/lib/location/util"], function (_exports, _metal, _runtime, _util) {
  "use strict";

  _exports.default = void 0;

  /**
  @module @ember/routing
  */
  let popstateFired = false;

  function _uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      let r, v;
      r = Math.random() * 16 | 0;
      v = c === 'x' ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  /**
    HistoryLocation implements the location API using the browser's
    history.pushState API.
  
    Using `HistoryLocation` results in URLs that are indistinguishable from a
    standard URL. This relies upon the browser's `history` API.
  
    Example:
  
    ```app/router.js
    Router.map(function() {
      this.route('posts', function() {
        this.route('new');
      });
    });
  
    Router.reopen({
      location: 'history'
    });
    ```
  
    This will result in a posts.new url of `/posts/new`.
  
    Keep in mind that your server must serve the Ember app at all the routes you
    define.
  
    @class HistoryLocation
    @extends EmberObject
    @protected
  */


  class HistoryLocation extends _runtime.Object {
    constructor() {
      super(...arguments);
      this.implementation = 'history';
      /**
        Will be pre-pended to path upon state change
               @property rootURL
        @default '/'
        @private
      */

      this.rootURL = '/';
    }
    /**
      @private
         Returns normalized location.hash
         @method getHash
    */


    getHash() {
      return (0, _util.getHash)(this.location);
    }

    init() {
      this._super(...arguments);

      let base = document.querySelector('base');
      let baseURL = '';

      if (base) {
        baseURL = base.getAttribute('href');
      }

      (0, _metal.set)(this, 'baseURL', baseURL);
      (0, _metal.set)(this, 'location', this.location || window.location);
      this._popstateHandler = undefined;
    }
    /**
      Used to set state on first call to setURL
         @private
      @method initState
    */


    initState() {
      let history = this.history || window.history;
      (0, _metal.set)(this, 'history', history);

      if (history && 'state' in history) {
        this.supportsHistory = true;
      }

      let state = this.getState();
      let path = this.formatURL(this.getURL());

      if (state && state.path === path) {
        // preserve existing state
        // used for webkit workaround, since there will be no initial popstate event
        this._previousURL = this.getURL();
      } else {
        this.replaceState(path);
      }
    }
    /**
      Returns the current `location.pathname` without `rootURL` or `baseURL`
         @private
      @method getURL
      @return url {String}
    */


    getURL() {
      let {
        location,
        rootURL,
        baseURL
      } = this;
      let path = location.pathname; // remove trailing slashes if they exists

      rootURL = rootURL.replace(/\/$/, '');
      baseURL = baseURL.replace(/\/$/, ''); // remove baseURL and rootURL from start of path

      let url = path.replace(new RegExp("^" + baseURL + "(?=/|$)"), '').replace(new RegExp("^" + rootURL + "(?=/|$)"), '').replace(/\/\/$/g, '/'); // remove extra slashes

      let search = location.search || '';
      url += search + this.getHash();
      return url;
    }
    /**
      Uses `history.pushState` to update the url without a page reload.
         @private
      @method setURL
      @param path {String}
    */


    setURL(path) {
      let state = this.getState();
      path = this.formatURL(path);

      if (!state || state.path !== path) {
        this.pushState(path);
      }
    }
    /**
      Uses `history.replaceState` to update the url without a page reload
      or history modification.
         @private
      @method replaceURL
      @param path {String}
    */


    replaceURL(path) {
      let state = this.getState();
      path = this.formatURL(path);

      if (!state || state.path !== path) {
        this.replaceState(path);
      }
    }
    /**
      Get the current `history.state`. Checks for if a polyfill is
      required and if so fetches this._historyState. The state returned
      from getState may be null if an iframe has changed a window's
      history.
         The object returned will contain a `path` for the given state as well
      as a unique state `id`. The state index will allow the app to distinguish
      between two states with similar paths but should be unique from one another.
         @private
      @method getState
      @return state {Object}
    */


    getState() {
      if (this.supportsHistory) {
        return this.history.state;
      }

      return this._historyState;
    }
    /**
     Pushes a new state.
        @private
     @method pushState
     @param path {String}
    */


    pushState(path) {
      let state = {
        path,
        uuid: _uuid()
      };
      this.history.pushState(state, null, path);
      this._historyState = state; // used for webkit workaround

      this._previousURL = this.getURL();
    }
    /**
     Replaces the current state.
        @private
     @method replaceState
     @param path {String}
    */


    replaceState(path) {
      let state = {
        path,
        uuid: _uuid()
      };
      this.history.replaceState(state, null, path);
      this._historyState = state; // used for webkit workaround

      this._previousURL = this.getURL();
    }
    /**
      Register a callback to be invoked whenever the browser
      history changes, including using forward and back buttons.
         @private
      @method onUpdateURL
      @param callback {Function}
    */


    onUpdateURL(callback) {
      this._removeEventListener();

      this._popstateHandler = () => {
        // Ignore initial page load popstate event in Chrome
        if (!popstateFired) {
          popstateFired = true;

          if (this.getURL() === this._previousURL) {
            return;
          }
        }

        callback(this.getURL());
      };

      window.addEventListener('popstate', this._popstateHandler);
    }
    /**
      Used when using `{{action}}` helper.  The url is always appended to the rootURL.
         @private
      @method formatURL
      @param url {String}
      @return formatted url {String}
    */


    formatURL(url) {
      let {
        rootURL,
        baseURL
      } = this;

      if (url !== '') {
        // remove trailing slashes if they exists
        rootURL = rootURL.replace(/\/$/, '');
        baseURL = baseURL.replace(/\/$/, '');
      } else if (baseURL[0] === '/' && rootURL[0] === '/') {
        // if baseURL and rootURL both start with a slash
        // ... remove trailing slash from baseURL if it exists
        baseURL = baseURL.replace(/\/$/, '');
      }

      return baseURL + rootURL + url;
    }
    /**
      Cleans up the HistoryLocation event listener.
         @private
      @method willDestroy
    */


    willDestroy() {
      this._removeEventListener();
    }

    _removeEventListener() {
      if (this._popstateHandler) {
        window.removeEventListener('popstate', this._popstateHandler);
      }
    }

  }

  _exports.default = HistoryLocation;
});
enifed("@ember/-internals/routing/lib/location/util", ["exports"], function (_exports) {
  "use strict";

  _exports.getPath = getPath;
  _exports.getQuery = getQuery;
  _exports.getHash = getHash;
  _exports.getFullPath = getFullPath;
  _exports.getOrigin = getOrigin;
  _exports.supportsHashChange = supportsHashChange;
  _exports.supportsHistory = supportsHistory;
  _exports.replacePath = replacePath;

  /**
    @private
  
    Returns the current `location.pathname`, normalized for IE inconsistencies.
  */
  function getPath(location) {
    let pathname = location.pathname; // Various versions of IE/Opera don't always return a leading slash

    if (pathname[0] !== '/') {
      pathname = "/" + pathname;
    }

    return pathname;
  }
  /**
    @private
  
    Returns the current `location.search`.
  */


  function getQuery(location) {
    return location.search;
  }
  /**
    @private
  
    Returns the hash or empty string
  */


  function getHash(location) {
    if (location.hash !== undefined) {
      return location.hash.substr(0);
    }

    return '';
  }

  function getFullPath(location) {
    return getPath(location) + getQuery(location) + getHash(location);
  }

  function getOrigin(location) {
    let origin = location.origin; // Older browsers, especially IE, don't have origin

    if (!origin) {
      origin = location.protocol + "//" + location.hostname;

      if (location.port) {
        origin += ":" + location.port;
      }
    }

    return origin;
  }
  /*
    `documentMode` only exist in Internet Explorer, and it's tested because IE8 running in
    IE7 compatibility mode claims to support `onhashchange` but actually does not.
  
    `global` is an object that may have an `onhashchange` property.
  
    @private
    @function supportsHashChange
  */


  function supportsHashChange(documentMode, global) {
    return global && 'onhashchange' in global && (documentMode === undefined || documentMode > 7);
  }
  /*
    `userAgent` is a user agent string. We use user agent testing here, because
    the stock Android browser is known to have buggy versions of the History API,
    in some Android versions.
  
    @private
    @function supportsHistory
  */


  function supportsHistory(userAgent, history) {
    // Boosted from Modernizr: https://github.com/Modernizr/Modernizr/blob/master/feature-detects/history.js
    // The stock browser on Android 2.2 & 2.3, and 4.0.x returns positive on history support
    // Unfortunately support is really buggy and there is no clean way to detect
    // these bugs, so we fall back to a user agent sniff :(
    // We only want Android 2 and 4.0, stock browser, and not Chrome which identifies
    // itself as 'Mobile Safari' as well, nor Windows Phone.
    if ((userAgent.indexOf('Android 2.') !== -1 || userAgent.indexOf('Android 4.0') !== -1) && userAgent.indexOf('Mobile Safari') !== -1 && userAgent.indexOf('Chrome') === -1 && userAgent.indexOf('Windows Phone') === -1) {
      return false;
    }

    return Boolean(history && 'pushState' in history);
  }
  /**
    Replaces the current location, making sure we explicitly include the origin
    to prevent redirecting to a different origin.
  
    @private
  */


  function replacePath(location, path) {
    location.replace(getOrigin(location) + path);
  }
});
enifed("@ember/-internals/routing/lib/services/router", ["exports", "@ember/-internals/runtime", "@ember/debug", "@ember/object/computed", "@ember/service", "@ember/-internals/routing/lib/utils"], function (_exports, _runtime, _debug, _computed, _service, _utils) {
  "use strict";

  _exports.default = void 0;
  let freezeRouteInfo;

  if (false
  /* DEBUG */
  ) {
      freezeRouteInfo = transition => {
        if (transition.from !== null && !Object.isFrozen(transition.from)) {
          Object.freeze(transition.from);
        }

        if (transition.to !== null && !Object.isFrozen(transition.to)) {
          Object.freeze(transition.to);
        }
      };
    }

  function cleanURL(url, rootURL) {
    if (rootURL === '/') {
      return url;
    }

    return url.substr(rootURL.length, url.length);
  }
  /**
     The Router service is the public API that provides access to the router.
  
     The immediate benefit of the Router service is that you can inject it into components,
     giving them a friendly way to initiate transitions and ask questions about the current
     global router state.
  
     In this example, the Router service is injected into a component to initiate a transition
     to a dedicated route:
     ```javascript
     import Component from '@ember/component';
     import { inject as service } from '@ember/service';
  
     export default Component.extend({
       router: service(),
  
       actions: {
         next() {
           this.router.transitionTo('other.route');
         }
       }
     });
     ```
  
     Like any service, it can also be injected into helpers, routes, etc.
  
     @public
     @extends Service
     @class RouterService
   */


  class RouterService extends _service.default {
    init() {
      super.init(...arguments);

      this._router.on('routeWillChange', transition => {
        if (false
        /* DEBUG */
        ) {
            freezeRouteInfo(transition);
          }

        this.trigger('routeWillChange', transition);
      });

      this._router.on('routeDidChange', transition => {
        if (false
        /* DEBUG */
        ) {
            freezeRouteInfo(transition);
          }

        this.trigger('routeDidChange', transition);
      });
    }
    /**
       Transition the application into another route. The route may
       be either a single route or route path:
          See [transitionTo](/ember/release/classes/Route/methods/transitionTo?anchor=transitionTo) for more info.
          Calling `transitionTo` from the Router service will cause default query parameter values to be included in the URL.
       This behavior is different from calling `transitionTo` on a route or `transitionToRoute` on a controller.
       See the [Router Service RFC](https://github.com/emberjs/rfcs/blob/master/text/0095-router-service.md#query-parameter-semantics) for more info.
          @method transitionTo
       @param {String} routeNameOrUrl the name of the route or a URL
       @param {...Object} models the model(s) or identifier(s) to be used while
         transitioning to the route.
       @param {Object} [options] optional hash with a queryParams property
         containing a mapping of query parameters
       @return {Transition} the transition object associated with this
         attempted transition
       @public
     */


    transitionTo(...args) {
      if ((0, _utils.resemblesURL)(args[0])) {
        return this._router._doURLTransition('transitionTo', args[0]);
      }

      let {
        routeName,
        models,
        queryParams
      } = (0, _utils.extractRouteArgs)(args);

      let transition = this._router._doTransition(routeName, models, queryParams, true);

      transition['_keepDefaultQueryParamValues'] = true;
      return transition;
    }
    /**
       Transition into another route while replacing the current URL, if possible.
       The route may be either a single route or route path:
          See [replaceWith](/ember/release/classes/Route/methods/replaceWith?anchor=replaceWith) for more info.
          Calling `replaceWith` from the Router service will cause default query parameter values to be included in the URL.
       This behavior is different from calling `replaceWith` on a route.
       See the [Router Service RFC](https://github.com/emberjs/rfcs/blob/master/text/0095-router-service.md#query-parameter-semantics) for more info.
          @method replaceWith
       @param {String} routeNameOrUrl the name of the route or a URL
       @param {...Object} models the model(s) or identifier(s) to be used while
         transitioning to the route.
       @param {Object} [options] optional hash with a queryParams property
         containing a mapping of query parameters
       @return {Transition} the transition object associated with this
         attempted transition
       @public
     */


    replaceWith()
    /* routeNameOrUrl, ...models, options */
    {
      return this.transitionTo(...arguments).method('replace');
    }
    /**
      Generate a URL based on the supplied route name and optionally a model. The
      URL is returned as a string that can be used for any purpose.
         In this example, the URL for the `author.books` route for a given author
      is copied to the clipboard.
         ```app/components/copy-link.js
      import Component from '@ember/component';
      import {inject as service} from '@ember/service';
         export default Component.extend({
        router: service('router'),
        clipboard: service('clipboard')
           // Provided in the template
        // { id: 'tomster', name: 'Tomster' }
        author: null,
           copyBooksURL() {
          if (this.author) {
            const url = this.router.urlFor('author.books', this.author);
            this.clipboard.set(url);
            // Clipboard now has /author/tomster/books
          }
        }
      });
      ```
         Just like with `transitionTo` and `replaceWith`, `urlFor` can also handle
      query parameters.
         ```app/components/copy-link.js
      import Component from '@ember/component';
      import {inject as service} from '@ember/service';
         export default Component.extend({
        router: service('router'),
        clipboard: service('clipboard')
           // Provided in the template
        // { id: 'tomster', name: 'Tomster' }
        author: null,
           copyOnlyEmberBooksURL() {
          if (this.author) {
            const url = this.router.urlFor('author.books', this.author, {
              queryParams: { filter: 'emberjs' }
            });
            this.clipboard.set(url);
            // Clipboard now has /author/tomster/books?filter=emberjs
          }
        }
      });
      ```
          @method urlFor
       @param {String} routeName the name of the route
       @param {...Object} models the model(s) or identifier(s) to be used while
         transitioning to the route.
       @param {Object} [options] optional hash with a queryParams property
         containing a mapping of query parameters
       @return {String} the string representing the generated URL
       @public
     */


    urlFor(routeName, ...args) {
      return this._router.generate(routeName, ...args);
    }
    /**
       Determines whether a route is active.
          @method isActive
       @param {String} routeName the name of the route
       @param {...Object} models the model(s) or identifier(s) to be used while
         transitioning to the route.
       @param {Object} [options] optional hash with a queryParams property
         containing a mapping of query parameters
       @return {boolean} true if the provided routeName/models/queryParams are active
       @public
     */


    isActive(...args) {
      let {
        routeName,
        models,
        queryParams
      } = (0, _utils.extractRouteArgs)(args);
      let routerMicrolib = this._router._routerMicrolib;

      if (!routerMicrolib.isActiveIntent(routeName, models)) {
        return false;
      }

      let hasQueryParams = Object.keys(queryParams).length > 0;

      if (hasQueryParams) {
        this._router._prepareQueryParams(routeName, models, queryParams, true
        /* fromRouterService */
        );

        return (0, _utils.shallowEqual)(queryParams, routerMicrolib.state.queryParams);
      }

      return true;
    }
    /**
       Takes a string URL and returns a `RouteInfo` for the leafmost route represented
       by the URL. Returns `null` if the URL is not recognized. This method expects to
       receive the actual URL as seen by the browser including the app's `rootURL`.
           @method recognize
        @param {String} url
        @public
      */


    recognize(url) {
      false && !(url.indexOf(this.rootURL) === 0) && (0, _debug.assert)("You must pass a url that begins with the application's rootURL \"" + this.rootURL + "\"", url.indexOf(this.rootURL) === 0);
      let internalURL = cleanURL(url, this.rootURL);
      return this._router._routerMicrolib.recognize(internalURL);
    }
    /**
      Takes a string URL and returns a promise that resolves to a
      `RouteInfoWithAttributes` for the leafmost route represented by the URL.
      The promise rejects if the URL is not recognized or an unhandled exception
      is encountered. This method expects to receive the actual URL as seen by
      the browser including the app's `rootURL`.
           @method recognizeAndLoad
        @param {String} url
        @public
     */


    recognizeAndLoad(url) {
      false && !(url.indexOf(this.rootURL) === 0) && (0, _debug.assert)("You must pass a url that begins with the application's rootURL \"" + this.rootURL + "\"", url.indexOf(this.rootURL) === 0);
      let internalURL = cleanURL(url, this.rootURL);
      return this._router._routerMicrolib.recognizeAndLoad(internalURL);
    }

  }

  _exports.default = RouterService;
  RouterService.reopen(_runtime.Evented, {
    /**
       Name of the current route.
          This property represents the logical name of the route,
       which is comma separated.
       For the following router:
          ```app/router.js
       Router.map(function() {
         this.route('about');
         this.route('blog', function () {
           this.route('post', { path: ':post_id' });
         });
       });
       ```
          It will return:
          * `index` when you visit `/`
       * `about` when you visit `/about`
       * `blog.index` when you visit `/blog`
       * `blog.post` when you visit `/blog/some-post-id`
          @property currentRouteName
       @type String
       @public
     */
    currentRouteName: (0, _computed.readOnly)('_router.currentRouteName'),

    /**
       Current URL for the application.
         This property represents the URL path for this route.
      For the following router:
          ```app/router.js
       Router.map(function() {
         this.route('about');
         this.route('blog', function () {
           this.route('post', { path: ':post_id' });
         });
       });
       ```
          It will return:
          * `/` when you visit `/`
       * `/about` when you visit `/about`
       * `/blog` when you visit `/blog`
       * `/blog/some-post-id` when you visit `/blog/some-post-id`
          @property currentURL
       @type String
       @public
     */
    currentURL: (0, _computed.readOnly)('_router.currentURL'),

    /**
      The `location` property returns what implementation of the `location` API
      your application is using, which determines what type of URL is being used.
         See [Location](/ember/release/classes/Location) for more information.
         To force a particular `location` API implementation to be used in your
      application you can set a location type on your `config/environment`.
      For example, to set the `history` type:
         ```config/environment.js
      'use strict';
         module.exports = function(environment) {
        let ENV = {
          modulePrefix: 'router-service',
          environment,
          rootURL: '/',
          locationType: 'history',
          ...
        }
      }
      ```
         The following location types are available by default:
      `auto`, `hash`, `history`, `none`.
         See [HashLocation](/ember/release/classes/HashLocation).
      See [HistoryLocation](/ember/release/classes/HistoryLocation).
      See [NoneLocation](/ember/release/classes/NoneLocation).
      See [AutoLocation](/ember/release/classes/AutoLocation).
         @property location
      @default 'hash'
      @see {Location}
      @public
    */
    location: (0, _computed.readOnly)('_router.location'),

    /**
      The `rootURL` property represents the URL of the root of
      the application, '/' by default.
      This prefix is assumed on all routes defined on this app.
         If you change the `rootURL` in your environment configuration
      like so:
         ```config/environment.js
      'use strict';
         module.exports = function(environment) {
        let ENV = {
          modulePrefix: 'router-service',
          environment,
          rootURL: '/my-root',
        …
        }
      ]
      ```
         This property will return `/my-root`.
         @property rootURL
      @default '/'
      @public
    */
    rootURL: (0, _computed.readOnly)('_router.rootURL'),

    /**
      The `currentRoute` property contains metadata about the current leaf route.
      It returns a `RouteInfo` object that has information like the route name,
      params, query params and more.
         See [RouteInfo](/ember/release/classes/RouteInfo) for more info.
         This property is guaranteed to change whenever a route transition
      happens (even when that transition only changes parameters
      and doesn't change the active route).
         Usage example:
      ```app/components/header.js
        import Component from '@ember/component';
        import { inject as service } from '@ember/service';
        import { computed } from '@ember/object';
           export default Component.extend({
          router: service(),
             isChildRoute: computed.notEmpty('router.currentRoute.child')
        });
      ```
          @property currentRoute
       @type RouteInfo
       @public
     */
    currentRoute: (0, _computed.readOnly)('_router.currentRoute')
  });
});
enifed("@ember/-internals/routing/lib/services/routing", ["exports", "@ember/object/computed", "@ember/polyfills", "@ember/service"], function (_exports, _computed, _polyfills, _service) {
  "use strict";

  _exports.default = void 0;

  /**
  @module ember
  */

  /**
    The Routing service is used by LinkComponent, and provides facilities for
    the component/view layer to interact with the router.
  
    This is a private service for internal usage only. For public usage,
    refer to the `Router` service.
  
    @private
    @class RoutingService
  */
  class RoutingService extends _service.default {
    hasRoute(routeName) {
      return this.router.hasRoute(routeName);
    }

    transitionTo(routeName, models, queryParams, shouldReplace) {
      let transition = this.router._doTransition(routeName, models, queryParams);

      if (shouldReplace) {
        transition.method('replace');
      }

      return transition;
    }

    normalizeQueryParams(routeName, models, queryParams) {
      this.router._prepareQueryParams(routeName, models, queryParams);
    }

    generateURL(routeName, models, queryParams) {
      let router = this.router; // return early when the router microlib is not present, which is the case for {{link-to}} in integration tests

      if (!router._routerMicrolib) {
        return;
      }

      let visibleQueryParams = {};

      if (queryParams) {
        (0, _polyfills.assign)(visibleQueryParams, queryParams);
        this.normalizeQueryParams(routeName, models, visibleQueryParams);
      }

      return router.generate(routeName, ...models, {
        queryParams: visibleQueryParams
      });
    }

    isActiveForRoute(contexts, queryParams, routeName, routerState, isCurrentWhenSpecified) {
      let handlers = this.router._routerMicrolib.recognizer.handlersFor(routeName);

      let leafName = handlers[handlers.length - 1].handler;
      let maximumContexts = numberOfContextsAcceptedByHandler(routeName, handlers); // NOTE: any ugliness in the calculation of activeness is largely
      // due to the fact that we support automatic normalizing of
      // `resource` -> `resource.index`, even though there might be
      // dynamic segments / query params defined on `resource.index`
      // which complicates (and makes somewhat ambiguous) the calculation
      // of activeness for links that link to `resource` instead of
      // directly to `resource.index`.
      // if we don't have enough contexts revert back to full route name
      // this is because the leaf route will use one of the contexts

      if (contexts.length > maximumContexts) {
        routeName = leafName;
      }

      return routerState.isActiveIntent(routeName, contexts, queryParams, !isCurrentWhenSpecified);
    }

  }

  _exports.default = RoutingService;
  RoutingService.reopen({
    targetState: (0, _computed.readOnly)('router.targetState'),
    currentState: (0, _computed.readOnly)('router.currentState'),
    currentRouteName: (0, _computed.readOnly)('router.currentRouteName'),
    currentPath: (0, _computed.readOnly)('router.currentPath')
  });

  function numberOfContextsAcceptedByHandler(handlerName, handlerInfos) {
    let req = 0;

    for (let i = 0; i < handlerInfos.length; i++) {
      req += handlerInfos[i].names.length;

      if (handlerInfos[i].handler === handlerName) {
        break;
      }
    }

    return req;
  }
});
enifed("@ember/-internals/routing/lib/system/cache", ["exports"], function (_exports) {
  "use strict";

  _exports.default = void 0;

  /**
    A two-tiered cache with support for fallback values when doing lookups.
    Uses "buckets" and then "keys" to cache values.
  
    @private
    @class BucketCache
  */
  class BucketCache {
    constructor() {
      this.cache = new Map();
    }

    has(bucketKey) {
      return this.cache.has(bucketKey);
    }

    stash(bucketKey, key, value) {
      let bucket = this.cache.get(bucketKey);

      if (bucket === undefined) {
        bucket = new Map();
        this.cache.set(bucketKey, bucket);
      }

      bucket.set(key, value);
    }

    lookup(bucketKey, prop, defaultValue) {
      if (!this.has(bucketKey)) {
        return defaultValue;
      }

      let bucket = this.cache.get(bucketKey);

      if (bucket.has(prop)) {
        return bucket.get(prop);
      } else {
        return defaultValue;
      }
    }

  }

  _exports.default = BucketCache;
});
enifed("@ember/-internals/routing/lib/system/controller_for", ["exports"], function (_exports) {
  "use strict";

  _exports.default = controllerFor;

  /**
  @module ember
  */

  /**
    Finds a controller instance.
  
    @for Ember
    @method controllerFor
    @private
  */
  function controllerFor(container, controllerName, lookupOptions) {
    return container.lookup("controller:" + controllerName, lookupOptions);
  }
});
enifed("@ember/-internals/routing/lib/system/dsl", ["exports", "@ember/debug", "@ember/polyfills"], function (_exports, _debug, _polyfills) {
  "use strict";

  _exports.default = void 0;
  let uuid = 0;

  function isCallback(value) {
    return typeof value === 'function';
  }

  function isOptions(value) {
    return value !== null && typeof value === 'object';
  }

  class DSLImpl {
    constructor(name = null, options) {
      this.explicitIndex = false;
      this.parent = name;
      this.enableLoadingSubstates = Boolean(options && options.enableLoadingSubstates);
      this.matches = [];
      this.options = options;
    }

    route(name, _options, _callback) {
      let options;
      let callback = null;
      let dummyErrorRoute = "/_unused_dummy_error_path_route_" + name + "/:error";

      if (isCallback(_options)) {
        false && !(arguments.length === 2) && (0, _debug.assert)('Unexpected arguments', arguments.length === 2);
        options = {};
        callback = _options;
      } else if (isCallback(_callback)) {
        false && !(arguments.length === 3) && (0, _debug.assert)('Unexpected arguments', arguments.length === 3);
        false && !isOptions(_options) && (0, _debug.assert)('Unexpected arguments', isOptions(_options));
        options = _options;
        callback = _callback;
      } else {
        options = _options || {};
      }

      false && !(() => {
        if (options.overrideNameAssertion === true) {
          return true;
        }

        return ['basic', 'application'].indexOf(name) === -1;
      })() && (0, _debug.assert)("'" + name + "' cannot be used as a route name.", (() => {
        if (options.overrideNameAssertion === true) {
          return true;
        }

        return ['basic', 'application'].indexOf(name) === -1;
      })());
      false && !(name.indexOf(':') === -1) && (0, _debug.assert)("'" + name + "' is not a valid route name. It cannot contain a ':'. You may want to use the 'path' option instead.", name.indexOf(':') === -1);

      if (this.enableLoadingSubstates) {
        createRoute(this, name + "_loading", {
          resetNamespace: options.resetNamespace
        });
        createRoute(this, name + "_error", {
          resetNamespace: options.resetNamespace,
          path: dummyErrorRoute
        });
      }

      if (callback) {
        let fullName = getFullName(this, name, options.resetNamespace);
        let dsl = new DSLImpl(fullName, this.options);
        createRoute(dsl, 'loading');
        createRoute(dsl, 'error', {
          path: dummyErrorRoute
        });
        callback.call(dsl);
        createRoute(this, name, options, dsl.generate());
      } else {
        createRoute(this, name, options);
      }
    }
    /* eslint-enable no-dupe-class-members */


    push(url, name, callback, serialize) {
      let parts = name.split('.');

      if (this.options.engineInfo) {
        let localFullName = name.slice(this.options.engineInfo.fullName.length + 1);
        let routeInfo = (0, _polyfills.assign)({
          localFullName
        }, this.options.engineInfo);

        if (serialize) {
          routeInfo.serializeMethod = serialize;
        }

        this.options.addRouteForEngine(name, routeInfo);
      } else if (serialize) {
        throw new Error("Defining a route serializer on route '" + name + "' outside an Engine is not allowed.");
      }

      if (url === '' || url === '/' || parts[parts.length - 1] === 'index') {
        this.explicitIndex = true;
      }

      this.matches.push(url, name, callback);
    }

    generate() {
      let dslMatches = this.matches;

      if (!this.explicitIndex) {
        this.route('index', {
          path: '/'
        });
      }

      return match => {
        for (let i = 0; i < dslMatches.length; i += 3) {
          match(dslMatches[i]).to(dslMatches[i + 1], dslMatches[i + 2]);
        }
      };
    }

    mount(_name, options = {}) {
      let engineRouteMap = this.options.resolveRouteMap(_name);
      let name = _name;

      if (options.as) {
        name = options.as;
      }

      let fullName = getFullName(this, name, options.resetNamespace);
      let engineInfo = {
        name: _name,
        instanceId: uuid++,
        mountPoint: fullName,
        fullName
      };
      let path = options.path;

      if (typeof path !== 'string') {
        path = "/" + name;
      }

      let callback;
      let dummyErrorRoute = "/_unused_dummy_error_path_route_" + name + "/:error";

      if (engineRouteMap) {
        let shouldResetEngineInfo = false;
        let oldEngineInfo = this.options.engineInfo;

        if (oldEngineInfo) {
          shouldResetEngineInfo = true;
          this.options.engineInfo = engineInfo;
        }

        let optionsForChild = (0, _polyfills.assign)({
          engineInfo
        }, this.options);
        let childDSL = new DSLImpl(fullName, optionsForChild);
        createRoute(childDSL, 'loading');
        createRoute(childDSL, 'error', {
          path: dummyErrorRoute
        });
        engineRouteMap.class.call(childDSL);
        callback = childDSL.generate();

        if (shouldResetEngineInfo) {
          this.options.engineInfo = oldEngineInfo;
        }
      }

      let localFullName = 'application';
      let routeInfo = (0, _polyfills.assign)({
        localFullName
      }, engineInfo);

      if (this.enableLoadingSubstates) {
        // These values are important to register the loading routes under their
        // proper names for the Router and within the Engine's registry.
        let substateName = name + "_loading";
        let localFullName = "application_loading";
        let routeInfo = (0, _polyfills.assign)({
          localFullName
        }, engineInfo);
        createRoute(this, substateName, {
          resetNamespace: options.resetNamespace
        });
        this.options.addRouteForEngine(substateName, routeInfo);
        substateName = name + "_error";
        localFullName = "application_error";
        routeInfo = (0, _polyfills.assign)({
          localFullName
        }, engineInfo);
        createRoute(this, substateName, {
          resetNamespace: options.resetNamespace,
          path: dummyErrorRoute
        });
        this.options.addRouteForEngine(substateName, routeInfo);
      }

      this.options.addRouteForEngine(fullName, routeInfo);
      this.push(path, fullName, callback);
    }

  }

  _exports.default = DSLImpl;

  function canNest(dsl) {
    return dsl.parent !== 'application';
  }

  function getFullName(dsl, name, resetNamespace) {
    if (canNest(dsl) && resetNamespace !== true) {
      return dsl.parent + "." + name;
    } else {
      return name;
    }
  }

  function createRoute(dsl, name, options = {}, callback) {
    let fullName = getFullName(dsl, name, options.resetNamespace);

    if (typeof options.path !== 'string') {
      options.path = "/" + name;
    }

    dsl.push(options.path, fullName, callback, options.serialize);
  }
});
enifed("@ember/-internals/routing/lib/system/engines", [], function () {
  "use strict";
});
enifed("@ember/-internals/routing/lib/system/generate_controller", ["exports", "@ember/-internals/metal", "@ember/debug"], function (_exports, _metal, _debug) {
  "use strict";

  _exports.generateControllerFactory = generateControllerFactory;
  _exports.default = generateController;

  /**
  @module ember
  */

  /**
    Generates a controller factory
  
    @for Ember
    @method generateControllerFactory
    @private
  */
  function generateControllerFactory(owner, controllerName) {
    let Factory = owner.factoryFor('controller:basic').class;
    Factory = Factory.extend({
      toString() {
        return "(generated " + controllerName + " controller)";
      }

    });
    let fullName = "controller:" + controllerName;
    owner.register(fullName, Factory);
    return owner.factoryFor(fullName);
  }
  /**
    Generates and instantiates a controller extending from `controller:basic`
    if present, or `Controller` if not.
  
    @for Ember
    @method generateController
    @private
    @since 1.3.0
  */


  function generateController(owner, controllerName) {
    generateControllerFactory(owner, controllerName);
    let fullName = "controller:" + controllerName;
    let instance = owner.lookup(fullName);

    if (false
    /* DEBUG */
    ) {
        if ((0, _metal.get)(instance, 'namespace.LOG_ACTIVE_GENERATION')) {
          (0, _debug.info)("generated -> " + fullName, {
            fullName
          });
        }
      }

    return instance;
  }
});
enifed("@ember/-internals/routing/lib/system/query_params", ["exports"], function (_exports) {
  "use strict";

  _exports.default = void 0;

  class QueryParams {
    constructor(values = null) {
      this.isQueryParams = true;
      this.values = values;
    }

  }

  _exports.default = QueryParams;
});
enifed("@ember/-internals/routing/lib/system/route-info", [], function () {
  "use strict";
  /**
    A `RouteInfoWithAttributes` is an object that contains
    metadata, including the resolved value from the routes
    `model` hook. Like `RouteInfo`, a `RouteInfoWithAttributes`
    represents a specific route within a Transition.
    It is read-only and internally immutable. It is also not
    observable, because a Transition instance is never
    changed after creation.
  
    @class RouteInfoWithAttributes
    @public
  */

  /**
    The dot-separated, fully-qualified name of the
    route, like "people.index".
    @property {String} name
    @public
  */

  /**
    The final segment of the fully-qualified name of
    the route, like "index"
    @property {String} localName
    @public
  */

  /**
    The values of the route's parameters. These are the
    same params that are received as arguments to the
    route's model hook. Contains only the parameters
    valid for this route, if any (params for parent or
    child routes are not merged).
    @property {Object} params
    @public
  */

  /**
    The ordered list of the names of the params
    required for this route. It will contain the same
    strings as `Object.keys(params)`, but here the order
    is significant. This allows users to correctly pass
    params into routes programmatically.
    @property {Array} paramNames
    @public
  */

  /**
    The values of any queryParams on this route.
    @property {Object} queryParams
    @public
  */

  /**
    This is the resolved return value from the
    route's model hook.
    @property {Object|Array|String} attributes
    @public
  */

  /**
    Will contain the result `Route#buildRouteInfoMetadata`
    for the corresponding Route.
    @property {Any} metadata
    @public
  */

  /**
    A reference to the parent route's RouteInfo.
    This can be used to traverse upward to the topmost
    `RouteInfo`.
    @property {RouteInfo|null} parent
    @public
  */

  /**
    A reference to the child route's RouteInfo.
    This can be used to traverse downward to the
    leafmost `RouteInfo`.
    @property {RouteInfo|null} child
    @public
  */

  /**
    Allows you to traverse through the linked list
    of `RouteInfo`s from the topmost to leafmost.
    Returns the first `RouteInfo` in the linked list
    for which the callback returns true.
  
      This method is similar to the `find()` method
      defined in ECMAScript 2015.
  
      The callback method you provide should have the
      following signature (all parameters are optional):
  
      ```javascript
      function(item, index, array);
      ```
  
      - `item` is the current item in the iteration.
      - `index` is the current index in the iteration.
      - `array` is the array itself.
  
      It should return the `true` to include the item in
      the results, `false` otherwise.
  
      Note that in addition to a callback, you can also
      pass an optional target object that will be set as
      `this` on the context.
  
    @method find
    @param {Function} callback the callback to execute
    @param {Object} [target*] optional target to use
    @returns {Object} Found item or undefined
    @public
  */

  /**
    A RouteInfo is an object that contains metadata
    about a specific route within a Transition. It is
    read-only and internally immutable. It is also not
    observable, because a Transition instance is never
    changed after creation.
  
    @class RouteInfo
    @public
  */

  /**
    The dot-separated, fully-qualified name of the
    route, like "people.index".
    @property {String} name
    @public
  */

  /**
    The final segment of the fully-qualified name of
    the route, like "index"
    @property {String} localName
    @public
  */

  /**
    The values of the route's parameters. These are the
    same params that are received as arguments to the
    route's `model` hook. Contains only the parameters
    valid for this route, if any (params for parent or
    child routes are not merged).
    @property {Object} params
    @public
  */

  /**
    The ordered list of the names of the params
    required for this route. It will contain the same
    strings as Object.keys(params), but here the order
    is significant. This allows users to correctly pass
    params into routes programmatically.
    @property {Array} paramNames
    @public
  */

  /**
    The values of any queryParams on this route.
    @property {Object} queryParams
    @public
  */

  /**
    A reference to the parent route's `RouteInfo`.
    This can be used to traverse upward to the topmost
    `RouteInfo`.
    @property {RouteInfo|null} parent
    @public
  */

  /**
    A reference to the child route's `RouteInfo`.
    This can be used to traverse downward to the
    leafmost `RouteInfo`.
    @property {RouteInfo|null} child
    @public
  */

  /**
    Allows you to traverse through the linked list
    of `RouteInfo`s from the topmost to leafmost.
    Returns the first `RouteInfo` in the linked list
    for which the callback returns true.
  
      This method is similar to the `find()` method
      defined in ECMAScript 2015.
  
      The callback method you provide should have the
      following signature (all parameters are optional):
  
      ```javascript
      function(item, index, array);
      ```
  
      - `item` is the current item in the iteration.
      - `index` is the current index in the iteration.
      - `array` is the array itself.
  
      It should return the `true` to include the item in
      the results, `false` otherwise.
  
      Note that in addition to a callback, you can also
      pass an optional target object that will be set as
      `this` on the context.
  
    @method find
    @param {Function} callback the callback to execute
    @param {Object} [target*] optional target to use
    @returns {Object} Found item or undefined
    @public
  */
});
enifed("@ember/-internals/routing/lib/system/route", ["exports", "@ember/-internals/metal", "@ember/-internals/owner", "@ember/-internals/runtime", "@ember/debug", "@ember/deprecated-features", "@ember/polyfills", "@ember/runloop", "@ember/string", "router_js", "@ember/-internals/routing/lib/utils", "@ember/-internals/routing/lib/system/generate_controller"], function (_exports, _metal, _owner, _runtime, _debug, _deprecatedFeatures, _polyfills, _runloop, _string, _router_js, _utils, _generate_controller) {
  "use strict";

  _exports.defaultSerialize = defaultSerialize;
  _exports.hasDefaultSerialize = hasDefaultSerialize;
  _exports.default = _exports.ROUTER_EVENT_DEPRECATIONS = _exports.ROUTE_CONNECTIONS = void 0;
  const ROUTE_CONNECTIONS = new WeakMap();
  _exports.ROUTE_CONNECTIONS = ROUTE_CONNECTIONS;

  function defaultSerialize(model, params) {
    if (params.length < 1 || !model) {
      return;
    }

    let object = {};

    if (params.length === 1) {
      let [name] = params;

      if (name in model) {
        object[name] = (0, _metal.get)(model, name);
      } else if (/_id$/.test(name)) {
        object[name] = (0, _metal.get)(model, 'id');
      }
    } else {
      object = (0, _metal.getProperties)(model, params);
    }

    return object;
  }

  function hasDefaultSerialize(route) {
    return route.serialize === defaultSerialize;
  }
  /**
  @module @ember/routing
  */

  /**
    The `Route` class is used to define individual routes. Refer to
    the [routing guide](https://guides.emberjs.com/release/routing/) for documentation.
  
    @class Route
    @extends EmberObject
    @uses ActionHandler
    @uses Evented
    @since 1.0.0
    @public
  */


  class Route extends _runtime.Object {
    constructor() {
      super(...arguments);
      this.context = {};
    }
    /**
      The name of the route, dot-delimited.
         For example, a route found at `app/routes/posts/post.js` will have
      a `routeName` of `posts.post`.
         @property routeName
      @for Route
      @type String
      @since 1.0.0
      @public
    */

    /**
      The name of the route, dot-delimited, including the engine prefix
      if applicable.
         For example, a route found at `addon/routes/posts/post.js` within an
      engine named `admin` will have a `fullRouteName` of `admin.posts.post`.
         @property fullRouteName
      @for Route
      @type String
      @since 2.10.0
      @public
    */

    /**
      Sets the name for this route, including a fully resolved name for routes
      inside engines.
         @private
      @method _setRouteName
      @param {String} name
    */


    _setRouteName(name) {
      this.routeName = name;
      this.fullRouteName = getEngineRouteName((0, _owner.getOwner)(this), name);
    }
    /**
      @private
         @method _stashNames
    */


    _stashNames(routeInfo, dynamicParent) {
      if (this._names) {
        return;
      }

      let names = this._names = routeInfo['_names'];

      if (!names.length) {
        routeInfo = dynamicParent;
        names = routeInfo && routeInfo['_names'] || [];
      }

      let qps = (0, _metal.get)(this, '_qp.qps');
      let namePaths = new Array(names.length);

      for (let a = 0; a < names.length; ++a) {
        namePaths[a] = routeInfo.name + "." + names[a];
      }

      for (let i = 0; i < qps.length; ++i) {
        let qp = qps[i];

        if (qp.scope === 'model') {
          qp.parts = namePaths;
        }
      }
    }
    /**
      @private
         @property _activeQPChanged
    */


    _activeQPChanged(qp, value) {
      this._router._activeQPChanged(qp.scopedPropertyName, value);
    }
    /**
      @private
      @method _updatingQPChanged
    */


    _updatingQPChanged(qp) {
      this._router._updatingQPChanged(qp.urlKey);
    }
    /**
      Returns a hash containing the parameters of an ancestor route.
         You may notice that `this.paramsFor` sometimes works when referring to a
      child route, but this behavior should not be relied upon as only ancestor
      routes are certain to be loaded in time.
         Example
         ```app/router.js
      // ...
         Router.map(function() {
        this.route('member', { path: ':name' }, function() {
          this.route('interest', { path: ':interest' });
        });
      });
      ```
         ```app/routes/member.js
      import Route from '@ember/routing/route';
         export default Route.extend({
        queryParams: {
          memberQp: { refreshModel: true }
        }
      });
      ```
         ```app/routes/member/interest.js
      import Route from '@ember/routing/route';
         export default Route.extend({
        queryParams: {
          interestQp: { refreshModel: true }
        },
           model() {
          return this.paramsFor('member');
        }
      });
      ```
         If we visit `/turing/maths?memberQp=member&interestQp=interest` the model for
      the `member.interest` route is a hash with:
         * `name`: `turing`
      * `memberQp`: `member`
         @method paramsFor
      @param {String} name
      @return {Object} hash containing the parameters of the route `name`
      @since 1.4.0
      @public
    */


    paramsFor(name) {
      let route = (0, _owner.getOwner)(this).lookup("route:" + name);

      if (route === undefined) {
        return {};
      }

      let transition = this._router._routerMicrolib.activeTransition;
      let state = transition ? transition[_router_js.STATE_SYMBOL] : this._router._routerMicrolib.state;
      let fullName = route.fullRouteName;
      let params = (0, _polyfills.assign)({}, state.params[fullName]);
      let queryParams = getQueryParamsFor(route, state);
      return Object.keys(queryParams).reduce((params, key) => {
        false && !!params[key] && (0, _debug.assert)("The route '" + this.routeName + "' has both a dynamic segment and query param with name '" + key + "'. Please rename one to avoid collisions.", !params[key]);
        params[key] = queryParams[key];
        return params;
      }, params);
    }
    /**
      Serializes the query parameter key
         @method serializeQueryParamKey
      @param {String} controllerPropertyName
      @private
    */


    serializeQueryParamKey(controllerPropertyName) {
      return controllerPropertyName;
    }
    /**
      Serializes value of the query parameter based on defaultValueType
         @method serializeQueryParam
      @param {Object} value
      @param {String} urlKey
      @param {String} defaultValueType
      @private
    */


    serializeQueryParam(value, _urlKey, defaultValueType) {
      // urlKey isn't used here, but anyone overriding
      // can use it to provide serialization specific
      // to a certain query param.
      return this._router._serializeQueryParam(value, defaultValueType);
    }
    /**
      Deserializes value of the query parameter based on defaultValueType
         @method deserializeQueryParam
      @param {Object} value
      @param {String} urlKey
      @param {String} defaultValueType
      @private
    */


    deserializeQueryParam(value, _urlKey, defaultValueType) {
      // urlKey isn't used here, but anyone overriding
      // can use it to provide deserialization specific
      // to a certain query param.
      return this._router._deserializeQueryParam(value, defaultValueType);
    }
    /**
      @private
         @property _optionsForQueryParam
    */


    _optionsForQueryParam(qp) {
      return (0, _metal.get)(this, "queryParams." + qp.urlKey) || (0, _metal.get)(this, "queryParams." + qp.prop) || {};
    }
    /**
      A hook you can use to reset controller values either when the model
      changes or the route is exiting.
         ```app/routes/articles.js
      import Route from '@ember/routing/route';
         export default Route.extend({
        resetController(controller, isExiting, transition) {
          if (isExiting && transition.targetName !== 'error') {
            controller.set('page', 1);
          }
        }
      });
      ```
         @method resetController
      @param {Controller} controller instance
      @param {Boolean} isExiting
      @param {Object} transition
      @since 1.7.0
      @public
    */


    resetController(_controller, _isExiting, _transition) {
      return this;
    }
    /**
      @private
         @method exit
    */


    exit() {
      this.deactivate();
      this.trigger('deactivate');
      this.teardownViews();
    }
    /**
      @private
         @method _internalReset
      @since 3.6.0
    */


    _internalReset(isExiting, transition) {
      let controller = this.controller;
      controller._qpDelegate = (0, _metal.get)(this, '_qp.states.inactive');
      this.resetController(controller, isExiting, transition);
    }
    /**
      @private
         @method enter
    */


    enter() {
      ROUTE_CONNECTIONS.set(this, []);
      this.activate();
      this.trigger('activate');
    }
    /**
      The `willTransition` action is fired at the beginning of any
      attempted transition with a `Transition` object as the sole
      argument. This action can be used for aborting, redirecting,
      or decorating the transition from the currently active routes.
         A good example is preventing navigation when a form is
      half-filled out:
         ```app/routes/contact-form.js
      import Route from '@ember/routing/route';
         export default Route.extend({
        actions: {
          willTransition(transition) {
            if (this.controller.get('userHasEnteredData')) {
              this.controller.displayNavigationConfirm();
              transition.abort();
            }
          }
        }
      });
      ```
         You can also redirect elsewhere by calling
      `this.transitionTo('elsewhere')` from within `willTransition`.
      Note that `willTransition` will not be fired for the
      redirecting `transitionTo`, since `willTransition` doesn't
      fire when there is already a transition underway. If you want
      subsequent `willTransition` actions to fire for the redirecting
      transition, you must first explicitly call
      `transition.abort()`.
         To allow the `willTransition` event to continue bubbling to the parent
      route, use `return true;`. When the `willTransition` method has a
      return value of `true` then the parent route's `willTransition` method
      will be fired, enabling "bubbling" behavior for the event.
         @event willTransition
      @param {Transition} transition
      @since 1.0.0
      @public
    */

    /**
      The `didTransition` action is fired after a transition has
      successfully been completed. This occurs after the normal model
      hooks (`beforeModel`, `model`, `afterModel`, `setupController`)
      have resolved. The `didTransition` action has no arguments,
      however, it can be useful for tracking page views or resetting
      state on the controller.
         ```app/routes/login.js
      import Route from '@ember/routing/route';
         export default Route.extend({
        actions: {
          didTransition() {
            this.controller.get('errors.base').clear();
            return true; // Bubble the didTransition event
          }
        }
      });
      ```
         @event didTransition
      @since 1.2.0
      @public
    */

    /**
      The `loading` action is fired on the route when a route's `model`
      hook returns a promise that is not already resolved. The current
      `Transition` object is the first parameter and the route that
      triggered the loading event is the second parameter.
         ```app/routes/application.js
      import Route from '@ember/routing/route';
         export default Route.extend({
        actions: {
          loading(transition, route) {
            let controller = this.controllerFor('foo');
            controller.set('currentlyLoading', true);
               transition.finally(function() {
              controller.set('currentlyLoading', false);
            });
          }
        }
      });
      ```
         @event loading
      @param {Transition} transition
      @param {Route} route The route that triggered the loading event
      @since 1.2.0
      @public
    */

    /**
      When attempting to transition into a route, any of the hooks
      may return a promise that rejects, at which point an `error`
      action will be fired on the partially-entered routes, allowing
      for per-route error handling logic, or shared error handling
      logic defined on a parent route.
         Here is an example of an error handler that will be invoked
      for rejected promises from the various hooks on the route,
      as well as any unhandled errors from child routes:
         ```app/routes/admin.js
      import { reject } from 'rsvp';
      import Route from '@ember/routing/route';
         export default Route.extend({
        beforeModel() {
          return reject('bad things!');
        },
           actions: {
          error(error, transition) {
            // Assuming we got here due to the error in `beforeModel`,
            // we can expect that error === "bad things!",
            // but a promise model rejecting would also
            // call this hook, as would any errors encountered
            // in `afterModel`.
               // The `error` hook is also provided the failed
            // `transition`, which can be stored and later
            // `.retry()`d if desired.
               this.transitionTo('login');
          }
        }
      });
      ```
         `error` actions that bubble up all the way to `ApplicationRoute`
      will fire a default error handler that logs the error. You can
      specify your own global default error handler by overriding the
      `error` handler on `ApplicationRoute`:
         ```app/routes/application.js
      import Route from '@ember/routing/route';
         export default Route.extend({
        actions: {
          error(error, transition) {
            this.controllerFor('banner').displayError(error.message);
          }
        }
      });
      ```
      @event error
      @param {Error} error
      @param {Transition} transition
      @since 1.0.0
      @public
    */

    /**
      This event is triggered when the router enters the route. It is
      not executed when the model for the route changes.
         ```app/routes/application.js
      import { on } from '@ember/object/evented';
      import Route from '@ember/routing/route';
         export default Route.extend({
        collectAnalytics: on('activate', function(){
          collectAnalytics();
        })
      });
      ```
         @event activate
      @since 1.9.0
      @public
    */

    /**
      This event is triggered when the router completely exits this
      route. It is not executed when the model for the route changes.
         ```app/routes/index.js
      import { on } from '@ember/object/evented';
      import Route from '@ember/routing/route';
         export default Route.extend({
        trackPageLeaveAnalytics: on('deactivate', function(){
          trackPageLeaveAnalytics();
        })
      });
      ```
         @event deactivate
      @since 1.9.0
      @public
    */

    /**
      This hook is executed when the router completely exits this route. It is
      not executed when the model for the route changes.
         @method deactivate
      @since 1.0.0
      @public
    */


    deactivate() {}
    /**
      This hook is executed when the router enters the route. It is not executed
      when the model for the route changes.
         @method activate
      @since 1.0.0
      @public
    */


    activate() {}
    /**
      Transition the application into another route. The route may
      be either a single route or route path:
         ```javascript
      this.transitionTo('blogPosts');
      this.transitionTo('blogPosts.recentEntries');
      ```
         Optionally supply a model for the route in question. The model
      will be serialized into the URL using the `serialize` hook of
      the route:
         ```javascript
      this.transitionTo('blogPost', aPost);
      ```
         If a literal is passed (such as a number or a string), it will
      be treated as an identifier instead. In this case, the `model`
      hook of the route will be triggered:
         ```javascript
      this.transitionTo('blogPost', 1);
      ```
         Multiple models will be applied last to first recursively up the
      route tree.
         ```app/routes.js
      // ...
         Router.map(function() {
        this.route('blogPost', { path:':blogPostId' }, function() {
          this.route('blogComment', { path: ':blogCommentId' });
        });
      });
         export default Router;
      ```
         ```javascript
      this.transitionTo('blogComment', aPost, aComment);
      this.transitionTo('blogComment', 1, 13);
      ```
         It is also possible to pass a URL (a string that starts with a
      `/`).
         ```javascript
      this.transitionTo('/');
      this.transitionTo('/blog/post/1/comment/13');
      this.transitionTo('/blog/posts?sort=title');
      ```
         An options hash with a `queryParams` property may be provided as
      the final argument to add query parameters to the destination URL.
         ```javascript
      this.transitionTo('blogPost', 1, {
        queryParams: { showComments: 'true' }
      });
         // if you just want to transition the query parameters without changing the route
      this.transitionTo({ queryParams: { sort: 'date' } });
      ```
         See also [replaceWith](#method_replaceWith).
         Simple Transition Example
         ```app/routes.js
      // ...
         Router.map(function() {
        this.route('index');
        this.route('secret');
        this.route('fourOhFour', { path: '*:' });
      });
         export default Router;
      ```
         ```app/routes/index.js
      import Route from '@ember/routing/route';
         export Route.extend({
        actions: {
          moveToSecret(context) {
            if (authorized()) {
              this.transitionTo('secret', context);
            } else {
              this.transitionTo('fourOhFour');
            }
          }
        }
      });
      ```
         Transition to a nested route
         ```app/router.js
      // ...
         Router.map(function() {
        this.route('articles', { path: '/articles' }, function() {
          this.route('new');
        });
      });
         export default Router;
      ```
         ```app/routes/index.js
      import Route from '@ember/routing/route';
         export default Route.extend({
        actions: {
          transitionToNewArticle() {
            this.transitionTo('articles.new');
          }
        }
      });
      ```
         Multiple Models Example
         ```app/router.js
      // ...
         Router.map(function() {
        this.route('index');
           this.route('breakfast', { path: ':breakfastId' }, function() {
          this.route('cereal', { path: ':cerealId' });
        });
      });
         export default Router;
      ```
         ```app/routes/index.js
      import Route from '@ember/routing/route';
         export default Route.extend({
        actions: {
          moveToChocolateCereal() {
            let cereal = { cerealId: 'ChocolateYumminess' };
            let breakfast = { breakfastId: 'CerealAndMilk' };
               this.transitionTo('breakfast.cereal', breakfast, cereal);
          }
        }
      });
      ```
         Nested Route with Query String Example
         ```app/routes.js
      // ...
         Router.map(function() {
        this.route('fruits', function() {
          this.route('apples');
        });
      });
         export default Router;
      ```
         ```app/routes/index.js
      import Route from '@ember/routing/route';
         export default Route.extend({
        actions: {
          transitionToApples() {
            this.transitionTo('fruits.apples', { queryParams: { color: 'red' } });
          }
        }
      });
      ```
         @method transitionTo
      @param {String} name the name of the route or a URL
      @param {...Object} models the model(s) or identifier(s) to be used while
        transitioning to the route.
      @param {Object} [options] optional hash with a queryParams property
        containing a mapping of query parameters
      @return {Transition} the transition object associated with this
        attempted transition
      @since 1.0.0
      @public
    */


    transitionTo(...args) {
      // eslint-disable-line no-unused-vars
      return this._router.transitionTo(...(0, _utils.prefixRouteNameArg)(this, args));
    }
    /**
      Perform a synchronous transition into another route without attempting
      to resolve promises, update the URL, or abort any currently active
      asynchronous transitions (i.e. regular transitions caused by
      `transitionTo` or URL changes).
         This method is handy for performing intermediate transitions on the
      way to a final destination route, and is called internally by the
      default implementations of the `error` and `loading` handlers.
         @method intermediateTransitionTo
      @param {String} name the name of the route
      @param {...Object} models the model(s) to be used while transitioning
      to the route.
      @since 1.2.0
      @public
     */


    intermediateTransitionTo(...args) {
      let [name, ...preparedArgs] = (0, _utils.prefixRouteNameArg)(this, args);

      this._router.intermediateTransitionTo(name, ...preparedArgs);
    }
    /**
      Refresh the model on this route and any child routes, firing the
      `beforeModel`, `model`, and `afterModel` hooks in a similar fashion
      to how routes are entered when transitioning in from other route.
      The current route params (e.g. `article_id`) will be passed in
      to the respective model hooks, and if a different model is returned,
      `setupController` and associated route hooks will re-fire as well.
         An example usage of this method is re-querying the server for the
      latest information using the same parameters as when the route
      was first entered.
         Note that this will cause `model` hooks to fire even on routes
      that were provided a model object when the route was initially
      entered.
         @method refresh
      @return {Transition} the transition object associated with this
        attempted transition
      @since 1.4.0
      @public
     */


    refresh() {
      return this._router._routerMicrolib.refresh(this);
    }
    /**
      Transition into another route while replacing the current URL, if possible.
      This will replace the current history entry instead of adding a new one.
      Beside that, it is identical to `transitionTo` in all other respects. See
      'transitionTo' for additional information regarding multiple models.
         Example
         ```app/router.js
      // ...
         Router.map(function() {
        this.route('index');
        this.route('secret');
      });
         export default Router;
      ```
         ```app/routes/secret.js
      import Route from '@ember/routing/route';
         export default Route.extend({
        afterModel() {
          if (!authorized()){
            this.replaceWith('index');
          }
        }
      });
      ```
         @method replaceWith
      @param {String} name the name of the route or a URL
      @param {...Object} models the model(s) or identifier(s) to be used while
        transitioning to the route.
      @param {Object} [options] optional hash with a queryParams property
        containing a mapping of query parameters
      @return {Transition} the transition object associated with this
        attempted transition
      @since 1.0.0
      @public
    */


    replaceWith(...args) {
      return this._router.replaceWith(...(0, _utils.prefixRouteNameArg)(this, args));
    }
    /**
      This hook is the entry point for router.js
         @private
      @method setup
    */


    setup(context, transition) {
      let controllerName = this.controllerName || this.routeName;
      let definedController = this.controllerFor(controllerName, true);
      let controller;

      if (definedController) {
        controller = definedController;
      } else {
        controller = this.generateController(controllerName);
      } // Assign the route's controller so that it can more easily be
      // referenced in action handlers. Side effects. Side effects everywhere.


      if (!this.controller) {
        let qp = (0, _metal.get)(this, '_qp');
        let propNames = qp !== undefined ? (0, _metal.get)(qp, 'propertyNames') : [];
        addQueryParamsObservers(controller, propNames);
        this.controller = controller;
      }

      let queryParams = (0, _metal.get)(this, '_qp');
      let states = queryParams.states;
      controller._qpDelegate = states.allowOverrides;

      if (transition) {
        // Update the model dep values used to calculate cache keys.
        (0, _utils.stashParamNames)(this._router, transition[_router_js.STATE_SYMBOL].routeInfos);
        let cache = this._bucketCache;
        let params = transition[_router_js.PARAMS_SYMBOL];
        let allParams = queryParams.propertyNames;
        allParams.forEach(prop => {
          let aQp = queryParams.map[prop];
          aQp.values = params;
          let cacheKey = (0, _utils.calculateCacheKey)(aQp.route.fullRouteName, aQp.parts, aQp.values);
          let value = cache.lookup(cacheKey, prop, aQp.undecoratedDefaultValue);
          (0, _metal.set)(controller, prop, value);
        });
        let qpValues = getQueryParamsFor(this, transition[_router_js.STATE_SYMBOL]);
        (0, _metal.setProperties)(controller, qpValues);
      }

      this.setupController(controller, context, transition);

      if (this._environment.options.shouldRender) {
        this.renderTemplate(controller, context);
      }
    }
    /*
      Called when a query parameter for this route changes, regardless of whether the route
      is currently part of the active route hierarchy. This will update the query parameter's
      value in the cache so if this route becomes active, the cache value has been updated.
    */


    _qpChanged(prop, value, qp) {
      if (!qp) {
        return;
      } // Update model-dep cache


      let cache = this._bucketCache;
      let cacheKey = (0, _utils.calculateCacheKey)(qp.route.fullRouteName, qp.parts, qp.values);
      cache.stash(cacheKey, prop, value);
    }
    /**
      This hook is the first of the route entry validation hooks
      called when an attempt is made to transition into a route
      or one of its children. It is called before `model` and
      `afterModel`, and is appropriate for cases when:
         1) A decision can be made to redirect elsewhere without
         needing to resolve the model first.
      2) Any async operations need to occur first before the
         model is attempted to be resolved.
         This hook is provided the current `transition` attempt
      as a parameter, which can be used to `.abort()` the transition,
      save it for a later `.retry()`, or retrieve values set
      on it from a previous hook. You can also just call
      `this.transitionTo` to another route to implicitly
      abort the `transition`.
         You can return a promise from this hook to pause the
      transition until the promise resolves (or rejects). This could
      be useful, for instance, for retrieving async code from
      the server that is required to enter a route.
         @method beforeModel
      @param {Transition} transition
      @return {any | Promise<any>} if the value returned from this hook is
        a promise, the transition will pause until the transition
        resolves. Otherwise, non-promise return values are not
        utilized in any way.
      @since 1.0.0
      @public
    */


    beforeModel() {}
    /**
      This hook is called after this route's model has resolved.
      It follows identical async/promise semantics to `beforeModel`
      but is provided the route's resolved model in addition to
      the `transition`, and is therefore suited to performing
      logic that can only take place after the model has already
      resolved.
         ```app/routes/posts.js
      import Route from '@ember/routing/route';
         export default Route.extend({
        afterModel(posts, transition) {
          if (posts.get('length') === 1) {
            this.transitionTo('post.show', posts.get('firstObject'));
          }
        }
      });
      ```
         Refer to documentation for `beforeModel` for a description
      of transition-pausing semantics when a promise is returned
      from this hook.
         @method afterModel
      @param {Object} resolvedModel the value returned from `model`,
        or its resolved value if it was a promise
      @param {Transition} transition
      @return {any | Promise<any>} if the value returned from this hook is
        a promise, the transition will pause until the transition
        resolves. Otherwise, non-promise return values are not
        utilized in any way.
      @since 1.0.0
      @public
     */


    afterModel() {}
    /**
      A hook you can implement to optionally redirect to another route.
         If you call `this.transitionTo` from inside of this hook, this route
      will not be entered in favor of the other hook.
         `redirect` and `afterModel` behave very similarly and are
      called almost at the same time, but they have an important
      distinction in the case that, from one of these hooks, a
      redirect into a child route of this route occurs: redirects
      from `afterModel` essentially invalidate the current attempt
      to enter this route, and will result in this route's `beforeModel`,
      `model`, and `afterModel` hooks being fired again within
      the new, redirecting transition. Redirects that occur within
      the `redirect` hook, on the other hand, will _not_ cause
      these hooks to be fired again the second time around; in
      other words, by the time the `redirect` hook has been called,
      both the resolved model and attempted entry into this route
      are considered to be fully validated.
         @method redirect
      @param {Object} model the model for this route
      @param {Transition} transition the transition object associated with the current transition
      @since 1.0.0
      @public
    */


    redirect() {}
    /**
      Called when the context is changed by router.js.
         @private
      @method contextDidChange
    */


    contextDidChange() {
      this.currentModel = this.context;
    }
    /**
      A hook you can implement to convert the URL into the model for
      this route.
         ```app/router.js
      // ...
         Router.map(function() {
        this.route('post', { path: '/posts/:post_id' });
      });
         export default Router;
      ```
         The model for the `post` route is `store.findRecord('post', params.post_id)`.
         By default, if your route has a dynamic segment ending in `_id`:
         * The model class is determined from the segment (`post_id`'s
        class is `App.Post`)
      * The find method is called on the model class with the value of
        the dynamic segment.
         Note that for routes with dynamic segments, this hook is not always
      executed. If the route is entered through a transition (e.g. when
      using the `link-to` Handlebars helper or the `transitionTo` method
      of routes), and a model context is already provided this hook
      is not called.
         A model context does not include a primitive string or number,
      which does cause the model hook to be called.
         Routes without dynamic segments will always execute the model hook.
         ```javascript
      // no dynamic segment, model hook always called
      this.transitionTo('posts');
         // model passed in, so model hook not called
      thePost = store.findRecord('post', 1);
      this.transitionTo('post', thePost);
         // integer passed in, model hook is called
      this.transitionTo('post', 1);
         // model id passed in, model hook is called
      // useful for forcing the hook to execute
      thePost = store.findRecord('post', 1);
      this.transitionTo('post', thePost.id);
      ```
         This hook follows the asynchronous/promise semantics
      described in the documentation for `beforeModel`. In particular,
      if a promise returned from `model` fails, the error will be
      handled by the `error` hook on `Route`.
         Example
         ```app/routes/post.js
      import Route from '@ember/routing/route';
         export default Route.extend({
        model(params) {
          return this.store.findRecord('post', params.post_id);
        }
      });
      ```
         @method model
      @param {Object} params the parameters extracted from the URL
      @param {Transition} transition
      @return {any | Promise<any>} the model for this route. If
        a promise is returned, the transition will pause until
        the promise resolves, and the resolved value of the promise
        will be used as the model for this route.
      @since 1.0.0
      @public
    */


    model(params, transition) {
      let name, sawParams, value;
      let queryParams = (0, _metal.get)(this, '_qp.map');

      for (let prop in params) {
        if (prop === 'queryParams' || queryParams && prop in queryParams) {
          continue;
        }

        let match = prop.match(/^(.*)_id$/);

        if (match !== null) {
          name = match[1];
          value = params[prop];
        }

        sawParams = true;
      }

      if (!name) {
        if (sawParams) {
          return Object.assign({}, params);
        } else {
          if (transition.resolveIndex < 1) {
            return;
          }

          return transition[_router_js.STATE_SYMBOL].routeInfos[transition.resolveIndex - 1].context;
        }
      }

      return this.findModel(name, value);
    }
    /**
      @private
      @method deserialize
      @param {Object} params the parameters extracted from the URL
      @param {Transition} transition
      @return {any | Promise<any>} the model for this route.
         Router.js hook.
     */


    deserialize(_params, transition) {
      return this.model(this._paramsFor(this.routeName, _params), transition);
    }
    /**
         @method findModel
      @param {String} type the model type
      @param {Object} value the value passed to find
      @private
    */


    findModel(...args) {
      return (0, _metal.get)(this, 'store').find(...args);
    }
    /**
      A hook you can use to setup the controller for the current route.
         This method is called with the controller for the current route and the
      model supplied by the `model` hook.
         By default, the `setupController` hook sets the `model` property of
      the controller to the specified `model` when it is not `undefined`.
         If you implement the `setupController` hook in your Route, it will
      prevent this default behavior. If you want to preserve that behavior
      when implementing your `setupController` function, make sure to call
      `_super`:
         ```app/routes/photos.js
      import Route from '@ember/routing/route';
         export default Route.extend({
        model() {
          return this.store.findAll('photo');
        },
           setupController(controller, model) {
          // Call _super for default behavior
          this._super(controller, model);
          // Implement your custom setup after
          this.controllerFor('application').set('showingPhotos', true);
        }
      });
      ```
         The provided controller will be one resolved based on the name
      of this route.
         If no explicit controller is defined, Ember will automatically create one.
         As an example, consider the router:
         ```app/router.js
      // ...
         Router.map(function() {
        this.route('post', { path: '/posts/:post_id' });
      });
         export default Router;
      ```
         For the `post` route, a controller named `App.PostController` would
      be used if it is defined. If it is not defined, a basic `Controller`
      instance would be used.
         Example
         ```app/routes/post.js
      import Route from '@ember/routing/route';
         export default Route.extend({
        setupController(controller, model) {
          controller.set('model', model);
        }
      });
      ```
         @method setupController
      @param {Controller} controller instance
      @param {Object} model
      @since 1.0.0
      @public
    */


    setupController(controller, context, _transition) {
      // eslint-disable-line no-unused-vars
      if (controller && context !== undefined) {
        (0, _metal.set)(controller, 'model', context);
      }
    }
    /**
      Returns the controller of the current route, or a parent (or any ancestor)
      route in a route hierarchy.
         The controller instance must already have been created, either through entering the
      associated route or using `generateController`.
         ```app/routes/post.js
      import Route from '@ember/routing/route';
         export default Route.extend({
        setupController(controller, post) {
          this._super(controller, post);
          this.controllerFor('posts').set('currentPost', post);
        }
      });
      ```
         @method controllerFor
      @param {String} name the name of the route or controller
      @return {Controller}
      @since 1.0.0
      @public
    */


    controllerFor(name, _skipAssert) {
      let owner = (0, _owner.getOwner)(this);
      let route = owner.lookup("route:" + name);

      if (route && route.controllerName) {
        name = route.controllerName;
      }

      let controller = owner.lookup("controller:" + name); // NOTE: We're specifically checking that skipAssert is true, because according
      //   to the old API the second parameter was model. We do not want people who
      //   passed a model to skip the assertion.

      false && !(controller !== undefined || _skipAssert === true) && (0, _debug.assert)("The controller named '" + name + "' could not be found. Make sure that this route exists and has already been entered at least once. If you are accessing a controller not associated with a route, make sure the controller class is explicitly defined.", controller !== undefined || _skipAssert === true);
      return controller;
    }
    /**
      Generates a controller for a route.
         Example
         ```app/routes/post.js
      import Route from '@ember/routing/route';
         export default Route.extend({
        setupController(controller, post) {
          this._super(controller, post);
          this.generateController('posts');
        }
      });
      ```
         @method generateController
      @param {String} name the name of the controller
      @private
    */


    generateController(name) {
      let owner = (0, _owner.getOwner)(this);
      return (0, _generate_controller.default)(owner, name);
    }
    /**
      Returns the resolved model of a parent (or any ancestor) route
      in a route hierarchy.  During a transition, all routes
      must resolve a model object, and if a route
      needs access to a parent route's model in order to
      resolve a model (or just reuse the model from a parent),
      it can call `this.modelFor(theNameOfParentRoute)` to
      retrieve it. If the ancestor route's model was a promise,
      its resolved result is returned.
         Example
         ```app/router.js
      // ...
         Router.map(function() {
        this.route('post', { path: '/posts/:post_id' }, function() {
          this.route('comments');
        });
      });
         export default Router;
      ```
         ```app/routes/post/comments.js
      import Route from '@ember/routing/route';
         export default Route.extend({
        model() {
          let post = this.modelFor('post');
          return post.get('comments');
        }
      });
      ```
         @method modelFor
      @param {String} name the name of the route
      @return {Object} the model object
      @since 1.0.0
      @public
    */


    modelFor(_name) {
      let name;
      let owner = (0, _owner.getOwner)(this);
      let transition = this._router && this._router._routerMicrolib ? this._router._routerMicrolib.activeTransition : undefined; // Only change the route name when there is an active transition.
      // Otherwise, use the passed in route name.

      if (owner.routable && transition !== undefined) {
        name = getEngineRouteName(owner, _name);
      } else {
        name = _name;
      }

      let route = owner.lookup("route:" + name); // If we are mid-transition, we want to try and look up
      // resolved parent contexts on the current transitionEvent.

      if (transition !== undefined && transition !== null) {
        let modelLookupName = route && route.routeName || name;

        if (transition.resolvedModels.hasOwnProperty(modelLookupName)) {
          return transition.resolvedModels[modelLookupName];
        }
      }

      return route && route.currentModel;
    }
    /**
      A hook you can use to render the template for the current route.
         This method is called with the controller for the current route and the
      model supplied by the `model` hook. By default, it renders the route's
      template, configured with the controller for the route.
         This method can be overridden to set up and render additional or
      alternative templates.
         ```app/routes/posts.js
      import Route from '@ember/routing/route';
         export default Route.extend({
        renderTemplate(controller, model) {
          let favController = this.controllerFor('favoritePost');
             // Render the `favoritePost` template into
          // the outlet `posts`, and display the `favoritePost`
          // controller.
          this.render('favoritePost', {
            outlet: 'posts',
            controller: favController
          });
        }
      });
      ```
         @method renderTemplate
      @param {Object} controller the route's controller
      @param {Object} model the route's model
      @since 1.0.0
      @public
    */


    renderTemplate(_controller, _model) {
      // eslint-disable-line no-unused-vars
      this.render();
    }
    /**
      `render` is used to render a template into a region of another template
      (indicated by an `{{outlet}}`). `render` is used both during the entry
      phase of routing (via the `renderTemplate` hook) and later in response to
      user interaction.
         For example, given the following minimal router and templates:
         ```app/router.js
      // ...
         Router.map(function() {
        this.route('photos');
      });
         export default Router;
      ```
         ```handlebars
      <!-- application.hbs -->
      <div class='something-in-the-app-hbs'>
        {{outlet "anOutletName"}}
      </div>
      ```
         ```handlebars
      <!-- photos.hbs -->
      <h1>Photos</h1>
      ```
         You can render `photos.hbs` into the `"anOutletName"` outlet of
      `application.hbs` by calling `render`:
         ```app/routes/post.js
      import Route from '@ember/routing/route';
         export default Route.extend({
        renderTemplate() {
          this.render('photos', {
            into: 'application',
            outlet: 'anOutletName'
          })
        }
      });
      ```
         `render` additionally allows you to supply which `controller` and
      `model` objects should be loaded and associated with the rendered template.
         ```app/routes/posts.js
      import Route from '@ember/routing/route';
         export default Route.extend({
        renderTemplate(controller, model){
          this.render('posts', {    // the template to render, referenced by name
            into: 'application',    // the template to render into, referenced by name
            outlet: 'anOutletName', // the outlet inside `options.into` to render into.
            controller: 'someControllerName', // the controller to use for this template, referenced by name
            model: model            // the model to set on `options.controller`.
          })
        }
      });
      ```
         The string values provided for the template name, and controller
      will eventually pass through to the resolver for lookup. See
      Resolver for how these are mapped to JavaScript objects in your
      application. The template to render into needs to be related to  either the
      current route or one of its ancestors.
         Not all options need to be passed to `render`. Default values will be used
      based on the name of the route specified in the router or the Route's
      `controllerName` and `templateName` properties.
         For example:
         ```app/router.js
      // ...
         Router.map(function() {
        this.route('index');
        this.route('post', { path: '/posts/:post_id' });
      });
         export default Router;
      ```
         ```app/routes/post.js
      import Route from '@ember/routing/route';
         export default Route.extend({
        renderTemplate() {
          this.render(); // all defaults apply
        }
      });
      ```
         The name of the route, defined by the router, is `post`.
         The following equivalent default options will be applied when
      the Route calls `render`:
         ```javascript
      this.render('post', {  // the template name associated with 'post' Route
        into: 'application', // the parent route to 'post' Route
        outlet: 'main',      // {{outlet}} and {{outlet 'main'}} are synonymous,
        controller: 'post',  // the controller associated with the 'post' Route
      })
      ```
         By default the controller's `model` will be the route's model, so it does not
      need to be passed unless you wish to change which model is being used.
         @method render
      @param {String} name the name of the template to render
      @param {Object} [options] the options
      @param {String} [options.into] the template to render into,
                      referenced by name. Defaults to the parent template
      @param {String} [options.outlet] the outlet inside `options.into` to render into.
                      Defaults to 'main'
      @param {String|Object} [options.controller] the controller to use for this template,
                      referenced by name or as a controller instance. Defaults to the Route's paired controller
      @param {Object} [options.model] the model object to set on `options.controller`.
                      Defaults to the return value of the Route's model hook
      @since 1.0.0
      @public
    */


    render(_name, options) {
      let name;
      let isDefaultRender = arguments.length === 0;

      if (!isDefaultRender) {
        if (typeof _name === 'object' && !options) {
          name = this.templateName || this.routeName;
          options = _name;
        } else {
          false && !!(0, _metal.isEmpty)(_name) && (0, _debug.assert)('The name in the given arguments is undefined or empty string', !(0, _metal.isEmpty)(_name));
          name = _name;
        }
      }

      let renderOptions = buildRenderOptions(this, isDefaultRender, name, options);
      ROUTE_CONNECTIONS.get(this).push(renderOptions);
      (0, _runloop.once)(this._router, '_setOutlets');
    }
    /**
      Disconnects a view that has been rendered into an outlet.
         You may pass any or all of the following options to `disconnectOutlet`:
         * `outlet`: the name of the outlet to clear (default: 'main')
      * `parentView`: the name of the view containing the outlet to clear
         (default: the view rendered by the parent route)
         Example:
         ```app/routes/application.js
      import Route from '@ember/routing/route';
         export default Route.extend({
        actions: {
          showModal(evt) {
            this.render(evt.modalName, {
              outlet: 'modal',
              into: 'application'
            });
          },
             hideModal(evt) {
            this.disconnectOutlet({
              outlet: 'modal',
              parentView: 'application'
            });
          }
        }
      });
      ```
         Alternatively, you can pass the `outlet` name directly as a string.
         Example:
         ```app/routes/application.js
      import Route from '@ember/routing/route';
         export default Route.extend({
        actions: {
          showModal(evt) {
            // ...
          },
          hideModal(evt) {
            this.disconnectOutlet('modal');
          }
        }
      });
          ```
         @method disconnectOutlet
      @param {Object|String} options the options hash or outlet name
      @since 1.0.0
      @public
    */


    disconnectOutlet(options) {
      let outletName;
      let parentView;

      if (options) {
        if (typeof options === 'string') {
          outletName = options;
        } else {
          outletName = options.outlet;
          parentView = options.parentView ? options.parentView.replace(/\//g, '.') : undefined;
          false && !!('outlet' in options && options.outlet === undefined) && (0, _debug.assert)('You passed undefined as the outlet name.', !('outlet' in options && options.outlet === undefined));
        }
      }

      outletName = outletName || 'main';

      this._disconnectOutlet(outletName, parentView);

      let routeInfos = this._router._routerMicrolib.currentRouteInfos;

      for (let i = 0; i < routeInfos.length; i++) {
        // This non-local state munging is sadly necessary to maintain
        // backward compatibility with our existing semantics, which allow
        // any route to disconnectOutlet things originally rendered by any
        // other route. This should all get cut in 2.0.
        routeInfos[i].route._disconnectOutlet(outletName, parentView);
      }
    }

    _disconnectOutlet(outletName, parentView) {
      let parent = parentRoute(this);

      if (parent && parentView === parent.routeName) {
        parentView = undefined;
      }

      let connections = ROUTE_CONNECTIONS.get(this);

      for (let i = 0; i < connections.length; i++) {
        let connection = connections[i];

        if (connection.outlet === outletName && connection.into === parentView) {
          // This neuters the disconnected outlet such that it doesn't
          // render anything, but it leaves an entry in the outlet
          // hierarchy so that any existing other renders that target it
          // don't suddenly blow up. They will still stick themselves
          // into its outlets, which won't render anywhere. All of this
          // statefulness should get the machete in 2.0.
          connections[i] = {
            owner: connection.owner,
            into: connection.into,
            outlet: connection.outlet,
            name: connection.name,
            controller: undefined,
            template: undefined
          };
          (0, _runloop.once)(this._router, '_setOutlets');
        }
      }

      ROUTE_CONNECTIONS.set(this, connections);
    }

    willDestroy() {
      this.teardownViews();
    }
    /**
      @private
         @method teardownViews
    */


    teardownViews() {
      let connections = ROUTE_CONNECTIONS.get(this);

      if (connections !== undefined && connections.length > 0) {
        ROUTE_CONNECTIONS.set(this, []);
        (0, _runloop.once)(this._router, '_setOutlets');
      }
    }
    /**
      Allows you to produce custom metadata for the route.
      The return value of this method will be attatched to
      its corresponding RouteInfoWithAttributes obejct.
         Example
         ```app/routes/posts/index.js
      import Route from '@ember/routing/route';
         export default Route.extend({
        buildRouteInfoMetadata() {
          return { title: 'Posts Page' }
        }
      });
      ```
      ```app/routes/application.js
      import Route from '@ember/routing/route';
      import { inject as service } from '@ember/service';
         export default Route.extend({
        router: service('router'),
        init() {
          this._super(...arguments);
          this.router.on('routeDidChange', transition => {
            document.title = transition.to.metadata.title;
            // would update document's title to "Posts Page"
          });
        }
      });
      ```
         @return any
     */


    buildRouteInfoMetadata() {}

  }

  Route.reopenClass({
    isRouteFactory: true
  });

  function parentRoute(route) {
    let routeInfo = routeInfoFor(route, route._router._routerMicrolib.state.routeInfos, -1);
    return routeInfo && routeInfo.route;
  }

  function routeInfoFor(route, routeInfos, offset = 0) {
    if (!routeInfos) {
      return;
    }

    let current;

    for (let i = 0; i < routeInfos.length; i++) {
      current = routeInfos[i].route;

      if (current === route) {
        return routeInfos[i + offset];
      }
    }

    return;
  }

  function buildRenderOptions(route, isDefaultRender, _name, options) {
    false && !(isDefaultRender || !(options && 'outlet' in options && options.outlet === undefined)) && (0, _debug.assert)('You passed undefined as the outlet name.', isDefaultRender || !(options && 'outlet' in options && options.outlet === undefined));
    let owner = (0, _owner.getOwner)(route);
    let name, templateName, into, outlet, model;
    let controller = undefined;

    if (options) {
      into = options.into && options.into.replace(/\//g, '.');
      outlet = options.outlet;
      controller = options.controller;
      model = options.model;
    }

    outlet = outlet || 'main';

    if (isDefaultRender) {
      name = route.routeName;
      templateName = route.templateName || name;
    } else {
      name = _name.replace(/\//g, '.');
      templateName = name;
    }

    if (controller === undefined) {
      if (isDefaultRender) {
        controller = route.controllerName || owner.lookup("controller:" + name);
      } else {
        controller = owner.lookup("controller:" + name) || route.controllerName || route.routeName;
      }
    }

    if (typeof controller === 'string') {
      let controllerName = controller;
      controller = owner.lookup("controller:" + controllerName);
      false && !(isDefaultRender || controller !== undefined) && (0, _debug.assert)("You passed `controller: '" + controllerName + "'` into the `render` method, but no such controller could be found.", isDefaultRender || controller !== undefined);
    }

    if (model) {
      controller.set('model', model);
    }

    let template = owner.lookup("template:" + templateName);
    false && !(isDefaultRender || template !== undefined) && (0, _debug.assert)("Could not find \"" + templateName + "\" template, view, or component.", isDefaultRender || template !== undefined);
    let parent;

    if (into && (parent = parentRoute(route)) && into === parent.routeName) {
      into = undefined;
    }

    let renderOptions = {
      owner,
      into,
      outlet,
      name,
      controller,
      template: template !== undefined ? template(owner) : route._topLevelViewTemplate(owner)
    };

    if (false
    /* DEBUG */
    ) {
        let LOG_VIEW_LOOKUPS = (0, _metal.get)(route._router, 'namespace.LOG_VIEW_LOOKUPS');

        if (LOG_VIEW_LOOKUPS && !template) {
          (0, _debug.info)("Could not find \"" + name + "\" template. Nothing will be rendered", {
            fullName: "template:" + name
          });
        }
      }

    return renderOptions;
  }

  function getFullQueryParams(router, state) {
    if (state['fullQueryParams']) {
      return state['fullQueryParams'];
    }

    state['fullQueryParams'] = {};
    (0, _polyfills.assign)(state['fullQueryParams'], state.queryParams);

    router._deserializeQueryParams(state.routeInfos, state['fullQueryParams']);

    return state['fullQueryParams'];
  }

  function getQueryParamsFor(route, state) {
    state['queryParamsFor'] = state['queryParamsFor'] || {};
    let name = route.fullRouteName;

    if (state['queryParamsFor'][name]) {
      return state['queryParamsFor'][name];
    }

    let fullQueryParams = getFullQueryParams(route._router, state);
    let params = state['queryParamsFor'][name] = {}; // Copy over all the query params for this route/controller into params hash.

    let qps = (0, _metal.get)(route, '_qp.qps');

    for (let i = 0; i < qps.length; ++i) {
      // Put deserialized qp on params hash.
      let qp = qps[i];
      let qpValueWasPassedIn = qp.prop in fullQueryParams;
      params[qp.prop] = qpValueWasPassedIn ? fullQueryParams[qp.prop] : copyDefaultValue(qp.defaultValue);
    }

    return params;
  }

  function copyDefaultValue(value) {
    if (Array.isArray(value)) {
      return (0, _runtime.A)(value.slice());
    }

    return value;
  }
  /*
    Merges all query parameters from a controller with those from
    a route, returning a new object and avoiding any mutations to
    the existing objects.
  */


  function mergeEachQueryParams(controllerQP, routeQP) {
    let qps = {};
    let keysAlreadyMergedOrSkippable = {
      defaultValue: true,
      type: true,
      scope: true,
      as: true
    }; // first loop over all controller qps, merging them with any matching route qps
    // into a new empty object to avoid mutating.

    for (let cqpName in controllerQP) {
      if (!controllerQP.hasOwnProperty(cqpName)) {
        continue;
      }

      let newControllerParameterConfiguration = {};
      (0, _polyfills.assign)(newControllerParameterConfiguration, controllerQP[cqpName], routeQP[cqpName]);
      qps[cqpName] = newControllerParameterConfiguration; // allows us to skip this QP when we check route QPs.

      keysAlreadyMergedOrSkippable[cqpName] = true;
    } // loop over all route qps, skipping those that were merged in the first pass
    // because they also appear in controller qps


    for (let rqpName in routeQP) {
      if (!routeQP.hasOwnProperty(rqpName) || keysAlreadyMergedOrSkippable[rqpName]) {
        continue;
      }

      let newRouteParameterConfiguration = {};
      (0, _polyfills.assign)(newRouteParameterConfiguration, routeQP[rqpName], controllerQP[rqpName]);
      qps[rqpName] = newRouteParameterConfiguration;
    }

    return qps;
  }

  function addQueryParamsObservers(controller, propNames) {
    propNames.forEach(prop => {
      controller.addObserver(prop + ".[]", controller, controller._qpChanged);
    });
  }

  function getEngineRouteName(engine, routeName) {
    if (engine.routable) {
      let prefix = engine.mountPoint;

      if (routeName === 'application') {
        return prefix;
      } else {
        return prefix + "." + routeName;
      }
    }

    return routeName;
  }
  /**
      A hook you can implement to convert the route's model into parameters
      for the URL.
  
      ```app/router.js
      // ...
  
      Router.map(function() {
        this.route('post', { path: '/posts/:post_id' });
      });
  
      ```
  
      ```app/routes/post.js
      import $ from 'jquery';
      import Route from '@ember/routing/route';
  
      export default Route.extend({
        model(params) {
          // the server returns `{ id: 12 }`
          return $.getJSON('/posts/' + params.post_id);
        },
  
        serialize(model) {
          // this will make the URL `/posts/12`
          return { post_id: model.id };
        }
      });
      ```
  
      The default `serialize` method will insert the model's `id` into the
      route's dynamic segment (in this case, `:post_id`) if the segment contains '_id'.
      If the route has multiple dynamic segments or does not contain '_id', `serialize`
      will return `getProperties(model, params)`
  
      This method is called when `transitionTo` is called with a context
      in order to populate the URL.
  
      @method serialize
      @param {Object} model the routes model
      @param {Array} params an Array of parameter names for the current
        route (in the example, `['post_id']`.
      @return {Object} the serialized parameters
      @since 1.0.0
      @public
    */


  Route.prototype.serialize = defaultSerialize;
  Route.reopen(_runtime.ActionHandler, _runtime.Evented, {
    mergedProperties: ['queryParams'],

    /**
      Configuration hash for this route's queryParams. The possible
      configuration options and their defaults are as follows
      (assuming a query param whose controller property is `page`):
         ```javascript
      queryParams: {
        page: {
          // By default, controller query param properties don't
          // cause a full transition when they are changed, but
          // rather only cause the URL to update. Setting
          // `refreshModel` to true will cause an "in-place"
          // transition to occur, whereby the model hooks for
          // this route (and any child routes) will re-fire, allowing
          // you to reload models (e.g., from the server) using the
          // updated query param values.
          refreshModel: false,
             // By default, changes to controller query param properties
          // cause the URL to update via `pushState`, which means an
          // item will be added to the browser's history, allowing
          // you to use the back button to restore the app to the
          // previous state before the query param property was changed.
          // Setting `replace` to true will use `replaceState` (or its
          // hash location equivalent), which causes no browser history
          // item to be added. This options name and default value are
          // the same as the `link-to` helper's `replace` option.
          replace: false,
             // By default, the query param URL key is the same name as
          // the controller property name. Use `as` to specify a
          // different URL key.
          as: 'page'
        }
      }
      ```
         @property queryParams
      @for Route
      @type Object
      @since 1.6.0
      @public
    */
    queryParams: {},

    /**
      The name of the template to use by default when rendering this routes
      template.
         ```app/routes/posts/list.js
      import Route from '@ember/routing/route';
         export default Route.extend({
        templateName: 'posts/list'
      });
      ```
         ```app/routes/posts/index.js
      import PostsList from '../posts/list';
         export default PostsList.extend();
      ```
         ```app/routes/posts/archived.js
      import PostsList from '../posts/list';
         export default PostsList.extend();
      ```
         @property templateName
      @type String
      @default null
      @since 1.4.0
      @public
    */
    templateName: null,

    /**
      @private
         @property _names
    */
    _names: null,

    /**
      The name of the controller to associate with this route.
         By default, Ember will lookup a route's controller that matches the name
      of the route (i.e. `posts.new`). However,
      if you would like to define a specific controller to use, you can do so
      using this property.
         This is useful in many ways, as the controller specified will be:
         * passed to the `setupController` method.
      * used as the controller for the template being rendered by the route.
      * returned from a call to `controllerFor` for the route.
         @property controllerName
      @type String
      @default null
      @since 1.4.0
      @public
    */
    controllerName: null,

    /**
      Store property provides a hook for data persistence libraries to inject themselves.
         By default, this store property provides the exact same functionality previously
      in the model hook.
         Currently, the required interface is:
         `store.find(modelName, findArguments)`
         @property store
      @type {Object}
      @private
    */
    store: (0, _metal.computed)({
      get() {
        let owner = (0, _owner.getOwner)(this);
        let routeName = this.routeName;
        let namespace = (0, _metal.get)(this, '_router.namespace');
        return {
          find(name, value) {
            let modelClass = owner.factoryFor("model:" + name);
            false && !Boolean(modelClass) && (0, _debug.assert)("You used the dynamic segment " + name + "_id in your route " + routeName + ", but " + namespace + "." + (0, _string.classify)(name) + " did not exist and you did not override your route's `model` hook.", Boolean(modelClass));

            if (!modelClass) {
              return;
            }

            modelClass = modelClass.class;
            false && !(typeof modelClass.find === 'function') && (0, _debug.assert)((0, _string.classify)(name) + " has no method `find`.", typeof modelClass.find === 'function');
            return modelClass.find(value);
          }

        };
      },

      set(key, value) {
        (0, _metal.defineProperty)(this, key, null, value);
      }

    }),

    /**
        @private
           @property _qp
      */
    _qp: (0, _metal.computed)(function () {
      let combinedQueryParameterConfiguration;
      let controllerName = this.controllerName || this.routeName;
      let owner = (0, _owner.getOwner)(this);
      let controller = owner.lookup("controller:" + controllerName);
      let queryParameterConfiguraton = (0, _metal.get)(this, 'queryParams');
      let hasRouterDefinedQueryParams = Object.keys(queryParameterConfiguraton).length > 0;

      if (controller) {
        // the developer has authored a controller class in their application for
        // this route find its query params and normalize their object shape them
        // merge in the query params for the route. As a mergedProperty,
        // Route#queryParams is always at least `{}`
        let controllerDefinedQueryParameterConfiguration = (0, _metal.get)(controller, 'queryParams') || {};
        let normalizedControllerQueryParameterConfiguration = (0, _utils.normalizeControllerQueryParams)(controllerDefinedQueryParameterConfiguration);
        combinedQueryParameterConfiguration = mergeEachQueryParams(normalizedControllerQueryParameterConfiguration, queryParameterConfiguraton);
      } else if (hasRouterDefinedQueryParams) {
        // the developer has not defined a controller but *has* supplied route query params.
        // Generate a class for them so we can later insert default values
        controller = (0, _generate_controller.default)(owner, controllerName);
        combinedQueryParameterConfiguration = queryParameterConfiguraton;
      }

      let qps = [];
      let map = {};
      let propertyNames = [];

      for (let propName in combinedQueryParameterConfiguration) {
        if (!combinedQueryParameterConfiguration.hasOwnProperty(propName)) {
          continue;
        } // to support the dubious feature of using unknownProperty
        // on queryParams configuration


        if (propName === 'unknownProperty' || propName === '_super') {
          // possible todo: issue deprecation warning?
          continue;
        }

        let desc = combinedQueryParameterConfiguration[propName];
        let scope = desc.scope || 'model';
        let parts;

        if (scope === 'controller') {
          parts = [];
        }

        let urlKey = desc.as || this.serializeQueryParamKey(propName);
        let defaultValue = (0, _metal.get)(controller, propName);
        defaultValue = copyDefaultValue(defaultValue);
        let type = desc.type || (0, _runtime.typeOf)(defaultValue);
        let defaultValueSerialized = this.serializeQueryParam(defaultValue, urlKey, type);
        let scopedPropertyName = controllerName + ":" + propName;
        let qp = {
          undecoratedDefaultValue: (0, _metal.get)(controller, propName),
          defaultValue,
          serializedDefaultValue: defaultValueSerialized,
          serializedValue: defaultValueSerialized,
          type,
          urlKey,
          prop: propName,
          scopedPropertyName,
          controllerName,
          route: this,
          parts,
          values: null,
          scope
        };
        map[propName] = map[urlKey] = map[scopedPropertyName] = qp;
        qps.push(qp);
        propertyNames.push(propName);
      }

      return {
        qps,
        map,
        propertyNames,
        states: {
          /*
            Called when a query parameter changes in the URL, this route cares
            about that query parameter, but the route is not currently
            in the active route hierarchy.
          */
          inactive: (prop, value) => {
            let qp = map[prop];

            this._qpChanged(prop, value, qp);
          },

          /*
            Called when a query parameter changes in the URL, this route cares
            about that query parameter, and the route is currently
            in the active route hierarchy.
          */
          active: (prop, value) => {
            let qp = map[prop];

            this._qpChanged(prop, value, qp);

            return this._activeQPChanged(qp, value);
          },

          /*
            Called when a value of a query parameter this route handles changes in a controller
            and the route is currently in the active route hierarchy.
          */
          allowOverrides: (prop, value) => {
            let qp = map[prop];

            this._qpChanged(prop, value, qp);

            return this._updatingQPChanged(qp);
          }
        }
      };
    }),

    /**
      Sends an action to the router, which will delegate it to the currently
      active route hierarchy per the bubbling rules explained under `actions`.
         Example
         ```app/router.js
      // ...
         Router.map(function() {
        this.route('index');
      });
         export default Router;
      ```
         ```app/routes/application.js
      import Route from '@ember/routing/route';
         export default Route.extend({
        actions: {
          track(arg) {
            console.log(arg, 'was clicked');
          }
        }
      });
      ```
         ```app/routes/index.js
      import Route from '@ember/routing/route';
         export default Route.extend({
        actions: {
          trackIfDebug(arg) {
            if (debug) {
              this.send('track', arg);
            }
          }
        }
      });
      ```
         @method send
      @param {String} name the name of the action to trigger
      @param {...*} args
      @since 1.0.0
      @public
    */
    send(...args) {
      false && !(!this.isDestroying && !this.isDestroyed) && (0, _debug.assert)("Attempted to call .send() with the action '" + args[0] + "' on the destroyed route '" + this.routeName + "'.", !this.isDestroying && !this.isDestroyed);

      if (this._router && this._router._routerMicrolib || !(0, _debug.isTesting)()) {
        this._router.send(...args);
      } else {
        let name = args.shift();
        let action = this.actions[name];

        if (action) {
          return action.apply(this, args);
        }
      }
    },

    /**
      The controller associated with this route.
         Example
         ```app/routes/form.js
      import Route from '@ember/routing/route';
         export default Route.extend({
        actions: {
          willTransition(transition) {
            if (this.controller.get('userHasEnteredData') &&
                !confirm('Are you sure you want to abandon progress?')) {
              transition.abort();
            } else {
              // Bubble the `willTransition` action so that
              // parent routes can decide whether or not to abort.
              return true;
            }
          }
        }
      });
      ```
         @property controller
      @type Controller
      @since 1.6.0
      @public
    */
    actions: {
      /**
      This action is called when one or more query params have changed. Bubbles.
           @method queryParamsDidChange
      @param changed {Object} Keys are names of query params that have changed.
      @param totalPresent {Object} Keys are names of query params that are currently set.
      @param removed {Object} Keys are names of query params that have been removed.
      @returns {boolean}
      @private
      */
      queryParamsDidChange(changed, _totalPresent, removed) {
        let qpMap = (0, _metal.get)(this, '_qp').map;
        let totalChanged = Object.keys(changed).concat(Object.keys(removed));

        for (let i = 0; i < totalChanged.length; ++i) {
          let qp = qpMap[totalChanged[i]];

          if (qp && (0, _metal.get)(this._optionsForQueryParam(qp), 'refreshModel') && this._router.currentState) {
            this.refresh();
            break;
          }
        }

        return true;
      },

      finalizeQueryParamChange(params, finalParams, transition) {
        if (this.fullRouteName !== 'application') {
          return true;
        } // Transition object is absent for intermediate transitions.


        if (!transition) {
          return;
        }

        let routeInfos = transition[_router_js.STATE_SYMBOL].routeInfos;
        let router = this._router;

        let qpMeta = router._queryParamsFor(routeInfos);

        let changes = router._qpUpdates;
        let replaceUrl;
        (0, _utils.stashParamNames)(router, routeInfos);

        for (let i = 0; i < qpMeta.qps.length; ++i) {
          let qp = qpMeta.qps[i];
          let route = qp.route;
          let controller = route.controller;
          let presentKey = qp.urlKey in params && qp.urlKey; // Do a reverse lookup to see if the changed query
          // param URL key corresponds to a QP property on
          // this controller.

          let value, svalue;

          if (changes.has(qp.urlKey)) {
            // Value updated in/before setupController
            value = (0, _metal.get)(controller, qp.prop);
            svalue = route.serializeQueryParam(value, qp.urlKey, qp.type);
          } else {
            if (presentKey) {
              svalue = params[presentKey];

              if (svalue !== undefined) {
                value = route.deserializeQueryParam(svalue, qp.urlKey, qp.type);
              }
            } else {
              // No QP provided; use default value.
              svalue = qp.serializedDefaultValue;
              value = copyDefaultValue(qp.defaultValue);
            }
          }

          controller._qpDelegate = (0, _metal.get)(route, '_qp.states.inactive');
          let thisQueryParamChanged = svalue !== qp.serializedValue;

          if (thisQueryParamChanged) {
            if (transition.queryParamsOnly && replaceUrl !== false) {
              let options = route._optionsForQueryParam(qp);

              let replaceConfigValue = (0, _metal.get)(options, 'replace');

              if (replaceConfigValue) {
                replaceUrl = true;
              } else if (replaceConfigValue === false) {
                // Explicit pushState wins over any other replaceStates.
                replaceUrl = false;
              }
            }

            (0, _metal.set)(controller, qp.prop, value);
          } // Stash current serialized value of controller.


          qp.serializedValue = svalue;
          let thisQueryParamHasDefaultValue = qp.serializedDefaultValue === svalue;

          if (!thisQueryParamHasDefaultValue || transition._keepDefaultQueryParamValues) {
            finalParams.push({
              value: svalue,
              visible: true,
              key: presentKey || qp.urlKey
            });
          }
        }

        if (replaceUrl) {
          transition.method('replace');
        }

        qpMeta.qps.forEach(qp => {
          let routeQpMeta = (0, _metal.get)(qp.route, '_qp');
          let finalizedController = qp.route.controller;
          finalizedController._qpDelegate = (0, _metal.get)(routeQpMeta, 'states.active');
        });

        router._qpUpdates.clear();

        return;
      }

    }
  });
  let ROUTER_EVENT_DEPRECATIONS;
  _exports.ROUTER_EVENT_DEPRECATIONS = ROUTER_EVENT_DEPRECATIONS;

  if (_deprecatedFeatures.ROUTER_EVENTS) {
    _exports.ROUTER_EVENT_DEPRECATIONS = ROUTER_EVENT_DEPRECATIONS = {
      on(name) {
        this._super(...arguments);

        let hasDidTransition = name === 'didTransition';
        let hasWillTransition = name === 'willTransition';

        if (hasDidTransition) {
          false && !false && (0, _debug.deprecate)('You attempted to listen to the "didTransition" event which is deprecated. Please inject the router service and listen to the "routeDidChange" event.', false, {
            id: 'deprecate-router-events',
            until: '4.0.0',
            url: 'https://emberjs.com/deprecations/v3.x#toc_deprecate-router-events'
          });
        }

        if (hasWillTransition) {
          false && !false && (0, _debug.deprecate)('You attempted to listen to the "willTransition" event which is deprecated. Please inject the router service and listen to the "routeWillChange" event.', false, {
            id: 'deprecate-router-events',
            until: '4.0.0',
            url: 'https://emberjs.com/deprecations/v3.x#toc_deprecate-router-events'
          });
        }
      }

    };
    Route.reopen(ROUTER_EVENT_DEPRECATIONS, {
      _paramsFor(routeName, params) {
        let transition = this._router._routerMicrolib.activeTransition;

        if (transition !== undefined) {
          return this.paramsFor(routeName);
        }

        return params;
      }

    });
  }

  if (true
  /* EMBER_FRAMEWORK_OBJECT_OWNER_ARGUMENT */
  ) {
      (0, _runtime.setFrameworkClass)(Route);
    }

  var _default = Route;
  _exports.default = _default;
});
enifed("@ember/-internals/routing/lib/system/router", ["exports", "@ember/-internals/metal", "@ember/-internals/owner", "@ember/-internals/runtime", "@ember/debug", "@ember/deprecated-features", "@ember/error", "@ember/polyfills", "@ember/runloop", "@ember/-internals/routing/lib/location/api", "@ember/-internals/routing/lib/utils", "@ember/-internals/routing/lib/system/dsl", "@ember/-internals/routing/lib/system/route", "@ember/-internals/routing/lib/system/router_state", "router_js"], function (_exports, _metal, _owner, _runtime, _debug, _deprecatedFeatures, _error2, _polyfills, _runloop, _api, _utils, _dsl, _route, _router_state, _router_js) {
  "use strict";

  _exports.triggerEvent = triggerEvent;
  _exports.default = void 0;

  function defaultDidTransition(infos) {
    updatePaths(this);

    this._cancelSlowTransitionTimer();

    this.notifyPropertyChange('url');
    this.set('currentState', this.targetState); // Put this in the runloop so url will be accurate. Seems
    // less surprising than didTransition being out of sync.

    (0, _runloop.once)(this, this.trigger, 'didTransition');

    if (false
    /* DEBUG */
    ) {
        if ((0, _metal.get)(this, 'namespace').LOG_TRANSITIONS) {
          // eslint-disable-next-line no-console
          console.log("Transitioned into '" + EmberRouter._routePath(infos) + "'");
        }
      }
  }

  function defaultWillTransition(oldInfos, newInfos, transition) {
    (0, _runloop.once)(this, this.trigger, 'willTransition', transition);

    if (false
    /* DEBUG */
    ) {
        if ((0, _metal.get)(this, 'namespace').LOG_TRANSITIONS) {
          // eslint-disable-next-line no-console
          console.log("Preparing to transition from '" + EmberRouter._routePath(oldInfos) + "' to '" + EmberRouter._routePath(newInfos) + "'");
        }
      }
  }

  function K() {
    return this;
  }

  const {
    slice
  } = Array.prototype;
  /**
    The `EmberRouter` class manages the application state and URLs. Refer to
    the [routing guide](https://guides.emberjs.com/release/routing/) for documentation.
  
    @class EmberRouter
    @extends EmberObject
    @uses Evented
    @public
  */

  class EmberRouter extends _runtime.Object {
    constructor() {
      super(...arguments);
      this.currentURL = null;
      this.currentRouteName = null;
      this.currentPath = null;
      this.currentRoute = null;
      this._qpCache = Object.create(null);
      this._qpUpdates = new Set();
      this._handledErrors = new Set();
      this._engineInstances = Object.create(null);
      this._engineInfoByRoute = Object.create(null);
      this.currentState = null;
      this.targetState = null;

      this._resetQueuedQueryParameterChanges();
    }

    _initRouterJs() {
      let location = (0, _metal.get)(this, 'location');
      let router = this;
      let owner = (0, _owner.getOwner)(this);
      let seen = Object.create(null);

      class PrivateRouter extends _router_js.default {
        getRoute(name) {
          let routeName = name;
          let routeOwner = owner;
          let engineInfo = router._engineInfoByRoute[routeName];

          if (engineInfo) {
            let engineInstance = router._getEngineInstance(engineInfo);

            routeOwner = engineInstance;
            routeName = engineInfo.localFullName;
          }

          let fullRouteName = "route:" + routeName;
          let route = routeOwner.lookup(fullRouteName);

          if (seen[name]) {
            return route;
          }

          seen[name] = true;

          if (!route) {
            let DefaultRoute = routeOwner.factoryFor('route:basic').class;
            routeOwner.register(fullRouteName, DefaultRoute.extend());
            route = routeOwner.lookup(fullRouteName);

            if (false
            /* DEBUG */
            ) {
                if ((0, _metal.get)(router, 'namespace.LOG_ACTIVE_GENERATION')) {
                  (0, _debug.info)("generated -> " + fullRouteName, {
                    fullName: fullRouteName
                  });
                }
              }
          }

          route._setRouteName(routeName);

          if (engineInfo && !(0, _route.hasDefaultSerialize)(route)) {
            throw new Error('Defining a custom serialize method on an Engine route is not supported.');
          }

          return route;
        }

        getSerializer(name) {
          let engineInfo = router._engineInfoByRoute[name]; // If this is not an Engine route, we fall back to the handler for serialization

          if (!engineInfo) {
            return;
          }

          return engineInfo.serializeMethod || _route.defaultSerialize;
        }

        updateURL(path) {
          (0, _runloop.once)(() => {
            location.setURL(path);
            (0, _metal.set)(router, 'currentURL', path);
          });
        }

        didTransition(infos) {
          if (_deprecatedFeatures.ROUTER_EVENTS) {
            if (router.didTransition !== defaultDidTransition) {
              false && !false && (0, _debug.deprecate)('You attempted to override the "didTransition" method which is deprecated. Please inject the router service and listen to the "routeDidChange" event.', false, {
                id: 'deprecate-router-events',
                until: '4.0.0',
                url: 'https://emberjs.com/deprecations/v3.x#toc_deprecate-router-events'
              });
            }
          }

          router.didTransition(infos);
        }

        willTransition(oldInfos, newInfos, transition) {
          if (_deprecatedFeatures.ROUTER_EVENTS) {
            if (router.willTransition !== defaultWillTransition) {
              false && !false && (0, _debug.deprecate)('You attempted to override the "willTransition" method which is deprecated. Please inject the router service and listen to the "routeWillChange" event.', false, {
                id: 'deprecate-router-events',
                until: '4.0.0',
                url: 'https://emberjs.com/deprecations/v3.x#toc_deprecate-router-events'
              });
            }
          }

          router.willTransition(oldInfos, newInfos, transition);
        }

        triggerEvent(routeInfos, ignoreFailure, name, args) {
          return triggerEvent.bind(router)(routeInfos, ignoreFailure, name, args);
        }

        routeWillChange(transition) {
          router.trigger('routeWillChange', transition);
        }

        routeDidChange(transition) {
          router.set('currentRoute', transition.to);
          (0, _runloop.once)(() => {
            router.trigger('routeDidChange', transition);
          });
        }

        transitionDidError(error, transition) {
          if (error.wasAborted || transition.isAborted) {
            // If the error was a transition erorr or the transition aborted
            // log the abort.
            return (0, _router_js.logAbort)(transition);
          } else {
            // Otherwise trigger the "error" event to attempt an intermediate
            // transition into an error substate
            transition.trigger(false, 'error', error.error, transition, error.route);

            if (router._isErrorHandled(error.error)) {
              // If we handled the error with a substate just roll the state back on
              // the transition and send the "routeDidChange" event for landing on
              // the error substate and return the error.
              transition.rollback();
              this.routeDidChange(transition);
              return error.error;
            } else {
              // If it was not handled, abort the transition completely and return
              // the error.
              transition.abort();
              return error.error;
            }
          }
        }

        _triggerWillChangeContext() {
          return router;
        }

        _triggerWillLeave() {
          return router;
        }

        replaceURL(url) {
          if (location.replaceURL) {
            let doReplaceURL = () => {
              location.replaceURL(url);
              (0, _metal.set)(router, 'currentURL', url);
            };

            (0, _runloop.once)(doReplaceURL);
          } else {
            this.updateURL(url);
          }
        }

      }

      let routerMicrolib = this._routerMicrolib = new PrivateRouter();
      let dslCallbacks = this.constructor.dslCallbacks || [K];

      let dsl = this._buildDSL();

      dsl.route('application', {
        path: '/',
        resetNamespace: true,
        overrideNameAssertion: true
      }, function () {
        for (let i = 0; i < dslCallbacks.length; i++) {
          dslCallbacks[i].call(this);
        }
      });

      if (false
      /* DEBUG */
      ) {
          if ((0, _metal.get)(this, 'namespace.LOG_TRANSITIONS_INTERNAL')) {
            routerMicrolib.log = console.log.bind(console); // eslint-disable-line no-console
          }
        }

      routerMicrolib.map(dsl.generate());
    }

    _buildDSL() {
      let enableLoadingSubstates = this._hasModuleBasedResolver();

      let router = this;
      let owner = (0, _owner.getOwner)(this);
      let options = {
        enableLoadingSubstates,

        resolveRouteMap(name) {
          return owner.factoryFor("route-map:" + name);
        },

        addRouteForEngine(name, engineInfo) {
          if (!router._engineInfoByRoute[name]) {
            router._engineInfoByRoute[name] = engineInfo;
          }
        }

      };
      return new _dsl.default(null, options);
    }
    /*
      Resets all pending query parameter changes.
      Called after transitioning to a new route
      based on query parameter changes.
    */


    _resetQueuedQueryParameterChanges() {
      this._queuedQPChanges = {};
    }

    _hasModuleBasedResolver() {
      let owner = (0, _owner.getOwner)(this);

      if (!owner) {
        return false;
      }

      let resolver = (0, _metal.get)(owner, 'application.__registry__.resolver.moduleBasedResolver');
      return Boolean(resolver);
    }
    /**
      Initializes the current router instance and sets up the change handling
      event listeners used by the instances `location` implementation.
         A property named `initialURL` will be used to determine the initial URL.
      If no value is found `/` will be used.
         @method startRouting
      @private
    */


    startRouting() {
      let initialURL = (0, _metal.get)(this, 'initialURL');

      if (this.setupRouter()) {
        if (initialURL === undefined) {
          initialURL = (0, _metal.get)(this, 'location').getURL();
        }

        let initialTransition = this.handleURL(initialURL);

        if (initialTransition && initialTransition.error) {
          throw initialTransition.error;
        }
      }
    }

    setupRouter() {
      this._setupLocation();

      let location = (0, _metal.get)(this, 'location'); // Allow the Location class to cancel the router setup while it refreshes
      // the page

      if ((0, _metal.get)(location, 'cancelRouterSetup')) {
        return false;
      }

      this._initRouterJs();

      location.onUpdateURL(url => {
        this.handleURL(url);
      });
      return true;
    }

    _setOutlets() {
      // This is triggered async during Route#willDestroy.
      // If the router is also being destroyed we do not want to
      // to create another this._toplevelView (and leak the renderer)
      if (this.isDestroying || this.isDestroyed) {
        return;
      }

      let routeInfos = this._routerMicrolib.currentRouteInfos;
      let route;
      let defaultParentState;
      let liveRoutes = null;

      if (!routeInfos) {
        return;
      }

      for (let i = 0; i < routeInfos.length; i++) {
        route = routeInfos[i].route;

        let connections = _route.ROUTE_CONNECTIONS.get(route);

        let ownState;

        for (let j = 0; j < connections.length; j++) {
          let appended = appendLiveRoute(liveRoutes, defaultParentState, connections[j]);
          liveRoutes = appended.liveRoutes;

          if (appended.ownState.render.name === route.routeName || appended.ownState.render.outlet === 'main') {
            ownState = appended.ownState;
          }
        }

        if (connections.length === 0) {
          ownState = representEmptyRoute(liveRoutes, defaultParentState, route);
        }

        defaultParentState = ownState;
      } // when a transitionTo happens after the validation phase
      // during the initial transition _setOutlets is called
      // when no routes are active. However, it will get called
      // again with the correct values during the next turn of
      // the runloop


      if (!liveRoutes) {
        return;
      }

      if (!this._toplevelView) {
        let owner = (0, _owner.getOwner)(this);
        let OutletView = owner.factoryFor('view:-outlet');
        this._toplevelView = OutletView.create();

        this._toplevelView.setOutletState(liveRoutes);

        let instance = owner.lookup('-application-instance:main');
        instance.didCreateRootView(this._toplevelView);
      } else {
        this._toplevelView.setOutletState(liveRoutes);
      }
    }

    handleURL(url) {
      // Until we have an ember-idiomatic way of accessing #hashes, we need to
      // remove it because router.js doesn't know how to handle it.
      let _url = url.split(/#(.+)?/)[0];
      return this._doURLTransition('handleURL', _url);
    }

    _doURLTransition(routerJsMethod, url) {
      let transition = this._routerMicrolib[routerJsMethod](url || '/');

      didBeginTransition(transition, this);
      return transition;
    }
    /**
      Transition the application into another route. The route may
      be either a single route or route path:
         See [transitionTo](/ember/release/classes/Route/methods/transitionTo?anchor=transitionTo) for more info.
         @method transitionTo
      @param {String} name the name of the route or a URL
      @param {...Object} models the model(s) or identifier(s) to be used while
        transitioning to the route.
      @param {Object} [options] optional hash with a queryParams property
        containing a mapping of query parameters
      @return {Transition} the transition object associated with this
        attempted transition
      @public
    */


    transitionTo(...args) {
      if ((0, _utils.resemblesURL)(args[0])) {
        false && !(!this.isDestroying && !this.isDestroyed) && (0, _debug.assert)("A transition was attempted from '" + this.currentRouteName + "' to '" + args[0] + "' but the application instance has already been destroyed.", !this.isDestroying && !this.isDestroyed);
        return this._doURLTransition('transitionTo', args[0]);
      }

      let {
        routeName,
        models,
        queryParams
      } = (0, _utils.extractRouteArgs)(args);
      false && !(!this.isDestroying && !this.isDestroyed) && (0, _debug.assert)("A transition was attempted from '" + this.currentRouteName + "' to '" + routeName + "' but the application instance has already been destroyed.", !this.isDestroying && !this.isDestroyed);
      return this._doTransition(routeName, models, queryParams);
    }

    intermediateTransitionTo(name, ...args) {
      this._routerMicrolib.intermediateTransitionTo(name, ...args);

      updatePaths(this);

      if (false
      /* DEBUG */
      ) {
          let infos = this._routerMicrolib.currentRouteInfos;

          if ((0, _metal.get)(this, 'namespace').LOG_TRANSITIONS) {
            // eslint-disable-next-line no-console
            console.log("Intermediate-transitioned into '" + EmberRouter._routePath(infos) + "'");
          }
        }
    }

    replaceWith(...args) {
      return this.transitionTo(...args).method('replace');
    }

    generate(name, ...args) {
      let url = this._routerMicrolib.generate(name, ...args);

      return this.location.formatURL(url);
    }
    /**
      Determines if the supplied route is currently active.
         @method isActive
      @param routeName
      @return {Boolean}
      @private
    */


    isActive(routeName) {
      return this._routerMicrolib.isActive(routeName);
    }
    /**
      An alternative form of `isActive` that doesn't require
      manual concatenation of the arguments into a single
      array.
         @method isActiveIntent
      @param routeName
      @param models
      @param queryParams
      @return {Boolean}
      @private
      @since 1.7.0
    */


    isActiveIntent(routeName, models, queryParams) {
      return this.currentState.isActiveIntent(routeName, models, queryParams);
    }

    send(name, ...args) {
      /*name, context*/
      this._routerMicrolib.trigger(name, ...args);
    }
    /**
      Does this router instance have the given route.
         @method hasRoute
      @return {Boolean}
      @private
    */


    hasRoute(route) {
      return this._routerMicrolib.hasRoute(route);
    }
    /**
      Resets the state of the router by clearing the current route
      handlers and deactivating them.
         @private
      @method reset
     */


    reset() {
      if (this._routerMicrolib) {
        this._routerMicrolib.reset();
      }
    }

    willDestroy() {
      if (this._toplevelView) {
        this._toplevelView.destroy();

        this._toplevelView = null;
      }

      this._super(...arguments);

      this.reset();
      let instances = this._engineInstances;

      for (let name in instances) {
        for (let id in instances[name]) {
          (0, _runloop.run)(instances[name][id], 'destroy');
        }
      }
    }
    /*
      Called when an active route's query parameter has changed.
      These changes are batched into a runloop run and trigger
      a single transition.
    */


    _activeQPChanged(queryParameterName, newValue) {
      this._queuedQPChanges[queryParameterName] = newValue;
      (0, _runloop.once)(this, this._fireQueryParamTransition);
    }

    _updatingQPChanged(queryParameterName) {
      this._qpUpdates.add(queryParameterName);
    }
    /*
      Triggers a transition to a route based on query parameter changes.
      This is called once per runloop, to batch changes.
         e.g.
         if these methods are called in succession:
      this._activeQPChanged('foo', '10');
        // results in _queuedQPChanges = { foo: '10' }
      this._activeQPChanged('bar', false);
        // results in _queuedQPChanges = { foo: '10', bar: false }
         _queuedQPChanges will represent both of these changes
      and the transition using `transitionTo` will be triggered
      once.
    */


    _fireQueryParamTransition() {
      this.transitionTo({
        queryParams: this._queuedQPChanges
      });

      this._resetQueuedQueryParameterChanges();
    }

    _setupLocation() {
      let location = this.location;
      let rootURL = this.rootURL;
      let owner = (0, _owner.getOwner)(this);

      if ('string' === typeof location && owner) {
        let resolvedLocation = owner.lookup("location:" + location);

        if (resolvedLocation !== undefined) {
          location = (0, _metal.set)(this, 'location', resolvedLocation);
        } else {
          // Allow for deprecated registration of custom location API's
          let options = {
            implementation: location
          };
          location = (0, _metal.set)(this, 'location', _api.default.create(options));
        }
      }

      if (location !== null && typeof location === 'object') {
        if (rootURL) {
          (0, _metal.set)(location, 'rootURL', rootURL);
        } // Allow the location to do any feature detection, such as AutoLocation
        // detecting history support. This gives it a chance to set its
        // `cancelRouterSetup` property which aborts routing.


        if (typeof location.detect === 'function') {
          location.detect();
        } // ensure that initState is called AFTER the rootURL is set on
        // the location instance


        if (typeof location.initState === 'function') {
          location.initState();
        }
      }
    }
    /**
      Serializes the given query params according to their QP meta information.
         @private
      @method _serializeQueryParams
      @param {Arrray<RouteInfo>} routeInfos
      @param {Object} queryParams
      @return {Void}
    */


    _serializeQueryParams(routeInfos, queryParams) {
      forEachQueryParam(this, routeInfos, queryParams, (key, value, qp) => {
        if (qp) {
          delete queryParams[key];
          queryParams[qp.urlKey] = qp.route.serializeQueryParam(value, qp.urlKey, qp.type);
        } else if (value === undefined) {
          return; // We don't serialize undefined values
        } else {
          queryParams[key] = this._serializeQueryParam(value, (0, _runtime.typeOf)(value));
        }
      });
    }
    /**
      Serializes the value of a query parameter based on a type
         @private
      @method _serializeQueryParam
      @param {Object} value
      @param {String} type
    */


    _serializeQueryParam(value, type) {
      if (value === null || value === undefined) {
        return value;
      } else if (type === 'array') {
        return JSON.stringify(value);
      }

      return "" + value;
    }
    /**
      Deserializes the given query params according to their QP meta information.
         @private
      @method _deserializeQueryParams
      @param {Array<RouteInfo>} routeInfos
      @param {Object} queryParams
      @return {Void}
    */


    _deserializeQueryParams(routeInfos, queryParams) {
      forEachQueryParam(this, routeInfos, queryParams, (key, value, qp) => {
        // If we don't have QP meta info for a given key, then we do nothing
        // because all values will be treated as strings
        if (qp) {
          delete queryParams[key];
          queryParams[qp.prop] = qp.route.deserializeQueryParam(value, qp.urlKey, qp.type);
        }
      });
    }
    /**
      Deserializes the value of a query parameter based on a default type
         @private
      @method _deserializeQueryParam
      @param {Object} value
      @param {String} defaultType
    */


    _deserializeQueryParam(value, defaultType) {
      if (value === null || value === undefined) {
        return value;
      } else if (defaultType === 'boolean') {
        return value === 'true';
      } else if (defaultType === 'number') {
        return Number(value).valueOf();
      } else if (defaultType === 'array') {
        return (0, _runtime.A)(JSON.parse(value));
      }

      return value;
    }
    /**
      Removes (prunes) any query params with default values from the given QP
      object. Default values are determined from the QP meta information per key.
         @private
      @method _pruneDefaultQueryParamValues
      @param {Array<RouteInfo>} routeInfos
      @param {Object} queryParams
      @return {Void}
    */


    _pruneDefaultQueryParamValues(routeInfos, queryParams) {
      let qps = this._queryParamsFor(routeInfos);

      for (let key in queryParams) {
        let qp = qps.map[key];

        if (qp && qp.serializedDefaultValue === queryParams[key]) {
          delete queryParams[key];
        }
      }
    }

    _doTransition(_targetRouteName, models, _queryParams, _keepDefaultQueryParamValues) {
      let targetRouteName = _targetRouteName || (0, _utils.getActiveTargetName)(this._routerMicrolib);

      false && !(Boolean(targetRouteName) && this._routerMicrolib.hasRoute(targetRouteName)) && (0, _debug.assert)("The route " + targetRouteName + " was not found", Boolean(targetRouteName) && this._routerMicrolib.hasRoute(targetRouteName));
      let queryParams = {};

      this._processActiveTransitionQueryParams(targetRouteName, models, queryParams, _queryParams);

      (0, _polyfills.assign)(queryParams, _queryParams);

      this._prepareQueryParams(targetRouteName, models, queryParams, Boolean(_keepDefaultQueryParamValues));

      let transition = this._routerMicrolib.transitionTo(targetRouteName, ...models, {
        queryParams
      });

      didBeginTransition(transition, this);
      return transition;
    }

    _processActiveTransitionQueryParams(targetRouteName, models, queryParams, _queryParams) {
      // merge in any queryParams from the active transition which could include
      // queryParams from the url on initial load.
      if (!this._routerMicrolib.activeTransition) {
        return;
      }

      let unchangedQPs = {};
      let qpUpdates = this._qpUpdates;
      let params = this._routerMicrolib.activeTransition[_router_js.QUERY_PARAMS_SYMBOL];

      for (let key in params) {
        if (!qpUpdates.has(key)) {
          unchangedQPs[key] = params[key];
        }
      } // We need to fully scope queryParams so that we can create one object
      // that represents both passed-in queryParams and ones that aren't changed
      // from the active transition.


      this._fullyScopeQueryParams(targetRouteName, models, _queryParams);

      this._fullyScopeQueryParams(targetRouteName, models, unchangedQPs);

      (0, _polyfills.assign)(queryParams, unchangedQPs);
    }
    /**
      Prepares the query params for a URL or Transition. Restores any undefined QP
      keys/values, serializes all values, and then prunes any default values.
         @private
      @method _prepareQueryParams
      @param {String} targetRouteName
      @param {Array<Object>} models
      @param {Object} queryParams
      @param {boolean} keepDefaultQueryParamValues
      @return {Void}
    */


    _prepareQueryParams(targetRouteName, models, queryParams, _fromRouterService) {
      let state = calculatePostTransitionState(this, targetRouteName, models);

      this._hydrateUnsuppliedQueryParams(state, queryParams, Boolean(_fromRouterService));

      this._serializeQueryParams(state.routeInfos, queryParams);

      if (!_fromRouterService) {
        this._pruneDefaultQueryParamValues(state.routeInfos, queryParams);
      }
    }
    /**
      Returns the meta information for the query params of a given route. This
      will be overridden to allow support for lazy routes.
         @private
      @method _getQPMeta
      @param {RouteInfo} routeInfo
      @return {Object}
    */


    _getQPMeta(routeInfo) {
      let route = routeInfo.route;
      return route && (0, _metal.get)(route, '_qp');
    }
    /**
      Returns a merged query params meta object for a given set of routeInfos.
      Useful for knowing what query params are available for a given route hierarchy.
         @private
      @method _queryParamsFor
      @param {Array<RouteInfo>} routeInfos
      @return {Object}
     */


    _queryParamsFor(routeInfos) {
      let routeInfoLength = routeInfos.length;
      let leafRouteName = routeInfos[routeInfoLength - 1].name;
      let cached = this._qpCache[leafRouteName];

      if (cached !== undefined) {
        return cached;
      }

      let shouldCache = true;
      let map = {};
      let qps = [];
      let qpsByUrlKey = false
      /* DEBUG */
      ? {} : null;
      let qpMeta;
      let qp;
      let urlKey;
      let qpOther;

      for (let i = 0; i < routeInfoLength; ++i) {
        qpMeta = this._getQPMeta(routeInfos[i]);

        if (!qpMeta) {
          shouldCache = false;
          continue;
        } // Loop over each QP to make sure we don't have any collisions by urlKey


        for (let i = 0; i < qpMeta.qps.length; i++) {
          qp = qpMeta.qps[i];

          if (false
          /* DEBUG */
          ) {
              urlKey = qp.urlKey;
              qpOther = qpsByUrlKey[urlKey];

              if (qpOther && qpOther.controllerName !== qp.controllerName) {
                false && !false && (0, _debug.assert)("You're not allowed to have more than one controller property map to the same query param key, but both `" + qpOther.scopedPropertyName + "` and `" + qp.scopedPropertyName + "` map to `" + urlKey + "`. You can fix this by mapping one of the controller properties to a different query param key via the `as` config option, e.g. `" + qpOther.prop + ": { as: 'other-" + qpOther.prop + "' }`", false);
              }

              qpsByUrlKey[urlKey] = qp;
            }

          qps.push(qp);
        }

        (0, _polyfills.assign)(map, qpMeta.map);
      }

      let finalQPMeta = {
        qps,
        map
      };

      if (shouldCache) {
        this._qpCache[leafRouteName] = finalQPMeta;
      }

      return finalQPMeta;
    }
    /**
      Maps all query param keys to their fully scoped property name of the form
      `controllerName:propName`.
         @private
      @method _fullyScopeQueryParams
      @param {String} leafRouteName
      @param {Array<Object>} contexts
      @param {Object} queryParams
      @return {Void}
    */


    _fullyScopeQueryParams(leafRouteName, contexts, queryParams) {
      let state = calculatePostTransitionState(this, leafRouteName, contexts);
      let routeInfos = state.routeInfos;
      let qpMeta;

      for (let i = 0, len = routeInfos.length; i < len; ++i) {
        qpMeta = this._getQPMeta(routeInfos[i]);

        if (!qpMeta) {
          continue;
        }

        let qp;
        let presentProp;

        for (let j = 0, qpLen = qpMeta.qps.length; j < qpLen; ++j) {
          qp = qpMeta.qps[j];
          presentProp = qp.prop in queryParams && qp.prop || qp.scopedPropertyName in queryParams && qp.scopedPropertyName || qp.urlKey in queryParams && qp.urlKey;

          if (presentProp) {
            if (presentProp !== qp.scopedPropertyName) {
              queryParams[qp.scopedPropertyName] = queryParams[presentProp];
              delete queryParams[presentProp];
            }
          }
        }
      }
    }
    /**
      Hydrates (adds/restores) any query params that have pre-existing values into
      the given queryParams hash. This is what allows query params to be "sticky"
      and restore their last known values for their scope.
         @private
      @method _hydrateUnsuppliedQueryParams
      @param {TransitionState} state
      @param {Object} queryParams
      @return {Void}
    */


    _hydrateUnsuppliedQueryParams(state, queryParams, _fromRouterService) {
      let routeInfos = state.routeInfos;
      let appCache = this._bucketCache;
      let qpMeta;
      let qp;
      let presentProp;

      for (let i = 0; i < routeInfos.length; ++i) {
        qpMeta = this._getQPMeta(routeInfos[i]);

        if (!qpMeta) {
          continue;
        }

        for (let j = 0, qpLen = qpMeta.qps.length; j < qpLen; ++j) {
          qp = qpMeta.qps[j];
          presentProp = qp.prop in queryParams && qp.prop || qp.scopedPropertyName in queryParams && qp.scopedPropertyName || qp.urlKey in queryParams && qp.urlKey;
          false && !function () {
            if (qp.urlKey === presentProp) {
              return true;
            }

            if (_fromRouterService && presentProp !== false) {
              return false;
            }

            return true;
          }() && (0, _debug.assert)("You passed the `" + presentProp + "` query parameter during a transition into " + qp.route.routeName + ", please update to " + qp.urlKey, function () {
            if (qp.urlKey === presentProp) {
              return true;
            }

            if (_fromRouterService && presentProp !== false) {
              return false;
            }

            return true;
          }());

          if (presentProp) {
            if (presentProp !== qp.scopedPropertyName) {
              queryParams[qp.scopedPropertyName] = queryParams[presentProp];
              delete queryParams[presentProp];
            }
          } else {
            let cacheKey = (0, _utils.calculateCacheKey)(qp.route.fullRouteName, qp.parts, state.params);
            queryParams[qp.scopedPropertyName] = appCache.lookup(cacheKey, qp.prop, qp.defaultValue);
          }
        }
      }
    }

    _scheduleLoadingEvent(transition, originRoute) {
      this._cancelSlowTransitionTimer();

      this._slowTransitionTimer = (0, _runloop.scheduleOnce)('routerTransitions', this, '_handleSlowTransition', transition, originRoute);
    }

    _handleSlowTransition(transition, originRoute) {
      if (!this._routerMicrolib.activeTransition) {
        // Don't fire an event if we've since moved on from
        // the transition that put us in a loading state.
        return;
      }

      let targetState = new _router_state.default(this, this._routerMicrolib, this._routerMicrolib.activeTransition[_router_js.STATE_SYMBOL]);
      this.set('targetState', targetState);
      transition.trigger(true, 'loading', transition, originRoute);
    }

    _cancelSlowTransitionTimer() {
      if (this._slowTransitionTimer) {
        (0, _runloop.cancel)(this._slowTransitionTimer);
      }

      this._slowTransitionTimer = null;
    } // These three helper functions are used to ensure errors aren't
    // re-raised if they're handled in a route's error action.


    _markErrorAsHandled(error) {
      this._handledErrors.add(error);
    }

    _isErrorHandled(error) {
      return this._handledErrors.has(error);
    }

    _clearHandledError(error) {
      this._handledErrors.delete(error);
    }

    _getEngineInstance({
      name,
      instanceId,
      mountPoint
    }) {
      let engineInstances = this._engineInstances;

      if (!engineInstances[name]) {
        engineInstances[name] = Object.create(null);
      }

      let engineInstance = engineInstances[name][instanceId];

      if (!engineInstance) {
        let owner = (0, _owner.getOwner)(this);
        false && !owner.hasRegistration("engine:" + name) && (0, _debug.assert)("You attempted to mount the engine '" + name + "' in your router map, but the engine can not be found.", owner.hasRegistration("engine:" + name));
        engineInstance = owner.buildChildEngineInstance(name, {
          routable: true,
          mountPoint
        });
        engineInstance.boot();
        engineInstances[name][instanceId] = engineInstance;
      }

      return engineInstance;
    }

  }
  /*
    Helper function for iterating over routes in a set of routeInfos that are
    at or above the given origin route. Example: if `originRoute` === 'foo.bar'
    and the routeInfos given were for 'foo.bar.baz', then the given callback
    will be invoked with the routes for 'foo.bar', 'foo', and 'application'
    individually.
  
    If the callback returns anything other than `true`, then iteration will stop.
  
    @private
    @param {Route} originRoute
    @param {Array<RouteInfo>} routeInfos
    @param {Function} callback
    @return {Void}
   */


  function forEachRouteAbove(routeInfos, callback) {
    for (let i = routeInfos.length - 1; i >= 0; --i) {
      let routeInfo = routeInfos[i];
      let route = routeInfo.route; // routeInfo.handler being `undefined` generally means either:
      //
      // 1. an error occurred during creation of the route in question
      // 2. the route is across an async boundary (e.g. within an engine)
      //
      // In both of these cases, we cannot invoke the callback on that specific
      // route, because it just doesn't exist...

      if (route === undefined) {
        continue;
      }

      if (callback(route, routeInfo) !== true) {
        return;
      }
    }
  } // These get invoked when an action bubbles above ApplicationRoute
  // and are not meant to be overridable.


  let defaultActionHandlers = {
    willResolveModel(_routeInfos, transition, originRoute) {
      this._scheduleLoadingEvent(transition, originRoute);
    },

    // Attempt to find an appropriate error route or substate to enter.
    error(routeInfos, error, transition) {
      let router = this;
      let routeInfoWithError = routeInfos[routeInfos.length - 1];
      forEachRouteAbove(routeInfos, (route, routeInfo) => {
        // We don't check the leaf most routeInfo since that would
        // technically be below where we're at in the route hierarchy.
        if (routeInfo !== routeInfoWithError) {
          // Check for the existence of an 'error' route.
          let errorRouteName = findRouteStateName(route, 'error');

          if (errorRouteName) {
            router._markErrorAsHandled(error);

            router.intermediateTransitionTo(errorRouteName, error);
            return false;
          }
        } // Check for an 'error' substate route


        let errorSubstateName = findRouteSubstateName(route, 'error');

        if (errorSubstateName) {
          router._markErrorAsHandled(error);

          router.intermediateTransitionTo(errorSubstateName, error);
          return false;
        }

        return true;
      });
      logError(error, "Error while processing route: " + transition.targetName);
    },

    // Attempt to find an appropriate loading route or substate to enter.
    loading(routeInfos, transition) {
      let router = this;
      let routeInfoWithSlowLoading = routeInfos[routeInfos.length - 1];
      forEachRouteAbove(routeInfos, (route, routeInfo) => {
        // We don't check the leaf most routeInfos since that would
        // technically be below where we're at in the route hierarchy.
        if (routeInfo !== routeInfoWithSlowLoading) {
          // Check for the existence of a 'loading' route.
          let loadingRouteName = findRouteStateName(route, 'loading');

          if (loadingRouteName) {
            router.intermediateTransitionTo(loadingRouteName);
            return false;
          }
        } // Check for loading substate


        let loadingSubstateName = findRouteSubstateName(route, 'loading');

        if (loadingSubstateName) {
          router.intermediateTransitionTo(loadingSubstateName);
          return false;
        } // Don't bubble above pivot route.


        return transition.pivotHandler !== route;
      });
    }

  };

  function logError(_error, initialMessage) {
    let errorArgs = [];
    let error;

    if (_error && typeof _error === 'object' && typeof _error.errorThrown === 'object') {
      error = _error.errorThrown;
    } else {
      error = _error;
    }

    if (initialMessage) {
      errorArgs.push(initialMessage);
    }

    if (error) {
      if (error.message) {
        errorArgs.push(error.message);
      }

      if (error.stack) {
        errorArgs.push(error.stack);
      }

      if (typeof error === 'string') {
        errorArgs.push(error);
      }
    }

    console.error(...errorArgs); //eslint-disable-line no-console
  }
  /**
    Finds the name of the substate route if it exists for the given route. A
    substate route is of the form `route_state`, such as `foo_loading`.
  
    @private
    @param {Route} route
    @param {String} state
    @return {String}
  */


  function findRouteSubstateName(route, state) {
    let owner = (0, _owner.getOwner)(route);
    let {
      routeName,
      fullRouteName,
      _router: router
    } = route;
    let substateName = routeName + "_" + state;
    let substateNameFull = fullRouteName + "_" + state;
    return routeHasBeenDefined(owner, router, substateName, substateNameFull) ? substateNameFull : '';
  }
  /**
    Finds the name of the state route if it exists for the given route. A state
    route is of the form `route.state`, such as `foo.loading`. Properly Handles
    `application` named routes.
  
    @private
    @param {Route} route
    @param {String} state
    @return {String}
  */


  function findRouteStateName(route, state) {
    let owner = (0, _owner.getOwner)(route);
    let {
      routeName,
      fullRouteName,
      _router: router
    } = route;
    let stateName = routeName === 'application' ? state : routeName + "." + state;
    let stateNameFull = fullRouteName === 'application' ? state : fullRouteName + "." + state;
    return routeHasBeenDefined(owner, router, stateName, stateNameFull) ? stateNameFull : '';
  }
  /**
    Determines whether or not a route has been defined by checking that the route
    is in the Router's map and the owner has a registration for that route.
  
    @private
    @param {Owner} owner
    @param {Router} router
    @param {String} localName
    @param {String} fullName
    @return {Boolean}
  */


  function routeHasBeenDefined(owner, router, localName, fullName) {
    let routerHasRoute = router.hasRoute(fullName);
    let ownerHasRoute = owner.hasRegistration("template:" + localName) || owner.hasRegistration("route:" + localName);
    return routerHasRoute && ownerHasRoute;
  }

  function triggerEvent(routeInfos, ignoreFailure, name, args) {
    if (!routeInfos) {
      if (ignoreFailure) {
        return;
      }

      throw new _error2.default("Can't trigger action '" + name + "' because your app hasn't finished transitioning into its first route. To trigger an action on destination routes during a transition, you can call `.send()` on the `Transition` object passed to the `model/beforeModel/afterModel` hooks.");
    }

    let eventWasHandled = false;
    let routeInfo, handler, actionHandler;

    for (let i = routeInfos.length - 1; i >= 0; i--) {
      routeInfo = routeInfos[i];
      handler = routeInfo.route;
      actionHandler = handler && handler.actions && handler.actions[name];

      if (actionHandler) {
        if (actionHandler.apply(handler, args) === true) {
          eventWasHandled = true;
        } else {
          // Should only hit here if a non-bubbling error action is triggered on a route.
          if (name === 'error') {
            handler._router._markErrorAsHandled(args[0]);
          }

          return;
        }
      }
    }

    let defaultHandler = defaultActionHandlers[name];

    if (defaultHandler) {
      defaultHandler.apply(this, [routeInfos, ...args]);
      return;
    }

    if (!eventWasHandled && !ignoreFailure) {
      throw new _error2.default("Nothing handled the action '" + name + "'. If you did handle the action, this error can be caused by returning true from an action handler in a controller, causing the action to bubble.");
    }
  }

  function calculatePostTransitionState(emberRouter, leafRouteName, contexts) {
    let state = emberRouter._routerMicrolib.applyIntent(leafRouteName, contexts);

    let {
      routeInfos,
      params
    } = state;

    for (let i = 0; i < routeInfos.length; ++i) {
      let routeInfo = routeInfos[i]; // If the routeInfo is not resolved, we serialize the context into params

      if (!routeInfo.isResolved) {
        params[routeInfo.name] = routeInfo.serialize(routeInfo.context);
      } else {
        params[routeInfo.name] = routeInfo.params;
      }
    }

    return state;
  }

  function updatePaths(router) {
    let infos = router._routerMicrolib.currentRouteInfos;

    if (infos.length === 0) {
      return;
    }

    let path = EmberRouter._routePath(infos);

    let currentRouteName = infos[infos.length - 1].name;
    let currentURL = router.get('location').getURL();
    (0, _metal.set)(router, 'currentPath', path);
    (0, _metal.set)(router, 'currentRouteName', currentRouteName);
    (0, _metal.set)(router, 'currentURL', currentURL);
    let appController = (0, _owner.getOwner)(router).lookup('controller:application');

    if (!appController) {
      // appController might not exist when top-level loading/error
      // substates have been entered since ApplicationRoute hasn't
      // actually been entered at that point.
      return;
    }

    if (_deprecatedFeatures.APP_CTRL_ROUTER_PROPS) {
      if (!('currentPath' in appController)) {
        Object.defineProperty(appController, 'currentPath', {
          get() {
            false && !false && (0, _debug.deprecate)('Accessing `currentPath` on `controller:application` is deprecated, use the `currentPath` property on `service:router` instead.', false, {
              id: 'application-controller.router-properties',
              until: '4.0.0',
              url: 'https://emberjs.com/deprecations/v3.x#toc_application-controller-router-properties'
            });
            return (0, _metal.get)(router, 'currentPath');
          }

        });
      }

      (0, _metal.notifyPropertyChange)(appController, 'currentPath');

      if (!('currentRouteName' in appController)) {
        Object.defineProperty(appController, 'currentRouteName', {
          get() {
            false && !false && (0, _debug.deprecate)('Accessing `currentRouteName` on `controller:application` is deprecated, use the `currentRouteName` property on `service:router` instead.', false, {
              id: 'application-controller.router-properties',
              until: '4.0.0',
              url: 'https://emberjs.com/deprecations/v3.x#toc_application-controller-router-properties'
            });
            return (0, _metal.get)(router, 'currentRouteName');
          }

        });
      }

      (0, _metal.notifyPropertyChange)(appController, 'currentRouteName');
    }
  }

  EmberRouter.reopenClass({
    /**
      The `Router.map` function allows you to define mappings from URLs to routes
      in your application. These mappings are defined within the
      supplied callback function using `this.route`.
         The first parameter is the name of the route which is used by default as the
      path name as well.
         The second parameter is the optional options hash. Available options are:
           * `path`: allows you to provide your own path as well as mark dynamic
          segments.
        * `resetNamespace`: false by default; when nesting routes, ember will
          combine the route names to form the fully-qualified route name, which is
          used with `{{link-to}}` or manually transitioning to routes. Setting
          `resetNamespace: true` will cause the route not to inherit from its
          parent route's names. This is handy for preventing extremely long route names.
          Keep in mind that the actual URL path behavior is still retained.
         The third parameter is a function, which can be used to nest routes.
      Nested routes, by default, will have the parent route tree's route name and
      path prepended to it's own.
         ```app/router.js
      Router.map(function(){
        this.route('post', { path: '/post/:post_id' }, function() {
          this.route('edit');
          this.route('comments', { resetNamespace: true }, function() {
            this.route('new');
          });
        });
      });
      ```
         @method map
      @param callback
      @public
    */
    map(callback) {
      if (!this.dslCallbacks) {
        this.dslCallbacks = [];
        this.reopenClass({
          dslCallbacks: this.dslCallbacks
        });
      }

      this.dslCallbacks.push(callback);
      return this;
    },

    _routePath(routeInfos) {
      let path = []; // We have to handle coalescing resource names that
      // are prefixed with their parent's names, e.g.
      // ['foo', 'foo.bar.baz'] => 'foo.bar.baz', not 'foo.foo.bar.baz'

      function intersectionMatches(a1, a2) {
        for (let i = 0; i < a1.length; ++i) {
          if (a1[i] !== a2[i]) {
            return false;
          }
        }

        return true;
      }

      let name, nameParts, oldNameParts;

      for (let i = 1; i < routeInfos.length; i++) {
        name = routeInfos[i].name;
        nameParts = name.split('.');
        oldNameParts = slice.call(path);

        while (oldNameParts.length) {
          if (intersectionMatches(oldNameParts, nameParts)) {
            break;
          }

          oldNameParts.shift();
        }

        path.push(...nameParts.slice(oldNameParts.length));
      }

      return path.join('.');
    }

  });

  function didBeginTransition(transition, router) {
    let routerState = new _router_state.default(router, router._routerMicrolib, transition[_router_js.STATE_SYMBOL]);

    if (!router.currentState) {
      router.set('currentState', routerState);
    }

    router.set('targetState', routerState);
    transition.promise = transition.catch(error => {
      if (router._isErrorHandled(error)) {
        router._clearHandledError(error);
      } else {
        throw error;
      }
    }, 'Transition Error');
  }

  function forEachQueryParam(router, routeInfos, queryParams, callback) {
    let qpCache = router._queryParamsFor(routeInfos);

    for (let key in queryParams) {
      if (!queryParams.hasOwnProperty(key)) {
        continue;
      }

      let value = queryParams[key];
      let qp = qpCache.map[key];
      callback(key, value, qp);
    }
  }

  function findLiveRoute(liveRoutes, name) {
    if (!liveRoutes) {
      return;
    }

    let stack = [liveRoutes];

    while (stack.length > 0) {
      let test = stack.shift();

      if (test.render.name === name) {
        return test;
      }

      let outlets = test.outlets;

      for (let outletName in outlets) {
        stack.push(outlets[outletName]);
      }
    }

    return;
  }

  function appendLiveRoute(liveRoutes, defaultParentState, renderOptions) {
    let target;
    let myState = {
      render: renderOptions,
      outlets: Object.create(null),
      wasUsed: false
    };

    if (renderOptions.into) {
      target = findLiveRoute(liveRoutes, renderOptions.into);
    } else {
      target = defaultParentState;
    }

    if (target) {
      (0, _metal.set)(target.outlets, renderOptions.outlet, myState);
    } else {
      liveRoutes = myState;
    }

    return {
      liveRoutes,
      ownState: myState
    };
  }

  function representEmptyRoute(liveRoutes, defaultParentState, route) {
    // the route didn't render anything
    let alreadyAppended = findLiveRoute(liveRoutes, route.routeName);

    if (alreadyAppended) {
      // But some other route has already rendered our default
      // template, so that becomes the default target for any
      // children we may have.
      return alreadyAppended;
    } else {
      // Create an entry to represent our default template name,
      // just so other routes can target it and inherit its place
      // in the outlet hierarchy.
      defaultParentState.outlets.main = {
        render: {
          name: route.routeName,
          outlet: 'main'
        },
        outlets: {}
      };
      return defaultParentState;
    }
  }

  EmberRouter.reopen(_runtime.Evented, {
    /**
      Handles updating the paths and notifying any listeners of the URL
      change.
         Triggers the router level `didTransition` hook.
         For example, to notify google analytics when the route changes,
      you could use this hook.  (Note: requires also including GA scripts, etc.)
         ```javascript
      import config from './config/environment';
      import EmberRouter from '@ember/routing/router';
      import { inject as service } from '@ember/service';
         let Router = EmberRouter.extend({
        location: config.locationType,
           router: service(),
           didTransition: function() {
          this._super(...arguments);
             ga('send', 'pageview', {
            page: this.router.currentURL,
            title: this.router.currentRouteName,
          });
        }
      });
      ```
         @method didTransition
      @public
      @since 1.2.0
    */
    didTransition: defaultDidTransition,

    /**
      Handles notifying any listeners of an impending URL
      change.
         Triggers the router level `willTransition` hook.
         @method willTransition
      @public
      @since 1.11.0
    */
    willTransition: defaultWillTransition,

    /**
     Represents the URL of the root of the application, often '/'. This prefix is
     assumed on all routes defined on this router.
        @property rootURL
     @default '/'
     @public
    */
    rootURL: '/',

    /**
     The `location` property determines the type of URL's that your
     application will use.
        The following location types are currently available:
        * `history` - use the browser's history API to make the URLs look just like any standard URL
     * `hash` - use `#` to separate the server part of the URL from the Ember part: `/blog/#/posts/new`
     * `none` - do not store the Ember URL in the actual browser URL (mainly used for testing)
     * `auto` - use the best option based on browser capabilities: `history` if possible, then `hash` if possible, otherwise `none`
        This value is defaulted to `auto` by the `locationType` setting of `/config/environment.js`
        @property location
     @default 'hash'
     @see {Location}
     @public
    */
    location: 'hash',

    /**
     Represents the current URL.
        @property url
     @type {String}
     @private
    */
    url: (0, _metal.computed)(function () {
      return (0, _metal.get)(this, 'location').getURL();
    })
  });

  if (_deprecatedFeatures.ROUTER_EVENTS) {
    EmberRouter.reopen(_route.ROUTER_EVENT_DEPRECATIONS);
  }

  var _default = EmberRouter;
  _exports.default = _default;
});
enifed("@ember/-internals/routing/lib/system/router_state", ["exports", "@ember/polyfills", "@ember/-internals/routing/lib/utils"], function (_exports, _polyfills, _utils) {
  "use strict";

  _exports.default = void 0;

  class RouterState {
    constructor(emberRouter, router, routerJsState) {
      this.emberRouter = emberRouter;
      this.router = router;
      this.routerJsState = routerJsState;
    }

    isActiveIntent(routeName, models, queryParams, queryParamsMustMatch) {
      let state = this.routerJsState;

      if (!this.router.isActiveIntent(routeName, models, undefined, state)) {
        return false;
      }

      if (queryParamsMustMatch && Object.keys(queryParams).length > 0) {
        let visibleQueryParams = (0, _polyfills.assign)({}, queryParams);

        this.emberRouter._prepareQueryParams(routeName, models, visibleQueryParams);

        return (0, _utils.shallowEqual)(visibleQueryParams, state.queryParams);
      }

      return true;
    }

  }

  _exports.default = RouterState;
});
enifed("@ember/-internals/routing/lib/system/transition", [], function () {
  "use strict";
  /**
    A Transition is a thennable (a promise-like object) that represents
    an attempt to transition to another route. It can be aborted, either
    explicitly via `abort` or by attempting another transition while a
    previous one is still underway. An aborted transition can also
    be `retry()`d later.
  
    @class Transition
    @public
  */

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

  /**
    Aborts the Transition. Note you can also implicitly abort a transition
    by initiating another transition while a previous one is underway.
  
    @method abort
    @return {Transition} this transition
    @public
  */

  /**
  
    Retries a previously-aborted transition (making sure to abort the
    transition if it's still active). Returns a new transition that
    represents the new attempt to transition.
  
    @method retry
    @return {Transition} new transition
    @public
    */

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

  /**
   * This property is a `RouteInfo` object that represents
   * where the router is transitioning to. It's important
   * to note that a `RouteInfo` is a linked list and this
   * property represents the leafmost route.
   * @property {RouteInfo|RouteInfoWithAttributes} to
   * @public
   */

  /**
   * This property is a `RouteInfo` object that represents
   * where transition originated from. It's important
   * to note that a `RouteInfo` is a linked list and this
   * property represents the head node of the list.
   * In the case of an initial render, `from` will be set to
   * `null`.
   * @property {RouteInfoWithAttributes} from
   * @public
   */

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
});
enifed("@ember/-internals/routing/lib/utils", ["exports", "@ember/-internals/metal", "@ember/-internals/owner", "@ember/error", "@ember/polyfills", "router_js"], function (_exports, _metal, _owner, _error, _polyfills, _router_js) {
  "use strict";

  _exports.extractRouteArgs = extractRouteArgs;
  _exports.getActiveTargetName = getActiveTargetName;
  _exports.stashParamNames = stashParamNames;
  _exports.calculateCacheKey = calculateCacheKey;
  _exports.normalizeControllerQueryParams = normalizeControllerQueryParams;
  _exports.resemblesURL = resemblesURL;
  _exports.prefixRouteNameArg = prefixRouteNameArg;
  _exports.shallowEqual = shallowEqual;
  const ALL_PERIODS_REGEX = /\./g;

  function extractRouteArgs(args) {
    args = args.slice();
    let possibleQueryParams = args[args.length - 1];
    let queryParams;

    if (possibleQueryParams && possibleQueryParams.hasOwnProperty('queryParams')) {
      queryParams = args.pop().queryParams;
    } else {
      queryParams = {};
    }

    let routeName = args.shift();
    return {
      routeName,
      models: args,
      queryParams
    };
  }

  function getActiveTargetName(router) {
    let routeInfos = router.activeTransition ? router.activeTransition[_router_js.STATE_SYMBOL].routeInfos : router.state.routeInfos;
    return routeInfos[routeInfos.length - 1].name;
  }

  function stashParamNames(router, routeInfos) {
    if (routeInfos['_namesStashed']) {
      return;
    } // This helper exists because router.js/route-recognizer.js awkwardly
    // keeps separate a routeInfo's list of parameter names depending
    // on whether a URL transition or named transition is happening.
    // Hopefully we can remove this in the future.


    let targetRouteName = routeInfos[routeInfos.length - 1].name;

    let recogHandlers = router._routerMicrolib.recognizer.handlersFor(targetRouteName);

    let dynamicParent;

    for (let i = 0; i < routeInfos.length; ++i) {
      let routeInfo = routeInfos[i];
      let names = recogHandlers[i].names;

      if (names.length) {
        dynamicParent = routeInfo;
      }

      routeInfo['_names'] = names;
      let route = routeInfo.route;

      route._stashNames(routeInfo, dynamicParent);
    }

    routeInfos['_namesStashed'] = true;
  }

  function _calculateCacheValuePrefix(prefix, part) {
    // calculates the dot separated sections from prefix that are also
    // at the start of part - which gives us the route name
    // given : prefix = site.article.comments, part = site.article.id
    //      - returns: site.article (use get(values[site.article], 'id') to get the dynamic part - used below)
    // given : prefix = site.article, part = site.article.id
    //      - returns: site.article. (use get(values[site.article], 'id') to get the dynamic part - used below)
    let prefixParts = prefix.split('.');
    let currPrefix = '';

    for (let i = 0; i < prefixParts.length; i++) {
      let currPart = prefixParts.slice(0, i + 1).join('.');

      if (part.indexOf(currPart) !== 0) {
        break;
      }

      currPrefix = currPart;
    }

    return currPrefix;
  }
  /*
    Stolen from Controller
  */


  function calculateCacheKey(prefix, parts = [], values) {
    let suffixes = '';

    for (let i = 0; i < parts.length; ++i) {
      let part = parts[i];

      let cacheValuePrefix = _calculateCacheValuePrefix(prefix, part);

      let value;

      if (values) {
        if (cacheValuePrefix && cacheValuePrefix in values) {
          let partRemovedPrefix = part.indexOf(cacheValuePrefix) === 0 ? part.substr(cacheValuePrefix.length + 1) : part;
          value = (0, _metal.get)(values[cacheValuePrefix], partRemovedPrefix);
        } else {
          value = (0, _metal.get)(values, part);
        }
      }

      suffixes += "::" + part + ":" + value;
    }

    return prefix + suffixes.replace(ALL_PERIODS_REGEX, '-');
  }
  /*
    Controller-defined query parameters can come in three shapes:
  
    Array
      queryParams: ['foo', 'bar']
    Array of simple objects where value is an alias
      queryParams: [
        {
          'foo': 'rename_foo_to_this'
        },
        {
          'bar': 'call_bar_this_instead'
        }
      ]
    Array of fully defined objects
      queryParams: [
        {
          'foo': {
            as: 'rename_foo_to_this'
          },
        }
        {
          'bar': {
            as: 'call_bar_this_instead',
            scope: 'controller'
          }
        }
      ]
  
    This helper normalizes all three possible styles into the
    'Array of fully defined objects' style.
  */


  function normalizeControllerQueryParams(queryParams) {
    let qpMap = {};

    for (let i = 0; i < queryParams.length; ++i) {
      accumulateQueryParamDescriptors(queryParams[i], qpMap);
    }

    return qpMap;
  }

  function accumulateQueryParamDescriptors(_desc, accum) {
    let desc = _desc;
    let tmp;

    if (typeof desc === 'string') {
      tmp = {};
      tmp[desc] = {
        as: null
      };
      desc = tmp;
    }

    for (let key in desc) {
      if (!desc.hasOwnProperty(key)) {
        return;
      }

      let singleDesc = desc[key];

      if (typeof singleDesc === 'string') {
        singleDesc = {
          as: singleDesc
        };
      }

      tmp = accum[key] || {
        as: null,
        scope: 'model'
      };
      (0, _polyfills.assign)(tmp, singleDesc);
      accum[key] = tmp;
    }
  }
  /*
    Check if a routeName resembles a url instead
  
    @private
  */


  function resemblesURL(str) {
    return typeof str === 'string' && (str === '' || str[0] === '/');
  }
  /*
    Returns an arguments array where the route name arg is prefixed based on the mount point
  
    @private
  */


  function prefixRouteNameArg(route, args) {
    let routeName = args[0];
    let owner = (0, _owner.getOwner)(route);
    let prefix = owner.mountPoint; // only alter the routeName if it's actually referencing a route.

    if (owner.routable && typeof routeName === 'string') {
      if (resemblesURL(routeName)) {
        throw new _error.default('Programmatic transitions by URL cannot be used within an Engine. Please use the route name instead.');
      } else {
        routeName = prefix + "." + routeName;
        args[0] = routeName;
      }
    }

    return args;
  }

  function shallowEqual(a, b) {
    let k;
    let aCount = 0;
    let bCount = 0;

    for (k in a) {
      if (a.hasOwnProperty(k)) {
        if (a[k] !== b[k]) {
          return false;
        }

        aCount++;
      }
    }

    for (k in b) {
      if (b.hasOwnProperty(k)) {
        bCount++;
      }
    }

    return aCount === bCount;
  }
});
enifed("@ember/-internals/runtime/index", ["exports", "@ember/-internals/runtime/lib/system/object", "@ember/-internals/runtime/lib/mixins/registry_proxy", "@ember/-internals/runtime/lib/mixins/container_proxy", "@ember/-internals/runtime/lib/copy", "@ember/-internals/runtime/lib/compare", "@ember/-internals/runtime/lib/is-equal", "@ember/-internals/runtime/lib/mixins/array", "@ember/-internals/runtime/lib/mixins/comparable", "@ember/-internals/runtime/lib/system/namespace", "@ember/-internals/runtime/lib/system/array_proxy", "@ember/-internals/runtime/lib/system/object_proxy", "@ember/-internals/runtime/lib/system/core_object", "@ember/-internals/runtime/lib/mixins/action_handler", "@ember/-internals/runtime/lib/mixins/copyable", "@ember/-internals/runtime/lib/mixins/enumerable", "@ember/-internals/runtime/lib/mixins/-proxy", "@ember/-internals/runtime/lib/mixins/observable", "@ember/-internals/runtime/lib/mixins/mutable_enumerable", "@ember/-internals/runtime/lib/mixins/target_action_support", "@ember/-internals/runtime/lib/mixins/evented", "@ember/-internals/runtime/lib/mixins/promise_proxy", "@ember/-internals/runtime/lib/ext/rsvp", "@ember/-internals/runtime/lib/type-of", "@ember/-internals/runtime/lib/ext/function"], function (_exports, _object, _registry_proxy, _container_proxy, _copy, _compare, _isEqual, _array, _comparable, _namespace, _array_proxy, _object_proxy, _core_object, _action_handler, _copyable, _enumerable, _proxy, _observable, _mutable_enumerable, _target_action_support, _evented, _promise_proxy, _rsvp, _typeOf, _function) {
  "use strict";

  Object.defineProperty(_exports, "Object", {
    enumerable: true,
    get: function () {
      return _object.default;
    }
  });
  Object.defineProperty(_exports, "FrameworkObject", {
    enumerable: true,
    get: function () {
      return _object.FrameworkObject;
    }
  });
  Object.defineProperty(_exports, "RegistryProxyMixin", {
    enumerable: true,
    get: function () {
      return _registry_proxy.default;
    }
  });
  Object.defineProperty(_exports, "ContainerProxyMixin", {
    enumerable: true,
    get: function () {
      return _container_proxy.default;
    }
  });
  Object.defineProperty(_exports, "isEqual", {
    enumerable: true,
    get: function () {
      return _isEqual.default;
    }
  });
  Object.defineProperty(_exports, "Array", {
    enumerable: true,
    get: function () {
      return _array.default;
    }
  });
  Object.defineProperty(_exports, "NativeArray", {
    enumerable: true,
    get: function () {
      return _array.NativeArray;
    }
  });
  Object.defineProperty(_exports, "A", {
    enumerable: true,
    get: function () {
      return _array.A;
    }
  });
  Object.defineProperty(_exports, "MutableArray", {
    enumerable: true,
    get: function () {
      return _array.MutableArray;
    }
  });
  Object.defineProperty(_exports, "removeAt", {
    enumerable: true,
    get: function () {
      return _array.removeAt;
    }
  });
  Object.defineProperty(_exports, "uniqBy", {
    enumerable: true,
    get: function () {
      return _array.uniqBy;
    }
  });
  Object.defineProperty(_exports, "isArray", {
    enumerable: true,
    get: function () {
      return _array.isArray;
    }
  });
  Object.defineProperty(_exports, "Comparable", {
    enumerable: true,
    get: function () {
      return _comparable.default;
    }
  });
  Object.defineProperty(_exports, "Namespace", {
    enumerable: true,
    get: function () {
      return _namespace.default;
    }
  });
  Object.defineProperty(_exports, "ArrayProxy", {
    enumerable: true,
    get: function () {
      return _array_proxy.default;
    }
  });
  Object.defineProperty(_exports, "ObjectProxy", {
    enumerable: true,
    get: function () {
      return _object_proxy.default;
    }
  });
  Object.defineProperty(_exports, "CoreObject", {
    enumerable: true,
    get: function () {
      return _core_object.default;
    }
  });
  Object.defineProperty(_exports, "setFrameworkClass", {
    enumerable: true,
    get: function () {
      return _core_object.setFrameworkClass;
    }
  });
  Object.defineProperty(_exports, "ActionHandler", {
    enumerable: true,
    get: function () {
      return _action_handler.default;
    }
  });
  Object.defineProperty(_exports, "Copyable", {
    enumerable: true,
    get: function () {
      return _copyable.default;
    }
  });
  Object.defineProperty(_exports, "Enumerable", {
    enumerable: true,
    get: function () {
      return _enumerable.default;
    }
  });
  Object.defineProperty(_exports, "_ProxyMixin", {
    enumerable: true,
    get: function () {
      return _proxy.default;
    }
  });
  Object.defineProperty(_exports, "_contentFor", {
    enumerable: true,
    get: function () {
      return _proxy.contentFor;
    }
  });
  Object.defineProperty(_exports, "Observable", {
    enumerable: true,
    get: function () {
      return _observable.default;
    }
  });
  Object.defineProperty(_exports, "MutableEnumerable", {
    enumerable: true,
    get: function () {
      return _mutable_enumerable.default;
    }
  });
  Object.defineProperty(_exports, "TargetActionSupport", {
    enumerable: true,
    get: function () {
      return _target_action_support.default;
    }
  });
  Object.defineProperty(_exports, "Evented", {
    enumerable: true,
    get: function () {
      return _evented.default;
    }
  });
  Object.defineProperty(_exports, "PromiseProxyMixin", {
    enumerable: true,
    get: function () {
      return _promise_proxy.default;
    }
  });
  Object.defineProperty(_exports, "RSVP", {
    enumerable: true,
    get: function () {
      return _rsvp.default;
    }
  });
  Object.defineProperty(_exports, "onerrorDefault", {
    enumerable: true,
    get: function () {
      return _rsvp.onerrorDefault;
    }
  });
  Object.defineProperty(_exports, "typeOf", {
    enumerable: true,
    get: function () {
      return _typeOf.typeOf;
    }
  });
});
enifed("@ember/-internals/runtime/lib/mixins/action_handler", ["exports", "@ember/-internals/metal", "@ember/debug"], function (_exports, _metal, _debug) {
  "use strict";

  _exports.default = void 0;

  /**
  @module ember
  */

  /**
    `Ember.ActionHandler` is available on some familiar classes including
    `Route`, `Component`, and `Controller`.
    (Internally the mixin is used by `Ember.CoreView`, `Ember.ControllerMixin`,
    and `Route` and available to the above classes through
    inheritance.)
  
    @class ActionHandler
    @namespace Ember
    @private
  */
  const ActionHandler = _metal.Mixin.create({
    mergedProperties: ['actions'],

    /**
      The collection of functions, keyed by name, available on this
      `ActionHandler` as action targets.
       These functions will be invoked when a matching `{{action}}` is triggered
      from within a template and the application's current route is this route.
       Actions can also be invoked from other parts of your application
      via `ActionHandler#send`.
       The `actions` hash will inherit action handlers from
      the `actions` hash defined on extended parent classes
      or mixins rather than just replace the entire hash, e.g.:
       ```app/mixins/can-display-banner.js
      import Mixin from '@ember/mixin';
       export default Mixin.create({
        actions: {
          displayBanner(msg) {
            // ...
          }
        }
      });
      ```
       ```app/routes/welcome.js
      import Route from '@ember/routing/route';
      import CanDisplayBanner from '../mixins/can-display-banner';
       export default Route.extend(CanDisplayBanner, {
        actions: {
          playMusic() {
            // ...
          }
        }
      });
       // `WelcomeRoute`, when active, will be able to respond
      // to both actions, since the actions hash is merged rather
      // then replaced when extending mixins / parent classes.
      this.send('displayBanner');
      this.send('playMusic');
      ```
       Within a Controller, Route or Component's action handler,
      the value of the `this` context is the Controller, Route or
      Component object:
       ```app/routes/song.js
      import Route from '@ember/routing/route';
       export default Route.extend({
        actions: {
          myAction() {
            this.controllerFor("song");
            this.transitionTo("other.route");
            ...
          }
        }
      });
      ```
       It is also possible to call `this._super(...arguments)` from within an
      action handler if it overrides a handler defined on a parent
      class or mixin:
       Take for example the following routes:
       ```app/mixins/debug-route.js
      import Mixin from '@ember/mixin';
       export default Mixin.create({
        actions: {
          debugRouteInformation() {
            console.debug("It's a-me, console.debug!");
          }
        }
      });
      ```
       ```app/routes/annoying-debug.js
      import Route from '@ember/routing/route';
      import DebugRoute from '../mixins/debug-route';
       export default Route.extend(DebugRoute, {
        actions: {
          debugRouteInformation() {
            // also call the debugRouteInformation of mixed in DebugRoute
            this._super(...arguments);
             // show additional annoyance
            window.alert(...);
          }
        }
      });
      ```
       ## Bubbling
       By default, an action will stop bubbling once a handler defined
      on the `actions` hash handles it. To continue bubbling the action,
      you must return `true` from the handler:
       ```app/router.js
      Router.map(function() {
        this.route("album", function() {
          this.route("song");
        });
      });
      ```
       ```app/routes/album.js
      import Route from '@ember/routing/route';
       export default Route.extend({
        actions: {
          startPlaying: function() {
          }
        }
      });
      ```
       ```app/routes/album-song.js
      import Route from '@ember/routing/route';
       export default Route.extend({
        actions: {
          startPlaying() {
            // ...
             if (actionShouldAlsoBeTriggeredOnParentRoute) {
              return true;
            }
          }
        }
      });
      ```
       @property actions
      @type Object
      @default null
      @public
    */

    /**
      Triggers a named action on the `ActionHandler`. Any parameters
      supplied after the `actionName` string will be passed as arguments
      to the action target function.
       If the `ActionHandler` has its `target` property set, actions may
      bubble to the `target`. Bubbling happens when an `actionName` can
      not be found in the `ActionHandler`'s `actions` hash or if the
      action target function returns `true`.
       Example
       ```app/routes/welcome.js
      import Route from '@ember/routing/route';
       export default Route.extend({
        actions: {
          playTheme() {
            this.send('playMusic', 'theme.mp3');
          },
          playMusic(track) {
            // ...
          }
        }
      });
      ```
       @method send
      @param {String} actionName The action to trigger
      @param {*} context a context to send with the action
      @public
    */
    send(actionName, ...args) {
      false && !(!this.isDestroying && !this.isDestroyed) && (0, _debug.assert)("Attempted to call .send() with the action '" + actionName + "' on the destroyed object '" + this + "'.", !this.isDestroying && !this.isDestroyed);

      if (this.actions && this.actions[actionName]) {
        let shouldBubble = this.actions[actionName].apply(this, args) === true;

        if (!shouldBubble) {
          return;
        }
      }

      let target = (0, _metal.get)(this, 'target');

      if (target) {
        false && !(typeof target.send === 'function') && (0, _debug.assert)("The `target` for " + this + " (" + target + ") does not have a `send` method", typeof target.send === 'function');
        target.send(...arguments);
      }
    }

  });

  var _default = ActionHandler;
  _exports.default = _default;
});
enifed("@ember/-internals/runtime/lib/mixins/container_proxy", ["exports", "@ember/runloop", "@ember/-internals/metal"], function (_exports, _runloop, _metal) {
  "use strict";

  _exports.default = void 0;

  /**
  @module ember
  */

  /**
    ContainerProxyMixin is used to provide public access to specific
    container functionality.
  
    @class ContainerProxyMixin
    @private
  */
  let containerProxyMixin = {
    /**
     The container stores state.
      @private
     @property {Ember.Container} __container__
     */
    __container__: null,

    /**
     Returns an object that can be used to provide an owner to a
     manually created instance.
      Example:
      ```
     import { getOwner } from '@ember/application';
      let owner = getOwner(this);
      User.create(
       owner.ownerInjection(),
       { username: 'rwjblue' }
     )
     ```
      @public
     @method ownerInjection
     @since 2.3.0
     @return {Object}
    */
    ownerInjection() {
      return this.__container__.ownerInjection();
    },

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
      If singletons are not wanted an optional flag can be provided at lookup.
      ```javascript
     let registry = new Registry();
     let container = registry.container();
      registry.register('api:twitter', Twitter);
      let twitter = container.lookup('api:twitter', { singleton: false });
     let twitter2 = container.lookup('api:twitter', { singleton: false });
      twitter === twitter2; //=> false
     ```
      @public
     @method lookup
     @param {String} fullName
     @param {Object} options
     @return {any}
     */
    lookup(fullName, options) {
      return this.__container__.lookup(fullName, options);
    },

    destroy() {
      let container = this.__container__;

      if (container) {
        (0, _runloop.join)(() => {
          container.destroy();
          (0, _runloop.schedule)('destroy', container, 'finalizeDestroy');
        });
      }

      this._super();
    },

    /**
    Given a fullName return a factory manager.
     This method returns a manager which can be used for introspection of the
    factory's class or for the creation of factory instances with initial
    properties. The manager is an object with the following properties:
     * `class` - The registered or resolved class.
    * `create` - A function that will create an instance of the class with
      any dependencies injected.
     For example:
     ```javascript
    import { getOwner } from '@ember/application';
     let owner = getOwner(otherInstance);
    // the owner is commonly the `applicationInstance`, and can be accessed via
    // an instance initializer.
     let factory = owner.factoryFor('service:bespoke');
     factory.class;
    // The registered or resolved class. For example when used with an Ember-CLI
    // app, this would be the default export from `app/services/bespoke.js`.
     let instance = factory.create({
      someProperty: 'an initial property value'
    });
    // Create an instance with any injections and the passed options as
    // initial properties.
    ```
     Any instances created via the factory's `.create()` method *must* be destroyed
    manually by the caller of `.create()`. Typically, this is done during the creating
    objects own `destroy` or `willDestroy` methods.
     @public
    @method factoryFor
    @param {String} fullName
    @param {Object} options
    @return {FactoryManager}
    */
    factoryFor(fullName, options = {}) {
      return this.__container__.factoryFor(fullName, options);
    }

  };

  var _default = _metal.Mixin.create(containerProxyMixin);

  _exports.default = _default;
});
enifed("@ember/-internals/runtime/lib/mixins/registry_proxy", ["exports", "@ember/debug", "@ember/-internals/metal"], function (_exports, _debug, _metal) {
  "use strict";

  _exports.default = void 0;

  /**
  @module ember
  */

  /**
    RegistryProxyMixin is used to provide public access to specific
    registry functionality.
  
    @class RegistryProxyMixin
    @private
  */
  var _default = _metal.Mixin.create({
    __registry__: null,

    /**
     Given a fullName return the corresponding factory.
      @public
     @method resolveRegistration
     @param {String} fullName
     @return {Function} fullName's factory
     */
    resolveRegistration(fullName, options) {
      false && !this.__registry__.isValidFullName(fullName) && (0, _debug.assert)('fullName must be a proper full name', this.__registry__.isValidFullName(fullName));
      return this.__registry__.resolve(fullName, options);
    },

    /**
      Registers a factory that can be used for dependency injection (with
      `inject`) or for service lookup. Each factory is registered with
      a full name including two parts: `type:name`.
       A simple example:
       ```javascript
      import Application from '@ember/application';
      import EmberObject from '@ember/object';
       let App = Application.create();
       App.Orange = EmberObject.extend();
      App.register('fruit:favorite', App.Orange);
      ```
       Ember will resolve factories from the `App` namespace automatically.
      For example `App.CarsController` will be discovered and returned if
      an application requests `controller:cars`.
       An example of registering a controller with a non-standard name:
       ```javascript
      import Application from '@ember/application';
      import Controller from '@ember/controller';
       let App = Application.create();
      let Session = Controller.extend();
       App.register('controller:session', Session);
       // The Session controller can now be treated like a normal controller,
      // despite its non-standard name.
      App.ApplicationController = Controller.extend({
        needs: ['session']
      });
      ```
       Registered factories are **instantiated** by having `create`
      called on them. Additionally they are **singletons**, each time
      they are looked up they return the same instance.
       Some examples modifying that default behavior:
       ```javascript
      import Application from '@ember/application';
      import EmberObject from '@ember/object';
       let App = Application.create();
       App.Person = EmberObject.extend();
      App.Orange = EmberObject.extend();
      App.Email = EmberObject.extend();
      App.session = EmberObject.create();
       App.register('model:user', App.Person, { singleton: false });
      App.register('fruit:favorite', App.Orange);
      App.register('communication:main', App.Email, { singleton: false });
      App.register('session', App.session, { instantiate: false });
      ```
       @method register
      @param  fullName {String} type:name (e.g., 'model:user')
      @param  factory {any} (e.g., App.Person)
      @param  options {Object} (optional) disable instantiation or singleton usage
      @public
     */
    register: registryAlias('register'),

    /**
     Unregister a factory.
      ```javascript
     import Application from '@ember/application';
     import EmberObject from '@ember/object';
      let App = Application.create();
     let User = EmberObject.extend();
     App.register('model:user', User);
      App.resolveRegistration('model:user').create() instanceof User //=> true
      App.unregister('model:user')
     App.resolveRegistration('model:user') === undefined //=> true
     ```
      @public
     @method unregister
     @param {String} fullName
     */
    unregister: registryAlias('unregister'),

    /**
     Check if a factory is registered.
      @public
     @method hasRegistration
     @param {String} fullName
     @return {Boolean}
     */
    hasRegistration: registryAlias('has'),

    /**
     Return a specific registered option for a particular factory.
      @public
     @method registeredOption
     @param  {String} fullName
     @param  {String} optionName
     @return {Object} options
     */
    registeredOption: registryAlias('getOption'),

    /**
     Register options for a particular factory.
      @public
     @method registerOptions
     @param {String} fullName
     @param {Object} options
     */
    registerOptions: registryAlias('options'),

    /**
     Return registered options for a particular factory.
      @public
     @method registeredOptions
     @param  {String} fullName
     @return {Object} options
     */
    registeredOptions: registryAlias('getOptions'),

    /**
     Allow registering options for all factories of a type.
      ```javascript
     import Application from '@ember/application';
      let App = Application.create();
     let appInstance = App.buildInstance();
      // if all of type `connection` must not be singletons
     appInstance.registerOptionsForType('connection', { singleton: false });
      appInstance.register('connection:twitter', TwitterConnection);
     appInstance.register('connection:facebook', FacebookConnection);
      let twitter = appInstance.lookup('connection:twitter');
     let twitter2 = appInstance.lookup('connection:twitter');
      twitter === twitter2; // => false
      let facebook = appInstance.lookup('connection:facebook');
     let facebook2 = appInstance.lookup('connection:facebook');
      facebook === facebook2; // => false
     ```
      @public
     @method registerOptionsForType
     @param {String} type
     @param {Object} options
     */
    registerOptionsForType: registryAlias('optionsForType'),

    /**
     Return the registered options for all factories of a type.
      @public
     @method registeredOptionsForType
     @param {String} type
     @return {Object} options
     */
    registeredOptionsForType: registryAlias('getOptionsForType'),

    /**
      Define a dependency injection onto a specific factory or all factories
      of a type.
       When Ember instantiates a controller, view, or other framework component
      it can attach a dependency to that component. This is often used to
      provide services to a set of framework components.
       An example of providing a session object to all controllers:
       ```javascript
      import { alias } from '@ember/object/computed';
      import Application from '@ember/application';
      import Controller from '@ember/controller';
      import EmberObject from '@ember/object';
       let App = Application.create();
      let Session = EmberObject.extend({ isAuthenticated: false });
       // A factory must be registered before it can be injected
      App.register('session:main', Session);
       // Inject 'session:main' onto all factories of the type 'controller'
      // with the name 'session'
      App.inject('controller', 'session', 'session:main');
       App.IndexController = Controller.extend({
        isLoggedIn: alias('session.isAuthenticated')
      });
      ```
       Injections can also be performed on specific factories.
       ```javascript
      App.inject(<full_name or type>, <property name>, <full_name>)
      App.inject('route', 'source', 'source:main')
      App.inject('route:application', 'email', 'model:email')
      ```
       It is important to note that injections can only be performed on
      classes that are instantiated by Ember itself. Instantiating a class
      directly (via `create` or `new`) bypasses the dependency injection
      system.
       @public
      @method inject
      @param  factoryNameOrType {String}
      @param  property {String}
      @param  injectionName {String}
    **/
    inject: registryAlias('injection')
  });

  _exports.default = _default;

  function registryAlias(name) {
    return function () {
      return this.__registry__[name](...arguments);
    };
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
enifed("@ember/application/index", ["exports", "@ember/-internals/owner", "@ember/application/lib/lazy_load", "@ember/application/lib/application"], function (_exports, _owner, _lazy_load, _application) {
  "use strict";

  Object.defineProperty(_exports, "getOwner", {
    enumerable: true,
    get: function () {
      return _owner.getOwner;
    }
  });
  Object.defineProperty(_exports, "setOwner", {
    enumerable: true,
    get: function () {
      return _owner.setOwner;
    }
  });
  Object.defineProperty(_exports, "onLoad", {
    enumerable: true,
    get: function () {
      return _lazy_load.onLoad;
    }
  });
  Object.defineProperty(_exports, "runLoadHooks", {
    enumerable: true,
    get: function () {
      return _lazy_load.runLoadHooks;
    }
  });
  Object.defineProperty(_exports, "_loaded", {
    enumerable: true,
    get: function () {
      return _lazy_load._loaded;
    }
  });
  Object.defineProperty(_exports, "default", {
    enumerable: true,
    get: function () {
      return _application.default;
    }
  });
});
enifed("@ember/application/instance", ["exports", "@ember/polyfills", "@ember/-internals/metal", "@ember/-internals/browser-environment", "@ember/-internals/views", "@ember/engine/instance", "@ember/-internals/glimmer"], function (_exports, _polyfills, _metal, environment, _views, _instance, _glimmer) {
  "use strict";

  _exports.default = void 0;

  /**
  @module @ember/application
  */

  /**
    The `ApplicationInstance` encapsulates all of the stateful aspects of a
    running `Application`.
  
    At a high-level, we break application boot into two distinct phases:
  
    * Definition time, where all of the classes, templates, and other
      dependencies are loaded (typically in the browser).
    * Run time, where we begin executing the application once everything
      has loaded.
  
    Definition time can be expensive and only needs to happen once since it is
    an idempotent operation. For example, between test runs and FastBoot
    requests, the application stays the same. It is only the state that we want
    to reset.
  
    That state is what the `ApplicationInstance` manages: it is responsible for
    creating the container that contains all application state, and disposing of
    it once the particular test run or FastBoot request has finished.
  
    @public
    @class ApplicationInstance
    @extends EngineInstance
  */
  const ApplicationInstance = _instance.default.extend({
    /**
      The `Application` for which this is an instance.
       @property {Application} application
      @private
    */
    application: null,

    /**
      The DOM events for which the event dispatcher should listen.
       By default, the application's `Ember.EventDispatcher` listens
      for a set of standard DOM events, such as `mousedown` and
      `keyup`, and delegates them to your application's `Ember.View`
      instances.
       @private
      @property {Object} customEvents
    */
    customEvents: null,

    /**
      The root DOM element of the Application as an element or a
      [jQuery-compatible selector
      string](http://api.jquery.com/category/selectors/).
       @private
      @property {String|DOMElement} rootElement
    */
    rootElement: null,

    init() {
      this._super(...arguments);

      this.application._watchInstance(this); // Register this instance in the per-instance registry.
      //
      // Why do we need to register the instance in the first place?
      // Because we need a good way for the root route (a.k.a ApplicationRoute)
      // to notify us when it has created the root-most view. That view is then
      // appended to the rootElement, in the case of apps, to the fixture harness
      // in tests, or rendered to a string in the case of FastBoot.


      this.register('-application-instance:main', this, {
        instantiate: false
      });
    },

    /**
      Overrides the base `EngineInstance._bootSync` method with concerns relevant
      to booting application (instead of engine) instances.
       This method should only contain synchronous boot concerns. Asynchronous
      boot concerns should eventually be moved to the `boot` method, which
      returns a promise.
       Until all boot code has been made asynchronous, we need to continue to
      expose this method for use *internally* in places where we need to boot an
      instance synchronously.
       @private
    */
    _bootSync(options) {
      if (this._booted) {
        return this;
      }

      options = new BootOptions(options);
      this.setupRegistry(options);

      if (options.rootElement) {
        this.rootElement = options.rootElement;
      } else {
        this.rootElement = this.application.rootElement;
      }

      if (options.location) {
        (0, _metal.set)(this.router, 'location', options.location);
      }

      this.application.runInstanceInitializers(this);

      if (options.isInteractive) {
        this.setupEventDispatcher();
      }

      this._booted = true;
      return this;
    },

    setupRegistry(options) {
      this.constructor.setupRegistry(this.__registry__, options);
    },

    router: (0, _metal.computed)(function () {
      return this.lookup('router:main');
    }).readOnly(),

    /**
      This hook is called by the root-most Route (a.k.a. the ApplicationRoute)
      when it has finished creating the root View. By default, we simply take the
      view and append it to the `rootElement` specified on the Application.
       In cases like FastBoot and testing, we can override this hook and implement
      custom behavior, such as serializing to a string and sending over an HTTP
      socket rather than appending to DOM.
       @param view {Ember.View} the root-most view
      @deprecated
      @private
    */
    didCreateRootView(view) {
      view.appendTo(this.rootElement);
    },

    /**
      Tells the router to start routing. The router will ask the location for the
      current URL of the page to determine the initial URL to start routing to.
      To start the app at a specific URL, call `handleURL` instead.
       @private
    */
    startRouting() {
      this.router.startRouting();
      this._didSetupRouter = true;
    },

    /**
      @private
       Sets up the router, initializing the child router and configuring the
      location before routing begins.
       Because setup should only occur once, multiple calls to `setupRouter`
      beyond the first call have no effect.
    */
    setupRouter() {
      if (this._didSetupRouter) {
        return;
      }

      this._didSetupRouter = true;
      this.router.setupRouter();
    },

    /**
      Directs the router to route to a particular URL. This is useful in tests,
      for example, to tell the app to start at a particular URL.
       @param url {String} the URL the router should route to
      @private
    */
    handleURL(url) {
      this.setupRouter();
      return this.router.handleURL(url);
    },

    /**
      @private
    */
    setupEventDispatcher() {
      let dispatcher = this.lookup('event_dispatcher:main');
      let applicationCustomEvents = (0, _metal.get)(this.application, 'customEvents');
      let instanceCustomEvents = (0, _metal.get)(this, 'customEvents');
      let customEvents = (0, _polyfills.assign)({}, applicationCustomEvents, instanceCustomEvents);
      dispatcher.setup(customEvents, this.rootElement);
      return dispatcher;
    },

    /**
      Returns the current URL of the app instance. This is useful when your
      app does not update the browsers URL bar (i.e. it uses the `'none'`
      location adapter).
       @public
      @return {String} the current URL
    */
    getURL() {
      return this.router.url;
    },

    // `instance.visit(url)` should eventually replace `instance.handleURL()`;
    // the test helpers can probably be switched to use this implementation too

    /**
      Navigate the instance to a particular URL. This is useful in tests, for
      example, or to tell the app to start at a particular URL. This method
      returns a promise that resolves with the app instance when the transition
      is complete, or rejects if the transion was aborted due to an error.
       @public
      @param url {String} the destination URL
      @return {Promise<ApplicationInstance>}
    */
    visit(url) {
      this.setupRouter();

      let bootOptions = this.__container__.lookup('-environment:main');

      let router = this.router;

      let handleTransitionResolve = () => {
        if (!bootOptions.options.shouldRender) {
          // No rendering is needed, and routing has completed, simply return.
          return this;
        } else {
          // Ensure that the visit promise resolves when all rendering has completed
          return (0, _glimmer.renderSettled)().then(() => this);
        }
      };

      let handleTransitionReject = error => {
        if (error.error) {
          throw error.error;
        } else if (error.name === 'TransitionAborted' && router._routerMicrolib.activeTransition) {
          return router._routerMicrolib.activeTransition.then(handleTransitionResolve, handleTransitionReject);
        } else if (error.name === 'TransitionAborted') {
          throw new Error(error.message);
        } else {
          throw error;
        }
      };

      let location = (0, _metal.get)(router, 'location'); // Keeps the location adapter's internal URL in-sync

      location.setURL(url); // getURL returns the set url with the rootURL stripped off

      return router.handleURL(location.getURL()).then(handleTransitionResolve, handleTransitionReject);
    },

    willDestroy() {
      this._super(...arguments);

      this.application._unwatchInstance(this);
    }

  });

  ApplicationInstance.reopenClass({
    /**
     @private
     @method setupRegistry
     @param {Registry} registry
     @param {BootOptions} options
    */
    setupRegistry(registry, options = {}) {
      if (!options.toEnvironment) {
        options = new BootOptions(options);
      }

      registry.register('-environment:main', options.toEnvironment(), {
        instantiate: false
      });
      registry.register('service:-document', options.document, {
        instantiate: false
      });

      this._super(registry, options);
    }

  });
  /**
    A list of boot-time configuration options for customizing the behavior of
    an `ApplicationInstance`.
  
    This is an interface class that exists purely to document the available
    options; you do not need to construct it manually. Simply pass a regular
    JavaScript object containing the desired options into methods that require
    one of these options object:
  
    ```javascript
    MyApp.visit("/", { location: "none", rootElement: "#container" });
    ```
  
    Not all combinations of the supported options are valid. See the documentation
    on `Application#visit` for the supported configurations.
  
    Internal, experimental or otherwise unstable flags are marked as private.
  
    @class BootOptions
    @namespace ApplicationInstance
    @public
  */

  class BootOptions {
    constructor(options = {}) {
      /**
        Provide a specific instance of jQuery. This is useful in conjunction with
        the `document` option, as it allows you to use a copy of `jQuery` that is
        appropriately bound to the foreign `document` (e.g. a jsdom).
         This is highly experimental and support very incomplete at the moment.
         @property jQuery
        @type Object
        @default auto-detected
        @private
      */
      this.jQuery = _views.jQuery; // This default is overridable below

      /**
        Interactive mode: whether we need to set up event delegation and invoke
        lifecycle callbacks on Components.
         @property isInteractive
        @type boolean
        @default auto-detected
        @private
      */

      this.isInteractive = environment.hasDOM; // This default is overridable below

      /**
        @property _renderMode
        @type string
        @default false
        @private
      */

      this._renderMode = options._renderMode;
      /**
        Run in a full browser environment.
         When this flag is set to `false`, it will disable most browser-specific
        and interactive features. Specifically:
         * It does not use `jQuery` to append the root view; the `rootElement`
          (either specified as a subsequent option or on the application itself)
          must already be an `Element` in the given `document` (as opposed to a
          string selector).
         * It does not set up an `EventDispatcher`.
         * It does not run any `Component` lifecycle hooks (such as `didInsertElement`).
         * It sets the `location` option to `"none"`. (If you would like to use
          the location adapter specified in the app's router instead, you can also
          specify `{ location: null }` to specifically opt-out.)
         @property isBrowser
        @type boolean
        @default auto-detected
        @public
      */

      if (options.isBrowser !== undefined) {
        this.isBrowser = Boolean(options.isBrowser);
      } else {
        this.isBrowser = environment.hasDOM;
      }

      if (!this.isBrowser) {
        this.jQuery = null;
        this.isInteractive = false;
        this.location = 'none';
      }
      /**
        Disable rendering completely.
         When this flag is set to `false`, it will disable the entire rendering
        pipeline. Essentially, this puts the app into "routing-only" mode. No
        templates will be rendered, and no Components will be created.
         @property shouldRender
        @type boolean
        @default true
        @public
      */


      if (options.shouldRender !== undefined) {
        this.shouldRender = Boolean(options.shouldRender);
      } else {
        this.shouldRender = true;
      }

      if (!this.shouldRender) {
        this.jQuery = null;
        this.isInteractive = false;
      }
      /**
        If present, render into the given `Document` object instead of the
        global `window.document` object.
         In practice, this is only useful in non-browser environment or in
        non-interactive mode, because Ember's `jQuery` dependency is
        implicitly bound to the current document, causing event delegation
        to not work properly when the app is rendered into a foreign
        document object (such as an iframe's `contentDocument`).
         In non-browser mode, this could be a "`Document`-like" object as
        Ember only interact with a small subset of the DOM API in non-
        interactive mode. While the exact requirements have not yet been
        formalized, the `SimpleDOM` library's implementation is known to
        work.
         @property document
        @type Document
        @default the global `document` object
        @public
      */


      if (options.document) {
        this.document = options.document;
      } else {
        this.document = typeof document !== 'undefined' ? document : null;
      }
      /**
        If present, overrides the application's `rootElement` property on
        the instance. This is useful for testing environment, where you
        might want to append the root view to a fixture area.
         In non-browser mode, because Ember does not have access to jQuery,
        this options must be specified as a DOM `Element` object instead of
        a selector string.
         See the documentation on `Application`'s `rootElement` for
        details.
         @property rootElement
        @type String|Element
        @default null
        @public
       */


      if (options.rootElement) {
        this.rootElement = options.rootElement;
      } // Set these options last to give the user a chance to override the
      // defaults from the "combo" options like `isBrowser` (although in
      // practice, the resulting combination is probably invalid)

      /**
        If present, overrides the router's `location` property with this
        value. This is useful for environments where trying to modify the
        URL would be inappropriate.
         @property location
        @type string
        @default null
        @public
      */


      if (options.location !== undefined) {
        this.location = options.location;
      }

      if (options.jQuery !== undefined) {
        this.jQuery = options.jQuery;
      }

      if (options.isInteractive !== undefined) {
        this.isInteractive = Boolean(options.isInteractive);
      }
    }

    toEnvironment() {
      // Do we really want to assign all of this!?
      let env = (0, _polyfills.assign)({}, environment); // For compatibility with existing code

      env.hasDOM = this.isBrowser;
      env.isInteractive = this.isInteractive;
      env._renderMode = this._renderMode;
      env.options = this;
      return env;
    }

  }

  var _default = ApplicationInstance;
  _exports.default = _default;
});
enifed("@ember/application/lib/application", ["exports", "@ember/-internals/utils", "@ember/-internals/environment", "@ember/-internals/browser-environment", "@ember/debug", "@ember/runloop", "@ember/-internals/metal", "@ember/application/lib/lazy_load", "@ember/-internals/runtime", "@ember/-internals/views", "@ember/-internals/routing", "@ember/application/instance", "@ember/engine", "@ember/-internals/container", "@ember/-internals/glimmer", "@ember/deprecated-features"], function (_exports, _utils, _environment, _browserEnvironment, _debug, _runloop, _metal, _lazy_load, _runtime, _views, _routing, _instance, _engine, _container, _glimmer, _deprecatedFeatures) {
  "use strict";

  _exports.default = void 0;

  function _templateObject() {
    const data = _taggedTemplateLiteralLoose(["-bucket-cache:main"]);

    _templateObject = function () {
      return data;
    };

    return data;
  }

  function _taggedTemplateLiteralLoose(strings, raw) { if (!raw) { raw = strings.slice(0); } strings.raw = raw; return strings; }

  let librariesRegistered = false;
  /**
    An instance of `Application` is the starting point for every Ember
    application. It helps to instantiate, initialize and coordinate the many
    objects that make up your app.
  
    Each Ember app has one and only one `Application` object. In fact, the
    very first thing you should do in your application is create the instance:
  
    ```javascript
    import Application from '@ember/application';
  
    window.App = Application.create();
    ```
  
    Typically, the application object is the only global variable. All other
    classes in your app should be properties on the `Application` instance,
    which highlights its first role: a global namespace.
  
    For example, if you define a view class, it might look like this:
  
    ```javascript
    import Application from '@ember/application';
  
    App.MyView = Ember.View.extend();
    ```
  
    By default, calling `Application.create()` will automatically initialize
    your application by calling the `Application.initialize()` method. If
    you need to delay initialization, you can call your app's `deferReadiness()`
    method. When you are ready for your app to be initialized, call its
    `advanceReadiness()` method.
  
    You can define a `ready` method on the `Application` instance, which
    will be run by Ember when the application is initialized.
  
    Because `Application` inherits from `Ember.Namespace`, any classes
    you create will have useful string representations when calling `toString()`.
    See the `Ember.Namespace` documentation for more information.
  
    While you can think of your `Application` as a container that holds the
    other classes in your application, there are several other responsibilities
    going on under-the-hood that you may want to understand.
  
    ### Event Delegation
  
    Ember uses a technique called _event delegation_. This allows the framework
    to set up a global, shared event listener instead of requiring each view to
    do it manually. For example, instead of each view registering its own
    `mousedown` listener on its associated element, Ember sets up a `mousedown`
    listener on the `body`.
  
    If a `mousedown` event occurs, Ember will look at the target of the event and
    start walking up the DOM node tree, finding corresponding views and invoking
    their `mouseDown` method as it goes.
  
    `Application` has a number of default events that it listens for, as
    well as a mapping from lowercase events to camel-cased view method names. For
    example, the `keypress` event causes the `keyPress` method on the view to be
    called, the `dblclick` event causes `doubleClick` to be called, and so on.
  
    If there is a bubbling browser event that Ember does not listen for by
    default, you can specify custom events and their corresponding view method
    names by setting the application's `customEvents` property:
  
    ```javascript
    import Application from '@ember/application';
  
    let App = Application.create({
      customEvents: {
        // add support for the paste event
        paste: 'paste'
      }
    });
    ```
  
    To prevent Ember from setting up a listener for a default event,
    specify the event name with a `null` value in the `customEvents`
    property:
  
    ```javascript
    import Application from '@ember/application';
  
    let App = Application.create({
      customEvents: {
        // prevent listeners for mouseenter/mouseleave events
        mouseenter: null,
        mouseleave: null
      }
    });
    ```
  
    By default, the application sets up these event listeners on the document
    body. However, in cases where you are embedding an Ember application inside
    an existing page, you may want it to set up the listeners on an element
    inside the body.
  
    For example, if only events inside a DOM element with the ID of `ember-app`
    should be delegated, set your application's `rootElement` property:
  
    ```javascript
    import Application from '@ember/application';
  
    let App = Application.create({
      rootElement: '#ember-app'
    });
    ```
  
    The `rootElement` can be either a DOM element or a jQuery-compatible selector
    string. Note that *views appended to the DOM outside the root element will
    not receive events.* If you specify a custom root element, make sure you only
    append views inside it!
  
    To learn more about the events Ember components use, see
  
    [components/handling-events](https://guides.emberjs.com/release/components/handling-events/#toc_event-names).
  
    ### Initializers
  
    Libraries on top of Ember can add initializers, like so:
  
    ```javascript
    import Application from '@ember/application';
  
    Application.initializer({
      name: 'api-adapter',
  
      initialize: function(application) {
        application.register('api-adapter:main', ApiAdapter);
      }
    });
    ```
  
    Initializers provide an opportunity to access the internal registry, which
    organizes the different components of an Ember application. Additionally
    they provide a chance to access the instantiated application. Beyond
    being used for libraries, initializers are also a great way to organize
    dependency injection or setup in your own application.
  
    ### Routing
  
    In addition to creating your application's router, `Application` is
    also responsible for telling the router when to start routing. Transitions
    between routes can be logged with the `LOG_TRANSITIONS` flag, and more
    detailed intra-transition logging can be logged with
    the `LOG_TRANSITIONS_INTERNAL` flag:
  
    ```javascript
    import Application from '@ember/application';
  
    let App = Application.create({
      LOG_TRANSITIONS: true, // basic logging of successful transitions
      LOG_TRANSITIONS_INTERNAL: true // detailed logging of all routing steps
    });
    ```
  
    By default, the router will begin trying to translate the current URL into
    application state once the browser emits the `DOMContentReady` event. If you
    need to defer routing, you can call the application's `deferReadiness()`
    method. Once routing can begin, call the `advanceReadiness()` method.
  
    If there is any setup required before routing begins, you can implement a
    `ready()` method on your app that will be invoked immediately before routing
    begins.
  
    @class Application
    @extends Engine
    @uses RegistryProxyMixin
    @public
  */

  const Application = _engine.default.extend({
    /**
      The root DOM element of the Application. This can be specified as an
      element or a
      [jQuery-compatible selector string](http://api.jquery.com/category/selectors/).
       This is the element that will be passed to the Application's,
      `eventDispatcher`, which sets up the listeners for event delegation. Every
      view in your application should be a child of the element you specify here.
       @property rootElement
      @type DOMElement
      @default 'body'
      @public
    */
    rootElement: 'body',

    /**
      The `Ember.EventDispatcher` responsible for delegating events to this
      application's views.
       The event dispatcher is created by the application at initialization time
      and sets up event listeners on the DOM element described by the
      application's `rootElement` property.
       See the documentation for `Ember.EventDispatcher` for more information.
       @property eventDispatcher
      @type Ember.EventDispatcher
      @default null
      @public
    */
    eventDispatcher: null,

    /**
      The DOM events for which the event dispatcher should listen.
       By default, the application's `Ember.EventDispatcher` listens
      for a set of standard DOM events, such as `mousedown` and
      `keyup`, and delegates them to your application's `Ember.View`
      instances.
       If you would like additional bubbling events to be delegated to your
      views, set your `Application`'s `customEvents` property
      to a hash containing the DOM event name as the key and the
      corresponding view method name as the value. Setting an event to
      a value of `null` will prevent a default event listener from being
      added for that event.
       To add new events to be listened to:
       ```javascript
      import Application from '@ember/application';
       let App = Application.create({
        customEvents: {
          // add support for the paste event
          paste: 'paste'
        }
      });
      ```
       To prevent default events from being listened to:
       ```javascript
      import Application from '@ember/application';
       let App = Application.create({
        customEvents: {
          // remove support for mouseenter / mouseleave events
          mouseenter: null,
          mouseleave: null
        }
      });
      ```
      @property customEvents
      @type Object
      @default null
      @public
    */
    customEvents: null,

    /**
      Whether the application should automatically start routing and render
      templates to the `rootElement` on DOM ready. While default by true,
      other environments such as FastBoot or a testing harness can set this
      property to `false` and control the precise timing and behavior of the boot
      process.
       @property autoboot
      @type Boolean
      @default true
      @private
    */
    autoboot: true,

    /**
      Whether the application should be configured for the legacy "globals mode".
      Under this mode, the Application object serves as a global namespace for all
      classes.
       ```javascript
      import Application from '@ember/application';
      import Component from '@ember/component';
       let App = Application.create({
        ...
      });
       App.Router.reopen({
        location: 'none'
      });
       App.Router.map({
        ...
      });
       App.MyComponent = Component.extend({
        ...
      });
      ```
       This flag also exposes other internal APIs that assumes the existence of
      a special "default instance", like `App.__container__.lookup(...)`.
       This option is currently not configurable, its value is derived from
      the `autoboot` flag – disabling `autoboot` also implies opting-out of
      globals mode support, although they are ultimately orthogonal concerns.
       Some of the global modes features are already deprecated in 1.x. The
      existence of this flag is to untangle the globals mode code paths from
      the autoboot code paths, so that these legacy features can be reviewed
      for deprecation/removal separately.
       Forcing the (autoboot=true, _globalsMode=false) here and running the tests
      would reveal all the places where we are still relying on these legacy
      behavior internally (mostly just tests).
       @property _globalsMode
      @type Boolean
      @default true
      @private
    */
    _globalsMode: true,

    /**
      An array of application instances created by `buildInstance()`. Used
      internally to ensure that all instances get destroyed.
       @property _applicationInstances
      @type Array
      @default null
      @private
    */
    _applicationInstances: null,

    init() {
      // eslint-disable-line no-unused-vars
      this._super(...arguments);

      if (!this.$) {
        this.$ = _views.jQuery;
      }

      registerLibraries();

      if (false
      /* DEBUG */
      ) {
          if (_environment.ENV.LOG_VERSION) {
            // we only need to see this once per Application#init
            _environment.ENV.LOG_VERSION = false;

            _metal.libraries.logVersions();
          }
        } // Start off the number of deferrals at 1. This will be decremented by
      // the Application's own `boot` method.


      this._readinessDeferrals = 1;
      this._booted = false;
      this._applicationInstances = new Set();
      this.autoboot = this._globalsMode = Boolean(this.autoboot);

      if (this._globalsMode) {
        this._prepareForGlobalsMode();
      }

      if (this.autoboot) {
        this.waitForDOMReady();
      }
    },

    /**
      Create an ApplicationInstance for this application.
       @public
      @method buildInstance
      @return {ApplicationInstance} the application instance
    */
    buildInstance(options = {}) {
      options.base = this;
      options.application = this;
      return _instance.default.create(options);
    },

    /**
      Start tracking an ApplicationInstance for this application.
      Used when the ApplicationInstance is created.
       @private
      @method _watchInstance
    */
    _watchInstance(instance) {
      this._applicationInstances.add(instance);
    },

    /**
      Stop tracking an ApplicationInstance for this application.
      Used when the ApplicationInstance is about to be destroyed.
       @private
      @method _unwatchInstance
    */
    _unwatchInstance(instance) {
      return this._applicationInstances.delete(instance);
    },

    /**
      Enable the legacy globals mode by allowing this application to act
      as a global namespace. See the docs on the `_globalsMode` property
      for details.
       Most of these features are already deprecated in 1.x, so we can
      stop using them internally and try to remove them.
       @private
      @method _prepareForGlobalsMode
    */
    _prepareForGlobalsMode() {
      // Create subclass of Router for this Application instance.
      // This is to ensure that someone reopening `App.Router` does not
      // tamper with the default `Router`.
      this.Router = (this.Router || _routing.Router).extend();

      this._buildDeprecatedInstance();
    },

    /*
      Build the deprecated instance for legacy globals mode support.
      Called when creating and resetting the application.
       This is orthogonal to autoboot: the deprecated instance needs to
      be created at Application construction (not boot) time to expose
      App.__container__. If autoboot sees that this instance exists,
      it will continue booting it to avoid doing unncessary work (as
      opposed to building a new instance at boot time), but they are
      otherwise unrelated.
       @private
      @method _buildDeprecatedInstance
    */
    _buildDeprecatedInstance() {
      // Build a default instance
      let instance = this.buildInstance(); // Legacy support for App.__container__ and other global methods
      // on App that rely on a single, default instance.

      this.__deprecatedInstance__ = instance;
      this.__container__ = instance.__container__;
    },

    /**
      Automatically kick-off the boot process for the application once the
      DOM has become ready.
       The initialization itself is scheduled on the actions queue which
      ensures that code-loading finishes before booting.
       If you are asynchronously loading code, you should call `deferReadiness()`
      to defer booting, and then call `advanceReadiness()` once all of your code
      has finished loading.
       @private
      @method waitForDOMReady
    */
    waitForDOMReady() {
      if (!this.$ || this.$.isReady) {
        (0, _runloop.schedule)('actions', this, 'domReady');
      } else {
        this.$().ready((0, _runloop.bind)(this, 'domReady'));
      }
    },

    /**
      This is the autoboot flow:
       1. Boot the app by calling `this.boot()`
      2. Create an instance (or use the `__deprecatedInstance__` in globals mode)
      3. Boot the instance by calling `instance.boot()`
      4. Invoke the `App.ready()` callback
      5. Kick-off routing on the instance
       Ideally, this is all we would need to do:
       ```javascript
      _autoBoot() {
        this.boot().then(() => {
          let instance = (this._globalsMode) ? this.__deprecatedInstance__ : this.buildInstance();
          return instance.boot();
        }).then((instance) => {
          App.ready();
          instance.startRouting();
        });
      }
      ```
       Unfortunately, we cannot actually write this because we need to participate
      in the "synchronous" boot process. While the code above would work fine on
      the initial boot (i.e. DOM ready), when `App.reset()` is called, we need to
      boot a new instance synchronously (see the documentation on `_bootSync()`
      for details).
       Because of this restriction, the actual logic of this method is located
      inside `didBecomeReady()`.
       @private
      @method domReady
    */
    domReady() {
      if (this.isDestroyed) {
        return;
      }

      this._bootSync(); // Continues to `didBecomeReady`

    },

    /**
      Use this to defer readiness until some condition is true.
       Example:
       ```javascript
      import Application from '@ember/application';
       let App = Application.create();
       App.deferReadiness();
       // $ is a reference to the jQuery object/function
      import $ from 'jquery;
       $.getJSON('/auth-token', function(token) {
        App.token = token;
        App.advanceReadiness();
      });
      ```
       This allows you to perform asynchronous setup logic and defer
      booting your application until the setup has finished.
       However, if the setup requires a loading UI, it might be better
      to use the router for this purpose.
       @method deferReadiness
      @public
    */
    deferReadiness() {
      false && !(this instanceof Application) && (0, _debug.assert)('You must call deferReadiness on an instance of Application', this instanceof Application);
      false && !(this._readinessDeferrals > 0) && (0, _debug.assert)('You cannot defer readiness since the `ready()` hook has already been called.', this._readinessDeferrals > 0);
      this._readinessDeferrals++;
    },

    /**
      Call `advanceReadiness` after any asynchronous setup logic has completed.
      Each call to `deferReadiness` must be matched by a call to `advanceReadiness`
      or the application will never become ready and routing will not begin.
       @method advanceReadiness
      @see {Application#deferReadiness}
      @public
    */
    advanceReadiness() {
      false && !(this instanceof Application) && (0, _debug.assert)('You must call advanceReadiness on an instance of Application', this instanceof Application);
      this._readinessDeferrals--;

      if (this._readinessDeferrals === 0) {
        (0, _runloop.once)(this, this.didBecomeReady);
      }
    },

    /**
      Initialize the application and return a promise that resolves with the `Application`
      object when the boot process is complete.
       Run any application initializers and run the application load hook. These hooks may
      choose to defer readiness. For example, an authentication hook might want to defer
      readiness until the auth token has been retrieved.
       By default, this method is called automatically on "DOM ready"; however, if autoboot
      is disabled, this is automatically called when the first application instance is
      created via `visit`.
       @public
      @method boot
      @return {Promise<Application,Error>}
    */
    boot() {
      if (this._bootPromise) {
        return this._bootPromise;
      }

      try {
        this._bootSync();
      } catch (_) {// Ignore the error: in the asynchronous boot path, the error is already reflected
        // in the promise rejection
      }

      return this._bootPromise;
    },

    /**
      Unfortunately, a lot of existing code assumes the booting process is
      "synchronous". Specifically, a lot of tests assumes the last call to
      `app.advanceReadiness()` or `app.reset()` will result in the app being
      fully-booted when the current runloop completes.
       We would like new code (like the `visit` API) to stop making this assumption,
      so we created the asynchronous version above that returns a promise. But until
      we have migrated all the code, we would have to expose this method for use
      *internally* in places where we need to boot an app "synchronously".
       @private
    */
    _bootSync() {
      if (this._booted) {
        return;
      } // Even though this returns synchronously, we still need to make sure the
      // boot promise exists for book-keeping purposes: if anything went wrong in
      // the boot process, we need to store the error as a rejection on the boot
      // promise so that a future caller of `boot()` can tell what failed.


      let defer = this._bootResolver = _runtime.RSVP.defer();

      this._bootPromise = defer.promise;

      try {
        this.runInitializers();
        (0, _lazy_load.runLoadHooks)('application', this);
        this.advanceReadiness(); // Continues to `didBecomeReady`
      } catch (error) {
        // For the asynchronous boot path
        defer.reject(error); // For the synchronous boot path

        throw error;
      }
    },

    /**
      Reset the application. This is typically used only in tests. It cleans up
      the application in the following order:
       1. Deactivate existing routes
      2. Destroy all objects in the container
      3. Create a new application container
      4. Re-route to the existing url
       Typical Example:
       ```javascript
      import Application from '@ember/application';
      let App;
       run(function() {
        App = Application.create();
      });
       module('acceptance test', {
        setup: function() {
          App.reset();
        }
      });
       test('first test', function() {
        // App is freshly reset
      });
       test('second test', function() {
        // App is again freshly reset
      });
      ```
       Advanced Example:
       Occasionally you may want to prevent the app from initializing during
      setup. This could enable extra configuration, or enable asserting prior
      to the app becoming ready.
       ```javascript
      import Application from '@ember/application';
      let App;
       run(function() {
        App = Application.create();
      });
       module('acceptance test', {
        setup: function() {
          run(function() {
            App.reset();
            App.deferReadiness();
          });
        }
      });
       test('first test', function() {
        ok(true, 'something before app is initialized');
         run(function() {
          App.advanceReadiness();
        });
         ok(true, 'something after app is initialized');
      });
      ```
       @method reset
      @public
    */
    reset() {
      false && !(this._globalsMode && this.autoboot) && (0, _debug.assert)("Calling reset() on instances of `Application` is not\n            supported when globals mode is disabled; call `visit()` to\n            create new `ApplicationInstance`s and dispose them\n            via their `destroy()` method instead.", this._globalsMode && this.autoboot);
      let instance = this.__deprecatedInstance__;
      this._readinessDeferrals = 1;
      this._bootPromise = null;
      this._bootResolver = null;
      this._booted = false;

      function handleReset() {
        (0, _runloop.run)(instance, 'destroy');

        this._buildDeprecatedInstance();

        (0, _runloop.schedule)('actions', this, '_bootSync');
      }

      (0, _runloop.join)(this, handleReset);
    },

    /**
      @private
      @method didBecomeReady
    */
    didBecomeReady() {
      try {
        // TODO: Is this still needed for _globalsMode = false?
        if (!(0, _debug.isTesting)()) {
          // Eagerly name all classes that are already loaded
          (0, _metal.processAllNamespaces)();
          (0, _metal.setNamespaceSearchDisabled)(true);
        } // See documentation on `_autoboot()` for details


        if (this.autoboot) {
          let instance;

          if (this._globalsMode) {
            // If we already have the __deprecatedInstance__ lying around, boot it to
            // avoid unnecessary work
            instance = this.__deprecatedInstance__;
          } else {
            // Otherwise, build an instance and boot it. This is currently unreachable,
            // because we forced _globalsMode to === autoboot; but having this branch
            // allows us to locally toggle that flag for weeding out legacy globals mode
            // dependencies independently
            instance = this.buildInstance();
          }

          instance._bootSync(); // TODO: App.ready() is not called when autoboot is disabled, is this correct?


          this.ready();
          instance.startRouting();
        } // For the asynchronous boot path


        this._bootResolver.resolve(this); // For the synchronous boot path


        this._booted = true;
      } catch (error) {
        // For the asynchronous boot path
        this._bootResolver.reject(error); // For the synchronous boot path


        throw error;
      }
    },

    /**
      Called when the Application has become ready, immediately before routing
      begins. The call will be delayed until the DOM has become ready.
       @event ready
      @public
    */
    ready() {
      return this;
    },

    // This method must be moved to the application instance object
    willDestroy() {
      this._super(...arguments);

      (0, _metal.setNamespaceSearchDisabled)(false);
      this._booted = false;
      this._bootPromise = null;
      this._bootResolver = null;

      if (_lazy_load._loaded.application === this) {
        _lazy_load._loaded.application = undefined;
      }

      if (this._applicationInstances.size) {
        this._applicationInstances.forEach(i => i.destroy());

        this._applicationInstances.clear();
      }
    },

    /**
      Boot a new instance of `ApplicationInstance` for the current
      application and navigate it to the given `url`. Returns a `Promise` that
      resolves with the instance when the initial routing and rendering is
      complete, or rejects with any error that occurred during the boot process.
       When `autoboot` is disabled, calling `visit` would first cause the
      application to boot, which runs the application initializers.
       This method also takes a hash of boot-time configuration options for
      customizing the instance's behavior. See the documentation on
      `ApplicationInstance.BootOptions` for details.
       `ApplicationInstance.BootOptions` is an interface class that exists
      purely to document the available options; you do not need to construct it
      manually. Simply pass a regular JavaScript object containing of the
      desired options:
       ```javascript
      MyApp.visit("/", { location: "none", rootElement: "#container" });
      ```
       ### Supported Scenarios
       While the `BootOptions` class exposes a large number of knobs, not all
      combinations of them are valid; certain incompatible combinations might
      result in unexpected behavior.
       For example, booting the instance in the full browser environment
      while specifying a foreign `document` object (e.g. `{ isBrowser: true,
      document: iframe.contentDocument }`) does not work correctly today,
      largely due to Ember's jQuery dependency.
       Currently, there are three officially supported scenarios/configurations.
      Usages outside of these scenarios are not guaranteed to work, but please
      feel free to file bug reports documenting your experience and any issues
      you encountered to help expand support.
       #### Browser Applications (Manual Boot)
       The setup is largely similar to how Ember works out-of-the-box. Normally,
      Ember will boot a default instance for your Application on "DOM ready".
      However, you can customize this behavior by disabling `autoboot`.
       For example, this allows you to render a miniture demo of your application
      into a specific area on your marketing website:
       ```javascript
      import MyApp from 'my-app';
       $(function() {
        let App = MyApp.create({ autoboot: false });
         let options = {
          // Override the router's location adapter to prevent it from updating
          // the URL in the address bar
          location: 'none',
           // Override the default `rootElement` on the app to render into a
          // specific `div` on the page
          rootElement: '#demo'
        };
         // Start the app at the special demo URL
        App.visit('/demo', options);
      });
      ```
       Or perhaps you might want to boot two instances of your app on the same
      page for a split-screen multiplayer experience:
       ```javascript
      import MyApp from 'my-app';
       $(function() {
        let App = MyApp.create({ autoboot: false });
         let sessionId = MyApp.generateSessionID();
         let player1 = App.visit(`/matches/join?name=Player+1&session=${sessionId}`, { rootElement: '#left', location: 'none' });
        let player2 = App.visit(`/matches/join?name=Player+2&session=${sessionId}`, { rootElement: '#right', location: 'none' });
         Promise.all([player1, player2]).then(() => {
          // Both apps have completed the initial render
          $('#loading').fadeOut();
        });
      });
      ```
       Do note that each app instance maintains their own registry/container, so
      they will run in complete isolation by default.
       #### Server-Side Rendering (also known as FastBoot)
       This setup allows you to run your Ember app in a server environment using
      Node.js and render its content into static HTML for SEO purposes.
       ```javascript
      const HTMLSerializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);
       function renderURL(url) {
        let dom = new SimpleDOM.Document();
        let rootElement = dom.body;
        let options = { isBrowser: false, document: dom, rootElement: rootElement };
         return MyApp.visit(options).then(instance => {
          try {
            return HTMLSerializer.serialize(rootElement.firstChild);
          } finally {
            instance.destroy();
          }
        });
      }
      ```
       In this scenario, because Ember does not have access to a global `document`
      object in the Node.js environment, you must provide one explicitly. In practice,
      in the non-browser environment, the stand-in `document` object only needs to
      implement a limited subset of the full DOM API. The `SimpleDOM` library is known
      to work.
       Since there is no access to jQuery in the non-browser environment, you must also
      specify a DOM `Element` object in the same `document` for the `rootElement` option
      (as opposed to a selector string like `"body"`).
       See the documentation on the `isBrowser`, `document` and `rootElement` properties
      on `ApplicationInstance.BootOptions` for details.
       #### Server-Side Resource Discovery
       This setup allows you to run the routing layer of your Ember app in a server
      environment using Node.js and completely disable rendering. This allows you
      to simulate and discover the resources (i.e. AJAX requests) needed to fulfill
      a given request and eagerly "push" these resources to the client.
       ```app/initializers/network-service.js
      import BrowserNetworkService from 'app/services/network/browser';
      import NodeNetworkService from 'app/services/network/node';
       // Inject a (hypothetical) service for abstracting all AJAX calls and use
      // the appropriate implementation on the client/server. This also allows the
      // server to log all the AJAX calls made during a particular request and use
      // that for resource-discovery purpose.
       export function initialize(application) {
        if (window) { // browser
          application.register('service:network', BrowserNetworkService);
        } else { // node
          application.register('service:network', NodeNetworkService);
        }
         application.inject('route', 'network', 'service:network');
      };
       export default {
        name: 'network-service',
        initialize: initialize
      };
      ```
       ```app/routes/post.js
      import Route from '@ember/routing/route';
       // An example of how the (hypothetical) service is used in routes.
       export default Route.extend({
        model(params) {
          return this.network.fetch(`/api/posts/${params.post_id}.json`);
        },
         afterModel(post) {
          if (post.isExternalContent) {
            return this.network.fetch(`/api/external/?url=${post.externalURL}`);
          } else {
            return post;
          }
        }
      });
      ```
       ```javascript
      // Finally, put all the pieces together
       function discoverResourcesFor(url) {
        return MyApp.visit(url, { isBrowser: false, shouldRender: false }).then(instance => {
          let networkService = instance.lookup('service:network');
          return networkService.requests; // => { "/api/posts/123.json": "..." }
        });
      }
      ```
       @public
      @method visit
      @param url {String} The initial URL to navigate to
      @param options {ApplicationInstance.BootOptions}
      @return {Promise<ApplicationInstance, Error>}
    */
    visit(url, options) {
      return this.boot().then(() => {
        let instance = this.buildInstance();
        return instance.boot(options).then(() => instance.visit(url)).catch(error => {
          (0, _runloop.run)(instance, 'destroy');
          throw error;
        });
      });
    }

  });

  Application.reopenClass({
    /**
      This creates a registry with the default Ember naming conventions.
       It also configures the registry:
       * registered views are created every time they are looked up (they are
        not singletons)
      * registered templates are not factories; the registered value is
        returned directly.
      * the router receives the application as its `namespace` property
      * all controllers receive the router as their `target` and `controllers`
        properties
      * all controllers receive the application as their `namespace` property
      * the application view receives the application controller as its
        `controller` property
      * the application view receives the application template as its
        `defaultTemplate` property
       @method buildRegistry
      @static
      @param {Application} namespace the application for which to
        build the registry
      @return {Ember.Registry} the built registry
      @private
    */
    buildRegistry() {
      // eslint-disable-line no-unused-vars
      let registry = this._super(...arguments);

      commonSetupRegistry(registry);
      (0, _glimmer.setupApplicationRegistry)(registry);
      return registry;
    }

  });

  function commonSetupRegistry(registry) {
    registry.register('router:main', _routing.Router.extend());
    registry.register('-view-registry:main', {
      create() {
        return (0, _utils.dictionary)(null);
      }

    });
    registry.register('route:basic', _routing.Route);
    registry.register('event_dispatcher:main', _views.EventDispatcher);
    registry.injection('router:main', 'namespace', 'application:main');
    registry.register('location:auto', _routing.AutoLocation);
    registry.register('location:hash', _routing.HashLocation);
    registry.register('location:history', _routing.HistoryLocation);
    registry.register('location:none', _routing.NoneLocation);
    registry.register((0, _container.privatize)(_templateObject()), {
      create() {
        return new _routing.BucketCache();
      }

    });
    registry.register('service:router', _routing.RouterService);
    registry.injection('service:router', '_router', 'router:main');
  }

  function registerLibraries() {
    if (!librariesRegistered) {
      librariesRegistered = true;

      if (_deprecatedFeatures.JQUERY_INTEGRATION && _browserEnvironment.hasDOM && !_views.jQueryDisabled) {
        _metal.libraries.registerCoreLibrary('jQuery', (0, _views.jQuery)().jquery);
      }
    }
  }

  var _default = Application;
  _exports.default = _default;
});
enifed("@ember/application/lib/lazy_load", ["exports", "@ember/-internals/environment", "@ember/-internals/browser-environment"], function (_exports, _environment, _browserEnvironment) {
  "use strict";

  _exports.onLoad = onLoad;
  _exports.runLoadHooks = runLoadHooks;
  _exports._loaded = void 0;

  /*globals CustomEvent */

  /**
    @module @ember/application
  */
  const loadHooks = _environment.ENV.EMBER_LOAD_HOOKS || {};
  const loaded = {};
  let _loaded = loaded;
  /**
    Detects when a specific package of Ember (e.g. 'Application')
    has fully loaded and is available for extension.
  
    The provided `callback` will be called with the `name` passed
    resolved from a string into the object:
  
    ``` javascript
    import { onLoad } from '@ember/application';
  
    onLoad('Ember.Application' function(hbars) {
      hbars.registerHelper(...);
    });
    ```
  
    @method onLoad
    @static
    @for @ember/application
    @param name {String} name of hook
    @param callback {Function} callback to be called
    @private
  */

  _exports._loaded = _loaded;

  function onLoad(name, callback) {
    let object = loaded[name];
    loadHooks[name] = loadHooks[name] || [];
    loadHooks[name].push(callback);

    if (object) {
      callback(object);
    }
  }
  /**
    Called when an Ember.js package (e.g Application) has finished
    loading. Triggers any callbacks registered for this event.
  
    @method runLoadHooks
    @static
    @for @ember/application
    @param name {String} name of hook
    @param object {Object} object to pass to callbacks
    @private
  */


  function runLoadHooks(name, object) {
    loaded[name] = object;

    if (_browserEnvironment.window && typeof CustomEvent === 'function') {
      let event = new CustomEvent(name, {
        detail: object,
        name
      });

      _browserEnvironment.window.dispatchEvent(event);
    }

    if (loadHooks[name]) {
      loadHooks[name].forEach(callback => callback(object));
    }
  }
});
enifed("@ember/application/lib/validate-type", ["exports", "@ember/debug"], function (_exports, _debug) {
  "use strict";

  _exports.default = validateType;
  const VALIDATED_TYPES = {
    route: ['assert', 'isRouteFactory', 'Ember.Route'],
    component: ['deprecate', 'isComponentFactory', 'Ember.Component'],
    view: ['deprecate', 'isViewFactory', 'Ember.View'],
    service: ['deprecate', 'isServiceFactory', 'Ember.Service']
  };

  function validateType(resolvedType, parsedName) {
    let validationAttributes = VALIDATED_TYPES[parsedName.type];

    if (!validationAttributes) {
      return;
    }

    let [, factoryFlag, expectedType] = validationAttributes;
    false && !Boolean(resolvedType[factoryFlag]) && (0, _debug.assert)("Expected " + parsedName.fullName + " to resolve to an " + expectedType + " but " + ("instead it was " + resolvedType + "."), Boolean(resolvedType[factoryFlag]));
  }
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
