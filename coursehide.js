(
    async function()
    {
        'use strict';
        // Глобальные переменные
        window.parent = null;
        window.divsParent = null;
        window.divs = [];
        window.divsInOrderCourseId = [];
        window.firstDeleted = null;
        window.toDelete = [];

        // Логгирование хранилищ
        chrome.storage.sync.get(['course'], function(res) {
            console.log("Chrome storage contents: " + res.course);
        });

        console.log("Local storage contents: " + localStorage.getItem('course'));

        // Инициализация хранилищ
        init();

        // Обзерверы для изменения порядка отрисовки курсов
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
    // Достаем список скрываемых курсов из локального хранилища
    var item = localStorage.getItem('course');
    var parsed = JSON.parse(item);

    // Если отстутсвует, пытаемся достать из хранилища хрома
    if(item == null)
    {
        console.log("Local storage item is null. Retrieving chrome storage");
        chrome.storage.sync.get(['course'], function(res) {
            // Если нет в хранилище, применяем дефолтные значения
            if(res == undefined)
            {
                console.log("Chrome storage contents are undefined. Setting default")
                window.toDelete = [];
                localStorage.setItem('course',JSON.stringify([]));
                chrome.storage.sync.set({course : []}, function() {});
            }
            else
            {
                console.log("Chrome storage contents found: " + res.course)
                var storage = JSON.parse(res.course);
                localStorage.setItem('course', JSON.stringify(storage));
                window.toDelete = storage;
                // Рестар страницы абсолютно необходим, так как стор хрома очень медленный и сработает позже обзерверов.
                // Делать асинхронную функцию не вариант, так как это замедлит работу сайта на каждой перезагрузке страницы
                window.location.reload(); 
            }
        });
    }
    else updateToDelete(parsed);
}

// Функция обновляет все возможные хранилища (локальное, хрома, глобальную переменную) новым списком скрываемых курсов
function updateToDelete(entries)
{
    var jsonEntries = JSON.stringify(entries);
    window.toDelete = entries;
    localStorage.setItem('course', jsonEntries);
    chrome.storage.sync.set({course : jsonEntries}, function() {
        console.log("Sync storage updated with " + jsonEntries);
    });
}

// Это нужно чтобы найти родительскую курсам ноду и сохранить ее у себя, так как по сути добавлением курсов мы занимаемся ручками. Вроде бы...
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

// Меняет порядок курсов в зависимости от того, скрыты они или нет.
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
                    //console.log(window.toDelete);
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

// Добавление кнопочки к каждому курсу
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

// Калбэк для действия на кнопке удаления из списка скрываемых
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

// Калбэк для действия на кнопке добавления в список скрываемых
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

// Вспомогательные функции
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

// Из-за шикарного и читаемого дизайна СДО ТУСУР так же требуется следить за чередованием цветов между курсами
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
    //console.log(divs);

    if(divs.length > 0 && ! (divs[divs.length - 1].classList.contains("ch_hidden_course"))) divs[0].classList.add("first");
}