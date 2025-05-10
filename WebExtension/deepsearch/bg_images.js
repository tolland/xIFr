



export function updateBgAlternatives(bgimage) {
    // Does getComputedStyle() return exact same format in all browsers? If one day Chromium (or other
    // browsers) starts supporting "deep search", maybe re-visit this to verify the functionality!?...
    // https://developer.mozilla.org/en-US/docs/Web/CSS/background-image
    // https://developer.mozilla.org/en-US/docs/Web/CSS/image/image-set
    const optionsParser = /^(image-set\()?url\("(?<url>[^"]+)"\)\s(?<resolution>\S+)\stype\("(?<type>[^"]+)"\)/iu;
    // console.log('Computed background-image css with some image-set and type: ' + bgimage);
    const imageSets = bgimage.split(/(^\s*|\s+)(?=image-set)/u).filter((part) => part.startsWith('image-set('));
    for (const imageSet of imageSets) {
        // console.log('Looking at imageSet:' + imageSet);
        const imagedefs = imageSet.split(', ').filter((opts) => opts.includes('url(') && opts.includes('type('));
        // console.log('Computed background-image relevant imagedefs count:' + imagedefs.length);
        let jpegs = [];
        let others = [];
        for (const imagedef of imagedefs) {
            // console.log('Now image-def:' + imagedef);
            // Notice, we expect the properties/options of imagedef in order: (absolute)url, resolution, type. Like:
            // url("https://www.rockland.dk/img/test.avif") 1dppx type("image/avif")
            const options = imagedef.trim().match(optionsParser);
            if (options !== null) {
                // console.log('- Matched url: ' + options.groups.url);
                // console.log('- Matched resolution: ' + options.groups.resolution);
                // console.log('- Matched type: ' + options.groups.type);
                let obj = {
                    'url': options.groups.url,
                    'resolution': options.groups.resolution,
                    'type': options.groups.type
                };
                if (options.groups.type === 'image/jpeg') {
                    jpegs.push(obj);
                } else {
                    others.push(obj);
                }
            }
        }
        for (const other of others) {
            for (const jpeg of jpegs) {
                if (other.resolution === jpeg.resolution) {
                    bgAlternatives.set(other.url, {'other': other, 'jpeg': jpeg});
                }
            }
        }
    }
}



// Much of following based on code/concept from https://blog.crimx.com/2017/03/09/get-all-images-in-dom-including-background-en/ (by CRIMX) ...
export function getBgImgs(elem) {
    const srcChecker = /url\(\s*?['"]?\s*?(\S+?)\s*?["']?\s*?\)/giu;
    let extras = [];
    if (elem instanceof Element) extras.push(elem); // Includes elem (itself) unless elem is (f.ex.) document
    if ((elem instanceof DocumentFragment) && elem.host) extras.push(elem.host); // include host-element if elem is root of a shadowDOM
    return Array.from(
        extras.concat(Array.from(elem.querySelectorAll('*')))
            .reduce((collection, node) => {
                const cstyle = window.getComputedStyle(node, null);
                const display = cstyle.getPropertyValue('display');
                const visibility = cstyle.getPropertyValue('visibility');
                const appleHack = location.hostname.endsWith('.apple.com');
                if (display !== 'none' && visibility !== 'hidden') {
                    let bgimage = cstyle.getPropertyValue('background-image');
                    if (bgimage === 'none' && appleHack) {
                        // An experimental/temporary(?) site-specific hack for apple.music.com...
                        // I don't know how they do it (will have to investigate), but this works to
                        // get the background-image in headers of "itunes" artist pages (as of 08/2023):
                        bgimage = cstyle.getPropertyValue('--background-image');
                    }
                    if (bgimage.includes('image-set(') && bgimage.includes('type("image/jpeg")')) {
                        updateBgAlternatives(bgimage);
                    }
                    let match;
                    while ((match = srcChecker.exec(bgimage)) !== null) { // There might be multiple, like: background-image: url("img_tree.gif"), url("paper.gif");
                        collection.add(match[1]);
                    }
                }
                return collection;
            }, new Set())
    );
}

// Finding and loading image(s) embedded in inline SVG....
export function getSVGEmbeddedImages(elem) {
    return Array.from(
        (['image', 'feimage'].includes(elem.nodeName.toLowerCase()) ? [elem] : []).concat(Array.from(elem.querySelectorAll('svg image, svg feImage')))
            .reduce((collection, node) => {
                const cstyle = window.getComputedStyle(node, null);
                const display = cstyle.getPropertyValue('display');
                const visibility = cstyle.getPropertyValue('visibility');
                if (display !== 'none' && visibility !== 'hidden') {
                    if (node.href?.baseVal) {
                        collection.add(new URL(node.href.baseVal, node.baseURI).href);
                    }
                }
                return collection;
            }, new Set())
    );
} // But also: https://www.petercollingridge.co.uk/tutorials/svg/interactive/javascript/ ?