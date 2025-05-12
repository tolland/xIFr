// Minimum image-size to be relevant:
export const deepSearchGenericLimit = 10 * 10;

export const logDSEARCH = true; // Some logging to console to trace Deep Search steps?

export function loadImg(src, timeout = 500) {
    let imgPromise = new Promise((resolve, reject) => {
        const img = new Image();
        img.addEventListener('load', () => {
            resolve({
                src: src,
                width: img.naturalWidth,
                height: img.naturalHeight,
                weight: (img.naturalWidth || 1) * (img.naturalHeight || 1),
            });
        });
        img.addEventListener('error', function () {
            console.warn(`xIFr: Error when trying to "pre-fetch" image ${src}.`);
            reject();
        });
        img.src = src;
    });
    const timer = new Promise((resolve, reject) => {
        setTimeout(reject, timeout);
    });
    return Promise.race([imgPromise, timer]);
}

export function loadImgAll(imgList, timeout = 500) {
    // Could we use https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode ?
    return new Promise((resolve, reject) => {
        Promise.all(
            imgList.map((src) => loadImg(src, timeout)).map((p) => p.catch((e) => false))
        ).then((results) => resolve(results.filter((r) => r)));
    });
}

export function blacklistedImage(src) {
    // todo: Make blacklist configurable!
    if (src.startsWith('data:') && (src.length < 500 || !src.startsWith('data:image/'))) {
        console.warn('xIFr: Skipping ' + src);
        // ignore tiny inline data: images - and those that doesn't have some 'image' mimetype
        return true;
    } else if (src.startsWith('moz-extension:') || src.startsWith('chrome-extension:')) {
        console.warn('xIFr: Skipping ' + src);
        return true; // Apparently we can detect images inserted by other extensions, but we cannot access them
    }
    return [
        {
            url: 'https://combo.staticflickr.com/ap/build/images/sprites/icons-cc4be245.png',
            regexp: false,
        },
        {
            url: 'https://combo.staticflickr.com/ap/build/images/fave-test/white@1x.png',
            regexp: false,
        },
        {
            url: 'https://combo.staticflickr.com/ap/build/images/sprites/icons-87310c47.png',
            regexp: false,
        },
        {
            url: 'https://static.kuula.io/prod/assets/sprites-main.png',
            regexp: false,
        },
        {
            url: 'https://m.media-amazon.com/images/G/01/digital/music/player/web/EQ_accent.gif',
            regexp: false,
        },
        {
            url: 'https://m.media-amazon.com/images/G/01/digital/music/player/web/EQ_accent.webp',
            regexp: false,
        },
        {
            url: 'https://www.instagram.com/static/bundles/es6/sprite_core_32f0a4f27407.png/32f0a4f27407.png',
            regexp: false,
        },
        {
            url: 'https://static.xx.fbcdn.net/rsrc.php/v3/yt/r/pQ6WpMqXLJA.png',
            regexp: false,
        },
        {
            url: 'https://static.cdninstagram.com/images/instagram/xig_legacy_spritesheets/sprite_core.png',
            regexp: false,
        },
        {
            url: 'https://static.cdninstagram.com/rsrc.php/v3/y5/r/TJztmXpWTmS.png',
            regexp: false,
        },
    ].some(function (item) {
        return src.startsWith(item.url);
    });
}

