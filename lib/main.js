const { ActionButton } = require("sdk/ui/button/action");
const data = require("sdk/self").data;
const pm = require("sdk/page-mod");
const tabs = require("sdk/tabs");
const { MatchPattern } = require("sdk/util/match-pattern");
const {Cu} = require("chrome");
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

var worker = null;

function install() {
    if (sidebar){
        console.log('installing');
        sidebar.show();
        return;
    }
    if (worker !== null){
        worker.port.emit('get-add-ons');
    }
}

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

function update(tab){
    if (tab != tabs.activeTab){
        return; //we only care about what is active
    }
    if (is_collection.test(tab.url)){
        worker = tab.attach({
            contentScriptFile: data.url("content/get-add-ons.js")
        });
        worker.port.on("collection-page", function() {
            // console.log("this page is definitely a AMO add-on collection page");
        });
        worker.port.on("no-add-ons-found", function(reason) {
            // console.log(reason);
            console.log('todo: lock this page with action button state()');
        });
        worker.port.on('found-add-ons', function(add_ons){
            show_side_bar(add_ons);
        });
    }
    //we should be destroying the worker when the test fails, but that would cause
    //model.cotentWorker to be null untill the tab is remade, cause an error everytime
    //we try to reattach the script
    update_button();
}
var sidebar = null;
function show_side_bar (add_ons) {
    if (sidebar === null){
        sidebar = require("sdk/ui/sidebar").Sidebar({
            id: 'my-sidebar',
            title: 'Install Collection',
            url: require("sdk/self").data.url("side_bar/side_bar.html"),
            onAttach: function (worker) {
                worker.port.on("loaded", function() {
                    // console.log("sidebar loaded");
                    worker.port.emit("add-ons", add_ons);
                });
                worker.port.on("all-done",function(add_ons){
                    //destroy the sidebar to allow for recreation
                    sidebar.onHide = function() {
                        sidebar.dispose();
                        sidebar = null;
                    };
                });
                worker.port.on("confirm-install",function(add_ons){
                    for (var i = 0; i < add_ons.names.length; i++) {
                        let name = add_ons.names[i];
                        AddonManager.getInstallForURL(add_ons.urls[i],
                            function(aInstall) {
                                aInstall.install();
                                aInstall.addListener({
                                    onDownloadProgress: function (aInstall){
                                        let progress_update = {};
                                        progress_update.name = name;
                                        progress_update.progress = aInstall.progress / aInstall.maxProgress;
                                        worker.port.emit('progress-update', progress_update);
                                    },
                                    onInstallEnded: function(aInstall, add_on) {
                                        let finished = {
                                            name : name,
                                            needs_restart: add_on.pendingOperations ===
                                                AddonManager.PENDING_INSTALL
                                        }; 
                                        worker.port.emit('install-finished', finished);
                                    },
                                    onDownloadFailed: function(aInstall){
                                        worker.port.emit('download-failed', name);
                                    },
                                    onInstallFailed: function(aInstall){
                                        worker.port.emit('install-failed', name);
                                    }
                                });
                        }, "application/x-xpinstall");
                    }
                    worker.port.emit('install', add_ons);
                });
            },
            onDetach: function() {
                console.log("Detached");
            }
        });
    }
    sidebar.show();
}