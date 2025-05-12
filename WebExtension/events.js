



let keyShortcuts = (function KeyShortcuts() {
    const shortcuts = new Map();
    window.addEventListener("keydown", function keydownListener(event) {
        if (event.defaultPrevented) {
            return; // Do nothing if the event was already processed
        }
        if (!event.repeat && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
            if (shortcuts.has(event.key)) {
                shortcuts.get(event.key)(event); // Do the shortcut handler
                event.preventDefault();
            }
        }
    }, true);
    // window.addEventListener("keyup", function keyupListener(event) {
    //     if (event.defaultPrevented) {
    //         return; // Do nothing if the event was already processed
    //     }
    //     if (!event.repeat && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
    //         if (shortcuts.has(event.key)) {
    //             shortcuts.get(event.key)(event); // Do the shortcut handler
    //             event.preventDefault();
    //         }
    //     }
    // }, true);

    function register(key, handler) {
        // Add key/handler
        shortcuts.set(key, handler);
    }

    function unregister(key) {
        // Add key/handler
        shortcuts.delete(key);
    }

    // API:
    return {register};
})();
