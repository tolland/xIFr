/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * This Source Code Form is "Incompatible With Secondary Licenses", as
 * defined by the Mozilla Public License, v. 2.0.
 */

(async () => {

    const Translate = await import(chrome.runtime.getURL('./utils/translate.js'));

    const {
        getBgImgs,
        getSVGEmbeddedImages,
        updateBgAlternatives
    } = await import(chrome.runtime.getURL('./deepsearch/bg_images.js'));

    const {
        loadImg,
        loadImgAll,
        blacklistedImage,
        imageSearch,
        extraSearch,
        deeperSearch,
        logDSEARCH,
        deepSearchGenericLimit
    } = await import(chrome.runtime.getURL('./deepsearch/image_search.js'));

    globalThis.browser ??= chrome;


    // A map to connect non-jpeg background-images and alternative jpeg-versions found in css image-sets:
    const bgAlternatives = new Map(); // Will be updated by updateBgAlternatives


    async function getDescription(name, tag) {
        console.log("======= start [" + name + "] ========");
        console.dir(tag)
        console.log("typeof tag: " + typeof tag);
        console.log("typeof tag.description: " + typeof tag.description);
        console.log("description is array? " + Array.isArray(tag.description));
        console.log("typeof tag.value: " + typeof tag.value);
        console.log("value is array? " + Array.isArray(tag.value));

        var result;
        const Utils = await import(chrome.runtime.getURL("ExifReader/src/utils.js"));
        if (Array.isArray(tag)) {
            result = tag.map(item => getDescription(item)).join(', ');
        } else if (Array.isArray(tag.value) && tag.description === '[Unicode encoded text]') {
            result = decoders.ConvertAnyFormat(tag.value, decoders.FMT_STRING, 0, null, tag.value.length, false, 1);
            // return tag.value.map(item => getDescription(item)).join(', ');
        } else if (typeof tag.value === 'object' && tag.value.toString() === '[object DataView]') {
            result = Utils.getStringFromDataView(tag.value, 0, tag.value.byteLength);
            // try {
            //     result = JSON.stringify(JSON.parse(result), null, 4);
            // }catch (e) {
            //     console.debug("catch!" + e);
            // }

        } else if (tag && typeof tag.description !== undefined) {
            console.log("falling back to  tag.description: " + tag.description + " is not a DataView it has typeof " + typeof tag.value)
            result = tag.description
        } else {
            result = tag.value;
        }
        console.log("======= end [" + name + "] ========");

        return result;
    }


    async function fetchImage(url, fetchOptions = {}) {
        const fetchTimeout = 8000; // 8 seconds
        if (AbortSignal?.timeout) {
            fetchOptions.signal = AbortSignal.timeout(fetchTimeout);
        }


        try {
            // currently need to call this twice to get the dimensions
            // @TODO but should probably just pass this through to exifreader
            const response = await fetch(url, fetchOptions);

            // Check for successful response status (e.g., 200-299)
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }

            const ExifReader = await import(chrome.runtime.getURL("ExifReader-src/exif-reader.js"));
            // import {getStringFromDataView} from '../../src/utils';
            // import {getStringFromDataView} from './ExifReader/src/utils';
            const tags = await ExifReader.load(url, {async: true, includeUnknown: true});


            const tags_dict = {};
            for (const name in tags) {
                let description = await getDescription(name, tags[name]);
                if (description !== undefined) {
                    tags_dict[name] = description;
                }
            }

            const properties = {
                byteLength: response.headers.get('content-length') || '', // Get from headers
                contentType: response.headers.get('content-type') || '',
                lastModified: response.headers.get('last-modified') || ''
            };


            return {
                data: tags_dict,
                info: "EXIF data fetched and parsed",
                properties: properties
            };

        } catch (error) {
            console.error("Error fetching or parsing EXIF:", error);

            // Handle the error appropriately.  You might want to:
            // 1. Return an error object:
            return {error: error.message};  // or error: error

            // 2. Re-throw the error to be caught further up the call stack:
            // throw error;
        }
    }

    async function loadparse(imgrequest) { //
        if (!imgrequest) {
            console.warn("xIFr: Exit loadparseshow. Got nothing to show!");
            return;
        }
        const wprop = {
            scr: { // screen
                width: window.screen.width,
                availWidth: window.screen.availWidth,
                height: window.screen.height,
                availHeight: window.screen.availHeight
            },
            win: { // browser window
                width: window.outerWidth,
                height: window.outerHeight,
                top: window.screenTop,
                left: window.screenLeft
            }
        };
        const propertiesObj = {wprop: wprop};
        propertiesObj.URL = imgrequest.imageURL;
        propertiesObj.crossOrigin = imgrequest.crossOrigin;
        propertiesObj.referrerPolicy = imgrequest.referrerPolicy;
        if (imgrequest.naturalWidth) {
            propertiesObj.naturalWidth = imgrequest.naturalWidth;
            propertiesObj.naturalHeight = imgrequest.naturalHeight;
        }
        if (imgrequest.source) { // ?
            propertiesObj.source = imgrequest.source;
        }
        if (imgrequest.context) { // ?
            propertiesObj.context = imgrequest.context;
        }
        if (imgrequest.tabId) {
            propertiesObj.tabId = imgrequest.tabId;
        }
        propertiesObj.tabUrl = imgrequest.tabUrl || window.location?.href;
        const errorsArr = []; // Messages to show as errors
        const warningsArr = []; // Messages to show as warnings
        const infosArr = []; // Messages to show as info

        if (imgrequest.jpegURL) {
            infosArr.push('Image shown on webpage is in ' + imgrequest.imageType.replace('image/', '') + ' format. An alternative image was detected (assumed similar) to look for meta-data in...' + (imgrequest.proxyType ? imgrequest.proxyType.replace('image/', '') : ''));
            propertiesObj.pageShownURL = imgrequest.imageURL;
            propertiesObj.pageShownType = imgrequest.imageType;
            propertiesObj.URL = imgrequest.jpegURL;
        }
        const fetchOptions = {};
        if (imgrequest.referrerPolicy) {
            fetchOptions.referrerPolicy = imgrequest.referrerPolicy; // But how are referrerPolicy handled if fetch is moved to background-script?
        }
    }

    async function loadparseshow(imgrequest) { // handleChosenOne
        // console.log('Properties for ' + imgrequest.imageURL + '... \n srcset=' + imgrequest.srcset + ' \n crossOrigin=' + imgrequest.crossOrigin + ' \n referrerPolicy=' + imgrequest.referrerPolicy + ' (' + (typeof imgrequest.referrerPolicy) + ')' + ' \n baseURI=' + imgrequest.baseURI);
        if (!imgrequest) {
            console.warn("xIFr: Exit loadparseshow. Got nothing to show!");
            return;
        }
        const wprop = {
            scr: { // screen
                width: window.screen.width,
                availWidth: window.screen.availWidth,
                height: window.screen.height,
                availHeight: window.screen.availHeight
            },
            win: { // browser window
                width: window.outerWidth,
                height: window.outerHeight,
                top: window.screenTop,
                left: window.screenLeft
            }
        };
        const propertiesObj = {wprop: wprop};
        propertiesObj.URL = imgrequest.imageURL;
        propertiesObj.crossOrigin = imgrequest.crossOrigin;
        propertiesObj.referrerPolicy = imgrequest.referrerPolicy;
        if (imgrequest.naturalWidth) {
            propertiesObj.naturalWidth = imgrequest.naturalWidth;
            propertiesObj.naturalHeight = imgrequest.naturalHeight;
        }
        if (imgrequest.source) { // ?
            propertiesObj.source = imgrequest.source;
        }
        if (imgrequest.context) { // ?
            propertiesObj.context = imgrequest.context;
        }
        if (imgrequest.tabId) {
            propertiesObj.tabId = imgrequest.tabId;
        }
        propertiesObj.tabUrl = imgrequest.tabUrl || window.location?.href;
        const errorsArr = []; // Messages to show as errors
        const warningsArr = []; // Messages to show as warnings
        const infosArr = []; // Messages to show as info

        if (imgrequest.jpegURL) {
            infosArr.push('Image shown on webpage is in ' + imgrequest.imageType.replace('image/', '') + ' format. An alternative image was detected (assumed similar) to look for meta-data in...' + (imgrequest.proxyType ? imgrequest.proxyType.replace('image/', '') : ''));
            propertiesObj.pageShownURL = imgrequest.imageURL;
            propertiesObj.pageShownType = imgrequest.imageType;
            propertiesObj.URL = imgrequest.jpegURL;
        }
        const fetchOptions = {};
        if (imgrequest.referrerPolicy) {
            fetchOptions.referrerPolicy = imgrequest.referrerPolicy; // But how are referrerPolicy handled if fetch is moved to background-script?
        }
        context.debug("Will now do fetch(" + propertiesObj.URL + ") ...");

        function handleResult(result) {
            if (result.info) {
                infosArr.push(result.info);
            }
            if (result.error) {
                errorsArr.push(result.error);
                propertiesObj.byteLength = '';
                propertiesObj.contentType = '';
                propertiesObj.lastModified = '';
                browser.runtime.sendMessage({
                    message: "EXIFready",
                    data: {},
                    properties: propertiesObj,
                    errors: errorsArr,
                    warnings: warningsArr,
                    infos: infosArr
                });
            }
            // console.dir(result)
            var properties = result.properties;
            propertiesObj.byteLength = properties.byteLength;
            propertiesObj.contentType = properties.contentType;
            propertiesObj.lastModified = properties.lastModified;

            const dataObj = result.data || {};

            context.debug("Call addByteStreamIF(byteArray)...");
            // console.dir(result);

            if (dataObj.error?.length) {
                errorsArr.push(...dataObj.error);
                delete dataObj.error;
            }
            if (dataObj.warning?.length) {
                warningsArr.push(...dataObj.warning);
                delete dataObj.warning;
            }

            context.debug("result: " + JSON.stringify(result));

            if (imgrequest.naturalWidth && imgrequest.goDeepSearch && imgrequest.supportsDeepSearchModifier && !imgrequest.deepSearchBigger && (imgrequest.naturalWidth * imgrequest.naturalHeight <= imgrequest.deepSearchBiggerLimit)) {
                infosArr.push('Not the expected image? You can force xIFr to look for a larger image than this, by holding down Shift key when selecting xIFr in the context menu!');
            }

            //context.debug("Gathered data: \n" + JSON.stringify(dataObj));
            const xlatData = Translate.translateFields(dataObj);
            //context.debug("Gathered data after translation: \n" + JSON.stringify(xlatData));

            context.debug("EXIF parsing done. Send EXIFready message...");
            // console.table(xlatData);
            // console.table(propertiesObj);
            // console.table(warningsArr);
            browser.runtime.sendMessage({
                message: "EXIFready",
                data: xlatData,
                properties: propertiesObj,
                errors: errorsArr,
                warnings: warningsArr,
                infos: infosArr
            });
        }


        // https://stackoverflow.com/questions/8593896/chrome-extension-how-to-pass-arraybuffer-or-blob-from-content-script-to-the-bac
        // https://stackoverflow.com/questions/6965107/converting-between-strings-and-arraybuffers

        // Firefox currently uses a better data-cloning algorithm than Chrome:
        // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Chrome_incompatibilities#data_cloning_algorithm
        // but maybe that could change in the future?:
        // https://bugs.chromium.org/p/chromium/issues/detail?id=248548

        context.debug(' *** fetchMode: ' + imgrequest.fetchMode + ' ***');

        const pageOrigin = (new URL(window.location))?.origin;
        const imgOrigin = (new URL(propertiesObj.URL))?.origin;

        context.debug(' *** pageOrigin: ' + pageOrigin + ' ***');
        context.debug(' *** imgOrigin: ' + imgOrigin + ' ***');

        if (imgrequest.fetchMode === 'devFrontendFetch' ||
            imgrequest.fetchMode === 'devAutoFetch' && ((pageOrigin === imgOrigin) || true || imgOrigin.startsWith('data:') || imgOrigin.startsWith('blob:') || imgOrigin.startsWith('file:'))) { // Do frontend fetch...
            if (imgrequest.fetchMode !== 'devAutoFetch') {
                console.warn(`xIFr: Forced FRONTEND fetch (${imgrequest.fetchMode})`);
            }
            // console.dir(propertiesObj);
            let resultx;
            resultx = await fetchImage(propertiesObj.URL, fetchOptions)
            // console.dir(resultx);
            handleResult(resultx);
        } else { // Do backend fetch...
            if (imgrequest.fetchMode !== "devAutoFetch") {
                console.warn(`xIFr: Forced BACKEND fetch (${imgrequest.fetchMode})`);
            }

            if (context.isFirefox()) { // Fastest Structured clone algorithm. Supported by Firefox
                context.debug('fetchdata: Receiving from backend as Uint8Array-arrayBuffer by the Structured clone algorithm (The fastest way, and supported by Firefox)');
                browser.runtime.sendMessage(
                    {
                        message: 'fetchdata',
                        href: propertiesObj.URL,
                        fetchOptions: fetchOptions
                    }
                )
                    .then(handleResult)
                    .catch(
                        (error) => console.error('xIFr: fetchdata backend fetch - There has been a problem with your fetch operation: ', error.message, error)
                    );
            } else { // Slower JSON serialization algorithm. Supported by Chromium browsers (Also used to work with Firefox, but not anymore with MV3)
                context.debug('fetchdataBase64: Receiving from backend as base64 by the JSON serialization algorithm (The widely supported way, and supported by both Chromium and Firefox)');
                browser.runtime.sendMessage(
                    {
                        message: 'fetchdataBase64',
                        href: propertiesObj.URL,
                        fetchOptions: fetchOptions
                    }
                )
                    .then(handleBase64Result)
                    .then(handleResult)
                    .catch(
                        (error) => console.error('xIFr: fetchdataBase64 backend fetch - There has been a problem with your fetch operation: ', error.message, error)
                    );
            }

        }

    }

    if (typeof globalThis.contentListenerAdded === 'undefined') {
        browser.runtime.onMessage.addListener(request => {

            if (request.message === "showInfos") {
                const elem = browser.menus.getTargetElement(request.targetId);
                const extraLoads = [];
                let rootNode = elem.getRootNode({composed: false});
                if (rootNode instanceof ShadowRoot) {
                    logDSEARCH && console.warn(`xIFr: We are in a shadowDOM (Host element: <${rootNode.host.nodeName?.toLowerCase()} />). Current version of xIFr might have limited Deep Search support here.`);
                }
                while (rootNode) {
                    logDSEARCH && console.log(`xIFr: Finding "extras" to preload below root ${rootNode.nodeName?.toLowerCase()}...`);
                    extraLoads.push(...getBgImgs(rootNode), ...getSVGEmbeddedImages(rootNode));
                    rootNode = rootNode.host?.getRootNode({composed: false});
                }
                const extraImages = loadImgAll(Array.from(new Set(extraLoads)));
                const image = imageSearch(request, elem);
                if (image) {
                    //loadparse(image);
                    //console.dir(image);
                } else {
                    extraImages.then(xtrSizes => {
                        context.debug("Going deep search with preloaded backgrounds plus images in svg and shadowDOM: " + JSON.stringify(xtrSizes));
                        logDSEARCH && console.log(`xIFr: *** Doing deeperSearch with "extras": ${JSON.stringify([...extraLoads])}`);
                        // loadparse(deeperSearch(request, elem, xtrSizes.sort((a, b) => (b.weight || 1) - (a.weight || 1))))
                        var image2 = deeperSearch(request, elem, xtrSizes.sort((a, b) => (b.weight || 1) - (a.weight || 1)));
                    });
                }
                console.log(typeof image);
                console.dir(image);
                var img = image.raw;
                if (self.Image && img instanceof self.Image) {

                    console.log("is Image");
                }
                if (self.HTMLImageElement && img instanceof self.HTMLImageElement) {
                    console.log("is HTMLImageElement");
                }
                if (img.complete) {
                    console.log("is complete")
                }

                console.dir(img);

            } else if (request.message === "parseImage") {

                if (request.goDeepSearch) {

                    /**************************************************************/
                    /*  ***  Advanced mode with "deep-search" (Firefox 63+)  ***  */
                    /**************************************************************/

                    context.debug(" *** ADVANCED MODE WITH DEEP SEARCH *** ");
                    /**
                     * The right-clicked node/element
                     * @type {?Element}
                     */
                    const elem = browser.menus.getTargetElement(request.targetId); // TODO can I use focused element instead if it fails? (but that requires there is only ONE contentscript running!)
                    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/menus/getTargetElement
                    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/menus/OnClickData
                    if (elem) {
                        request.nodeName = elem.nodeName?.toLowerCase(); // node name of context (right-click) target
                        logDSEARCH && console.log(`xIFr: The righclicked element is a <${request.nodeName} /> (${elem}) found on ${elem.ownerDocument.documentURI} (${elem.ownerDocument}).`);
                        logDSEARCH && console.log(`xIFr: The DocumentElement is a : <${elem.ownerDocument.documentElement?.nodeName?.toLowerCase()} /> (${elem.ownerDocument.documentElement})`);
                        // console.log(`xIFr: OwnerDocument.images: (${JSON.stringify(Array.from(elem.ownerDocument.images).map(im => im.currentSrc))})`);
                        if (elem.shadowRoot) {
                            logDSEARCH && console.warn('xIFr: The rightclicked element hosts a shadowDOM which may be invisible for current version of the Deep Search algorithm!');
                        }
                        const extraLoads = [];
                        let rootNode = elem.getRootNode({composed: false});
                        if (rootNode instanceof ShadowRoot) {
                            logDSEARCH && console.warn(`xIFr: We are in a shadowDOM (Host element: <${rootNode.host.nodeName?.toLowerCase()} />). Current version of xIFr might have limited Deep Search support here.`);
                        }
                        while (rootNode) {
                            logDSEARCH && console.log(`xIFr: Finding "extras" to preload below root ${rootNode.nodeName?.toLowerCase()}...`);
                            extraLoads.push(...getBgImgs(rootNode), ...getSVGEmbeddedImages(rootNode));
                            rootNode = rootNode.host?.getRootNode({composed: false});
                        }

                        // Start finding and downloading images found in svg and in backgrounds, to find the dimensions...
                        const extraImages = loadImgAll(Array.from(new Set(extraLoads)));
                        const image = imageSearch(request, elem);
                        if (image) {
                            loadparseshow(image);
                        } else {
                            extraImages.then(xtrSizes => {
                                context.debug("Going deep search with preloaded backgrounds plus images in svg and shadowDOM: " + JSON.stringify(xtrSizes));
                                logDSEARCH && console.log(`xIFr: *** Doing deeperSearch with "extras": ${JSON.stringify([...extraLoads])}`);
                                loadparseshow(deeperSearch(request, elem, xtrSizes.sort((a, b) => (b.weight || 1) - (a.weight || 1))))
                            });
                        }
                    } else {
                        logDSEARCH && console.log(`xIFr: A contextscript running on ${document.documentURI} (${document}) did not get a target element id!`);
                        context.debug(`xIFr: A contextscript running on ${document.documentURI} (${document}) did not get a target element id`);
                        // TODO but the focused element on page is...
                    }

                } else if (typeof request.imageURL !== 'undefined' && request.mediaType === 'image') {

                    /************************************************************************/
                    /*  ***  Simple "legacy mode" (Chrome and older Firefox versions)  ***  */
                    /*  ***      (or "deep search" forced disabled in options)         ***  */
                    /************************************************************************/

                    context.debug(" *** SIMPLE 'LEGACY' MODE *** ");
                    request.nodeName = 'img'; // node name of context (right-click) target
                    context.debug("parseImage message received with URL = " + request.imageURL);
                    if (request.supportsDeepSearch) console.warn('xIFr: Using simple "legacy mode" even though browser supports Deep Search')
                    const image = {};
                    image.imageURL = request.imageURL;
                    image.mediaType = 'image';
                    image.supportsDeepSearch = request.supportsDeepSearch;
                    image.goDeepSearch = request.goDeepSearch; // false
                    image.supportsDeepSearchModifier = request.supportsDeepSearchModifier;
                    image.deepSearchBiggerLimit = request.deepSearchBiggerLimit;
                    image.deepSearchBigger = request.deepSearchBigger;
                    image.fetchMode = request.fetchMode;
                    image.tabId = request.tabId;
                    image.tabUrl = request.tabUrl;
                    image.source = "img element";
                    image.context = request.nodeName + " element"; // (not really anything to de with found image)
                    const img = Array.from(document.images).find(imgElem => imgElem.currentSrc === request.imageURL);
                    if (img) {
                        image.naturalWidth = img.naturalWidth;
                        image.naturalHeight = img.naturalHeight;

                        image.srcset = img.srcset;
                        image.crossOrigin = img.crossOrigin;
                        image.referrerPolicy = img.referrerPolicy; // https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement
                        image.baseURI = img.baseURI;
                        image.x = img.x;
                        image.y = img.y;
                    } else {
                        // Is it possible to arrive here? I'm not sure, but maybe if right-clicked image is in a shadowDOM?...
                        // TODO: If so, maybe: New Image(request.imageURL); load promise -> dimensions ... ???
                        logDSEARCH && console.warn('xIFr: Simple search did not find a match in document.images');
                    }
                    loadparseshow(image);

                } else {
                    // Normally we should NOT get here...
                    console.error('xIFr: No image detected in simple search.');
                }
            } else if (request.message === "displayInPage") {

                console.log('xIFr: Received message displayInPage with data ' + JSON.stringify(request.data));

                let dialog = document.querySelector('dialog#xIFr');
                if (dialog) {
                    // remove
                    dialog.close();
                } else if (document.body && (request.data.URL !== request.data.pageURL)) {
                    // insert
                    dialog = document.createElement('dialog');
                    dialog.setAttribute('id', 'xIFr');
                    dialog.setAttribute('style', 'box-sizing:border-box; max-width:90svw; max-height:90svh; padding:0; margin:auto; border:none; box-shadow: rgba(50, 52, 55, 0.2) 0 6px 18px;overflow:auto;pointer-events:auto;user-select:auto;');
                    let img = document.createElement('img');
                    img.setAttribute('src', request.data.URL);
                    img.setAttribute('style', 'padding:0;margin:0;border:none;max-width:90svw;display:block;aspect-ratio:auto;pointer-events:auto;user-select:auto;');
                    if (request.data.crossOrigin) {
                        img.setAttribute('crossOrigin', request.data.crossOrigin);
                    }
                    dialog.replaceChildren(img);
                    document.body.insertAdjacentElement('afterbegin', dialog);
                    dialog.addEventListener("close", (e) => {
                        dialog.remove();
                        img = null;
                        dialog = null
                    }, {once: true});

                    // https://stackoverflow.com/questions/21335136/how-to-re-enable-right-click-so-that-i-can-inspect-html-elements-in-chrome
                    function bringBackDefault(event) {
                        event.returnValue = true;
                        event.stopPropagation();
                    }

                    img.addEventListener('contextmenu', bringBackDefault, true);
                    img.addEventListener('dragstart', bringBackDefault, true);
                    img.addEventListener('selectstart', bringBackDefault, true);
                    img.addEventListener('mousedown', bringBackDefault, true);
                    img.addEventListener('mouseup', bringBackDefault, true);
                    dialog.addEventListener("click", (ev) => {
                        ev.stopPropagation();
                        ev.preventDefault();
                        dialog.close()
                    }, {once: true});
                    dialog.showModal();
                }

            }
            return Promise.resolve(`The contentscript says thanks for the '${request.message}' message! 😊`);
        });
        globalThis.contentListenerAdded = true;
    }

})();
