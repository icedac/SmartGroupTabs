document.addEventListener('DOMContentLoaded', function() {
    var form = document.getElementById('settingsForm');
    var rulesInput = document.getElementById('rules');

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