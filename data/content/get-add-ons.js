self.port.on("get-add-ons", function() {
    const ITEM_CLASS = "item";
    const BUTTON_CLASS = "button  add installer";
    const NEED_MANUAL = "button contrib go  installer";
    var item_blocks = document.getElementsByClassName(ITEM_CLASS);
    var installs = [];
    var manual_installs = [];
    if (item_blocks.length === 0){
        self.port.emit("no-add-ons-found", 'nothing at all');
        return;
    }
    for (var c = 0; c < item_blocks.length; c++) {
        var install_buttons = item_blocks[c].getElementsByClassName(BUTTON_CLASS);
        var contrib_buttons = item_blocks[c].getElementsByClassName(NEED_MANUAL);
        if (install_buttons.length > 0) {
            for (let d = 0; d < install_buttons.length; d++) {
                if (install_buttons[d].clientWidth !== 0 &&
                    install_buttons[d].clientHeight !== 0) {
                    //probably not the best way to check if an add-on can be installed,
                    //but works well enough
                    installs.push({name: item_blocks[c].getElementsByTagName('h3')[0]
                        .getElementsByTagName('a')[0]
                        .text.trim(),
                        link: install_buttons[d].href});
                }
            }
        }
        if (contrib_buttons.length > 0){
            for (let d = 0; d < contrib_buttons.length; d++) {
                if (contrib_buttons[d].clientWidth !== 0 &&
                    contrib_buttons[d].clientHeight !== 0) {
                    //probably not the best way to check if an add-on can be installed,
                    //but works well enough
                    manual_installs.push({name: item_blocks[c].getElementsByTagName('h3')[0]
                        .getElementsByTagName('a')[0]
                        .text.trim(),
                        link: contrib_buttons[d].href});
                }
            }
        }
    }
    if (installs.length === 0) {
        self.port.emit("no-add-ons-found", 'nothing available');
        return;
    }
    self.port.emit('found-add-ons', {installs: installs, manual_installs: manual_installs});

    // for (var i = 0; i < xpi_links.length; i++) {
    //     console.log(addon_titles[i] + " " + xpi_links[i]);
    // }
});

self.port.emit('collection-page');