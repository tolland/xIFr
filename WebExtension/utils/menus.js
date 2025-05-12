globalThis.browser ??= chrome;

if (browser.menus?.getTargetElement) {
    browser.contextMenus = browser.menus;
}

var menus = function () {
    browser.runtime.onInstalled.addListener(({ reason }) => {
        if (reason === 'update') {
            browser.menus.removeAll();
        }
    });

    this.createMenuItem = function (useDeepSearch) {
        browser.contextMenus.create(
            {
                id: 'viewexif',
                title: browser.i18n.getMessage('contextMenuText'),
                // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/menus/ContextType
                contexts: useDeepSearch
                    ? ['image', 'link', 'page', 'frame', 'editable', 'video', 'audio']
                    : ['image'],
            },
            () => {
                if (browser.runtime.lastError) {
                    // TODO: Remove this log-line?
                    console.log(
                        'Menu-item probably already created: ' + browser.runtime.lastError.message
                    );
                } else {
                    context.log('Menu-item created.');
                }
            }
        );
    };
};
