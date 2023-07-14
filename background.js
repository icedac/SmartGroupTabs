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

    if (url.protocol !== "http:" && url.protocol !== "https:") {
        return url.protocol.substr(0, url.protocol.length - 1);
    }

    if (options && options.groupingDefault != undefined && options.groupingDefault == false) {
        return "";
    }

    let hostName = url.hostname;
    let groupName = hostName.startsWith("www.") ? hostName.substr(4) : hostName;
    return groupName;
}

let tabIdx = 0;
let allTabs = [];

function onGroupTabComplete() {
    tabIdx++;
    if (tabIdx < allTabs.length) {
        let tab = allTabs[tabIdx];
        groupTab(tab, onGroupTabComplete);
    }
}

function groupAllTabs() {
    console.debug("groupAllTabs");
    chrome.tabs.query(
        {
            currentWindow: true
        }, function (tabs) {
        tabIdx = 0;
        allTabs = tabs;
        groupTab(allTabs[tabIdx], onGroupTabComplete);
    });
}

function groupTab(tab, complete) {
    if (tab.url == "" || tab.pinned) {
        complete && complete();
        return;
    }

    chrome.windows.getCurrent(function (currentWindow) {
        chrome.tabGroups.query(
            {
                windowId: currentWindow.id
            }, function (groups) {
            groupTabIntl(tab, groups, currentWindow, complete);
        })
    });
}

function groupTabIntl(tab, groups, currentWindow, complete) {
    try {
        let groupName = genGroupName(tab.url);
        if ( groupName == undefined || groupName == "") {
            // do nothing
            return;
        }
        const existedGroup = groups.find(a => a.title == groupName);
        if (existedGroup == undefined) {
            chrome.tabs.group(
                {
                    createProperties:
                    {
                        windowId: currentWindow.id,
                    },
                    tabIds: tab.id
                }, function (groupId) {
                console.debug("add group", groupName);
                chrome.tabGroups.update(groupId,
                    {
                        color: colors[parseInt(Math.random() * 10)],
                        title: groupName,
                    }, function (group) {
                    console.debug("group added", group.title);
                    complete && complete();
                });
            })
        }
        else {
            console.debug("update group", groupName);
            chrome.tabs.group(
                {
                    groupId: existedGroup.id,
                    tabIds: tab.id
                }, function (groupId) {
                console.debug("group updated", groupName);
                complete && complete();
            })
        }
    }
    catch (e) {
        console.error(e)
    }
}