export function imageSearch(request, elem) {
    // TODO: Look if elem has a shadowDOM beneath it?
    //  https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/dom/openOrClosedShadowRoot
    //  element.openOrClosedShadowRoot - The Element.openOrClosedShadowRoot read-only property represents the shadow root hosted by the element, regardless if its mode is open or closed (WebExtensions only - Firefox only)
    //  -> Combined: let shadowRoot = chrome.dom?.openOrClosedShadowRoot(element) || element.openOrClosedShadowRoot();
    //  BUT if just looking for *open* shadowRoots:
    //  element.shadowRoot

    context.debug(
        'imageSearch(): Looking for img elements on/below ' + elem.nodeName.toLowerCase()
    );

    let candidate;

    // https://time2hack.com/checking-overlap-between-elements/
    // https://www.youtube.com/watch?v=cUZ2r6C2skA
    // https://css-tricks.com/how-to-stack-elements-in-css/
    const documentImages = [];

    /*
    Calling it on an element inside a standard web page will return an HTMLDocument object representing the entire page (or <iframe>).
Calling it on an element inside a shadow DOM will return the associated ShadowRoot.
Calling it on an element that is not attached to a document or a shadow tree will return the root of the DOM tree it belongs to.
     */
    const rootNode = elem.getRootNode({ composed: false });

    /*
    The images read-only property of the Document interface returns a collection of the images in the current HTML document.
     */
    documentImages.push(
        ...Array.from(rootNode.images || rootNode.querySelectorAll('img')).sort(
            // sort by size descending...
            (a, b) =>
                (b.naturalWidth || 1) * (b.naturalHeight || 1) -
                (a.naturalWidth || 1) * (a.naturalHeight || 1)
        )
    );

    logDSEARCH &&
        console.log(
            `xIFr: *** Doing initial imageSearch with documentImages list (length ${
                documentImages.length
            }): ${JSON.stringify(
                documentImages.map(
                    (im) =>
                        ` (${im.currentSrc}, w=${im.naturalWidth}, s=${
                            (im.naturalWidth || 1) * (im.naturalHeight || 1)
                        })`
                )
            )}`
        );
    for (const img of documentImages) {
        if (elem.contains(img)) {
            // img is itself/elem or img is a "sub-node"
            context.debug(
                'Found image within target element! img.src=' +
                    img.src +
                    ' and naturalWidth=' +
                    img.naturalWidth +
                    ', naturalHeight=' +
                    img.naturalHeight
            );
            // We could look for best match, or just continue with the first we find?
            context.debug('Candidate!?');

            const propDisplay = window.getComputedStyle(img, null).getPropertyValue('display'); // none?

            const propVisibility = window
                .getComputedStyle(img, null)
                .getPropertyValue('visibility'); // hidden?

            // TODO: Maybe also look at computed opacity ??!
            context.debug('PROPs! display=' + propDisplay + ', visibility=' + propVisibility);
            if (
                img.naturalWidth &&
                img.nodeName.toUpperCase() === 'IMG' &&
                propDisplay !== 'none' &&
                propVisibility !== 'hidden'
            ) {
                if (
                    !blacklistedImage(img.currentSrc) &&
                    ((request.deepSearchBigger &&
                        img.naturalWidth * img.naturalHeight > request.deepSearchBiggerLimit) ||
                        (!request.deepSearchBigger &&
                            img.naturalWidth * img.naturalHeight > deepSearchGenericLimit))
                ) {
                    if (typeof candidate !== 'undefined') {
                        context.debug(
                            'Compare img with candidate: ' +
                                img.naturalWidth * img.naturalHeight +
                                ' > ' +
                                candidate.naturalWidth * candidate.naturalHeight +
                                '? -  document.images.length = ' +
                                document.images.length
                        );
                        if (
                            img.naturalWidth * img.naturalHeight >
                            candidate.naturalWidth * candidate.naturalHeight
                        ) {
                            context.debug(
                                'Setting new candidate. -  documentImages.length = ' +
                                    documentImages.length
                            );
                            candidate = img;
                        }
                    } else {
                        context.debug(
                            'Setting first candidate. -  documentImages.length = ' +
                                documentImages.length
                        );
                        candidate = img;
                    }
                }
            }
        }
    }
    if (typeof candidate !== 'undefined') {
        context.debug("Found! Let's use best candidate: " + candidate.src);
        const image = {}; // result
        image.imageURL = candidate.currentSrc || candidate.src;
        image.imageType = ''; // so far unknown mimetype
        image.mediaType = 'image';
        image.naturalWidth = candidate.naturalWidth;
        image.naturalHeight = candidate.naturalHeight;
        image.supportsDeepSearch = request.supportsDeepSearch;
        image.goDeepSearch = request.goDeepSearch;
        image.supportsDeepSearchModifier = request.supportsDeepSearchModifier;
        image.deepSearchBiggerLimit = request.deepSearchBiggerLimit;
        image.deepSearchBigger = request.deepSearchBigger;
        image.fetchMode = request.fetchMode;
        image.tabId = request.tabId;
        image.tabUrl = request.tabUrl;
        image.source = candidate.nodeName.toLowerCase() + ' element'; // 'img element';
        image.context = request.nodeName + ' element'; // (not really anything to de with found image)

        image.raw = candidate;
        image.srcset = candidate.srcset;
        image.crossOrigin = candidate.crossOrigin;
        image.referrerPolicy = candidate.referrerPolicy; // https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement
        image.baseURI = candidate.baseURI; // base URL of the document containing the node (might be set by <base>)
        image.x = candidate.x;
        image.y = candidate.y;

        // srcset attribute holds various sizes/resolutions
        // source tag can define alternative formats (but might also hold sizes)
        if (
            candidate.parentNode?.nodeName &&
            candidate.parentNode.nodeName.toUpperCase() === 'PICTURE'
        ) {
            const picture = candidate.parentNode;
            const potentials = [];
            let foundShownInAvoid = false;
            let descriptorToMatch = '1x';
            for (const child of picture.children) {
                if (child.nodeName.toUpperCase() === 'SOURCE' && child.srcset && child.type) {
                    // type is or starts with mimetype;
                    if (child.type.startsWith('image/jpeg')) {
                        // We like this being jpeg
                        // Populate potentials with jpeg images...
                        const findings = child.srcset.split(',');
                        for (const found of findings) {
                            const parts = found.trim().split(/\s+/u);
                            const foundUrl = new URL(parts[0].trim(), child.baseURI).href;
                            let foundDescriptor = parts.slice(1).join(' ');
                            if (foundDescriptor === '') {
                                foundDescriptor = '1x';
                            }
                            let foundWeight = parseInt(foundDescriptor, 10);
                            if (isNaN(foundWeight)) {
                                foundWeight = 0;
                            }
                            if (foundUrl === image.imageURL) {
                                image.imageType = 'image/jpeg';
                            }
                            potentials.push({
                                url: foundUrl,
                                descriptor: foundDescriptor,
                                type: 'image/jpeg',
                                sortWeight: foundWeight,
                            });
                        }
                    } else {
                        // Let's avoid this
                        // Detect if use of image to avoid...
                        const findings = child.srcset.split(',');
                        const foundType = child.type.split(';')[0].trim();
                        for (const found of findings) {
                            const parts = found.trim().split(/\s+/u);
                            const foundUrl = new URL(parts[0].trim(), child.baseURI).href;
                            let foundDescriptor = parts.slice(1).join(' ');
                            if (foundDescriptor === '') {
                                foundDescriptor = '1x';
                            }
                            if (foundUrl === image.imageURL) {
                                foundShownInAvoid = true;
                                descriptorToMatch = foundDescriptor;
                                image.imageType = foundType;
                                break;
                            }
                        }
                    }
                }
            }

            if (foundShownInAvoid) {
                // We like to find an alternative (hopefully jpeg) to parse meta-data from...
                if (potentials.length === 0 && candidate.srcset) {
                    // If potentials is empty and img.srcset is defined, add img.srcset to potentials...
                    const findings = candidate.srcset.split(',');
                    for (const found of findings) {
                        const parts = found.trim().split(/\s+/u);
                        const foundUrl = new URL(parts[0].trim(), candidate.baseURI).href;
                        let foundDescriptor = parts.slice(1).join(' ');
                        if (foundDescriptor === '') {
                            foundDescriptor = '1x';
                        }
                        let foundWeight = parseInt(foundDescriptor, 10);
                        if (isNaN(foundWeight)) {
                            foundWeight = 0;
                        }
                        potentials.push({
                            url: foundUrl,
                            descriptor: foundDescriptor,
                            type: '',
                            sortWeight: foundWeight,
                        });
                    }
                }
                if (potentials.length > 0) {
                    // Replace unwanted image with something from potentials list...
                    for (const potential of potentials) {
                        if (potential.descriptor === descriptorToMatch) {
                            image.jpegURL = potential.url;
                            image.jpegType = potential.type;
                            return image;
                        }
                    }
                    // If no exact descriptor-match in potentials, then use the one with "highest descriptor" (probably largest image)...
                    const potential = potentials.reduce((max, other) =>
                        max.sortWeight > other.sortWeight ? max : other
                    ); // Find item with highest sortWeight (descriptor-value)
                    image.jpegURL = potential.url;
                    image.jpegType = potential.type;
                    return image;
                }
                // If no potentials at all, use fallback img.src...
                image.jpegURL = candidate.src;
            }
            // If we arrive here, we are probably already using img fallback. Cannot do any better.
        }
        context.debug('imageSearch(): Returning found image (img) ' + JSON.stringify(image));
        return image;
    }
    // nothing found by simple search
}

