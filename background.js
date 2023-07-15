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
        chrome.windows.get(request.windowId, { populate: true }, function (window) {
            groupAllTabs(window);
        });
        sendResponse({ success: true, message: 'Tabs regrouped' });
    }
    else if (request.action === 'cleanupTabs') {
        // Use the window ID from the message to get the window
        chrome.windows.get(request.windowId, { populate: true }, async function (window) {
            cleanupTabs(window);
        });
        sendResponse({ success: true, message: 'Tabs cleaned up' });
    }
});

const colors = ["grey", "blue", "yellow", "red", "green", "pink", "purple", "cyan", "orange"]
function randomeColor() {
    return colors[parseInt(Math.random() * colors.length)]
}

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
    , {
        name: 'wasting time',
        color: "grey",
        cleanTabs: true,
        hosts: [
            '*.netflix.com'
            , '*.reddit.com'
        ]
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


function isTabUngrouped(tab) {
    if (tab.groupId && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) return false;
    return true;
}

async function groupTabIntl(tab, groups, currentWindow) {
    try {
        let groupName = genGroupName(tab.url);
        console.debug("group name:", groupName, "url:", tab.url)
        if (groupName == undefined || groupName == "") {
            return;
        }

        // If the tab already belongs to a group, don't re-group it
        if (!isTabUngrouped(tab)) return;

        // log groups only with name, id
        console.debug("groups:", groups.map(a => { return { title: a.title, id: a.id } }));

        const existedGroup = groups.find(a => a.title == groupName);
        const rule = rules.find(a => a.name == groupName);
        if (existedGroup == undefined) {
            // create group
            const createdGroupId = await chrome.tabs.group({
                createProperties: {
                    windowId: currentWindow.id
                },
                tabIds: tab.id
            });
            let color = randomeColor();
            if (rule != undefined &&  rule.color != undefined) color = rule.color;

            await chrome.tabGroups.update(createdGroupId, {
                color: color,
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

function ungroupedAndNotPinned(tab) {
    return isTabUngrouped(tab) && !tab.pinned;
}

// order ungrouped tab to after group, keep the current relative order
async function orderTabs(currentWindow) {
    console.debug("orderTabs");
    if (currentWindow == undefined) currentWindow = await chrome.windows.getCurrent({ populate: true });
    tabs = currentWindow.tabs;

    let ungroupedTabs = tabs.filter(ungroupedAndNotPinned);
    console.debug( ungroupedTabs.map( t => t.title ) );
    console.debug( ungroupedTabs );

    // Check if there are any ungrouped tabs
    if(ungroupedTabs.length > 0){
        // Get the index of the last tab in the window
        let lastIndex = tabs[tabs.length - 1].index;

        // Move all ungrouped tabs to the end of the window
        chrome.tabs.move( ungroupedTabs.map( t => t.id ), {index: lastIndex + 1});
    }
}

async function cleanupTabs(currentWindow) {
    console.debug("cleanupTabs");
    const tabGroups = await chrome.tabGroups.query({ windowId: currentWindow.id });
    // find rule with groupName
    for (let i = 0; i < tabGroups.length; i++) {
        // const existedGroup = groups.find(a => a.title == groupName);
        const tabGroup = tabGroups[i];
        const groupName = tabGroup.title;
        const rule = rules.find(a => a.name == groupName);
        console.debug("tabGroup:", tabGroup, "groupName:", groupName, "rule:", rule);
        if (rule != undefined && rule.cleanTabs != undefined && rule.cleanTabs == true) {
            console.debug("remove group", groupName, "tabGroup.id:", tabGroup.id);
            // remove all tabs from group
            const tabs = await chrome.tabs.query({ groupId: tabGroup.id });
            for (let j = 0; j < tabs.length; j++) {
                const tab = tabs[j];
                console.debug( "    - remove tab", tab.url, "tab.id:", tab.id);
                chrome.tabs.remove(tab.id);
            }
        }
    }

    await orderTabs(currentWindow);
}