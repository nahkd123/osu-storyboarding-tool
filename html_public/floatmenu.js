/*
made by nahkd123 uwu
*/
(function() {
    var Menus = {};

    var FloatMenu = {
        create(group = "default") {
            return {type: "menu", group: group, buttons: {}};
        },
        closeGroup(group = "default") {
            if (!Menus[group]) return;
            var dom = document.querySelector("floatmenu#" + group);
            dom.remove();
            Menus[group] = undefined;
        },
        displayMenu(menu, x = 0, y = 0) {
            this.closeGroup(menu.group);
            var menuDOM = document.createElement("floatmenu");
            menuDOM.style.left = x + "px";
            menuDOM.style.top = y + "px";
            menuDOM.id = menu.group;
            for (var buttonDisplay in menu.buttons) {
                var menuButton = document.createElement("button");
                menuButton.textContent = buttonDisplay;
                const buttonKey = buttonDisplay;
                if (menu.buttons[buttonDisplay].type === "menu") {
                    // submenu
                    menuButton.addEventListener("click", (event) => {FloatMenu.displayMenu(menu.buttons[buttonKey])});
                } else {
                    // run function then close menu
                    menuButton.addEventListener("click", (event) => {
                        FloatMenu.closeGroup(menu.group);
                        menu.buttons[buttonKey](event);
                    });
                }
                menuDOM.append(menuButton);
            }
            document.body.append(menuDOM);
            Menus[menu.group] = menu;
        }
    };

    window.FloatMenu = FloatMenu;
})();