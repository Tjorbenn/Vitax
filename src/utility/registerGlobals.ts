/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */
// Register utility functions as globals
import * as DomUtils from "./Dom";
import * as EnvUtils from "./Environment";

// Register DOM utilities
(window as any).requireElement = DomUtils.requireElement;
(window as any).optionalElement = DomUtils.optionalElement;
(window as any).queryElements = DomUtils.queryElements;

// Register Environment utilities
(window as any).parseEnum = EnvUtils.parseEnum;
