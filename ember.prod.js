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
requireModule('ember')

}());
//# sourceMappingURL=ember.prod.map
