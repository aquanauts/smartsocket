"use strict";
let routes = {};

function activateNavbar(hash) {
    $('.navbar .nav-link').removeClass('active');
    if (hash) {
        $(`.navbar .nav-link[href='${hash}']`).addClass('active');
    } else {
        $(`.navbar .nav-link[href='#home']`).addClass('active');
    }
}

function updateViewParams(newArgs) {
    const hashParts = window.location.hash.split('?');
    const viewName = hashParts[0];
    const viewArgs = new URLSearchParams();
    for (let [key, value] of Object.entries(newArgs)) {
        viewArgs.append(key, value);
    }
    window.location.hash = `${viewName}?${viewArgs.toString()}`;
}

function routerOnReady(customRoutes, context) {
    function showView(hash) {
        const hashParts = hash.split('?');
        const viewName = hashParts[0];
        const viewFn = window.routes[viewName];
        const params = {};
        for (let [key, value] of new URLSearchParams(hashParts[1]).entries()) {
            params[key] = value;
        }
        if (viewFn) {
            triggerEvent('router.addView', viewName);
            $('.view-container').empty().append(viewFn(params, context));
            activateNavbar(hash);
        }
    }

    window.routes = customRoutes;
    window.onhashchange = function() {
        showView(window.location.hash);
    };
    showView(window.location.hash);
}
