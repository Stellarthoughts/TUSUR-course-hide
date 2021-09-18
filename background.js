(
    function()
    {
        var toDelete = [];

        chrome.runtime.onInstalled.addListener( function(){
            chrome.storage.sync.get({'course' : []}, function(entries) {
                toDelete = entries.course;
                chrome.storage.sync.set({'course': entries.course}, function() {});
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