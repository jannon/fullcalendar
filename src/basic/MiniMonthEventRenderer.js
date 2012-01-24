function MiniMonthEventRenderer() {
    var t = this;
    
    
    BasicEventRenderer.call(t);
    
    // exports
    t.renderEvents = renderEvents;
    t.compileSegs = compileSegs;
    //t.clearEvents = clearEvents;
    //t.bindDaySeg = bindDaySeg;
    t.daySegHTML = daySegHTML;
    t.renderDaySegs = renderDaySegs;
    t.getEventClass = getEventClass;
    
    // imports
    
    var opt = t.opt;
    var trigger = t.trigger;
    //var setOverflowHidden = t.setOverflowHidden;
    var isEventDraggable = t.isEventDraggable;
    var isEventResizable = t.isEventResizable;
    var reportEvents = t.reportEvents;
    var reportEventClear = t.reportEventClear;
    var reportEventElement = t.reportEventElement;
    var eventElementHandlers = t.eventElementHandlers;
    var showEvents = t.showEvents;
    var hideEvents = t.hideEvents;
    var eventDrop = t.eventDrop;
    var getDaySegmentContainer = t.getDaySegmentContainer;
    var getHoverListener = t.getHoverListener;
    var renderDayOverlay = t.renderDayOverlay;
    var clearOverlays = t.clearOverlays;
    var getRowCnt = t.getRowCnt;
    var getColCnt = t.getColCnt;
    var resizableDayEvent = t.resizableDayEvent;
    var allDayBounds = t.allDayBounds;
    var colContentLeft = t.colContentLeft;
    var colContentRight = t.colContentRight;
    var dayOfWeekCol = t.dayOfWeekCol;
    var daySegCalcHSides = t.daySegCalcHSides;
    var daySegSetWidths = t.daySegSetWidths;
    var daySegCalcHeights = t.daySegCalcHeights;
    var bindDaySeg = t.bindDaySeg;
    var getRowDivs = t.getRowDivs;
    var getRowTops = t.getRowTops;
    
    
    function getEventClass(events) {
        var len = events === undefined ? 0 : events.length,
            className = len > 0 ? events[0].className.join(' ') : '',
            i;

        for(i = 0; i < len; i++) {
            if(className != events[i].className.join(' ')) {
               return 'fc-event-multi ';
            }
        }
        return className;
    }
    
    function sliceSegs(events, visEventEnds, start, end) {
        var segs = [],
            i, j, len=events.length, event,
            eventStart, eventEnd,
            eventDays, numDays, day,
            isStart, isEnd;
        for (i=0; i<len; i++) {
            event = events[i];
            eventStart = event.start;
            eventEnd = visEventEnds[i];
            if (eventEnd > start && eventStart < end) {
                eventDays = getDays(eventStart, eventEnd);
                numDays = eventDays.length;

                isStart = eventStart >= start;
                isEnd = eventEnd <= end;

                for(j=0; j < numDays; j++) {
                    day =  eventDays[j];
                    if (day < start) continue;
                    if (day >= end) break;

                    segs.push({
                        event: event,
                        start: day,
                        end: addDays(cloneDate(day), 1),
                        isStart: isStart && j == 0,
                        isEnd: isEnd && j == (numDays - 1),
                        msLength: DAY_MS
                    });
                }

            }
        }
        return segs.sort(segCmp);
    }
    
    function stackSegs(segs) {
        //assumes segs is an array sorted by segment date
        var newSegs = [],
            len = segs.length,
            j = 0, seg, i, d, s, e;
    
        for (i=0; i<len; i++) {
            seg = segs[i];
            s = cloneDate(seg.start);
            e = cloneDate(seg.end);
            if (i == 0) {
                d = s;
            } else if (s.getDay() > d.getDay()) {
               j++;
               d = s;
           }
           if (newSegs[j]) {
               newSegs[j].events.push(seg.event);
               newSegs[j].isStart = newSegs[j].isStart && seg.isStart;
               newSegs[j].isEnd = newSegs[j].isEnd && seg.isEnd;
           } else {
               newSegs[j] = {
                   events: [seg.event],
                   isStart: seg.isStart,
                   isEnd: seg.isEnd,
                   start: s,
                   end: e,
                   msLength: seg.msLength
               };
           }
        }
        return newSegs;
    }
    
    function compileSegs(events) {
        var rowCnt = getRowCnt(),
            colCnt = getColCnt(),
            d1 = cloneDate(t.visStart),
            d2 = addDays(cloneDate(d1), colCnt),
            visEventsEnds = $.map(events, exclEndDay),
            i, row,
            j, level,
            seg, segs=[];

        for (i=0; i<rowCnt; i++) {
            row = stackSegs(sliceSegs(events, visEventsEnds, d1, d2));
            for(j=0; j < row.length; j++) {
                seg = row[j];
                seg.row = i;
                seg.level = 0;
                segs.push(seg);
            }
            addDays(d1, 7);
            addDays(d2, 7);
        }
        return segs;
    }
    
    function daySegHTML(segs) {
        var segmentContainer = getDaySegmentContainer(),
            rtl = opt.isRTL,
            i, j, segCnt = segs.length, seg,
            events, numEvents,
            classes,
            bounds = allDayBounds(),
            minLeft = bounds.left,
            maxLeft = bounds.right,
            leftCol,
            rightCol,
            left, right,
            html='',
            startDay, endDay;
            
        // calculate desired position/dimensions, create html
        for (i = 0; i < segCnt; i++) {
            seg = segs[i];
            events = seg.events;
            startDay = seg.start.getDay();
            endDay = seg.end.getDay();
            classes = ['fc-event', 'fc-event-skin', 'fc-event-hori', 'fc-dow-' + startDay];
            if (rtl) {
                if (seg.isStart) {
                    classes.push('fc-corner-right');
                }
                if (seg.isEnd) {
                    classes.push('fc-corner-left');
                }
                leftCol = dayOfWeekCol(seg.end.getDay()-1);
                rightCol = dayOfWeekCol(seg.start.getDay());
                left = seg.isEnd ? colContentLeft(leftCol) : minLeft;
                right = seg.isStart ? colContentRight(rightCol) : maxLeft;
            } else {
                if (seg.isStart) {
                    classes.push('fc-corner-left');
                }
                if (seg.isEnd) {
                    classes.push('fc-corner-right');
                }
                leftCol = dayOfWeekCol(seg.start.getDay());
                rightCol = dayOfWeekCol(seg.end.getDay()-1);
                left = seg.isStart ? colContentLeft(leftCol) : minLeft;
                right = seg.isEnd ? colContentRight(rightCol) : maxLeft;                
            }
            classes.push(getEventClass(events));
            html +=
                "<div class='" + classes.join(' ') + "' style='position:absolute;z-index:8;left:"+left+"px'></div>";
            seg.left = left;
            seg.outerWidth = right - left;
            seg.startCol = leftCol;
            seg.endCol = rightCol + 1; // needs to be exclusive
        }
        return html;
    }
    
    
    function daySegElementResolve(segs, elements, modifiedEventId) { // sets seg.element
        var i, j, segCnt = segs.length,
            seg,
            events,
            element,
            triggerRes,
            numEvents;
        
        for (i = 0; i < segCnt; i++) {
            seg = segs[i];
            events = seg.events;
            numEvents = events.length;
            element = $(elements[i]); // faster than .eq()
            triggerRes = trigger('eventRender', null, events, element);
            if (triggerRes === false) {
                element.remove();
            }else{
                if (triggerRes && triggerRes !== true) {
                    triggerRes = $(triggerRes)
                        .css({
                            position: 'absolute',
                            left: seg.left
                        });
                    element.replaceWith(triggerRes);
                    element = triggerRes;
                }
                seg.element = element;
                for(j = 0; j < numEvents; j++) {
                    if (events[j]._id === modifiedEventId) {
                        bindDaySeg(events[j], element, seg);
                    } else {
                        element[0]._fci = i; // for lazySegBind
                    }
                    reportEventElement(events[j], element);
                }
            }
        }
    }
    
    function daySegSetTops(segs, rowTops) { // also triggers eventAfterRender
        var i;
        var segCnt = segs.length;
        var seg;
        var element;
        var events;
        for (i=0; i<segCnt; i++) {
            seg = segs[i];
            element = seg.element;
            if (element) {
                element[0].style.top = rowTops[seg.row] + (seg.top||0) + 'px';
                events = seg.events;
                trigger('eventAfterRender', null, events, element);
            }
        }
    }
    
    function renderDaySegs(segs, modifiedEventId) {
        var segmentContainer = getDaySegmentContainer(),
            rowCnt = getRowCnt(),
            colCnt = getColCnt(),
            i, j, k, 
            segCnt = segs.length, seg,
            events, numEvents,
            classes,
            bounds = allDayBounds(),
            minLeft = bounds.left,
            maxLeft = bounds.right,
            leftCol,
            rightCol,
            left, right,
            html='',
            //eventElements,
            eventElement,
            triggerRes,
            hsideCache={},
            vmarginCache={},
            key, val,
            rowI, top, levelI, levelHeight,
            rowDivs=[],
            rowDivTops=[],
            colHeights,
            startDay, endDay;
        
        segmentContainer[0].innerHTML = daySegHTML(segs); // faster than html()
        daySegElementResolve(segs, segmentContainer.children(), modifiedEventId);
        
        daySegCalcHSides(segs);
        daySegSetWidths(segs);
        daySegCalcHeights(segs);
        rowDivs = getRowDivs();
        // set row heights, calculate event tops (in relation to row top)
        for (rowI=0; rowI<rowCnt; rowI++) {
            levelI = 0;
            colHeights = [];
            for (j=0; j<colCnt; j++) {
                colHeights[j] = 0;
            }
            while (i < segCnt && (seg = segs[i]).row == rowI) {
                // loop through segs in a row
                top = arrayMax(colHeights.slice(seg.startCol, seg.endCol));
                seg.top = top;
                top += seg.outerHeight;
                for (k = seg.startCol; k < seg.endCol; k++) {
                    colHeights[k] = top;
                }
                i++;
            }
            rowDivs[rowI].height(arrayMax(colHeights));
        }
        daySegSetTops(segs, getRowTops(rowDivs));
    }
    
    function renderEvents(events, modifiedEventId) {
        reportEvents(events);
        renderDaySegs(compileSegs(events), modifiedEventId);
    }
}
        
       
        // // set row heights, calculate event tops (in relation to row top)
        // for (i=0, rowI=0; rowI<rowCnt; rowI++) {
            // top = levelI = levelHeight = 0;
            // while (i<segCnt && (seg = segs[i]).row == rowI) {
                // if (seg.level != levelI) {
                    // top += levelHeight;
                    // levelHeight = 0;
                    // levelI++;
                // }
                // levelHeight = Math.max(levelHeight, seg.outerHeight||0);
                // seg.top = top;
                // i++;
            // }
            // rowDivs[rowI] = getRow(rowI).find('td:first div.fc-day-content > div') // optimal selector?
                // .height(top + levelHeight);
        // }
// 
        // // calculate row tops
        // for (rowI=0; rowI<rowCnt; rowI++) {
            // rowDivTops[rowI] = rowDivs[rowI][0].offsetTop;
        // }
// 
        // // set event tops
        // for (i=0; i<segCnt; i++) {
            // seg = segs[i];
            // if (eventElement = seg.element) {
                // eventElement[0].style.top = rowDivTops[seg.row] + seg.top + 'px';
                // events = seg.events;
                // view.trigger('eventAfterRender', null, events, eventElement);
            // }
        // }
