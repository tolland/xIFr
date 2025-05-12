"use strict";

/*
This is a cut and paste from
https://github.com/StigNygaard/xIFr/
Please see the attributions file for more information.
 */

globalThis.browser ??= chrome;

function Decoders() {
    // data formats
    this.FMT_BYTE       = 1;
    this.FMT_STRING     = 2;
    this.FMT_USHORT     = 3;
    this.FMT_ULONG      = 4;
    this.FMT_URATIONAL  = 5;
    this.FMT_SBYTE      = 6;
    this.FMT_UNDEFINED  = 7;
    this.FMT_SSHORT     = 8;
    this.FMT_SLONG      = 9;
    this.FMT_SRATIONAL  = 10;
    this.FMT_SINGLE     = 11;
    this.FMT_DOUBLE     = 12;

    this.ConvertAnyFormat = function (data, format, offset, components, numbytes, swapbytes, charWidth) {
        // centralised check if the data lays within the data array
        if (offset + numbytes > data.length) {
            console.error("xIFr: Data outside array.");
            // throw "Data outside array.";
            return;
        }

        var value = 0;

        switch (format) {
            case this.FMT_STRING:
                // try decoding strings as UTF-8, if it fails, handle them 1:1.
                try {
                    if (charWidth === 1) // don’t try handling Unicode strings as UTF-8
                        value = utf8BytesToString(data, offset, numbytes);
                    else
                        value = fxifUtils.bytesToString(data, offset, numbytes, swapbytes, charWidth);
                } catch (e) {
                    context.debug("catch!" + e);
                    value = fxifUtils.bytesToStringWithNull(data, offset, numbytes);
                }
                // strip trailing whitespace
                value = value.replace(/\s+$/, '');
                break;

            case this.FMT_UNDEFINED: // treat as string
                value = fxifUtils.bytesToString(data, offset, numbytes, swapbytes, charWidth);
                // strip trailing whitespace
                value = value.replace(/\s+$/, '');
                break;

            case this.FMT_SBYTE:
                value = data[offset];
                break;
            case this.FMT_BYTE:
                value = data[offset];
                break;

            case this.FMT_USHORT:
                value = fxifUtils.read16(data, offset, swapbytes);
                break;
            case this.FMT_ULONG:
                value = fxifUtils.read32(data, offset, swapbytes);
                break;

            case this.FMT_URATIONAL:
            case this.FMT_SRATIONAL: {
                // It sometimes happens that there are multiple rationals contained.
                // So go for multiple here and convert back later.
                var values = [];

                for (var i = 0; i < components; i++) {
                    var Num, Den;
                    Num = fxifUtils.read32(data, offset + i * 8, swapbytes);
                    Den = fxifUtils.read32(data, offset + i * 8 + 4, swapbytes);
                    if (Den === 0) {
                        values[i] = 0;
                    } else {
                        values[i] = Num / Den;
                    }
                }

                if (components === 1)
                    value = values[0];
                else
                    value = values;
                break;
            }

            case FMT_SSHORT:
                value = fxifUtils.read16(data, offset, swapbytes);
                break;
            case FMT_SLONG:
                value = fxifUtils.read32(data, offset, swapbytes);
                break;

            // ignore, probably never used
            case FMT_SINGLE:
                value = 0;
                break;
            case FMT_DOUBLE:
                value = 0;
                break;
        }

        return value;
    }

    this.read16 = function (data, offset, swapbytes) {
        if (!swapbytes)
            return (data[offset] << 8) | data[offset + 1];

        return data[offset] | (data[offset + 1] << 8);
    };

    this.read32 = function (data, offset, swapbytes) {
        if (!swapbytes)
            return (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];

        return data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24);
    };


    /* charWidth should normally be 1 and this function thus reads
     * the bytes one by one. But reading Unicode needs reading
     * 16 Bit values.
     * Stops at the first null byte.
     */
    this.bytesToString = function (data, offset, num, swapbytes, charWidth) {
        let s = "";

        if (charWidth === 1) {
            for (let i = offset; i < offset + num; i++) {
                const charval = data[i];
                if (charval === 0)
                    break;

                s += String.fromCharCode(charval);
            }
        } else {
            for (let i = offset; i < offset + num; i += 2) {
                const charval = this.read16(data, i, swapbytes);
                if (charval === 0)
                    break;

                s += String.fromCharCode(charval);
            }
        }

        return s;
    };

    /* Doesn’t stop at null bytes. */
    this.bytesToStringWithNull = function (data, offset, num) {
        let s = "";

        for (let i = offset; i < offset + num; i++)
            s += String.fromCharCode(data[i]);

        return s;
    };

    // Retrieves the language which is likely to be the users favourite one.
    // Currently, we end up using only the first language code.
    this.getLang = function () {
        return browser.i18n.getUILanguage();
    }
}

globalThis.decoders = new Decoders();