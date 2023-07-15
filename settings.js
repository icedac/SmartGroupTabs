var notifications = [];
const height = 46;

function showNotification(message, color) {
    // Create a new notification element
    var notification = document.createElement('div');
    notification.innerHTML = message;
    notification.className = "notification show";
    notification.style.bottom = (height * notifications.length) + "px"; // Stack the notifications
    if (color != undefined ) notification.style.color = color || "rgba(196, 196, 196, 0.7)";
    document.body.appendChild(notification);
    
    // Push to our notifications array
    notifications.push(notification);

    // Remove the notification after 3 seconds
    setTimeout(function() { 
        notification.className = "notification";
        notifications.shift(); // Remove from our notifications array

        // Lower the rest of the notifications
        for (var i = 0; i < notifications.length; i++) {
            notifications[i].style.bottom = (height * i) + "px";
        }

        // Remove the notification element after the fade out animation
        setTimeout(function() {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', function() {
    var form = document.getElementById('settingsForm');
    var rulesInput = document.getElementById('rules');


    // Regroup Now button
    document.getElementById('regroupButton').addEventListener('click', function() {
        var confirmation = confirm('Are you sure you want to regroup now?');
        if (confirmation) {
            chrome.windows.getCurrent({}, function(window) {
                // Send the window ID along with the action in the message
                chrome.runtime.sendMessage({ action: 'regroupTabs', windowId: window.id }, function(response) {
                    // Handle the response from background.js, if needed
                    showNotification(response.message);
                });
            });
        }
    });

    document.getElementById('cleanupButton').addEventListener('click', function() {
        var confirmation = confirm('Are you sure you want to cleanup now?');
        if (confirmation) {
            chrome.windows.getCurrent({}, function(window) {
                // Send the window ID along with the action in the message
                chrome.runtime.sendMessage({ action: 'cleanupTabs', windowId: window.id }, function(response) {
                    // Handle the response from background.js, if needed
                    showNotification(response.message);
                });
            });
        }
    });

    document.getElementById('ungroupButton').addEventListener('click', function() {
        var confirmation = confirm('Are you sure you want to ungroup all now?');
        if (confirmation) {
            chrome.windows.getCurrent({}, function(window) {
                // Send the window ID along with the action in the message
                chrome.runtime.sendMessage({ action: 'ungroupTabs', windowId: window.id }, function(response) {
                    // Handle the response from background.js, if needed
                    showNotification(response.message);
                });
            });
        }
    });
    document.getElementById('orderTabButton').addEventListener('click', function() {
        chrome.windows.getCurrent({}, function(window) {
            // Send the window ID along with the action in the message
            chrome.runtime.sendMessage({ action: 'orderTabs', windowId: window.id }, function(response) {
                // Handle the response from background.js, if needed
                showNotification(response.message);
            });
        });
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
            showNotification("Options saved!", "rgba(111, 111, 196, 0.7)");
        });
    });
});
