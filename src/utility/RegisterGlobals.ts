// Register utility functions as globals
import * as DomUtils from "./Dom";
import * as EnvUtils from "./Environment";

// Register DOM utilities
window.requireElement = DomUtils.requireElement;
window.optionalElement = DomUtils.optionalElement;
window.queryElements = DomUtils.queryElements;

// Register Environment utilities
window.parseEnum = EnvUtils.parseEnum;
