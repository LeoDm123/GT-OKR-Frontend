import {
  require_toString
} from "./chunk-OFHNIFES.js";
import "./chunk-7R3GKD4T.js";
import "./chunk-2DDIR72N.js";
import {
  __commonJS
} from "./chunk-PLDDJCW6.js";

// node_modules/lodash/uniqueId.js
var require_uniqueId = __commonJS({
  "node_modules/lodash/uniqueId.js"(exports, module) {
    var toString = require_toString();
    var idCounter = 0;
    function uniqueId(prefix) {
      var id = ++idCounter;
      return toString(prefix) + id;
    }
    module.exports = uniqueId;
  }
});
export default require_uniqueId();
//# sourceMappingURL=lodash_uniqueId.js.map
