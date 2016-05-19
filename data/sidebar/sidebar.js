/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Author: XrXr
 */
const ENABLED = 'btn btn-success';
const DISABLED = 'btn btn-default';
const P_NORMAL = "progress-bar";
const P_SUCCESS = "progress-bar progress-bar-success";
const P_RESTART = "progress-bar progress-bar-warning";

// name space
var install_collection = {};

// modules
install_collection.Add_on = function(name, link){
    var parent = this;
    this.name = m.prop(name);
    this.link = m.prop(link);
    this.progress = m.prop(0);
    this.progress_class = m.prop(P_NORMAL);
    this.button_class = m.prop(ENABLED);
    this.get_simple = () => ({name: parent.name(), link: parent.link()});
};

// views
install_collection.error_view = function(ctrl){
    return m("div", {class: "middle error-x"}, [
        m("div", {class:"text-under", style:{left: "-69px", width: "180px", fontSize: "18px"}},
        [m("p", {},["Couldn't find any add-on to install"])])
    ]);
};

install_collection.fetching_view = function(ctrl){
  return m("div", {id:"floatingCirclesG", class: "middle"}, [
      m("div", {class:"f_circleG", id:"frotateG_01"}
      ),
      m("div", {class:"f_circleG", id:"frotateG_02"}
      ),
      m("div", {class:"f_circleG", id:"frotateG_03"}
      ),
      m("div", {class:"f_circleG", id:"frotateG_04"}
      ),
      m("div", {class:"f_circleG", id:"frotateG_05"}
      ),
      m("div", {class:"f_circleG", id:"frotateG_06"}
      ),
      m("div", {class:"f_circleG", id:"frotateG_07"}
      ),
      m("div", {class:"f_circleG", id:"frotateG_08"}
      ),
      // note that Mithril is safe by default, so "<script>alert('good day')</script>"
      // as title would just show up as text
      m("div", {class:"text-under"}, [m("p", ["Fetching from"]),
                                      m("p", [ctrl.collection_title])])
    ]);
};

install_collection.install_view = function(ctrl){
    return [m('button', {type: 'button',
            class: "btn btn-info utility-button center-block",
            onclick: () => ctrl.manually_install(install_collection.install_view)},
            "Need manual install"), m('br'),
            ctrl.installs.map(function (add_on, index){
        return m('div', {style: {margin:'0 5% 0 5%'}},[
                    m('div', {class: 'progress'},[
                        m('div', {class: add_on.progress_class(),
                            role: 'progressbar',
                            style: {width: Math.round(
                                add_on.progress()*100) + '%'}}),
                        m('div',{style:{position: "relative"}},[
                            m('div', {class: 'progress-text'},
                            add_on.name())
                        ])
                    ])
            ]);
    })];
};

install_collection.selection_view = function(ctrl){
    return m('div',[m('button', {type: 'button',
            class: "btn btn-danger center-block",
            onclick: ctrl.confirm_install,
            disabled: !ctrl.clear_to_install()},
            "Install Selected"),
        m('button', {type: 'button',
            class: "btn btn-info utility-button center-block",
            onclick: ctrl.toggle_all},
            "Toggle all"),
        m('button', {type: 'button',
            class: "btn btn-info utility-button center-block",
            onclick: () => ctrl.manually_install(install_collection.selection_view),
            style: ctrl.manual_installs.length > 0 ? {} : {display: "none"}},
            "Need manual install (" + ctrl.manual_installs.length + ")"),
        m('input', {type: "text", placeholder: "Filter add-ons", class: "form-control",
            value: ctrl.filter_pattern,
            oninput: ctrl.filter_add_ons}),
        m('div', {style:{textAlign: "center"}}, ["Old add-ons will be updated"]),
        m('hr', {style:{marginTop:"10px", marginBottom:"10px"}}),
        m('table', ctrl.filtered.map(function (add_on, index){
            return m('tr', [
                m('td',{style: {padding: "0 0 5px 5px"}},[
                    m('button',{onclick: m.withAttr('class', function(value){
                        if (value.trim() == ENABLED){
                            add_on.button_class(DISABLED);
                        } else {
                            add_on.button_class(ENABLED);
                        }
                        render.selection(ctrl);
                    }),
                        type: 'button', class: add_on.button_class()},
                        add_on.name())
                    ])
                ]
            );
        }))]
    );
};

install_collection.confirm_install_view = function(ctrl) {
    return m('div', [m('p', {style:{textAlign: "center"}},
        ["Install add-ons only from authors whom you trust",
            m('br'),
            "Malicious software can damage your computer or violate your privacy"]),
            m('button', {type: 'button',
                         class: "btn btn-danger btn-lg center-block",
                         onclick: confirm, disabled:ctrl.confirm_timer() !== null},
                ["I accept the risks", m('br'), ctrl.confirm_timer()])
        ]);
};