export function extraSearch(request, elem, xtrSizes) {
    const xtrImgURLsUnsorted = Array.from(
        new Set([...getBgImgs(elem), ...getSVGEmbeddedImages(elem)])
    );
    context.debug(
        `extraSearch(): Following "extra" image urls are found on/below ${elem.nodeName.toLowerCase()}: ${JSON.stringify(
            xtrImgURLsUnsorted
        )}.`
    );
    logDSEARCH &&
        console.log(
            `xIFr: Found ${
                xtrImgURLsUnsorted.length
            } extra background (or in SVG) image URLs to check on/below ${elem.nodeName.toLowerCase()}: \n${JSON.stringify(
                xtrImgURLsUnsorted
            )}`
        );
    if (xtrImgURLsUnsorted.length > 0) {
        const xtrImgURLs = [];
        for (const im of xtrSizes) {
            if (xtrImgURLsUnsorted.find((xSrc) => im.src === xSrc)) {
                xtrImgURLs.push(im.src); // same order as in the already sorted xtrSizes
            }
        }
        logDSEARCH && console.log(`xIFr: - Same list sorted: ${JSON.stringify(xtrImgURLs)}`);
        if (xtrImgURLsUnsorted.length > xtrImgURLs.length) {
            const difference = xtrImgURLsUnsorted.filter(
                (element) => !xtrImgURLs.includes(element)
            );
            console.warn(`xIFr: Something fell out the loop: ${difference}.`);
        }
        context.debug(
            'First extra background (or in SVG) image to check in SORTED list: ' + xtrImgURLs[0]
        );
        for (const xSrc of xtrImgURLs) {
            const imgData = xtrSizes.find((xs) => xs.src === xSrc);
            if (
                imgData?.width &&
                !blacklistedImage(imgData.src) &&
                ((request.deepSearchBigger &&
                    imgData.width * imgData.height > request.deepSearchBiggerLimit) ||
                    (!request.deepSearchBigger &&
                        imgData.width * imgData.height > deepSearchGenericLimit))
            ) {
                const image = {};
                image.imageURL = xSrc;
                image.mediaType = 'image';
                image.naturalWidth = imgData.width;
                image.naturalHeight = imgData.height;
                image.supportsDeepSearch = request.supportsDeepSearch;
                image.supportsDeepSearchModifier = request.supportsDeepSearchModifier;
                image.goDeepSearch = request.goDeepSearch;
                image.deepSearchBiggerLimit = request.deepSearchBiggerLimit;
                image.deepSearchBigger = request.deepSearchBigger;
                image.fetchMode = request.fetchMode;
                image.tabId = request.tabId;
                image.tabUrl = request.tabUrl;
                image.source = 'extra-search image'; // probably elem.nodeName, but not for sure
                image.context = request.nodeName + ' element'; // (not really anything to de with found image)
                image.baseURI = elem.baseURI;
                context.debug(
                    'extraSearch(): Returning found image (background or svg) ' +
                        JSON.stringify(image)
                );
                return image;
            }
        }
    }
}

