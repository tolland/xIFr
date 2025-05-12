"use strict";
// src/models/types.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.SDModelType = void 0;
var SDModelType;
(function (SDModelType) {
    SDModelType["Checkpoint"] = "checkpoint";
    SDModelType["Lora"] = "lora";
    SDModelType["LyCORIS"] = "lycoris";
    SDModelType["TextualInversion"] = "textual_inversion";
    SDModelType["VAE"] = "vae";
    SDModelType["Hypernetwork"] = "hypernetwork";
})(SDModelType || (exports.SDModelType = SDModelType = {}));
