document.addEventListener('DOMContentLoaded', function() {
    var form = document.getElementById('settingsForm');
    var rulesInput = document.getElementById('rules');

    // Regroup Now button
    var regroupButton = document.getElementById('regroupButton');
    regroupButton.addEventListener('click', function() {
        var confirmation = confirm('Are you sure you want to regroup now?');
        if (confirmation) {
            chrome.windows.getCurrent({}, function(window) {
                // Send the window ID along with the action in the message
                chrome.runtime.sendMessage({ action: 'regroupTabs', windowId: window.id }, function(response) {
                    // Handle the response from background.js, if needed
                });
            });
        }
    });

    var cleanupButton = document.getElementById('cleanupButton');
    cleanupButton.addEventListener('click', function() {
        var confirmation = confirm('Are you sure you want to cleanup now?');
        if (confirmation) {
            chrome.windows.getCurrent({}, function(window) {
                // Send the window ID along with the action in the message
                chrome.runtime.sendMessage({ action: 'cleanupTabs', windowId: window.id }, function(response) {
                    // Handle the response from background.js, if needed
                });
            });
        }
    });

    function loadRules() {
        // Load the rules from storage and set the input value
        chrome.storage.sync.get('options', function (data) {
            if (data) {
                rulesInput.value = data.options;
            }
        });
    }

    // Load the rules when the page is loaded
    loadRules();

    // Save the rules when the form is submitted
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        chrome.storage.sync.set({options: rulesInput.value}, function() {
            // Reload the rules after they are saved
            loadRules();
        });
    });
});
