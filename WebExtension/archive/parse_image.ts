// @ts-ignore
import { loadparseshow } from '../content_utils/load_parse_show';
import { getSerializableImage, searchImage } from '../deepsearch/search_image';
import { ImageSearchMessage, ImageSearchMessageResponse } from '../handlers/types';

/**
 * This is a legacy function that wraps a few steps
 * 1. getSerializableImage
 * 2. calls loadparseshow
 * or
 * 1. does a legacy search based off the xifr logic
 * @param request
 */
export const parseImage = (request: ImageSearchMessage) => {
    if (request.goDeepSearch) {
        /**************************************************************/
        /*  ***  Advanced mode with "deep-search" (Firefox 63+)  ***  */
        /**************************************************************/

        context.debug(' *** ADVANCED MODE WITH DEEP SEARCH *** ');

        getSerializableImage(request as ImageSearchMessage).then((imageDTO) => {
            if (imageDTO) {
                loadparseshow(imageDTO).catch((error: any) => {
                    console.error(`loadparsesearch threw error ${error.message}`);
                });
            }
        });
    } else if (typeof request.imageURL !== 'undefined' && request.mediaType === 'image') {
        /************************************************************************/
        /*  ***  Simple "legacy mode" (Chrome and older Firefox versions)  ***  */
        /*  ***      (or "deep search" forced disabled in options)         ***  */
        /************************************************************************/

        context.debug(" *** SIMPLE 'LEGACY' MODE *** ");
        context.debug('parseImage message received with URL = ' + request.imageURL);
        if (request.supportsDeepSearch)
            console.warn(
                'xIFr: Using simple "legacy mode" even though browser supports Deep Search'
            );
        const img = Array.from(document.images).find(
            (imgElem) => imgElem.currentSrc === request.imageURL
        );
        if (img) {
            const image: ImageSearchMessageResponse = {
                id: 'parseImage',
                imageURL: request.imageURL,
                mediaType: 'image',
                targetId: request.targetId,
                supportsDeepSearch: request.supportsDeepSearch,
                goDeepSearch: request.goDeepSearch,
                supportsDeepSearchModifier: request.supportsDeepSearchModifier,
                deepSearchBigger: request.deepSearchBigger,
                deepSearchBiggerLimit: request.deepSearchBiggerLimit,
                frameId: request.frameId,
                frameUrl: request.frameUrl ?? '',
                tabId: request.tabId,
                tabUrl: request.tabUrl ?? '',
                fetchMode: request.fetchMode,
                source: 'img element',
                context: request.nodeName + ' element', // (not really anything to de with found image),
                nativeWidth: img.naturalWidth,
                nativeHeight: img.naturalHeight,
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight,
                x: img.x,
                y: img.y,
                srcset: img.srcset,
                crossOrigin: img.crossOrigin ?? 'anonymous',
                referrerPolicy: img.referrerPolicy, // https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement
                baseURI: img.baseURI,
            };
            loadparseshow(image);
        } else {
            // Is it possible to arrive here? I'm not sure, but maybe if right-clicked image is in a shadowDOM?...
            // TODO: If so, maybe: New Image(request.imageURL); load promise -> dimensions ... ???
            context.LOGPARSEIMG &&
                console.warn('xIFr: Simple search did not find a match in document.images');
        }
    } else {
        // Normally we should NOT get here...
        console.error('xIFr: No image detected in simple search.');
    }
};
