"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var config_1 = require("@utils/config");
var app_1 = require("app");
var port = config_1.PORT !== null && config_1.PORT !== void 0 ? config_1.PORT : '3001';
app_1.default.listen(port, function () {
    console.log("[server]: Server is running at http://localhost:".concat(port));
});
