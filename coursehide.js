(
    function()
    {
        'use strict';
        window.parent = null;
        window.divsParent = null;
        window.divs = [];
        window.divsInOrderCourseId = [];
        window.firstDeleted = null;
        window.toDelete = [];

        chrome.storage.sync.get(['course'], function(entries){
            console.log(entries.course);
            window.toDelete = deserializeEntries(entries.course);
            console.log(window.toDelete);
        });

        var parentObserver = new MutationObserver(function(mutations, parentObserver) {
            for (var i=0; i<mutations.length; i++) {
                var mutationAddedNodes = mutations[i].addedNodes;
                for (var j=0; j<mutationAddedNodes.length; j++)
                {
                    var node = mutationAddedNodes[j];
                    if (node.classList && node.classList.contains("frontpage-course-list-enrolled"))
                    {
                        window.divsParent = node;
                        window.parent = node.parentElement;
                        parentObserver.disconnect();
                        return;
                    }
                }
            }
        });
        parentObserver.observe(document, {childList: true, subtree: true});

        var divObserver = new MutationObserver(function(mutations, divObserver) {
            for (var i=0; i<mutations.length; i++) {
                var mutationAddedNodes = mutations[i].addedNodes;
                for (var j=0; j<mutationAddedNodes.length; j++)
                {
                    var node = mutationAddedNodes[j];
                    if (node.classList && node.classList.contains("coursebox")) {

                        // Store in order
                        divsInOrderCourseId.push(node.dataset.courseid);

                        // Buttons
                        console.log(window.toDelete);
                        addButton(node, window.toDelete);

                        // Rearange & Add Style
                        divObserver.disconnect();
                        if(toDelete.includes(node.dataset.courseid))
                        {
                            if(window.firstDeleted == null) window.firstDeleted = node;
                            else window.divsParent.insertBefore(node,null);
                            node.classList.remove("odd","even","first");
                            node.classList.add("ch_hidden_course");
                            divs.push(node);
                        }
                        else 
                        {
                            if(firstDeleted != null) 
                            {
                                window.divsParent.insertBefore(node,window.firstDeleted);
                                window.divs.splice(divs.indexOf(window.firstDeleted),0,node);
                            }
                            else divs.push(node);

                            // Fix color
                            var index = window.divs.indexOf(node);
                            node.classList.remove("odd","even","first");
                            if(index == 0) node.classList.add("first");
                            if(index % 2 == 0) node.classList.add("odd");
                            else node.classList.add("even");
                        }

                        divObserver.observe(document, {childList: true, subtree: true});
                    }
                }
            }
        });
        divObserver.observe(document, {childList: true, subtree: true});

        window.addEventListener('load', function () {
            divObserver.disconnect();
        })

    }

)();

function updateToDelete(entries)
{
    var sEntries = serializeEntries(entries);
    window.toDelete = entries;
    chrome.storage.sync.set({'course':sEntries}, function() {
        console.log(sEntries);
    });
}

function addButton(node, toDeleteHere)
{
    var btn = document.createElement("button");
    var btndiv = document.createElement("div");

    btn.name = node.dataset.courseid;
    btn.classList.add("ch_btn");
    btndiv.classList.add("ch_btn_div");

    if(toDeleteHere.includes(node.dataset.courseid))
    {
        btn.classList.add("ch_btn_deleted")
        btn.type = "deleted";
        btn.onclick = function () {deleteEntry(this);};
    }
    else
    {
        btn.classList.add("ch_btn_allowed")
        btn.type = "allowed";
        btn.onclick = function () {addEntry(this);};
    }

    node.appendChild(btndiv);
    btndiv.appendChild(btn);
}

function deleteEntry(btn)
{
    var courseid = btn.name;

    chrome.storage.sync.get(['course'], function(entries){
        var arr = deserializeEntries(entries.course);
        var ind = arr.indexOf(courseid);
        if(ind == -1) return;
        arr.splice(ind, 1);
        updateToDelete(arr);

        // reorg
        var coursediv = findCourseDiv(courseid);
        var coursedivInd = divs.indexOf(coursediv);
        var neighboor = findClosestAllowedNeighboor(courseid);
        console.log(neighboor);
        if(neighboor == null)
        {
            var firstDeletedInd = divs.indexOf(firstDeleted);
            // TODO: индексы портятся
            var temp = divs[coursedivInd];
            divs[coursedivInd] = divs[firstDeletedInd];
            divs[firstDeletedInd] = temp;
            divsParent.insertBefore(coursediv,firstDeleted);
        }
        else 
        {
            var neighboorInd = divs.indexOf(neighboor);
            var temp = divs[coursedivInd];
            divs[coursedivInd] = divs[neighboorInd];
            divs[neighboorInd] = temp;
            divsParent.insertBefore(coursediv,neighboor);
        }
        coursediv.classList.remove("ch_hidden_course");

        // button
        btn.remove();
        addButton(coursediv, window.toDelete);

        // color
        fixColor();
    });
}

function addEntry(btn)
{
    var courseid = btn.name;

    chrome.storage.sync.get(['course'], function(entries){
        console.log(entries.course);
        var arr = deserializeEntries(entries.course);
        if(arr.indexOf(courseid) == -1) arr.push(courseid);
        updateToDelete(arr);

        var coursediv = findCourseDiv(courseid);
        btn.remove();
        addButton(coursediv, window.toDelete);
    });
}

function deserializeEntries(s) // from string to arr
{
    var arr = [];
    if(typeof s.links === 'undefined' || s == null || s.length == 0) return arr;
    arr = s.split(' ');
    return arr;
}

function serializeEntries(arr) // from arr to string
{
    var s = "";
    if(arr == null || arr.length == 0) return s;
    s = arr.join(' ');
    return s;
}

function findCourseDiv(courseid)
{
    for(var i = 0; i < divs.length; i++)
    {
        if(window.divs[i].dataset.courseid == courseid) return window.divs[i];
    }
    return null;
}

function findClosestAllowedNeighboor(courseid)
{
    for(var i = divsInOrderCourseId.indexOf(courseid) + 1; i < divsInOrderCourseId.length; i++)
    {
        if(!toDelete.includes(divsInOrderCourseId[i])) return findCourseDiv(divsInOrderCourseId[i]);
    }
    return null;
}

function fixColor()
{
    var i;
    for(i = 0; i < divs.length; i += 2)
    {
        if(divs[i].classList.contains("ch_hidden_course")) break;
        divs[i].classList.remove("first","odd","even");
        divs[i].classList.add("odd");
    }
    for(i = 1; i < divs.length; i += 2)
    {
        if(divs[i].classList.contains("ch_hidden_course")) break;
        divs[i].classList.remove("first","odd","even");
        divs[i].classList.add("even");
    }

    if(divs.length > 0 && !divs[i].classList.contains("ch_hidden_course")) divs[0].classList.add("first");
}