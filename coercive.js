if (typeof module === "object" && module.exports) {
  var d3 = require("d3");
}

(function(coerce) {

  coerce.version = "0.1.4";

  coerce.object = function() {
    var ops = [],
        coercion = function(d, i) {
          var context = this;
          ops.forEach(function(op) {
            op.call(context, d, i);
          });
          return d;
        };

    coercion.key = function(key, op) {
      op = coerce.op(op);
      ops.push(function(d, i) {
        // TODO: use properly?
        if (d.hasOwnProperty(key)) {
          d[key] = op.call(d, d[key], key, i);
        }
      });
      return coercion;
    };

    coercion.keys = function(keys) {
      for (var key in keys) {
        coercion.key(key, keys[key]);
      }
      return coercion;
    };

    coercion.map = function(d, i) {
      var copy = coercion.extend({}, d);
      coercion(copy, i);
      return copy;
    };

    return coercion;
  };

  coerce.coercer = function(parse, reject) {
    return function(def) {
      return (typeof reject === "function" && typeof def !== "undefined")
        ? function(val) {
          var parsed = parse(val);
          return reject(parsed) ? def : parsed;
        }
        : parse;
    };
  };

  coerce.op = function(op) {
    if (typeof op === "function") {
      return op;
    }
    var args = [].slice.call(arguments, 1);
    switch (typeof op) {
      case "string":
        if (!(op in this)) {
          throw "Unknown coercion: " + op;
        }
        return coerce[op].apply(null, args);
      case "object":
        return coerce.object().keys(op);
    }
    throw "Invalid coercion: " + op;
  };

  coerce.int = coerce.coercer(parseInt, isNaN);
  coerce.float = coerce.coercer(parseFloat, isNaN);
  coerce.number = coerce.coercer(function(s) {
    if (typeof s === "number") return s;
    return String(s).length ? +s : NaN;
  }, isNaN);

  coerce.money = coerce.coercer(function(s) {
    return +(String(s)
      .replace(/^[^\d]+/, "")
      .replace(/,/g, ""));
  }, isNaN);

  coerce.string = function(def) {
    return String;
  };

  coerce.date = function(format, def) {
    var parse;
    if (Array.isArray(format)) {
      var formats = format.map(d3.time.format),
          len = formats.length;
      parse = function(str) {
        for (var i = 0; i < len; i++) {
          var parsed = formats[i].parse(str);
          if (parsed) return parsed;
        }
        return null;
      };
    } else {
      parse = d3.time.format(format).parse;
    }
    var reject = function(d) { return d === null; };
    return coerce.coercer(function(str) {
      return str ? parse(str) : null;
    }, reject)(def);
  };

  // coerce a string to a boolean
  coerce.boolean = function(def) {
    return function(val) {
      if (typeof val === "boolean") {
        return val;
      }
      switch (String(val).toLowerCase()) {
        case "1":
        case "t":
        case "yes":
        case "true":
          return true;
        case "0":
        case "f":
        case "no":
        case "false":
          return false;
      }
      return def;
    };
  };

  // coerce a string to JSON (parsed with JSON.parse)
  // NOTE that this includes JSON literals, so numeric strings will be turned
  // into numbers, "true" and "false" into booleans, "null" into null, etc.
  //
  // Remember: decimal JSON numbers must be prefixed with a zero! 
  coerce.json = function(def) {
    return function(str) {
      try {
        return JSON.parse(str);
      } catch (e) {
      }
      return def;
    };
  };

  coerce.extend = function(obj, ext) {
    [].slice(arguments, 1).forEach(function(e) {
      if (!e) return;
      for (var key in e) {
        if (e.hasOwnProperty(key)) {
          obj[key] = e[key];
        }
      }
    });
    return obj;
  };

})(typeof module === "object" ? module.exports : this.coerce = {});
