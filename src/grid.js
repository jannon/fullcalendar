
/* Grid-based Views: month, basicWeek, basicDay
-----------------------------------------------------------------------------*/

setDefaults({
	weekMode: 'fixed'
});

views.month = function(element, options, viewName) {
	return new Grid(element, options, {
		render: function(date, delta) {
            if (delta) {
                addMonths(date, delta);
                date.setDate(1);
            }
            // start/end
            var start = this.start = cloneDate(date, true);
            start.setDate(1);
            this.end = addMonths(cloneDate(start), 1);
            // visStart/visEnd
            var visStart = this.visStart = cloneDate(start),
                visEnd = this.visEnd = cloneDate(this.end),
                nwe = options.weekends ? 0 : 1;
            if (nwe) {
                skipWeekend(visStart);
                skipWeekend(visEnd, -1, true);
            }
            addDays(visStart, -((visStart.getDay() - Math.max(options.firstDay, nwe) + 7) % 7));
            addDays(visEnd, (7 - visEnd.getDay() + Math.max(options.firstDay, nwe)) % 7);
            // row count
            var rowCnt = Math.round((visEnd - visStart) / (DAY_MS * 7));
            if (options.weekMode == 'fixed') {
                addDays(visEnd, (6 - rowCnt) * 7);
                rowCnt = 6;
            }
            // title
            this.title = formatDate(
                start,
                this.option('titleFormat'),
                options
            );
            // render
            this.renderGrid(
                rowCnt, options.weekends ? 7 : 5,
                this.option('columnFormat'),
                true
            );
        }
	}, viewName);
};