install_collection.manually_install_view = function (view, ctrl) {
    ctrl.update_lock = true;
    return m('div', [m('p', {style:{textAlign: "center"}},
            "The following add-ons cannot be installed automatically"),
        m('button', {
            type: 'button',
            class: "btn btn-info utility-button center-block",
            onclick: () => {
                ctrl.update_lock = false;
                m.render(document.body, view(ctrl));
            }
        }, "Back"),
        m('br'),
        m('ul', {style:{paddingLeft: 0, listStyle: "none"}},
            ctrl.manual_installs.map(
                e => m('li', {style:{textAlign: "center"}},
            [m('a', {href: e.link()}, e.name())])))
        ]);
};
// controller
install_collection.install_controller = function(){
    var ctrl = this;
    this.update_lock = false;
    this.collection_title = "";
    this.installs = [];
    this.manual_installs = [];
    this.confirm_timer = m.prop(3);
    this.filter_pattern = "";
    this.filtered = this.installs;

    this.filter_add_ons = event => {
        this.filter_pattern = event.target.value;
        var keyword = event.target.value.toLowerCase();
        ctrl.filtered = ctrl.installs.filter(a => a.name().toLowerCase().contains(keyword));
        render.selection(ctrl);
    };

    this.clear_to_install = function() {
        return ctrl.installs.some(e => e.button_class() == ENABLED);
    };

    this.add = function(name, link) {
        if (name) {
            ctrl.installs.push(new install_collection.Add_on(name, link));
        }
    };

    this.add_manual = function(name, link) {
        if (name) {
            ctrl.manual_installs.push(new install_collection.Add_on(name, link));
        }
    };

    this.clear = function() {
        ctrl.installs = [];
        ctrl.manual_installs = [];
    };

    this.update_lists = function(add_ons) {
        ctrl.clear();
        add_ons.installs.forEach(a => ctrl.add(a.name, a.link));
        add_ons.manual_installs.forEach(a => ctrl.add_manual(a.name, a.link));
        ctrl.filtered = ctrl.installs;
    };

    this.confirm_install = function() {
        render.confirm_install(ctrl);
        ctrl.confirm_timer(3);
        function subtract(times) {
            if (times === 0){
                return;
            }
            window.setTimeout(function(){
                ctrl.confirm_timer(ctrl.confirm_timer() - 1);
                if (ctrl.confirm_timer() === 0){
                    ctrl.confirm_timer(null);
                }
                render.confirm_install(ctrl);
                subtract(times - 1);
            }, 1000);
        }
        subtract(3);
    };

    this.toggle_all = function() {
        var deselect = ctrl.installs.some(function(e) {
            return e.button_class() == ENABLED;
        });
        if (deselect){
            ctrl.installs.forEach(e => e.button_class(DISABLED));
        } else {
            ctrl.installs.forEach(e => e.button_class(ENABLED));
        }
        render.selection(ctrl);
    };

    this.manually_install = function(view) {
        m.render(document.body, install_collection.manually_install_view(view, ctrl));
    };
};

var ctrl = new install_collection.install_controller();
// for (var i = 0; i < 100; i++) {
//     ctrl.add(String.fromCharCode(65 + Math.random() * 57,
//                                  65 + Math.random() * 57,
//                                  65 + Math.random() * 57),
//              "Good luck!");
// }
// ctrl.add_manual("Write code", "Good luck!");
// ctrl.installs[0].progress(0.5);
// console.log(ctrl.installs.length); //2

function render_view (view, ctrl) {
    // I can do this since none of the view funcitons depend on "this"
    m.render(document.body, view(ctrl));
}

var render = {
    selection: ctrl => render_view(install_collection.selection_view, ctrl),
    install: ctrl => render_view(install_collection.install_view, ctrl),
    confirm_install: ctrl => render_view(install_collection.confirm_install_view, ctrl),
    fetching: ctrl => render_view(install_collection.fetching_view, ctrl),
    error: ctrl => render_view(install_collection.error_view, ctrl),
};
// render.fetching(ctrl);

function confirm() {
    var add_ons = {installs: [],
        manual_installs: ctrl.manual_installs.map(e => e.get_simple())};
    ctrl.installs.forEach(a => {
        if (a.button_class() == ENABLED){
            add_ons.installs.push(a.get_simple());
        }
    });
    addon.port.emit("confirm-install", add_ons);
}

function get_add_on_by_name(name) {
    for (var i = 0; i < ctrl.installs.length; i++) {
        if (ctrl.installs[i].name() == name){
            return ctrl.installs[i];
        }
    }
}

addon.port.on("collection-title", function(title){
    // entry point
    ctrl.collection_title = title;
    render.fetching(ctrl);
});

addon.port.on("add-ons", function(add_ons) {
    if (!add_ons){
        render.error(ctrl);
        return;
    }
    ctrl.update_lists(add_ons);
    render.selection(ctrl);
});

addon.port.on("install", function(add_ons) {
    // entry point when installation is in progress
    ctrl.update_lists(add_ons);
    render.install(ctrl);
});

addon.port.on("progress-update", function(progress_update) {
    get_add_on_by_name(progress_update.name).
        progress(progress_update.progress);
    if (!ctrl.update_lock){
        render.install(ctrl);
    }
});

addon.port.on("install-finished", function(finished) {
    var add_on = get_add_on_by_name(finished.name);
    add_on.progress(1);
    if (finished.needs_restart){
        add_on.progress_class(P_RESTART);
        add_on.name(add_on.name() + " - Needs restart");
    } else {
        add_on.progress_class(P_SUCCESS);
    }
    if (!ctrl.update_lock){
        render.install(ctrl);
    }
    if (!ctrl.installs.some(e => e.progress_class() == P_NORMAL)){
        addon.port.emit("all-done");
    }
});

addon.port.emit("loaded");