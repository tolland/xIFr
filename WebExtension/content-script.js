// const imageIds = ['test2', 'test4'];
//
// const loadButton = document.createElement('button');
// loadButton.innerText = 'Load images';
// loadButton.addEventListener('click', handleLoadRequest);
//
// document.querySelector('body').append(loadButton);
//
// function handleLoadRequest() {
//   for (const id of imageIds) {
//     const element = document.getElementById(id);
//     element.src = chrome.runtime.getURL(`${id}.png`);
//   }
// }
//

(async () => {
    // const startInspector = () => {

    // firefox examples suggest this is the way to go
    // if (window.hasRun) {
    //     return;
    // }
    // window.hasRun = true;

    // var keyhanders = keyShortcuts();

    let keysDown = new Set();
    let elementsOver = new Set();

    const {
        loadImg,
        loadImgAll,
        blacklistedImage,
        imageSearch,
        extraSearch,
        deeperSearch,
        logDSEARCH,
        deepSearchGenericLimit,
    } = await import(chrome.runtime.getURL('./deepsearch/image_search.js'));

    function isImage(element) {
        return element instanceof self.Image || element instanceof self.HTMLImageElement;
    }

    function canHaveImage(element) {
        return (
            element instanceof self.HTMLImageElement ||
            element instanceof self.HTMLDivElement ||
            element instanceof self.HTMLSpanElement
        );
    }

    function hotElement(event) {
        if (isImage(event.target) && event.target.complete) {
            if (!elementsOver.has(event.target)) {
                eventLogger(event);
                elementsOver.add(event.target);
                event.target.classList.add('hot');
                // addLabelToElement(event.target, 'Image');
                event.target.classList.add('hot_image');
                
                if (event.shiftKey && event.ctrlKey) {
                    const overlay = createOverlay(event.target);
                    overlay.element.textContent = 'Your metadata here';
                    // console.log(
                    //     'is Image. current keys are ' +
                    //         `"${Array.from(keysDown).map(String).join('","')}"`
                    // );
                }
            }
        }
        //event.target.style.border.style.border = '5px solid green';
    }

    function coolElement(event) {
        if (elementsOver.delete(event.target)) {
            eventLogger(event);
            event.target.classList.remove('hot');
            event.target.classList.remove('hot_image');
            event.target.classList.add('cool');
            Array.from(document.body.getElementsByClassName('metadata-overlay')).forEach(
                (label) => {
                    label.remove();
                }
            );
        }
        //event.target.style.border = '5px solid yellow';
    }

    function addLabelUsingAfter(element, label) {}

    function createOverlay(imageElement) {
        const overlay = document.createElement('div');
        overlay.className = 'metadata-overlay';
        overlay.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 10000;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 8px;
        border-radius: 4px;
    `;
        document.body.appendChild(overlay);

        // Initial positioning
        updateOverlayPosition();

        // Handle window resize and image load
        window.addEventListener('resize', updateOverlayPosition);
        imageElement.addEventListener('load', updateOverlayPosition);

        function updateOverlayPosition() {
            const rect = imageElement.getBoundingClientRect();
            console.dir(rect);
            console.dir(rect.bottom + 15);
            overlay.style.left = `${rect.left + 20}px`;
            overlay.style.top = `${rect.height - 25}px`; // 5px gap below image

            // Optional: Ensure overlay doesn't go off-screen
            const overLayRect = overlay.getBoundingClientRect();
            if (overLayRect.right > window.innerWidth) {
                console.log('handling offscreen horizontal');
                overlay.style.left = `${window.innerWidth - overLayRect.width - 5}px`;
            }
            if (overLayRect.bottom > window.innerHeight) {
                console.log('handling offscreen vertical');
                overlay.style.top = `${rect.top - overLayRect.height - 55}px`; // Show above image instead
            }
        }

        return {
            element: overlay,
            cleanup: () => {
                window.removeEventListener('resize', updateOverlayPosition);
                imageElement.removeEventListener('load', updateOverlayPosition);
                overlay.remove();
            },
        };
    }

    function addLabelToElement(element, label) {
        let labelElement = document.createElement('div');
        labelElement.innerText = label;
        labelElement.style.position = 'absolute';
        // labelElement.style.tex
        labelElement.style.top = '50%';
        labelElement.style.left = '50%';
        labelElement.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
        labelElement.style.padding = '2px';
        labelElement.style.border = '1px solid black';
        labelElement.classList.add('xifr_label');
        element.appendChild(labelElement);
    }

    function eventLogger(event) {
        // console.dir(event);
        if (event.shiftKey && event.ctrlKey) {
            // console.dir(elementsOver);
            let related = event.relatedTarget ? event.relatedTarget : 'unknown';

            //if (event.type == '')
            //console.dir(event);
            console.log(
                `event.type = ${event.type}` +
                    ' keys ' +
                    `"${Array.from(keysDown).map(String).join('","')}"` +
                    ' element stack count is ' +
                    elementsOver.size +
                    ` related target is $${related}`
            );

            //console.log(`into ${event.target} from ${related}`);
        }
    }

    const onMouseOver = (ev) => {
        // if ( blueNodes.length === 0 ) { return; }
        // blueNodes = [];
        // highlightElements();
        hotElement(ev);
    };

    const onMouseLeave = (ev) => {
        coolElement(ev);
    };

    const onMouseEnter = (ev) => {
        hotElement(ev);
    };

    const onMouseOut = (ev) => {
        //coolElement(ev);
    };
    const onKeyDown = (ev) => {
        keysDown.add(ev.key);
    };
    const onKeyUp = (ev) => {
        keysDown.delete(ev.key);
    };

    const onReady = () => {
        /**
         * ===== Check and set a global guard variable. =====
         * If this content script is injected into the same page again,
         * it will do nothing next time.
         */

        try {
            console.log('here in injecting beastify');
            if (window.hasRun) {
                console.log('returning - because hasrun');
                return;
            }
            window.hasRun = true;
        } catch (e) {
            console.log('window is likely dead');
        }
        //document.body.style.border = '5px solid blue';
        // window.addEventListener('scroll', onScrolled, {
        //     capture: true,
        //     passive: true,
        // });
        window.addEventListener('mouseenter', onMouseEnter, {
            capture: true,
            passive: true,
        });
        window.addEventListener('mouseover', onMouseOver, {
            capture: true,
            passive: true,
        });
        window.addEventListener('mouseleave', onMouseLeave, {
            capture: true,
            passive: true,
        });
        window.addEventListener('mouseout', onMouseOut, {
            capture: true,
            passive: true,
        });
        window.addEventListener('keydown', onKeyDown, {
            capture: true,
            passive: true,
        });
        window.addEventListener('keyup', onKeyUp, {
            capture: true,
            passive: true,
        });
        // document.addEventListener('mousemove', ev => {
        //     console.log("mouse moved");
        //     const x = ev.clientX;
        //     const y = ev.clientY;
        //     console.log("x: ", x, "y: ", y);
        // }, {passive: true});
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady, { once: true });
    } else {
        onReady();
    }

    // startInspector();
    //
    // // // console.log("registering dom content loaded")
    // //
    // // document.addEventListener("DOMContentLoaded", function () {
    // //     console.log("dom content loaded");
    // //     var main = document.getElementById("main");
    // //     if (main) {
    // //         console.log(main);
    // //         main.style.border = "5px solid green";
    // //     }
    // //     //document.body.style.border = "5px solid red";
    // //
    // // });

    /*
    Assign injectImage() as a listener for messages from the extension.
    */
    //browser.runtime.onMessage.addListener(injectImage);
})();
