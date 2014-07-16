/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Author: XrXr
 */
const { defer, all } = require("sdk/core/promise");
const PageWorker = require("sdk/page-worker").Page;
const data = require("sdk/self").data;

const ADD_ONS_PER_PAGE = 15;


function normalize (url) {
    url = url[url.length - 1] == "/" ? url.slice(0, url.length - 1) : url;
    return url.replace(/\/+/g, "/").replace("/", "//");
}

function get_page_url (base_url, page_number) {
    return base_url + "/?page=" + page_number;
}

function merge (add_on_lists) {
    // takes a list of add-on list object and combine them
    let installs = [];
    let manual_installs = [];
    add_on_lists.forEach(a => {
        installs.push(...a.installs);
        manual_installs.push(...a.manual_installs);
    });
    return {installs: installs, manual_installs: manual_installs};
}

function FetchResult (list, total_num) {
    if (!(this instanceof FetchResult)){
        return new FetchResult(list, total_num);
    }
    this.add_ons = list;
    this.total = total_num;
}

function fetch(url, fetch_total) {
    // Use page-worker to fetch add-ons, returns a promise and
    // a destroy function used for stopping the worker. The
    // destroy function will also reject to promise.
    // When fetch_total is true, promise resolves with a FetchResult,
    // or else resolve with the add-on list object

    let find_add_ons = defer();
    let find_total = defer();

    let worker = PageWorker({contentURL: url,
        contentScriptFile: data.url("content/get-add-ons.js"),
        contentScriptWhen: "ready"});  // we don't care about the pictures

    worker.port.on("found-add-ons", find_add_ons.resolve);

    worker.port.on("total", find_total.resolve);

    worker.port.on("no-add-ons-found",
        () => find_add_ons.resolve([]));

    worker.port.emit("get-total");
    worker.port.emit("get-add-ons");

    function destroyer () {
        worker.destroy();
        deferred.reject();
    }
    let master = find_add_ons.promise;
    if (fetch_total){
        master = all([find_add_ons.promise, find_total.promise]).
            then(list => {
                worker.destroy();
                return FetchResult(...list);
            });
    }
    return [master, destroyer];
}

function noop () {}

exports.Fetcher = function(){
    let destroyers = [];
    let fetch_target = "";

    return {
        // this has to called prior to calling start()
        set_url: url => fetch_target = url,
        start: () => {
            // Fetch all the add-ons in a collections
            // return a promise that resolves to an add-on list object
            if (destroyers.length !== 0){  // stop the previous batch if present
                for (let fn of destroyers){
                    fn();
                }
                destroyers = [];
            }
            let normalized = normalize(fetch_target);
            let list = normalized.split("/");
            let base = list.slice(0, list.length - 1).join("/");
            let deferred = defer();
            let new_destroyers = [];
            // fetch from first page
            let [promise, destroyer] = fetch(get_page_url(base, 1), true);
            new_destroyers.push(destroyer);
            promise.then(r => {
                let add_on_lists = [r.add_ons];
                let pages_left = Math.ceil(r.total / ADD_ONS_PER_PAGE) - 1;
                let page_promises = [];
                for (let pg = 2; pg < 2 + pages_left; pg++){
                    let [promise, destroyer] = fetch(get_page_url(base, pg));
                    // this will resolve when the fetch result
                    // is pushed into add_on_lists
                    page_promises.push(promise.then(add_on_lists.push, noop));
                    new_destroyers.push(destroyer);
                }
                // add_on_lists is fully populated
                all(page_promises).then(() =>{
                    // result master promise with the final result
                    deferred.resolve(merge(add_on_lists));
                    // bubble the error up since it won't be done automatically
                }, r => deferred.reject(r));
            });
            destroyers = new_destroyers;
            return deferred.promise;
        }
    };
};

// fetch("https:/addons.mozilla.org/en-US/firefox/collections/idenis/power/?page=1/")[0].then(r => console.log(r));
// fetch("https:/addons.mozilla.org/en-US/firefox/collections/idenis/power/?page=1/", true)[0].then(r => console.log(r));

let f = exports.Fetcher();
f.set_url("https:/addons.mozilla.org/en-US/firefox/collections/idenis/power/?page=1/");
f.start().then(console.log, console.log);