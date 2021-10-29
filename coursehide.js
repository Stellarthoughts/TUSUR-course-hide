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

        init();

        var parentObserver = returnParentObserver();
        parentObserver.observe(document, {childList: true, subtree: true});
    
        var divObserver = returnDivObserver();
        divObserver.observe(document, {childList: true, subtree: true});

        window.addEventListener('load', function () {
            divObserver.disconnect();
        })
    }

)();

function init()
{
    var item = localStorage.getItem('course');
    if(item == null) window.toDelete = [];
    else window.toDelete = JSON.parse(item);
}

function returnParentObserver()
{
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
    return parentObserver;
}

function returnDivObserver()
{
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
    return divObserver;
}

function updateToDelete(entries)
{
    window.toDelete = entries;
    localStorage.setItem('course', JSON.stringify(entries));
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

    // delete from list toDelete
    var arr = window.toDelete;
    var ind = arr.indexOf(courseid);
    if(ind == -1) return;
    arr.splice(ind, 1);
    updateToDelete(arr);

    // reorg
    var coursediv = findCourseDiv(courseid);
    coursediv.classList.remove("ch_hidden_course");

    // add new button
    btn.remove();
    addButton(coursediv, window.toDelete);

    // color
    fixColor();

}

function addEntry(btn)
{
    var courseid = btn.name;

    // add to toDelete
    var arr = window.toDelete;
    if(arr.indexOf(courseid) == -1) arr.push(courseid);
    updateToDelete(arr);

    // reorg
    var coursediv = findCourseDiv(courseid);
    coursediv.classList.add("ch_hidden_course");
    
    // add new button
    btn.remove();
    addButton(coursediv, window.toDelete);

    // color
    fixColor();
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

function findClosestDisallowedNeighboor(courseid)
{
    for(var i = divsInOrderCourseId.indexOf(courseid) + 1; i < divsInOrderCourseId.length; i++)
    {
        if(toDelete.includes(divsInOrderCourseId[i])) return findCourseDiv(divsInOrderCourseId[i]);
    }
    return null;
}


function fixColor()
{
    var i;
    for(i = 0; i < divs.length; i++)
    {
        divs[i].classList.remove("first","odd","even","last");
        if(i == divs.length - 1) divs[i].classList.add("last");
    }
    for(i = 0; i < divs.length; i += 2)
    {
        if(divs[i].classList.contains("ch_hidden_course")) continue;
        divs[i].classList.add("odd");
    }
    for(i = 1; i < divs.length; i += 2)
    {
        if(divs[i].classList.contains("ch_hidden_course")) continue;
        divs[i].classList.add("even");
    }
    
    if(divs.length > 0 && ! (divs[i].classList.contains("ch_hidden_course"))) divs[0].classList.add("first");
}