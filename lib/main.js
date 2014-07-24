/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Author: XrXr
 */
const { ActionButton } = require("sdk/ui/button/action");
const data = require("sdk/self").data;
const pm = require("sdk/page-mod");
const tabs = require("sdk/tabs");
const { MatchPattern } = require("sdk/util/match-pattern");
const {Cu} = require("chrome");
const notifications = require("sdk/notifications");
const { all } = require("sdk/core/promise");
const fetcher = require("fetcher").Fetcher();

Cu.import("resource://gre/modules/AddonManager.jsm");

const is_collection = new MatchPattern(/.*\/\/addons.mozilla.org\/.+\/firefox\/collections\/.+\/.+/);

const active_icon = {
    "32": data.url("icons/active32.png"),
    "64": data.url("icons/active64.png")
};
const inactive_icon = {
    "32": data.url("icons/inactive32.png"),
    "64": data.url("icons/inactive64.png")
};

let sidebar = null;
let sidebar_worker = null;
let install_list = null;
let install_signals = {
    success : [],
    dl_fail : [],
    install_fail: [],
    clear: function() {
        this.success = [];
        this.dl_fail = [];
        this.install_fail = [];
    },
    send_all: function() {
        for (var i = 0; i < this.success.length; i++) {
            sidebar_worker.port.emit('install-finished', this.success[i]);
        }
        for (i = 0; i < this.dl_fail.length; i++) {
            // not used
            sidebar_worker.port.emit('download-failed', this.dl_fail[i]);
        }
        for (i = 0; i < this.install_fail.length; i++) {
            // not used
            sidebar_worker.port.emit('install-failed', this.install_fail[i]);
        }
    }
};

function show_sidebar(collection_title) {
    if (sidebar === null){
        sidebar = require("sdk/ui/sidebar").Sidebar({
            id: 'install-collection',
            title: 'Install Collection',
            url: require("sdk/self").data.url("sidebar/sidebar.html")
        });
    }
    sidebar.once('attach', function (worker) {
        sidebar_worker = worker;
        worker.port.on("loaded", function() {
            worker.port.emit('collection-title', collection_title);
            if (install_list){
                worker.port.emit('install', install_list);
                install_signals.send_all();
            }
        });
        worker.port.on("all-done", function(add_ons){
            //destroy the sidebar to allow for recreation
            sidebar.onHide = function() {
                sidebar.dispose();
                sidebar = null;
            };
            install_list = null;
            install_signals.clear();
        });
        worker.port.on("confirm-install",function(add_ons){
            add_ons.installs.forEach(a => AddonManager.
                getInstallForURL(a.link, get_install_callback(a.name),
                "application/x-xpinstall"));
            install_list = add_ons;
            worker.port.emit('install', add_ons);
        });
    });
    sidebar.show();
}

function install_listener(name){
    return {
        onDownloadProgress : function (aInstall){
            let progress_update = {};
            progress_update.name = name;
            progress_update.progress = aInstall.progress / aInstall.maxProgress;
            sidebar_worker.port.emit('progress-update', progress_update);
        },
        onInstallEnded : function(aInstall, add_on) {
            let finished = {
                name : name,
                needs_restart: add_on.pendingOperations ===
                    AddonManager.PENDING_INSTALL
            };
            sidebar_worker.port.emit('install-finished', finished);
            install_signals.success.push(finished);
        },

        onDownloadFailed : function(aInstall){
            sidebar_worker.port.emit('download-failed', name);
            install_signals.dl_fail.push(name);
        },

        onInstallFailed : function(aInstall){
            sidebar_worker.port.emit('install-failed', name);
            install_signals.install_fail.push(name);
        }
    };
}

function get_install_callback (name) {
    return function (aInstall) {
        aInstall.install();
        aInstall.addListener(install_listener(name));
    };
}

function notify_side_bar (add_ons) {
    sidebar_worker.port.emit("add-ons", add_ons);
}

function start_install() {
    let current_title = tabs.activeTab.title;
    let sep = tabs.activeTab.title.indexOf("::");
    let collection_title = "";
    if (sep > -1){
        collection_title = current_title.slice(0, sep - 1);
    }
    show_sidebar(collection_title);
    let current_url = tabs.activeTab.url;
    if (fetcher.currently_fetching !== current_url){
        // when button is clickable, update() already ensured that the url is a collection url
        fetcher.set_url(tabs.activeTab.url);
        fetcher.start().then(notify_side_bar, noop);
    }
}

function noop() {}

function update_button(active){
    install_button.removeListener("click", start_install);
    if (active){
        install_button.icon = active_icon;
        install_button.label = "Click to install add-ons from this collection!";
        install_button.on("click", start_install);
    } else {
        install_button.icon = inactive_icon;
        install_button.label = "Cannot install add-ons form current page";
    }
}

function update(tab){
    if (tab !== tabs.activeTab){  // we only care about the active tab
        return;
    }
    if (is_collection.test(tab.url)){
        update_button(true);
        return;
    }
    fetcher.set_url("");
    update_button(false);
}

tabs.on('activate', update);
tabs.on('pageshow', update);

let install_button = ActionButton({
    id: "install-button",
    label: "Cannot install add-ons form current page",
    icon: inactive_icon,
    onClick: noop
});

exports.onUnload = function (reason) {
    if (reason === "shutdown"){
        return;
    }
    fetcher.stop_all();
};