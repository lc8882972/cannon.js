export interface Event {
  type: string;
  target?: EventTarget;
}

/**
 * Base class for objects that dispatches events.
 * @class EventTarget
 * @constructor
 */
class EventTarget {
  _listeners: { [key: string]: any[] };
  constructor() {
    this._listeners = {};
  }
  /**
   * Add an event listener
   * @method addEventListener
   * @param  {String} type
   * @param  {Function} listener
   * @return {EventTarget} The self object, for chainability.
   */
  addEventListener(type: string, listener: any): EventTarget {
    if (this._listeners === undefined) {
      this._listeners = {};
    }
    var listeners = this._listeners;
    if (listeners[type] === undefined) {
      listeners[type] = [];
    }
    if (listeners[type].indexOf(listener) === -1) {
      listeners[type].push(listener);
    }
    return this;
  }

  /**
   * Check if an event listener is added
   * @method hasEventListener
   * @param  {String} type
   * @param  {Function} listener
   * @return {Boolean}
   */
  hasEventListener(type: string, listener: () => void): boolean {
    if (this._listeners === undefined) {
      return false;
    }
    var listeners = this._listeners;
    if (
      listeners[type] !== undefined &&
      listeners[type].indexOf(listener) !== -1
    ) {
      return true;
    }
    return false;
  }

  /**
   * Check if any event listener of the given type is added
   * @method hasAnyEventListener
   * @param  {String} type
   * @return {Boolean}
   */
  hasAnyEventListener(type: string): boolean {
    if (this._listeners === undefined) {
      return false;
    }
    var listeners = this._listeners;
    return listeners[type] !== undefined;
  }

  /**
   * Remove an event listener
   * @method removeEventListener
   * @param  {String} type
   * @param  {Function} listener
   * @return {EventTarget} The self object, for chainability.
   */
  removeEventListener(type: string, listener: () => void): EventTarget {
    if (this._listeners === undefined) {
      return this;
    }
    var listeners = this._listeners;
    if (listeners[type] === undefined) {
      return this;
    }
    var index = listeners[type].indexOf(listener);
    if (index !== -1) {
      listeners[type].splice(index, 1);
    }
    return this;
  }

  /**
   * Emit an event.
   * @method dispatchEvent
   * @param  {Object} event
   * @param  {String} event.type
   * @return {EventTarget} The self object, for chainability.
   */
  dispatchEvent(event: Event): EventTarget {
    if (this._listeners === undefined) {
      return this;
    }
    var listeners = this._listeners;
    var listenerArray = listeners[event.type];
    if (listenerArray !== undefined) {
      event.target = this;
      for (var i = 0, l = listenerArray.length; i < l; i++) {
        listenerArray[i].call(this, event);
      }
    }
    return this;
  }
}

export default EventTarget;
