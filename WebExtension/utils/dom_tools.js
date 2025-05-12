/*
Add the image to the web page by:
* Removing every node in the document.body
* Inserting the selected image
*/
function injectImage(request, sender, sendResponse) {
    removeEverything();
    insertImage(request.imageURL);
}

/*
Remove every node under document.body
*/
function removeEverything() {
    while (document.body.firstChild) {
        document.body.firstChild.remove();
    }
}

/*
Given a URL to an image, create and style an iframe containing an
IMG node pointing to that image, then insert the node into the document.
*/
function insertImage(imageURL) {
    const insertImage = document.createElement('iframe');
    insertImage.setAttribute(
        'src',
        browser.runtime.getURL(`/viewer/viewer.html?blobURL=${imageURL}`)
    );
    insertImage.setAttribute('style', 'width: 100vw; height: 100vh;');
    document.body.appendChild(insertImage);
}
