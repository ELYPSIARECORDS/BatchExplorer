import * as path from "path";
process.env.NODE_PATH = path.join(__dirname, "../../../src");
// tslint:disable-next-line:no-var-requires
require("module").Module._initPaths();

// Setup chai
import * as chai from "chai";
import * as sinonChai from "sinon-chai";
chai.use(sinonChai);
// global.expect = chai.expect;

import { initLogger } from "client/logger";
initLogger();

import "reflect-metadata";

import "@batch-flask/extensions";