views.miniMonth = function(element, options, viewName) {
    return new Grid(element, options, {
        render: function(date, delta) {
            if (delta) {
                addMonths(date, delta);
                date.setDate(1);
            }
            // start/end
            var start = this.start = cloneDate(date, true);
            start.setDate(1);
            this.end = addMonths(cloneDate(start), 1);
            // visStart/visEnd
            var visStart = this.visStart = cloneDate(start),
                visEnd = this.visEnd = cloneDate(this.end),
                nwe = options.weekends ? 0 : 1;
            if (nwe) {
                skipWeekend(visStart);
                skipWeekend(visEnd, -1, true);
            }
            addDays(visStart, -((visStart.getDay() - Math.max(options.firstDay, nwe) + 7) % 7));
            addDays(visEnd, (7 - visEnd.getDay() + Math.max(options.firstDay, nwe)) % 7);
            // row count
            var rowCnt = Math.round((visEnd - visStart) / (DAY_MS * 7));
            if (options.weekMode == 'fixed') {
                addDays(visEnd, (6 - rowCnt) * 7);
                rowCnt = 6;
            }
            // title
            this.title = formatDate(
                start,
                this.option('titleFormat'),
                options
            );
            // render
            this.renderGrid(
                rowCnt, options.weekends ? 7 : 5,
                this.option('columnFormat'),
                true
            );
        },
        sliceSegs: function(events, visEventEnds, start, end) {
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
        },
        stackSegs: function(segs) {
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
        },
        compileSegs: function(events) {
            var d1 = cloneDate(this.visStart),
                d2 = addDays(cloneDate(d1), this.colCnt),
                visEventsEnds = $.map(events, exclEndDay),
                i, row,
                j, level,
                k, seg,
                segs=[];
        
            for (i=0; i<this.rowCnt; i++) {
                row = this.stackSegs(this.sliceSegs(events, visEventsEnds, d1, d2));
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
        },
        _renderDaySegs: function(segs, rowCnt, view, minLeft, maxLeft, getRow, dayContentLeft, dayContentRight, segmentContainer, bindSegHandlers, modifiedEventId) {
    
            var options=view.options,
                rtl=options.isRTL,
                i, j, segCnt=segs.length, seg,
                events, numEvents,
                className,
                left, right,
                html='',
                eventElements,
                eventElement,
                triggerRes,
                hsideCache={},
                vmarginCache={},
                key, val,
                rowI, top, levelI, levelHeight,
                rowDivs=[],
                rowDivTops=[],
                startDay, endDay;
                
            // calculate desired position/dimensions, create html
            for (i=0; i<segCnt; i++) {
                seg = segs[i];
                events = seg.events;
                startDay = seg.start.getDay();
                endDay = seg.end.getDay();
                className = 'fc-event fc-event-hori fc-dow-' + startDay + ' ';
                
                if (rtl) {
                    if (seg.isStart) {
                        className += 'fc-corner-right ';
                    }
                    if (seg.isEnd) {
                        className += 'fc-corner-left ';
                    }
                    left = seg.isEnd ? dayContentLeft(seg.end.getDay()-1) : minLeft;
                    right = seg.isStart ? dayContentRight(seg.start.getDay()) : maxLeft;
                }else{
                    if (seg.isStart) {
                        className += 'fc-corner-left ';
                    }
                    if (seg.isEnd) {
                        className += 'fc-corner-right ';
                    }
                    left = seg.isStart ? dayContentLeft(startDay) : (startDay == 0 ? minLeft : dayContentRight(startDay-1) + 3);
                    right = seg.isEnd ? dayContentRight(endDay-1) : (endDay == 0 ? maxLeft: dayContentLeft(endDay) - 2);
                }
                html +=
                    "<div class='" + className + this.getEventClass(events) + "' style='position:absolute;z-index:8;left:"+left+"px'></div>";
                seg.left = left;
                seg.outerWidth = right - left;
            }
            segmentContainer[0].innerHTML = html; // faster than html()
            eventElements = segmentContainer.children();
            
            // retrieve elements, run through eventRender callback, bind handlers
            for (i=0; i<segCnt; i++) {
                seg = segs[i];
                eventElement = $(eventElements[i]); // faster than eq()
                events = seg.events;
                numEvents = events.length;
                triggerRes = view.trigger('eventRender', null, events, eventElement);
                if (triggerRes === false) {
                    eventElement.remove();
                }else{
                    if (triggerRes && triggerRes !== true) {
                        eventElement.remove();
                        eventElement = $(triggerRes)
                            .css({
                                position: 'absolute',
                                left: seg.left
                            })
                            .appendTo(segmentContainer);
                    }
                    seg.element = eventElement;
                    for(j = 0; j < numEvents; j++) {
                        if (events[j]._id === modifiedEventId) {
                            bindSegHandlers(events[j], eventElement, seg);
                        }else{
                            eventElement[0]._fci = i; // for lazySegBind
                        }
                        view.reportEventElement(events[j], eventElement);
                    }
                }
            }
            
            //lazySegBind(segmentContainer, segs, bindSegHandlers);
            
            // record event horizontal sides
            for (i=0; i<segCnt; i++) {
                seg = segs[i];
                if (eventElement = seg.element) {
                    val = hsideCache[key = seg.key = cssKey(eventElement[0])];
                    seg.hsides = val === undefined ? (hsideCache[key] = hsides(eventElement[0], true)) : val;
                }
            }
            
            // set event widths
            for (i=0; i<segCnt; i++) {
                seg = segs[i];
                if (eventElement = seg.element) {
                    eventElement[0].style.width = seg.outerWidth - seg.hsides + 'px';
                }
            }
            
            // record event heights
            for (i=0; i<segCnt; i++) {
                seg = segs[i];
                if (eventElement = seg.element) {
                    val = vmarginCache[key = seg.key];
                    seg.outerHeight = eventElement[0].offsetHeight + (
                        val === undefined ? (vmarginCache[key] = vmargins(eventElement[0])) : val
                    );
                }
            }
            
            // set row heights, calculate event tops (in relation to row top)
            for (i=0, rowI=0; rowI<rowCnt; rowI++) {
                top = levelI = levelHeight = 0;
                while (i<segCnt && (seg = segs[i]).row == rowI) {
                    if (seg.level != levelI) {
                        top += levelHeight;
                        levelHeight = 0;
                        levelI++;
                    }
                    levelHeight = Math.max(levelHeight, seg.outerHeight||0);
                    seg.top = top;
                    i++;
                }
                rowDivs[rowI] = getRow(rowI).find('td:first div.fc-day-content > div') // optimal selector?
                    .height(top + levelHeight);
            }
            
            // calculate row tops
            for (rowI=0; rowI<rowCnt; rowI++) {
                rowDivTops[rowI] = rowDivs[rowI][0].offsetTop;
            }
            
            // set event tops
            for (i=0; i<segCnt; i++) {
                seg = segs[i];
                if (eventElement = seg.element) {
                    eventElement[0].style.top = rowDivTops[seg.row] + seg.top + 'px';
                    events = seg.events;
                    view.trigger('eventAfterRender', null, events, eventElement);
                }
            }
            
        },
        getEventClass: function(events) {
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
    }, viewName);
};

views.basicWeek = function(element, options, viewName) {
	return new Grid(element, options, {
		render: function(date, delta) {
			if (delta) {
				addDays(date, delta * 7);
			}
			var visStart = this.visStart = cloneDate(
					this.start = addDays(cloneDate(date), -((date.getDay() - options.firstDay + 7) % 7))
				),
				visEnd = this.visEnd = cloneDate(
					this.end = addDays(cloneDate(visStart), 7)
				);
			if (!options.weekends) {
				skipWeekend(visStart);
				skipWeekend(visEnd, -1, true);
			}
			this.title = formatDates(
				visStart,
				addDays(cloneDate(visEnd), -1),
				this.option('titleFormat'),
				options
			);
			this.renderGrid(
				1, options.weekends ? 7 : 5,
				this.option('columnFormat'),
				false
			);
		}
	}, viewName);
};

views.basicDay = function(element, options, viewName) {
	return new Grid(element, options, {
		render: function(date, delta) {
			if (delta) {
				addDays(date, delta);
				if (!options.weekends) {
					skipWeekend(date, delta < 0 ? -1 : 1);
				}
			}
			this.title = formatDate(date, this.option('titleFormat'), options);
			this.start = this.visStart = cloneDate(date, true);
			this.end = this.visEnd = addDays(cloneDate(this.start), 1);
			this.renderGrid(
				1, 1,
				this.option('columnFormat'),
				false
			);
		}
	}, viewName);
};


// rendering bugs

var tdHeightBug;


function Grid(element, options, methods, viewName) {
	
	var tm, firstDay,
		nwe,            // no weekends (int)
		rtl, dis, dit,  // day index sign / translate
		viewWidth, viewHeight,
		self = this,
		colWidth,
		thead, tbody,
		cachedEvents=[],
		segmentContainer,
		dayContentPositions = new HorizontalPositionCache(function(dayOfWeek) {
			return tbody.find('td:eq(' + ((dayOfWeek - Math.max(firstDay,nwe)+self.colCnt) % self.colCnt) + ') div div');
		}),
		// ...
        	
    	// initialize superclass
    	view = $.extend(this, viewMethods, methods, {
    		renderGrid: renderGrid,
    		renderEvents: renderEvents,
    		rerenderEvents: rerenderEvents,
    		clearEvents: clearEvents,
    		setHeight: setHeight,
    		setWidth: setWidth,
    		defaultEventEnd: function(event) { // calculates an end if event doesnt have one, mostly for resizing
    			return cloneDate(event.start);
    		}
    	});
    	view.name = viewName;
    	view.init(element, options);
	
    self.rowCnt = 0; 
    self.colCnt = 0;
	
	
	/* Grid Rendering
	-----------------------------------------------------------------------------*/
	
	
	disableTextSelection(element.addClass('fc-grid'));
	

	function renderGrid(r, c, colFormat, showNumbers) {
	
		self.rowCnt = r;
		self.colCnt = c;
		
		// update option-derived variables
		tm = options.theme ? 'ui' : 'fc';
		nwe = options.weekends ? 0 : 1;
		firstDay = options.firstDay;
		if (rtl = options.isRTL) {
			dis = -1;
			dit = self.colCnt - 1;
		}else{
			dis = 1;
			dit = 0;
		}
		
		var month = view.start.getMonth(),
			today = clearTime(new Date()),
			s, i, j, d = cloneDate(view.visStart);
		
		if (!tbody) { // first time, build all cells from scratch
		
			var table = $("<table/>").appendTo(element);
			
			s = "<thead><tr>";
			for (i=0; i<self.colCnt; i++) {
				s += "<th class='fc-" +
					dayIDs[d.getDay()] + ' ' + // needs to be first
					tm + '-state-default' +
					(i==dit ? ' fc-leftmost' : '') +
					"'>" + formatDate(d, colFormat, options) + "</th>";
				addDays(d, 1);
				if (nwe) {
					skipWeekend(d);
				}
			}
			thead = $(s + "</tr></thead>").appendTo(table);
			
			s = "<tbody>";
			d = cloneDate(view.visStart);
			for (i=0; i<self.rowCnt; i++) {
				s += "<tr class='fc-week" + i + "'>";
				for (j=0; j<self.colCnt; j++) {
					s += "<td class='fc-" +
						dayIDs[d.getDay()] + ' ' + // needs to be first
						tm + '-state-default fc-day' + (i*self.colCnt+j) +
						(j==dit ? ' fc-leftmost' : '') +
						(self.rowCnt>1 && d.getMonth() != month ? ' fc-other-month' : '') +
						(+d == +today ?
						' fc-today '+tm+'-state-highlight' :
						' fc-not-today') + "'>" +
						(showNumbers ? "<div class='fc-day-number'>" + d.getDate() + "</div>" : '') +
						"<div class='fc-day-content'><div style='position:relative'>&nbsp;</div></div></td>";
					addDays(d, 1);
					if (nwe) {
						skipWeekend(d);
					}
				}
				s += "</tr>";
			}
			tbody = $(s + "</tbody>").appendTo(table);
			dayBind(tbody.find('td'));
			
			segmentContainer = $("<div style='position:absolute;z-index:8;top:0;left:0'/>").appendTo(element);
		
		}else{ // NOT first time, reuse as many cells as possible
		
			clearEvents();
		
			var prevRowCnt = tbody.find('tr').length;
			if (self.rowCnt < prevRowCnt) {
				tbody.find('tr:gt(' + (self.rowCnt-1) + ')').remove(); // remove extra rows
			}
			else if (self.rowCnt > prevRowCnt) { // needs to create new rows...
				s = '';
				for (i=prevRowCnt; i<self.rowCnt; i++) {
					s += "<tr class='fc-week" + i + "'>";
					for (j=0; j<self.colCnt; j++) {
						s += "<td class='fc-" +
							dayIDs[d.getDay()] + ' ' + // needs to be first
							tm + '-state-default fc-new fc-day' + (i*self.colCnt+j) +
							(j==dit ? ' fc-leftmost' : '') + "'>" +
							(showNumbers ? "<div class='fc-day-number'></div>" : '') +
							"<div class='fc-day-content'><div style='position:relative'>&nbsp;</div></div>" +
							"</td>";
						addDays(d, 1);
						if (nwe) {
							skipWeekend(d);
						}
					}
					s += "</tr>";
				}
				tbody.append(s);
			}
			dayBind(tbody.find('td.fc-new').removeClass('fc-new'));
			
			// re-label and re-class existing cells
			d = cloneDate(view.visStart);
			tbody.find('td').each(function() {
				var td = $(this);
				if (self.rowCnt > 1) {
					if (d.getMonth() == month) {
						td.removeClass('fc-other-month');
					}else{
						td.addClass('fc-other-month');
					}
				}
				if (+d == +today) {
					td.removeClass('fc-not-today')
						.addClass('fc-today')
						.addClass(tm + '-state-highlight');
				}else{
					td.addClass('fc-not-today')
						.removeClass('fc-today')
						.removeClass(tm + '-state-highlight');
				}
				td.find('div.fc-day-number').text(d.getDate());
				addDays(d, 1);
				if (nwe) {
					skipWeekend(d);
				}
			});
			
			if (self.rowCnt == 1) { // more changes likely (week or day view)
			
				// redo column header text and class
				d = cloneDate(view.visStart);
				thead.find('th').each(function() {
					$(this).text(formatDate(d, colFormat, options));
					this.className = this.className.replace(/^fc-\w+(?= )/, 'fc-' + dayIDs[d.getDay()]);
					addDays(d, 1);
					if (nwe) {
						skipWeekend(d);
					}
				});
				
				// redo cell day-of-weeks
				d = cloneDate(view.visStart);
				tbody.find('td').each(function() {
					this.className = this.className.replace(/^fc-\w+(?= )/, 'fc-' + dayIDs[d.getDay()]);
					addDays(d, 1);
					if (nwe) {
						skipWeekend(d);
					}
				});
				
			}
		
		}
		
	}
	
	
	
	function setHeight(height) {
		viewHeight = height;
		var leftTDs = tbody.find('tr td:first-child'),
			tbodyHeight = viewHeight - thead.height(),
			rowHeight1, rowHeight2;
		if (options.weekMode == 'variable') {
			rowHeight1 = rowHeight2 = Math.floor(tbodyHeight / (self.rowCnt==1 ? 2 : 6));
		}else{
			rowHeight1 = Math.floor(tbodyHeight / self.rowCnt);
			rowHeight2 = tbodyHeight - rowHeight1*(self.rowCnt-1);
		}
		if (tdHeightBug === undefined) {
			// bug in firefox where cell height includes padding
			var tr = tbody.find('tr:first'),
				td = tr.find('td:first');
			td.height(rowHeight1);
			tdHeightBug = rowHeight1 != td.height();
		}
		if (tdHeightBug) {
			leftTDs.slice(0, -1).height(rowHeight1);
			leftTDs.slice(-1).height(rowHeight2);
		}else{
			setOuterHeight(leftTDs.slice(0, -1), rowHeight1);
			setOuterHeight(leftTDs.slice(-1), rowHeight2);
		}
	}
	
	
	function setWidth(width) {
		viewWidth = width;
		dayContentPositions.clear();
		setOuterWidth(
			thead.find('th').slice(0, -1),
			colWidth = Math.floor(viewWidth / self.colCnt)
		);
	}

	
	
	/* Event Rendering
	-----------------------------------------------------------------------------*/
	
	
	function renderEvents(events) {
		view.reportEvents(cachedEvents = events);
		renderSegs(view.compileSegs(events));
	}
	
	
	function rerenderEvents(modifiedEventId) {
		clearEvents();
		renderSegs(view.compileSegs(cachedEvents), modifiedEventId);
	}
	
	
	function clearEvents() {
		view._clearEvents(); // only clears the hashes
		segmentContainer.empty();
	}
	
	
	function compileSegs(events) {
		var d1 = cloneDate(view.visStart),
			d2 = addDays(cloneDate(d1), self.colCnt),
			visEventsEnds = $.map(events, exclEndDay),
			i, row,
			j, level,
			k, seg,
			segs=[];
		for (i=0; i<self.rowCnt; i++) {
			row = view.stackSegs(view.sliceSegs(events, visEventsEnds, d1, d2));
			for (j=0; j<row.length; j++) {
				level = row[j];
				for (k=0; k<level.length; k++) {
					seg = level[k];
					seg.row = i;
					seg.level = j;
					segs.push(seg);
				}
			}
			addDays(d1, 7);
			addDays(d2, 7);
		}
		return segs;
	}
	
	
	function renderSegs(segs, modifiedEventId) {
		view._renderDaySegs(
			segs,
			self.rowCnt,
			view,
			0,
			viewWidth,
			function(i) { return tbody.find('tr:eq('+i+')') },
			dayContentPositions.left,
			dayContentPositions.right,
			segmentContainer,
			bindSegHandlers,
			modifiedEventId
		);
	}
	
	
	function bindSegHandlers(event, eventElement, seg) {
		view.eventElementHandlers(event, eventElement);
		if (event.editable || event.editable === undefined && options.editable) {
			draggableEvent(event, eventElement);
			if (seg.isEnd) {
				view.resizableDayEvent(event, eventElement, colWidth);
			}
		}
	}
	
	
	
	/* Event Dragging
	-----------------------------------------------------------------------------*/
	
	
	function draggableEvent(event, eventElement) {
		if (!options.disableDragging && eventElement.draggable) {
			var dayDelta;
			eventElement.draggable({
				zIndex: 9,
				delay: 50,
				opacity: view.option('dragOpacity'),
				revertDuration: options.dragRevertDuration,
				start: function(ev, ui) {
					view.trigger('eventDragStart', eventElement, event, ev, ui);
					view.hideEvents(event, eventElement);
					hoverListener.start(function(cell, origCell, rowDelta, colDelta) {
						eventElement.draggable('option', 'revert', !cell || !rowDelta && !colDelta);
						clearOverlay();
						if (cell) {
							dayDelta = rowDelta*7 + colDelta*dis;
							renderDayOverlay(
								addDays(cloneDate(event.start), dayDelta),
								addDays(exclEndDay(event), dayDelta)
							);
						}else{
							dayDelta = 0;
						}
					}, ev, 'drag');
				},
				stop: function(ev, ui) {
					hoverListener.stop();
					clearOverlay();
					view.trigger('eventDragStop', eventElement, event, ev, ui);
					if (dayDelta) {
						eventElement.find('a').removeAttr('href'); // prevents safari from visiting the link
						view.eventDrop(this, event, dayDelta, 0, event.allDay, ev, ui);
					}else{
						if ($.browser.msie) {
							eventElement.css('filter', ''); // clear IE opacity side-effects
						}
						view.showEvents(event, eventElement);
					}
				}
			});
		}
	}
	
	
	
	/* Day clicking and binding
	---------------------------------------------------------*/
	
	function dayBind(days) {
		days.click(dayClick)
			.mousedown(selectionMousedown);
	}
	
	function dayClick(ev) {
		if (!view.option('selectable')) { // SelectionManager will worry about dayClick
			var n = parseInt(this.className.match(/fc\-day(\d+)/)[1]),
				date = addDays(
					cloneDate(view.visStart),
					Math.floor(n/self.colCnt) * 7 + n % self.colCnt
				);
			// TODO: what about weekends in middle of week?
			view.trigger('dayClick', this, date, true, ev);
		}
	}
	
	
	
	/* Coordinate Utilities
	--------------------------------------------------------*/
	
	var coordinateGrid = new CoordinateGrid(function(rows, cols) {
		var e, n, p;
		var tds = tbody.find('tr:first td');
		if (rtl) {
			tds = $(tds.get().reverse());
		}
		tds.each(function(i, _e) {
			e = $(_e);
			n = e.offset().left;
			if (i) {
				p[1] = n;
			}
			p = [n];
			cols[i] = p;
		});
		p[1] = n + e.outerWidth();
		tbody.find('tr').each(function(i, _e) {
			e = $(_e);
			n = e.offset().top;
			if (i) {
				p[1] = n;
			}
			p = [n];
			rows[i] = p;
		});
		p[1] = n + e.outerHeight();
	});
	
	var hoverListener = new HoverListener(coordinateGrid);
	
	
	
	/* Selecting
	--------------------------------------------------------*/
	
	var selected = false;
	var selectionMousedown = selection_dayMousedown(
		view, hoverListener, cellDate, function(){return true}, renderDayOverlay, clearOverlay, reportSelection, unselect
	);
	
	view.select = function(startDate, endDate, allDay) {
		coordinateGrid.build();
		unselect();
		if (!endDate) {
			endDate = cloneDate(startDate);
		}
		renderDayOverlay(startDate, addDays(cloneDate(endDate), 1));
		reportSelection(startDate, endDate, allDay);
	};
	
	function reportSelection(startDate, endDate, allDay, ev) {
		selected = true;
		view.trigger('select', view, startDate, endDate, allDay, ev);
	}
	
	function unselect(ev) {
		if (selected) {
			clearOverlay();
			selected = false;
			view.trigger('unselect', view, ev);
		}
	}
	view.unselect = unselect;
	
	selection_unselectAuto(view, unselect);
	
	
	
	/* External dragging
	------------------------------------------------------*/
	
	view.dragStart = function(_dragElement, ev, ui) {
		hoverListener.start(function(cell) {
			clearOverlay();
			if (cell) {
				_renderDayOverlay(cell.row, cell.col, cell.row, cell.col);
			}
		}, ev);
	};
	
	view.dragStop = function(_dragElement, ev, ui) {
		var cell = hoverListener.stop();
		clearOverlay();
		if (cell) {
			var d = cellDate(cell);
			view.trigger('drop', _dragElement, d, true, ev, ui);
		}
	};
	
	
	
	/* Semi-transparent Overlay Helpers
	------------------------------------------------------*/
	
	function renderDayOverlay(overlayStart, overlayEnd) { // overlayEnd is exclusive
		var rowStart = cloneDate(view.visStart);
		var rowEnd = addDays(cloneDate(rowStart), self.colCnt);
		for (var i=0; i<self.rowCnt; i++) {
			var stretchStart = new Date(Math.max(rowStart, overlayStart));
			var stretchEnd = new Date(Math.min(rowEnd, overlayEnd));
			if (stretchStart < stretchEnd) {
				var colStart, colEnd;
				if (rtl) {
					colStart = dayDiff(stretchEnd, rowStart)*dis+dit+1;
					colEnd = dayDiff(stretchStart, rowStart)*dis+dit+1;
				}else{
					colStart = dayDiff(stretchStart, rowStart);
					colEnd = dayDiff(stretchEnd, rowStart);
				}
				dayBind(
					_renderDayOverlay(i, colStart, i, colEnd-1)
				);
			}
			addDays(rowStart, 7);
			addDays(rowEnd, 7);
		}
	}
	
	function _renderDayOverlay(row0, col0, row1, col1) { // row1,col1 is inclusive
		var rect = coordinateGrid.rect(row0, col0, row1, col1, element);
		return view.renderOverlay(rect, element);
	}
	
	function clearOverlay() {
		view.clearOverlays();
	}
	
	
	
	/* Date Utils
	---------------------------------------------------*/
	
	
	function cellDate(cell) {
		return addDays(cloneDate(view.visStart), cell.row*7 + cell.col*dis+dit);
		// TODO: what about weekends in middle of week?
	}
	
    function _renderDaySegs(segs, rowCnt, view, minLeft, maxLeft, getRow, dayContentLeft, dayContentRight, segmentContainer, bindSegHandlers, modifiedEventId) {
    
        var options=view.options,
            rtl=options.isRTL,
            i, segCnt=segs.length, seg,
            event,
            className,
            left, right,
            html='',
            eventElements,
            eventElement,
            triggerRes,
            hsideCache={},
            vmarginCache={},
            key, val,
            rowI, top, levelI, levelHeight,
            rowDivs=[],
            rowDivTops=[];
            
        // calculate desired position/dimensions, create html
        for (i=0; i<segCnt; i++) {
            seg = segs[i];
            event = seg.event;
            className = 'fc-event fc-event-hori ';
            if (rtl) {
                if (seg.isStart) {
                    className += 'fc-corner-right ';
                }
                if (seg.isEnd) {
                    className += 'fc-corner-left ';
                }
                left = seg.isEnd ? dayContentLeft(seg.end.getDay()-1) : minLeft;
                right = seg.isStart ? dayContentRight(seg.start.getDay()) : maxLeft;
            }else{
                if (seg.isStart) {
                    className += 'fc-corner-left ';
                }
                if (seg.isEnd) {
                    className += 'fc-corner-right ';
                }
                left = seg.isStart ? dayContentLeft(seg.start.getDay()) : minLeft;
                right = seg.isEnd ? dayContentRight(seg.end.getDay()-1) : maxLeft;
            }
            html +=
                "<div class='" + className + event.className.join(' ') + "' style='position:absolute;z-index:8;left:"+left+"px'>" +
                    "<a" + (event.url ? " href='" + htmlEscape(event.url) + "'" : '') + ">" +
                        (!event.allDay && seg.isStart ?
                            "<span class='fc-event-time'>" +
                                htmlEscape(formatDates(event.start, event.end, view.option('timeFormat'), options)) +
                            "</span>"
                        :'') +
                        "<span class='fc-event-title'>" + htmlEscape(event.title) + "</span>" +
                    "</a>" +
                    ((event.editable || event.editable === undefined && options.editable) && !options.disableResizing && $.fn.resizable ?
                        "<div class='ui-resizable-handle ui-resizable-" + (rtl ? 'w' : 'e') + "'></div>"
                        : '') +
                "</div>";
            seg.left = left;
            seg.outerWidth = right - left;
        }
        segmentContainer[0].innerHTML = html; // faster than html()
        eventElements = segmentContainer.children();
        
        // retrieve elements, run through eventRender callback, bind handlers
        for (i=0; i<segCnt; i++) {
            seg = segs[i];
            eventElement = $(eventElements[i]); // faster than eq()
            event = seg.event;
            triggerRes = view.trigger('eventRender', event, event, eventElement);
            if (triggerRes === false) {
                eventElement.remove();
            }else{
                if (triggerRes && triggerRes !== true) {
                    eventElement.remove();
                    eventElement = $(triggerRes)
                        .css({
                            position: 'absolute',
                            left: seg.left
                        })
                        .appendTo(segmentContainer);
                }
                seg.element = eventElement;
                if (event._id === modifiedEventId) {
                    bindSegHandlers(event, eventElement, seg);
                }else{
                    eventElement[0]._fci = i; // for lazySegBind
                }
                view.reportEventElement(event, eventElement);
            }
        }
        
        lazySegBind(segmentContainer, segs, bindSegHandlers);
        
        // record event horizontal sides
        for (i=0; i<segCnt; i++) {
            seg = segs[i];
            if (eventElement = seg.element) {
                val = hsideCache[key = seg.key = cssKey(eventElement[0])];
                seg.hsides = val === undefined ? (hsideCache[key] = hsides(eventElement[0], true)) : val;
            }
        }
        
        // set event widths
        for (i=0; i<segCnt; i++) {
            seg = segs[i];
            if (eventElement = seg.element) {
                eventElement[0].style.width = seg.outerWidth - seg.hsides + 'px';
            }
        }
        
        // record event heights
        for (i=0; i<segCnt; i++) {
            seg = segs[i];
            if (eventElement = seg.element) {
                val = vmarginCache[key = seg.key];
                seg.outerHeight = eventElement[0].offsetHeight + (
                    val === undefined ? (vmarginCache[key] = vmargins(eventElement[0])) : val
                );
            }
        }
        
        // set row heights, calculate event tops (in relation to row top)
        for (i=0, rowI=0; rowI<rowCnt; rowI++) {
            top = levelI = levelHeight = 0;
            while (i<segCnt && (seg = segs[i]).row == rowI) {
                if (seg.level != levelI) {
                    top += levelHeight;
                    levelHeight = 0;
                    levelI++;
                }
                levelHeight = Math.max(levelHeight, seg.outerHeight||0);
                seg.top = top;
                i++;
            }
            rowDivs[rowI] = getRow(rowI).find('td:first div.fc-day-content > div') // optimal selector?
                .height(top + levelHeight);
        }
        
        // calculate row tops
        for (rowI=0; rowI<rowCnt; rowI++) {
            rowDivTops[rowI] = rowDivs[rowI][0].offsetTop;
        }
        
        // set event tops
        for (i=0; i<segCnt; i++) {
            seg = segs[i];
            if (eventElement = seg.element) {
                eventElement[0].style.top = rowDivTops[seg.row] + seg.top + 'px';
                event = seg.event;
                view.trigger('eventAfterRender', event, event, eventElement);
            }
        }
        
    }
}
