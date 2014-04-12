const { ActionButton } = require("sdk/ui/button/action");
const data = require("sdk/self").data;
const pm = require("sdk/page-mod");
const tabs = require("sdk/tabs");
const { MatchPattern } = require("sdk/util/match-pattern");
const {Cu} = require("chrome");
const notifications = require("sdk/notifications");
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
var install_button = ActionButton({
    id: "install-button",
    label: "Cannot install add-ons form current page",
    icon: inactive_icon,
    onClick: install
});

tabs.on('activate', update_button);
tabs.on('pageshow', update);


function update_button(){
    if (is_collection.test(tabs.activeTab.url)){
        install_button.icon = active_icon;
        install_button.label = "Click to install add-ons from this collection!";
        install_button.onClick = install;
    } else {
        install_button.icon = inactive_icon;
        install_button.label = "Cannot install add-ons form current page";
        install_button.onClick = function(){};
    }
}

var page_worker = null;
function update(tab){
    if (tab != tabs.activeTab){
        return; //we only care about what is active
    }
    if (is_collection.test(tab.url)){
        page_worker = tab.attach({
            contentScriptFile: data.url("content/get-add-ons.js")
        });
        page_worker.port.on("collection-page", function() {
            // console.log("this page is definitely a AMO add-on collection page");
        });
        page_worker.port.on("no-add-ons-found", function(reason) {
            var text = "";
            if (reason == 'nothing at all'){
                text = "couldn't find any add-ons on the page";
            }
            if (reason == 'nothing available'){
                text = "no add-ons on the page can be installed";
            }
            // console.log(reason);
            notifications.notify({
                title: "Install Collection",
                text: text,
            });
        });
        page_worker.port.on('found-add-ons', function(add_ons){
            show_side_bar(add_ons, false);
        });
    }
    //we should be destroying the worker when the test fails, but that would cause
    //model.cotentWorker to be null untill the tab is remade, cause an error everytime
    //we try to reattach the script
    update_button();
}

function install() {
    if (install_list !== null){
        console.log('I kept the list');
        show_side_bar(install_list, true);
        return;
    }
    if (page_worker !== null){
        page_worker.port.emit('get-add-ons');
        return;
    }
}

var sidebar = null;
var install_list = null;
var side_bar_worker = null;
var install_signals = {
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
            console.log(this.success[i]);
            side_bar_worker.port.emit('install-finished', this.success[i]);
        }
        for (i = 0; i < this.dl_fail.length; i++) {
            side_bar_worker.port.emit('download-failed', this.dl_fail[i]);
        }
        for (i = 0; i < this.install_fail.length; i++) {
            side_bar_worker.port.emit('install-failed', this.install_fail[i]);
        }
    }
};
function show_side_bar (add_ons) {
    if (sidebar === null){
        sidebar = require("sdk/ui/sidebar").Sidebar({
            id: 'my-sidebar',
            title: 'Install Collection',
            url: require("sdk/self").data.url("side_bar/side_bar.html"),
            onAttach: function (worker) {
                worker.port.on("loaded", function() {
                    // console.log("sidebar loaded");
                    side_bar_worker = worker;
                    if (install_list === null){
                        worker.port.emit("add-ons", add_ons);
                    }else{
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
                    for (var i = 0; i < add_ons.names.length; i++) {
                        let name = add_ons.names[i]; 
                        AddonManager.getInstallForURL(add_ons.urls[i],
                            install_callback(name, worker), "application/x-xpinstall");
                    }
                    worker.port.emit('install', add_ons);
                    install_list = add_ons;
                });
            },
            onDetach: function() {
                console.log("Detached");
            }
        });
    }
    sidebar.show();
}

function install_listener(name){
    return {
        onDownloadProgress : function (aInstall){
            let progress_update = {};
            progress_update.name = name;
            progress_update.progress = aInstall.progress / aInstall.maxProgress;
            side_bar_worker.port.emit('progress-update', progress_update);
        },
        onInstallEnded : function(aInstall, add_on) {
            let finished = {
                name : name,
                needs_restart: add_on.pendingOperations ===
                    AddonManager.PENDING_INSTALL
            }; 
            side_bar_worker.port.emit('install-finished', finished);
            install_signals.success.push(finished);
        },

        onDownloadFailed : function(aInstall){
            side_bar_worker.port.emit('download-failed', name);
            install_signals.dl_fail.push(name);
        },

        onInstallFailed : function(aInstall){
            side_bar_worker.port.emit('install-failed', name);
            install_signals.install_fail.push(name);
        }
    };
}

function install_callback (name, side_bar_worker) {
    //WoooOOoOo closure
    return function (aInstall) {
        aInstall.install();
        aInstall.addListener(install_listener(name));
    };
}