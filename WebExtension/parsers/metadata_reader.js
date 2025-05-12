"use strict";

/*
This is a cut and paste from
https://github.com/StigNygaard/xIFr/
Please see the attributions file for more information.
 */

globalThis.browser ??= chrome;

function MetaDataReader() {
    // data formats
    this.FMT_BYTE       = 1;

    /*
    Attempt to convert the value to a string or structured type
    that makes it easier to work with later when some combination of keys/vals
    might be required to distinguish between different types of metadata.
     */
    this.resolve = function (tags) {
        for (name in tags) {
            if (tags[name].value instanceof Array) {
                tags[name].value = tags[name].value.join(', ');
            }
        }
    }

    this.reader = function (key, data) {



        return data[offset];
    };

}

globalThis.metaDataReader = new MetaDataReader();