export function deeperSearch(request, elem, xtrSizes) {
    context.debug(
        'Entering deeperSearch() with elem=' +
            elem.nodeName +
            ' and elem.parentNode=' +
            elem.parentNode?.nodeName
    );
    let image = extraSearch(request, elem, xtrSizes);
    if (!image) {
        context.debug('deeperSearch(): No image from extraSearch()');
        let parentElem = elem.parentNode;
        if (!parentElem && elem.host) {
            parentElem = elem.host;
            logDSEARCH &&
                console.log(
                    `xIFr/deeperSearch(): Using shadowDOM host element (${parentElem.nodeName.toLowerCase()}) as "parent elem" for next imageSearch()...`
                );
        }
        if (!parentElem) {
            context.debug(
                'deeperSearch(): Cannot go higher from ' +
                    elem.nodeName.toLowerCase() +
                    ', return without image! typeof elem.parentNode = ' +
                    typeof elem.parentNode
            );
            logDSEARCH &&
                console.log(
                    `xIFr/deeperSearch(): Cannot go higher from ${elem.nodeName.toLowerCase()}, return without image! typeof elem.parentNode = ${typeof elem.parentNode}.`
                );
            return; // no image found
        }
        context.debug(
            'deeperSearch(): Going from ' +
                elem.nodeName?.toLowerCase() +
                ' element, up to ' +
                parentElem.nodeName?.toLowerCase() +
                ' element...'
        );
        logDSEARCH &&
            console.log(
                `xIFr/deeperSearch(): Going from ${elem.nodeName} element, up to ${parentElem.nodeName} element...`
            );
        elem = parentElem;
        image = imageSearch(request, elem);
    }
    if (image) {
        context.debug('deeperSearch(): Return with image');
        // Check if bgAlternatives holds a better (jpeg-)alternative:
        let related = bgAlternatives.get(image.imageURL);
        if (related) {
            image.jpegURL = related.jpeg.url;
            image.jpegType = related.jpeg.type;
            image.imageType = related.other.type;
        }
        return image;
    } else {
        return deeperSearch(request, elem, xtrSizes);
    }
}
