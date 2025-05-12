"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SDModelParser = exports.SDModelType = void 0;
// src/models/parser.ts
var types_1 = require("./types");
Object.defineProperty(exports, "SDModelType", { enumerable: true, get: function () { return types_1.SDModelType; } });
var SDModelParser = /** @class */ (function () {
    function SDModelParser() {
    }
    SDModelParser.parseFromMetadata = function (metadata) {
        // Implementation of parsing logic here
        // This would convert raw metadata into your strongly typed model
        var modelInfo = {
            model_name: metadata.model_name || '',
            model_hash: metadata.model_hash || '',
            model_type: metadata.model_type || SDModelType.Checkpoint,
            metadata: {
                fps: metadata.fps,
                size: metadata.size,
                bsd_tags: metadata.bsd_tags || [],
                civitai_nsfw: metadata.civitai_nsfw || false,
                trigger_words: metadata.trigger_words || [],
                merged_from: metadata.merged_from || [],
                base_model: metadata.base_model,
                training_steps: metadata.training_steps,
                training_epochs: metadata.training_epochs,
                trained_words: metadata.trained_words || [],
                clip_skip: metadata.clip_skip,
                resolution: metadata.resolution,
            },
        };
        return modelInfo;
    };
    return SDModelParser;
}());
exports.SDModelParser = SDModelParser;
