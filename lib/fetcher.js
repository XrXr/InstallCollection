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

function FetchResult (list, total_num) {
    if (!(this instanceof FetchResult)){
        return new FetchResult(list, total_num);
    }
    this.add_ons = list;
    this.total = total_num;
}

function make_resolver (worker, deferred) {
    return function(playload){
        worker.destroy();
        deferred.resolve(playload);
    };
}

function fetch(url, fetch_total) {
    // Use page-worker to fetch add-ons, returns a promise and
    // a destroy function used for stopping the worker. The
    // destroy function will also reject the promise.
    // When fetch_total is true, promise resolves with a FetchResult,
    // otherwise it resolves with an add_on_list object
    let find_add_ons = defer();
    let find_total = defer();

    let worker = PageWorker({contentURL: url,
        contentScriptFile: data.url("content/get-add-ons.js"),
        contentScriptWhen: "ready"});  // we don't care about the pictures

    let find_add_ons_resolver = make_resolver(worker, find_add_ons);
    let find_total_resolver = make_resolver(worker, find_total);

    worker.port.on("found-add-ons", find_add_ons_resolver);
    worker.port.on("total", find_total_resolver);

    worker.port.on("no-add-ons-found", _ => {
        worker.destroy();
        find_add_ons.resolve(null);
    });

    if (fetch_total){
        worker.port.emit("get-total");
    }
    worker.port.emit("get-add-ons");

    let destroyed = false;
    function destroyer () {
        if (destroyed){
            return false;
        }
        worker.destroy();
        find_add_ons.reject();
        find_total.reject();
        return (destroyed = true);
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

function merge (add_on_lists) {
    // flaten a list of add_on_lists into one add_on_list
    let installs = [];
    let manual_installs = [];
    for (let e of add_on_lists){
        installs.push(...e.installs);
        manual_installs.push(...e.manual_installs);
    }
    return {installs: installs, manual_installs: manual_installs};
}

function noop () {}

exports.Fetcher = function(){
    let destroyers = [];
    let fetch_target = "";
    function stop_all () {
        // stop the previous batch if present
        if (destroyers.length !== 0){
            for (let fn of destroyers){
                fn();
            }
            destroyers = [];
        }
    }
    return {
        // this has to called prior to calling start()
        set_url: url => fetch_target = url,
        currently_fetching: fetch_target,
        stop_all: stop_all,
        start: () => {
            // Fetch all the add-ons in a collections
            // return a promise that resolves to an add-on list object
            stop_all();
            let normalized = normalize(fetch_target);
            let list = normalized.split("/");
            let is_multi_page = /\?page=[0-9]+$/.test(list[list.length - 1]);
            let first_page_url = list.join("/");
            let base;
            if (is_multi_page){
                base = list.slice(0, list.length - 1).join("/");
                first_page_url = get_page_url(base, 1);
            }

            let deferred = defer();

            let master_reject = () => {
                currently_fetching = "";
                deferred.reject();
            };
            let master_resolve = add_on_list => {
                currently_fetching = "";
                deferred.resolve(add_on_list);
            };
            let new_destroyers = [];
            // fetch from first page
            let [first_promise, destroyer] = fetch(first_page_url, is_multi_page);
            new_destroyers.push(destroyer);
            first_promise.then(r => {
                if (!is_multi_page){
                    master_resolve(r);
                    return;
                }

                let pages_left = Math.ceil(r.total / ADD_ONS_PER_PAGE) - 1;
                // make a list of promises
                let page_promises = [];
                for (let pg = 2; pg < 2 + pages_left; pg++){
                    let [promise, destroyer] = fetch(get_page_url(base, pg));
                    page_promises.push(promise);
                    // make sure this can be stopped at anytime
                    new_destroyers.push(destroyer);
                }
                all(page_promises).then(add_on_lists => {
                    add_on_lists.unshift(r.add_ons);
                    master_resolve(merge(add_on_lists));
                }, master_reject).then(noop, err => {
                    console.error("Merging failed! Error came from " +
                        err.fileName + " line ", err.lineNumber);
                    throw err;
                }).then(noop, master_reject);
            }, master_reject).then(noop, err => {
                console.error(err);
                throw err;
            }).then(noop, master_reject);
            destroyers = new_destroyers;
            return deferred.promise;
        }
    };
};
exports.fetch = fetch;
exports.merge = merge;