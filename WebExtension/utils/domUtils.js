

function getTopOverlay() {
    let overlays = document.querySelectorAll('.overlay:not([hidden])');
    return overlays[overlays.length - 1];
}