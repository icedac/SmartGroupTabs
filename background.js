chrome.runtime.onInstalled.addListener(function (details) {
    details && "install" == details.reason && groupAllTabs();
});

chrome.tabs.onCreated.addListener(function (tab) {
    groupTab(tab);
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.url != undefined) {
        groupTab(tab);
    }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'regroupTabs') {
        // Use the window ID from the message to get the window
        chrome.windows.get(request.windowId, { populate: true }, function (window) {
            // Call groupAllTabs with the window object
            groupAllTabs(window);
        });
        sendResponse({ message: 'Tabs regrouped' });
    }
});


const colors = ["grey", "blue", "yellow", "red", "green", "pink", "purple", "cyan"]
const defaultRules = [
    {
        name: 'work',
        hosts: [
            '*.github.com',
            '*.atlassian.net'
        ]
    }
    , {
        name: 'document',
        hosts: [
            '*.openai.com',
            '*.learn.microsoft.com'
        ]
    }
    , {
        name: 'ask',
        hosts: ['*.openai.com']
    }
];

const defaultOptions = {
    groupingDefault: true,
    rules: defaultRules
};

// Listen for the installation event
chrome.runtime.onInstalled.addListener(function (details) {
    // Check if the extension is being installed (as opposed to updated, etc.)
    if (details.reason === 'install') {
        // Set the default rules
        chrome.storage.sync.set({
            options: JSON.stringify(defaultOptions, null, 2)
        });
    }
});

chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (var key in changes) {
        if (key === 'options') {
            loadRules();
        }
    }
});

let options = {};
let rules = [];

// Load the rules from storage
function loadRules() {
    chrome.storage.sync.get('options', function (data) {
        try {
            console.log("options:\n", data.options);
            options = JSON.parse(data.options);
            if (options.rules) {
                rules = options.rules;
            }
        }
        catch (e) {
            console.error("invalid options, reset to default", e);
            chrome.storage.sync.set({
                options: JSON.stringify(defaultOptions, null, 2)
            });
            options = defaultOptions;
            rules = options.rules;
        }
    });
}

loadRules();

function genGroupName(url) {
    url = new URL(url);
    let hostname = url.hostname;

    // Check if the hostname matches any of the user rules
    for (let i = 0; i < rules.length; i++) {
        let rule = rules[i];
        for (let j = 0; j < rule.hosts.length; j++) {
            let host = rule.hosts[j];
            if (host.startsWith('*.')) {
                // Remove the '*.' from the rule and check if the hostname ends with it
                var ruleHost = host.slice(2);
                if (hostname.endsWith(ruleHost)) {
                    return rule.name;
                }
            } else if (hostname === host) {
                return rule.name;
            }
        }
    }

    let skipDefaltPage = options && options.groupingDefault != undefined && options.groupingDefault == false;

    if (url.protocol !== "http:" && url.protocol !== "https:") {
        // if (url == "chrome://newtab/") {
        // split protocol and name
        let protocol = url.protocol.substr(0, url.protocol.length - 1);
        let name = url.href.substr(protocol.length + 3);
        // remove trailing slash from name
        if (name.endsWith("/")) {
            name = name.substr(0, name.length - 1);
        }
        console.debug("protocol:", protocol, "name:", name);
        if (skipDefaltPage && name == "newtab") {
            return "";
        }
        return protocol;
    }

    if (skipDefaltPage) {
        return "";
    }

    let hostName = url.hostname;
    let groupName = hostName.startsWith("www.") ? hostName.substr(4) : hostName;
    return groupName;
}

async function groupAllTabs(currentWindow) {
    console.debug("groupAllTabs");
    if (currentWindow == undefined) currentWindow = await chrome.windows.getCurrent({ populate: true });
    tabs = currentWindow.tabs;
    for (let i = 0; i < tabs.length; i++) {
        await groupTab(tabs[i], currentWindow);
    }
}

async function groupTab(tab) {
    if (tab.url == "" || tab.pinned) {
        return;
    }

    const currentWindow = await chrome.windows.get(tab.windowId, { populate: true });

    const groups = await chrome.tabGroups.query({ windowId: tab.windowId });

    await groupTabIntl(tab, groups, currentWindow);
}

async function groupTabIntl(tab, groups, currentWindow) {
    try {
        let groupName = genGroupName(tab.url);
        console.debug("group name:", groupName, "url:", tab.url)
        if (groupName == undefined || groupName == "") {
            return;
        }

        // If the tab already belongs to a group, don't re-group it
        if (tab.groupId && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
            return;
        }

        // log groups only with name, id
        console.debug("groups:", groups.map(a => { return { title: a.title, id: a.id } }));

        const existedGroup = groups.find(a => a.title == groupName);
        if (existedGroup == undefined) {
            // create group
            const createdGroupId = await chrome.tabs.group({
                createProperties: {
                    windowId: currentWindow.id
                },
                tabIds: tab.id
            });

            await chrome.tabGroups.update(createdGroupId, {
                color: colors[parseInt(Math.random() * 10)],
                title: groupName,
            });
        }
        else {
            console.debug("update group", groupName, "existedGroup.id:", existedGroup.id, "tab.id:", tab.id);
            const gorupId = await chrome.tabs.group(
                {
                    groupId: existedGroup.id,
                    tabIds: tab.id
                });
        }
    }
    catch (e) {
        console.error(e)
    }
}
