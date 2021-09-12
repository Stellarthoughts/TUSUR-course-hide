(
    function()
    {
        var toDelete = [];

        chrome.runtime.onInstalled.addListener( function(){
            chrome.storage.sync.get({'course' : []}, function(entries) {
                chrome.storage.local.set({'course': entries.course}, function() {});
                toDelete = entries.course;
            });
        });

        chrome.runtime.onMessage.addListener( function (request, sender, sendResponse) {
            if(request.greeting == "getToDelete")
            {
                sendResponse({farewell: toDelete});
            }
        });
    }
)();