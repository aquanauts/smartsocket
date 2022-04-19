function triggerEvent(name, ...args) {
    $('.view-container>*').trigger(name, args);
}

function subscribeEvent(elem, name, callback) {
    let deferred = $.Deferred();
    $(elem).on(name, (e, ...args) => {  
        if (callback) {
            callback(...args);
        } else {
            deferred.resolve(...args);
        }
    });
    return deferred;
}
